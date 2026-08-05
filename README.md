# VoltIQ AI — Foundation v1.0

Professional electrical knowledge assistant built on a local RAG foundation: upload standards and notes, index them, chat with citations, and study from your own documents.

**Stage 1 complete.** Core platform is stable and ready for Stage 2 (Professional Electrical AI Assistant).

## Project overview

VoltIQ AI is a Next.js application that combines:

- Streaming OpenAI chat grounded in your uploaded knowledge
- A persistent multi-document Knowledge Library (PDFs + images)
- Hybrid RAG retrieval with source citations and PDF jump-to-page
- Vision OCR for diagrams and photos
- AI Study Mode (quiz, exam, flashcards, progress)

Knowledge is stored locally under `.voltiq/` so it survives restarts.

## Architecture

```
Browser (React UI)
  ├─ Upload / Knowledge Library / Images
  ├─ Chat (streaming) + Citations + PDF Viewer
  └─ Study Mode
        │
        ▼
Next.js App Router API routes
  ├─ /api/chat              → RAG retrieve + OpenAI stream
  ├─ /api/rag/*             → index, status, library, cancel, delete
  ├─ /api/rag/index-image   → Vision OCR + image indexing
  └─ /api/study/*           → generate / mark study material
        │
        ▼
Local store (.voltiq/)
  ├─ document chunks (NDJSON)
  ├─ embeddings / vector index
  ├─ library metadata
  └─ PDF & image artifacts
```

**Client:** React 19 UI for upload, indexing progress, retrieval scope, chat, citations, PDF viewer, and study.

**Server:** Next.js route handlers call OpenAI (chat, embeddings, vision) and read/write the local RAG store.

**Retrieval:** Hybrid search (semantic + lexical) over enabled documents in scope, then prompt grounding with citation metadata.

## Folder structure

```
src/
  app/                  # App Router pages + API routes
  components/
    ChatPanel/          # Chat UI, tools, streaming
    Citations/          # Citation cards, inline refs
    PDFViewer/          # Interactive PDF viewer
    Study/              # Quiz, exam, flashcards, progress
    upload/             # Knowledge Library + image managers
    layout/             # Shell / header
  lib/
    chat/               # System prompt, streaming helpers
    citations/          # Source → citation mapping
    openai.ts           # Shared OpenAI client
    pdf/                # PDF parse, cache, search
    rag/                # Chunk, embed, retrieve, library, vision
    study/              # Study client, engine, progress storage
  types/                # Shared TypeScript types
.voltiq/                # Local persistent knowledge (gitignored)
```

## Environment variables

Create `.env.local` in the project root:

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | Yes | OpenAI API key |
| `OPENAI_MODEL` | No | Chat model (default: `gpt-5.5`) |
| `OPENAI_VISION_MODEL` | No | Vision/OCR model (falls back to `OPENAI_MODEL`) |
| `OPENAI_EMBEDDING_MODEL` | No | Embedding model override |
| `RAG_DEBUG` | No | Set `1` for verbose RAG logs |

Example:

```bash
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5.5
OPENAI_VISION_MODEL=gpt-5.5
```

## Installation

```bash
npm install
```

Copy environment variables into `.env.local`, then:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Development

```bash
npm run dev      # local development
npm run lint     # ESLint
npm run build    # production build
npm run start    # serve production build
```

Notes:

- Large PDF uploads are supported (proxy body size configured in `next.config`).
- Indexing and library writes are designed for Windows-safe atomic updates.
- Cancel indexing from the UI if a job is taking too long.

## Knowledge Library

- Upload PDFs into the Knowledge Library; images go to the Images section.
- Documents are hashed for duplicate detection and can be enable/disable toggled.
- Tags, search, sort, and bulk actions help manage multi-document libraries.
- Retrieval scope controls which enabled documents are used for chat and study.
- Library metadata and file artifacts persist under `.voltiq/` across restarts.

## OCR & Vision

- Images are indexed via `/api/rag/index-image`.
- Vision extracts OCR text and a short description for retrieval.
- Image content participates in RAG; PDF citation jump remains PDF-only.
- Requires a configured OpenAI API key and a vision-capable model.

## RAG

Pipeline:

1. Parse PDF text (or OCR an image)
2. Chunk content with overlap
3. Embed chunks and store locally
4. On chat: hybrid retrieve → build grounded prompt → stream answer
5. Attach source metadata for citations

Features:

- Multi-document retrieval with enable/disable scope
- Progress polling during indexing
- Cancel / delete / re-index support
- Insufficient-retrieval handling in the system prompt

## Study Mode

Study Mode generates practice material from your enabled knowledge documents:

- **Quiz** — interactive questions with intelligent marking
- **Exam** — timed sessions with pass mark and results
- **Flashcards** — deck review with bookmarks
- **Explain / Tutor** — prompts into chat for guided lessons
- **Progress** — weak topics and history in `localStorage`

Study answers cite Open Sources from the same RAG store used by chat.

## Stage 1 capabilities

- OpenAI integration + streaming AI
- Persistent Knowledge Library
- Multi-document RAG
- OCR & Vision foundation
- Source tracking + citation system
- Intelligent search
- AI Study Mode (flashcards, exam, progress)
- Prompt safety + persistent storage
- Professional knowledge management

## Future roadmap (Stage 2+)

- Deeper electrical-domain tooling and workflows
- Richer standards-aware assistance
- Expanded professional assistant features on this foundation

## Version

**VoltIQ AI — Foundation v1.0**  
Stage 1 Release Candidate (Sprint 4.10)
