# Contributing to Nexera OS

Welcome to the **Nexera** developer community! We are excited to build the future of local-first multi-agent systems and OS automation together.

To maintain our standards of **aesthetic, performance, and stability**, please review and adhere to the following development guidelines.

---

## 🎨 Styling & Design Aesthetics

All frontend changes (desktop and mobile) must follow the **Obsidian-Coal Design System**:
1.  **Aesthetic Gradients & Dark Mood**: Use deeply saturated dark backgrounds (`#050811` or HSL equivalents) with subtle, cool-slate text and bright accent indicators.
2.  **Glassmorphism**: Combine rich backdrop blurs with thin border limits.
    *   **Class**: `backdrop-blur-xl bg-[#08090d]/80 border border-[#1b1c24]/50`
3.  **Keyboard Visualizers**: Any interactive hotkeys or UI shortcut references must use the `.keycap` class defined in `globals.css` to render mechanical 3D keycaps.
4.  **Transitions & Micro-Animations**: Buttons and clickable nodes should feature smooth, slow transitions (e.g. `transition-all duration-300 hover:scale-[1.02]`).

---

## 🔒 Code Safety & Sandbox Constraints

To ensure host operating system security, all agents and manual contributions must strictly respect local limits:
*   **Workspace Sandbox**: Swarm file operations must be isolated to the `./workspace` directory. Do not write, modify, or delete any files outside of this path.
*   **Command Sanitization**: Any terminal command runner must pass validation filters to prevent arbitrary remote executions or formatting operations.
*   **Unicode Safety**: Emojis printed to standard output must be wrapped in ASCII-safe exception blocks to prevent execution failures on legacy Windows terminals.

---

## ⚡ Performance Guidelines

*   **Startup Speed**: Backend modules should initialize database engines asynchronously to keep boot time under 5 seconds.
*   **Memory Allocations**: Sandbox allocations for unit tests are capped at **2.0 GB** of RAM. Ensure local LLM contextual windows are aggressively pruned (8192 token limit) to save physical GPU memory.
*   **TypeScript Enforcement**: No `any` types should be committed to active UI pages. Always run type verification checks before committing changes:
    ```bash
    cd mobile
    npx tsc --noEmit
    ```

---

## 🛠️ Merge Request Workflow

1.  **Create an Issue**: Document the feature request or bug report before starting execution.
2.  **Feature Branching**: Name your branch `feature/your-feature-name` or `bugfix/your-bug-name`.
3.  **Local Testing**: Run backend test suites and type checkers.
4.  **Update CHANGELOG.md**: Add a description of your updates in `CHANGELOG.md` under the `[Unreleased]` or target version section.
5.  **Submit MR**: Open a merge request against the main repository.

Thank you for helping us build a stunning and autonomous future!
