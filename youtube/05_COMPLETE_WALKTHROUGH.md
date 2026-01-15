# NotebookLM Reimagined: The Complete Walkthrough

## From Zero to Production — Building Google's NotebookLM for Developers

---

## Part 1: The Problem

### What is NotebookLM?

Google NotebookLM is a research tool that lets you upload documents and have AI conversations about them. You can throw in PDFs, websites, YouTube videos — and then ask questions. The AI reads everything and answers based on your specific sources, not generic internet knowledge.

It's genuinely useful. Researchers use it to synthesize papers. Students use it to study. Professionals use it to digest reports.

And then Google added the killer feature: **Audio Overviews**. Upload your documents, click a button, and get a podcast-style discussion between two AI hosts breaking down your content. It went viral. People started uploading everything from textbooks to their own journals just to hear AI hosts chat about it.

### So What's the Problem?

NotebookLM is a black box.

You can use it through Google's interface. That's it. No API. No automation. No customization. No export. If you want to:

- Build NotebookLM into your app? **Can't.**
- Automatically process documents from email? **Can't.**
- Customize how the AI responds? **Can't.**
- Export your research to use elsewhere? **Limited.**
- Self-host for privacy/compliance? **Absolutely not.**

For individual researchers clicking around, it's fine. For developers, teams, or anyone who wants programmatic access — it's a non-starter.

### The Opportunity

What if we rebuilt NotebookLM from scratch with one guiding principle:

**Everything accessible via API.**

Every single feature — chat, audio generation, flashcards, quizzes, video overviews — all available as REST endpoints you can hit from anywhere. From your code. From n8n. From Zapier. From a bash script.

That's what NotebookLM Reimagined is.

---

## Part 2: The Vision

### API-First Philosophy

"API-first" isn't just a buzzword here. It's the core design constraint that shaped every decision.

Before writing any code, we asked: "How would this work as an API call?"

The web interface exists, but it's just a consumer of the API. Anything you can do in the UI, you can do via HTTP request. The frontend has no special privileges.

This means:

```bash
# Create a notebook
curl -X POST "https://notebooklm-api.vercel.app/api/v1/notebooks" \
  -H "X-API-Key: your_key" \
  -d '{"name": "Research Project"}'

# Upload a source
curl -X POST "https://notebooklm-api.vercel.app/api/v1/notebooks/{id}/sources/url" \
  -H "X-API-Key: your_key" \
  -d '{"url": "https://example.com/paper.pdf"}'

# Chat with your sources
curl -X POST "https://notebooklm-api.vercel.app/api/v1/notebooks/{id}/chat" \
  -H "X-API-Key: your_key" \
  -d '{"message": "What are the key findings?"}'
```

Three commands. You've created a research notebook, added a source, and started chatting with it. No browser required.

### Cost Transparency

Here's something Google will never tell you: how much each operation costs.

Every API response in NotebookLM Reimagined includes usage data:

```json
{
  "data": {
    "response": "Based on your sources, the key findings are...",
    "citations": [...]
  },
  "usage": {
    "input_tokens": 1500,
    "output_tokens": 500,
    "cost_usd": 0.002,
    "model_used": "gemini-2.5-flash"
  }
}
```

You know exactly what you're spending. No surprises. Track costs per notebook, per user, per feature. Build budgets into your automations. This transparency fundamentally changes how you think about AI-powered features.

### Self-Hostable

The entire stack runs on services with generous free tiers:

- **Supabase**: Database, auth, storage (free tier: 500MB database, 1GB storage)
- **Vercel**: Serverless deployment (free tier: 100GB bandwidth)
- **Google AI**: Gemini API (free tier: 1M tokens/month)

You can deploy your own instance for $0/month for personal use. Scale up when needed. Your data stays under your control.

---

## Part 3: The Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENTS                                 │
│                                                                  │
│   [Web App]     [n8n/Zapier]     [Your Code]     [Mobile]       │
│       │              │                │              │          │
└───────┴──────────────┴────────────────┴──────────────┴──────────┘
                              │
                         HTTPS/REST
                              │
┌─────────────────────────────────────────────────────────────────┐
│                        API LAYER                                 │
│                                                                  │
│              FastAPI Backend (Python 3.11+)                     │
│              Deployed on Vercel Serverless                      │
│                                                                  │
│   /notebooks  /sources  /chat  /audio  /video  /study  /export │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌───────────────────┐ ┌───────────────┐ ┌───────────────────┐
│     SUPABASE      │ │    GEMINI     │ │  SUPABASE STORAGE │
│                   │ │               │ │                   │
│  • PostgreSQL     │ │  • 2.5 Flash  │ │  • PDF files      │
│  • Auth (JWT)     │ │  • 2.5 Pro    │ │  • Audio files    │
│  • Row-Level Sec  │ │  • TTS        │ │  • Video files    │
│  • Realtime       │ │  • Veo        │ │                   │
└───────────────────┘ └───────────────┘ └───────────────────┘
```

### Why This Stack?

**FastAPI (Python)**: We chose FastAPI because:
1. Native async support — essential for AI operations that can take seconds
2. Automatic OpenAPI docs — every endpoint is documented
3. Pydantic models — type safety and validation
4. Python ecosystem — seamless integration with Google's AI libraries

**Supabase**: Not just a database. It's the backbone:
1. PostgreSQL with Row-Level Security — users can only see their own data
2. Built-in auth with JWT — no auth code to write
3. Storage API — file uploads with automatic CDN
4. Realtime subscriptions — watch for changes (used for job status)

**Vercel Serverless**: Zero-config deployment:
1. Push to GitHub → automatic deploy
2. Global edge network — fast everywhere
3. Scales to zero — pay nothing when idle
4. Environment variables — secrets management built-in

**Gemini API**: Google's latest AI models:
1. Gemini 2.5 Flash — fast and cheap for most operations
2. Gemini 2.5 Pro — highest quality for scripts
3. Gemini TTS — text-to-speech with multiple voices
4. Multi-modal — can process PDFs, images, video

---

## Part 4: The Database

### Schema Design

We designed the schema around one core concept: **Notebooks contain Sources, and everything else derives from them.**

```
profiles (1) ────────────── (many) notebooks
                                    │
                                    ├── (many) sources
                                    ├── (many) chat_sessions ──── (many) chat_messages
                                    ├── (many) audio_overviews
                                    ├── (many) video_overviews
                                    ├── (many) study_materials
                                    ├── (many) studio_outputs
                                    ├── (many) research_tasks
                                    └── (many) notes
```

**Key Tables:**

| Table | Purpose |
|-------|---------|
| `profiles` | Extends Supabase auth with display name, settings |
| `notebooks` | The core container. Has name, emoji, AI persona settings |
| `sources` | Documents. Stores type, file path, processed content (source guide) |
| `chat_sessions` | Conversation threads (you can have multiple per notebook) |
| `chat_messages` | Individual messages with role, content, citations, cost |
| `audio_overviews` | Generated podcasts with script, audio file path, status |
| `video_overviews` | Generated videos with script, video file path, status |
| `study_materials` | Flashcards, quizzes, study guides, FAQs |
| `studio_outputs` | Reports, slide decks, infographics, data tables |
| `api_keys` | User-generated API keys with scopes and rate limits |

### Row-Level Security

Every table has RLS policies ensuring users only access their own data:

```sql
-- Example: Users can only see their own notebooks
CREATE POLICY "Users can CRUD own notebooks"
  ON notebooks FOR ALL
  USING (auth.uid() = user_id);
```

This means even if someone gets a valid JWT, they can't access other users' data. The database enforces isolation at the query level.

---

## Part 5: The Core Features

### 1. Source Management

Sources are the foundation. You can add:

- **Text**: Paste content directly
- **URL**: We fetch and extract the content
- **YouTube**: We extract the transcript
- **PDF**: We store the file and extract text

When a source is added, we generate a "Source Guide" using Gemini:

```python
async def generate_source_guide(content: str):
    prompt = """Analyze this content and generate:
    1. A comprehensive summary
    2. Key topics covered
    3. Main entities (people, places, concepts)
    4. 5 suggested questions a user might ask
    """
    return await gemini.generate_content(prompt + content)
```

This source guide becomes the context for all subsequent operations. It's stored in the `source_guide` JSONB column, making the source instantly queryable.

### 2. RAG Chat

When you ask a question, here's what happens:

```
User Question
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. Fetch all sources for this notebook                      │
│                                                              │
│ 2. Combine their content into context:                       │
│    "--- Source: Paper.pdf ---                                │
│     [Summary and key content]                                │
│     --- Source: Article.url ---                              │
│     [Summary and key content]"                               │
│                                                              │
│ 3. Apply AI persona (if configured):                         │
│    "You are a Critical Reviewer. Question assumptions..."    │
│                                                              │
│ 4. Send to Gemini:                                           │
│    System: [persona instructions]                            │
│    Context: [all sources]                                    │
│    User: [question]                                          │
│    Instruction: "Cite specific sources in your answer"       │
│                                                              │
│ 5. Parse response for citations                              │
│                                                              │
│ 6. Store message in chat_messages with:                      │
│    - content                                                 │
│    - citations (which sources, what text)                    │
│    - token counts                                            │
│    - cost                                                    │
└─────────────────────────────────────────────────────────────┘
      │
      ▼
Response with Citations
```

The key insight: we're not using embeddings or vector search. We simply concatenate source content and let Gemini's large context window handle it. For most notebooks (< 50 sources), this works extremely well and is simpler than maintaining a vector database.

### 3. AI Personas

Users can configure how the AI responds:

| Persona | Behavior |
|---------|----------|
| **Critical Reviewer** | Questions assumptions, identifies weaknesses, thorough critique |
| **Simple Explainer** | ELI5-style, avoids jargon, uses relatable examples |
| **Technical Expert** | Deep technical detail, precise terminology |
| **Creative Thinker** | Novel connections, unconventional perspectives |
| **Socratic Teacher** | Guides through questions, promotes critical thinking |
| **Custom** | User writes their own instructions |

Plus preference settings:
- Response length (Concise / Balanced / Detailed)
- Tone (Professional / Casual / Academic)
- Citation style (Inline / Footnote / None)
- Include examples (yes/no)

These settings are stored in `notebooks.settings` as JSONB and applied to every chat request.

### 4. Audio Overviews

This is the headline feature people love. Generate a podcast-style discussion about your sources.

**The Pipeline:**

```
Sources
   │
   ▼
┌─────────────────────────────────────────┐
│ STEP 1: Script Generation               │
│                                         │
│ Model: Gemini 2.5 Pro                   │
│                                         │
│ Prompt: "Create a podcast script        │
│  between two hosts discussing these     │
│  sources. Host 1 (Aoede) leads.         │
│  Host 2 (Charon) adds insights.         │
│  Make it conversational and engaging."  │
│                                         │
│ Output: Script with speaker tags        │
│  AOEDE: "Welcome to today's deep dive..." │
│  CHARON: "Thanks! I'm excited about..." │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ STEP 2: Text-to-Speech                  │
│                                         │
│ Model: Gemini 2.5 Flash TTS (Preview)   │
│                                         │
│ Voices:                                 │
│  - Aoede (female)                       │
│  - Charon (male)                        │
│                                         │
│ Multi-speaker mode:                     │
│  Pass entire script with speaker tags   │
│  TTS automatically switches voices      │
│                                         │
│ Output: WAV audio bytes                 │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ STEP 3: Storage                         │
│                                         │
│ Convert WAV → MP3                       │
│ Upload to Supabase Storage              │
│ Update audio_overviews record           │
│ Return public URL                       │
└─────────────────────────────────────────┘
```

**Formats:**
- `deep_dive`: 10-15 minute comprehensive discussion
- `brief_summary`: 3-5 minute quick overview
- `debate`: Two hosts take opposing viewpoints

### 5. Video Overviews

Similar to audio, but generates video:

```
Sources → Gemini 2.5 Pro (script) → Wan 2.5 (video) → Storage
```

We use AtlasCloud's Wan 2.5 model for text-to-video generation. It's not Google Veo (yet), but it produces decent short-form video content.

### 6. Study Materials

Four types, all powered by Gemini 2.0 Flash:

**Flashcards:**
```json
{
  "cards": [
    {
      "question": "What is the main argument of the paper?",
      "answer": "The paper argues that...",
      "source_id": "uuid"
    }
  ]
}
```

**Quiz:**
```json
{
  "questions": [
    {
      "question": "According to the sources, what is X?",
      "choices": ["A", "B", "C", "D"],
      "correct_answer": "B",
      "explanation": "The answer is B because..."
    }
  ]
}
```

**Study Guide:**
```json
{
  "sections": [
    {
      "title": "Introduction",
      "summary": "...",
      "key_points": ["...", "..."]
    }
  ]
}
```

**FAQ:**
```json
{
  "questions": [
    {
      "question": "What does X mean?",
      "answer": "X refers to..."
    }
  ]
}
```

### 7. Studio / Creative Outputs

For more polished outputs:

- **Report**: Executive summary, sections, recommendations
- **Slide Deck**: Title slides, content slides with bullet points
- **Infographic**: Data-driven visual content (JSON structure)
- **Data Table**: Structured data extraction from sources

### 8. Export

Get your data out:

- **JSON**: Complete structured export of everything
- **ZIP**: All files + metadata
- **PDF**: Human-readable summary (client-side generation)

---

## Part 6: The API Design

### Authentication

Two methods:

**1. JWT (for web app):**
```bash
curl -H "Authorization: Bearer eyJ..."
```
The frontend uses Supabase Auth, which returns JWTs. These are validated against Supabase on each request.

**2. API Key (for automations):**
```bash
curl -H "X-API-Key: nb_live_abc123..."
```
Users generate API keys in the Settings page. Keys are hashed (SHA-256) and stored. We validate by hashing the provided key and comparing.

### Endpoint Structure

RESTful, resource-oriented:

```
/api/v1/notebooks                          # List/create notebooks
/api/v1/notebooks/{id}                     # Get/update/delete notebook
/api/v1/notebooks/{id}/sources             # List sources
/api/v1/notebooks/{id}/sources/text        # Add text source
/api/v1/notebooks/{id}/sources/url         # Add URL source
/api/v1/notebooks/{id}/sources/youtube     # Add YouTube source
/api/v1/notebooks/{id}/sources/pdf         # Upload PDF
/api/v1/notebooks/{id}/chat                # Send chat message
/api/v1/notebooks/{id}/chat/sessions       # List/create chat sessions
/api/v1/notebooks/{id}/audio               # Generate audio overview
/api/v1/notebooks/{id}/video               # Generate video overview
/api/v1/notebooks/{id}/flashcards          # Generate flashcards
/api/v1/notebooks/{id}/quiz                # Generate quiz
/api/v1/notebooks/{id}/study-guide         # Generate study guide
/api/v1/notebooks/{id}/faq                 # Generate FAQ
/api/v1/notebooks/{id}/studio/report       # Generate report
/api/v1/notebooks/{id}/studio/slide-deck   # Generate slides
/api/v1/notebooks/{id}/export/json         # Export as JSON
/api/v1/notebooks/{id}/export/zip          # Export as ZIP
/api/v1/chat/global                        # Search across all notebooks
/api/v1/api-keys                           # Manage API keys
/api/v1/profile                            # User profile
```

### Response Format

Consistent structure:

```json
{
  "data": {
    // The actual response data
  },
  "usage": {
    "input_tokens": 1500,
    "output_tokens": 500,
    "cost_usd": 0.002,
    "model_used": "gemini-2.5-flash"
  }
}
```

For lists:
```json
{
  "data": [...],
  "count": 10
}
```

For errors:
```json
{
  "detail": "Notebook not found"
}
```

---

## Part 7: The Frontend

### Tech Stack

- **Next.js 14**: App router, server components
- **React 18**: Client components where needed
- **TypeScript**: Type safety throughout
- **Tailwind CSS**: Utility-first styling
- **shadcn/ui**: Beautiful, accessible components
- **Framer Motion**: Smooth animations
- **React Query**: Data fetching and caching

### The Three-Panel Layout

```
┌──────────────────┬────────────────────────────────┬─────────────────────────────┐
│                  │                                │                             │
│   SOURCES        │            CHAT                │         STUDIO              │
│                  │                                │                             │
│  List of all     │   Conversation with AI        │   Content generation        │
│  uploaded docs   │   about your sources           │   options                   │
│                  │                                │                             │
│  [+ Add Source]  │   Includes citations           │   [Generate Podcast]       │
│                  │   to specific sources          │   [Make Flashcards]        │
│                  │                                │   [Create Quiz]             │
│                  │                                │   [Export]                  │
│                  │                                │                             │
└──────────────────┴────────────────────────────────┴─────────────────────────────┘
```

This mirrors Google's NotebookLM layout — familiar to users, but with more capabilities.

### React Query Caching

We use React Query for all API calls:

```typescript
// Fetch notebooks
const { data: notebooks } = useQuery({
  queryKey: ['notebooks'],
  queryFn: () => api.getNotebooks(),
  staleTime: 30000, // Cache for 30 seconds
})

// When a notebook is created, invalidate the cache
const createNotebook = useMutation({
  mutationFn: api.createNotebook,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['notebooks'] })
  }
})
```

This gives us:
- Automatic caching
- Background refetching
- Optimistic updates
- Loading/error states

---

## Part 8: Deployment

### The Vercel Serverless Setup

FastAPI doesn't natively run on Vercel, but we make it work:

**`api/index.py`:**
```python
import sys
from pathlib import Path

# Add parent directory to path so we can import app/
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.main import app

# Export for Vercel
app = app
```

**`vercel.json`:**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.py",
      "use": "@vercel/python"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "api/index.py"
    }
  ]
}
```

This routes all requests through our FastAPI app. Vercel spins up serverless functions as needed.

### Environment Variables

Set in Vercel dashboard:

```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # For admin operations
GOOGLE_API_KEY=AIza...
ATLASCLOUD_API_KEY=apikey-...     # For video generation
```

### Production URL

```
https://notebooklm-api.vercel.app
```

Hit `/docs` for the auto-generated OpenAPI documentation.

---

## Part 9: Automation Integration

### n8n Example

Here's a real workflow: **Auto-summarize emails daily**

```
┌─────────────┐     ┌──────────────────┐     ┌───────────────────────┐
│  Schedule   │────►│  Gmail: Get      │────►│  NotebookLM API:      │
│  (9am daily)│     │  unread emails   │     │  Add as text source   │
└─────────────┘     └──────────────────┘     └───────────┬───────────┘
                                                         │
                                                         ▼
┌─────────────┐     ┌──────────────────┐     ┌───────────────────────┐
│  Slack:     │◄────│  Format message  │◄────│  NotebookLM API:      │
│  Post       │     │                  │     │  Generate summary     │
└─────────────┘     └──────────────────┘     └───────────────────────┘
```

Each n8n HTTP Request node just calls our API:

```
POST https://notebooklm-api.vercel.app/api/v1/notebooks/{id}/sources/text
Headers:
  X-API-Key: your_key
  Content-Type: application/json
Body:
  {"name": "Email from {{sender}}", "content": "{{email_body}}"}
```

### Zapier Example

**New RSS article → Add to research notebook**

1. Trigger: RSS feed has new item
2. Action: Webhooks by Zapier (POST)
   - URL: `https://notebooklm-api.vercel.app/api/v1/notebooks/{id}/sources/url`
   - Headers: `X-API-Key: your_key`
   - Body: `{"url": "{{item_url}}"}`

Now your research notebook automatically ingests new articles from blogs you follow.

---

## Part 10: The Development Journey

### How This Was Built

This project was built using **Claude Code** with MCP integrations:

**Supabase MCP**: Instead of manually creating tables in the Supabase dashboard, we used:
```
mcp__supabase__apply_migration({
  name: "create_notebooks_table",
  query: "CREATE TABLE notebooks (...)"
})
```

**Vercel MCP**: Instead of clicking around Vercel's UI:
```
mcp__vercel__create_project({ name: "notebooklm-api" })
mcp__vercel__bulk_create_env_vars({ variables: [...] })
mcp__vercel__create_deployment({ target: "production" })
```

**Chrome MCP**: Instead of manually testing:
```
mcp__chrome__navigate({ url: "http://localhost:3000" })
mcp__chrome__screenshot()  // See the UI
mcp__chrome__click({ ref: "create-notebook-button" })
```

This tight feedback loop — write code, test database, deploy, verify UI — all without leaving the terminal, made development incredibly fast.

### Key Decisions

**1. No vector database**: We considered Pinecone, Weaviate, pgvector. But Gemini's 1M+ token context window means we can just concatenate sources. Simpler architecture, fewer moving parts.

**2. Serverless over containers**: We could have deployed with Docker on Railway or Render. But Vercel's serverless model means zero cost at idle, automatic scaling, and zero DevOps. For an API that might be called sporadically, this is ideal.

**3. Supabase for everything**: Instead of separate services for database (PlanetScale), auth (Auth0), storage (S3), and realtime (Pusher), Supabase provides all four. One service, one bill, one SDK.

**4. Client-side PDF generation**: We generate PDFs in the browser using jsPDF rather than on the server. This saves server resources and keeps exports fast.

**5. Cost transparency by design**: Adding token counting and cost calculation to every response was extra work, but it fundamentally changes how users interact with AI features. They can make informed decisions.

---

## Part 11: What's Next

### Roadmap

**Completed:**
- Core RAG chat
- Audio overviews (multi-voice podcasts)
- Video overviews
- Study materials (flashcards, quizzes, guides, FAQs)
- Studio outputs (reports, slides, infographics)
- Chat threads
- Full export (ZIP/JSON/PDF)
- AI personas
- API deployment
- n8n/Zapier integration

**Coming:**
- **Streaming responses**: Real-time token streaming for chat
- **Collaborative notebooks**: Share notebooks with teams
- **Webhooks**: Get notified when jobs complete
- **Custom embedding models**: Bring your own embeddings
- **Local LLM support**: Run with Ollama for privacy
- **Browser extension**: Clip content directly to notebooks
- **Mobile apps**: React Native iOS/Android

### Open Questions

1. **Should we add vector search?** For notebooks with 100+ sources, concatenation might not scale. But adding a vector DB adds complexity.

2. **Streaming vs. polling for long jobs?** Audio generation takes 30-60 seconds. Currently we poll. SSE might be cleaner.

3. **Multi-tenant pricing?** If someone wants to white-label this, how should billing work?

---

## Part 12: Conclusion

### What We Built

NotebookLM Reimagined is:

- **50+ REST endpoints** covering every feature
- **Production-deployed** at `https://notebooklm-api.vercel.app`
- **Automation-ready** for n8n, Zapier, Make, or raw HTTP
- **Cost-transparent** with usage data on every response
- **Self-hostable** on free tiers
- **Open source** under MIT license

### The Philosophy

Google builds products. We build platforms.

NotebookLM is a great product trapped inside Google's walled garden. NotebookLM Reimagined is a platform that lets you build whatever you want on top of AI-powered research.

Want a Slack bot that answers questions about your company docs? Build it.
Want an email automation that summarizes your inbox? Build it.
Want a custom UI for a specific research workflow? Build it.

The API is the product. Everything else is just an example of what's possible.

---

## Appendix: Quick Reference

### API Base URL
```
https://notebooklm-api.vercel.app
```

### Authentication
```bash
# API Key (recommended for automation)
curl -H "X-API-Key: nb_live_your_key"

# JWT (for web app)
curl -H "Authorization: Bearer your_jwt"
```

### Core Endpoints
```
POST   /api/v1/notebooks                    # Create notebook
GET    /api/v1/notebooks                    # List notebooks
POST   /api/v1/notebooks/{id}/sources/url   # Add URL
POST   /api/v1/notebooks/{id}/sources/text  # Add text
POST   /api/v1/notebooks/{id}/chat          # Chat
POST   /api/v1/notebooks/{id}/audio         # Generate podcast
POST   /api/v1/notebooks/{id}/flashcards    # Generate flashcards
GET    /api/v1/notebooks/{id}/export/json   # Export
```

### Models Used
| Feature | Model |
|---------|-------|
| Chat | Gemini 2.5 Flash |
| Audio Script | Gemini 2.5 Pro |
| Audio TTS | Gemini 2.5 Flash TTS |
| Video | Wan 2.5 (AtlasCloud) |
| Study Materials | Gemini 2.0 Flash |

### GitHub
```
https://github.com/earlyaidopters/notebooklmreimagined
```

---

*Built with Claude Code, Supabase, Vercel, and Gemini.*

*For researchers who demand more than a black box.*
