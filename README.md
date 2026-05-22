# 🌌 Nexera OS

> **The Autonomous, Local-First Developer Platform & OS Automation Swarm**

Nexera is a state-of-the-art autonomous developer workspace and system controller designed to run local-first, privacy-respecting multi-agent swarm workflows directly on your machine. Leveraging lightweight local LLMs, FastAPI, LangGraph, and a high-fidelity desktop environment, Nexera streamlines code generation, automation, and OS automation with high elegance and safety.

---

## ✨ Design Philosophy

Nexera features the **Obsidian-Coal Design System**—a stunning visual environment inspired by dark mode premium IDEs:
*   **Vibrant Glassmorphism:** Frosted glass panels (`backdrop-blur-xl bg-[#08090d]/80`) with fine-gauge boundaries (`1px solid #1b1c24/50`).
*   **Aesthetic Gradients:** Harmony of cosmic slate, deep coal graphite, and cobalt-indigo accent glow.
*   **Physical Micro-Widgets:** Distinct 3D mechanical keycaps for welcome layouts, and fluid status indicators.
*   **Integrated Remote Viewport:** Direct desktop viewport automation via PyAutoGUI and Playwright with live OCR.

---

## 🛠️ Architecture Stack

```mermaid
graph TD
    User([Developer User]) -->|Voice / Text / Vision| UI[Next.js PWA Client]
    UI -->|WebSockets / JSON| Core[FastAPI Backend Core]
    Core -->|Local Port 11434| Ollama[Ollama Local Engine]
    Ollama -->|Inference| Model[qwen2.5-coder:7b]
    
    subgraph Swarm Core (graph.py)
        CEO[CEO Planner] -->|Task Breakdown| Eng[Engineer Coder]
        Eng -->|Executes Code / Files| QA[QA Tester]
        QA -->|Self-Healing Loop| Eng
    end
    
    Core --> Swarm Core
    Core -->|pyautogui| Screen[Desktop Capture & OCR]
    Core -->|pattern_engine| Personalization[Intent Expansion & Spell Auto-Heal]
```

For a comprehensive review, see [Technical Architecture](file:///d:/Nexera/doc/architecture.md).

---

## 📂 Project Directory Structure

```
Nexera/
├── 📁 backend/             # FastAPI & LangGraph multi-agent swarm services
│   ├── 📁 tools/           # File, shell, git, and automation tools
│   ├── database.py         # SQLite storage engines
│   └── main.py             # HTTP & WS broadcast gateways
├── 📁 doc/                 # Technical documentation & user guides
│   ├── architecture.md     # System architecture layout
│   ├── srs.md              # Software Requirements Specification
│   ├── testing_report.md   # Quality metrics & QA analysis
│   ├── user_guide.md       # Step-by-step user onboarding guide
│   ├── CHANGELOG.md        # Modern version logs & milestone metrics
│   └── CLAUDE.md           # Developer CLI dev playbook & styles guide
├── 📁 desktop/             # Electron standalone borderless client wrapper
├── 📁 mobile/              # Progressive Next.js PWA developer frontend
├── 📁 workspace/           # Dedicated sandbox directory for generated code
└── requirements.txt        # Python backend package dependencies
```

---

## 📖 Available Documentation

*   **[User Operations Guide](file:///d:/Nexera/doc/user_guide.md)**: Onboarding commands, keyboard visualizer mappings, and shorthand custom setup.
*   **[Technical Architecture Specification](file:///d:/Nexera/doc/architecture.md)**: WebSockets protocol design, FastAPI REST API schemas, and SQLite database layouts.
*   **[Software Requirements Specification (SRS)](file:///d:/Nexera/doc/srs.md)**: Target hardware allocations, strict RAM profiles (2.0 GB limits), and roadmap phases.
*   **[Quality Assurance & Testing Report](file:///d:/Nexera/doc/testing_report.md)**: AST parsing performance checks, compiler self-healing metrics, and local LLM Elo ratings.
*   **[Developer Playbook (CLAUDE.md)](file:///d:/Nexera/doc/CLAUDE.md)**: Quick-reference dev CLI triggers, tests discovery, and premium style tokens.
*   **[Release Changelog](file:///d:/Nexera/doc/CHANGELOG.md)**: Complete list of milestones, layout updates, and design increments.

---

## 🌐 Git Repository & Environment Configuration

Nexera is version-controlled and hosted on GitHub. If you are developing on a Windows host or within a container environment, ensure your Git credentials and environment directory permissions are properly aligned.

### Remote Repository Sync
To check the current remote and pull or push changes to the central repository:
*   **Repository URL**: `https://github.com/shadman1996/Nexera-Dev.git`
*   **Branch**: `master`

### Windows Git Ownership Exception
On Windows, NTFS partition mounts and symlinked system files might throw a `dubious ownership` exception. Register the workspace as a safe Git directory globally to resolve this:
```bash
git config --global --add safe.directory D:/Nexera
```

### Git CLI Operations
Sync the latest updates to GitHub:
```bash
# Add new/modified files
git add .

# Commit changes
git commit -m "feat: <change-description>"

# Push to main stream
git push origin master
```

---

## ⚡ Quick Start

### 1. Requirements & Core Setup
Make sure you have [Ollama](https://ollama.com) installed and the target model downloaded:
```bash
ollama pull qwen2.5-coder:7b-instruct-q4_K_M
```

Install backend dependencies:
```bash
pip install -r requirements.txt
```

### 2. Booting the Ecosystem
Launch the three primary modules in separate terminals or processes:

*   **FastAPI Backend Core**:
    ```bash
    python -m backend.main
    ```
    *Runs on `http://127.0.0.1:8000`*

*   **Next.js PWA Front-end**:
    ```bash
    cd mobile
    npm run dev
    ```
    *Runs on `http://localhost:3000`*

*   **Nexera Desktop IDE (Electron)**:
    ```bash
    cd desktop
    npm install
    npm start
    ```
    *Launches native borderless dashboard*

---

## 📜 License
Distributed under the MIT License. See [LICENSE](file:///d:/Nexera/LICENSE) for details.
