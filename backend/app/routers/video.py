from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from uuid import UUID

from app.models.schemas import (
    VideoCreate,
    ApiResponse,
)
from app.services.auth import get_current_user
from app.services.supabase_client import get_supabase_client
from app.services.gemini import gemini_service

router = APIRouter(prefix="/notebooks/{notebook_id}/video", tags=["video"])


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


async def get_sources_content(notebook_id: UUID, source_ids: Optional[List[UUID]] = None):
    """Get content from sources."""
    supabase = get_supabase_client()

    query = supabase.table("sources").select("*").eq("notebook_id", str(notebook_id)).eq("status", "ready")

    if source_ids:
        query = query.in_("id", [str(sid) for sid in source_ids])

    result = query.execute()
    sources = result.data or []

    content_parts = []
    for source in sources:
        source_guide = source.get("source_guide") or {}
        metadata = source.get("metadata") or {}

        if source["type"] == "text" and metadata.get("content"):
            content_parts.append(metadata["content"])
        elif source_guide.get("summary"):
            content_parts.append(source_guide["summary"])

    return "\n\n".join(content_parts), sources


# Style settings
STYLE_SETTINGS = {
    "documentary": {
        "name": "Documentary",
        "description": "Cinematic documentary style with narration",
        "duration": (30, 60),
    },
    "explainer": {
        "name": "Explainer",
        "description": "Educational explainer with graphics",
        "duration": (30, 90),
    },
    "presentation": {
        "name": "Presentation",
        "description": "Business presentation style",
        "duration": (60, 120),
    },
}


@router.post("/estimate", response_model=ApiResponse)
async def estimate_video_cost(
    notebook_id: UUID,
    video: VideoCreate,
    user: dict = Depends(get_current_user),
):
    """Get cost estimate for video generation."""
    await verify_notebook_access(notebook_id, user["id"])

    style_settings = STYLE_SETTINGS.get(video.style, STYLE_SETTINGS["explainer"])
    min_dur, max_dur = style_settings["duration"]
    avg_duration = (min_dur + max_dur) // 2

    # Veo costs approximately $0.10 per second
    estimated_cost = avg_duration * 0.10

    estimate = {
        "estimated_duration_seconds": avg_duration,
        "estimated_cost_usd": round(estimated_cost, 2),
        "style": video.style,
        "style_name": style_settings["name"],
    }

    return ApiResponse(data=estimate)


@router.post("", response_model=ApiResponse)
async def create_video(
    notebook_id: UUID,
    video: VideoCreate,
    user: dict = Depends(get_current_user),
):
    """Start video overview generation."""
    await verify_notebook_access(notebook_id, user["id"])
    supabase = get_supabase_client()

    # Get source content
    content, sources = await get_sources_content(notebook_id, video.source_ids)

    if not content:
        raise HTTPException(status_code=400, detail="No source content available")

    # Create video record
    video_data = {
        "notebook_id": str(notebook_id),
        "style": video.style,
        "status": "pending",
        "progress_percent": 0,
        "source_ids": [str(s["id"]) for s in sources],
    }

    result = supabase.table("video_overviews").insert(video_data).execute()

    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create video job")

    video_id = result.data[0]["id"]

    # Start processing (in production, this would be async with Veo)
    try:
        # Update status to processing
        supabase.table("video_overviews").update({
            "status": "processing",
            "progress_percent": 10,
        }).eq("id", video_id).execute()

        # Generate script
        script_result = await gemini_service.generate_video_script(
            content=content[:100000],
            style=video.style,
        )

        script = script_result["content"]

        # Update with script
        supabase.table("video_overviews").update({
            "script": script,
            "progress_percent": 50,
        }).eq("id", video_id).execute()

        # In production, we would:
        # 1. Call Veo API to generate video
        # 2. Upload to Supabase Storage
        # 3. Generate thumbnail
        # 4. Update with video_file_path and duration

        # For now, mark as complete with script only
        supabase.table("video_overviews").update({
            "status": "completed",
            "progress_percent": 100,
            "model_used": "gemini-2.5-pro",
            "cost_usd": script_result["usage"]["cost_usd"],
            "completed_at": "now()",
        }).eq("id", video_id).execute()

    except Exception as e:
        supabase.table("video_overviews").update({
            "status": "failed",
            "error_message": str(e),
        }).eq("id", video_id).execute()

    # Get updated record
    result = supabase.table("video_overviews").select("*").eq("id", video_id).single().execute()

    return ApiResponse(data=result.data)


@router.get("", response_model=ApiResponse)
async def list_videos(
    notebook_id: UUID,
    user: dict = Depends(get_current_user),
):
    """List all video overviews for a notebook."""
    await verify_notebook_access(notebook_id, user["id"])
    supabase = get_supabase_client()

    result = (
        supabase.table("video_overviews")
        .select("*")
        .eq("notebook_id", str(notebook_id))
        .order("created_at", desc=True)
        .execute()
    )

    return ApiResponse(data=result.data)


@router.get("/{video_id}", response_model=ApiResponse)
async def get_video(
    notebook_id: UUID,
    video_id: UUID,
    user: dict = Depends(get_current_user),
):
    """Get video overview status."""
    await verify_notebook_access(notebook_id, user["id"])
    supabase = get_supabase_client()

    result = (
        supabase.table("video_overviews")
        .select("*")
        .eq("id", str(video_id))
        .eq("notebook_id", str(notebook_id))
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Video not found")

    return ApiResponse(data=result.data)


@router.get("/{video_id}/download", response_model=ApiResponse)
async def get_video_download(
    notebook_id: UUID,
    video_id: UUID,
    user: dict = Depends(get_current_user),
):
    """Get signed download URL for video file."""
    await verify_notebook_access(notebook_id, user["id"])
    supabase = get_supabase_client()

    result = (
        supabase.table("video_overviews")
        .select("video_file_path")
        .eq("id", str(video_id))
        .eq("notebook_id", str(notebook_id))
        .single()
        .execute()
    )

    if not result.data or not result.data.get("video_file_path"):
        raise HTTPException(status_code=404, detail="Video file not found")

    # Generate signed URL
    signed_url = supabase.storage.from_("video").create_signed_url(
        result.data["video_file_path"],
        3600,  # 1 hour expiry
    )

    return ApiResponse(data={"download_url": signed_url.get("signedURL")})


@router.delete("/{video_id}", response_model=ApiResponse)
async def delete_video(
    notebook_id: UUID,
    video_id: UUID,
    user: dict = Depends(get_current_user),
):
    """Delete a video overview."""
    await verify_notebook_access(notebook_id, user["id"])
    supabase = get_supabase_client()

    # Get video first
    video = (
        supabase.table("video_overviews")
        .select("*")
        .eq("id", str(video_id))
        .eq("notebook_id", str(notebook_id))
        .single()
        .execute()
    )

    if not video.data:
        raise HTTPException(status_code=404, detail="Video not found")

    # Delete from storage if exists
    if video.data.get("video_file_path"):
        try:
            supabase.storage.from_("video").remove([video.data["video_file_path"]])
        except:
            pass

    if video.data.get("thumbnail_path"):
        try:
            supabase.storage.from_("video").remove([video.data["thumbnail_path"]])
        except:
            pass

    # Delete record
    supabase.table("video_overviews").delete().eq("id", str(video_id)).execute()

    return ApiResponse(data={"deleted": True, "id": str(video_id)})
