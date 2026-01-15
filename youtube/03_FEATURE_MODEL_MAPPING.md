# Feature to Model/Service Mapping

## Quick Reference Table

| Feature | AI Model | Service/API | Cost Tier |
|---------|----------|-------------|-----------|
| **Chat** | Gemini 2.5 Flash | Google AI | $ (cheap) |
| **Chat (quality)** | Gemini 2.5 Pro | Google AI | $$$ (expensive) |
| **Source Processing** | Gemini 2.5 Flash | Google AI | $ |
| **Audio Overview Script** | Gemini 2.5 Pro | Google AI | $$$ |
| **Audio TTS** | Gemini 2.5 Flash TTS | Google AI | $$ |
| **Video Overview** | Wan 2.5 | AtlasCloud | $$$$ |
| **Flashcards** | Gemini 2.0 Flash | Google AI | $ |
| **Quiz** | Gemini 2.0 Flash | Google AI | $ |
| **Study Guide** | Gemini 2.0 Flash | Google AI | $ |
| **FAQ** | Gemini 2.0 Flash | Google AI | $ |
| **Report** | Gemini 2.0 Flash | Google AI | $ |
| **Slide Deck** | Gemini 2.0 Flash | Google AI | $ |
| **Infographic** | Gemini 2.0 Flash | Google AI | $ |
| **Data Table** | Gemini 2.0 Flash | Google AI | $ |

---

## Detailed Breakdown

### 1. Chat / RAG Responses

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│   CHAT WITH SOURCES                                                              │
│                                                                                  │
│   ┌─────────────────┐     ┌─────────────────┐                                   │
│   │  User Question  │────►│  Source Context │                                   │
│   └─────────────────┘     │   + Question    │                                   │
│                           └────────┬────────┘                                   │
│                                    │                                            │
│                                    ▼                                            │
│                           ┌─────────────────┐                                   │
│                           │                 │                                   │
│                           │  GEMINI 2.5     │                                   │
│                           │    FLASH        │  ← Default (fast, cheap)          │
│                           │                 │                                   │
│                           │    - or -       │                                   │
│                           │                 │                                   │
│                           │  GEMINI 2.5     │  ← Optional (quality mode)        │
│                           │    PRO          │                                   │
│                           │                 │                                   │
│                           └────────┬────────┘                                   │
│                                    │                                            │
│                                    ▼                                            │
│                           ┌─────────────────┐                                   │
│                           │ Answer + Citations│                                  │
│                           └─────────────────┘                                   │
│                                                                                  │
│   Pricing (per 1M tokens):                                                       │
│   • Gemini 2.5 Flash:  Input $0.15 / Output $0.60                               │
│   • Gemini 2.5 Pro:    Input $1.25 / Output $10.00                              │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Code Location:** `backend/app/routers/chat.py` → `gemini_service.chat()`

---

### 2. Source Processing (When you upload a document)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│   SOURCE GUIDE GENERATION                                                        │
│                                                                                  │
│   When you upload a PDF, URL, YouTube, or text:                                  │
│                                                                                  │
│   ┌─────────────────┐                                                           │
│   │  Raw Document   │                                                           │
│   │  Content        │                                                           │
│   └────────┬────────┘                                                           │
│            │                                                                    │
│            ▼                                                                    │
│   ┌─────────────────────────────────────────────────────────────────┐          │
│   │                                                                  │          │
│   │                      GEMINI 2.5 FLASH                            │          │
│   │                                                                  │          │
│   │   Generates a "Source Guide":                                    │          │
│   │   • Summary (what the document is about)                         │          │
│   │   • Key topics                                                   │          │
│   │   • Main entities (people, places, concepts)                     │          │
│   │   • Suggested questions                                          │          │
│   │                                                                  │          │
│   └────────┬────────────────────────────────────────────────────────┘          │
│            │                                                                    │
│            ▼                                                                    │
│   ┌─────────────────┐                                                           │
│   │  Indexed Source │  ← Ready for RAG queries                                  │
│   │  with Metadata  │                                                           │
│   └─────────────────┘                                                           │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Code Location:** `backend/app/routers/sources.py` → `gemini_service.generate_source_guide()`

---

### 3. Audio Overview (Podcast Generation)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│   AUDIO OVERVIEW PIPELINE                                                        │
│                                                                                  │
│   ┌─────────────────┐                                                           │
│   │  Your Sources   │                                                           │
│   └────────┬────────┘                                                           │
│            │                                                                    │
│            ▼                                                                    │
│   ┌─────────────────────────────────────────────────────────────────┐          │
│   │                                                                  │          │
│   │                      STEP 1: SCRIPT                              │          │
│   │                                                                  │          │
│   │                    GEMINI 2.5 PRO                                │          │
│   │                                                                  │          │
│   │   Creates a podcast-style script with:                           │          │
│   │   • Host 1 (Aoede) - Female voice                                │          │
│   │   • Host 2 (Charon) - Male voice                                 │          │
│   │   • Natural conversation flow                                    │          │
│   │   • Key insights from your sources                               │          │
│   │                                                                  │          │
│   │   Formats:                                                       │          │
│   │   • deep_dive (10-15 min)                                        │          │
│   │   • brief_summary (3-5 min)                                      │          │
│   │   • debate (two opposing viewpoints)                             │          │
│   │                                                                  │          │
│   └────────┬────────────────────────────────────────────────────────┘          │
│            │                                                                    │
│            ▼                                                                    │
│   ┌─────────────────────────────────────────────────────────────────┐          │
│   │                                                                  │          │
│   │                      STEP 2: TEXT-TO-SPEECH                      │          │
│   │                                                                  │          │
│   │                GEMINI 2.5 FLASH TTS (Preview)                    │          │
│   │                                                                  │          │
│   │   Model: gemini-2.5-flash-preview-tts                            │          │
│   │                                                                  │          │
│   │   Voices:                                                        │          │
│   │   • Aoede (female)                                               │          │
│   │   • Charon (male)                                                │          │
│   │   • Kore, Fenrir, Puck, etc.                                     │          │
│   │                                                                  │          │
│   │   Supports multi-speaker conversations!                          │          │
│   │                                                                  │          │
│   └────────┬────────────────────────────────────────────────────────┘          │
│            │                                                                    │
│            ▼                                                                    │
│   ┌─────────────────┐                                                           │
│   │   MP3 Audio     │  ← Stored in Supabase Storage                             │
│   │   File          │                                                           │
│   └─────────────────┘                                                           │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Code Location:** `backend/app/routers/audio.py` → `gemini_service.generate_podcast_script()` + `generate_tts_audio()`

---

### 4. Video Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│   VIDEO OVERVIEW PIPELINE                                                        │
│                                                                                  │
│   ┌─────────────────┐                                                           │
│   │  Your Sources   │                                                           │
│   └────────┬────────┘                                                           │
│            │                                                                    │
│            ▼                                                                    │
│   ┌─────────────────────────────────────────────────────────────────┐          │
│   │                                                                  │          │
│   │                      STEP 1: SCRIPT                              │          │
│   │                                                                  │          │
│   │                    GEMINI 2.5 PRO                                │          │
│   │                                                                  │          │
│   │   Creates a video script with:                                   │          │
│   │   • Scene descriptions                                           │          │
│   │   • Visual prompts for video generation                          │          │
│   │   • Key messages                                                 │          │
│   │                                                                  │          │
│   └────────┬────────────────────────────────────────────────────────┘          │
│            │                                                                    │
│            ▼                                                                    │
│   ┌─────────────────────────────────────────────────────────────────┐          │
│   │                                                                  │          │
│   │                      STEP 2: VIDEO GENERATION                    │          │
│   │                                                                  │          │
│   │                    WAN 2.5 (AtlasCloud API)                      │          │
│   │                                                                  │          │
│   │   Model: alibaba/wan-2.5/text-to-video-fast                      │          │
│   │                                                                  │          │
│   │   • Text-to-video generation                                     │          │
│   │   • Creates short video clips                                    │          │
│   │   • Combines into final video                                    │          │
│   │                                                                  │          │
│   │   Note: This is NOT Google Veo (yet)                             │          │
│   │   Currently using AtlasCloud's Wan 2.5 model                     │          │
│   │                                                                  │          │
│   └────────┬────────────────────────────────────────────────────────┘          │
│            │                                                                    │
│            ▼                                                                    │
│   ┌─────────────────┐                                                           │
│   │   MP4 Video     │  ← Stored in Supabase Storage                             │
│   │   File          │                                                           │
│   └─────────────────┘                                                           │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Code Location:** `backend/app/routers/video.py` → `atlascloud_video.generate_video()`

---

### 5. Study Materials

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│   STUDY MATERIALS (All use GEMINI 2.0 FLASH)                                    │
│                                                                                  │
│   ┌─────────────────┐                                                           │
│   │  Your Sources   │                                                           │
│   └────────┬────────┘                                                           │
│            │                                                                    │
│            ├────────────────────────────────────────────────────────────┐       │
│            │                                                             │       │
│            ▼                                                             ▼       │
│   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌───────────┐ │
│   │   FLASHCARDS    │  │      QUIZ       │  │   STUDY GUIDE   │  │    FAQ    │ │
│   │                 │  │                 │  │                 │  │           │ │
│   │  generate_      │  │  generate_      │  │  generate_      │  │ generate_ │ │
│   │  flashcards()   │  │  quiz()         │  │  study_guide()  │  │ faq()     │ │
│   │                 │  │                 │  │                 │  │           │ │
│   │  Returns:       │  │  Returns:       │  │  Returns:       │  │ Returns:  │ │
│   │  • question     │  │  • questions    │  │  • sections     │  │ • question│ │
│   │  • answer       │  │  • choices      │  │  • summaries    │  │ • answer  │ │
│   │  • source_id    │  │  • correct ans  │  │  • key points   │  │           │ │
│   │                 │  │  • explanation  │  │                 │  │           │ │
│   └─────────────────┘  └─────────────────┘  └─────────────────┘  └───────────┘ │
│                                                                                  │
│   All powered by: gemini-2.0-flash (fast & cheap)                               │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Code Location:** `backend/app/routers/study.py` → `gemini_service.generate_flashcards()`, etc.

---

### 6. Studio / Creative Outputs

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│   STUDIO OUTPUTS (All use GEMINI 2.0 FLASH)                                     │
│                                                                                  │
│   ┌─────────────────┐                                                           │
│   │  Your Sources   │                                                           │
│   └────────┬────────┘                                                           │
│            │                                                                    │
│            ├────────────────────────────────────────────────────────────┐       │
│            │                                                             │       │
│            ▼                                                             ▼       │
│   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌───────────┐ │
│   │     REPORT      │  │   SLIDE DECK    │  │   INFOGRAPHIC   │  │DATA TABLE │ │
│   │                 │  │                 │  │                 │  │           │ │
│   │  generate_      │  │  generate_      │  │  generate_      │  │ generate_ │ │
│   │  report()       │  │  slide_deck()   │  │  infographic()  │  │ data_     │ │
│   │                 │  │                 │  │                 │  │ table()   │ │
│   │  Returns:       │  │  Returns:       │  │  Returns:       │  │           │ │
│   │  • title        │  │  • slides[]     │  │  • title        │  │ Returns:  │ │
│   │  • sections[]   │  │  • title        │  │  • sections     │  │ • columns │ │
│   │  • executive    │  │  • content      │  │  • visual data  │  │ • rows    │ │
│   │    summary      │  │  • notes        │  │  • stats        │  │ • summary │ │
│   │                 │  │                 │  │                 │  │           │ │
│   └─────────────────┘  └─────────────────┘  └─────────────────┘  └───────────┘ │
│                                                                                  │
│   All powered by: gemini-2.0-flash (fast & cheap)                               │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Code Location:** `backend/app/routers/studio.py` → `gemini_service.generate_report()`, etc.

---

## Model Comparison

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│                           GEMINI MODEL LINEUP                                    │
│                                                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   GEMINI 2.0 FLASH                                                               │
│   ├── Speed: ⚡⚡⚡⚡⚡ (Fastest)                                                   │
│   ├── Quality: ⭐⭐⭐                                                             │
│   ├── Cost: $ (Input: $0.10/1M, Output: $0.40/1M)                               │
│   └── Used for: Flashcards, Quiz, Study Guide, FAQ, Reports, Tables             │
│                                                                                  │
│   GEMINI 2.5 FLASH                                                               │
│   ├── Speed: ⚡⚡⚡⚡                                                              │
│   ├── Quality: ⭐⭐⭐⭐                                                            │
│   ├── Cost: $$ (Input: $0.15/1M, Output: $0.60/1M)                              │
│   └── Used for: Chat (default), Source processing                               │
│                                                                                  │
│   GEMINI 2.5 PRO                                                                 │
│   ├── Speed: ⚡⚡                                                                 │
│   ├── Quality: ⭐⭐⭐⭐⭐ (Best)                                                    │
│   ├── Cost: $$$ (Input: $1.25/1M, Output: $10.00/1M)                            │
│   └── Used for: Audio scripts, Video scripts, Quality chat mode                 │
│                                                                                  │
│   GEMINI 2.5 FLASH TTS (Preview)                                                 │
│   ├── Type: Text-to-Speech                                                       │
│   ├── Voices: Aoede, Charon, Kore, Fenrir, Puck, etc.                           │
│   ├── Features: Multi-speaker support!                                          │
│   └── Used for: Audio overview generation                                       │
│                                                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   EXTERNAL: WAN 2.5 (AtlasCloud)                                                │
│   ├── Type: Text-to-Video                                                        │
│   ├── Model: alibaba/wan-2.5/text-to-video-fast                                 │
│   ├── Provider: AtlasCloud API                                                  │
│   └── Used for: Video overview generation                                       │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Cost Optimization Strategy

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│   HOW WE OPTIMIZE COSTS                                                          │
│                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                                                                          │   │
│   │   CHEAP OPERATIONS (High volume, fast response needed)                   │   │
│   │                                                                          │   │
│   │   • Chat messages → Gemini 2.5 Flash                                     │   │
│   │   • Flashcard generation → Gemini 2.0 Flash                              │   │
│   │   • Quiz generation → Gemini 2.0 Flash                                   │   │
│   │   • FAQ generation → Gemini 2.0 Flash                                    │   │
│   │                                                                          │   │
│   │   These are called frequently, so we use the cheapest models             │   │
│   │                                                                          │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                                                                          │   │
│   │   EXPENSIVE OPERATIONS (Low volume, quality matters)                     │   │
│   │                                                                          │   │
│   │   • Audio scripts → Gemini 2.5 Pro (needs natural dialogue)              │   │
│   │   • Video scripts → Gemini 2.5 Pro (needs compelling visuals)            │   │
│   │   • Quality chat → Gemini 2.5 Pro (user opted for quality)               │   │
│   │                                                                          │   │
│   │   These are called rarely, so we use the best models                     │   │
│   │                                                                          │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│   RESULT: Most operations cost < $0.01, expensive ones ~$0.05-0.20              │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints → Model Mapping

| Endpoint | Method | Model Used |
|----------|--------|------------|
| `/notebooks/{id}/chat` | POST | gemini-2.5-flash (or gemini-2.5-pro) |
| `/notebooks/{id}/sources/text` | POST | gemini-2.5-flash |
| `/notebooks/{id}/sources/url` | POST | gemini-2.5-flash |
| `/notebooks/{id}/sources/youtube` | POST | gemini-2.5-flash |
| `/notebooks/{id}/sources/pdf` | POST | gemini-2.5-flash |
| `/notebooks/{id}/audio` | POST | gemini-2.5-pro + gemini-2.5-flash-preview-tts |
| `/notebooks/{id}/video` | POST | gemini-2.5-pro + wan-2.5 |
| `/notebooks/{id}/flashcards` | POST | gemini-2.0-flash |
| `/notebooks/{id}/quiz` | POST | gemini-2.0-flash |
| `/notebooks/{id}/study-guide` | POST | gemini-2.0-flash |
| `/notebooks/{id}/faq` | POST | gemini-2.0-flash |
| `/notebooks/{id}/studio/report` | POST | gemini-2.0-flash |
| `/notebooks/{id}/studio/slide-deck` | POST | gemini-2.0-flash |
| `/notebooks/{id}/studio/infographic` | POST | gemini-2.0-flash |
| `/notebooks/{id}/studio/data-table` | POST | gemini-2.0-flash |
| `/chat/global` | POST | gemini-2.5-flash |

---

*Created for YouTube video production - NotebookLM Reimagined*
