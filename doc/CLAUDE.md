# CLAUDE.md — Nexera Developer Playbook

This document serves as the operational guide for active developer agents (including Claude and Antigravity) and contributors. It details building, testing, linting, styling standards, and workspace command procedures.

---

## 🛠️ Development & Build Commands

Always run build commands from the root directory or targeted subdirectories as specified.

### Frontend Client (Next.js PWA)
- **Local Dev Server**: `npm run dev` inside `mobile/`
- **Build Client**: `npm run build` inside `mobile/`
- **Type Checking**: `npx tsc --noEmit` inside `mobile/`

### Backend Server (FastAPI Core)
- **Local Dev Server**: `python -m backend.main`
- **Install Dependencies**: `pip install -r requirements.txt` inside root

---

## 🧪 Testing Guidelines

Run tests to verify backend logic, configuration pipelines, and database adapters.

- **Run All Python Tests**: 
  ```bash
  python -m unittest discover -s workspace -p "test_*.py"
  ```
- **Run Specific Test Module**:
  ```bash
  python -m unittest workspace.test_backend
  ```
- **Test Sandbox Memory Budget**: **2.0 GB** of RAM max allocation limit for Docker/Execution test loops.

---

## 🎨 Obsidian-Coal Design System & Styling Rules

All UI additions in desktop or mobile views must comply with the premium visual aesthetics of the **Obsidian-Coal Design System**.

1. **Dark Base Gradients**: Use HSL slate-graphite dark modes (backgrounds `#050811` or `#08090d`).
2. **Tactile Glassmorphism**: Frosted layouts must use deep blurs with ultra-fine bordering.
   * **CSS Classes**: `backdrop-blur-xl bg-[#08090d]/80 border border-[#1b1c24]/50`
3. **Electric Cobalt Accents**: Highlight active state indicators, hover controls, and selections using rich electric blue/cobalt gradients:
   * **Primary Accent Color**: `#00D8FF` or `#3b82f6` (gradient to indigo `#8B5CF6`)
4. **Mechanical 3D Keycaps**: Documented hotkeys must utilize the custom `.keycap` widget style for beautiful mechanical keyboard representations.
5. **No Native Prompts**: Modal browser prompts (like `window.prompt`) are strictly forbidden. All operations must use beautiful inline glassmorphic forms with automatic parent focus triggers.

---

## 🔒 Execution & Security Sandbox Constraints

- **Workspace Boundaries**: All Swarm agent file writes and operations must be constrained inside the `./workspace` directory. Any out-of-bounds writes must fail path traversal validations.
- **Unicode Resilience**: Emojis and unicode characters sent to console output logs must be wrapped in ASCII-safe exception blocks to prevent execution halts on legacy Windows shell host terminals.
