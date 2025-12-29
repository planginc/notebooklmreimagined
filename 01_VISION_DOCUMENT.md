# Project Vision: Open NotebookLM
## An API-First Research Intelligence Platform

---

## The Problem We're Solving

Google's NotebookLM is impressive. It takes your documents, lets you chat with them, and generates surprisingly good AI podcasts. But it has three fundamental limitations:

1. **It's a walled garden.** No API. No webhooks. No automation.
2. **It's tied to Google's ecosystem.** Can't customize, can't integrate.
3. **It's a product, not a platform.** Use it their way or not at all.

We're building the open alternative.

---

## The Vision

**Build an API-first research intelligence platform that replicates NotebookLM's functionality while exposing every feature through a clean REST API.**

- **Every feature accessible via HTTP.** Upload a document? POST request. Generate a podcast? POST request. Query your sources? GET request.
- **Plug into anything.** n8n workflows, Zapier automations, custom scripts, mobile apps, Slack bots.
- **Transparent costs.** Know exactly what each operation costs. No surprises.
- **Model flexibility.** Switch between Gemini models per-request based on quality/cost needs.

---

## Technical Philosophy

### API-First, Always

The web UI is just another API client. Everything the UI does, it does through the same endpoints available to any other integration.

### Supabase for Everything

We use **Supabase** as our complete backend platform:

- **Database**: Supabase PostgreSQL for all data
- **Auth**: Supabase Auth for user management and API keys
- **Storage**: Supabase Storage for files (PDFs, audio, video)
- **Edge Functions**: For background processing and webhooks
- **Realtime**: For live status updates on long-running jobs

**Why Supabase?**
- Zero infrastructure to manage
- Built-in Row Level Security (RLS) for data isolation
- Generous free tier for development
- Production-ready from day one
- **Supabase MCP** enables AI agents to interact directly with our backend

### AI Agent Development with Supabase MCP

This project is designed to be built **with AI assistance** using the Supabase MCP (Model Context Protocol). An AI agent can:

- Create and manage database tables
- Write and execute migrations
- Query data directly
- Deploy Edge Functions
- Manage storage buckets

This dramatically accelerates development.

### Cost Transparency

Every endpoint returns cost metadata:
```json
{
  "result": "...",
  "usage": {
    "input_tokens": 15420,
    "output_tokens": 2340,
    "cost_usd": 0.0234,
    "model_used": "gemini-2.5-flash"
  }
}
```

### Model Flexibility

Every endpoint accepts an optional `model` parameter:
```bash
POST /notebooks/{id}/chat
{
  "message": "Summarize chapter 3",
  "model": "gemini-3-pro"  // or "gemini-2.5-flash"
}
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                  │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │ Web UI  │  │   n8n   │  │ Zapier  │  │ Custom  │            │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘            │
└───────┼────────────┼────────────┼────────────┼──────────────────┘
        │            │            │            │
        ▼            ▼            ▼            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SUPABASE BACKEND                             │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Supabase Auth (JWT + API Keys)                             ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  FastAPI on Supabase Edge Functions                         ││
│  │  /notebooks  /sources  /chat  /audio  /video  /research     ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐         │
│  │  PostgreSQL   │ │    Storage    │ │   Realtime    │         │
│  │  (Database)   │ │   (Files)     │ │  (Live Jobs)  │         │
│  └───────────────┘ └───────────────┘ └───────────────┘         │
└─────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    GEMINI API LAYER                              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  File Search  │  generateContent  │  TTS  │  Veo  │  ...   ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

**Key architectural decision**: Uses Gemini File Search as the managed RAG system. Each Notebook maps to a Gemini File Search Store. No custom vector database needed.

---

## What We're Building

### Core Features (NotebookLM Parity)

| Feature | Description |
|---------|-------------|
| **Multi-format Ingestion** | PDFs, DOCX, TXT, MD, websites, YouTube videos, audio files |
| **RAG-Powered Chat** | Query your sources with automatic citations |
| **Audio Overviews** | Podcast-style content (Deep Dive, Brief, Critique, Debate) |
| **Video Overviews** | Visual explainers via Veo 3.1 |
| **Deep Research** | Autonomous multi-step web research |
| **Study Materials** | Flashcards, quizzes, study guides, glossaries |
| **Mind Maps** | Interactive topic visualization |

### Beyond NotebookLM

| Feature | Description |
|---------|-------------|
| **Full REST API** | Every feature exposed as an HTTP endpoint |
| **Webhooks** | Get notified when async operations complete |
| **Usage Analytics** | Track costs and usage patterns |
| **Multi-Tenancy** | Isolated notebooks per user |

---

## The User Experience

### For Developers (Primary Interface)

```bash
# Create a notebook
curl -X POST https://your-project.supabase.co/functions/v1/notebooks \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -d '{"name": "Q4 Strategy Research"}'

# Upload a source
curl -X POST https://your-project.supabase.co/functions/v1/notebooks/nb_123/sources \
  -F "file=@quarterly_report.pdf"

# Chat with sources
curl -X POST https://your-project.supabase.co/functions/v1/notebooks/nb_123/chat \
  -d '{"message": "What are the key risks?", "model": "gemini-2.5-flash"}'

# Generate a podcast
curl -X POST https://your-project.supabase.co/functions/v1/notebooks/nb_123/audio \
  -d '{"format": "deep_dive"}'
```

### For No-Code Users (n8n / Zapier)

1. **Trigger**: New file added to Google Drive
2. **Action**: HTTP Request → Upload to Open NotebookLM
3. **Action**: HTTP Request → Generate summary
4. **Action**: Post summary to Slack
5. **Action**: HTTP Request → Generate podcast

All automatic, no browser needed.

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| **Database** | Supabase PostgreSQL |
| **Auth** | Supabase Auth |
| **File Storage** | Supabase Storage |
| **API** | FastAPI (Python) on Supabase Edge Functions or external hosting |
| **Background Jobs** | Supabase Edge Functions + pg_cron |
| **Realtime Updates** | Supabase Realtime |
| **AI/ML** | Gemini API (File Search, TTS, Veo, Deep Research) |

**No Docker. No Redis. No Celery. No infrastructure to manage.**

---

## Model Selection Guide

| Task | Recommended Model | Reason |
|------|------------------|--------|
| Quick queries | gemini-2.5-flash | Speed and cost |
| Complex analysis | gemini-3-pro | Reasoning quality |
| Audio scripts | gemini-2.5-pro | Quality/cost balance |
| TTS | gemini-2.5-pro-tts-preview | Audio quality |
| Video generation | veo-3.1-fast-preview | Cost ($0.10/sec) |

---

## Cost Reference

| Operation | Typical Cost |
|-----------|--------------|
| Chat query (Flash) | $0.001 - $0.01 |
| Chat query (Pro) | $0.02 - $0.10 |
| Audio Overview (Deep Dive) | $0.40 - $0.80 |
| Video Overview (48 sec, fast) | $4 - $6 |
| Deep Research | $0.50 - $2.00 |

---

## Success Metrics

### Phase 1: Core Functionality
- [ ] Document ingestion working (PDF, DOCX, TXT)
- [ ] RAG chat with citations functional
- [ ] Audio overview generation complete
- [ ] All features exposed via API

### Phase 2: Parity
- [ ] YouTube source ingestion
- [ ] Website scraping
- [ ] Video overview generation
- [ ] Deep Research agent
- [ ] Study material generation

### Phase 3: Polish
- [ ] Web UI complete
- [ ] Webhook notifications
- [ ] Usage analytics

---

## Let's Build It

The philosophy is simple:

**NotebookLM says**: "Here's our product. Use it our way."

**Open NotebookLM says**: "Here's a platform. Build whatever you want."

With Supabase handling all infrastructure and the Supabase MCP enabling rapid AI-assisted development, we can focus entirely on features.

Let's build the platform.
