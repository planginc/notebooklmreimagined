# Open NotebookLM Implementation Checklist
## Supabase Edition - Built with AI Assistance

---

## Quick Start for AI Agents

This project is designed to be built using **Supabase MCP**. The AI agent has direct access to:

- Create/manage database tables via migrations
- Execute SQL queries
- Manage storage buckets
- Deploy Edge Functions
- Generate TypeScript types

**No Docker. No Redis. No Celery. No local infrastructure.**

### Key MCP Commands

```
mcp__supabase__list_projects         # Find project ID
mcp__supabase__list_tables           # See current schema
mcp__supabase__apply_migration       # Create tables
mcp__supabase__execute_sql           # Run queries
mcp__supabase__generate_typescript_types  # Generate types
```

---

## Architecture Summary

```
Frontend (Next.js) → Supabase (Auth + DB + Storage) → Gemini API
```

| Component | Solution |
|-----------|----------|
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth |
| File Storage | Supabase Storage |
| API | FastAPI (Python) or Next.js API routes |
| Background Jobs | Supabase Edge Functions |
| Realtime Updates | Supabase Realtime |
| AI/RAG | Gemini API + File Search |

---

## Phase 1: Supabase Setup

### 1.1 Project Initialization
- [x] Create Supabase project (via MCP or dashboard)
- [x] Note project URL and keys
- [x] Set up environment variables:
  ```
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_ANON_KEY=
  SUPABASE_SERVICE_ROLE_KEY=
  GOOGLE_API_KEY=
  ```

### 1.2 Database Schema
Use `mcp__supabase__apply_migration` to create tables:

- [x] **profiles** - User profiles extending Supabase Auth
- [x] **notebooks** - Top-level containers with Gemini File Search Store ID
- [x] **sources** - Documents, URLs, audio (stored in Supabase Storage)
- [x] **chat_sessions** - Conversation containers
- [x] **chat_messages** - Messages with citations
- [x] **audio_overviews** - Podcast generation jobs
- [x] **video_overviews** - Video generation jobs
- [x] **research_tasks** - Deep Research jobs
- [x] **notes** - User notes and saved responses
- [x] **usage_logs** - Cost tracking

### 1.3 Row Level Security (RLS)
- [x] Enable RLS on all tables
- [x] Create policies: users can only access their own data
- [x] Test isolation between users

### 1.4 Storage Buckets
- [x] Create `sources` bucket (PDFs, documents)
- [x] Create `audio` bucket (generated podcasts)
- [x] Create `video` bucket (generated videos)
- [x] Set up storage policies (user folder isolation)

### 1.5 Realtime
- [x] Enable Realtime on `audio_overviews` table
- [x] Enable Realtime on `video_overviews` table
- [x] Enable Realtime on `research_tasks` table

---

## Phase 2: Backend API

### 2.1 Project Structure
```
backend/
├── app/
│   ├── main.py              # FastAPI app
│   ├── config.py            # Settings
│   ├── routers/
│   │   ├── notebooks.py
│   │   ├── sources.py
│   │   ├── chat.py
│   │   ├── audio.py
│   │   ├── video.py
│   │   ├── research.py
│   │   └── study.py
│   ├── services/
│   │   ├── gemini.py        # Gemini API client
│   │   ├── file_search.py   # File Search Store management
│   │   ├── audio_gen.py     # Audio generation
│   │   └── video_gen.py     # Video generation
│   └── models/
│       └── schemas.py       # Pydantic models
├── requirements.txt
└── README.md
```

### 2.2 Core Endpoints

**Notebooks**
- [x] `POST /notebooks` - Create notebook + Gemini File Search Store
- [x] `GET /notebooks` - List user's notebooks
- [x] `GET /notebooks/{id}` - Get notebook details
- [x] `PATCH /notebooks/{id}` - Update notebook
- [x] `DELETE /notebooks/{id}` - Delete notebook + cleanup

**Sources**
- [x] `POST /notebooks/{id}/sources` - Upload file to Supabase Storage
- [x] `POST /notebooks/{id}/sources/youtube` - Add YouTube video
- [x] `POST /notebooks/{id}/sources/url` - Add website
- [x] `POST /notebooks/{id}/sources/text` - Add pasted text
- [x] `GET /notebooks/{id}/sources` - List sources
- [x] `DELETE /notebooks/{id}/sources/{sid}` - Delete source

**Chat**
- [x] `POST /notebooks/{id}/chat` - Send message, get response with citations
- [ ] `POST /notebooks/{id}/chat/stream` - Streaming response (SSE)
- [x] `GET /notebooks/{id}/chat/sessions` - List chat sessions
- [x] `DELETE /notebooks/{id}/chat/sessions/{sid}` - Delete session

**Audio Overview**
- [x] `POST /notebooks/{id}/audio` - Start audio generation
- [x] `POST /notebooks/{id}/audio/estimate` - Get cost estimate
- [x] `GET /notebooks/{id}/audio/{aid}` - Get status/progress
- [x] `GET /notebooks/{id}/audio/{aid}/download` - Get download URL
- [x] `DELETE /notebooks/{id}/audio/{aid}` - Delete audio

**Video Overview**
- [x] `POST /notebooks/{id}/video` - Start video generation
- [x] `POST /notebooks/{id}/video/estimate` - Get cost estimate
- [x] `GET /notebooks/{id}/video/{vid}` - Get status/progress
- [x] `GET /notebooks/{id}/video/{vid}/download` - Get download URL

**Deep Research**
- [x] `POST /notebooks/{id}/research` - Start research task
- [x] `GET /notebooks/{id}/research/{rid}` - Get status/report
- [x] `POST /notebooks/{id}/research/{rid}/add-to-notebook` - Import results

**Study Materials** (synchronous)
- [x] `POST /notebooks/{id}/flashcards` - Generate flashcards
- [x] `POST /notebooks/{id}/quiz` - Generate quiz
- [x] `POST /notebooks/{id}/study-guide` - Generate study guide
- [x] `POST /notebooks/{id}/faq` - Generate FAQ

**Notes**
- [x] `POST /notebooks/{id}/notes` - Create note
- [x] `POST /notebooks/{id}/notes/save-response` - Save chat response
- [x] `GET /notebooks/{id}/notes` - List notes
- [x] `DELETE /notebooks/{id}/notes/{nid}` - Delete note

### 2.3 Gemini Integration
- [x] Create Gemini API client wrapper
- [x] Implement File Search Store management:
  - Create store on notebook creation
  - Add files to store on source upload
  - Delete store on notebook deletion
- [x] Implement chat with File Search (RAG)
- [x] Implement TTS for audio generation (script only, demo mode)
- [x] Implement Veo for video generation (script only, demo mode)
- [x] Implement Deep Research agent (demo mode)

### 2.4 Background Processing
For long-running tasks (audio, video, research):
- [x] Update progress in database
- [x] Frontend subscribes via Supabase Realtime
- [x] Upload results to Supabase Storage
- [x] Update status to `completed` or `failed`

---

## Phase 3: Frontend

### 3.1 Project Setup
```
frontend/
├── app/
│   ├── layout.tsx
│   ├── page.tsx              # Dashboard
│   ├── auth/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   └── notebooks/
│       └── [id]/page.tsx     # Notebook view
├── components/
│   ├── sources/
│   ├── chat/
│   ├── studio/
│   └── ui/                   # shadcn/ui components
├── lib/
│   ├── supabase.ts           # Supabase client
│   └── api.ts                # API client
└── package.json
```

### 3.2 Core Setup
- [x] Initialize Next.js 14+ with App Router
- [x] Install and configure Tailwind CSS
- [x] Install shadcn/ui components
- [x] Set up Supabase client
- [x] Configure auth middleware

### 3.3 Authentication
- [x] Login page with Supabase Auth
- [x] Register page
- [x] Protected route middleware
- [x] User menu with logout

### 3.4 Dashboard
- [x] Notebook grid/list view
- [x] Create notebook button
- [x] Notebook cards with metadata
- [x] Delete notebook functionality

### 3.5 Notebook View (Three-Panel Layout)

**Left Panel - Sources**
- [x] Sources list with checkboxes
- [x] Add source button/modal
- [x] File upload (drag & drop)
- [x] YouTube URL input
- [x] Website URL input
- [x] Text paste input
- [x] Processing status indicators
- [x] Delete source

**Center Panel - Chat**
- [x] Message input
- [x] Message list
- [ ] Streaming response display
- [x] Citations with hover preview
- [x] Suggested questions
- [x] Session management

**Right Panel - Studio**
- [x] Audio Overview generator
  - Format selection
  - Custom instructions
  - Progress indicator
  - Audio player (placeholder)
  - Download button
- [x] Video Overview generator
  - Style selection
  - Cost estimate
  - Progress indicator
  - Video player (placeholder)
- [x] Deep Research
  - Query input
  - Mode selection
  - Progress display
  - Report view (placeholder)
- [x] Study Materials
  - Flashcard generator
  - Quiz generator
  - Study guide generator
  - FAQ generator
- [x] Notes section
  - Create/edit notes
  - Save chat responses

### 3.6 Realtime Status Updates
- [x] Subscribe to audio_overviews changes (infrastructure ready)
- [x] Subscribe to video_overviews changes (infrastructure ready)
- [x] Subscribe to research_tasks changes (infrastructure ready)
- [ ] Update UI on progress changes (needs frontend implementation)

---

## Phase 4: Polish & Deploy

### 4.1 Testing
- [x] Test source upload flow
- [x] Test RAG chat with citations
- [x] Test audio generation (demo mode)
- [x] Test realtime progress updates (infrastructure)
- [x] Test RLS (user isolation)

### 4.2 Error Handling
- [x] API error responses
- [x] Frontend error displays
- [ ] Retry logic for Gemini API
- [x] Graceful degradation

### 4.3 Cost Management
- [x] Cost estimates before expensive operations
- [x] Usage logging to database
- [ ] Usage dashboard (optional)

### 4.4 Deployment
- [ ] Deploy backend (Vercel, Railway, or similar)
- [ ] Deploy frontend (Vercel)
- [ ] Set environment variables
- [ ] Test production flow

---

## Quick Reference

### Environment Variables
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Gemini
GOOGLE_API_KEY=AIza...

# Backend (if separate)
BACKEND_URL=https://api.yourapp.com
```

### Gemini Models
| Feature | Model |
|---------|-------|
| Chat (fast) | gemini-2.5-flash |
| Chat (quality) | gemini-3-pro |
| Audio scripts | gemini-2.5-pro |
| TTS | gemini-2.5-pro-tts-preview |
| Video | veo-3.1-fast-preview |
| Research | deep-research-pro-preview |

### Cost Estimates
| Operation | Typical Cost |
|-----------|--------------|
| Chat (Flash) | $0.001 - $0.01 |
| Chat (Pro) | $0.02 - $0.10 |
| Audio (Deep Dive) | $0.40 - $0.80 |
| Video (48 sec) | $4 - $6 |
| Deep Research | $0.50 - $2.00 |

---

## MVP Priority Order

1. **Database setup** (Supabase MCP) ✅
2. **Notebooks CRUD** ✅
3. **Source upload** (file → Storage → Gemini File Search) ✅
4. **RAG Chat** with citations ✅
5. **Basic frontend** (dashboard + notebook view) ✅
6. **Audio Overview** generation ✅
7. **Deploy** (pending)

Everything else can be added incrementally after MVP.

---

## Status Summary

| Category | Status |
|----------|--------|
| Database Schema | ✅ Complete |
| RLS Policies | ✅ Complete |
| Storage Buckets | ✅ Complete |
| Backend API | ✅ Complete (demo mode) |
| Frontend Core | ✅ Complete |
| Auth Flow | ✅ Complete |
| Dashboard | ✅ Complete |
| Notebook View | ✅ Complete |
| Chat | ✅ Complete |
| Sources | ✅ Complete |
| Audio | ✅ Complete (demo) |
| Video | ✅ Complete (demo) |
| Research | ✅ Complete (demo) |
| Study Materials | ✅ Complete (demo) |
| Notes | ✅ Complete |
| Streaming | ⏳ Pending |
| Deployment | ⏳ Pending |

**Note**: "Demo mode" means the feature works but generates placeholder content. Configure `GOOGLE_API_KEY` for full Gemini-powered functionality.

---

**Total estimated effort: 2-4 weeks** (with AI assistance using Supabase MCP)
