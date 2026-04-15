# 🤖 AI-Powered Document Q&A (RAG)

> **Retrieval-Augmented Generation** — Ask natural language questions about your uploaded documents and get AI-generated answers with source citations.

<p align="center">
  <img src="https://img.shields.io/badge/RAG-Retrieval_Augmented_Generation-8B5CF6?style=for-the-badge" alt="RAG" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Groq-000000?style=for-the-badge&logo=groq&logoColor=white" alt="Groq" />
  <img src="https://img.shields.io/badge/HuggingFace-FFD21E?style=for-the-badge&logo=huggingface&logoColor=black" alt="HuggingFace" />
  <img src="https://img.shields.io/badge/Qdrant-DC382D?style=for-the-badge&logo=qdrant&logoColor=white" alt="Qdrant" />
</p>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [How RAG Works](#-how-rag-works)
- [Architecture](#-architecture)
- [AI Service Structure](#-ai-service-structure)
- [Processing Pipeline](#-processing-pipeline)
- [Query Pipeline](#-query-pipeline)
- [Models & Tech Stack](#-models--tech-stack)
- [Supported File Types](#-supported-file-types-for-ai-processing)
- [API Endpoints](#-api-endpoints)
- [Frontend Components](#-frontend-components)
- [Configuration](#%EF%B8%8F-configuration)
- [Setup Guide](#-setup-guide)
- [Environment Variables](#-environment-variables)
- [Troubleshooting](#-troubleshooting)

---

## 🌟 Overview

The AI Document Q&A feature transforms DocuVault from a simple file storage system into an **intelligent document assistant**. Users can:

1. **Upload documents** (PDF, DOCX, spreadsheets, images, etc.)
2. Documents are **automatically processed** — text is extracted, chunked, embedded, and stored in a vector database
3. Users navigate to the **"Ask AI"** page and ask natural language questions
4. The system **searches for relevant document chunks**, sends them to an LLM, and generates a **cited answer**

This is powered by **Retrieval-Augmented Generation (RAG)** — a technique that combines vector search with large language models to provide accurate, grounded answers based on your actual documents.

---

## 🔄 How RAG Works

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          DOCUMENT PROCESSING (Ingestion)                     │
│                                                                              │
│  Upload File ──→ Extract Text ──→ Clean Text ──→ Chunk Text ──→ Embed ──→   │
│                                                                    │         │
│                                                          Store in Qdrant     │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                          QUESTION ANSWERING (Query)                          │
│                                                                              │
│  User Question ──→ Embed Question ──→ Search Qdrant ──→ Get Top Chunks ──→  │
│                                                               │              │
│                              ┌────────────────────────────────┘              │
│                              ▼                                               │
│              Build Prompt (Question + Chunks) ──→ Groq LLM ──→ Answer       │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Step-by-Step Breakdown

#### Ingestion Phase (When a file is uploaded)

| Step | Component | Description |
|------|-----------|-------------|
| 1. **Extract** | `pipelines/` | Parse the file and extract raw text. Uses `pdfplumber` for PDFs, `python-docx` for DOCX, `openpyxl` for spreadsheets, etc. |
| 2. **Clean** | `processing/cleaner.py` | Normalize whitespace, remove control characters, trim excessive blank lines |
| 3. **Chunk** | `processing/chunker.py` | Split text into 400-token overlapping chunks (100-token overlap) for optimal embedding |
| 4. **Embed** | `processing/embedder.py` | Generate 1024-dimensional vectors using HuggingFace `BAAI/bge-m3` model |
| 5. **Store** | `storage/vector_store.py` | Upsert vectors into Qdrant Cloud with metadata (file ID, user ID, chunk text) |

#### Query Phase (When a user asks a question)

| Step | Component | Description |
|------|-----------|-------------|
| 1. **Embed Query** | `processing/embedder.py` | Convert the user's question into a 1024-dim vector |
| 2. **Search** | `storage/vector_store.py` | Find top 5 most similar chunks in Qdrant (filtered by user ID) |
| 3. **Build Prompt** | `query/answerer.py` | Construct a system prompt with the retrieved chunks as context |
| 4. **Generate** | `query/answerer.py` | Send to Groq LLM (`llama-3.3-70b-versatile`) and get the answer |
| 5. **Return** | `routes/query.py` | Return answer + source citations (file names, relevance scores) |

---

## 🏗️ Architecture

```text
┌─────────────────────┐                           ┌──────────────────────────┐
│   React Frontend    │                           │     AI Service           │
│   (Ask AI Page)     │  ───── HTTP REST ──────→  │     (FastAPI/Python)     │
└─────────────────────┘                           └─────────┬────────────────┘
                                                             │
                               ┌─────────────────────────────┼────────────────┐
                               │                             │                │
                               ▼                             ▼                ▼
                    ┌──────────────────┐         ┌────────────────┐  ┌─────────────┐
                    │  HuggingFace API │         │  Qdrant Cloud  │  │  Groq API   │
                    │  (Embeddings)    │         │  (Vectors)     │  │  (LLM)      │
                    └──────────────────┘         └────────────────┘  └─────────────┘
                                                         │
                               ┌─────────────────────────┘
                               ▼
                    ┌──────────────────────────┐
                    │   Node.js Backend        │
                    │   (Orchestrator/Proxy)   │
                    └──────────────────────────┘
```

### Data Flow

1. **User uploads a file** → Node.js backend saves to S3 & MongoDB → forwards file to AI Service
2. **AI Service processes** → Extracts text → Chunks → Embeds via HuggingFace → Stores in Qdrant
3. **User asks a question** → Frontend → Node.js backend → AI Service
4. **AI Service answers** → Embeds question → Searches Qdrant → Sends context to Groq LLM → Returns answer

---

## 📂 AI Service Structure

```
ai-service/
├── config/
│   ├── __init__.py
│   ├── settings.py              # Pydantic settings (env vars, model config)
│   └── qdrant_client.py         # Qdrant Cloud connection + collection setup
│
├── pipelines/                   # File type → text extraction
│   ├── __init__.py
│   ├── router.py                # Routes files to correct pipeline by extension
│   ├── document.py              # PDF, DOCX, TXT extraction
│   ├── spreadsheet.py           # XLSX, XLS, CSV extraction
│   ├── presentation.py          # PPTX, PPT extraction
│   ├── image.py                 # Image OCR/description (via Groq Vision)
│   ├── data.py                  # JSON, XML parsing
│   └── archive.py               # ZIP, RAR content listing
│
├── processing/                  # Text processing pipeline
│   ├── __init__.py
│   ├── cleaner.py               # Text normalization and cleanup
│   ├── chunker.py               # Token-based overlapping text chunking
│   └── embedder.py              # HuggingFace embedding generation
│
├── query/                       # Question answering
│   ├── __init__.py
│   └── answerer.py              # RAG: embed question → search → LLM answer
│
├── routes/                      # FastAPI endpoints
│   ├── __init__.py
│   ├── process.py               # POST /process — file processing endpoint
│   ├── query.py                 # POST /query — question answering endpoint
│   └── status.py                # GET /status, /stats — health & stats
│
├── storage/                     # Vector database operations
│   ├── __init__.py
│   └── vector_store.py          # Qdrant upsert, search, delete operations
│
├── main.py                      # FastAPI app entry point
├── requirements.txt             # Python dependencies
├── .env.example                 # Environment variable template
└── .env                         # Your API keys (not committed)
```

---

## ⚙️ Processing Pipeline

### Pipeline Router (`pipelines/router.py`)

The router automatically detects file type from the extension and dispatches to the correct extraction pipeline:

| Extension | Pipeline | Extraction Method |
|-----------|----------|-------------------|
| `pdf` | Document | `pdfplumber` — page-by-page text extraction |
| `docx`, `doc` | Document | `python-docx` — paragraph extraction |
| `txt` | Document | Direct UTF-8 read |
| `xlsx`, `xls` | Spreadsheet | `openpyxl` — cell-by-cell with headers |
| `csv` | Spreadsheet | `pandas` — DataFrame to text |
| `pptx`, `ppt` | Presentation | `python-pptx` — slide text frames |
| `jpg`, `jpeg`, `png`, `gif`, `webp` | Image | Groq Vision API — image description |
| `json` | Data | Pretty-printed JSON content |
| `xml` | Data | `lxml` — text content extraction |
| `zip`, `rar` | Archive | Lists contained file names |

### Text Chunking Strategy (`processing/chunker.py`)

Documents are split into overlapping chunks optimized for embedding retrieval:

- **Chunk size:** 400 tokens (~1,600 characters)
- **Overlap:** 100 tokens (~400 characters)
- **Strategy:** Sentence-boundary aware splitting
- **Long sentences:** Force-split at chunk boundaries
- **Output:** List of chunk objects with text, index, character positions, and source file name

```
Document (10,000 chars)
    ├── Chunk 0: chars 0-1600      ←──────────┐
    ├── Chunk 1: chars 1200-2800   ── overlap ─┘  ←──────────┐
    ├── Chunk 2: chars 2400-4000   ── overlap ──────────── ───┘
    ├── Chunk 3: chars 3600-5200
    ...
```

### Embedding Generation (`processing/embedder.py`)

Uses the official `huggingface_hub.InferenceClient` for reliable API calls:

- **Model:** `BAAI/bge-m3` (multilingual, 1024 dimensions)
- **Batch size:** 16 texts per API call
- **Retry logic:** 3 attempts with exponential backoff
- **Rate limiting:** 0.5s delay between batches
- **Mean pooling:** Token-level embeddings averaged for sentence representation

---

## 🔍 Query Pipeline

### Question Answering (`query/answerer.py`)

The answerer implements a full RAG pipeline:

1. **Embed the question** using the same `BAAI/bge-m3` model
2. **Search Qdrant** for top 5 most similar chunks (filtered by `user_id` for data isolation)
3. **Build a system prompt** with retrieved context:

```
You are a helpful document assistant. Answer the user's question
based ONLY on the provided document excerpts. If the answer cannot
be found in the documents, say so clearly.

=== DOCUMENT EXCERPTS ===
[Source: report.pdf, Chunk 3]
The quarterly revenue increased by 15% compared to...

[Source: analysis.docx, Chunk 7]
Key findings indicate that customer retention...
===========================
```

4. **Call Groq LLM** (`llama-3.3-70b-versatile`) with the prompt
5. **Return the answer** along with source citations (file name, chunk index, relevance score)

### User Data Isolation

All vector searches are filtered by `user_id`, ensuring users can only query their own documents. This is enforced at the Qdrant level using payload filters with keyword indexes.

---

## 🧠 Models & Tech Stack

### AI Models

| Component | Model | Provider | Specs |
|-----------|-------|----------|-------|
| **Embeddings** | `BAAI/bge-m3` | HuggingFace | 1024 dimensions, multilingual |
| **LLM** | `llama-3.3-70b-versatile` | Groq | 70B parameters, production-grade |
| **Vision** | `meta-llama/llama-4-scout-17b-16e-instruct` | Groq | Image understanding for uploads |

### AI Service Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Python | 3.9+ | Runtime |
| FastAPI | 0.115.0 | Async REST framework |
| Uvicorn | 0.30.0 | ASGI server with hot-reload |
| Groq SDK | 0.9.0 | LLM API client |
| HuggingFace Hub | 1.8.0+ | Embedding API client |
| Qdrant Client | 1.12.1 | Vector database client |
| pdfplumber | 0.11.0 | PDF text extraction |
| python-docx | 1.1.0 | DOCX parsing |
| python-pptx | 1.0.0 | PPTX parsing |
| openpyxl | 3.1.2 | Excel file parsing |
| pandas | 2.2.0 | CSV/data processing |
| Pillow | 10.4.0 | Image processing |
| lxml | 6.0+ | XML parsing |
| Pydantic Settings | 2.4.0 | Configuration management |

### External Services (All Free Tier)

| Service | Free Tier | Used For |
|---------|-----------|----------|
| [Groq](https://console.groq.com) | 30 req/min | LLM inference (Llama 3.3 70B) |
| [HuggingFace](https://huggingface.co) | 30k chars/day | Embedding generation (BGE-M3) |
| [Qdrant Cloud](https://cloud.qdrant.io) | 1 GB storage | Vector database (similarity search) |

---

## 📄 Supported File Types for AI Processing

| Category | Extensions | Extraction Method | Quality |
|----------|-----------|-------------------|---------|
| **Documents** | PDF, DOCX, DOC, TXT | Direct text extraction | ⭐⭐⭐⭐⭐ |
| **Spreadsheets** | XLSX, XLS, CSV | Cell-by-cell with headers | ⭐⭐⭐⭐ |
| **Presentations** | PPTX, PPT | Slide text frames | ⭐⭐⭐⭐ |
| **Images** | JPG, JPEG, PNG, GIF, WebP | Groq Vision API description | ⭐⭐⭐ |
| **Data** | JSON, XML | Structured text parsing | ⭐⭐⭐⭐ |
| **Archives** | ZIP, RAR | File name listing only | ⭐⭐ |

---

## 🔌 API Endpoints

### AI Service (FastAPI — Port 8000)

| Method | Endpoint | Description | Called By |
|--------|----------|-------------|-----------|
| `POST` | `/process` | Process a file (extract, chunk, embed, store) | Node.js Backend |
| `POST` | `/query` | Ask a question about documents | Node.js Backend |
| `GET` | `/status/:file_id` | Get processing status for a file | Node.js Backend |
| `GET` | `/stats/:user_id` | Get AI stats (chunk count) for a user | Node.js Backend |
| `POST` | `/delete-vectors` | Delete vectors when a file is deleted | Node.js Backend |
| `GET` | `/health` | Health check | Monitoring |

### Node.js Backend (Express — Port 5000)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/ai/process/:documentId` | Trigger AI processing for a document | ✅ |
| `POST` | `/api/ai/query` | Forward question to AI service | ✅ |
| `GET` | `/api/ai/status/:fileId` | Get AI processing status | ✅ |
| `GET` | `/api/ai/stats` | Get user's AI stats | ✅ |
| `POST` | `/api/ai/webhook` | Receive processing completion callback | Internal |

### Request/Response Examples

#### Ask a Question

```bash
POST /api/ai/query
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "question": "What was the quarterly revenue?"
}
```

**Response:**
```json
{
  "success": true,
  "answer": "According to the financial report, the quarterly revenue was $2.4M, representing a 15% increase compared to...",
  "sources": [
    {
      "file_name": "Q3-Report.pdf",
      "file_id": "69df7533...",
      "chunk_index": 3,
      "score": 0.87
    }
  ],
  "chunks_found": 5
}
```

---

## 🎨 Frontend Components

### New Pages

| Component | Path | Description |
|-----------|------|-------------|
| `AskAIPage.jsx` | `/ask-ai` | Full chat interface for document Q&A |

### New Components

| Component | Description |
|-----------|-------------|
| `AIStatusBadge.jsx` | Shows processing status (pending/processing/completed/failed) on file cards |
| `ChatMessage.jsx` | Renders user and AI messages with markdown, copy button, and source citations |
| `SourceCard.jsx` | Displays source citation with file type badge, relevance score, and expandable snippet |

### UI Features

- **Stats header** — Shows count of processed documents and knowledge chunks
- **Suggested questions** — Pre-built question chips for quick queries
- **Auto-resize textarea** — Input grows as you type
- **Typing indicator** — Animated dots while AI is generating
- **Markdown rendering** — AI responses rendered with formatting
- **Source citations** — Expandable cards showing which document chunks were used
- **Copy button** — One-click copy for AI answers
- **Error states** — Friendly error messages with retry options

---

## ⚙️ Configuration

### Chunking Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `CHUNK_SIZE` | 400 | Tokens per chunk (~1,600 chars) |
| `CHUNK_OVERLAP` | 100 | Token overlap between chunks (~400 chars) |

### Search Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| Top-K | 5 | Number of chunks to retrieve per query |
| Score Threshold | 0.3 | Minimum similarity score (0-1) |

### Model Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `EMBEDDING_MODEL` | `BAAI/bge-m3` | HuggingFace embedding model |
| `EMBEDDING_DIM` | 1024 | Vector dimensions |
| `LLM_MODEL` | `llama-3.3-70b-versatile` | Groq LLM for answer generation |
| `VISION_MODEL` | `meta-llama/llama-4-scout-17b-16e-instruct` | Groq vision model for images |

---

## 🚀 Setup Guide

### Prerequisites

| Requirement | Purpose | Sign Up |
|-------------|---------|---------|
| Python 3.9+ | AI Service runtime | [python.org](https://python.org) |
| Groq API Key | LLM inference (free) | [console.groq.com](https://console.groq.com) |
| HuggingFace Token | Embedding generation (free) | [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) |
| Qdrant Cloud | Vector storage (free 1GB) | [cloud.qdrant.io](https://cloud.qdrant.io) |

### Step-by-Step Setup

#### 1. Create Python Virtual Environment

```bash
cd ai-service
python3 -m venv venv
source venv/bin/activate    # macOS/Linux
# or: venv\Scripts\activate  # Windows
```

#### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

#### 3. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `ai-service/.env` with your API keys:

```env
# Groq API Key (free at https://console.groq.com)
GROQ_API_KEY=gsk_your_groq_api_key_here

# HuggingFace API Token (free at https://huggingface.co/settings/tokens)
HF_API_TOKEN=hf_your_huggingface_token_here

# Qdrant Cloud (free 1GB at https://cloud.qdrant.io)
QDRANT_URL=https://your-cluster.us-east-1-1.aws.cloud.qdrant.io
QDRANT_API_KEY=your_qdrant_api_key_here
```

#### 4. Add AI Service URL to Backend

Add this line to your `backend/.env`:

```env
AI_SERVICE_URL=http://localhost:8000
```

#### 5. Install Backend Dependencies

```bash
cd backend
npm install    # installs axios and form-data packages
```

#### 6. Start All Three Services

```bash
# Terminal 1: AI Service
cd ai-service && source venv/bin/activate && python main.py

# Terminal 2: Node.js Backend
cd backend && npm run dev

# Terminal 3: React Frontend
cd frontend && npm run dev
```

#### 7. Verify Everything Works

1. Check AI service: `http://localhost:8000/health`
2. Upload a document in the frontend
3. Navigate to **Ask AI** in the navbar
4. Ask a question about your document!

---

## 🔐 Environment Variables

### AI Service (`ai-service/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | ✅ | Groq API key for LLM inference |
| `HF_API_TOKEN` | ✅ | HuggingFace token for embeddings |
| `QDRANT_URL` | ✅ | Qdrant Cloud cluster URL |
| `QDRANT_API_KEY` | ✅ | Qdrant Cloud API key |
| `EMBEDDING_MODEL` | ❌ | Override embedding model (default: `BAAI/bge-m3`) |
| `LLM_MODEL` | ❌ | Override LLM model (default: `llama-3.3-70b-versatile`) |
| `VISION_MODEL` | ❌ | Override vision model |
| `CHUNK_SIZE` | ❌ | Tokens per chunk (default: 400) |
| `CHUNK_OVERLAP` | ❌ | Overlap tokens (default: 100) |
| `PORT` | ❌ | Server port (default: 8000) |
| `NODE_BACKEND_URL` | ❌ | Backend URL for callbacks (default: `http://localhost:5000`) |

### Backend Addition (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `AI_SERVICE_URL` | ✅ | AI service URL (default: `http://localhost:8000`) |

---

## 🐛 Troubleshooting

### Common Issues

**"HuggingFace API 404 / Cannot POST"**
- The HF Inference API URL format has changed. The embedder uses `huggingface_hub.InferenceClient` which handles routing automatically. Ensure `huggingface_hub` is installed: `pip install huggingface_hub`

**"Qdrant Index required but not found"**
- Payload indexes (`user_id`, `file_id`) are created automatically on startup. Restart the AI service to trigger index creation.

**"Model has been decommissioned" (Groq)**
- Groq regularly deprecates models. Check [console.groq.com/docs/models](https://console.groq.com/docs/models) for current models and update `LLM_MODEL` in your `.env` file.

**"Dimension mismatch" (Qdrant)**
- If you change the embedding model, the vector dimensions may change. The system auto-detects this and recreates the collection. You'll need to re-upload/reprocess documents.

**"Processing stuck at 'processing'"**
- Check AI service logs for errors. Common causes: expired API keys, rate limiting, or network issues with HuggingFace/Groq.

**"Python type annotation errors (str | None)"**
- The AI service requires Python 3.9+ and uses `typing.Optional` for compatibility. Ensure you're using the correct Python version from the virtual environment.

**"No chunks found / Empty results"**
- The document may not have been processed yet. Check the AI status badge on the file card. Re-upload or click retry to reprocess.

---

## 📊 Performance Notes

- **Embedding latency:** ~0.5-1s per chunk (HuggingFace free tier)
- **Query latency:** ~2-4s total (embed + search + LLM generation)
- **Document processing:** ~10-30s depending on file size and chunk count
- **Storage:** ~1KB per chunk in Qdrant (efficient for free 1GB tier)
- **Concurrent requests:** AI service handles multiple requests via FastAPI async

---

<div align="center">

**[← Back to Main README](./README.md)**

</div>
