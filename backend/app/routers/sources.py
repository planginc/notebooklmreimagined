from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import List, Optional
from uuid import UUID
import aiofiles
import os
import tempfile
import json
import httpx
import re

from app.models.schemas import (
    SourceResponse,
    YouTubeSourceCreate,
    URLSourceCreate,
    TextSourceCreate,
    ApiResponse,
)
from app.services.auth import get_current_user
from app.services.supabase_client import get_supabase_client
from app.services.gemini import gemini_service

router = APIRouter(prefix="/notebooks/{notebook_id}/sources", tags=["sources"])


async def verify_notebook_access(notebook_id: UUID, user_id: str):
    """Verify user has access to the notebook."""
    supabase = get_supabase_client()
    result = (
        supabase.table("notebooks")
        .select("id")
        .eq("id", str(notebook_id))
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Notebook not found")
    return result.data


async def extract_url_content(url: str) -> str:
    """Fetch a URL and extract readable text content."""
    try:
        from bs4 import BeautifulSoup
    except ImportError:
        return ""

    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
            response = await client.get(url, headers={
                "User-Agent": "Mozilla/5.0 (compatible; NotebookLM/1.0)"
            })
            response.raise_for_status()
            html = response.text

        soup = BeautifulSoup(html, "html.parser")

        # Remove scripts, styles, nav, footer, etc.
        for tag in soup(["script", "style", "nav", "footer", "header", "aside", "form", "noscript"]):
            tag.decompose()

        # Try to get the main content area first
        main = soup.find("main") or soup.find("article") or soup.find("body")
        if main:
            text = main.get_text(separator="\n", strip=True)
        else:
            text = soup.get_text(separator="\n", strip=True)

        # Clean up whitespace
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        text = "\n".join(lines)

        # Limit to ~100KB
        return text[:100000]

    except Exception as e:
        print(f"URL extraction failed for {url}: {e}")
        return ""


async def extract_youtube_transcript(video_id: str) -> str:
    """Extract transcript from a YouTube video."""
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
    except ImportError:
        return ""

    try:
        ytt_api = YouTubeTranscriptApi()
        transcript = ytt_api.fetch(video_id)
        # Combine all text segments
        text = " ".join([entry.text for entry in transcript])
        return text[:100000]
    except Exception as e:
        print(f"YouTube transcript extraction failed for {video_id}: {e}")
        return ""


def extract_pdf_text(content: bytes) -> str:
    """Extract text from a PDF file."""
    try:
        from PyPDF2 import PdfReader
        import io
    except ImportError:
        return ""

    try:
        reader = PdfReader(io.BytesIO(content))
        text_parts = []
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
        text = "\n\n".join(text_parts)
        return text[:100000]
    except Exception as e:
        print(f"PDF extraction failed: {e}")
        return ""


async def generate_source_guide(content: str) -> dict:
    """Generate a source guide (summary, topics, questions) from content."""
    if not content or len(content.strip()) < 50:
        return {}

    try:
        summary_result = await gemini_service.generate_summary(content[:50000])
        try:
            source_guide = json.loads(summary_result["content"])
        except (json.JSONDecodeError, TypeError):
            source_guide = {"summary": summary_result["content"]}
        return {
            "source_guide": source_guide,
            "token_count": summary_result["usage"]["input_tokens"],
        }
    except Exception as e:
        print(f"Source guide generation failed: {e}")
        return {}


@router.post("", response_model=ApiResponse)
async def upload_source(
    notebook_id: UUID,
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    """Upload a file source (PDF, DOCX, TXT, etc.)."""
    await verify_notebook_access(notebook_id, user["id"])
    supabase = get_supabase_client()

    # Determine file type
    filename = file.filename or "unknown"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "txt"
    mime_type = file.content_type or "application/octet-stream"

    type_map = {
        "pdf": "pdf",
        "docx": "docx",
        "doc": "docx",
        "txt": "txt",
        "md": "txt",
        "html": "txt",
    }
    source_type = type_map.get(ext, "txt")

    # Read file content
    content = await file.read()
    file_size = len(content)

    # Upload to Supabase Storage
    storage_path = f"{user['id']}/{notebook_id}/{filename}"

    supabase.storage.from_("sources").upload(
        storage_path,
        content,
        {"content-type": mime_type}
    )

    # Create source record
    source_data = {
        "notebook_id": str(notebook_id),
        "type": source_type,
        "name": filename,
        "status": "processing",
        "file_path": storage_path,
        "original_filename": filename,
        "mime_type": mime_type,
        "file_size_bytes": file_size,
        "metadata": {},
    }

    result = supabase.table("sources").insert(source_data).execute()

    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create source")

    source = result.data[0]

    try:
        extracted_text = ""

        if source_type == "txt":
            extracted_text = content.decode("utf-8", errors="ignore")
        elif source_type == "pdf":
            extracted_text = extract_pdf_text(content)

        if extracted_text:
            guide_result = await generate_source_guide(extracted_text)
            update_data = {
                "status": "ready",
                "metadata": {"content": extracted_text[:100000]},
            }
            if guide_result.get("source_guide"):
                update_data["source_guide"] = guide_result["source_guide"]
            if guide_result.get("token_count"):
                update_data["token_count"] = guide_result["token_count"]

            supabase.table("sources").update(update_data).eq("id", source["id"]).execute()
        else:
            supabase.table("sources").update({
                "status": "ready",
            }).eq("id", source["id"]).execute()

    except Exception as e:
        supabase.table("sources").update({
            "status": "ready",
            "error_message": f"Processing failed: {str(e)[:200]}",
        }).eq("id", source["id"]).execute()

    # Update notebook source count
    try:
        supabase.table("notebooks").update({
            "source_count": supabase.table("sources").select("id", count="exact").eq("notebook_id", str(notebook_id)).execute().count or 0
        }).eq("id", str(notebook_id)).execute()
    except Exception:
        pass

    # Refresh source data
    result = supabase.table("sources").select("*").eq("id", source["id"]).single().execute()

    return ApiResponse(data=result.data)


@router.post("/youtube", response_model=ApiResponse)
async def add_youtube_source(
    notebook_id: UUID,
    youtube: YouTubeSourceCreate,
    user: dict = Depends(get_current_user),
):
    """Add a YouTube video as a source."""
    await verify_notebook_access(notebook_id, user["id"])
    supabase = get_supabase_client()

    # Extract video ID from URL
    url = youtube.url
    video_id = None
    if "youtube.com/watch?v=" in url:
        video_id = url.split("v=")[1].split("&")[0]
    elif "youtu.be/" in url:
        video_id = url.split("youtu.be/")[1].split("?")[0]

    name = youtube.name or f"YouTube: {video_id or url}"

    source_data = {
        "notebook_id": str(notebook_id),
        "type": "youtube",
        "name": name,
        "status": "processing",
        "metadata": {
            "url": url,
            "video_id": video_id,
        },
    }

    result = supabase.table("sources").insert(source_data).execute()

    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create source")

    source = result.data[0]

    # Extract transcript and generate source guide
    try:
        transcript = ""
        if video_id:
            transcript = await extract_youtube_transcript(video_id)

        if transcript:
            guide_result = await generate_source_guide(transcript)
            update_data = {
                "status": "ready",
                "metadata": {
                    "url": url,
                    "video_id": video_id,
                    "content": transcript[:100000],
                },
            }
            if guide_result.get("source_guide"):
                update_data["source_guide"] = guide_result["source_guide"]
            if guide_result.get("token_count"):
                update_data["token_count"] = guide_result["token_count"]

            supabase.table("sources").update(update_data).eq("id", source["id"]).execute()
        else:
            supabase.table("sources").update({
                "status": "ready",
            }).eq("id", source["id"]).execute()

    except Exception as e:
        supabase.table("sources").update({
            "status": "ready",
            "error_message": f"Transcript extraction failed: {str(e)[:200]}",
        }).eq("id", source["id"]).execute()

    # Refresh
    result = supabase.table("sources").select("*").eq("id", source["id"]).single().execute()
    return ApiResponse(data=result.data)


@router.post("/url", response_model=ApiResponse)
async def add_url_source(
    notebook_id: UUID,
    url_source: URLSourceCreate,
    user: dict = Depends(get_current_user),
):
    """Add a website URL as a source."""
    await verify_notebook_access(notebook_id, user["id"])
    supabase = get_supabase_client()

    name = url_source.name or url_source.url[:100]

    source_data = {
        "notebook_id": str(notebook_id),
        "type": "url",
        "name": name,
        "status": "processing",
        "metadata": {
            "url": url_source.url,
        },
    }

    result = supabase.table("sources").insert(source_data).execute()

    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create source")

    source = result.data[0]

    # Fetch URL content and generate source guide
    try:
        extracted_text = await extract_url_content(url_source.url)

        if extracted_text:
            guide_result = await generate_source_guide(extracted_text)
            update_data = {
                "status": "ready",
                "metadata": {
                    "url": url_source.url,
                    "content": extracted_text[:100000],
                },
            }
            if guide_result.get("source_guide"):
                update_data["source_guide"] = guide_result["source_guide"]
            if guide_result.get("token_count"):
                update_data["token_count"] = guide_result["token_count"]

            supabase.table("sources").update(update_data).eq("id", source["id"]).execute()
        else:
            supabase.table("sources").update({
                "status": "ready",
            }).eq("id", source["id"]).execute()

    except Exception as e:
        supabase.table("sources").update({
            "status": "ready",
            "error_message": f"Content extraction failed: {str(e)[:200]}",
        }).eq("id", source["id"]).execute()

    # Refresh
    result = supabase.table("sources").select("*").eq("id", source["id"]).single().execute()
    return ApiResponse(data=result.data)


@router.post("/text", response_model=ApiResponse)
async def add_text_source(
    notebook_id: UUID,
    text_source: TextSourceCreate,
    user: dict = Depends(get_current_user),
):
    """Add pasted text as a source."""
    await verify_notebook_access(notebook_id, user["id"])
    supabase = get_supabase_client()

    source_data = {
        "notebook_id": str(notebook_id),
        "type": "text",
        "name": text_source.name,
        "status": "processing",
        "metadata": {
            "content": text_source.content[:100000],  # Limit content size
        },
    }

    result = supabase.table("sources").insert(source_data).execute()

    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create source")

    source = result.data[0]

    # Generate summary
    try:
        guide_result = await generate_source_guide(text_source.content)
        update_data = {"status": "ready"}
        if guide_result.get("source_guide"):
            update_data["source_guide"] = guide_result["source_guide"]
        if guide_result.get("token_count"):
            update_data["token_count"] = guide_result["token_count"]

        supabase.table("sources").update(update_data).eq("id", source["id"]).execute()

    except Exception as e:
        supabase.table("sources").update({
            "status": "ready",
            "error_message": f"Summary generation failed: {str(e)[:200]}",
        }).eq("id", source["id"]).execute()

    # Update notebook source count
    try:
        count_result = supabase.table("sources").select("id", count="exact").eq("notebook_id", str(notebook_id)).execute()
        supabase.table("notebooks").update({
            "source_count": count_result.count or 0
        }).eq("id", str(notebook_id)).execute()
    except Exception:
        pass

    result = supabase.table("sources").select("*").eq("id", source["id"]).single().execute()

    return ApiResponse(data=result.data)


@router.post("/{source_id}/reprocess", response_model=ApiResponse)
async def reprocess_source(
    notebook_id: UUID,
    source_id: UUID,
    user: dict = Depends(get_current_user),
):
    """Re-process an existing source to extract content and generate source guide."""
    await verify_notebook_access(notebook_id, user["id"])
    supabase = get_supabase_client()

    # Get the source
    source_result = (
        supabase.table("sources")
        .select("*")
        .eq("id", str(source_id))
        .eq("notebook_id", str(notebook_id))
        .single()
        .execute()
    )

    if not source_result.data:
        raise HTTPException(status_code=404, detail="Source not found")

    source = source_result.data
    source_type = source["type"]
    metadata = source.get("metadata") or {}

    # Mark as processing
    supabase.table("sources").update({"status": "processing"}).eq("id", str(source_id)).execute()

    try:
        extracted_text = ""

        if source_type == "text":
            extracted_text = metadata.get("content", "")

        elif source_type == "url":
            url = metadata.get("url", "")
            if url:
                extracted_text = await extract_url_content(url)
                if extracted_text:
                    metadata["content"] = extracted_text[:100000]

        elif source_type == "youtube":
            video_id = metadata.get("video_id", "")
            if video_id:
                extracted_text = await extract_youtube_transcript(video_id)
                if extracted_text:
                    metadata["content"] = extracted_text[:100000]

        elif source_type == "pdf" and source.get("file_path"):
            # Download from storage and extract
            try:
                file_data = supabase.storage.from_("sources").download(source["file_path"])
                extracted_text = extract_pdf_text(file_data)
                if extracted_text:
                    metadata["content"] = extracted_text[:100000]
            except Exception as e:
                print(f"PDF download/extraction failed: {e}")

        elif source_type == "txt" and source.get("file_path"):
            try:
                file_data = supabase.storage.from_("sources").download(source["file_path"])
                extracted_text = file_data.decode("utf-8", errors="ignore")
                if extracted_text:
                    metadata["content"] = extracted_text[:100000]
            except Exception as e:
                print(f"TXT download failed: {e}")

        # Generate source guide
        if extracted_text:
            guide_result = await generate_source_guide(extracted_text)
            update_data = {
                "status": "ready",
                "metadata": metadata,
            }
            if guide_result.get("source_guide"):
                update_data["source_guide"] = guide_result["source_guide"]
            if guide_result.get("token_count"):
                update_data["token_count"] = guide_result["token_count"]

            supabase.table("sources").update(update_data).eq("id", str(source_id)).execute()
        else:
            supabase.table("sources").update({
                "status": "ready",
                "error_message": "No content could be extracted",
            }).eq("id", str(source_id)).execute()

    except Exception as e:
        supabase.table("sources").update({
            "status": "ready",
            "error_message": f"Reprocessing failed: {str(e)[:200]}",
        }).eq("id", str(source_id)).execute()

    # Return refreshed source
    result = supabase.table("sources").select("*").eq("id", str(source_id)).single().execute()
    return ApiResponse(data=result.data)


@router.get("", response_model=ApiResponse)
async def list_sources(
    notebook_id: UUID,
    user: dict = Depends(get_current_user),
):
    """List all sources in a notebook."""
    await verify_notebook_access(notebook_id, user["id"])
    supabase = get_supabase_client()

    result = (
        supabase.table("sources")
        .select("*")
        .eq("notebook_id", str(notebook_id))
        .order("created_at", desc=True)
        .execute()
    )

    return ApiResponse(data=result.data)


@router.get("/{source_id}", response_model=ApiResponse)
async def get_source(
    notebook_id: UUID,
    source_id: UUID,
    user: dict = Depends(get_current_user),
):
    """Get a specific source."""
    await verify_notebook_access(notebook_id, user["id"])
    supabase = get_supabase_client()

    result = (
        supabase.table("sources")
        .select("*")
        .eq("id", str(source_id))
        .eq("notebook_id", str(notebook_id))
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Source not found")

    return ApiResponse(data=result.data)


@router.delete("/{source_id}", response_model=ApiResponse)
async def delete_source(
    notebook_id: UUID,
    source_id: UUID,
    user: dict = Depends(get_current_user),
):
    """Delete a source."""
    await verify_notebook_access(notebook_id, user["id"])
    supabase = get_supabase_client()

    # Get source first to check file path
    source = (
        supabase.table("sources")
        .select("*")
        .eq("id", str(source_id))
        .eq("notebook_id", str(notebook_id))
        .single()
        .execute()
    )

    if not source.data:
        raise HTTPException(status_code=404, detail="Source not found")

    # Delete from storage if file exists
    if source.data.get("file_path"):
        try:
            supabase.storage.from_("sources").remove([source.data["file_path"]])
        except:
            pass  # Ignore storage errors

    # Delete record
    supabase.table("sources").delete().eq("id", str(source_id)).execute()

    # Update notebook source count
    try:
        count_result = supabase.table("sources").select("id", count="exact").eq("notebook_id", str(notebook_id)).execute()
        supabase.table("notebooks").update({
            "source_count": count_result.count or 0
        }).eq("id", str(notebook_id)).execute()
    except Exception:
        pass  # Non-critical

    return ApiResponse(data={"deleted": True, "id": str(source_id)})
