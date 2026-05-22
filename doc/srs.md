# SOFTWARE REQUIREMENTS SPECIFICATION (SRS)

**Project Name:** Nexera Automation OS
**Version:** 1.2.0
**Status:** Active — Premium IDE Phase

---

## 1. System Overview

Nexera is an autonomous, local-first developer platform and OS-level controller. It runs continuously as a background daemon, executing software development tasks, managing continuous documentation, and automating host OS actions. It features a dynamic desktop IDE and a remote Mobile CTO Gateway for human-in-the-loop (HITL) approval.

---

## 2. Target Operating Environment & Constraints

The system runs on a Windows host. The AI agent must strictly adhere to the following hardware constraints during its self-building and operational phases:

- **Processor:** 13th Gen Intel Core i7-13650HX (14 cores)
- **System RAM:** 16.0 GB (Max allocation for Docker/Execution sandboxes is **2.0 GB**)
- **GPU:** NVIDIA GeForce RTX 4060 (8 GB VRAM)
- **Local LLM Engine:** Ollama running `qwen2.5-coder:7b-instruct-q4_K_M` (8192 token context window)
- **Multimodal Fallback:** Gemini 1.5 Pro/Flash API (for vision and complex web research)

---

## 3. Technology Stack Requirements

The bootstrap agent must build the system using the following stack:

- **Agent Orchestration:** Python 3.11+, FastAPI, LangGraph, LangChain
- **State & Memory:** Local SQLite (for changelogs) and Redis (for fast graph state)
- **Desktop Interface:** Tauri (Rust backend) + Next.js (React/TypeScript) frontend
- **Mobile Interface:** Next.js Progressive Web App (PWA) exposed via Cloudflare Tunnels

---

## 4. Architecture Implementation Phases

### Phase 1: The Core Backend (FastAPI & LangGraph)

Build the following files in `backend/`:

1. **`requirements.txt`** — Python dependencies for the backend
2. **`database.py`** — SQLite database with tables for agent_logs, git_changelogs, build_state
3. **`redis_state.py`** — Redis connection manager with SQLite fallback
4. **`tools/file_ops.py`** — File CRUD tools for swarm agents
5. **`tools/shell_ops.py`** — Sandboxed shell command execution
6. **`tools/git_ops.py`** — Git init, add, commit, log operations
7. **`websocket_manager.py`** — WebSocket manager for real-time log streaming
8. **`graph.py`** — LangGraph Swarm with CEO, Engineer, and QA Tester agents
9. **`main.py`** — FastAPI entrypoint with WebSocket and REST endpoints

**Verify:** `pip install -r requirements.txt && python main.py` must start on port 8000.

### Phase 2: The Desktop IDE (Tauri + Next.js)

Build in `desktop/` and `mobile/`:

1. Scaffold a Tauri application.
2. Build 3-pane UI: File Tree (left), Code Preview (center), Agent Terminal (bottom).
3. Connect to FastAPI WebSocket at `ws://localhost:8000/ws`.
4. Dark theme: Obsidian-Coal design system (`#050811` background, electric cobalt accents, frosted glass panes, mechanical `.keycap` widgets).
5. **Promptless Workspace Explorer**: 
   * A premium VS Code-style promptless explorer tree replacing basic dialog prompts with beautiful inline glassmorphic cards.
   * Auto-focusing text fields for creation of files and folders inside nested folders.
   * Fine-grain SVG operations bar (New File, New Folder, Refresh, Collapse All) aligned to top-dock with electric cobalt hover highlights.
   * Context-aware path resolution targeting selected nodes, active highlighted folders, or root dynamically.
   * Stable React key reconciliation based on node path strings to preserve folder expansion/collapse states during tree renders.
   * Global hotkeys: `Ctrl + N` (New File card), `Ctrl + Shift + N` (New Folder card), `F5` (Refresh Explorer), `Delete` (Delete selected file/folder), and `Escape` (Cancel selection or close active creation input card).

**Verify:** `npm run tauri dev` or `npm run dev` must open the window and render the high-fidelity promptless explorer interface.

### Phase 3: The Mobile CTO Gateway (Next.js PWA)

Build in `mobile/`:

1. Mobile-optimized review queue for pending deployments
2. Approve/Reject buttons triggering LangGraph interrupt resumption
3. PWA manifest for mobile installation
4. Cloudflare Tunnel launch script

**Verify:** `npm run dev` must serve the PWA on port 3001.

### Phase 4: OS Automation Integration

Build in `automation/`:

1. pyautogui tools for mouse/keyboard control
2. playwright tools for browser automation
3. CTO approval gate before any OS-level action
4. Screenshot capture for visual verification

**Verify:** Agents can open Notepad, type text, and screenshot.

---

## 5. Security & State Management

- Graceful state persistence to SQLite on shutdown (SIGTERM/SIGINT)
- Strict sandbox isolation — no writes outside project root
- Command blocklist validation before shell execution
- Cloudflare Tunnel (HTTPS) for mobile gateway — no raw port exposure
- Path traversal prevention via resolve + validation

---

## 6. Non-Functional Requirements

- Backend startup: under 5 seconds
- WebSocket latency: under 100ms
- RAM budget: under 4GB for Python processes
- Context management: respect 8192 token window with pruning
- Self-healing: up to 3 retries before CTO escalation
