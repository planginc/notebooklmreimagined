# NotebookLM Reimagined: Project Specification
## Version 2.0 | December 2025 | Supabase Edition

---

# Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Database Schema](#3-database-schema)
4. [API Endpoints](#4-api-endpoints)
5. [Feature Specifications](#5-feature-specifications)
6. [Gemini Integration](#6-gemini-integration)
7. [Frontend](#7-frontend)

---

# 1. Overview

## 1.1 What We're Building

An API-first research intelligence platform that replicates Google NotebookLM's functionality. Every feature is exposed through REST API endpoints.

## 1.2 Design Philosophy

- **API-First**: The API is the product. The web UI is just another client.
- **Supabase for Everything**: Database, auth, storage, realtime - all Supabase.
- **Model Flexibility**: Users choose Gemini models per-request.
- **Cost Transparency**: Every response includes usage and cost.
- **AI-Assisted Development**: Built using Supabase MCP for rapid iteration.

## 1.3 Technology Stack

| Component | Technology |
|-----------|------------|
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| API | FastAPI (Python) |
| Background Jobs | Supabase Edge Functions |
| Realtime | Supabase Realtime |
| AI | Gemini API |
| Frontend | Next.js 14+ with shadcn/ui |

**No Docker. No Redis. No Celery. No self-hosted infrastructure.**

---

# 2. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                  │
│     Web UI  │  n8n  │  Zapier  │  Custom Apps  │  AI Agents     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        SUPABASE                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    Supabase Auth                           │ │
│  │              (JWT tokens, API keys, RLS)                   │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              FastAPI Backend (External Host)               │ │
│  │     /notebooks  /sources  /chat  /audio  /video           │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  PostgreSQL  │  │   Storage    │  │   Realtime   │          │
│  │  (Database)  │  │   (Files)    │  │  (Updates)   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      GEMINI API                                  │
│    File Search  │  generateContent  │  TTS  │  Veo  │  Research │
└─────────────────────────────────────────────────────────────────┘
```

## 2.1 Key Decisions

1. **Gemini File Search for RAG**: Each Notebook maps to a Gemini File Search Store. No vector database needed.

2. **Supabase Storage for Files**: All uploaded files (PDFs, audio, video) stored in Supabase Storage buckets.

3. **Supabase Realtime for Job Status**: Long-running jobs (audio/video generation) update a `jobs` table, and clients subscribe via Realtime.

4. **Row Level Security (RLS)**: All tables have RLS policies ensuring users only see their own data.

---

# 3. Database Schema

## 3.1 Core Tables

### users (managed by Supabase Auth)
Supabase Auth handles user management. We extend with a `profiles` table.

### profiles
```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  avatar_url text,
  settings jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### notebooks
```sql
create table notebooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  emoji text default '📓',
  settings jsonb default '{}',
  file_search_store_id text, -- Gemini File Search Store ID
  source_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### sources
```sql
create table sources (
  id uuid primary key default gen_random_uuid(),
  notebook_id uuid references notebooks(id) on delete cascade not null,
  type text not null, -- 'pdf', 'docx', 'youtube', 'url', 'audio', 'text'
  name text not null,
  status text default 'pending', -- 'pending', 'processing', 'ready', 'failed'
  file_path text, -- Supabase Storage path
  original_filename text,
  mime_type text,
  file_size_bytes bigint,
  token_count int,
  metadata jsonb default '{}', -- duration, transcript, url, etc.
  source_guide jsonb, -- summary, topics, suggested_questions
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### chat_sessions
```sql
create table chat_sessions (
  id uuid primary key default gen_random_uuid(),
  notebook_id uuid references notebooks(id) on delete cascade not null,
  title text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### chat_messages
```sql
create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references chat_sessions(id) on delete cascade not null,
  role text not null, -- 'user', 'assistant'
  content text not null,
  citations jsonb default '[]',
  source_ids_used jsonb default '[]',
  model_used text,
  input_tokens int,
  output_tokens int,
  cost_usd decimal(10,6),
  created_at timestamptz default now()
);
```

### audio_overviews
```sql
create table audio_overviews (
  id uuid primary key default gen_random_uuid(),
  notebook_id uuid references notebooks(id) on delete cascade not null,
  format text not null, -- 'deep_dive', 'brief', 'critique', 'debate'
  status text default 'pending',
  progress_percent int default 0,
  custom_instructions text,
  source_ids jsonb default '[]',
  script text,
  audio_file_path text, -- Supabase Storage path
  duration_seconds int,
  model_used text,
  cost_usd decimal(10,4),
  error_message text,
  created_at timestamptz default now(),
  completed_at timestamptz
);
```

### video_overviews
```sql
create table video_overviews (
  id uuid primary key default gen_random_uuid(),
  notebook_id uuid references notebooks(id) on delete cascade not null,
  style text not null, -- 'whiteboard', 'classic', 'anime', 'retro'
  status text default 'pending',
  progress_percent int default 0,
  source_ids jsonb default '[]',
  script text,
  video_file_path text,
  thumbnail_path text,
  duration_seconds int,
  model_used text,
  cost_usd decimal(10,4),
  error_message text,
  created_at timestamptz default now(),
  completed_at timestamptz
);
```

### research_tasks
```sql
create table research_tasks (
  id uuid primary key default gen_random_uuid(),
  notebook_id uuid references notebooks(id) on delete cascade not null,
  query text not null,
  mode text default 'fast', -- 'fast', 'deep'
  status text default 'pending',
  progress_message text,
  sources_found_count int default 0,
  sources_analyzed_count int default 0,
  report_content text,
  report_citations jsonb default '[]',
  cost_usd decimal(10,4),
  created_at timestamptz default now(),
  completed_at timestamptz
);
```

### notes
```sql
create table notes (
  id uuid primary key default gen_random_uuid(),
  notebook_id uuid references notebooks(id) on delete cascade not null,
  type text default 'written', -- 'written', 'saved_response'
  title text,
  content text,
  tags jsonb default '[]',
  is_pinned boolean default false,
  original_message_id uuid references chat_messages(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### usage_logs
```sql
create table usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  notebook_id uuid references notebooks(id) on delete set null,
  operation_type text not null,
  model_used text,
  input_tokens int,
  output_tokens int,
  cost_usd decimal(10,6),
  metadata jsonb default '{}',
  created_at timestamptz default now()
);
```

## 3.2 Row Level Security (RLS)

Every table needs RLS policies. Example for notebooks:

```sql
alter table notebooks enable row level security;

create policy "Users can view own notebooks"
  on notebooks for select
  using (auth.uid() = user_id);

create policy "Users can create own notebooks"
  on notebooks for insert
  with check (auth.uid() = user_id);

create policy "Users can update own notebooks"
  on notebooks for update
  using (auth.uid() = user_id);

create policy "Users can delete own notebooks"
  on notebooks for delete
  using (auth.uid() = user_id);
```

## 3.3 Storage Buckets

```sql
-- Create storage buckets
insert into storage.buckets (id, name, public) values
  ('sources', 'sources', false),
  ('audio', 'audio', false),
  ('video', 'video', false);

-- Storage policies (example for sources bucket)
create policy "Users can upload to own folder"
  on storage.objects for insert
  with check (bucket_id = 'sources' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can view own files"
  on storage.objects for select
  using (bucket_id = 'sources' and auth.uid()::text = (storage.foldername(name))[1]);
```

---

# 4. API Endpoints

## 4.1 Authentication

Uses Supabase Auth. Clients include JWT token in Authorization header:
```
Authorization: Bearer <supabase_access_token>
```

## 4.2 Endpoint Reference

### Notebooks

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/notebooks` | Create notebook |
| GET | `/notebooks` | List notebooks |
| GET | `/notebooks/{id}` | Get notebook |
| PATCH | `/notebooks/{id}` | Update notebook |
| DELETE | `/notebooks/{id}` | Delete notebook |

### Sources

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/notebooks/{id}/sources` | Upload file |
| POST | `/notebooks/{id}/sources/youtube` | Add YouTube video |
| POST | `/notebooks/{id}/sources/url` | Add website |
| POST | `/notebooks/{id}/sources/text` | Add pasted text |
| GET | `/notebooks/{id}/sources` | List sources |
| GET | `/notebooks/{id}/sources/{sid}` | Get source |
| DELETE | `/notebooks/{id}/sources/{sid}` | Delete source |

### Chat

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/notebooks/{id}/chat` | Send message |
| POST | `/notebooks/{id}/chat/stream` | Stream response (SSE) |
| GET | `/notebooks/{id}/chat/sessions` | List sessions |
| GET | `/notebooks/{id}/chat/sessions/{sid}` | Get session |
| DELETE | `/notebooks/{id}/chat/sessions/{sid}` | Delete session |

### Audio Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/notebooks/{id}/audio` | Start generation |
| POST | `/notebooks/{id}/audio/estimate` | Get cost estimate |
| GET | `/notebooks/{id}/audio/{aid}` | Get status |
| GET | `/notebooks/{id}/audio/{aid}/download` | Get download URL |
| GET | `/notebooks/{id}/audio` | List audio |
| DELETE | `/notebooks/{id}/audio/{aid}` | Delete audio |

### Video Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/notebooks/{id}/video` | Start generation |
| POST | `/notebooks/{id}/video/estimate` | Get cost estimate |
| GET | `/notebooks/{id}/video/{vid}` | Get status |
| GET | `/notebooks/{id}/video/{vid}/download` | Get download URL |
| GET | `/notebooks/{id}/video` | List video |
| DELETE | `/notebooks/{id}/video/{vid}` | Delete video |

### Deep Research

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/notebooks/{id}/research` | Start research |
| GET | `/notebooks/{id}/research/{rid}` | Get status |
| POST | `/notebooks/{id}/research/{rid}/add-to-notebook` | Import results |
| GET | `/notebooks/{id}/research` | List research |

### Study Materials

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/notebooks/{id}/flashcards` | Generate flashcards |
| POST | `/notebooks/{id}/quiz` | Generate quiz |
| POST | `/notebooks/{id}/study-guide` | Generate study guide |
| POST | `/notebooks/{id}/faq` | Generate FAQ |
| POST | `/notebooks/{id}/timeline` | Generate timeline |

### Notes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/notebooks/{id}/notes` | Create note |
| POST | `/notebooks/{id}/notes/save-response` | Save chat response |
| GET | `/notebooks/{id}/notes` | List notes |
| PATCH | `/notebooks/{id}/notes/{nid}` | Update note |
| DELETE | `/notebooks/{id}/notes/{nid}` | Delete note |

### Usage

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/usage` | Get usage stats |
| GET | `/usage/export` | Export CSV |

## 4.3 Response Format

All responses follow this structure:

```json
{
  "data": { ... },
  "usage": {
    "input_tokens": 1500,
    "output_tokens": 500,
    "cost_usd": 0.0023,
    "model_used": "gemini-2.5-flash"
  },
  "meta": {
    "request_id": "req_abc123"
  }
}
```

Error responses:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Notebook not found",
    "details": {}
  }
}
```

---

# 5. Feature Specifications

## 5.1 Source Ingestion

Sources are uploaded to Supabase Storage, then processed and indexed in Gemini File Search.

**Processing Pipeline:**
1. Upload file to Supabase Storage
2. Create source record with `status: 'processing'`
3. Extract text (based on type)
4. Upload to Gemini File Search Store
5. Generate source guide (summary, topics, questions)
6. Update `status: 'ready'`

**Supported Types:**
- PDF, DOCX, TXT, MD, HTML
- YouTube videos (transcript extraction)
- Websites (content scraping)
- Audio files (transcription)
- Pasted text

## 5.2 RAG Chat

Query sources using Gemini File Search.

**Flow:**
1. User sends message
2. (Optional) Filter to specific source IDs
3. Query Gemini File Search Store
4. Gemini returns response with grounding
5. Extract citations from grounding metadata
6. Return response with citations

**Request:**
```json
{
  "message": "What are the key risks?",
  "session_id": "uuid-optional",
  "source_ids": ["uuid1", "uuid2"],
  "model": "gemini-2.5-flash"
}
```

**Response:**
```json
{
  "data": {
    "message_id": "uuid",
    "content": "The key risks identified are... [1] [2]",
    "citations": [
      {
        "number": 1,
        "source_id": "uuid1",
        "source_name": "Q3 Report.pdf",
        "text": "Market volatility presents...",
        "confidence": 0.92
      }
    ],
    "suggested_questions": [
      "How can these risks be mitigated?",
      "What's the timeline for risk assessment?"
    ]
  },
  "usage": { ... }
}
```

## 5.3 Audio Overview

Generate podcast-style audio from notebook content.

**Formats:**
- **Deep Dive**: 6-15 min, 2 hosts, exploratory
- **Brief**: 1-2 min, 1 speaker, concise
- **Critique**: 5-10 min, 2 hosts, analytical
- **Debate**: 8-15 min, 2 hosts, opposing views

**Pipeline:**
1. Retrieve content from sources
2. Generate script with Gemini
3. Synthesize audio with Gemini TTS
4. Upload to Supabase Storage
5. Update database with completion

**Status Updates via Realtime:**
Clients subscribe to `audio_overviews` table changes to get live progress updates.

## 5.4 Video Overview

Generate visual explainer videos using Veo 3.1.

**Styles:**
- Whiteboard (hand-drawn sketches)
- Classic (clean corporate)
- Anime (Japanese animation)
- Retro (8-bit pixel art)

**Pipeline:**
1. Extract key visual concepts
2. Generate scene-by-scene script
3. Render with Veo (8-sec segments, chained)
4. Upload to Supabase Storage

**Cost Warning:** Video is expensive (~$0.10-0.35/sec). Always show cost estimate first.

## 5.5 Deep Research

Autonomous web research agent.

**Modes:**
- **Fast**: 10-30 seconds, ~10 sources
- **Deep**: 5-10 minutes, 100+ sources

**Pipeline:**
1. Decompose query into sub-questions
2. Search web (Google Search grounding)
3. Read full pages (URL context)
4. Identify gaps, search again
5. Synthesize report with citations

## 5.6 Study Materials

Synchronous generation of educational content.

- **Flashcards**: Question/answer pairs
- **Quiz**: Multiple choice with explanations
- **Study Guide**: Glossary + concepts + questions
- **FAQ**: Common questions and answers
- **Timeline**: Chronological events

All return structured JSON immediately (no background job).

---

# 6. Gemini Integration

## 6.1 Models Used

| Feature | Model |
|---------|-------|
| Chat (default) | gemini-2.5-flash |
| Chat (quality) | gemini-3-pro |
| Audio scripts | gemini-2.5-pro |
| TTS | gemini-2.5-pro-tts-preview |
| Video | veo-3.1-fast-preview |
| Deep Research | deep-research-pro-preview |

## 6.2 File Search Store

Each notebook has a Gemini File Search Store:

```python
# Create store when notebook is created
store = genai.FileSearchStore.create(
    name=f"notebook_{notebook_id}"
)

# Upload file to store
genai.FileSearchStore.add_file(
    store_id=store.id,
    file_path=file_path
)

# Query store
response = model.generate_content(
    contents=user_message,
    tools=[genai.Tool.from_file_search(store_id=store.id)]
)
```

## 6.3 Cost Tracking

Track costs for every API call:

```python
def track_usage(user_id, notebook_id, operation, response):
    supabase.table('usage_logs').insert({
        'user_id': user_id,
        'notebook_id': notebook_id,
        'operation_type': operation,
        'model_used': response.model,
        'input_tokens': response.usage.input_tokens,
        'output_tokens': response.usage.output_tokens,
        'cost_usd': calculate_cost(response)
    }).execute()
```

---

# 7. Frontend

## 7.1 Stack

- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: React Query for server state
- **Auth**: Supabase Auth helpers for Next.js
- **Realtime**: Supabase Realtime subscriptions

## 7.2 Layout

Three-panel layout (like NotebookLM):

```
┌─────────────────────────────────────────────────────────┐
│  Logo  │  Notebook Title  │  Share  │  Settings  │  👤  │
├────────┼──────────────────────────────┼──────────────────┤
│        │                              │                  │
│ Sources│         Chat Panel           │     Studio       │
│  Panel │                              │     Panel        │
│        │  [Message history]           │                  │
│ □ PDF  │                              │  Audio Overview  │
│ □ Doc  │                              │  Video Overview  │
│ □ URL  │                              │  Deep Research   │
│        │                              │  Flashcards      │
│        │  ┌────────────────────────┐  │  Quiz            │
│        │  │ Type a message...      │  │  Notes           │
│        │  └────────────────────────┘  │                  │
└────────┴──────────────────────────────┴──────────────────┘
```

## 7.3 Key Components

- **SourcesList**: Checkbox selection for filtering
- **ChatPanel**: Streaming messages with citations
- **CitationHover**: Preview quoted text on hover
- **AudioPlayer**: Waveform, playback, download
- **VideoPlayer**: With thumbnail preview
- **ProgressIndicator**: Real-time job status
- **CostEstimate**: Show before expensive operations

## 7.4 Supabase Integration

```typescript
// Auth
const { data: { session } } = await supabase.auth.getSession()

// Database queries
const { data: notebooks } = await supabase
  .from('notebooks')
  .select('*')
  .order('created_at', { ascending: false })

// Realtime subscriptions
supabase
  .channel('audio-status')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'audio_overviews',
    filter: `id=eq.${audioId}`
  }, (payload) => {
    setProgress(payload.new.progress_percent)
  })
  .subscribe()

// Storage
const { data } = await supabase.storage
  .from('sources')
  .upload(`${userId}/${notebookId}/${file.name}`, file)
```

---

# Appendix: Quick Reference

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Gemini
GOOGLE_API_KEY=AIza...
```

## Supabase MCP Commands

The AI agent can use Supabase MCP to:

```
# Apply migrations
mcp__supabase__apply_migration

# Execute SQL
mcp__supabase__execute_sql

# List tables
mcp__supabase__list_tables

# Generate TypeScript types
mcp__supabase__generate_typescript_types
```

---

**End of Specification**
