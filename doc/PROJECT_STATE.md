# Nexera OS — Project State Document
> Last updated: 2026-05-22 | Version: **1.9.0**
>
> **Purpose**: Single source of truth for any developer (human or AI) resuming this project cold. Read this before touching any code. It tells you what exists, where it lives, what works, what is broken, and what to build next.
>
> **Rule**: This file is updated every session, every time a new feature, fix, or system is added.

---

## Table of Contents
1. [What Is Nexera OS?](#1-what-is-nexera-os)
2. [Repository Layout](#2-repository-layout)
3. [How to Run Everything](#3-how-to-run-everything)
4. [What Is Built and Working](#4-what-is-built-and-working)
5. [What Is Partially Built](#5-what-is-partially-built)
6. [What Is Missing / Next Steps](#6-what-is-missing--next-steps)
7. [Key Files Reference](#7-key-files-reference)
8. [Architecture Diagram](#8-architecture-diagram)
9. [Known Bugs — Fixed & Active](#9-known-bugs--fixed--active)
10. [Design System](#10-design-system)
11. [API Reference](#11-api-reference)
12. [Roadmap](#12-roadmap)

---

## 1. What Is Nexera OS?

Nexera OS is a **local-first, agent-driven developer IDE** that runs entirely on your machine. It combines:

- A **FastAPI backend** hosting a LangGraph multi-agent swarm (CEO → Engineer → QA)
- A **Next.js 16 PWA frontend** — the full IDE UI in a single 4100-line `page.tsx`
- A **Monaco Editor** (VS Code's editor) for the center code pane with syntax highlighting
- A **live PowerShell terminal** streamed over WebSocket
- A **CTO approval gate** — no agent writes a file without human sign-off
- A **Docker sandbox** for safe agent command execution (falls back to host mode gracefully)
- **Playwright browser automation** for web crawling tasks
- **PWA support** — installable on Android/iOS, offline fallback, Cloudflare tunnel for remote access

The user types a task into the IDE. A swarm of AI agents (Ollama locally, or Gemini/Claude via API) autonomously plans, codes, tests, and commits — pausing at every file write for your approval.

---

## 2. Repository Layout

```
D:\Nexera\
├── backend/
│   ├── main.py                  ← All API routes + WebSocket hubs. Pydantic-validated. (~900 lines)
│   ├── graph.py                 ← LangGraph CEO/Engineer/QA agents + run_task() (~400 lines)
│   ├── config.py                ← Load/save nexera.config.json (109 lines)
│   ├── database.py              ← SQLAlchemy 2.0 async models (agent_logs, git_changelogs, build_state)
│   ├── pattern_engine.py        ← Typo correction, shorthand expansion, analytics (150 lines)
│   ├── redis_state.py           ← Redis with in-memory fallback (29 lines)
│   ├── websocket_manager.py     ← Broadcast manager for /ws (26 lines)
│   └── tools/
│       ├── sandbox_manager.py   ← DockerSandbox: container lifecycle, wrap_command(), fallback
│       ├── file_ops.py          ← read/write/delete/list files in workspace/
│       ├── shell_ops.py         ← run_command() wrapper
│       ├── git_ops.py           ← git init/add/commit/log
│       ├── automation_ops.py    ← pyautogui mouse/keyboard + real async Playwright crawl
│       └── screenshot_tool.py   ← desktop capture + pytesseract OCR
│
├── mobile/                      ← Next.js 16 PWA (the IDE UI)
│   ├── src/app/
│   │   ├── page.tsx             ← MAIN IDE — Monaco editor, 5-pane layout, all logic (~4150 lines)
│   │   ├── layout.tsx           ← Root layout with full PWA metadata
│   │   ├── sw-register.tsx      ← Service worker registration on mount
│   │   └── offline/page.tsx     ← Offline fallback page
│   └── public/
│       ├── manifest.json        ← PWA manifest (icons, shortcuts, theme #3279F9)
│       ├── sw.js                ← Service worker (cache-first static, network-first nav)
│       ├── icon-192x192.png     ← Cobalt blue #3279F9 background, white N lettermark
│       ├── icon-512x512.png
│       └── icon-maskable-512x512.png
│
├── desktop/                     ← STUB ONLY — index.html reference design, NOT a Tauri app
│
├── workspace/                   ← Agent sandbox directory — all agent file writes land here
│   └── test_backend.py          ← 7 unit tests (config, pattern engine, async SQLite)
│
├── doc/
│   ├── PROJECT_STATE.md         ← THIS FILE — updated every session
│   ├── CHANGELOG.md             ← Version history (v1.0.0–v1.7.0)
│   ├── architecture.md          ← Deep-dive API schemas, DB design, swarm workflows
│   ├── agent_ide_blueprint.md   ← Full architecture spec + Mermaid gap analysis diagrams
│   ├── srs.md                   ← Software Requirements Specification (4 phases)
│   ├── user_guide.md            ← End-user instructions
│   └── CLAUDE.md / AGENTS.md   ← AI developer instructions
│
├── bootstrap.py                 ← Autonomous 4-phase LangGraph build engine (1450 lines)
├── cloudflare_tunnel.py         ← Launch Cloudflare tunnel to expose port 3000
├── nexera.config.json           ← Runtime config: model, provider, keys, version history
├── requirements.txt             ← Python runtime deps
├── requirements-dev.txt         ← pytest, pytest-asyncio, aiosqlite, sqlalchemy
├── self_test.py                 ← Standalone diagnostic suite (100% health score)
└── .gitignore
```

---

## 3. How to Run Everything

### Backend
```powershell
cd D:\Nexera
pip install -r requirements.txt     # first time only
uvicorn backend.main:app --reload --port 8000
```
Live at `http://127.0.0.1:8000`. Swagger UI at `/docs`.

### Frontend
```powershell
cd D:\Nexera\mobile
npm install                          # first time only
npm run dev
```
IDE at `http://localhost:3000`.

### Run Tests
```powershell
cd D:\Nexera
pip install -r requirements-dev.txt
pytest workspace/test_backend.py -v
# Expected: 7 passed, 0 warnings
```

### Expose to Mobile via Cloudflare
```powershell
.\mobile\launch_tunnel.ps1
# or
python cloudflare_tunnel.py --port 3000
```

---

## 4. What Is Built and Working

### ✅ Backend — FastAPI (`backend/main.py`)

All POST endpoints use **Pydantic typed models** — invalid payloads return structured 422 errors automatically.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/status` | GET | Health + active model + `sandbox: bool` |
| `/api/sandbox/status` | GET | `{ active, mode: "docker"\|"host", container }` |
| `/api/config` | GET | Load `nexera.config.json` |
| `/api/config/save` | POST | Save config |
| `/api/start` | POST | Kick off swarm task (`TaskRequest`) |
| `/api/approvals/pending` | GET | Poll for pending CTO approval item |
| `/api/approvals/submit` | POST | Approve/reject (`ApprovalRequest`) |
| `/api/workspace/tree` | GET | Workspace file tree |
| `/api/workspace/read` | GET | Read file by `?path=` |
| `/api/workspace/save` | POST | Save file (`FileSaveRequest`) |
| `/api/workspace/create` | POST | Create file/dir (`FileCreateRequest`) |
| `/api/workspace/delete` | POST | Delete file/dir (`FileDeleteRequest`) |
| `/api/workspace/search` | GET | Full-text search workspace |
| `/api/git/status` | GET | Git status of workspace |
| `/api/git/commit` | POST | Stage all + commit |
| `/api/automation/run` | POST | Playwright crawl (`AutomationRunRequest`) |
| `/api/intent/preview` | POST | Pattern-engine prompt expansion preview |
| `/api/screenshot` | GET | Desktop screenshot via pyautogui + OCR |
| `WS /ws` | WebSocket | Swarm event stream (agent logs, system events) |
| `WS /ws/terminal` | WebSocket | Live PowerShell subprocess I/O |

### ✅ Agent Swarm (`backend/graph.py`)
- **CEO Agent** — decomposes goal into numbered steps via LLM
- **Engineer Agent** — generates code, stages in `approval_queue`, waits for CTO sign-off, writes to `workspace/`
- **QA Agent** — `compile()` syntax check + `unittest discover` (runs inside Docker if available, falls back to host)
- **Self-healing retry loop** — 3 retries per step, then escalates to CTO
- **CTO approval gate** — `approval_queue` dict acts as a blocking semaphore between Engineer and frontend

### ✅ Docker Sandbox (`backend/tools/sandbox_manager.py`)
- `DockerSandbox` class — checks Docker daemon on startup (5s timeout, non-blocking)
- `wrap_command(cmd)` — wraps list or string commands to run inside `nexera-sandbox` container
- `get_terminal_spawner()` — returns `docker exec -it nexera-sandbox bash` or PowerShell fallback
- `ensure_container_running()` — creates/starts container if not already running
- **Wired into**: QA agent unit test runner (`graph.py`), `/ws/terminal` spawn, and `bootstrap.py`'s `run_shell_command` wrapper to securely isolate all autonomous CLI and unit test operations.
- **Fallback**: all operations work in host mode if Docker is absent — no crashes


### ✅ IDE Frontend (`mobile/src/app/page.tsx`)

Five-pane VS Code Dark+ layout:

| Pane | Status | Details |
|------|--------|---------|
| **Activity Bar** (56px left) | ✅ Full | 9 icons: Explorer, Search, Git, Run, Extensions, Brain, Viewport, Settings, Agents |
| **Left Sidebar** (288px) | ✅ Full | Switches per icon: file tree, git panel, extensions, brain/personalization, agent cards, settings |
| **Center Editor** | ✅ Full | **Monaco Editor** (`@monaco-editor/react`) with syntax highlighting, Ctrl+S save, auto-brackets, smooth cursor. **Flat VS Code tabs** — colored language badge, top cobalt accent on active, hover-to-reveal `×` close. |
| **Right Swarm Chat** | ✅ Full | Color-coded agent log stream, expandable accordion cards, chat input |
| **Bottom Panel** | ✅ Full | Dual tab: System Swarm Logs + live PowerShell terminal |
| **Status Bar** (bottom) | ✅ Full | Git branch, ⚠/✗ counts, 🐳 sandbox indicator, file type, Ln/Col, settings link |

Key features:
- **Monaco Editor**: `vs-dark` theme, language auto-detected from file extension (`getLanguageFromPath`), `Ctrl+S` command wired to `handleSaveFile`, auto-closing brackets, smooth caret animation, minimap off
- **Agents Panel**: Three provider cards (Local/Ollama, Gemini, Claude). Click card to activate, edit model/key fields, SAVE & APPLY
- **CTO Approval Banner**: Inline in editor when agent stages a file. Accept/Reject buttons. Fixed race condition — banner clears immediately on click
- **File Explorer**: Recursive tree with inline create/delete, auto-refresh after agent writes
- **Git Panel**: Staged/unstaged file list, commit message input, one-click commit
- **PowerShell Terminal**: Full interactive shell via WebSocket. Arrow-up/down history, Ctrl+C interrupt
- **Pattern Engine Preview**: Live expansion as you type in the brain/personalization panel
- **Viewport Panel**: pyautogui coordinate click + Playwright crawler controls
- **Sandbox Status Chip**: Status bar shows 🐳 DOCKER (green) or ⚙ HOST MODE (amber); click to recheck

### ✅ PWA / Mobile
- `manifest.json` — installable on Android/Chrome
- `sw.js` — cache-first for `_next/static/`, network-first navigation, API/WS bypassed
- `offline/page.tsx` — graceful offline fallback
- Icons: 192×192, 512×512, 512×512 maskable
- Tunnel: `cloudflare_tunnel.py` or `launch_tunnel.ps1`

### ✅ Database (`backend/database.py`)
SQLite via SQLAlchemy 2.0 async:
- `agent_logs` — id, timestamp, agent_name, action, result, phase
- `git_changelogs` — id, timestamp, commit_hash, message, files_changed (JSON)
- `build_state` — phase (PK), status, files_json

### ✅ Pattern Engine (`backend/pattern_engine.py`)
- Auto-corrects common dev typos
- Expands user-defined shorthands
- Analytics: total_prompts, typo_corrections_made, shorthands_applied, characters_processed
- Config stored in `nexera.config.json` under `personalization.aliases`

### ✅ API Key Header Authentication (v1.8.0)
- Implemented `APIKeyMiddleware` on the FastAPI backend, restricting all direct REST queries under `/api/*` (except standard CORS `OPTIONS` preflight requests).
- Validates the incoming requests by checking if the `X-Nexera-Key` matches `"security.api_key"` defined in `nexera.config.json` (defaults to `"nexera_master_key_2026"`).
- Automatically responds with `401 Unauthorized` and `{"message": "Unauthorized: Invalid or missing X-Nexera-Key header."}` for invalid or missing keys.
- WebSocket handshakes (`/ws` and `/ws/terminal`) and OpenAPI schemas (`/docs`) remain bypassed to facilitate smooth streaming and schema diagnostics.
- Wired interceptors globally on `window.fetch` in Next.js frontends (`mobile/src/app/page.tsx`, `mobile/src/app/web/page.tsx`, and `mobile/src/app/mobile/page.tsx`) to seamlessly attach `X-Nexera-Key`.
- Integrated authentication header into the desktop stub reference fetch helper (`desktop/index.html`).

---

## 5. What Is Partially Built

### ⚠️ Context Window — fixed message count, not token count
`bootstrap.py` uses `MSG_LIMIT=14` (message count). It does not measure actual token usage.

**Fix needed**: Integrate `tiktoken`, count tokens per message, prune when budget exceeds `MAX_CONTEXT=8192`.

### ⚠️ Desktop Wrapper
`desktop/index.html` is a 79KB standalone HTML reference design. Phase 2 of the SRS (Tauri v2 desktop wrapper) was never built.

**Fix needed**: Build a Tauri v2 app in `desktop/` that wraps `localhost:3000`.

---

## 6. What Is Missing / Next Steps

| Feature | Priority | Status |
|---------|----------|--------|
| Wire `bootstrap.py` shell commands through DockerSandbox | Critical | ✅ Completed (v1.8.0) |
| API key authentication middleware | High | ✅ Completed (v1.8.0) |
| `tiktoken` token counting + cost tracking | Medium | ❌ Missing |
| RAG retrieval (ChromaDB + nomic-embed-text) | Medium | ❌ Missing |
| Tauri v2 desktop wrapper | Medium | ❌ Missing (stub only) |
| Inline diff view for CTO approvals (Monaco DiffEditor) | Medium | ❌ Missing |
| LSP autocomplete (language server) | Low | ❌ Missing |
| Collaborative editing (OT/CRDT) | Future | ❌ Not scoped |
| Debugger protocol (DAP) | Future | ❌ Not scoped |

---

## 7. Key Files Reference

| File | Role | Approx Size |
|------|------|------------|
| `mobile/src/app/page.tsx` | Entire IDE UI | ~4150 lines |
| `backend/main.py` | All API + WebSocket routes, Pydantic models | ~900 lines |
| `bootstrap.py` | Autonomous 4-phase LangGraph build engine | ~1450 lines |
| `backend/graph.py` | CEO/Engineer/QA agents + run_task() | ~400 lines |
| `backend/tools/sandbox_manager.py` | Docker lifecycle, command wrapping, fallback | ~130 lines |
| `backend/pattern_engine.py` | Prompt preprocessing, typos, shorthands | ~150 lines |
| `nexera.config.json` | Runtime config — model, provider, API keys | ~3.3KB |
| `doc/CHANGELOG.md` | Version history v1.0.0→v1.7.0 | — |

---

## 8. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│  CLIENT LAYER                                                       │
│  Next.js 16 PWA — localhost:3000                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  page.tsx — 5-pane IDE                                       │  │
│  │  Activity Bar | Sidebar | Monaco Editor | Chat | Terminal    │  │
│  │  Status bar: git branch · sandbox mode · file type · Ln/Col │  │
│  └─────────────────────────┬────────────────────────────────────┘  │
│                             │ HTTP REST + WebSocket                  │
└─────────────────────────────┼───────────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────────┐
│  API GATEWAY — FastAPI :8000                                        │
│  All POST bodies validated via Pydantic models                      │
│  REST: /api/start  /api/approvals/*  /api/workspace/*              │
│        /api/git/*  /api/sandbox/status  /api/config/*              │
│  WS:   /ws (swarm events)   /ws/terminal (PowerShell)             │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────────┐
│  ORCHESTRATION — graph.py                                           │
│  run_task(goal)                                                     │
│    CEO.execute()     → decomposes into steps                       │
│    Engineer.execute() → generates code → approval_queue (BLOCKS)   │
│    QA.execute()      → compile() + unittest via DockerSandbox      │
│    retry loop (max 3)                                               │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────────┐
│  EXECUTION LAYER                                                    │
│  DockerSandbox (sandbox_manager.py)                                 │
│    ├─ Docker active  → wrap_command() → nexera-sandbox container   │
│    └─ Docker absent  → direct host subprocess (safe path only)     │
│  file_ops / shell_ops / git_ops / automation_ops / screenshot_tool  │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────────┐
│  INTELLIGENCE LAYER                                                 │
│  Ollama (local)   → any model at http://127.0.0.1:11434            │
│  Gemini API       → gemini-2.0-flash / 1.5-pro / 2.0-pro-exp      │
│  Claude API       → claude-opus-4-7 / sonnet-4-6 / haiku-4-5      │
│  pattern_engine   → typo correction + shorthand expansion          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 9. Known Bugs — Fixed & Active

### Fixed
| Bug | Version Fixed | Root Cause | Fix Applied |
|-----|---------------|------------|-------------|
| Direct REST shell commands bypass sandbox | v1.8.0 | `run_shell_command` in bootstrap ran direct subprocesses on host | Routed `run_shell_command` fully through `sandbox.wrap_command()` |
| No API authentication — all endpoints open | v1.8.0 | Endpoints accepted all requests without key validation | Implemented `APIKeyMiddleware` requiring `X-Nexera-Key` and globally injected headers into client fetches |
| Local-variable NameError in `/api/approvals/submit` | v1.7.0 | `status` and `notes` referenced before local definition in websocket broadcast scope | Defined `status` and `notes` locally in endpoint handler scope |
| CTO approval banner reappears after clicking Approve | v1.6.0 | `/api/approvals/submit` left `pending` set; frontend 1500ms poll re-fetched it | `approval_queue["pending"] = None` cleared immediately in submit endpoint |
| SQLAlchemy deprecation warning in tests | v1.5.0 | `from sqlalchemy.ext.declarative import declarative_base` deprecated | Changed to `from sqlalchemy.orm import declarative_base` |
| Tunnel scripts used wrong port (3001 vs 3000) | v1.5.0 | Copy-paste error in launch scripts | Fixed to port 3000 in both `.ps1` and `.sh` |

### Active / Known Limitations
| Issue | Severity | Notes |
|-------|----------|-------|
| Warnings count in status bar was hardcoded 13 | Fixed v1.7.0 | Now shows 0 |
| `desktop/` is not a real app | Medium | HTML stub only |

---

## 10. Design System

VS Code Dark+ / Antigravity IDE palette (applied since v1.6.0):

| Token | Hex | Used For |
|-------|-----|----------|
| Main editor bg | `#1e1e1e` | Center editor pane |
| Sidebar bg | `#252526` | Left sidebar, status bar |
| Tab bar / panels | `#2d2d30` | Tab headers, terminal header, panel headers |
| Titlebar | `#3c3c3c` | Top header bar |
| Activity bar | `#333333` | Left icon dock |
| Primary border | `#3c3c3c` | All major dividers |
| Subtle border | `#2b2b2b` | Secondary dividers |
| Accent cobalt | `#3279F9` | Active indicators, glow, buttons |
| Text primary | `#d4d4d4` | Main readable text |
| Text muted | `#808080` | Secondary / dim text |
| Text active label | `#cccccc` | Panel header labels |
| Status bar accent | `#007acc` | (Reserved — VS Code blue) |

Font: system monospace stack — Consolas, Monaco, Courier New. Tailwind class `font-mono`.
Custom scrollbar: `.custom-scrollbar` defined in `globals.css`.

---

## 11. API Reference

### Pydantic Request Models (backend/main.py)

```python
TaskRequest          { task: str (1–8000 chars) }
ApprovalRequest      { status: "approved"|"rejected", revision_notes?: str (≤2000) }
FileSaveRequest      { path: str, content: str }
FileCreateRequest    { path: str, is_dir: bool = False }
FileDeleteRequest    { path: str }
GitCommitRequest     { message: str (1–500 chars) }
AutomationRunRequest { url: str (≥4 chars) }
IntentPreviewRequest { prompt: str (1–4000 chars) }
CoordinatesRequest   { x: int ≥0, y: int ≥0 }
KeyboardTypeRequest  { text: str (1–1000 chars) }
```

All invalid payloads return HTTP 422 with FastAPI's standard validation error body.

### WebSocket Message Formats

**`/ws` — Swarm Events (server → client)**
```json
{ "type": "system"|"agent"|"error"|"success", "message": "...", "agent": "CEO"|"Engineer"|"QA" }
```

**`/ws/terminal` — Terminal I/O (bidirectional)**
```json
// client → server
{ "type": "terminal_in", "data": "ls -la\r\n" }
{ "type": "terminal_reset" }
// server → client
{ "type": "terminal_out", "data": "..." }
```

---

## 12. Roadmap

### v1.8.0 — Security
- [x] Wire `bootstrap.py` `run_shell_command` through `sandbox.wrap_command()`
- [x] Add `X-Nexera-Key` header authentication middleware

### v1.9.0 — Intelligence Upgrade
- [ ] Add `tiktoken` token counting to all LLM calls
- [ ] Add token cost tracking table in SQLite + display in status bar
- [ ] Replace fixed `MSG_LIMIT` with token-aware pruning
- [ ] Add ChromaDB + nomic-embed-text for RAG retrieval over workspace files

### v2.0.0 — Native Desktop
- [ ] Build Tauri v2 wrapper in `desktop/` — replaces the HTML stub
- [ ] System tray, native window controls, OS file associations
- [ ] Monaco DiffEditor wired into CTO approval flow (split old/new view)
