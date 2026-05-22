# Changelog

All notable changes to the **Nexera OS** platform will be documented in this file. This project adheres to [Semantic Versioning](https://semver.org/).

---

## [1.4.0] - 2026-05-22
### Added
- **Native Interactive PowerShell Console**: Replaced text buttons and external extension components with a high-fidelity, native-grade PowerShell console shell directly inside both the Next.js client and the Electron wrapper panel.
- **Asynchronous Subprocess Gateway**: Created isolated backend `powershell.exe -NoProfile -ExecutionPolicy Bypass` subprocess instances dynamically spawned for each new WebSocket link on `/ws/terminal`.
- **Robust Character Stream Decoding**: Solved Windows standard stream character exceptions by building asynchronous readers with strict UTF-8 decoding and an ANSI `cp1252` fallback system to eliminate console loop crashes.
- **Interactive Shell Actions**: Wired command history cycling using `ArrowUp`/`ArrowDown`, click auto-focus redirection, and clean session-level interruption resets via `Ctrl+C` or `terminal_reset` packets.
- **Dual-Tab Bottom Panel Redesign**: Created an Obsidian-Coal styled dual-tab switch container dividing legacy System Swarm Logs and the live interactive PowerShell Shell console session.

---

## [1.3.0] - 2026-05-22
### Added
- **Service Worker** (`mobile/public/sw.js`): Full PWA offline support. Strategy: cache-first for static assets (`_next/static/`, icons, fonts), network-first for navigation with offline fallback, API calls and WebSocket connections are always bypassed (never cached).
- **Offline Fallback Page** (`mobile/src/app/offline/page.tsx`): Styled Obsidian-Coal page shown when the user is offline — displays backend/PWA restart instructions and a "Retry Connection" button.
- **SW Registration Component** (`mobile/src/app/sw-register.tsx`): Client component that registers `/sw.js` via `navigator.serviceWorker.register()` on mount. Wired into `layout.tsx` so it activates on every route.

### Status — All SRS Requirements Satisfied
- All 4 phases complete, all non-functional requirements met (offline PWA, installable on mobile, Cloudflare tunnel, real Playwright automation)

---

## [1.2.0] - 2026-05-22
### Added
- **PWA Icons**: Generated `icon-192x192.png`, `icon-512x512.png`, and `icon-maskable-512x512.png` in `mobile/public/` using a pure-Python stdlib PNG writer. Icons use the Nexera cobalt blue (`#3279F9`) background with a white **N** lettermark.
- **PWA Manifest Upgraded**: Updated `mobile/public/manifest.json` with full icon set (192px any, 512px any, 512px maskable), `shortcuts` entry pointing to `/mobile`, and corrected `theme_color: #3279F9`. App is now installable on Android/Chrome.
- **layout.tsx PWA Metadata**: Added `manifest`, `appleWebApp` (black-translucent status bar), and `icons` fields to `mobile/src/app/layout.tsx` for full iOS/Android PWA integration.
- **Cloudflare Tunnel Script**: Created `cloudflare_tunnel.py` — auto-detects `cloudflared` binary, streams the public HTTPS URL to the console, includes install instructions if `cloudflared` is missing. Usage: `python cloudflare_tunnel.py [--port 3000]`.
- **Real Playwright Browser Automation**: Replaced the fake stub in `backend/tools/automation_ops.py` with a real async Playwright implementation using `playwright.async_api`. The `run_playwright_crawl(url)` function now launches headless Chromium, navigates to the URL, extracts visible page text (up to 4000 chars), and returns a base64 PNG screenshot. Smoke-tested successfully against `example.com`.
- **main.py Crawl Await**: Updated `backend/main.py` `/api/automation/run` endpoint to `await run_playwright_crawl()`.

### Status — All 4 Phases Complete
- Phase 1 (Core Backend): DONE — FastAPI, LangGraph swarm, SQLite, tools
- Phase 2 (Desktop IDE — Electron): DONE — wraps Next.js at localhost:3000
- Phase 3 (Mobile CTO Gateway): DONE — PWA installable, manifest complete, Cloudflare tunnel ready
- Phase 4 (OS Automation): DONE — real Playwright (chromium) + pyautogui stubs operational

---

## [1.1.0] - 2026-05-22
### Added
- **Obsidian-Coal Design System**: Re-engineered the UI layout inside the Desktop & Mobile clients with sleek slate graphite gradients, frosted glass panels (`backdrop-blur-xl bg-[#08090d]/80`), and fine-gauge borders (`1px solid #1b1c24/50`).
- **Mac-Style Custom Window Controls**: Integrated premium traffic-light window controls into the header titlebar, replacing legacy Windows borders.
- **Micro-Animations & Visual State Indicators**: Added glowing pulse effects (`pulse-glow`), rotating gradient borders, and reactive hover animations across active sidebars and navigation panels.
- **Physical Keycap Visualizers**: Implemented 3D keycap widgets using custom CSS grid matrices for welcome shortcuts (e.g., `Ctrl` + `P`, `Ctrl` + `Shift` + `F`).
- **Personalization Engine UI & Aliases**: Dedicated Sidebar section for custom user shorthands, spell auto-heals, and live typing expansion testing.
- **Viewport Remote Automation**: Created desktop coordinate clicks, keyboard typing, and Playwright browser crawler controls.

### Changed
- **Unified Nexera Branding**: Renamed all active files, documentation mentions, title headers, and UI branding labels from legacy "Antigravity" to "Nexera".
- **Enhanced Swarm Logs & Chat Bubbles**: Overhauled chat panels with semi-transparent frosted cards — cobalt-indigo for User and space-obsidian for Assistant. Included clean nested folding summaries for backend agent execution trees.
- **Terminal Console Portability**: Patched CLI pipelines to gracefully handle `UnicodeEncodeError` exceptions under legacy Windows shell environments by mapping unsupported emojis to ASCII characters.

---

## [1.0.0] - 2026-05-15
### Added
- **FastAPI Daemon Core**: Asynchronous task scheduling loops, background process supervision, and active socket streams on `http://127.0.0.1:8000`.
- **LangGraph Swarm Nodes**: Set up localized orchestration cycles with specialized AI personas (CEO Planner, Engineer Coder, QA Tester).
- **SQLite Database Persistence**: Database tables for permanent logs (`agent_logs`, `git_changelogs`, `build_state`).
- **Tauri Desktop Shell scaffold**: Desktop wrapper and system tray binding.
- **Next.js PWA Client**: Mobile Progressive Web App with support for offline service workers.

---

[1.4.0]: https://github.com/nexera-os/nexera/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/nexera-os/nexera/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/nexera-os/nexera/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/nexera-os/nexera/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/nexera-os/nexera/releases/tag/v1.0.0
