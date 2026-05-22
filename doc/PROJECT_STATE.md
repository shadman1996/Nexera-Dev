# Nexera OS — Project State Document
> Last updated: 2026-05-22 | Version: 1.6.0
>
> **Purpose**: This document is the single source of truth for any developer (human or AI) picking up this project cold. Read this first. It tells you what exists, where it lives, what works, what is broken, and what needs to be built next.

---

## Table of Contents
1. [What Is Nexera OS?](#1-what-is-nexera-os)
2. [Repository Layout](#2-repository-layout)
3. [How to Run Everything](#3-how-to-run-everything)
4. [What Is Built and Working](#4-what-is-built-and-working)
5. [What Is Partially Built](#5-what-is-partially-built)
6. [What Is Missing](#6-what-is-missing)
7. [Key Files Reference](#7-key-files-reference)
8. [Architecture in One Diagram](#8-architecture-in-one-diagram)
9. [Known Bugs and Workarounds](#9-known-bugs-and-workarounds)
10. [Design System](#10-design-system)
11. [Roadmap](#11-roadmap)

---

## 1. What Is Nexera OS?

Nexera OS is a **local-first, agent-driven developer IDE** that runs entirely on your machine. It combines:

- A **FastAPI backend** that hosts a LangGraph multi-agent swarm (CEO → Engineer → QA)
- A **Next.js 16 PWA frontend** that is the actual IDE UI (5-pane VS Code–style layout)
- A **PowerShell terminal** streamed live over WebSocket
- A **CTO approval gate** — no agent writes a file without human sign-off
- **Playwright browser automation** for web crawling tasks
- **PWA support** — installable on Android/iOS, offline fallback, Cloudflare tunnel for remote access

The user interacts with the IDE, types a task, and a swarm of AI agents (using Ollama locally or Gemini/Claude via API) autonomously plan, code, test, and commit — pausing for your approval at every file write.

---

## 2. Repository Layout

```
D:\Nexera\
├── backend/                    ← FastAPI Python server
│   ├── main.py                 ← API routes, WebSocket hubs, task runner (856 lines)
│   ├── graph.py                ← LangGraph CEO/Engineer/QA agents (399 lines)
│   ├── config.py               ← Load/save nexera.config.json (109 lines)
│   ├── database.py             ← SQLAlchemy models: agent_logs, git_changelogs, build_state
│   ├── pattern_engine.py       ← Typo correction, shorthand expansion, analytics (150 lines)
│   ├── redis_state.py          ← Redis with in-memory fallback (29 lines)
│   ├── websocket_manager.py    ← Broadcast manager for /ws (26 lines)
│   └── tools/
│       ├── file_ops.py         ← read/write/delete/list files in workspace
│       ├── shell_ops.py        ← run_command() wrapper
│       ├── git_ops.py          ← git init/add/commit/log
│       ├── automation_ops.py   ← pyautogui mouse/keyboard + real Playwright crawl
│       └── screenshot_tool.py  ← desktop capture + pytesseract OCR
│
├── mobile/                     ← Next.js 16 PWA (the IDE UI)
│   ├── src/app/
│   │   ├── page.tsx            ← MAIN IDE UI — 4100+ lines, all panes and logic
│   │   ├── layout.tsx          ← Root layout with PWA metadata
│   │   ├── sw-register.tsx     ← Service worker registration component
│   │   └── offline/page.tsx    ← Offline fallback page
│   └── public/
│       ├── manifest.json       ← PWA manifest (icons, shortcuts, theme)
│       ├── sw.js               ← Service worker (cache-first static, network-first nav)
│       ├── icon-192x192.png    ← PWA icon — cobalt blue #3279F9 with white N
│       ├── icon-512x512.png
│       └── icon-maskable-512x512.png
│
├── desktop/                    ← STUB ONLY — index.html skeleton, not a real wrapper
│
├── workspace/                  ← Agent sandbox — all agent file writes land here
│   └── test_backend.py         ← 7 unit tests (config, pattern engine, async SQLite)
│
├── doc/                        ← Documentation
│   ├── PROJECT_STATE.md        ← THIS FILE — read first
│   ├── architecture.md         ← Deep-dive API schemas, DB design, swarm workflows
│   ├── srs.md                  ← Software Requirements Specification (4 phases)
│   ├── agent_ide_blueprint.md  ← Full architecture spec with gap analysis
│   ├── user_guide.md           ← End-user instructions
│   └── CLAUDE.md / AGENTS.md  ← AI developer instructions
│
├── bootstrap.py                ← LangGraph autonomous 4-phase build engine (1450 lines)
├── cloudflare_tunnel.py        ← Launch Cloudflare tunnel to expose port 3000
├── nexera.config.json          ← Runtime config: model, provider, API keys, history
├── requirements.txt            ← Python runtime deps
├── requirements-dev.txt        ← Python test/dev deps (pytest, aiosqlite, sqlalchemy)
├── CHANGELOG.md                ← Version history — update at end of every session
└── .gitignore
```

---

## 3. How to Run Everything

### Start the Backend
```powershell
cd D:\Nexera
pip install -r requirements.txt     # first time only
uvicorn backend.main:app --reload --port 8000
```
Backend is live at `http://127.0.0.1:8000`. Swagger docs at `/docs`.

### Start the Frontend
```powershell
cd D:\Nexera\mobile
npm install                          # first time only
npm run dev
```
IDE is live at `http://localhost:3000`.

### Run Backend Tests
```powershell
cd D:\Nexera
pip install -r requirements-dev.txt
pytest workspace/test_backend.py -v
# Expected: 7 passed, 0 warnings
```

### Open Remote on Mobile (Cloudflare Tunnel)
```powershell
# Option A: PowerShell script
.\mobile\launch_tunnel.ps1

# Option B: Python script (auto-detects cloudflared, prints the public URL)
python cloudflare_tunnel.py --port 3000
```

---

## 4. What Is Built and Working

### ✅ Backend — FastAPI Server (`backend/main.py`)
- `GET /api/health` — health check
- `GET /api/config` / `POST /api/config/save` — load and persist `nexera.config.json`
- `POST /api/start` — kick off a swarm task (CEO → Engineer → QA)
- `GET /api/approvals/pending` — poll for a pending CTO approval item
- `POST /api/approvals/submit` — submit approve/reject with revision notes
- `GET /api/workspace/files` — list workspace file tree
- `POST /api/workspace/create` — create file or directory
- `DELETE /api/workspace/delete` — delete file or directory
- `GET /api/workspace/read` — read file contents
- `POST /api/workspace/write` — write file contents
- `GET /api/git/status` — git status of workspace
- `POST /api/git/commit` — stage all + commit with message
- `POST /api/automation/run` — run Playwright crawl on a URL
- `POST /api/intent/preview` — preview pattern-engine expansion of a prompt
- `WS /ws` — main swarm event stream (agent logs, system messages)
- `WS /ws/terminal` — live PowerShell subprocess I/O (proxied through secure Docker sandbox when available)
- **Docker Sandbox Manager (`backend/tools/sandbox_manager.py`)**: Safe isolation gateway wrapping all terminal operations, REST test runs, and QA agent subprocess unittests inside a dedicated container (`nexera-sandbox`), with resilient automatic fallback to local host execution if Docker is absent.

### ✅ Agent Swarm (`backend/graph.py`)
- **CEO Agent** — decomposes the user's goal into numbered steps using the configured LLM
- **Engineer Agent** — generates code per step, stages it in `approval_queue`, waits for CTO sign-off, then writes to `workspace/`
- **QA Agent** — runs `compile()` syntax check + `subprocess` unittest discovery on written files
- **Self-healing retry loop** — up to 3 retries per step before escalating
- **CTO approval gate** — `approval_queue` dict acts as a blocking semaphore; `/api/approvals/submit` clears it immediately (fixes the "banner doesn't go away" bug)

### ✅ LangGraph Autonomous Builder (`bootstrap.py`)
- Full 4-phase state machine: Phase 1 (Backend) → Phase 2 (Desktop) → Phase 3 (Mobile) → Phase 4 (Automation)
- Nodes: `phase_planner`, `agent_node`, `execute_tools_node`, `cto_checkpoint_node`, `finish_node`
- Tools available to agents: `create_file`, `read_file`, `run_shell_command`, `list_directory`, `phase_complete`
- Message pruning (`MSG_LIMIT=14`) to prevent token bloat
- File truncation at `TRUNCATE_LEN=3000` chars
- `MAX_RETRIES=3` cap on all retry loops
- Safety: `is_safe_command()` blocks `rm -rf /`, `format c:`, writes to system dirs
- Safety: `is_safe_path()` constrains all file ops inside project root

### ✅ IDE Frontend (`mobile/src/app/page.tsx`)
Five-pane VS Code Dark+ layout:

| Pane | What It Does |
|------|-------------|
| **Activity Bar** (left, 56px) | 9 icon buttons: Explorer, Search, Git, Run, Extensions, Brain, Viewport, Settings, Agents |
| **Left Sidebar** (288px) | Switches content based on active icon: file tree, git status, extensions, personalization, agent provider cards |
| **Center Editor** | Multi-tab file editor, Welcome dashboard, inline CTO approval diff bar |
| **Right Swarm Chat** | Color-coded agent log stream, expandable reasoning cards, chat input |
| **Bottom Panel** | Dual-tab: System Swarm Logs + live PowerShell terminal |

Key features:
- **Monaco Editor Integration** (v1.6.0): Fully integrated high-fidelity React Monaco Editor featuring automatic language detection, autocomplete, smooth blinking cursor carets, matching bracket highlights, and a global key intercept `Ctrl+S` auto-saver.
- **Agents Panel** (v1.6.0): Three provider cards — Local (Ollama), Gemini, Claude. Click to activate, fill in model/key, Save & Apply.
- **CTO Approval Banner**: Shows inline in editor tab when agent proposes a file write. Accept/Reject buttons. Fixed: banner disappears immediately on click (no more race condition).
- **File Explorer**: Tree view with inline create/delete buttons, real-time refresh after agent writes
- **Git Panel**: Shows staged/unstaged files, commit message input, one-click commit
- **PowerShell Terminal**: Full interactive shell via WebSocket. Arrow-up/down history, Ctrl+C interrupt.
- **Pattern Engine Preview**: Live expansion preview as you type (spell correction + shorthands)
- **Viewport Panel**: pyautogui coordinate click + Playwright browser crawl controls

### ✅ PWA / Mobile (`mobile/public/`)
- `manifest.json` — full PWA manifest, installable on Android/Chrome
- `sw.js` — service worker: cache-first for `_next/static/`, network-first for navigation, skips API/WebSocket
- `offline/page.tsx` — offline fallback page with "Retry Connection" button
- Icons: 192×192, 512×512, 512×512 maskable (cobalt blue #3279F9, white N lettermark)
- Cloudflare tunnel: `cloudflare_tunnel.py` or `launch_tunnel.ps1` expose port 3000 publicly

### ✅ Database (`backend/database.py`)
SQLite via SQLAlchemy 2.0 async:
- `agent_logs` — id, timestamp, agent_name, action, result, phase
- `git_changelogs` — id, timestamp, commit_hash, message, files_changed (JSON)
- `build_state` — phase (PK), status, files_json

### ✅ Pattern Engine (`backend/pattern_engine.py`)
- Typo auto-correction (common dev typos)
- Shorthand expansion (user-defined aliases)
- Analytics: total_prompts, typo_corrections_made, shorthands_applied, characters_processed
- Config stored in `nexera.config.json` under `personalization.aliases`

---

## 5. What Is Partially Built

### ⚠️ Desktop Wrapper (`desktop/`)
`desktop/index.html` is a **79KB standalone HTML file** — it's a working reference design for the VS Code Dark+ theme, NOT an Electron or Tauri app. Phase 2 of the SRS (desktop IDE) was never implemented as a real native wrapper.

**What's needed**: Tauri v2 app that wraps `localhost:3000` with a system tray icon and native window controls.

### ⚠️ Context Window Management
Currently uses a fixed message count (`MSG_LIMIT=14`). The agent does not count actual tokens.

**What's needed**: `tiktoken` token counting + RAG retrieval (ChromaDB + nomic-embed-text via Ollama) to inject only the relevant file chunks rather than full files.

---

## 6. What Is Missing

| Feature | Priority | Notes |
|---------|----------|-------|
| Docker sandbox for agent execution | Critical | ✅ Fully implemented in v1.6.0 |
| Monaco Editor integration | High | ✅ Fully implemented in v1.6.0 |
| API authentication | High | All endpoints are open; no API key or session auth |
| Pydantic request validation | High | All FastAPI endpoints use raw `request.json()` |
| Token cost tracking | Medium | No tiktoken, no per-call cost calculation |
| LSP / IntelliSense | Medium | No language server, no autocomplete |
| Split editor panes | Medium | Only single editor pane |
| Status bar | Low | No git branch / token cost / encoding indicator |
| Dependency graph visualizer | Low | Not implemented |
| Collaborative editing (CRDT/OT) | Future | Multi-user not in scope yet |
| Debugging integration (DAP) | Future | No debugger protocol |

---

## 7. Key Files Reference

| File | Role | Size |
|------|------|------|
| `mobile/src/app/page.tsx` | Entire IDE UI — all state, all panes, all event handlers | ~4100 lines |
| `backend/main.py` | All API routes + WebSocket hubs | ~856 lines |
| `bootstrap.py` | Autonomous 4-phase LangGraph build runner | ~1450 lines |
| `backend/graph.py` | CEO/Engineer/QA agent classes + run_task() | ~399 lines |
| `backend/pattern_engine.py` | Prompt preprocessing, typos, shorthands, analytics | ~150 lines |
| `nexera.config.json` | Runtime config: model, provider, API keys, version history | ~3.3KB |
| `CHANGELOG.md` | Version history — the primary cross-session memory for AI assistants | — |
| `doc/agent_ide_blueprint.md` | Full architecture spec + gap analysis (Mermaid diagrams) | — |

---

## 8. Architecture in One Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  CLIENT LAYER                                                   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Next.js 16 PWA — localhost:3000                        │   │
│  │  page.tsx: 5-pane IDE (Activity | Sidebar | Editor |   │   │
│  │  Swarm Chat | Terminal)                                 │   │
│  └───────────────────────┬─────────────────────────────────┘   │
│                          │ HTTP + WebSocket                     │
└──────────────────────────┼─────────────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────────────┐
│  API GATEWAY — FastAPI :8000                                    │
│                                                                 │
│  REST: /api/start  /api/approvals/*  /api/workspace/*          │
│        /api/git/*  /api/automation/run  /api/config/*          │
│  WS:   /ws (swarm events)   /ws/terminal (PowerShell I/O)     │
└──────────────────────────┬─────────────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────────────┐
│  ORCHESTRATION LAYER — graph.py                                 │
│                                                                 │
│  run_task(goal)                                                 │
│    └→ CEO.execute()     ← decomposes goal into steps           │
│         └→ Engineer.execute()  ← generates code per step      │
│              └→ approval_queue ← BLOCKS until CTO approves     │
│                   └→ QA.execute()  ← compile() + unittest      │
│                        └→ retry loop (max 3)                   │
└──────────────────────────┬─────────────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────────────┐
│  EXECUTION LAYER — tools/                                       │
│                                                                 │
│  file_ops.py    ← read/write files in workspace/               │
│  shell_ops.py   ← run PowerShell/bash commands                 │
│  git_ops.py     ← git init/add/commit/log                      │
│  automation_ops.py  ← pyautogui + Playwright                   │
│  screenshot_tool.py ← desktop capture + OCR                    │
└──────────────────────────┬─────────────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────────────┐
│  INTELLIGENCE LAYER                                             │
│                                                                 │
│  Ollama (local)   → qwen2.5-coder:7b or any local model       │
│  Gemini API       → gemini-2.0-flash / 1.5-pro / 2.0-pro-exp  │
│  Claude API       → claude-opus-4-7 / sonnet-4-6 / haiku-4-5  │
│  pattern_engine   → typo correction + shorthand expansion      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. Known Bugs and Workarounds

### Fixed in v1.6.0
- **CTO approval banner doesn't go away after clicking Approve/Reject**
  - Root cause: `/api/approvals/submit` set `status` but left `pending` set. The frontend's 1500ms polling loop re-fetched and saw `has_pending: true`, re-rendering the banner.
  - Fix: `backend/main.py` line ~360 — `approval_queue["pending"] = None` is now cleared immediately inside the submit endpoint, before the agent polling loop wakes up.
- **No Docker sandbox**
  - Fix: Designed and integrated `DockerSandbox` to securely run all command executions, unittests, and terminal sessions inside isolated container, with automatic local host fallback.
- **Center editor has no syntax highlighting**
  - Fix: Integrated high-fidelity Monaco Editor (`@monaco-editor/react`) with custom syntax highlighting, automatic language selection, and hotkey auto-saving.

### Active Issues
- **No auth on API**: All `/api/` routes are open. Anyone on the same network can call them. Mitigation: only run on `127.0.0.1` (default). Do not expose port 8000 publicly.
- **`desktop/`** is not a real app: `desktop/index.html` is a standalone HTML demo, not an Electron/Tauri wrapper.

---

## 10. Design System

The IDE uses the **VS Code Dark+ / Antigravity** color palette as of v1.6.0:

| Token | Hex | Used For |
|-------|-----|----------|
| `--vsc-bg` | `#1e1e1e` | Main editor background |
| `--vsc-sidebar` | `#252526` | Left sidebar background |
| `--vsc-sidebar2` | `#2d2d30` | Tab bars, panel headers, terminal header |
| `--vsc-titlebar` | `#3c3c3c` | Top titlebar / header |
| `--vsc-activity` | `#333333` | Activity bar (left icon dock) |
| `--vsc-statusbar` | `#007acc` | Status bar accent (not yet built) |
| `--accent-cobalt` | `#3279F9` | Active indicators, glows, buttons |
| `--border` | `#3c3c3c` | Primary borders |
| `--border-subtle` | `#2b2b2b` | Subtle dividers |
| `--text-primary` | `#d4d4d4` | Main text |
| `--text-muted` | `#808080` | Secondary/dim text |
| `--text-active` | `#cccccc` | Panel header labels |

Font: `font-mono` (system monospace stack — Consolas, Courier New).

Tailwind custom scrollbar class `.custom-scrollbar` is defined in `globals.css`.

---

## 11. Roadmap

### v1.7.0 — Security Foundation
- [ ] Add `X-API-Key` header auth to all `/api/` routes
- [ ] Add Pydantic models for all FastAPI request bodies
- [x] Wrap agent execution in Docker (`--memory=512m --cpus=1 --network=none`) (Completed in v1.6.0)

### v1.8.0 — Real Editor
- [x] Replace `<pre>` code display with Monaco Editor React component (Completed in v1.6.0)
- [ ] Wire inline diff view into CTO approval flow (split view: old left, new right)
- [ ] Add status bar (git branch, active model, token cost counter)

### v1.9.0 — Intelligence Upgrade
- [ ] Add `tiktoken` token counting to all LLM calls
- [ ] Add token cost tracking table in SQLite + display in status bar
- [ ] Replace fixed `MSG_LIMIT` with token-aware context window management
- [ ] Add ChromaDB + nomic-embed-text for RAG retrieval over workspace files

### v2.0.0 — Desktop Native
- [ ] Build Tauri v2 wrapper for `desktop/` — replaces the HTML stub
- [ ] System tray icon, native window controls, OS-level file associations
- [ ] Auto-update mechanism
