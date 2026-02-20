# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Auto-Compact Behavior

**IMPORTANT**: Proactively compact without asking:

1. After ~40-50 tool calls or when conversation feels long, run `/compact` automatically
2. Don't ask permission - just compact and continue working seamlessly
3. In the compact summary, always preserve:
   - Current task state and progress
   - File paths being worked on
   - Pending todos and next steps
   - Key decisions made
   - Any errors encountered and their fixes
4. After compacting, immediately continue the current task

## Project Overview

NotebookLM Reimagined is an API-first research intelligence platform—Google's NotebookLM, reimagined for developers.

**Architecture**: `Next.js (Frontend) → FastAPI (Backend) → Supabase (Auth + DB + Storage) → Gemini API`

## Development Commands

### Backend (FastAPI)
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Backend runs at `http://localhost:8000`. API docs at `/docs`, ReDoc at `/redoc`.

### Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev          # Dev server (http://localhost:3000)
npm run build        # Production build
npm run lint         # ESLint check
npm run lint:fix     # Auto-fix lint issues
npm run format       # Prettier format
npm run format:check # Check formatting
npm run type-check   # TypeScript type checking
npm run analyze      # Bundle size analysis
```

Pre-commit hooks (Husky + lint-staged) auto-run ESLint + Prettier on staged `.ts/.tsx/.js/.jsx` files.

### Environment Variables

**Backend** (`backend/.env`):
```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
GOOGLE_API_KEY=AIza...
ATLASCLOUD_API_KEY=...  # Optional, for Wan 2.5 video
```

**Frontend** (`frontend/.env.local`):
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Server-side only
GOOGLE_API_KEY=AIza...            # Server-side only (for Next.js API routes)
NEXT_PUBLIC_API_URL=http://localhost:8000  # FastAPI backend URL
```

## Architecture: Dual API Layer

**Critical**: This project has TWO API layers that must stay in sync:

1. **FastAPI backend** (`backend/app/routers/`) — The primary API, deployed to Railway as a persistent Python server (uvicorn). Used by external consumers and API key auth.

2. **Next.js API routes** (`frontend/src/app/api/`) — Frontend-side API routes that talk directly to Supabase and Gemini. Used by the web UI via JWT auth.

Both layers implement similar logic (chat, sources, audio, etc.). When fixing bugs in one layer, check if the same fix is needed in the other.

### Auth: Dual Authentication

The FastAPI backend (`backend/app/services/auth.py`) supports two auth methods:
- **JWT** (Supabase Auth) — `Authorization: Bearer <token>` — Used by the web frontend
- **API Key** — `X-API-Key: nb_live_...` — Used by external consumers (n8n, Zapier, etc.)

Auth priority: API key is checked first, then JWT. API keys have scopes, rate limits, and IP allowlists.

## Critical: Keeping Code in Sync

**IMPORTANT**: When modifying any router functions or service code:

1. **Test ALL affected endpoints** - Run programmatic tests after changes
2. **Check for null-safety patterns** - Database fields like `source_guide`, `metadata` can be `None`
   ```python
   # WRONG - fails if source_guide is None
   source.get("source_guide", {}).get("summary")

   # CORRECT - handles None values
   source_guide = source.get("source_guide") or {}
   source_guide.get("summary")
   ```
3. **Update documentation** - Keep `/docs` page in sync with API changes
4. **Register new routers** - Add to `backend/app/main.py` imports AND `include_router()` calls

Common files that share source content extraction patterns (update ALL when fixing bugs):
- **Backend**: `chat.py`, `study.py`, `audio.py`, `video.py`, `studio.py`, `global_chat.py`
- **Frontend**: `frontend/src/app/api/notebooks/[id]/chat/route.ts` and similar API routes

## Key Directory Structure

```
backend/
├── Procfile               # Railway start command (uvicorn)
├── api/index.py           # Legacy Vercel entry point (unused on Railway)
├── vercel.json            # Legacy Vercel config (unused on Railway)
├── app/
│   ├── main.py            # FastAPI app, middleware, router registration
│   ├── config.py          # Settings via pydantic-settings (reads .env)
│   ├── routers/           # 13 routers: notebooks, sources, chat, audio, video, research, study, notes, api_keys, global_chat, studio, export, profile
│   ├── services/          # gemini.py, auth.py, supabase_client.py, persona_utils.py, atlascloud_video.py
│   └── models/schemas.py  # Pydantic request/response models

frontend/
├── src/
│   ├── app/
│   │   ├── api/           # Next.js API routes (parallel to FastAPI backend)
│   │   ├── auth/          # Login/register pages
│   │   ├── notebooks/[id]/ # Three-panel notebook view
│   │   └── page.tsx       # Dashboard
│   ├── components/        # chat/, studio/, study/, sources/, dashboard/, notebook/, panels/, ui/
│   └── lib/               # api.ts (typed API client), supabase.ts, hooks, types

supabase/                  # Database setup files
├── schema.sql             # Full table schema
├── rls_policies.sql       # Row-level security policies
└── storage.sql            # Storage bucket config

mcp-server/                # MCP server for tool integration
open-notebook/             # Alternative notebook implementation
```

## Technology Stack

| Layer | Technology |
|-------|------------|
| Database | Supabase PostgreSQL + Row Level Security |
| Auth | Supabase Auth (JWT) + Custom API Keys |
| File Storage | Supabase Storage |
| Backend API | FastAPI (Python 3.11+), deployed on Railway |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind v4, shadcn/ui |
| State | @tanstack/react-query |
| AI/RAG | Gemini API (File Search, TTS, Veo, Deep Research) |

## Gemini Models Reference

| Feature | Model |
|---------|-------|
| Chat (fast) | gemini-2.5-flash |
| Chat (quality) | gemini-3-pro |
| Frontend chat | gemini-2.5-flash (in Next.js API routes) |
| Audio scripts | gemini-2.5-pro |
| TTS | gemini-2.5-pro-tts-preview |
| Video | veo-3.1-fast-preview |
| Deep Research | deep-research-pro-preview |

## Response Format Convention

All API responses include cost transparency:
```json
{
  "data": { ... },
  "usage": {
    "input_tokens": 1500,
    "output_tokens": 500,
    "cost_usd": 0.0023,
    "model_used": "gemini-2.5-flash"
  }
}
```

## Development with Supabase MCP

Use these MCP commands for direct database/infrastructure management:
```
mcp__supabase__list_projects              # Find project ID
mcp__supabase__list_tables                # View current schema
mcp__supabase__apply_migration            # Create/modify tables (DDL)
mcp__supabase__execute_sql                # Run queries (DML)
mcp__supabase__generate_typescript_types  # Generate frontend types
```

## UI Testing with Chrome MCP

Use Chrome MCP tools to visually verify UI changes:
```
mcp__claude-in-chrome__navigate           # Navigate to URLs
mcp__claude-in-chrome__computer           # Take screenshots, click, type
mcp__claude-in-chrome__read_page          # Get accessibility tree
mcp__claude-in-chrome__find               # Find elements by description
```

## Deployment

| Service | Platform | URL |
|---------|----------|-----|
| Backend API | Railway | https://api-production-410d5.up.railway.app |
| Backend Docs | Railway | https://api-production-410d5.up.railway.app/docs |
| Frontend | Vercel | https://frontend-ebon-kappa-14.vercel.app |

Deploy commands:
```bash
# Backend (Railway) — from backend/ directory
RAILWAY_CONFIG_DIR=~/.railway railway up

# Frontend (Vercel) — from frontend/ directory
cd frontend && vercel --prod
```

## Login Credentials

- App login: paml@digitaleasemedia.com / Willie_Telegram

## Core Specification Documents

- `01_VISION_DOCUMENT.md` - High-level vision and philosophy
- `02_PROJECT_SPECIFICATION.md` - Complete technical spec (schema, 40+ endpoints, features)
- `03_IMPLEMENTATION_GUIDE.md` - Step-by-step implementation guide
