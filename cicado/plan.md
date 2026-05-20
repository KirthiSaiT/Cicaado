# Cicaado — Project Plan

## Overview

Cicaado is an educational cybersecurity platform focused on steganography analysis and detection. Users upload files (primarily images) and run a suite of forensic tools against them to detect hidden data, extract metadata, crack steghide passwords, and perform bit-plane visualization.

---

## Architecture

```
Browser (Clerk Auth)
    │
    ▼
Next.js Frontend (Port 3000)
  ├── UI: Upload, Stegsolve, Nav, SteghideCrackDemo
  ├── API: /api/upload, /api/run-command, /api/file/[id], /api/stegsolve
    │
    ├── MongoDB GridFS (file storage)
    │
    └── POST /process
            │
            ▼
        Python Flask Processor (Port 5000)
          ├── Fetches file from MongoDB GridFS
          ├── Runs: binwalk, strings, exiftool, foremost, zsteg,
          │         steghide, stegseek, outguess, pngcheck, stegsolve
          └── Returns JSON analysis results
```

**Stack:**
- Frontend: Next.js 15 (App + Pages Router hybrid), TypeScript, Tailwind CSS 4, Framer Motion
- Auth: Clerk
- Backend: Python 3.9, Flask
- Database: MongoDB Atlas + GridFS
- Containerization: Docker + Docker Compose
- Deployment: Render (frontend + processor as separate services)

---

## Current State

### Done
- [x] Clerk authentication gate (unauthenticated → animated login)
- [x] File upload to MongoDB GridFS (drag-and-drop via React Dropzone)
- [x] Multi-tool forensic analysis pipeline (10 tools)
- [x] Steghide password cracking (StegSeek primary, 300-word dict fallback)
- [x] Client-side RGB channel + bit-plane visualization (Sharp-based)
- [x] Tool-specific result formatting in the UI
- [x] Responsive navigation (desktop + mobile)
- [x] Docker containerization (processor + frontend)
- [x] Cybersecurity cheatsheet page (beginner/intermediate/advanced)
- [x] Contact page (client-side form state only)
- [x] LocalStorage caching of last uploaded file
- [x] 10-minute timeout for long-running analysis
- [x] Graceful error handling + processor fallback logging

---

## Roadmap

### Phase 1 — Polish & Stability (Immediate)

| Task | Priority | Notes |
|------|----------|-------|
| Fix contact form backend | High | Currently no email delivery; add Resend or Nodemailer |
| Add rate limiting to `/api/run-command` | High | Prevent abuse; 1 concurrent job per user |
| Enforce file size limit in upload UI + API | High | Prevent OOM in processor; 50MB cap recommended |
| Add real-time progress indicator for analysis | Medium | WebSocket or SSE; analysis can take 5–10 min |
| Surface per-tool errors more clearly in UI | Medium | Currently all errors silently merge into result string |
| Add file deletion UI (call existing DELETE `/api/upload`) | Medium | GridFS fills up; users should manage their uploads |

### Phase 2 — User Experience

| Task | Priority | Notes |
|------|----------|-------|
| User file history dashboard | High | List past uploads + re-run analysis |
| Persist analysis results to MongoDB | High | Cache results by file ID; skip re-run if cached |
| Real-time analysis progress (SSE) | Medium | Stream tool-by-tool progress to frontend |
| Download extracted steghide data | Medium | Currently shown as text; expose as downloadable file |
| Expand cheatsheet | Low | Add more CTF-focused resources; search/filter UI |

### Phase 3 — Infrastructure & DevOps

| Task | Priority | Notes |
|------|----------|-------|
| Set up GitHub Actions CI pipeline | High | Lint + type-check on every PR |
| Add health check monitoring | Medium | Render webhook or UptimeRobot for processor |
| Add structured logging to processor | Medium | Replace print() with Python logging module |
| MongoDB TTL index on GridFS uploads | Medium | Auto-expire files after 7 days to control storage costs |
| Migrate Pages Router API routes to App Router | Low | `/src/pages/api/` → `/src/app/api/` for consistency |

### Phase 4 — Advanced Features

| Task | Priority | Notes |
|------|----------|-------|
| Support more file types (PDF, audio, video) | Medium | binwalk + strings work on any binary |
| Side-by-side image diff (original vs extracted) | Medium | Useful for visually detecting LSB steg |
| Batch upload & bulk analysis | Low | Analyze multiple files in one session |
| Admin dashboard (user management, usage stats) | Low | Useful if platform opens to wider audience |
| Blog / write-ups section | Low | LinkedIn placeholder on Nav suggests this was planned |

---

## Key Files

| File | Purpose |
|------|---------|
| `processor/app.py` | Flask app — all forensic tool orchestration (659 lines) |
| `src/components/Upload.tsx` | Main upload + result display UI (297 lines) |
| `src/components/Stegsolve.tsx` | Bit-plane / channel visualization (264 lines) |
| `src/app/layout.tsx` | Root layout, Clerk auth gate (105 lines) |
| `src/pages/api/upload.ts` | GridFS upload/delete handler (163 lines) |
| `src/pages/api/run-command.ts` | Delegates analysis to processor (105 lines) |
| `src/app/api/stegsolve/route.ts` | Client-side Sharp image analysis |
| `docker-compose.yml` | Multi-container orchestration |
| `processor/Dockerfile` | Installs all 10+ forensic tools + rockyou.txt |

---

## Environment Variables

| Variable | Used By | Purpose |
|----------|---------|---------|
| `MONGODB_URI` | Frontend + Processor | MongoDB Atlas connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Frontend | Clerk public key |
| `CLERK_SECRET_KEY` | Frontend | Clerk secret key |
| `NEXT_PUBLIC_PROCESSOR_URL` | Frontend | URL of Flask processor service |

---

## Known Issues / Tech Debt

1. **Mixed Router pattern** — Pages Router (`/src/pages/api/`) and App Router (`/src/app/`) coexist. Should migrate all API routes to App Router.
2. **No results persistence** — Every page load/refresh loses analysis results (except LocalStorage file cache).
3. **No job queue** — Multiple users hitting `/api/run-command` simultaneously will overload the single processor container.
4. **Contact form does nothing** — Submitting the form only updates local state; no email is sent.
5. **No cleanup policy** — GridFS accumulates uploaded files indefinitely.
6. **Stegsolve.jar still used** — Java-based server-side stegsolve in processor is redundant now that Sharp handles client-side analysis. Consider removing to reduce Docker image size.

---

## Development Setup

```bash
# Install frontend dependencies
cd cicado
npm install

# Run frontend locally
npm run dev

# Run processor locally (requires forensic tools installed)
cd processor
pip install flask pillow pymongo
python app.py

# Run both via Docker
docker-compose up --build
```

**Required environment:**
- Node 18+
- Python 3.9+
- MongoDB Atlas URI (or local MongoDB)
- Clerk account (for auth keys)

---

## Deployment (Render)

1. Push to GitHub — Render auto-deploys from main branch
2. Processor service: Docker build from `processor/Dockerfile`, expose port 5000
3. Frontend service: Docker build from root `Dockerfile`, expose port 3000
4. Set all environment variables in Render dashboard
5. `NEXT_PUBLIC_PROCESSOR_URL` must point to the deployed processor service URL
