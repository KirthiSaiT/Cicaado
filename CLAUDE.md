# Cicaado — CLAUDE.md

## What This Project Is

Cicaado is an educational cybersecurity platform built for CTF (Capture The Flag) competitions.
Users upload image files and run a full suite of forensic/steganography tools against them to find hidden flags, extract hidden data, crack passwords, and analyze file structure.

**Not a general-purpose tool — built specifically for CTF forensics and steg challenges.**

---

## Architecture

```
Browser (Clerk Auth)
    │
    ▼
Next.js 15 Frontend (Port 3000)
  ├── src/app/           → App Router pages
  ├── src/pages/api/     → Pages Router API routes (legacy, keep for now)
  ├── src/components/    → Upload.tsx, Stegsolve.tsx, Nav.tsx, etc.
  └── src/lib/           → mongodb.ts, steganography.ts, utils.ts
    │
    ├── MongoDB Atlas + GridFS (file storage)
    │
    └── POST /process
            ↓
        Python Flask Processor (Port 5000)
          ├── processor/app.py         → main Flask app, all forensic tool orchestration
          ├── processor/routes/recon.py → recon blueprint
          └── processor/recon/         → 20+ recon modules (subfinder, nuclei, etc.)
```

**Stack:**
- Frontend: Next.js 15, TypeScript, Tailwind CSS 4, Framer Motion, Clerk auth
- Backend: Python 3.9, Flask, gunicorn
- Database: MongoDB Atlas + GridFS
- Containerization: Docker + Docker Compose
- Deployment: Render (frontend + processor as separate Docker services)

---

## Environment Variables

| Variable | Used By | Purpose |
|----------|---------|---------|
| `MONGODB_URI` | Frontend + Processor | MongoDB Atlas connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Frontend | Clerk public key |
| `CLERK_SECRET_KEY` | Frontend | Clerk secret key |
| `NEXT_PUBLIC_PROCESSOR_URL` | Frontend | URL of Flask processor (e.g. http://localhost:5000) |

---

## Key Files

| File | Purpose |
|------|---------|
| `processor/app.py` | Flask app — all forensic tool functions + `/process` route |
| `processor/Dockerfile` | Installs all forensic tools, Go recon tools, Python deps |
| `processor/routes/recon.py` | Recon API blueprint |
| `src/components/Upload.tsx` | Main forensics UI — upload, stream results, render tool cards |
| `src/components/Stegsolve.tsx` | Client-side bit-plane / RGB channel visualization (Sharp) |
| `src/pages/api/upload.ts` | GridFS upload (POST) and delete (DELETE) handler, 50MB limit |
| `src/pages/api/run-command.ts` | Delegates analysis to processor, SSE streaming, 1 job/user rate limit |
| `src/app/api/stegsolve/route.ts` | Client-side Sharp image analysis |
| `src/app/forensics/page.tsx` | Forensics page — just renders Upload component |
| `docker-compose.yml` | Multi-container orchestration |

---

## Forensic Tools Pipeline

Every uploaded file goes through these tools in order. Tools are skipped gracefully if not installed.

### Runs on ALL files

| Tool | Function in app.py | What it does |
|------|--------------------|--------------|
| `file_type` | `run_file_command()` | Magic byte detection — identifies real file type regardless of extension |
| `hashes` | shell command | MD5 + SHA1 + SHA256 with VirusTotal link in UI |
| `xxd` | `run_xxd()` | Hex dump of first 512 bytes — spot embedded headers, raw byte patterns |
| `strings` | shell command | Extract all printable strings ≥8 chars — find flags, passwords, URLs |
| `binwalk` | shell command | Scan for embedded files/firmware — a PNG hiding a ZIP inside |
| `foremost` | shell command | File carver — recover embedded files by header/footer signatures |
| `exiftool` | shell command | All metadata: EXIF, XMP, GPS, comments, author, timestamps |
| `ssdeep` | `run_ssdeep()` | Fuzzy hash — compare files for similarity even after modification |

### Images only (PNG/JPG/BMP/GIF/WEBP)

| Tool | Function | What it does |
|------|----------|--------------|
| `zsteg` | `run_zsteg_command()` | LSB bit-plane analysis in PNG/BMP — most common CTF steg method |
| `pngcheck` | shell command | Validate PNG chunk structure and CRC — detect modified chunks |
| `tesseract_ocr` | `run_tesseract()` | OCR — extract visible printed text from image |
| `zbarimg` | `run_zbarimg()` | QR code + barcode detection — very common in CTF |
| `identify` | `run_identify()` | ImageMagick detailed metadata — canvas size, color depth, ICC profiles |
| `stegoveritas` | `run_stegoveritas()` | 30+ auto-checks: LSB, bit planes, color maps, transforms, trailing bytes |

### JPEG only

| Tool | Function | What it does |
|------|----------|--------------|
| `steghide_crack` | `crack_steghide_password()` | StegSeek (built-in rockyou 14M) → 300-word fallback dict |
| `stegdetect` | `run_stegdetect()` | Detects DCT-based steg signatures: jsteg, outguess, F5, etc. |
| `outguess` | `run_outguess()` | Tries empty-key Outguess extraction |
| `jsteg` | `run_jsteg()` | Detects JPEG LSB steganography specifically |

---

## Steghide / StegSeek Cracking

- **StegSeek** is the primary cracker. It uses its own **built-in rockyou.txt** (14 million passwords compiled into the binary). No external wordlist download needed.
- Command used: `stegseek -q image.jpg output.txt` (no wordlist arg = uses built-in)
- If StegSeek finds nothing → falls back to 300-word hardcoded common password list
- Only runs on JPEG and BMP files (steghide limitation)

**We removed the rockyou.txt download from Dockerfile** — both GitHub URLs were dead. StegSeek's built-in dict is identical and more reliable.

---

## Streaming Architecture

```
Flask /process (NDJSON stream)
  yields: {"status": "progress", "tool": "binwalk", "partial_result": "..."}  \n
  yields: {"status": "complete", "results": {...}}  \n
       ↓
Next.js run-command.ts (SSE wrapper)
  wraps each line as: data: {...}\n\n
       ↓
Upload.tsx (EventStream reader)
  parses data: prefix → updates per-tool result cards in real time
```

Each tool result appears in the UI as it completes — users see live progress.

---

## What Was Done in This Session

### Forensic Suite Fixes (Upload.tsx)
- Removed dead `stegsolve` result card — `analyze_stegsolve()` was never called in backend, stegsolve.jar URLs are 404
- Removed unused `import Image from 'next/image'` and `StegsolveResultItem` interface
- Fixed streaming error handling — `parsed.error` now breaks the outer `while` loop (was only breaking inner `for` loop), sets `isAnalysing(false)` immediately
- Added `size` field to `uploadedFile` state — file size now shows correctly instead of "Unknown"
- Fixed `clearUploadedFile` to call `DELETE /api/upload?key=...` — files now actually deleted from GridFS on clear
- Fixed misleading security notice — now says files are stored in GridFS, not "no data stored permanently"

### Forensic Suite Additions (processor/app.py + Dockerfile)
- Replaced useless `cat` tool with `file_type` (magic byte detection via `file -b`)
- Added `xxd` — hex dump first 512 bytes
- Added `ssdeep` — fuzzy hashing
- Added `zbarimg` — QR code / barcode detection
- Added `identify` (ImageMagick) — detailed image metadata
- Added `jsteg` — JPEG LSB steganography detector (Go binary)
- Added `stegoveritas` — 30+ automated CTF steg checks
- Fixed `strings` minimum length from 4 → 8 (reduces noise)
- Fixed `hashes` command to use `printf` instead of `echo` (proper newlines)
- Moved all `import uuid` / `import json` to top-level imports (was scattered in functions)
- Removed `import json` from inside streaming block (fragile pattern)

### Dockerfile Changes
- Added: `xxd`, `zbar-tools`, `imagemagick`, `sox`, `ffmpeg`, `ssdeep` via apt
- Added: `jsteg` via `go install`
- Added: `stegoveritas` via pip (separate layer for Docker cache)
- Removed: Java (`default-jdk`) — was only needed for stegsolve.jar which is dead
- Removed: stegsolve.jar download (both GitHub URLs return 404)
- Removed: rockyou.txt download (both URLs dead) — stegseek has it built-in
- Renamed step numbers to stay sequential

### StegSeek Fix
- Removed external rockyou.txt dependency entirely
- `crack_steghide_password_with_stegseek()` now calls `stegseek -q image output` with no wordlist arg
- StegSeek uses its own embedded 14M rockyou.txt — same passwords, no download needed

---

## Known Issues / Tech Debt

1. **Mixed Router pattern** — `src/pages/api/` (Pages Router) and `src/app/` (App Router) coexist. Should migrate all API routes to App Router eventually.
2. **No results persistence** — analysis results lost on page refresh (LocalStorage only caches the file reference, not results).
3. **No job queue** — multiple users hitting `/api/run-command` simultaneously will overload the single processor. Rate limiting is 1 job/user but no global queue.
4. **Contact form does nothing** — form submits but no email is sent. Needs Resend or Nodemailer.
5. **stegsolve.jar** — dead code in `app.py` (`analyze_stegsolve()` function exists but is never called). Should be removed.
6. **sox / ffmpeg installed but unused** — sox spectrogram was removed for now. Can be re-added for audio CTF challenges.
7. **stegoveritas / jsteg may not install** — both have `|| echo fallback` in Dockerfile. Check build logs to confirm they installed.

---

## Development Setup

```bash
# Frontend
npm install
npm run dev

# Processor (local, needs forensic tools installed)
cd processor
pip install flask pillow pymongo flask-cors
python app.py

# Both via Docker
docker compose up --build
```

---

## Deployment (Render)

1. Push to GitHub — Render auto-deploys from main branch
2. Processor: Docker build from `processor/Dockerfile`, expose port 5000
3. Frontend: Docker build from root `Dockerfile`, expose port 3000
4. Set all 4 env vars in Render dashboard
5. `NEXT_PUBLIC_PROCESSOR_URL` must point to the deployed processor service URL
