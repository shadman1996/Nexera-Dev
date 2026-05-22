# Nexera OS: End-User Operations Guide

Welcome to the **Nexera Developer Ecosystem**. This user guide details installation requirements, startup instructions, client interfaces, vocal portal controls, custom layouts, and automated desktop vision synchronization.

---

## 1. Quick Startup Commands

### Step 1: Boot the FastAPI Core Backend
Navigate to the root directory of your Nexera workspace and launch the FastAPI server:
```powershell
python -m backend.main
```
The console will boot Uvicorn on `http://127.0.0.1:8000` with WebSocket connections accepted.

### Step 2: Start the Next.js PWA Server
Navigate to the `mobile/` directory and spin up the premium Next.js frontend dev server:
```powershell
cd mobile
npm run dev
```
The Next.js server will run on `http://localhost:3000`.

### Step 3: Launch the Standalone Nexera Desktop IDE
In a new terminal window, navigate to the `desktop/` directory and start Electron:
```powershell
cd desktop
npm install
npm start
```
A native, borderless developer window (styled as the **Nexera Desktop IDE**) will boot up automatically!

---

## 2. Multi-Pane Custom Navigation

The **Nexera Desktop IDE** interface features a premium 5-pane responsive layout that can be toggled via the Top Right controls:

1. **Left Activity Dock (Ribbon Bar)**: Clicking icons toggles the Sub-Sidebar drawer panels:
   - 📁 **Explorer Drawer**: View recursive file tree with stable state-preserving path keying and high-fidelity file/folder interactions:
     *   **Operations Toolbar**: Features beautiful custom vector SVG buttons inside the drawer header for **New File**, **New Folder**, **Refresh**, and **Collapse All**.
     *   **Promptless Creation**: Clicking file or folder icons triggers a premium, glassmorphic inline input text card immediately focusing text inputs recursively under active pathways. Hitting `Enter` saves, and `Escape` or blurring cancels.
     *   **Context Parent Resolution**: Resolves target directory context intelligently: items are generated inside selected directories, parent directories of highlighted files, or workspace roots by default.
     *   **IDE Key Mappings**: Press `Ctrl + N` for New File, `Ctrl + Shift + N` for New Folder, `F5` to Refresh workspace lists, `Delete` to remove highlighted items, and `Escape` to reset explorer highlight overlays.
   - 🔍 **Search Drawer**: Search for strings across all files, showing matching line locations.
   - 🌿 **Git Source Control Drawer**: View uncommitted changes, type messages, and commit staged files.
   - 🧩 **Extensions Drawer**: Toggle integrated local modules (e.g. Ollama, Gemini, Playwright, AST debugger).
   - 🧠 **Personalization Drawer**: Manage typo auto-heals, view alias shorthand dictionary, test real-time intent previews.
   - 🖥️ **OS Viewport Panel**: Coordinates visual remote clicks, keyboard type sequences, and Playwright browsers.
   - ⚙️ **Settings Hub**: Configure target hardware limits (GPU VRAM, CPU Cores, RAM) and API keys.

2. **Top-Right Layout Toggles**:
   - 📄 **Split Editor**: Opens a two-column vertical layout for side-by-side editing.
   - 🧱 **Sidebar Toggle**: Collapse/expand the primary sub-sidebar panel.
   - 📺 **Terminal Toggle**: Toggle the bottom stdout terminal logs panel.
   - 💬 **Right Chat Toggle**: Hide/show the Swarm Chat right-side drawer.

---

## 3. Shorthand Intent Expansion & Spell Auto-Heal

The platform adapts in real-time to your casual typing patterns:
- **Typo Auto-Heal**: Small typos (like `mkae`, `pattarn`, `chnage`, `db`) are automatically corrected before being fed to LLMs.
- **Shorthand Expanders**: Short words (like `api`, `ui`, `test`, `doc`) expand into rich architectural tasks dynamically.
- **Intent Tester**: Go to the **Personalization tab (Brain icon)** in the sidebar, type a casual message in the Expander box, and check the corrected prompt live!

---

## 4. Desktop Viewport Remote Automation

Control and crawl automated headless browser frameworks inside the **OS Viewport Panel**:
1. Click **Sync Screen** to capture visual monitor frames on the backend.
2. Select action type: **Mouse Click** (enter coordinates X, Y), **Keyboard Typing** (write characters), or **Playwright Headless Crawling** (enter browse URL).
3. Click **Trigger Action** to execute simulations instantly. Output OCR text prints live in the log card.
