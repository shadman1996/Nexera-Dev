"use client";

import React, { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";

const getLanguageFromPath = (path: string | null): string => {
  if (!path) return "plaintext";
  const ext = path.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "py": return "python";
    case "tsx": return "typescript";
    case "ts": return "typescript";
    case "jsx": return "javascript";
    case "js": return "javascript";
    case "json": return "json";
    case "md": return "markdown";
    case "css": return "css";
    case "html": return "html";
    case "sh": return "shell";
    case "ps1": return "powershell";
    default: return "plaintext";
  }
};


interface LogMessage {
  type: string;
  agent?: string;
  role?: string;
  message: string;
}

interface PendingApproval {
  filepath: string;
  content: string;
}

interface FileNode {
  name: string;
  path: string;
  is_dir: boolean;
  size?: number;
  children?: FileNode[];
}

interface ExtensionItem {
  id: string;
  name: string;
  description: string;
  publisher: string;
  installed: boolean;
  enabled: boolean;
  version: string;
}

const agentsList = [
  {
    id: "ollama",
    name: "Local Qwen Agent",
    provider: "Ollama Local Engine",
    model: "qwen2.5-coder:7b",
    latency: "< 50ms (Ultra-Low)",
    context: "8K Context",
    offline: true,
    desc: "Offline-first development core. Fully sandboxed and direct workspace code compilation.",
    color: "#00d8ff",
    badge: "Local",
  },
  {
    id: "gemini",
    name: "Gemini Agent",
    provider: "Google Gemini Cloud",
    model: "gemini-1.5-flash",
    latency: "~1.2s (High-Speed)",
    context: "1M Context",
    offline: false,
    desc: "Massive context expansion, dynamic intent scaling, and rapid token synthesis.",
    color: "#3279F9",
    badge: "Cloud API",
  },
  {
    id: "anthropic",
    name: "Claude Agent",
    provider: "Anthropic Claude API",
    model: "claude-3-5-sonnet",
    latency: "~2.5s (Deep Reasoning)",
    context: "200K Context",
    offline: false,
    desc: "Sophisticated coding swarms, precise structural compliance, and advanced system planning.",
    color: "#f48771",
    badge: "Reasoning",
  },
  {
    id: "openai",
    name: "OpenAI GPT Agent",
    provider: "OpenAI Endpoint",
    model: "gpt-4o",
    latency: "~1.8s (Balanced)",
    context: "128K Context",
    offline: false,
    desc: "Structured schema generation, function calling routines, and balanced logic tasks.",
    color: "#10a37f",
    badge: "Balanced",
  }
];

export default function NexeraDesktopIDE() {
  const [activePanel, setActivePanel] = useState<"explorer" | "search" | "git" | "run" | "extensions" | "brain" | "viewport" | "settings" | "agents">("explorer");
  const [activeTask, setActiveTask] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [wsStatus, setWsStatus] = useState("disconnected");
  const [sandboxMode, setSandboxMode] = useState<"docker" | "host" | "unknown">("unknown");

  // Self-Testing & Diagnostic Dashboard States
  const [testRunning, setTestRunning] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const [activeTestTab, setActiveTestTab] = useState<"all" | "passed" | "failed">("all");
  const [isHealing, setIsHealing] = useState(false);

  // Layout Panel States matching the top right controls in screenshot!
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isTerminalOpen, setIsTerminalOpen] = useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);

  // Top Bar Dropdowns
  const [openMenuDropdown, setOpenMenuDropdown] = useState<string | null>(null);

  // Chat message thread simulating the exact dialogue in screenshot!
  const [chatMessages, setChatMessages] = useState<any[]>([
    {
      id: "msg-1",
      role: "user",
      content: "it should have all the functions like antigravity"
    },
    {
      id: "msg-2",
      role: "assistant",
      content: "frequently that you would like pre-configured?\n\n2. **Layout Preferences**: The layout aligns 100% with the standard Antigravity/VS Code look shown in your screenshot. If you have any additional custom aesthetics or neon glow colors you want integrated, let me know!",
      hasArtifact: true,
      artifactTitle: "Implementation Plan",
      artifactSummary: "This implementation plan details the full conversion of Nexera OS into a complete Antigravity IDE clone with left activity..."
    },
    {
      id: "msg-3",
      role: "user",
      content: "exact same"
    },
    {
      id: "msg-4",
      role: "assistant",
      isExecutionTrace: true
    }
  ]);
  
  // Workspace File Tree & Open Editor Tabs
  const [workspaceTree, setWorkspaceTree] = useState<FileNode[]>([]);
  const [openTabs, setOpenTabs] = useState<string[]>([
    "Implementation Plan",
    "page.tsx",
    "main.py",
    "automation_ops.py",
    "pattern_engine.py",
    "git_ops.py",
    "shell_ops.py",
    "file_ops.py"
  ]);
  const [activeTab, setActiveTab] = useState<string | null>("Implementation Plan");
  
  const [fileContents, setFileContents] = useState<{ [path: string]: string }>({
    "Implementation Plan": `# Antigravity IDE - Implementation Plan

* Remove start/end \`"""\` characters to make it directly active.

[MODIFY] shell_ops.py [UNWRAP]
* Remove start/end \`"""\` characters to make it directly active.

[MODIFY] git_ops.py [UNWRAP]
* Remove start/end \`"""\` characters and add \`from backend.tools.shell_ops import run_command\` to make it executable.

Dual-Interface Next.js Client

[MODIFY] page.tsx
* Reorganize screen to use a modular 5-pane dashboard: Left Activity Dock (ribbon), Secondary Sub-Sidebar drawers, Center Editor/Welcome Portal, Right Swarm Chat, Bottom Terminal console, and bottom Status Bar.
* Build sub-sidebar drawer components:
  - Explorer Drawer: File tree with inline recursive creation buttons.
  - Search Drawer: Query box displaying matching line locations in workspace files.
  - Source Control Drawer: Real-time git status, list of modified files, and direct commit inputs.
  - Extensions Drawer: Preset modules list with status tags (Ollama, Gemini, Playwright) and toggles.
  - Personalization Drawer: Spell self heals list, alias dictionary management, style analytics, and live intent expansion preview box.
  - Settings Drawer: Hardware presets and swarm dials.
* Build welcome backdrop with active buttons and Ctrl + L keyboard binding to immediately focus chat panel input.
* Wire API calls to newly configured routes for Git status, OS automation simulations, and intent previews.

3. Verification Plan

Automated & Manual Testing

1. Adaptive Query Testing: Type shorthand prompt akae api for db in the Right Swarm chat drawer, click execute, and verify that:
  * The Bottom terminal prints a styled Style Adaptation Active expansion block.
  * The Swarm starts executing the complete, detailed expanded plan.
2. Interactive Git Commit check: Edit a workspace file, check the Source Control Panel in the sub-sidebar to verify the file is listed as modified, type a commit message, and hit commit, checking local git logs to verify persistence.
3. OS Simulator verification: Open the Viewport Panel, type click coordinates, and trigger run command, verifying execution outputs.
4. Layout Verification: Compare the newly created web interface side-by-side with the Antigravity IDE screenshot to verify exact positioning, color harmonies, status bars, and glassmorphic designs.`,
    "page.tsx": `// Antigravity IDE Frontend Page Compiler...`,
    "main.py": `# Antigravity Core Gateway Server...`
  });
  
  const [unsavedChanges, setUnsavedChanges] = useState<{ [path: string]: boolean }>({});

  // Native Explorer Inline Operations States
  const [selectedNode, setSelectedNode] = useState<{ path: string; isDir: boolean } | null>(null);
  const [inlineCreate, setInlineCreate] = useState<{ parentPath: string; isDir: boolean } | null>(null);
  const [inlineCreateName, setInlineCreateName] = useState("");
  const [collapsedAllTrigger, setCollapsedAllTrigger] = useState(0);

  // Terminal Panel Tabs & Shell States
  const [activeConsoleTab, setActiveConsoleTab] = useState<"system" | "output" | "debug" | "powershell" | "ports">("system");
  const [terminalBuffer, setTerminalBuffer] = useState("");
  const [terminalInput, setTerminalInput] = useState("");
  const [terminalHistory, setTerminalHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const runSelfTests = async () => {
    if (testRunning) return;
    setTestRunning(true);
    setTestResults(null);
    addLog({ type: "system", message: "🚀 [Self-Tester]: Running multi-faceted system diagnostics..." });
    
    try {
      const res = await fetch("http://127.0.0.1:8000/api/test/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();
      setTestResults(data);
      if (data.success) {
        addLog({ type: "success", message: "✨ [Self-Tester]: All tests and scans completed with 100% success!" });
      } else {
        addLog({ type: "error", message: `❌ [Self-Tester]: Self-tests failed. Passed ${data.tests?.passed || 0}/${data.tests?.total || 0} unit tests.` });
      }
    } catch (err: any) {
      addLog({ type: "error", message: `❌ [Self-Tester]: Failed calling test endpoints: ${err.message}` });
    } finally {
      setTestRunning(false);
    }
  };

  const autoHealCodebase = async () => {
    if (isHealing || isExecuting) return;
    if (!testResults || testResults.success) {
      addLog({ type: "system", message: "💡 [Swarm Swifter]: No test failures detected. Auto-healing is not required!" });
      return;
    }
    
    setIsHealing(true);
    addLog({ type: "system", message: "🪄 [Swarm Swifter]: Initializing swarm self-healing routines to repair test suite..." });
    
    // Gather failed test names and details
    const failures = testResults.tests?.tests?.filter((t: any) => t.status !== "passed") || [];
    const failureContext = failures.map((f: any) => `Test Name: ${f.name}\nTraceback: ${f.message}`).join("\n\n");
    
    const healPrompt = `Auto-heal failing unit tests in workspace:\n${failureContext}\nAnalyze the failures, identify the buggy files, rewrite/fix the bugs, run tests, and restore green status.`;
    
    try {
      setIsExecuting(true);
      const response = await fetch("http://127.0.0.1:8000/api/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: healPrompt }),
      });
      if (response.ok) {
        addLog({ type: "system", message: "🚀 Swarm Auto-Healing loop initiated. Check Swarm Chat for updates!" });
      } else {
        addLog({ type: "error", message: "❌ Failed starting swarm healing process." });
      }
    } catch (err: any) {
      addLog({ type: "error", message: `❌ Error initiating swarm: ${err.message}` });
    } finally {
      setIsHealing(false);
      setIsExecuting(false);
    }
  };

  const startInlineCreate = (isDir: boolean) => {
    let parentPath = "";
    if (selectedNode) {
      if (selectedNode.isDir) {
        parentPath = selectedNode.path;
      } else {
        const parts = selectedNode.path.split("/");
        parts.pop();
        parentPath = parts.join("/");
      }
    }
    setInlineCreate({ parentPath, isDir });
    setInlineCreateName("");
  };

  // Keyboard listener for explorer navigation/deletion
  useEffect(() => {
    const handleExplorerKeys = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
        return;
      }
      if (selectedNode) {
        if (e.key === "Delete") {
          e.preventDefault();
          handleDeleteItem(selectedNode.path);
        } else if (e.key === "Escape") {
          e.preventDefault();
          setSelectedNode(null);
        }
      }
    };
    window.addEventListener("keydown", handleExplorerKeys);
    return () => window.removeEventListener("keydown", handleExplorerKeys);
  }, [selectedNode]);

  // Dynamic Workspace Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ file: string; line: number; content: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Dynamic Git Source Control
  const [gitStatus, setGitStatus] = useState({
    branch: "main",
    modified_files: [] as { file: string; status: string }[],
    recent_commits: [] as { commit_hash: string; author: string; message: string }[],
    is_dirty: false
  });
  const [commitMessage, setCommitMessage] = useState("");
  const [isCommitting, setIsCommitting] = useState(false);

  // Swarm States
  const [agentStates, setAgentStates] = useState({
    CEO: { status: "Idle", task: "Awaiting workspace command..." },
    Engineer: { status: "Idle", task: "Ready to draft scripts." },
    QA: { status: "Idle", task: "Ready to run tests." }
  });

  // Expandable Swarm Chat Log Cards (Antigravity Expandable DX style)
  const [expandedCards, setExpandedCards] = useState<{ [key: string]: boolean }>({});

  // CTO Approval Queue States
  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null);
  const [revisionNotes, setRevisionNotes] = useState("");
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);

  // Hardware & Model Configuration States
  const [configProvider, setConfigProvider] = useState("ollama");
  const [configModelName, setConfigModelName] = useState("qwen2.5-coder:7b-instruct-q4_K_M");
  const [configTemp, setConfigTemp] = useState(0.1);
  const [configMaxTokens, setConfigMaxTokens] = useState(8192);
  const [configBaseUrl, setConfigBaseUrl] = useState("http://127.0.0.1:11434");
  const [configCpu, setConfigCpu] = useState("");
  const [configCpuCores, setConfigCpuCores] = useState(4);
  const [configRam, setConfigRam] = useState(8);
  const [configGpu, setConfigGpu] = useState("");
  const [configVram, setConfigVram] = useState(4);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [configGeminiKey, setConfigGeminiKey] = useState("");
  const [configOpenaiKey, setConfigOpenaiKey] = useState("");
  const [configAnthropicKey, setConfigAnthropicKey] = useState("");
  const [configVersion, setConfigVersion] = useState(1);
  const [configHistory, setConfigHistory] = useState<any[]>([]);

  // Personalization Swarm / Brain States
  const [personalization, setPersonalization] = useState({
    shorthands: {} as { [key: string]: string },
    analytics: {
      total_prompts: 0,
      typo_corrections_made: 0,
      shorthands_applied: 0,
      total_characters_processed: 0,
      adaptation_level: "High",
      user_tone_perception: "Brief & Shorthand"
    }
  });
  const [shorthandTrigger, setShorthandTrigger] = useState("");
  const [shorthandExpansion, setShorthandExpansion] = useState("");
  const [previewInput, setPreviewInput] = useState("");
  const [previewOutput, setPreviewOutput] = useState<any>(null);

  // OS Desktop Automation / Viewport States
  const [automationAction, setAutomationAction] = useState<"click" | "type" | "crawl">("click");
  const [automationX, setAutomationX] = useState(100);
  const [automationY, setAutomationY] = useState(200);
  const [automationText, setAutomationText] = useState("");
  const [automationUrl, setAutomationUrl] = useState("http://127.0.0.1:3000");
  const [screenshotData, setScreenshotData] = useState("");
  const [ocrText, setOcrText] = useState("");
  const [isCapturing, setIsCapturing] = useState(false);
  const [isAutomationRunning, setIsAutomationRunning] = useState(false);

  // Extensions list matching screenshot exactly!
  const [extensions, setExtensions] = useState<ExtensionItem[]>([
    { id: "clangd", name: "clangd", description: "C/C++ completion, formatting, and diagnostics.", publisher: "LLVM", installed: true, enabled: true, version: "0.2.1" },
    { id: "go", name: "Go", description: "Rich Go language support for Antigravity Swarm.", publisher: "golang", installed: true, enabled: true, version: "0.41.0" },
    { id: "pyrefly", name: "Pyrefly - Python", description: "Python autocomplete, diagnostic highlights and linting.", publisher: "meta", installed: true, enabled: true, version: "1.10.4" },
    { id: "python", name: "Python", description: "Python language support and AST compiler solvers.", publisher: "ms-python", installed: true, enabled: true, version: "2026.4.1" },
    { id: "python-debugger", name: "Python Debugger", description: "Standard interactive debugger configurations.", publisher: "ms-python", installed: true, enabled: true, version: "2026.2.0" },
    { id: "python-env", name: "Python Environment", description: "Provides a unified python runtime sandbox.", publisher: "ms-python", installed: true, enabled: true, version: "1.2.0" },
    { id: "ruby-lsp", name: "Ruby LSP", description: "Ruby syntax highlights and swarming helper hooks.", publisher: "Shopify", installed: true, enabled: false, version: "0.7.2" },
  ]);

  // Voice & Speech Portals
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  // Conversation history sessions — persisted in SQLite via /api/conversations
  interface ConvSession { id: string; title: string; messages: any[]; ts: number; project: string; }
  const [convSessions, setConvSessions] = useState<ConvSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("default");
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [projectName, setProjectName] = useState<string>("default");

  const fetchConversations = async (proj = projectName) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/conversations?project=${encodeURIComponent(proj)}`);
      if (res.ok) {
        const data = await res.json();
        setConvSessions(data.map((c: any) => ({ id: c.id, title: c.title, messages: c.messages, ts: new Date(c.updated_at).getTime(), project: c.project_name })));
      }
    } catch { /* offline */ }
  };

  const socketRef = useRef<WebSocket | null>(null);
  const terminalSocketRef = useRef<WebSocket | null>(null);
  const terminalEndRef = useRef<HTMLDivElement | null>(null);
  const powershellInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const promptInputRef = useRef<HTMLInputElement | null>(null);

  // Focus prompt keyboard binding (Ctrl + L to focus prompt)
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "l") {
        e.preventDefault();
        promptInputRef.current?.focus();
        speakResponse("Agent command panel focused.");
      }
    };
    window.addEventListener("keydown", handleGlobalKeys);
    return () => window.removeEventListener("keydown", handleGlobalKeys);
  }, []);

  // Load browser voice & SpeechPortal
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition && window.speechSynthesis) {
        setSpeechSupported(true);
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-US";

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = () => setIsListening(false);
        
        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setActiveTask(transcript);
          speakResponse(`Processing spoken prompt: ${transcript}`);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  // Mic Canvas Waveform Visualizer
  useEffect(() => {
    if (isListening && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        let angle = 0;
        const render = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          const gradientBg = ctx.createLinearGradient(0, 0, canvas.width, 0);
          gradientBg.addColorStop(0, "rgba(10, 10, 12, 0.95)");
          gradientBg.addColorStop(1, "rgba(17, 12, 28, 0.95)");
          ctx.fillStyle = gradientBg;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          ctx.shadowBlur = 15;
          ctx.shadowColor = "rgba(139, 92, 246, 0.65)";
          
          ctx.beginPath();
          ctx.strokeStyle = "rgba(167, 139, 250, 0.85)";
          ctx.lineWidth = 3.5;
          ctx.lineCap = "round";

          for (let i = 0; i < canvas.width; i++) {
            const y = canvas.height / 2 + 
                      Math.sin(i * 0.05 + angle) * 16 * Math.sin(i * 0.01) +
                      Math.cos(i * 0.03 - angle) * 6 * Math.sin(i * 0.02);
            if (i === 0) ctx.moveTo(i, y);
            else ctx.lineTo(i, y);
          }
          ctx.stroke();

          ctx.beginPath();
          ctx.strokeStyle = "rgba(99, 102, 241, 0.4)";
          ctx.lineWidth = 1.5;
          ctx.shadowBlur = 5;
          ctx.shadowColor = "rgba(99, 102, 241, 0.4)";
          for (let i = 0; i < canvas.width; i++) {
            const y = canvas.height / 2 + Math.cos(i * 0.07 - angle * 0.7) * 10 * Math.sin(i * 0.015);
            if (i === 0) ctx.moveTo(i, y);
            else ctx.lineTo(i, y);
          }
          ctx.stroke();
          
          ctx.shadowBlur = 0;
          angle += 0.12;
          animationRef.current = requestAnimationFrame(render);
        };
        render();
      }
    } else {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isListening]);

  const fetchSandboxStatus = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/sandbox/status");
      if (res.ok) {
        const data = await res.json();
        setSandboxMode(data.mode as "docker" | "host");
      }
    } catch {
      setSandboxMode("host");
    }
  };

  // Connect components on mount
  useEffect(() => {
    // Intercept all outgoing REST API fetch requests to automatically inject X-Nexera-Key header
    const originalFetch = window.fetch;
    window.fetch = function (input, init) {
      const urlStr = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;
      if (urlStr.includes("/api/")) {
        const key = "nexera_master_key_2026";
        if (init) {
          const headers = new Headers(init.headers || {});
          headers.set("X-Nexera-Key", key);
          init.headers = headers;
        } else {
          init = {
            headers: {
              "X-Nexera-Key": key
            }
          };
        }
      }
      return originalFetch.call(this, input, init);
    };

    connectWebSocket();
    connectTerminalWebSocket();
    refreshFileTree();
    loadConfigFromServer();
    loadGitStatus();
    loadPersonalizationPatterns();
    fetchSandboxStatus();
    fetchConversations();
    const interval = setInterval(checkPendingApproval, 1500);
    return () => {
      window.fetch = originalFetch;
      if (socketRef.current) {
        socketRef.current.onclose = null;
        socketRef.current.close();
      }
      if (terminalSocketRef.current) {
        terminalSocketRef.current.onclose = null;
        terminalSocketRef.current.close();
      }
      clearInterval(interval);
    };
  }, []);

  // Sync scroll on logs / terminal
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, terminalBuffer, activeConsoleTab]);

  const loadConfigFromServer = async () => {
    setIsLoadingConfig(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/config");
      if (res.ok) {
        const data = await res.json();
        if (data.model) {
          setConfigProvider(data.model.provider || "ollama");
          setConfigModelName(data.model.name || "qwen2.5-coder:7b-instruct-q4_K_M");
          setConfigTemp(data.model.temperature ?? 0.1);
          setConfigMaxTokens(data.model.max_context_tokens || 8192);
          setConfigBaseUrl(data.model.base_url || "http://127.0.0.1:11434");
        }
        if (data.hardware) {
          setConfigCpu(data.hardware.cpu || "");
          setConfigCpuCores(data.hardware.cpu_cores || 4);
          setConfigRam(data.hardware.ram_gb || 8);
          setConfigGpu(data.hardware.gpu || "");
          setConfigVram(data.hardware.vram_gb || 4);
        }
        if (data.api_keys) {
          setConfigGeminiKey(data.api_keys.gemini || "");
          setConfigOpenaiKey(data.api_keys.openai || "");
          setConfigAnthropicKey(data.api_keys.anthropic || "");
        }
        if (data.project) {
          setConfigVersion(data.project.config_version || 1);
          setConfigHistory(data.project.config_history || []);
        }
      }
    } catch (e) {
      console.error("Failed to load configuration", e);
    } finally {
      setIsLoadingConfig(false);
    }
  };

  const handleProviderChange = async (provider: string) => {
    setConfigProvider(provider);
    let defaultModel = configModelName;
    let defaultBaseUrl = configBaseUrl;
    let defaultMaxTokens = configMaxTokens;

    if (provider === "ollama") {
      defaultModel = "qwen2.5-coder:7b-instruct-q4_K_M";
      defaultBaseUrl = "http://127.0.0.1:11434";
      defaultMaxTokens = 8192;
    } else if (provider === "gemini") {
      defaultModel = "gemini-1.5-flash";
      defaultBaseUrl = "https://generativelanguage.googleapis.com";
      defaultMaxTokens = 1048576;
    } else if (provider === "anthropic") {
      defaultModel = "claude-3-5-sonnet-20241022";
      defaultBaseUrl = "https://api.anthropic.com";
      defaultMaxTokens = 8192;
    } else if (provider === "openai") {
      defaultModel = "gpt-4o";
      defaultBaseUrl = "https://api.openai.com/v1";
      defaultMaxTokens = 4096;
    }

    setConfigModelName(defaultModel);
    setConfigBaseUrl(defaultBaseUrl);
    setConfigMaxTokens(defaultMaxTokens);

    try {
      const payload = {
        hardware: {
          cpu: configCpu,
          cpu_cores: Number(configCpuCores),
          ram_gb: Number(configRam),
          gpu: configGpu,
          vram_gb: Number(configVram)
        },
        model: {
          provider: provider,
          name: defaultModel,
          temperature: Number(configTemp),
          max_context_tokens: Number(defaultMaxTokens),
          base_url: defaultBaseUrl
        },
        api_keys: {
          gemini: configGeminiKey,
          openai: configOpenaiKey,
          anthropic: configAnthropicKey
        }
      };

      const res = await fetch("http://127.0.0.1:8000/api/config/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        addLog({ type: "system", message: `⚙️ Swarm processor preset switched to ${provider.toUpperCase()} (${defaultModel}).` });
        const freshRes = await fetch("http://127.0.0.1:8000/api/config");
        if (freshRes.ok) {
          const data = await freshRes.json();
          if (data.project) {
            setConfigVersion(data.project.config_version || 1);
            setConfigHistory(data.project.config_history || []);
          }
        }
      } else {
        addLog({ type: "error", message: "❌ Failed to save new model selection to backend core." });
      }
    } catch (e) {
      console.error("Error updating model config", e);
    }
  };

  const saveConfigToServer = async () => {
    try {
      const payload = {
        hardware: {
          cpu: configCpu,
          cpu_cores: Number(configCpuCores),
          ram_gb: Number(configRam),
          gpu: configGpu,
          vram_gb: Number(configVram)
        },
        model: {
          provider: configProvider,
          name: configModelName,
          temperature: Number(configTemp),
          max_context_tokens: Number(configMaxTokens),
          base_url: configBaseUrl
        },
        api_keys: {
          gemini: configGeminiKey,
          openai: configOpenaiKey,
          anthropic: configAnthropicKey
        }
      };

      const res = await fetch("http://127.0.0.1:8000/api/config/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        addLog({ type: "system", message: "⚙️ Swarm parameters, keys, and host allocations saved dynamically." });
        loadConfigFromServer();
      } else {
        alert("Failed to save settings.");
      }
    } catch (e) {
      alert("Error writing to settings backend.");
    }
  };

  // Personalization Swarm API handlers
  const loadPersonalizationPatterns = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/patterns");
      if (res.ok) {
        const data = await res.json();
        setPersonalization(data);
      }
    } catch (e) {}
  };

  const handleAddShorthand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shorthandTrigger.trim() || !shorthandExpansion.trim()) return;
    try {
      const res = await fetch("http://127.0.0.1:8000/api/patterns/shorthand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trigger: shorthandTrigger, expansion: shorthandExpansion })
      });
      if (res.ok) {
        addLog({ type: "system", message: `🧠 [Personalization]: Registered shorthand trigger: '${shorthandTrigger}'` });
        setShorthandTrigger("");
        setShorthandExpansion("");
        loadPersonalizationPatterns();
      }
    } catch (e) {}
  };

  const handleDeleteShorthand = async (trigger: string) => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/patterns/shorthand/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trigger })
      });
      if (res.ok) {
        addLog({ type: "system", message: `🧠 [Personalization]: Deleted shorthand trigger: '${trigger}'` });
        loadPersonalizationPatterns();
      }
    } catch (e) {}
  };

  const testExpandPrompt = async (val: string) => {
    setPreviewInput(val);
    if (!val.trim()) {
      setPreviewOutput(null);
      return;
    }
    try {
      const res = await fetch("http://127.0.0.1:8000/api/patterns/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: val })
      });
      if (res.ok) {
        const data = await res.json();
        setPreviewOutput(data);
      }
    } catch (e) {}
  };

  // Git source control handlers
  const loadGitStatus = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/git/status");
      if (res.ok) {
        const data = await res.json();
        setGitStatus(data);
      }
    } catch (e) {}
  };

  const handleGitCommitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commitMessage.trim()) return;
    setIsCommitting(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/git/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: commitMessage })
      });
      if (res.ok) {
        addLog({ type: "success", message: `🌿 [Git Source Control]: Successfully committed: '${commitMessage}'` });
        setCommitMessage("");
        loadGitStatus();
      }
    } catch (err) {
      alert("Git commit failed.");
    } finally {
      setIsCommitting(false);
    }
  };

  // Workspace File explorer tree
  const refreshFileTree = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/workspace/tree");
      if (res.ok) {
        const data = await res.json();
        setWorkspaceTree(data);
      }
    } catch (e) {}
  };

  // Search through all workspace files
  const handleWorkspaceQuerySearch = async (val: string) => {
    setSearchQuery(val);
    if (!val.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/workspace/search?q=${encodeURIComponent(val)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      }
    } catch (e) {
    } finally {
      setIsSearching(false);
    }
  };

  // OS Desktop simulation execution
  const runAutomationSequence = async () => {
    setIsAutomationRunning(true);
    try {
      const payload: any = { action: automationAction };
      if (automationAction === "click") {
        payload.x = automationX;
        payload.y = automationY;
      } else if (automationAction === "type") {
        payload.text = automationText;
      } else if (automationAction === "crawl") {
        payload.url = automationUrl;
      }

      const res = await fetch("http://127.0.0.1:8000/api/automation/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        if (automationAction === "crawl" && data.text) {
          setOcrText(data.text);
          if (data.screenshot_url) setScreenshotData(data.screenshot_url);
        }
        addLog({ type: "success", message: `🤖 OS Simulator: Action executed. Output detail - ${data.log}` });
      }
    } catch (err) {
      addLog({ type: "error", message: "OS Automation run encountered an error." });
    } finally {
      setIsAutomationRunning(false);
    }
  };

  const connectWebSocket = () => {
    try {
      const ws = new WebSocket("ws://127.0.0.1:8000/ws");
      setWsStatus("connecting");

      ws.onopen = () => {
        setWsStatus("connected");
        addLog({ type: "system", message: "🔌 Nexera Core Gateway Online. Linked to workspace APIs." });
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        addLog(data);

        if (data.type === "agent") {
          const agentName = data.agent as "CEO" | "Engineer" | "QA";
          if (agentStates[agentName]) {
            setAgentStates((prev) => ({
              ...prev,
              [agentName]: {
                status: data.role || "Active",
                task: data.message.substring(0, 95) + (data.message.length > 95 ? "..." : "")
              }
            }));
          }
          // ⚠️ SILENT BY DEFAULT — speakResponse is only triggered manually via the
          // speaker bubble icon on each message or when the user unmutes the toggle.
          // Do NOT auto-speak agent messages here.
        }

        if (data.message && (data.message.includes("saved") || data.message.includes("completed"))) {
          refreshFileTree();
          loadGitStatus();
          loadPersonalizationPatterns();
        }
      };

      ws.onclose = () => {
        setWsStatus("disconnected");
        addLog({ type: "system", message: "🔌 Gateway Offline. Reconnecting..." });
        setTimeout(connectWebSocket, 3000);
      };

      socketRef.current = ws;
    } catch (err) {
      setWsStatus("error");
    }
  };

  const connectTerminalWebSocket = () => {
    try {
      const ws = new WebSocket("ws://127.0.0.1:8000/ws/terminal");

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "terminal_out") {
          setTerminalBuffer((prev) => prev + data.data);
        }
      };

      ws.onclose = () => {
        setTimeout(connectTerminalWebSocket, 3000);
      };

      terminalSocketRef.current = ws;
    } catch (err) {
      console.error("Terminal WebSocket connection error:", err);
    }
  };

  const sendTerminalCommand = (cmd: string) => {
    if (terminalSocketRef.current && terminalSocketRef.current.readyState === WebSocket.OPEN) {
      terminalSocketRef.current.send(JSON.stringify({
        type: "terminal_in",
        data: cmd
      }));
    }
  };

  const handleTerminalKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const command = terminalInput;
      if (command.trim()) {
        setTerminalHistory((prev) => [...prev, command]);
      }
      setHistoryIndex(-1);
      sendTerminalCommand(command + "\n");
      setTerminalInput("");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (terminalHistory.length === 0) return;
      const nextIndex = historyIndex === -1 ? terminalHistory.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIndex);
      setTerminalInput(terminalHistory[nextIndex]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex === -1) return;
      if (historyIndex === terminalHistory.length - 1) {
        setHistoryIndex(-1);
        setTerminalInput("");
      } else {
        const nextIndex = historyIndex + 1;
        setHistoryIndex(nextIndex);
        setTerminalInput(terminalHistory[nextIndex]);
      }
    } else if (e.ctrlKey && e.key.toLowerCase() === "c") {
      e.preventDefault();
      sendTerminalCommand("\x03");
    }
  };

  const addLog = (log: LogMessage) => {
    setLogs((prev) => [...prev, log]);
  };

  const handleCloseWindow = () => {
    if ((window as any).electronAPI?.isElectron) {
      (window as any).electronAPI.closeWindow();
    } else if (window.confirm("Close Nexera OS?")) {
      window.close();
    }
  };

  const handleMinimizeWindow = () => {
    if ((window as any).electronAPI?.isElectron) {
      (window as any).electronAPI.minimizeWindow();
    } else {
      addLog({ type: "system", message: "⚙️ Minimize is only available in the desktop app." });
    }
  };

  const handleMaximizeWindow = () => {
    if ((window as any).electronAPI?.isElectron) {
      (window as any).electronAPI.maximizeWindow();
    } else if (typeof document !== "undefined") {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
        addLog({ type: "system", message: "🖥️ Maximized to Fullscreen Mode." });
      } else {
        document.exitFullscreen().catch(() => {});
        addLog({ type: "system", message: "🖥️ Exited Fullscreen Mode." });
      }
    }
  };

  const checkPendingApproval = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/approvals/pending");
      const data = await res.json();
      if (data.has_pending) {
        setPendingApproval(data.item);
        
        const filePath = data.item.filepath;
        if (!openTabs.includes(filePath)) {
          setOpenTabs((prev) => [...prev, filePath]);
          setFileContents((prev) => ({ ...prev, [filePath]: data.item.content }));
        }
        setActiveTab(filePath);
      } else {
        setPendingApproval(null);
      }
    } catch (e) {}
  };

  const speakResponse = (text: string, force = false) => {
    if (isMuted && !force) return;
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const cleanText = text.replace(/\[.*?\]/g, "").replace(/[^a-zA-Z0-9.,!? ]/g, "");
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.05;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleListening = () => {
    if (!speechSupported) return;
    if (isListening) recognitionRef.current?.stop();
    else recognitionRef.current?.start();
  };

  const handleCaptureScreen = async () => {
    setIsCapturing(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/screenshot");
      const data = await res.json();
      if (data.success) {
        setScreenshotData(data.image_b64);
        setOcrText(data.ocr_text);
        speakResponse("Visual viewport frame captured.");
      }
    } catch (err) {
      addLog({ type: "error", message: "Failed screen capturing." });
    } finally {
      setIsCapturing(false);
    }
  };

  const handleStartTask = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeTask.trim()) return;

    const taskText = activeTask;
    setActiveTask("");

    // Append User Message to Chat thread
    const userMsg = {
      id: `msg-user-${Date.now()}`,
      role: "user",
      content: taskText
    };
    
    // Append Assistant Trace Mock Message
    const assistantMsg = {
      id: `msg-assist-${Date.now()}`,
      role: "assistant",
      content: `Initiating agent swarm to execute: "${taskText}". Processing plans...`,
      isExecutionTrace: true
    };

    setChatMessages((prev) => {
      const updated = [...prev, userMsg, assistantMsg];
      // Auto-save to DB: update existing session or create a new one
      const sid = activeSessionId !== "default" ? activeSessionId : null;
      const title = taskText.slice(0, 60);
      if (sid) {
        fetch(`http://127.0.0.1:8000/api/conversations/${sid}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: updated })
        }).catch(() => {});
      } else {
        fetch("http://127.0.0.1:8000/api/conversations", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project_name: projectName, title, messages: updated })
        }).then(r => r.ok ? r.json() : null).then(d => {
          if (d?.id) { setActiveSessionId(d.id); setConvSessions(p => [{ id: d.id, title, messages: updated, ts: Date.now(), project: projectName }, ...p]); }
        }).catch(() => {});
      }
      return updated;
    });
    setIsExecuting(true);
    setLogs([]);

    try {
      await fetch("http://127.0.0.1:8000/api/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: taskText })
      });
      loadGitStatus();
      loadPersonalizationPatterns();
    } catch (err) {
      addLog({ type: "error", message: "Failed initiating agent Swarm." });
    }
  };

  const handleStopTask = async () => {
    try {
      await fetch("http://127.0.0.1:8000/api/stop", { method: "POST" });
      setIsExecuting(false);
      window.speechSynthesis.cancel();
    } catch (e) {}
  };

  const handleSubmitApproval = async (status: "approved" | "rejected") => {
    setIsSubmittingApproval(true);
    try {
      await fetch("http://127.0.0.1:8000/api/approvals/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          revision_notes: status === "rejected" ? revisionNotes : ""
        })
      });
      setRevisionNotes("");
      setPendingApproval(null);
      refreshFileTree();
      loadGitStatus();
    } catch (err) {
      alert("CTO verification response error.");
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  // Workspace File interactions
  const handleCreateItem = async (parentPath: string, name: string, isDir: boolean) => {
    if (!name.trim()) return;
    const path = parentPath ? `${parentPath}/${name}` : name;
    try {
      const res = await fetch("http://127.0.0.1:8000/api/workspace/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, is_dir: isDir })
      });
      if (res.ok) {
        addLog({ type: "system", message: `✨ Created ${isDir ? "directory" : "file"}: '${path}'` });
        refreshFileTree();
        loadGitStatus();
      } else {
        const errData = await res.json();
        alert(`Create failed: ${errData.message}`);
      }
    } catch (err) {
      alert("Failed to communicate with workspace API.");
    }
  };

  const handleDeleteItem = async (path: string) => {
    if (!confirm(`Are you sure you want to delete '${path}'?`)) return;
    try {
      const res = await fetch("http://127.0.0.1:8000/api/workspace/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path })
      });
      if (res.ok) {
        addLog({ type: "system", message: `🗑️ Deleted workspace item: '${path}'` });
        if (openTabs.includes(path)) {
          const tabIndex = openTabs.indexOf(path);
          const newTabs = openTabs.filter((t) => t !== path);
          setOpenTabs(newTabs);
          if (activeTab === path) {
            setActiveTab(newTabs.length > 0 ? newTabs[Math.max(0, tabIndex - 1)] : null);
          }
        }
        refreshFileTree();
        loadGitStatus();
      } else {
        const errData = await res.json();
        alert(`Delete failed: ${errData.message}`);
      }
    } catch (err) {
      alert("Failed to communicate with workspace API.");
    }
  };

  const handleMoveItem = async (sourcePath: string, targetFolderPath: string) => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/workspace/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: sourcePath, destination: targetFolderPath })
      });
      if (res.ok) {
        addLog({ type: "system", message: `📦 Moved '${sourcePath}' → '${targetFolderPath}'` });
        refreshFileTree();
      } else {
        let errMsg = `HTTP ${res.status}`;
        try { const d = await res.json(); errMsg = d.message || d.detail || errMsg; } catch { /* ignore */ }
        alert(`Move failed: ${errMsg}`);
      }
    } catch {
      alert("Failed to communicate with workspace API.");
    }
  };

  const handleOpenFile = async (path: string) => {
    if (openTabs.includes(path)) {
      setActiveTab(path);
      return;
    }

    try {
      const res = await fetch(`http://127.0.0.1:8000/api/workspace/read?path=${encodeURIComponent(path)}`);
      if (res.ok) {
        const data = await res.json();
        setOpenTabs((prev) => [...prev, path]);
        setFileContents((prev) => ({ ...prev, [path]: data.content }));
        setActiveTab(path);
      }
    } catch (e) {
      alert("Failed opening file.");
    }
  };

  const handleCloseTab = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const tabIndex = openTabs.indexOf(path);
    const newTabs = openTabs.filter((t) => t !== path);
    setOpenTabs(newTabs);
    
    if (activeTab === path) {
      if (newTabs.length > 0) {
        setActiveTab(newTabs[Math.max(0, tabIndex - 1)]);
      } else {
        setActiveTab(null);
      }
    }
  };

  const handleContentChange = (path: string, val: string) => {
    setFileContents((prev) => ({ ...prev, [path]: val }));
    setUnsavedChanges((prev) => ({ ...prev, [path]: true }));
  };

  const handleSaveFile = async (path: string) => {
    const content = fileContents[path] || "";
    try {
      const res = await fetch("http://127.0.0.1:8000/api/workspace/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, content })
      });
      if (res.ok) {
        setUnsavedChanges((prev) => ({ ...prev, [path]: false }));
        addLog({ type: "system", message: `💾 Saved workspace file: '${path}'` });
        refreshFileTree();
        loadGitStatus();
      }
    } catch (e) {
      alert("Save failed.");
    }
  };

  // Toggle local extension hook simulation
  const toggleExtensionState = (id: string) => {
    setExtensions((prev) =>
      prev.map((ext) => {
        if (ext.id === id) {
          const nextState = !ext.enabled;
          addLog({
            type: "system",
            message: `🧩 [Extensions]: ${nextState ? "Enabled" : "Disabled"} extension module: '${ext.name}' version ${ext.version}`
          });
          return { ...ext, enabled: nextState };
        }
        return ext;
      })
    );
  };

  // Handle shortcuts (Ctrl+S, Ctrl+D for Approval, Ctrl+- for Rejection, Ctrl+N for New File, Ctrl+Shift+N for New Folder, F5 for Refresh)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Global save shortcut
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        if (activeTab) {
          e.preventDefault();
          handleSaveFile(activeTab);
        }
      }
      
      // CTO approval hotkeys
      if (pendingApproval) {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
          e.preventDefault();
          handleSubmitApproval("approved");
        }
        if ((e.ctrlKey || e.metaKey) && e.key === "-") {
          e.preventDefault();
          handleSubmitApproval("rejected");
        }
      }

      // Shield active text input / typing focus
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
        return;
      }

      // New File / Folder shortcuts
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        startInlineCreate(false);
        addLog({ type: "system", message: "⌨️ Shortcut: Triggers inline New File creation." });
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        startInlineCreate(true);
        addLog({ type: "system", message: "⌨️ Shortcut: Triggers inline New Folder creation." });
      }

      // Refresh shortcut
      if (e.key === "F5") {
        e.preventDefault();
        refreshFileTree();
        loadGitStatus();
        addLog({ type: "system", message: "🔄 Workspace tree and source control indices refreshed." });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab, fileContents, pendingApproval, selectedNode]);

  // Toggle card expansion (Thought accordion logic)
  const toggleCard = (key: string) => {
    setExpandedCards((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const renderTreeNodes = (nodes: FileNode[]) => {
    return nodes.map((node) => (
      <FileTreeNode
        key={node.path}
        node={node}
        onFileClick={handleOpenFile}
        activeFile={activeTab || ""}
        onCreateItem={handleCreateItem}
        onDeleteItem={handleDeleteItem}
        onMoveItem={handleMoveItem}
        selectedNode={selectedNode}
        setSelectedNode={setSelectedNode}
        inlineCreate={inlineCreate}
        setInlineCreate={setInlineCreate}
        inlineCreateName={inlineCreateName}
        setInlineCreateName={setInlineCreateName}
        collapsedAllTrigger={collapsedAllTrigger}
      />
    ));
  };

  // Toggle Dock Icons with Smart Sidebar open/close
  const handleDockIconClick = (panel: "explorer" | "search" | "git" | "run" | "extensions" | "brain" | "viewport" | "settings" | "agents") => {
    if (activePanel === panel) {
      setIsSidebarOpen(!isSidebarOpen);
    } else {
      setActivePanel(panel);
      setIsSidebarOpen(true);
    }
  };

  return (
    <div className="h-screen bg-[#1e1e1e] text-[#f4f4f6] flex flex-col font-sans overflow-hidden select-none border border-[#3c3c3c]/70 shadow-[0_0_80px_rgba(0,0,0,0.95)] relative">
      
      {/* 1. Chrome Native Windows Menu & Traffic Controls */}
      <header className="h-11 bg-[#3c3c3c] backdrop-blur-xl border-b border-[#3c3c3c]/70 flex items-center justify-between px-4 select-none shrink-0 relative z-50 shadow-lg shadow-black/20" style={{ WebkitAppRegion: "drag" } as React.CSSProperties}>
        {openMenuDropdown && (
          <div 
            className="fixed inset-0 z-40 bg-transparent" 
            onClick={() => setOpenMenuDropdown(null)} 
          />
        )}
        <div className="flex items-center gap-4" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
          {/* Windows Window Buttons layout (Mac styling with hover indicators) */}
          <div className="flex items-center gap-1.5 mr-2 group/traffic">
            <span 
              onClick={handleCloseWindow} 
              title="Close Workspace" 
              className="w-3 h-3 rounded-full bg-rose-500/80 border border-rose-600/30 cursor-pointer hover:bg-rose-500 transition-colors flex items-center justify-center text-[7px] text-rose-950 font-bold select-none"
            >
              <span className="opacity-0 group-hover/traffic:opacity-100 transition-opacity">×</span>
            </span>
            <span 
              onClick={handleMinimizeWindow} 
              title="Minimize Workspace" 
              className="w-3 h-3 rounded-full bg-amber-500/80 border border-amber-600/30 cursor-pointer hover:bg-amber-500 transition-colors flex items-center justify-center text-[7px] text-amber-950 font-bold select-none"
            >
              <span className="opacity-0 group-hover/traffic:opacity-100 transition-opacity">-</span>
            </span>
            <span 
              onClick={handleMaximizeWindow} 
              title="Toggle Fullscreen" 
              className="w-3 h-3 rounded-full bg-emerald-500/80 border border-emerald-600/30 cursor-pointer hover:bg-emerald-500 transition-colors flex items-center justify-center text-[7px] text-emerald-950 font-bold select-none"
            >
              <span className="opacity-0 group-hover/traffic:opacity-100 transition-opacity">⤢</span>
            </span>
          </div>
          
          {/* Traditional File Edit Menu */}
          <nav className="hidden md:flex items-center gap-1 text-[11px] font-medium text-neutral-400 font-sans tracking-wide relative z-50">
            
            {/* FILE */}
            <div className="relative">
              <span 
                onClick={() => setOpenMenuDropdown(openMenuDropdown === "file" ? null : "file")}
                className={`hover:text-white cursor-pointer hover:bg-white/5 transition-all px-2.5 py-1 rounded-lg ${openMenuDropdown === "file" ? "text-white bg-white/10" : ""}`}
              >
                File
              </span>
              {openMenuDropdown === "file" && (
                <div className="absolute left-0 mt-2 w-60 glass-dropdown rounded-xl shadow-2xl py-1.5 z-50 text-[10px] text-neutral-300 font-mono font-normal">
                  <button 
                    type="button"
                    onClick={() => {
                      setOpenMenuDropdown(null);
                      startInlineCreate(false);
                    }}
                    className="w-[calc(100%-8px)] text-left px-3.5 py-2 hover:bg-[#3279F9]/10 hover:text-white rounded-lg mx-1 transition-all flex items-center justify-between"
                  >
                    <span>New File...</span>
                    <span className="keycap text-[8px] scale-90">Ctrl+N</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setOpenMenuDropdown(null);
                      startInlineCreate(true);
                    }}
                    className="w-[calc(100%-8px)] text-left px-3.5 py-2 hover:bg-[#3279F9]/10 hover:text-white rounded-lg mx-1 transition-all flex items-center justify-between"
                  >
                    <span>New Folder...</span>
                    <span className="keycap text-[8px] scale-90">Ctrl+Shift+N</span>
                  </button>
                  <div className="h-[1px] bg-[#1b1c24]/60 my-1.5" />
                  <button 
                    type="button"
                    onClick={() => {
                      setOpenMenuDropdown(null);
                      if (activeTab) handleSaveFile(activeTab);
                      else alert("No active tab to save.");
                    }}
                    className="w-[calc(100%-8px)] text-left px-3.5 py-2 hover:bg-[#3279F9]/10 hover:text-white rounded-lg mx-1 transition-all flex items-center justify-between"
                  >
                    <span>Save File</span>
                    <span className="keycap text-[8px] scale-90">Ctrl+S</span>
                  </button>
                  <button 
                    type="button"
                    onClick={(e) => {
                      setOpenMenuDropdown(null);
                      if (activeTab) handleCloseTab(activeTab, e);
                    }}
                    className="w-[calc(100%-8px)] text-left px-3.5 py-2 hover:bg-[#3279F9]/10 hover:text-white rounded-lg mx-1 transition-all flex items-center justify-between"
                  >
                    <span>Close Editor</span>
                    <span className="keycap text-[8px] scale-90">Ctrl+W</span>
                  </button>
                  <div className="h-[1px] bg-[#1b1c24]/60 my-1.5" />
                  <button 
                    type="button"
                    onClick={() => {
                      setOpenMenuDropdown(null);
                      refreshFileTree();
                      loadGitStatus();
                      addLog({ type: "system", message: "🔄 Workspace tree and source control indices refreshed." });
                    }}
                    className="w-[calc(100%-8px)] text-left px-3.5 py-2 hover:bg-[#3279F9]/10 hover:text-white rounded-lg mx-1 transition-all flex items-center justify-between"
                  >
                    <span>Refresh Workspace</span>
                    <span className="keycap text-[8px] scale-90">F5</span>
                  </button>
                  <div className="h-[1px] bg-[#1b1c24]/60 my-1.5" />
                  <button 
                    type="button"
                    onClick={() => {
                      setOpenMenuDropdown(null);
                      handleCloseWindow();
                    }}
                    className="w-[calc(100%-8px)] text-left px-3.5 py-2 hover:bg-rose-600 hover:text-white rounded-lg mx-1 transition-all flex items-center justify-between border-0 bg-transparent cursor-pointer font-bold"
                  >
                    <span>Exit Workspace</span>
                    <span className="keycap text-[8px] scale-90 border-rose-400/30 text-rose-300">Alt+F4</span>
                  </button>
                </div>
              )}
            </div>

            {/* EDIT */}
            <div className="relative">
              <span 
                onClick={() => setOpenMenuDropdown(openMenuDropdown === "edit" ? null : "edit")}
                className={`hover:text-white cursor-pointer hover:bg-white/5 transition-all px-2.5 py-1 rounded-lg ${openMenuDropdown === "edit" ? "text-white bg-white/10" : ""}`}
              >
                Edit
              </span>
              {openMenuDropdown === "edit" && (
                <div className="absolute left-0 mt-2 w-52 glass-dropdown rounded-xl shadow-2xl py-1.5 z-50 text-[10px] text-neutral-300 font-mono font-normal">
                  <button 
                    type="button"
                    onClick={() => { setOpenMenuDropdown(null); addLog({ type: "system", message: "✏️ Edit: Undo action simulated." }); }}
                    className="w-[calc(100%-8px)] text-left px-3.5 py-2 hover:bg-[#3279F9]/10 hover:text-white rounded-lg mx-1 transition-all flex items-center justify-between"
                  >
                    <span>Undo</span>
                    <span className="keycap text-[8px] scale-90">Ctrl+Z</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setOpenMenuDropdown(null); addLog({ type: "system", message: "✏️ Edit: Redo action simulated." }); }}
                    className="w-[calc(100%-8px)] text-left px-3.5 py-2 hover:bg-[#3279F9]/10 hover:text-white rounded-lg mx-1 transition-all flex items-center justify-between"
                  >
                    <span>Redo</span>
                    <span className="keycap text-[8px] scale-90">Ctrl+Y</span>
                  </button>
                  <div className="h-[1px] bg-[#1b1c24]/60 my-1.5" />
                  <button 
                    type="button"
                    onClick={() => { setOpenMenuDropdown(null); addLog({ type: "system", message: "✏️ Edit: Cut selection to clipboard." }); }}
                    className="w-[calc(100%-8px)] text-left px-3.5 py-2 hover:bg-[#3279F9]/10 hover:text-white rounded-lg mx-1 transition-all flex items-center justify-between"
                  >
                    <span>Cut</span>
                    <span className="keycap text-[8px] scale-90">Ctrl+X</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setOpenMenuDropdown(null); addLog({ type: "system", message: "✏️ Edit: Copied active buffer snippet." }); }}
                    className="w-[calc(100%-8px)] text-left px-3.5 py-2 hover:bg-[#3279F9]/10 hover:text-white rounded-lg mx-1 transition-all flex items-center justify-between"
                  >
                    <span>Copy</span>
                    <span className="keycap text-[8px] scale-90">Ctrl+C</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setOpenMenuDropdown(null); addLog({ type: "system", message: "✏️ Edit: Pasted clipboard." }); }}
                    className="w-[calc(100%-8px)] text-left px-3.5 py-2 hover:bg-[#3279F9]/10 hover:text-white rounded-lg mx-1 transition-all flex items-center justify-between"
                  >
                    <span>Paste</span>
                    <span className="keycap text-[8px] scale-90">Ctrl+V</span>
                  </button>
                  <div className="h-[1px] bg-[#1b1c24]/60 my-1.5" />
                  <button 
                    type="button"
                    onClick={() => {
                      setOpenMenuDropdown(null);
                      setActivePanel("search");
                      setIsSidebarOpen(true);
                      addLog({ type: "system", message: "🔍 Workspace Scan Panel focused." });
                    }}
                    className="w-[calc(100%-8px)] text-left px-3.5 py-2 hover:bg-[#3279F9]/10 hover:text-white rounded-lg mx-1 transition-all flex items-center justify-between"
                  >
                    <span>Find in Files</span>
                    <span className="keycap text-[8px] scale-90">Ctrl+Shift+F</span>
                  </button>
                </div>
              )}
            </div>

            {/* SELECTION */}
            <div className="relative">
              <span 
                onClick={() => setOpenMenuDropdown(openMenuDropdown === "selection" ? null : "selection")}
                className={`hover:text-white cursor-pointer hover:bg-white/5 transition-all px-2.5 py-1 rounded-lg ${openMenuDropdown === "selection" ? "text-white bg-white/10" : ""}`}
              >
                Selection
              </span>
              {openMenuDropdown === "selection" && (
                <div className="absolute left-0 mt-2 w-52 glass-dropdown rounded-xl shadow-2xl py-1.5 z-50 text-[10px] text-neutral-300 font-mono font-normal">
                  <button 
                    type="button"
                    onClick={() => { setOpenMenuDropdown(null); addLog({ type: "system", message: "📝 Buffer Selection: Selected all active lines." }); }}
                    className="w-[calc(100%-8px)] text-left px-3.5 py-2 hover:bg-[#3279F9]/10 hover:text-white rounded-lg mx-1 transition-all flex items-center justify-between"
                  >
                    <span>Select All</span>
                    <span className="keycap text-[8px] scale-90">Ctrl+A</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setOpenMenuDropdown(null); addLog({ type: "system", message: "📝 Buffer Selection: Boundary selection expanded." }); }}
                    className="w-[calc(100%-8px)] text-left px-3.5 py-2 hover:bg-[#3279F9]/10 hover:text-white rounded-lg mx-1 transition-all flex items-center justify-between"
                  >
                    <span>Expand</span>
                    <span className="keycap text-[8px] scale-90">Shift+Alt+→</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setOpenMenuDropdown(null); addLog({ type: "system", message: "📝 Buffer Selection: Boundary selection shrunk." }); }}
                    className="w-[calc(100%-8px)] text-left px-3.5 py-2 hover:bg-[#3279F9]/10 hover:text-white rounded-lg mx-1 transition-all flex items-center justify-between"
                  >
                    <span>Shrink</span>
                    <span className="keycap text-[8px] scale-90">Shift+Alt+←</span>
                  </button>
                </div>
              )}
            </div>

            {/* VIEW */}
            <div className="relative">
              <span 
                onClick={() => setOpenMenuDropdown(openMenuDropdown === "view" ? null : "view")}
                className={`hover:text-white cursor-pointer hover:bg-white/5 transition-all px-2.5 py-1 rounded-lg ${openMenuDropdown === "view" ? "text-white bg-white/10" : ""}`}
              >
                View
              </span>
              {openMenuDropdown === "view" && (
                <div className="absolute left-0 mt-2 w-60 glass-dropdown rounded-xl shadow-2xl py-1.5 z-50 text-[10px] text-neutral-300 font-mono font-normal">
                  <button 
                    type="button"
                    onClick={() => { setOpenMenuDropdown(null); setIsSidebarOpen(!isSidebarOpen); }}
                    className="w-[calc(100%-8px)] text-left px-3.5 py-2 hover:bg-[#3279F9]/10 hover:text-white rounded-lg mx-1 transition-all flex items-center justify-between"
                  >
                    <span>Toggle Sidebar</span>
                    <span className="keycap text-[8px] scale-90">Ctrl+B</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setOpenMenuDropdown(null); setIsTerminalOpen(!isTerminalOpen); }}
                    className="w-[calc(100%-8px)] text-left px-3.5 py-2 hover:bg-[#3279F9]/10 hover:text-white rounded-lg mx-1 transition-all flex items-center justify-between"
                  >
                    <span>Toggle Console</span>
                    <span className="keycap text-[8px] scale-90">Ctrl+`</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setOpenMenuDropdown(null); setIsRightSidebarOpen(!isRightSidebarOpen); }}
                    className="w-[calc(100%-8px)] text-left px-3.5 py-2 hover:bg-[#3279F9]/10 hover:text-white rounded-lg mx-1 transition-all flex items-center justify-between"
                  >
                    <span>Toggle Chat Panel</span>
                    <span className="keycap text-[8px] scale-90 font-mono text-[7.5px]">Ctrl+Alt+C</span>
                  </button>
                  <div className="h-[1px] bg-[#1b1c24]/60 my-1.5" />
                  <button 
                    type="button"
                    onClick={() => { setOpenMenuDropdown(null); addLog({ type: "system", message: "🔎 View: Font scale increased." }); }}
                    className="w-[calc(100%-8px)] text-left px-3.5 py-2 hover:bg-[#3279F9]/10 hover:text-white rounded-lg mx-1 transition-all flex items-center justify-between"
                  >
                    <span>Zoom In</span>
                    <span className="keycap text-[8px] scale-90">Ctrl+=</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setOpenMenuDropdown(null); addLog({ type: "system", message: "🔎 View: Font scale decreased." }); }}
                    className="w-[calc(100%-8px)] text-left px-3.5 py-2 hover:bg-[#3279F9]/10 hover:text-white rounded-lg mx-1 transition-all flex items-center justify-between"
                  >
                    <span>Zoom Out</span>
                    <span className="keycap text-[8px] scale-90">Ctrl+-</span>
                  </button>
                </div>
              )}
            </div>

            {/* GO */}
            <div className="relative">
              <span 
                onClick={() => setOpenMenuDropdown(openMenuDropdown === "go" ? null : "go")}
                className={`hover:text-white cursor-pointer hover:bg-white/5 transition-all px-2.5 py-1 rounded-lg ${openMenuDropdown === "go" ? "text-white bg-white/10" : ""}`}
              >
                Go
              </span>
              {openMenuDropdown === "go" && (
                <div className="absolute left-0 mt-2 w-56 glass-dropdown rounded-xl shadow-2xl py-1.5 z-50 text-[10px] text-neutral-300 font-mono font-normal">
                  <button 
                    type="button"
                    onClick={() => {
                      setOpenMenuDropdown(null);
                      setActivePanel("explorer");
                      setIsSidebarOpen(true);
                      addLog({ type: "system", message: "📂 Workspace navigation triggered." });
                    }}
                    className="w-[calc(100%-8px)] text-left px-3.5 py-2 hover:bg-[#3279F9]/10 hover:text-white rounded-lg mx-1 transition-all flex items-center justify-between"
                  >
                    <span>Go to File...</span>
                    <span className="keycap text-[8px] scale-90">Ctrl+P</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setOpenMenuDropdown(null);
                      const line = prompt("Go to line number:");
                      if (line) addLog({ type: "system", message: `🧭 Navigation: Jumped to line ${line}.` });
                    }}
                    className="w-[calc(100%-8px)] text-left px-3.5 py-2 hover:bg-[#3279F9]/10 hover:text-white rounded-lg mx-1 transition-all flex items-center justify-between"
                  >
                    <span>Go to Line...</span>
                    <span className="keycap text-[8px] scale-90">Ctrl+G</span>
                  </button>
                  <div className="h-[1px] bg-[#1b1c24]/60 my-1.5" />
                  <button 
                    type="button"
                    onClick={() => {
                      setOpenMenuDropdown(null);
                      if (openTabs.length > 1) {
                        const curIdx = activeTab ? openTabs.indexOf(activeTab) : 0;
                        const nextIdx = (curIdx + 1) % openTabs.length;
                        setActiveTab(openTabs[nextIdx]);
                      }
                    }}
                    className="w-[calc(100%-8px)] text-left px-3.5 py-2 hover:bg-[#3279F9]/10 hover:text-white rounded-lg mx-1 transition-all flex items-center justify-between"
                  >
                    <span>Next Tab</span>
                    <span className="keycap text-[8px] scale-90 font-mono text-[7px]">Ctrl+PgDn</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setOpenMenuDropdown(null);
                      if (openTabs.length > 1) {
                        const curIdx = activeTab ? openTabs.indexOf(activeTab) : 0;
                        const prevIdx = (curIdx - 1 + openTabs.length) % openTabs.length;
                        setActiveTab(openTabs[prevIdx]);
                      }
                    }}
                    className="w-[calc(100%-8px)] text-left px-3.5 py-2 hover:bg-[#3279F9]/10 hover:text-white rounded-lg mx-1 transition-all flex items-center justify-between"
                  >
                    <span>Previous Tab</span>
                    <span className="keycap text-[8px] scale-90 font-mono text-[7px]">Ctrl+PgUp</span>
                  </button>
                </div>
              )}
            </div>

            {/* RUN */}
            <div className="relative">
              <span 
                onClick={() => setOpenMenuDropdown(openMenuDropdown === "run" ? null : "run")}
                className={`hover:text-white cursor-pointer hover:bg-white/5 transition-all px-2.5 py-1 rounded-lg ${openMenuDropdown === "run" ? "text-white bg-white/10" : ""}`}
              >
                Run
              </span>
              {openMenuDropdown === "run" && (
                <div className="absolute left-0 mt-2 w-52 glass-dropdown rounded-xl shadow-2xl py-1.5 z-50 text-[10px] text-neutral-300 font-mono font-normal">
                  <button 
                    type="button"
                    onClick={() => {
                      setOpenMenuDropdown(null);
                      addLog({ type: "system", message: "🚀 [Debugger]: Initiating active runtime compile check..." });
                      addLog({ type: "success", message: "✅ [Debugger]: Environment compiled with zero errors." });
                    }}
                    className="w-[calc(100%-8px)] text-left px-3.5 py-2 hover:bg-[#3279F9]/10 hover:text-white rounded-lg mx-1 transition-all flex items-center justify-between"
                  >
                    <span>Start Debugging</span>
                    <span className="keycap text-[8px] scale-90">F5</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setOpenMenuDropdown(null);
                      addLog({ type: "success", message: "🚀 Environment running in production mode." });
                    }}
                    className="w-[calc(100%-8px)] text-left px-3.5 py-2 hover:bg-[#3279F9]/10 hover:text-white rounded-lg mx-1 transition-all flex items-center justify-between"
                  >
                    <span>Run production</span>
                    <span className="keycap text-[8px] scale-90">Ctrl+F5</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setOpenMenuDropdown(null);
                      addLog({ type: "system", message: "⏹️ Active debugger processes terminated." });
                    }}
                    className="w-[calc(100%-8px)] text-left px-3.5 py-2 hover:bg-[#3279F9]/10 hover:text-white rounded-lg mx-1 transition-all flex items-center justify-between"
                  >
                    <span>Stop Debugging</span>
                    <span className="keycap text-[8px] scale-90 border-rose-950 text-rose-400">Shift+F5</span>
                  </button>
                </div>
              )}
            </div>

            {/* TERMINAL */}
            <div className="relative">
              <span 
                onClick={() => setOpenMenuDropdown(openMenuDropdown === "terminal" ? null : "terminal")}
                className={`hover:text-white cursor-pointer hover:bg-white/5 transition-all px-2.5 py-1 rounded-lg ${openMenuDropdown === "terminal" ? "text-white bg-white/10" : ""}`}
              >
                Terminal
              </span>
              {openMenuDropdown === "terminal" && (
                <div className="absolute left-0 mt-2 w-56 glass-dropdown rounded-xl shadow-2xl py-1.5 z-50 text-[10px] text-neutral-300 font-mono font-normal">
                  <button 
                    type="button"
                    onClick={() => {
                      setOpenMenuDropdown(null);
                      setIsTerminalOpen(true);
                      addLog({ type: "system", message: "🔌 Spawned terminal instance: /bin/powershell" });
                    }}
                    className="w-[calc(100%-8px)] text-left px-3.5 py-2 hover:bg-[#3279F9]/10 hover:text-white rounded-lg mx-1 transition-all flex items-center justify-between"
                  >
                    <span>New Terminal</span>
                    <span className="keycap text-[8px] scale-90 font-mono text-[7px]">Ctrl+Shift+`</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setOpenMenuDropdown(null);
                      addLog({ type: "system", message: "🔌 Split active terminal window partition." });
                    }}
                    className="w-[calc(100%-8px)] text-left px-3.5 py-2 hover:bg-[#3279F9]/10 hover:text-white rounded-lg mx-1 transition-all flex items-center justify-between"
                  >
                    <span>Split Terminal</span>
                    <span className="keycap text-[8px] scale-90 font-mono text-[7px]">Ctrl+Shift+5</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setOpenMenuDropdown(null);
                      setLogs([]);
                      addLog({ type: "system", message: "🔌 Terminal workspace registers purged." });
                    }}
                    className="w-[calc(100%-8px)] text-left px-3.5 py-2 hover:bg-[#3279F9]/10 hover:text-white rounded-lg mx-1 transition-all flex items-center justify-between"
                  >
                    <span>Kill Terminal</span>
                    <span className="keycap text-[8px] scale-90 font-mono text-[7px]">Ctrl+Shift+W</span>
                  </button>
                </div>
              )}
            </div>

            {/* HELP */}
            <div className="relative">
              <span 
                onClick={() => setOpenMenuDropdown(openMenuDropdown === "help" ? null : "help")}
                className={`hover:text-white cursor-pointer hover:bg-white/5 transition-all px-2.5 py-1 rounded-lg ${openMenuDropdown === "help" ? "text-white bg-white/10" : ""}`}
              >
                Help
              </span>
              {openMenuDropdown === "help" && (
                <div className="absolute left-0 mt-2 w-56 glass-dropdown rounded-xl shadow-2xl py-1.5 z-50 text-[10px] text-neutral-300 font-mono font-normal">
                  <button 
                    type="button"
                    onClick={() => {
                      setOpenMenuDropdown(null);
                      alert("For full support documentation, refer to: https://nexera.ai");
                    }}
                    className="w-[calc(100%-8px)] text-left px-3.5 py-2 hover:bg-[#3279F9]/10 hover:text-white rounded-lg mx-1 transition-all flex items-center justify-between"
                  >
                    <span>Online Help</span>
                    <span className="keycap text-[8px] scale-90">F1</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setOpenMenuDropdown(null);
                      addLog({ type: "system", message: "⌨️ Keyboard Shortcuts: Ctrl+L (Focus prompt), Ctrl+S (Save), Ctrl+B (Toggle Sidebar), Ctrl+` (Toggle Console), Ctrl+Alt+C (Toggle Chat sidebar)." });
                    }}
                    className="w-[calc(100%-8px)] text-left px-3.5 py-2 hover:bg-[#3279F9]/10 hover:text-white rounded-lg mx-1 transition-all flex items-center justify-between"
                  >
                    <span>Key Shortcuts</span>
                    <span className="keycap text-[8px] scale-90">Ctrl+K Ctrl+S</span>
                  </button>
                  <div className="h-[1px] bg-[#1b1c24]/60 my-1.5" />
                  <button 
                    type="button"
                    onClick={() => {
                      setOpenMenuDropdown(null);
                      alert("About Nexera IDE:\nVersion 2.5-Premium\nPowered by Nexera Autonomous Agentic Swarms.");
                    }}
                    className="w-[calc(100%-8px)] text-left px-3.5 py-2 hover:bg-[#3279F9]/10 hover:text-white rounded-lg mx-1 transition-all"
                  >
                    <span>About Nexera IDE</span>
                  </button>
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* Global window title — matches Antigravity IDE screenshot */}
        <div className="absolute left-1/2 -translate-x-1/2 hidden lg:flex items-center pointer-events-none select-none">
          <span className="text-[11px] text-[#cccccc] font-normal font-sans">
            d: · Antigravity IDE{activeTab ? ` — ${activeTab.split("/").pop()}` : ""}
          </span>
        </div>

        <div className="flex items-center gap-3" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
          {/* Top Panel Controls Toggle layout (Matches screenshot perfectly & operates layout toggles!) */}
          <div className="flex items-center gap-2 border-r border-[#3c3c3c]/70 pr-3 mr-1 text-neutral-500">
            {/* Split Editor / Two Column icon */}
            <button
              onClick={() => {
                if (activeTab) {
                  setOpenTabs(prev => [...prev.filter(t => t !== `${activeTab} (Split)`), `${activeTab} (Split)`]);
                  setActiveTab(`${activeTab} (Split)`);
                }
              }}
              title="Split Editor layout"
              className="hover:text-[#3279F9] p-1 rounded-lg hover:bg-white/5 transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
              </svg>
            </button>
            {/* Primary Sidebar Toggle */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              title="Toggle Primary Sidebar"
              className={`p-1 rounded-lg hover:bg-white/5 transition-all ${isSidebarOpen ? "text-[#3279F9]" : "hover:text-[#3279F9]"}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
                <line x1="9" y1="3" x2="9" y2="21" stroke="currentColor" strokeWidth="2" />
              </svg>
            </button>
            {/* Bottom Panel Toggle */}
            <button
              onClick={() => setIsTerminalOpen(!isTerminalOpen)}
              title="Toggle Bottom Terminal"
              className={`p-1 rounded-lg hover:bg-white/5 transition-all ${isTerminalOpen ? "text-[#3279F9]" : "hover:text-[#3279F9]"}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
                <line x1="3" y1="15" x2="21" y2="15" stroke="currentColor" strokeWidth="2" />
              </svg>
            </button>
            {/* Right Sidebar Toggle */}
            <button
              onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
              title="Toggle Right Swarm Chat Sidebar"
              className={`p-1 rounded-lg hover:bg-white/5 transition-all ${isRightSidebarOpen ? "text-[#3279F9]" : "hover:text-[#3279F9]"}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
                <line x1="15" y1="3" x2="15" y2="21" stroke="currentColor" strokeWidth="2" />
              </svg>
            </button>
          </div>
          
          <button
            onClick={() => window.location.reload()}
            className={`px-2.5 py-1 rounded text-[10px] font-sans font-medium flex items-center gap-1.5 transition-colors ${
              wsStatus === "connected"
                ? "bg-emerald-700 hover:bg-emerald-600 text-white"
                : "bg-[#252526] border border-[#3c3c3c] text-[#808080] hover:text-neutral-300"
            }`}
          >
            {wsStatus === "connected" ? "● Connected" : "Reconnect →"}
          </button>
        </div>
      </header>

      {/* Main Body Layout */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* 2. Left Activity Dock Icons (Nexera Ribbon Panel) */}
        <aside className="w-14 bg-[#333333] border-r border-[#3c3c3c]/70 flex flex-col items-center py-4 justify-between shrink-0 select-none">
          <div className="flex flex-col gap-4 items-center w-full">
            {/* Nexera "N" Logo with rotating gradient shield and neon shadow */}
            <div className="relative w-9 h-9 flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all duration-300 group/logo">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-[#3279f9] via-[#8b5cf6] to-[#00d8ff] opacity-80 blur-[2px] animate-pulse group-hover/logo:opacity-100 transition-opacity" />
              <div className="absolute inset-[1px] rounded-[10px] bg-[#08090d] flex items-center justify-center font-extrabold text-sm text-transparent bg-clip-text bg-gradient-to-br from-[#3279f9] to-[#00d8ff] shadow-inner">
                N
              </div>
            </div>
            
            <div className="h-[1px] w-6 bg-[#2F3034] my-1" />

            {/* Ribbon Buttons */}
            <button
              onClick={() => handleDockIconClick("explorer")}
              className={`w-full h-12 relative flex items-center justify-center transition-all ${isSidebarOpen && activePanel === "explorer" ? "text-[#3279F9] before:absolute before:left-0 before:w-[3px] before:h-7 before:bg-[#3279F9] before:rounded-r" : "text-[#5F7E97] hover:text-neutral-300 hover:bg-neutral-900/10"}`}
              title="Workspace Explorer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </button>

            <button
              onClick={() => handleDockIconClick("search")}
              className={`w-full h-12 relative flex items-center justify-center transition-all ${isSidebarOpen && activePanel === "search" ? "text-[#3279F9] before:absolute before:left-0 before:w-[3px] before:h-7 before:bg-[#3279F9] before:rounded-r" : "text-[#5F7E97] hover:text-neutral-300 hover:bg-neutral-900/10"}`}
              title="Workspace Search"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            <button
              onClick={() => {
                handleDockIconClick("git");
                loadGitStatus();
              }}
              className={`w-full h-12 relative flex items-center justify-center transition-all ${isSidebarOpen && activePanel === "git" ? "text-[#3279F9] before:absolute before:left-0 before:w-[3px] before:h-7 before:bg-[#3279F9] before:rounded-r" : "text-[#5F7E97] hover:text-neutral-300 hover:bg-neutral-900/10"}`}
              title="Source Control"
            >
              <div className="relative">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7a3 3 0 100-6 3 3 0 000 6zM8 7v7a4 4 0 00.5 2H10M8 14a3 3 0 100 6 3 3 0 000-6z" />
                </svg>
                {gitStatus.is_dirty && (
                  <span className="absolute -top-1 -right-1.5 w-4 h-4 rounded-full bg-[#3279F9] text-[#18191D] text-[8px] font-black flex items-center justify-center border border-[#18191D]">
                    153
                  </span>
                )}
              </div>
            </button>

            {/* Run and Debug Ribbon Button matching screenshot exactly! */}
            <button
              onClick={() => handleDockIconClick("run")}
              className={`w-full h-12 relative flex items-center justify-center transition-all ${isSidebarOpen && activePanel === "run" ? "text-[#3279F9] before:absolute before:left-0 before:w-[3px] before:h-7 before:bg-[#3279F9] before:rounded-r" : "text-[#5F7E97] hover:text-neutral-300 hover:bg-neutral-900/10"}`}
              title="Run and Debug"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            <button
              onClick={() => handleDockIconClick("extensions")}
              className={`w-full h-12 relative flex items-center justify-center transition-all ${isSidebarOpen && activePanel === "extensions" ? "text-[#3279F9] before:absolute before:left-0 before:w-[3px] before:h-7 before:bg-[#3279F9] before:rounded-r" : "text-[#5F7E97] hover:text-neutral-300 hover:bg-neutral-900/10"}`}
              title="Model Modules & Extensions"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>

            <button
              onClick={() => {
                handleDockIconClick("brain");
                loadPersonalizationPatterns();
              }}
              className={`w-full h-12 relative flex items-center justify-center transition-all ${isSidebarOpen && activePanel === "brain" ? "text-[#3279F9] before:absolute before:left-0 before:w-[3px] before:h-7 before:bg-[#3279F9] before:rounded-r" : "text-[#5F7E97] hover:text-neutral-300 hover:bg-neutral-900/10"}`}
              title="Personalization Swarm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 113.536 0V21h2v-2.172a5 5 0 003.536-3.536z" />
              </svg>
            </button>

            <button
              onClick={() => handleDockIconClick("viewport")}
              className={`w-full h-12 relative flex items-center justify-center transition-all ${isSidebarOpen && activePanel === "viewport" ? "text-[#3279F9] before:absolute before:left-0 before:w-[3px] before:h-7 before:bg-[#3279F9] before:rounded-r" : "text-[#5F7E97] hover:text-neutral-300 hover:bg-neutral-900/10"}`}
              title="OS Automate Viewport"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </button>

            {/* Agents Panel Button */}
            <button
              onClick={() => handleDockIconClick("agents")}
              className={`w-full h-12 relative flex items-center justify-center transition-all ${isSidebarOpen && activePanel === "agents" ? "text-[#3279F9] before:absolute before:left-0 before:w-[3px] before:h-7 before:bg-[#3279F9] before:rounded-r" : "text-[#5F7E97] hover:text-neutral-300 hover:bg-neutral-900/10"}`}
              title="AI Agents"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 001.357 2.059l.537.268a1.5 1.5 0 01-.448 2.84l-.293.046a1.5 1.5 0 01-1.447-1.106l-.168-.643a1.5 1.5 0 00-1.447-1.106H9.25a1.5 1.5 0 00-1.447 1.106l-.168.643A1.5 1.5 0 016.19 20.9l-.293-.046a1.5 1.5 0 01-.448-2.84l.537-.268A2.25 2.25 0 007.343 15.5M14.25 3.104c.251.023.501.05.75.082M19.5 4.5c-1.206 1.804-2.95 3.097-4.956 3.726M5 14.5l-1.086 1.086a1.5 1.5 0 001.591 2.494L6 17.5" />
              </svg>
            </button>
          </div>

          <button
            onClick={() => handleDockIconClick("settings")}
            className={`w-full h-12 relative flex items-center justify-center transition-all ${isSidebarOpen && activePanel === "settings" ? "text-[#3279F9] before:absolute before:left-0 before:w-[3px] before:h-7 before:bg-[#3279F9] before:rounded-r" : "text-[#5F7E97] hover:text-neutral-300 hover:bg-neutral-900/10"}`}
            title="Settings Hub"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </aside>

        {/* 3. Primary Sidebar Panel Drawer (Obsidian Layout) */}
        {isSidebarOpen && (
          <section className="w-72 bg-[#252526] border-r border-[#3c3c3c] flex flex-col justify-between shrink-0 overflow-hidden select-none">
          
          {/* Explorer Tab */}
          {activePanel === "explorer" && (
            <div className="flex flex-col flex-1 overflow-hidden font-mono">
              <div className="p-4 border-b border-[#3c3c3c] flex flex-col gap-2 bg-[#2d2d30]">
                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] font-bold text-[#E3E3E2] uppercase tracking-wider font-mono">Workspace Explorer</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startInlineCreate(false)}
                      title="New File"
                      className="p-1 text-neutral-400 hover:text-[#3279F9] hover:bg-neutral-900/60 rounded transition-all cursor-pointer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => startInlineCreate(true)}
                      title="New Folder"
                      className="p-1 text-neutral-400 hover:text-[#3279F9] hover:bg-neutral-900/60 rounded transition-all cursor-pointer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                      </svg>
                    </button>
                    <button
                      onClick={refreshFileTree}
                      title="Refresh Explorer"
                      className="p-1 text-neutral-400 hover:text-[#3279F9] hover:bg-neutral-900/60 rounded transition-all cursor-pointer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setCollapsedAllTrigger(prev => prev + 1)}
                      title="Collapse All Folders"
                      className="p-1 text-neutral-400 hover:text-[#3279F9] hover:bg-neutral-900/60 rounded transition-all cursor-pointer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-1 custom-scrollbar">
                {inlineCreate && inlineCreate.parentPath === "" && (
                  <InlineCreateInput
                    isDir={inlineCreate.isDir}
                    inlineCreateName={inlineCreateName}
                    setInlineCreateName={setInlineCreateName}
                    onConfirm={() => {
                      handleCreateItem(inlineCreate.parentPath, inlineCreateName, inlineCreate.isDir);
                      setInlineCreate(null);
                    }}
                    onCancel={() => setInlineCreate(null)}
                  />
                )}
                {workspaceTree.length === 0 && !inlineCreate ? (
                  <div className="text-[10px] text-neutral-600 p-3 bg-neutral-950/20 border border-[#2b2b2b] rounded-lg">
                    Workspace is empty.
                  </div>
                ) : (
                  renderTreeNodes(workspaceTree)
                )}
              </div>
            </div>
          )}

          {/* Search Tab */}
          {activePanel === "search" && (
            <div className="flex flex-col flex-1 overflow-hidden font-mono text-[10px]">
              <div className="p-4 border-b border-[#3c3c3c] bg-[#2d2d30]">
                <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest block mb-2">Scan Workspace Strings</span>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleWorkspaceQuerySearch(e.target.value)}
                    placeholder="Search query string..."
                    className="w-full bg-black border border-[#2b2b2b] rounded px-2 py-2 text-neutral-300 focus:outline-none focus:border-indigo-500"
                  />
                  {isSearching && (
                    <span className="absolute right-2.5 top-2.5 w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
              </div>
              
              <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 custom-scrollbar">
                {searchResults.length === 0 ? (
                  <span className="text-neutral-600 italic">No matches found. Enter a keyword above to scan.</span>
                ) : (
                  searchResults.map((res, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleOpenFile(res.file)}
                      className="bg-[#252526]/50 hover:bg-neutral-900/30 border border-[#2b2b2b] rounded-lg p-2.5 cursor-pointer leading-normal transition-all"
                    >
                      <div className="flex justify-between text-[8px] font-bold text-indigo-400 mb-1">
                        <span className="truncate max-w-[150px]">{res.file.split("/").pop()}</span>
                        <span className="text-neutral-600">LINE {res.line}</span>
                      </div>
                      <p className="text-[9px] text-neutral-400 truncate font-mono bg-black/40 px-1.5 py-0.5 rounded border border-[#2b2b2b]">{res.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Source Control Tab */}
          {activePanel === "git" && (
            <div className="flex flex-col flex-1 overflow-hidden font-mono text-[10px]">
              <div className="p-4 border-b border-[#3c3c3c] bg-[#2d2d30] flex flex-col gap-1">
                <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest block">Git Version Control</span>
                <span className="text-[8.5px] text-[#3279F9] font-bold uppercase">🌿 ACTIVE BRANCH: {gitStatus.branch}</span>
              </div>
              
              <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4 custom-scrollbar">
                {/* Stage Commit form */}
                <form onSubmit={handleGitCommitSubmit} className="bg-[#252526]/50 border border-[#2b2b2b] rounded-xl p-3 flex flex-col gap-2">
                  <span className="text-[8.5px] font-black text-amber-500 tracking-wider">STAGE & COMMIT</span>
                  <textarea
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    placeholder="Commit message (Ctrl+Enter)..."
                    className="w-full h-16 bg-black border border-[#2b2b2b] rounded px-2.5 py-2 text-[10px] text-neutral-300 focus:outline-none focus:border-indigo-500 resize-none font-mono"
                  />
                  <button
                    type="submit"
                    disabled={isCommitting || !commitMessage.trim()}
                    className="w-full bg-gradient-to-r from-indigo-600 to-indigo-800 hover:from-indigo-500 hover:to-indigo-700 text-white rounded py-2 font-bold font-mono tracking-wider active:scale-[0.98] transition-all disabled:opacity-40"
                  >
                    {isCommitting ? "COMMITTING..." : "COMMIT CHANGES"}
                  </button>
                </form>

                {/* Modified files list */}
                <div className="flex flex-col gap-2">
                  <span className="text-[8px] font-extrabold text-neutral-500 tracking-wider">MODIFIED FILES ({gitStatus.modified_files.length})</span>
                  <div className="flex flex-col gap-1.5">
                    {gitStatus.modified_files.length === 0 ? (
                      <span className="text-[9px] text-neutral-600 italic">No uncommitted edits. Working tree clean.</span>
                    ) : (
                      gitStatus.modified_files.map((file, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleOpenFile(file.file)}
                          className="bg-black/40 border border-[#2b2b2b]/60 rounded px-2 py-1.5 flex items-center justify-between text-[9px] cursor-pointer hover:border-neutral-800 transition-colors"
                        >
                          <span className="text-neutral-400 truncate max-w-[180px] font-mono">{file.file}</span>
                          <span className={`px-1 py-0.5 rounded font-black text-[8px] ${file.status === "M" ? "text-amber-400 bg-amber-950/20" : "text-emerald-400 bg-emerald-950/20"}`}>
                            {file.status}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Recent git log */}
                <div className="flex flex-col gap-2">
                  <span className="text-[8px] font-extrabold text-neutral-500 tracking-wider">RECENT REVISIONS LOG</span>
                  <div className="flex flex-col gap-2 max-h-40 overflow-y-auto custom-scrollbar leading-relaxed">
                    {gitStatus.recent_commits.map((commit, idx) => (
                      <div key={idx} className="border-b border-[#2b2b2b]/80 pb-1.5 last:border-0">
                        <div className="flex justify-between text-[8px] font-bold text-indigo-400">
                          <span>{commit.author}</span>
                          <span className="text-neutral-600">#{commit.commit_hash.substring(0, 7)}</span>
                        </div>
                        <p className="text-[9px] text-neutral-500 mt-0.5 font-mono">{commit.message}</p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Run and Debug Panel (Mirroring screenshot layout exactly!) */}
          {activePanel === "run" && (
            <div className="flex flex-col flex-1 overflow-hidden font-mono text-[10px]">
              <div className="p-4 border-b border-[#3c3c3c] bg-[#2d2d30] flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] font-bold text-neutral-400 uppercase tracking-widest block">Run, Debug & Self-Test Hub</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${testRunning ? "bg-[#3279F9] animate-pulse" : "bg-[#10b981]"}`} />
                    <span className="text-[7.5px] text-neutral-500 font-bold uppercase tracking-wider">Gateway Link</span>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4 custom-scrollbar bg-[#19191a]/30">
                
                {/* 1. Core Actions */}
                <div className="flex flex-col gap-2">
                  <button
                    onClick={runSelfTests}
                    disabled={testRunning}
                    className={`w-full py-2.5 font-bold font-mono tracking-wider active:scale-[0.98] transition-all rounded-lg select-none text-white ${
                      testRunning
                        ? "bg-[#1e293b] border border-neutral-800 text-neutral-400 cursor-not-allowed"
                        : "bg-[#10b981] hover:bg-[#059669] shadow-[0_0_12px_rgba(16,185,129,0.25)] hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] active:translate-y-[0.5px]"
                    }`}
                  >
                    {testRunning ? "🔄 Running Self-Tests..." : "🚀 Run Swarm Self-Tests"}
                  </button>

                  {testResults && !testResults.success && (
                    <button
                      onClick={autoHealCodebase}
                      disabled={isHealing || isExecuting}
                      className={`w-full py-2.5 font-bold font-mono tracking-wider active:scale-[0.98] transition-all rounded-lg select-none text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-[0_0_15px_rgba(217,119,6,0.3)] animate-pulse ${
                        (isHealing || isExecuting) ? "opacity-60 cursor-not-allowed" : ""
                      }`}
                    >
                      {isHealing ? "🪄 Auto-Healing Suite..." : "✨ Swarm Auto-Heal Codebase"}
                    </button>
                  )}
                </div>

                {/* 2. System Status Overview */}
                <div className="bg-[#1b1c1e] border border-[#2b2b2b] p-3.5 rounded-xl shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-[#3279F9]/5 blur-2xl rounded-full pointer-events-none" />
                  <span className="text-[8px] font-black text-neutral-500 uppercase tracking-widest block mb-2.5">
                    IDE Diagnostics Overview
                  </span>

                  {!testResults ? (
                    <div className="text-neutral-500 text-[8.5px] leading-relaxed py-1.5 flex flex-col gap-2">
                      <p>🔍 No diagnostic scans executed for active work cycle.</p>
                      <p className="text-[7.5px] opacity-70">Click &quot;Run Swarm Self-Tests&quot; to compile, check AST nodes, and discover python unittests.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {/* Health Progress Bar */}
                      <div>
                        <div className="flex items-center justify-between text-[9px] mb-1.5">
                          <span className="text-neutral-300 font-semibold uppercase">Ecosystem Health</span>
                          <span className={`font-black tracking-wider ${testResults.success ? "text-[#10b981]" : "text-[#ef4444]"}`}>
                            {testResults.tests?.total > 0
                              ? `${Math.round((testResults.tests.passed / testResults.tests.total) * 100)}% SUCCESS`
                              : testResults.success ? "100% SUCCESS" : "0% SUCCESS"}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-[#090A0D] rounded-full overflow-hidden border border-[#2c2d30]">
                          <div
                            className={`h-full transition-all duration-700 ${testResults.success ? "bg-[#10b981]" : "bg-[#ef4444]"}`}
                            style={{
                              width: testResults.tests?.total > 0
                                ? `${(testResults.tests.passed / testResults.tests.total) * 100}%`
                                : testResults.success ? "100%" : "0%"
                            }}
                          />
                        </div>
                      </div>

                      {/* Scans Grid */}
                      <div className="grid grid-cols-3 gap-2 pt-1.5 border-t border-[#2b2b2b]/50">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[7.5px] text-neutral-500 uppercase">Py AST</span>
                          <span className={`text-[9px] font-bold ${testResults.ast?.success ? "text-[#10b981]" : "text-[#ef4444]"}`}>
                            {testResults.ast?.success ? "✓ PASSED" : "✗ ERROR"}
                          </span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[7.5px] text-neutral-500 uppercase">TS React</span>
                          <span className={`text-[9px] font-bold ${testResults.tsc?.success ? "text-[#10b981]" : "text-[#ef4444]"}`}>
                            {testResults.tsc?.success ? "✓ COMPILED" : "✗ FAILED"}
                          </span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[7.5px] text-neutral-500 uppercase">Duration</span>
                          <span className="text-[9px] font-bold text-neutral-300">
                            {testResults.tests?.duration || "0.00"}s
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Discovered Test Cases Grid */}
                {testResults && testResults.tests?.tests && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-[8px] font-black text-neutral-500 uppercase tracking-widest px-0.5">
                      <span>Unit Tests ({testResults.tests.tests.length})</span>
                      
                      {/* Filter tabs */}
                      <div className="flex items-center gap-1 bg-[#090A0D]/60 p-0.5 rounded border border-[#2c2d30]">
                        <button
                          onClick={() => setActiveTestTab("all")}
                          className={`px-1.5 py-0.5 rounded text-[7px] font-mono cursor-pointer transition-all ${
                            activeTestTab === "all" ? "bg-[#3279F9] text-white" : "text-neutral-400 hover:text-neutral-200"
                          }`}
                        >
                          All
                        </button>
                        <button
                          onClick={() => setActiveTestTab("passed")}
                          className={`px-1.5 py-0.5 rounded text-[7px] font-mono cursor-pointer transition-all ${
                            activeTestTab === "passed" ? "bg-[#10b981] text-white" : "text-neutral-400 hover:text-neutral-200"
                          }`}
                        >
                          Pass
                        </button>
                        <button
                          onClick={() => setActiveTestTab("failed")}
                          className={`px-1.5 py-0.5 rounded text-[7px] font-mono cursor-pointer transition-all ${
                            activeTestTab === "failed" ? "bg-[#ef4444] text-white" : "text-neutral-400 hover:text-neutral-200"
                          }`}
                        >
                          Fail
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-0.5">
                      {testResults.tests.tests
                        .filter((t: any) => {
                          if (activeTestTab === "passed") return t.status === "passed";
                          if (activeTestTab === "failed") return t.status !== "passed";
                          return true;
                        })
                        .map((test: any, idx: number) => (
                          <div
                            key={idx}
                            className={`p-2 rounded-lg border flex items-center justify-between transition-all bg-[#0a0a0c]/40 ${
                              test.status === "passed"
                                ? "border-[#2c2d30] hover:border-[#10b981]/30"
                                : "border-[#ef4444]/30 hover:border-[#ef4444]/60 bg-[#ef4444]/5"
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className="text-neutral-500 shrink-0">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                              </svg>
                              <span className="text-neutral-300 font-bold truncate text-[8px] tracking-tight" title={test.name}>
                                {test.name.split(" ")[0]}
                              </span>
                            </div>
                            
                            <span
                              className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded tracking-widest shrink-0 ${
                                test.status === "passed"
                                  ? "bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/25"
                                  : "bg-[#ef4444]/15 text-[#ef4444] border border-[#ef4444]/25 animate-pulse"
                              }`}
                            >
                              {test.status === "passed" ? "PASS" : "FAIL"}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* 4. Logs Console Output */}
                <div className="flex flex-col gap-1.5 border-t border-[#2b2b2b]/60 pt-3.5">
                  <span className="text-[8px] font-black text-neutral-500 uppercase tracking-widest px-0.5">
                    Captured Output Logs
                  </span>
                  
                  <div className="bg-[#0a0a0c] border border-[#2b2b2b] p-3 rounded-lg font-mono text-[8px] text-[#ccd0d8] leading-relaxed max-h-36 overflow-y-auto custom-scrollbar select-text selection:bg-[#3279F9]/25 shadow-inner">
                    {testResults && testResults.tests?.logs ? (
                      <pre className="whitespace-pre-wrap">{testResults.tests.logs}</pre>
                    ) : testResults && !testResults.tsc?.success ? (
                      <div className="flex flex-col gap-1.5 text-[#ef4444]">
                        <p className="font-bold">❌ TypeScript compilation error in frontend page:</p>
                        <pre className="whitespace-pre-wrap opacity-90">{testResults.tsc.error}</pre>
                      </div>
                    ) : testResults && !testResults.ast?.success ? (
                      <div className="flex flex-col gap-1.5 text-[#ef4444]">
                        <p className="font-bold">❌ Python AST syntax evaluation error:</p>
                        {testResults.ast.errors.map((e: any, idx: number) => (
                          <div key={idx} className="border-b border-[#ef4444]/10 pb-1.5">
                            <p className="font-semibold text-neutral-300">{e.file}</p>
                            <pre className="whitespace-pre-wrap opacity-90">{e.error}</pre>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-neutral-600 block italic font-sans">Diagnostics console empty. Perform a self-test run to view stdio buffers and tracebacks.</span>
                    )}
                  </div>
                </div>

                {/* Legacy launch options as sub-options */}
                <div className="flex flex-col gap-2.5 border-t border-[#2b2b2b]/50 pt-3">
                  <span className="text-[8px] font-black text-neutral-600 uppercase tracking-widest px-0.5">Debugger Utilities</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const url = prompt("Enter URL to debug:", "http://localhost:3000");
                        if (url) {
                          addLog({ type: "system", message: `🐞 [Debugger]: Listening on headless debugging stream for target ${url}` });
                        }
                      }}
                      className="flex-1 bg-[#1e293b]/50 hover:bg-[#1e293b] border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-neutral-200 rounded py-1.5 font-bold font-mono tracking-wider active:scale-[0.98] transition-all text-center"
                    >
                      Debug URL
                    </button>
                    <button
                      onClick={() => {
                        addLog({ type: "system", message: "🐞 [Debugger]: Spawned dedicated JavaScript Debug Session." });
                      }}
                      className="flex-1 bg-[#1e293b]/50 hover:bg-[#1e293b] border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-neutral-200 rounded py-1.5 font-bold font-mono tracking-wider active:scale-[0.98] transition-all text-center"
                    >
                      JS Debug Shell
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Extensions Panel (Mirroring screenshot layout exactly!) */}
          {activePanel === "extensions" && (
            <div className="flex flex-col flex-1 overflow-hidden font-mono text-[10px]">
              <div className="p-4 border-b border-[#3c3c3c] bg-[#2d2d30] flex flex-col gap-1">
                <span className="text-[9.5px] font-bold text-neutral-400 uppercase tracking-widest block">Model Swarm Extensions</span>
                <input
                  type="text"
                  placeholder="Search Extensions..."
                  disabled
                  className="w-full bg-black/60 border border-[#3c3c3c] rounded px-2 py-1.5 text-neutral-500 select-none"
                />
                <span className="text-[8px] text-[#3279F9]/70 font-mono mt-1 block leading-tight">
                  By default, Nexera OS uses local presets in its swarm sandbox.
                </span>
              </div>
              
              <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-4 custom-scrollbar">
                
                {/* Installed Header */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[8px] font-black text-neutral-500 uppercase tracking-wider px-1">
                    <span>Installed ({extensions.length})</span>
                    <span>ACTIVE</span>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    {extensions.map((ext) => (
                      <div
                        key={ext.id}
                        onClick={() => toggleExtensionState(ext.id)}
                        className={`border rounded-lg p-2 flex items-start gap-2.5 cursor-pointer transition-all ${ext.enabled ? "bg-neutral-950/60 border-[#2b2b2b] hover:border-neutral-800" : "bg-neutral-950/20 border-neutral-950 text-neutral-600 opacity-60"}`}
                      >
                        <div className="w-6.5 h-6.5 rounded bg-indigo-950/50 flex items-center justify-center font-black text-[10px] text-indigo-400 shrink-0 border border-indigo-900/30">
                          {ext.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className={`font-black text-[9.5px] truncate ${ext.enabled ? "text-neutral-300" : "text-neutral-500"}`}>{ext.name}</span>
                            <span className="text-[7.5px] text-neutral-600 font-mono">v{ext.version}</span>
                          </div>
                          <p className="text-[8.5px] text-neutral-500 leading-snug mt-0.5 truncate">{ext.description}</p>
                          <span className="text-[7px] font-extrabold text-neutral-600 uppercase tracking-wider mt-1 block">{ext.publisher}</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={ext.enabled}
                          readOnly
                          className="w-3.5 h-3.5 rounded border-neutral-800 text-indigo-600 focus:ring-0 cursor-pointer shrink-0 mt-0.5 bg-black"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommended Header */}
                <div className="flex flex-col gap-1.5 opacity-60">
                  <span className="text-[8px] font-black text-neutral-600 uppercase tracking-wider px-1">Recommended Marketplace Presets</span>
                  <div className="bg-neutral-950/25 border border-neutral-950 rounded-lg p-2.5 flex flex-col gap-1 leading-snug">
                    <span className="font-extrabold text-[9px] text-neutral-500">Docker Integration</span>
                    <p className="text-[8.5px] text-neutral-600">Simplifies containerized deployment checks inside Docker VRAM bounds.</p>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Brain / Shorthand Personalization Panel */}
          {activePanel === "brain" && (
            <div className="flex flex-col flex-1 overflow-hidden font-mono text-[10px]">
              <div className="p-4 border-b border-[#3c3c3c] bg-[#2d2d30] flex flex-col gap-1">
                <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest block">Adaptive Personality Swarm</span>
                <span className="text-[8px] text-emerald-400 font-bold uppercase">● Spell Auto-Heal Online</span>
              </div>
              
              <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-4 custom-scrollbar">
                
                {/* Tone analytics */}
                <div className="bg-[#252526]/50 border border-[#2b2b2b] rounded-xl p-3 flex flex-col gap-2 font-mono">
                  <span className="text-[8px] font-extrabold text-indigo-400 tracking-wider">STYLE PERCEPTION REPORT</span>
                  <div className="grid grid-cols-2 gap-2 text-[8px] text-neutral-500">
                    <div className="bg-black/30 p-2 rounded border border-[#2b2b2b] flex flex-col gap-0.5">
                      <span>USER TONE</span>
                      <span className="text-[9px] font-bold text-neutral-300 truncate">{personalization.analytics.user_tone_perception}</span>
                    </div>
                    <div className="bg-black/30 p-2 rounded border border-[#2b2b2b] flex flex-col gap-0.5">
                      <span>HEALING LEVEL</span>
                      <span className="text-[9px] font-bold text-emerald-400 uppercase">{personalization.analytics.adaptation_level}</span>
                    </div>
                    <div className="bg-black/30 p-2 rounded border border-[#2b2b2b] flex flex-col gap-0.5">
                      <span>HEALS APPLIED</span>
                      <span className="text-[9px] font-bold text-amber-500">{personalization.analytics.typo_corrections_made}</span>
                    </div>
                    <div className="bg-black/30 p-2 rounded border border-[#2b2b2b] flex flex-col gap-0.5">
                      <span>SHORTHANDS OUT</span>
                      <span className="text-[9px] font-bold text-indigo-400">{personalization.analytics.shorthands_applied}</span>
                    </div>
                  </div>
                </div>

                {/* Intent Preview Box */}
                <div className="bg-[#252526]/50 border border-[#2b2b2b] rounded-xl p-3 flex flex-col gap-2">
                  <span className="text-[8px] font-extrabold text-amber-400 tracking-wider">LIVE INTENT EXPANDER TESTER</span>
                  <input
                    type="text"
                    value={previewInput}
                    onChange={(e) => testExpandPrompt(e.target.value)}
                    placeholder="mkae api for db..."
                    className="w-full bg-black border border-[#2b2b2b] rounded px-2.5 py-1.5 text-[9px] text-neutral-300 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  {previewOutput && (
                    <div className="bg-black/60 border border-[#2b2b2b] rounded p-2 text-[8.5px] font-mono leading-relaxed mt-1 flex flex-col gap-1">
                      {previewOutput.typos_corrected.length > 0 && (
                        <span className="text-amber-400 font-bold">🪄 corrected: {previewOutput.typos_corrected.join(", ")}</span>
                      )}
                      <span className="text-indigo-400 font-bold">🔮 Expanded Prompt:</span>
                      <p className="text-neutral-400 bg-[#2d2d30] p-1.5 border border-[#2b2b2b] rounded select-text">{previewOutput.expanded}</p>
                    </div>
                  )}
                </div>

                {/* Shorthands dictionary editor */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-[8px] font-extrabold text-neutral-500 tracking-wider px-1">
                    <span>SHORTHAND ALIAS DICTIONARY</span>
                    <button
                      onClick={() => {
                        const tr = prompt("Enter short trigger word (e.g., auth):");
                        const ex = prompt("Enter full expanded system prompt description:");
                        if (tr && ex) {
                          setShorthandTrigger(tr);
                          setShorthandExpansion(ex);
                          // Trigger directly
                          fetch("http://127.0.0.1:8000/api/patterns/shorthand", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ trigger: tr, expansion: ex })
                          }).then(() => loadPersonalizationPatterns());
                        }
                      }}
                      className="text-indigo-400 hover:text-indigo-300 font-bold"
                    >
                      [+] Add
                    </button>
                  </div>
                  
                  <div className="flex flex-col gap-1 max-h-48 overflow-y-auto custom-scrollbar">
                    {Object.entries(personalization.shorthands).map(([trig, exp], idx) => (
                      <div key={idx} className="bg-black/30 border border-[#3c3c3c] rounded p-2 flex items-start justify-between gap-2 group">
                        <div className="min-w-0">
                          <span className="font-extrabold text-[#3279F9] text-[9.5px]">{trig}</span>
                          <p className="text-[8.5px] text-neutral-500 leading-normal truncate max-w-[200px]" title={exp}>{exp}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteShorthand(trig)}
                          className="text-rose-500 hover:text-rose-400 font-extrabold text-[9px] transition-opacity shrink-0"
                          title="Delete Shorthand"
                        >
                          [🗑️]
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* OS Viewport Drawer */}
          {activePanel === "viewport" && (
            <div className="flex flex-col flex-1 overflow-hidden font-mono text-[10px]">
              <div className="p-4 border-b border-[#3c3c3c] bg-[#2d2d30] flex items-center justify-between">
                <span className="text-[9.5px] font-bold text-neutral-400 uppercase tracking-widest font-mono">Viewport Simulation</span>
                <button
                  onClick={handleCaptureScreen}
                  disabled={isCapturing}
                  className="text-[9px] text-[#3279F9] hover:text-indigo-300 font-bold transition-all"
                >
                  {isCapturing ? "SYNCING..." : "SYNC SCREEN"}
                </button>
              </div>
              
              <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-4 custom-scrollbar">
                
                {/* Screenshot monitor frame */}
                <div className="w-full border border-[#2b2b2b] bg-black/60 rounded-xl overflow-hidden aspect-video flex flex-col items-center justify-center relative shadow-inner group">
                  {screenshotData ? (
                    <img src={screenshotData} alt="Active Screen Frame" className="w-full h-full object-cover animate-fade-in" />
                  ) : (
                    <div className="flex flex-col items-center text-center p-3 text-neutral-600">
                      <span className="text-xl mb-1">🖥️</span>
                      <span className="text-[9px] font-mono">Viewport Dormant</span>
                    </div>
                  )}
                </div>

                {/* Simulation inputs */}
                <div className="bg-[#252526]/50 border border-[#2b2b2b] rounded-xl p-3 flex flex-col gap-3 leading-snug">
                  <span className="text-[8px] font-extrabold text-indigo-400 tracking-wider">REMOTE AUTOMATION ACTIONS</span>
                  
                  <div className="flex flex-col gap-1">
                    <label className="text-neutral-500">ACTION TYPE</label>
                    <select
                      value={automationAction}
                      onChange={(e: any) => setAutomationAction(e.target.value)}
                      className="bg-black border border-[#2b2b2b] rounded px-2 py-1.5 text-neutral-300 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="click">Simulate Mouse Click</option>
                      <option value="type">Type Keyboard String</option>
                      <option value="crawl">Browse headlessly (Playwright)</option>
                    </select>
                  </div>

                  {automationAction === "click" && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 flex flex-col gap-1">
                        <label className="text-neutral-500">COORD X</label>
                        <input
                          type="number"
                          value={automationX}
                          onChange={(e) => setAutomationX(Number(e.target.value))}
                          className="w-full bg-black border border-[#2b2b2b] rounded px-2 py-1 text-neutral-300 focus:outline-none"
                        />
                      </div>
                      <div className="flex-1 flex flex-col gap-1">
                        <label className="text-neutral-500">COORD Y</label>
                        <input
                          type="number"
                          value={automationY}
                          onChange={(e) => setAutomationY(Number(e.target.value))}
                          className="w-full bg-black border border-[#2b2b2b] rounded px-2 py-1 text-neutral-300 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {automationAction === "type" && (
                    <div className="flex flex-col gap-1">
                      <label className="text-neutral-500">TYPING TEXT STRING</label>
                      <input
                        type="text"
                        value={automationText}
                        onChange={(e) => setAutomationText(e.target.value)}
                        placeholder="Write string sequence..."
                        className="bg-black border border-[#2b2b2b] rounded px-2 py-1 text-neutral-300 focus:outline-none"
                      />
                    </div>
                  )}

                  {automationAction === "crawl" && (
                    <div className="flex flex-col gap-1">
                      <label className="text-neutral-500">TARGET CRAWL URL</label>
                      <input
                        type="text"
                        value={automationUrl}
                        onChange={(e) => setAutomationUrl(e.target.value)}
                        className="bg-black border border-[#2b2b2b] rounded px-2 py-1 text-neutral-300 focus:outline-none"
                      />
                    </div>
                  )}

                  <button
                    onClick={runAutomationSequence}
                    disabled={isAutomationRunning}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded py-2 font-bold font-mono tracking-widest shadow-lg shadow-indigo-600/10 transition-all active:scale-[0.98]"
                  >
                    {isAutomationRunning ? "RUNNING..." : "TRIGGER ACTION"}
                  </button>
                </div>

                {ocrText && (
                  <div className="bg-[#1e1e1e] border border-[#3c3c3c] rounded-xl p-3 text-[9px] font-mono text-neutral-500 leading-normal max-h-48 overflow-y-auto custom-scrollbar">
                    <span className="text-[#3279F9] font-extrabold uppercase">OCR Output Capture:</span>
                    <p className="mt-1 select-text">{ocrText}</p>
                  </div>
                )}

              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activePanel === "settings" && (
            <div className="flex flex-col flex-1 overflow-hidden font-mono text-[10px]">
              <div className="p-4 border-b border-[#3c3c3c] bg-[#2d2d30] flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9.5px] font-bold text-neutral-400 uppercase tracking-widest">Hardware Presets</span>
                  <span className="text-[8px] text-neutral-600 font-bold">REVISION VERSION: {configVersion}</span>
                </div>
                <button
                  onClick={loadConfigFromServer}
                  disabled={isLoadingConfig}
                  className="text-[9px] text-[#3279F9] hover:text-indigo-300 font-bold transition-all"
                >
                  {isLoadingConfig ? "SYNC..." : "SYNC"}
                </button>
              </div>
              
              <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4 custom-scrollbar">
                
                {/* Swarm Modelpres */}
                <div className="bg-[#252526]/50 border border-[#3c3c3c] rounded-xl p-3 flex flex-col gap-3 leading-snug">
                  <span className="text-[8px] font-extrabold text-[#3279F9] tracking-wider">SWARM LLM DETAILS</span>
                  
                  <div className="flex flex-col gap-2">
                    <label className="text-neutral-500 uppercase tracking-widest font-mono text-[7.5px]">Active Agent Processor</label>
                    <div className="flex flex-col gap-2.5 mt-1">
                      {agentsList.map((agent) => {
                        const isActive = configProvider === agent.id;
                        return (
                          <div
                            key={agent.id}
                            onClick={() => handleProviderChange(agent.id)}
                            className={`group relative overflow-hidden rounded-xl border p-3 cursor-pointer transition-all duration-300 flex flex-col gap-2 select-none active:scale-[0.98] ${
                              isActive
                                ? "bg-[#252526]/90 border-[#3279F9] shadow-[0_0_20px_rgba(50,121,249,0.15)] bg-gradient-to-br from-[#090A0D]/90 to-[#0e1726]/40"
                                : "bg-[#252526]/60 border-[#3c3c3c] hover:border-neutral-700 hover:bg-[#1e1e1e]/80"
                            }`}
                          >
                            {/* Top row: Agent Name, active dot + badge */}
                            <div className="flex justify-between items-start">
                              <div className="flex flex-col">
                                <span className={`text-[10px] font-bold tracking-wider font-mono uppercase transition-colors duration-200 ${isActive ? "text-white" : "text-neutral-400 group-hover:text-neutral-200"}`}>
                                  {agent.name}
                                </span>
                                <span className="text-[7.5px] text-neutral-600 font-bold uppercase tracking-widest mt-0.5">
                                  {agent.provider}
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "animate-pulse" : ""}`} style={{
                                  backgroundColor: agent.color,
                                  boxShadow: isActive ? `0 0 8px ${agent.color}` : "none",
                                }} />
                                <span className="text-[7.5px] px-1.5 py-0.5 rounded font-mono font-bold bg-[#16181C] text-neutral-500 uppercase">
                                  {agent.badge}
                                </span>
                              </div>
                            </div>

                            {/* Description */}
                            <p className="text-[8.5px] text-neutral-500 leading-relaxed font-mono select-text">
                              {agent.desc}
                            </p>

                            {/* Divider */}
                            <div className="h-[1px] bg-[#16181C] w-full" />

                            {/* Metrics row */}
                            <div className="flex justify-between items-center text-[7.5px] font-mono font-bold text-neutral-500 gap-1.5">
                              <div className="flex items-center gap-1">
                                <span className="text-neutral-600">⚡</span>
                                <span>LATENCY:</span>
                                <span className={isActive ? "text-indigo-400" : "text-neutral-400"}>{agent.latency}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span>📂</span>
                                <span>LIMIT:</span>
                                <span className={isActive ? "text-indigo-400" : "text-neutral-400"}>{agent.context}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span style={{ color: agent.offline ? "#10B981" : "#F59E0B" }}>●</span>
                                <span>{agent.offline ? "OFFLINE" : "CLOUD"}</span>
                              </div>
                            </div>

                            {/* Background Glow when Active */}
                            {isActive && (
                              <div
                                className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-5 pointer-events-none blur-2xl animate-pulse"
                                style={{ background: agent.color }}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-neutral-500">MODEL NAME</label>
                    <input
                      type="text"
                      value={configModelName}
                      onChange={(e) => setConfigModelName(e.target.value)}
                      className="bg-black border border-[#2b2b2b] rounded px-2 py-1 text-neutral-300 focus:outline-none focus:border-indigo-500"
                      placeholder="e.g. qwen2.5-coder:7b"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between">
                      <label className="text-neutral-500">TEMPERATURE</label>
                      <span className="text-indigo-400">{configTemp}</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.05"
                      value={configTemp}
                      onChange={(e) => setConfigTemp(parseFloat(e.target.value))}
                      className="w-full h-1 bg-neutral-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-neutral-500">MAX CONTEXT TOKENS</label>
                    <input
                      type="number"
                      value={configMaxTokens}
                      onChange={(e) => setConfigMaxTokens(parseInt(e.target.value))}
                      className="bg-black border border-[#2b2b2b] rounded px-2 py-1 text-neutral-300 focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-neutral-500">BASE URL / ENDPOINT</label>
                    <input
                      type="text"
                      value={configBaseUrl}
                      onChange={(e) => setConfigBaseUrl(e.target.value)}
                      className="bg-black border border-[#2b2b2b] rounded px-2 py-1 text-neutral-300 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Cloud keys */}
                <div className="bg-[#252526]/50 border border-[#2b2b2b] rounded-xl p-3 flex flex-col gap-3">
                  <span className="text-[8px] font-extrabold text-amber-500 tracking-wider">CLOUD INTEGRATION KEYS</span>
                  
                  <div className="flex flex-col gap-1">
                    <label className="text-neutral-500">GEMINI API KEY</label>
                    <input
                      type="password"
                      value={configGeminiKey}
                      onChange={(e) => setConfigGeminiKey(e.target.value)}
                      className="bg-black border border-[#2b2b2b] rounded px-2 py-1 text-neutral-300 focus:outline-none"
                      placeholder={configGeminiKey ? "••••••••••••••••" : "AIzaSy..."}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-neutral-500">OPENAI API KEY</label>
                    <input
                      type="password"
                      value={configOpenaiKey}
                      onChange={(e) => setConfigOpenaiKey(e.target.value)}
                      className="bg-black border border-[#2b2b2b] rounded px-2 py-1 text-neutral-300 focus:outline-none"
                      placeholder={configOpenaiKey ? "••••••••••••••••" : "sk-proj-..."}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-neutral-500">ANTHROPIC API KEY</label>
                    <input
                      type="password"
                      value={configAnthropicKey}
                      onChange={(e) => setConfigAnthropicKey(e.target.value)}
                      className="bg-black border border-[#2b2b2b] rounded px-2 py-1 text-neutral-300 focus:outline-none"
                      placeholder={configAnthropicKey ? "••••••••••••••••" : "sk-ant-..."}
                    />
                  </div>
                </div>

                {/* Host limits */}
                <div className="bg-[#252526]/50 border border-[#2b2b2b] rounded-xl p-3 flex flex-col gap-3">
                  <span className="text-[8px] font-extrabold text-indigo-400 tracking-wider">HARDWARE ALLOCATION Preset</span>
                  
                  <div className="flex flex-col gap-1">
                    <label className="text-neutral-500">TARGET GPU</label>
                    <input
                      type="text"
                      value={configGpu}
                      onChange={(e) => setConfigGpu(e.target.value)}
                      className="bg-black border border-[#2b2b2b] rounded px-2 py-1 text-neutral-300 focus:outline-none"
                      placeholder="e.g. NVIDIA RTX 4060"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-neutral-500">VRAM ALLOCATED (GB)</label>
                    <input
                      type="number"
                      value={configVram}
                      onChange={(e) => setConfigVram(parseInt(e.target.value))}
                      className="bg-black border border-[#2b2b2b] rounded px-2 py-1 text-neutral-300 focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-neutral-500">CPU</label>
                    <input
                      type="text"
                      value={configCpu}
                      onChange={(e) => setConfigCpu(e.target.value)}
                      className="bg-black border border-[#2b2b2b] rounded px-2 py-1 text-neutral-300 focus:outline-none"
                      placeholder="Intel Core i7"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex flex-col gap-1">
                      <label className="text-neutral-500">CORES</label>
                      <input
                        type="number"
                        value={configCpuCores}
                        onChange={(e) => setConfigCpuCores(parseInt(e.target.value))}
                        className="bg-black border border-[#2b2b2b] rounded px-2 py-1 text-neutral-300 focus:outline-none"
                      />
                    </div>
                    <div className="flex-1 flex flex-col gap-1">
                      <label className="text-neutral-500">RAM (GB)</label>
                      <input
                        type="number"
                        value={configRam}
                        onChange={(e) => setConfigRam(parseInt(e.target.value))}
                        className="bg-black border border-[#2b2b2b] rounded px-2 py-1 text-neutral-300 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Revision logs */}
                <div className="bg-[#252526]/50 border border-[#2b2b2b] rounded-xl p-3 flex flex-col gap-2">
                  <span className="text-[8px] font-extrabold text-[#8B5CF6] tracking-wider">CONFIG REVISIONS HISTORIC</span>
                  <div className="flex flex-col gap-2 max-h-36 overflow-y-auto custom-scrollbar text-[8.5px]">
                    {configHistory.map((item, idx) => (
                      <div key={idx} className="border-b border-[#2b2b2b] pb-1.5 last:border-0">
                        <div className="flex justify-between text-neutral-500">
                          <span className="text-[#8B5CF6] font-bold">REV #{item.version}</span>
                          <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <span className="text-neutral-400 block mt-0.5 leading-snug">{item.change}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={saveConfigToServer}
                  className="w-full bg-gradient-to-r from-indigo-600 to-indigo-800 hover:from-indigo-500 hover:to-indigo-700 text-white rounded-xl py-2.5 font-bold font-mono tracking-widest shadow-lg shadow-indigo-600/10 transition-all active:scale-[0.98]"
                >
                  SAVE CONFIG
                </button>

              </div>
            </div>
          )}

          {/* Agents Panel — Local / Gemini / Claude */}
          {activePanel === "agents" && (
            <div className="flex flex-col flex-1 overflow-hidden font-mono">
              <div className="px-4 py-2.5 border-b border-[#3c3c3c] bg-[#2d2d30] flex items-center justify-between shrink-0">
                <span className="text-[9.5px] font-bold text-[#cccccc] uppercase tracking-[1.8px]">AGENTS</span>
                <span className="text-[8px] text-[#808080]">Select active provider</span>
              </div>
              <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5 custom-scrollbar">
                {/* LOCAL OLLAMA */}
                <div onClick={() => setConfigProvider("ollama")} className={`rounded border p-3 flex flex-col gap-2 cursor-pointer transition-all ${configProvider === "ollama" ? "border-[#3279F9] bg-[#094771]/20" : "border-[#3c3c3c] bg-[#252526] hover:border-[#555555]"}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${configProvider === "ollama" ? "bg-[#3279F9] shadow-[0_0_6px_#3279F9]" : "bg-[#555555]"}`} />
                      <span className="text-[11px] font-bold text-[#d4d4d4]">Local — Ollama</span>
                    </div>
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded font-mono ${configProvider === "ollama" ? "bg-[#3279F9]/20 text-[#3279F9]" : "bg-[#2d2d30] text-[#808080]"}`}>{configProvider === "ollama" ? "● ACTIVE" : "LOCAL"}</span>
                  </div>
                  <input type="text" value={configModelName} onChange={(e) => { setConfigModelName(e.target.value); }} onClick={(e) => e.stopPropagation()} placeholder="qwen2.5-coder:7b-instruct-q4_K_M" className="bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2 py-1 text-[9.5px] text-[#d4d4d4] focus:outline-none focus:border-[#3279F9] font-mono w-full" />
                  <input type="text" value={configBaseUrl} onChange={(e) => setConfigBaseUrl(e.target.value)} onClick={(e) => e.stopPropagation()} placeholder="http://127.0.0.1:11434" className="bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2 py-1 text-[9.5px] text-[#808080] focus:outline-none focus:border-[#3279F9] font-mono w-full" />
                </div>
                {/* GEMINI */}
                <div onClick={() => { setConfigProvider("gemini"); if (!configModelName.startsWith("gemini")) setConfigModelName("gemini-2.0-flash"); }} className={`rounded border p-3 flex flex-col gap-2 cursor-pointer transition-all ${configProvider === "gemini" ? "border-[#3279F9] bg-[#094771]/20" : "border-[#3c3c3c] bg-[#252526] hover:border-[#555555]"}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${configProvider === "gemini" ? "bg-[#3279F9] shadow-[0_0_6px_#3279F9]" : "bg-[#555555]"}`} />
                      <span className="text-[11px] font-bold text-[#d4d4d4]">Gemini</span>
                      <span className="text-[8px] text-[#808080] font-mono">Google</span>
                    </div>
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded font-mono ${configProvider === "gemini" ? "bg-[#3279F9]/20 text-[#3279F9]" : "bg-[#2d2d30] text-[#808080]"}`}>{configProvider === "gemini" ? "● ACTIVE" : "CLOUD"}</span>
                  </div>
                  <select value={configProvider === "gemini" ? configModelName : "gemini-2.0-flash"} onChange={(e) => setConfigModelName(e.target.value)} onClick={(e) => e.stopPropagation()} className="bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2 py-1 text-[9.5px] text-[#d4d4d4] focus:outline-none focus:border-[#3279F9] font-mono w-full">
                    <option value="gemini-2.0-flash">gemini-2.0-flash</option>
                    <option value="gemini-1.5-pro">gemini-1.5-pro</option>
                    <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                    <option value="gemini-2.0-pro-exp">gemini-2.0-pro-exp</option>
                  </select>
                  <input type="password" value={configGeminiKey} onChange={(e) => setConfigGeminiKey(e.target.value)} onClick={(e) => e.stopPropagation()} placeholder="Gemini API Key" className="bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2 py-1 text-[9.5px] text-[#d4d4d4] focus:outline-none focus:border-[#3279F9] font-mono w-full" />
                </div>
                {/* CLAUDE */}
                <div onClick={() => { setConfigProvider("anthropic"); if (!configModelName.startsWith("claude")) setConfigModelName("claude-opus-4-7"); }} className={`rounded border p-3 flex flex-col gap-2 cursor-pointer transition-all ${configProvider === "anthropic" ? "border-[#3279F9] bg-[#094771]/20" : "border-[#3c3c3c] bg-[#252526] hover:border-[#555555]"}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${configProvider === "anthropic" ? "bg-[#3279F9] shadow-[0_0_6px_#3279F9]" : "bg-[#555555]"}`} />
                      <span className="text-[11px] font-bold text-[#d4d4d4]">Claude</span>
                      <span className="text-[8px] text-[#808080] font-mono">Anthropic</span>
                    </div>
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded font-mono ${configProvider === "anthropic" ? "bg-[#3279F9]/20 text-[#3279F9]" : "bg-[#2d2d30] text-[#808080]"}`}>{configProvider === "anthropic" ? "● ACTIVE" : "CLOUD"}</span>
                  </div>
                  <select value={configProvider === "anthropic" ? configModelName : "claude-opus-4-7"} onChange={(e) => setConfigModelName(e.target.value)} onClick={(e) => e.stopPropagation()} className="bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2 py-1 text-[9.5px] text-[#d4d4d4] focus:outline-none focus:border-[#3279F9] font-mono w-full">
                    <option value="claude-opus-4-7">claude-opus-4-7</option>
                    <option value="claude-sonnet-4-6">claude-sonnet-4-6</option>
                    <option value="claude-haiku-4-5-20251001">claude-haiku-4-5</option>
                  </select>
                  <input type="password" value={configAnthropicKey} onChange={(e) => setConfigAnthropicKey(e.target.value)} onClick={(e) => e.stopPropagation()} placeholder="Anthropic API Key" className="bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2 py-1 text-[9.5px] text-[#d4d4d4] focus:outline-none focus:border-[#3279F9] font-mono w-full" />
                </div>
              </div>
              <div className="p-3 border-t border-[#3c3c3c] shrink-0">
                <button onClick={saveConfigToServer} className="w-full bg-[#3279F9] hover:bg-[#2563eb] text-white rounded py-2 text-[10px] font-bold font-mono tracking-wider transition-colors active:scale-[0.98]">SAVE &amp; APPLY</button>
              </div>
            </div>
          )}

          {/* Active provider details */}
          <div className="p-4 border-t border-[#3c3c3c] bg-[#2d2d30] flex flex-col gap-1.5 font-mono select-none">
            <span className="text-[8px] font-bold text-neutral-500 tracking-widest">ACTIVE PROCESSOR PRESETS</span>
            <div className="flex items-center justify-between text-[9px]">
              <span className="text-[#3279F9] font-bold uppercase">{configProvider}</span>
              <span className="text-neutral-400 truncate max-w-[125px]" title={configModelName}>{configModelName}</span>
            </div>
          </div>
        </section>
      )}

        {/* 4. Center Workspace Pane (Syntax Editor / Welcome Dashboard) */}
        <section className="flex-1 flex flex-col overflow-hidden bg-[#1e1e1e] relative">
          
          {/* File Open Tabs — flat VS Code style */}
          <div className="h-9 bg-[#2d2d30] border-b border-[#252526] flex items-end overflow-x-auto shrink-0 select-none custom-scrollbar">
            {openTabs.map((tab, idx) => {
              const isActive = activeTab === tab;
              const isUnsaved = unsavedChanges[tab];
              const isStaged = pendingApproval && pendingApproval.filepath === tab;
              const ext = tab.split(".").pop()?.toLowerCase() ?? "";
              const iconColor =
                ext === "py" ? "#3B9FE8"
                : ext === "tsx" || ext === "ts" ? "#4EC9B0"
                : ext === "js" || ext === "jsx" ? "#CBCB41"
                : ext === "json" ? "#CBCB41"
                : ext === "md" ? "#519ABA"
                : ext === "css" ? "#56B6C2"
                : ext === "ps1" ? "#2472C8"
                : "#cccccc";
              const iconLabel =
                ext === "py" ? "py"
                : ext === "tsx" ? "tsx"
                : ext === "ts" ? "ts"
                : ext === "js" || ext === "jsx" ? "js"
                : ext === "json" ? "{}"
                : ext === "md" ? "md"
                : ext === "css" ? "css"
                : ext === "ps1" ? "ps1"
                : ext ?? "txt";

              return (
                <div
                  key={`${tab}-${idx}`}
                  onClick={() => setActiveTab(tab)}
                  className={`h-full px-3 flex items-center gap-1.5 cursor-pointer text-[11px] font-mono shrink-0 border-r border-[#252526] transition-colors relative group ${
                    isActive
                      ? "bg-[#1e1e1e] text-[#cccccc]"
                      : "bg-[#2d2d30] text-[#808080] hover:text-[#cccccc] hover:bg-[#1e1e1e]/60"
                  }`}
                  style={isActive ? { boxShadow: "inset 0 1px 0 #3279F9" } : {}}
                >
                  <span className="text-[9px] font-bold font-mono shrink-0" style={{ color: iconColor }}>{iconLabel}</span>
                  <span className="max-w-[100px] truncate">{tab.split("/").pop()}</span>
                  {isUnsaved && !isStaged && <span className="text-amber-400 text-[10px] leading-none">●</span>}
                  {isStaged && <span className="text-[#3279F9] text-[10px] leading-none animate-pulse">●</span>}
                  <button
                    onClick={(e) => handleCloseTab(tab, e)}
                    className="w-4 h-4 flex items-center justify-center rounded text-[10px] text-neutral-600 hover:text-neutral-200 hover:bg-neutral-700/60 transition-colors ml-0.5 opacity-0 group-hover:opacity-100 data-[active=true]:opacity-100"
                    data-active={isActive}
                  >×</button>
                </div>
              );
            })}
          </div>

          {/* Central editor workspace */}
          <div className="flex-1 flex flex-col overflow-hidden relative">
            {activeTab ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                
                {/* Dedicated Nexera Editor Header */}
                <div className="h-12 bg-[#2d2d30] border-b border-[#3c3c3c] px-5 flex items-center justify-between shrink-0 select-none">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-neutral-200">{activeTab.split("/").pop()}</span>
                    <span className="text-[9.5px] font-mono text-neutral-500">• less than a minute ago</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Split editor icon */}
                    <button
                      onClick={() => {
                        setOpenTabs(prev => [...prev.filter(t => t !== `${activeTab} (Split)`), `${activeTab} (Split)`]);
                        setActiveTab(`${activeTab} (Split)`);
                      }}
                      className="p-1.5 rounded hover:bg-neutral-900/60 text-neutral-500 hover:text-neutral-300 transition-all"
                      title="Split Editor Right"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                      </svg>
                    </button>
                    
                    {/* Review dropdown & Proceed button */}
                    <div className="flex items-center bg-[#2d2d30] border border-indigo-900/40 rounded-lg overflow-hidden p-0.5">
                      <button className="px-2.5 py-1 text-[10px] font-mono font-bold text-[#3279F9] hover:bg-indigo-950/40 transition-colors flex items-center gap-1.5">
                        <span className="text-emerald-400">✓</span> Review
                      </button>
                      <div className="w-[1px] h-3.5 bg-indigo-900/50" />
                      <button
                        onClick={() => {
                          if (pendingApproval) {
                            handleSubmitApproval("approved");
                          } else {
                            handleStartTask();
                          }
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-mono font-bold text-[10px] px-3.5 py-1 rounded-md shadow-md shadow-emerald-700/15 transition-all flex items-center gap-1"
                      >
                        Proceed ➔
                      </button>
                    </div>
                  </div>
                </div>

                {/* Breadcrumbs trail matching screenshot exactly */}
                <div className="h-8 bg-[#1e1e1e] border-b border-[#3c3c3c] px-5 flex items-center gap-1.5 text-[10px] font-mono text-[#5F7E97] shrink-0 select-none">
                  <span className="text-[#3279F9] font-bold">Nexera</span>
                  {activeTab.split("/").filter(Boolean).map((part, idx) => (
                    <React.Fragment key={idx}>
                      <span className="text-neutral-700">&gt;</span>
                      <span className={idx === activeTab.split("/").filter(Boolean).length - 1 ? "text-[#E3E3E2] font-semibold" : "text-[#5F7E97]"}>
                        {part}
                      </span>
                    </React.Fragment>
                  ))}
                  {activeTab.endsWith("testing_report.md") && (
                    <>
                      <span className="text-neutral-700">&gt;</span>
                      <span className="text-[#3279F9]/70">⛙ Nexera OS: Quality Assurance & Testing Report</span>
                      <span className="text-neutral-700">&gt;</span>
                      <span className="text-indigo-400">## 5. Model Performance & Human Preference Leaderboard</span>
                      <span className="text-neutral-700">&gt;</span>
                      <span className="text-amber-500 font-medium">### 5.2 Current Baseline & Upgrade Paths</span>
                    </>
                  )}
                </div>

                {/* CTO Review Drawer */}
                {pendingApproval && pendingApproval.filepath === activeTab && (
                  <div className="bg-gradient-to-r from-indigo-950/20 via-[#03060C] to-indigo-950/10 border-b border-indigo-900/40 px-5 py-3 flex items-center justify-between animate-fade-in shrink-0">
                    <div className="flex items-center gap-2.5 text-xs">
                      <span className="text-[#3279F9] font-black font-mono tracking-widest bg-indigo-950/50 border border-indigo-900/50 px-2.5 py-0.5 rounded shadow-[0_0_10px_rgba(50,121,249,0.1)]">
                        🛡️ CTO Review Queue
                      </span>
                      <span className="text-neutral-400 font-mono text-[9.5px]">Verify compiler integrity and approve active staged code blocks.</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={revisionNotes}
                        onChange={(e) => setRevisionNotes(e.target.value)}
                        placeholder="Add build revision notes..."
                        className="bg-black border border-[#2b2b2b] px-3 py-1.5 text-[9.5px] rounded focus:outline-none focus:border-indigo-500 text-neutral-300 w-44 placeholder:text-neutral-600 font-mono"
                      />
                      <button
                        onClick={() => handleSubmitApproval("approved")}
                        disabled={isSubmittingApproval}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold font-mono text-[9.5px] px-3.5 py-1.5 rounded transition-all"
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => handleSubmitApproval("rejected")}
                        disabled={isSubmittingApproval}
                        className="bg-rose-950/20 border border-rose-900/30 hover:bg-rose-900/20 text-rose-400 font-bold font-mono text-[9.5px] px-3.5 py-1.5 rounded transition-all"
                      >
                        ✗ Reject
                      </button>
                    </div>
                  </div>
                )}

                {/* Premium Monaco Editor Container */}
                <div className="flex-1 min-h-0 w-full relative bg-[#1e1e1e] border-t border-neutral-900/40">
                  {activeTab ? (
                    <Editor
                      height="100%"
                      width="100%"
                      theme="vs-dark"
                      language={getLanguageFromPath(activeTab)}
                      value={fileContents[activeTab] || ""}
                      onChange={(value) => handleContentChange(activeTab, value || "")}
                      onMount={(editor, monaco) => {
                        // Explicitly register Ctrl+S save shortcut command inside Monaco focus
                        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
                          if (activeTab) {
                            handleSaveFile(activeTab);
                          }
                        });
                      }}
                      options={{
                        fontSize: 12,
                        lineHeight: 18,
                        minimap: { enabled: false },
                        scrollbar: {
                          vertical: "visible",
                          horizontal: "visible",
                          verticalScrollbarSize: 10,
                          horizontalScrollbarSize: 10,
                          useShadows: false
                        },
                        fontFamily: "var(--font-mono), Consolas, Monaco, monospace",
                        wordWrap: "on",
                        automaticLayout: true,
                        padding: { top: 12 },
                        cursorBlinking: "smooth",
                        cursorSmoothCaretAnimation: "on",
                        renderLineHighlight: "all",
                        selectionHighlight: true,
                        matchBrackets: "always",
                        autoClosingBrackets: "always",
                        tabSize: 4,
                        insertSpaces: true
                      }}
                    />
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-neutral-500 font-mono text-xs">
                      No active document open. Select a file from the explorer pane.
                    </div>
                  )}
                </div>

                {/* Floating active block indicator for pending approval matching screenshot perfectly */}
                {pendingApproval && pendingApproval.filepath === activeTab && (
                  <div className="absolute top-32 right-8 bg-[#2d2d30]/95 border border-emerald-500/30 rounded-lg px-3 py-2 flex items-center gap-3 shadow-xl z-20 font-mono text-[9px] backdrop-blur-sm">
                    <span className="text-emerald-400 font-bold">🪄 Staged Code Block</span>
                    <button
                      onClick={() => handleSubmitApproval("approved")}
                      className="bg-emerald-950/40 hover:bg-emerald-900/30 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded transition-all"
                    >
                      Accept <span className="text-[7.5px] text-neutral-500 font-bold font-semibold">Alt+A</span>
                    </button>
                    <button
                      onClick={() => handleSubmitApproval("rejected")}
                      className="bg-[#1c1917] hover:bg-rose-950/20 text-[#5F7E97] hover:text-rose-400 border border-neutral-800 px-2 py-0.5 rounded transition-all"
                    >
                      Reject <span className="text-[7.5px] text-neutral-500 font-bold font-semibold">Shift+Alt+X</span>
                    </button>
                  </div>
                )}

                {/* Sticky bottom floating overlay for CTO approvals matching screenshot perfectly */}
                {pendingApproval && pendingApproval.filepath === activeTab && (
                  <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-[#2d2d30]/95 backdrop-blur-md border border-neutral-800 rounded-full px-5 py-2.5 flex items-center gap-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)] z-20 font-mono text-[10px] select-none">
                    <button
                      onClick={() => handleSubmitApproval("approved")}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-4 py-1.5 font-bold shadow-lg shadow-emerald-700/20 active:scale-[0.96] transition-all flex items-center gap-1.5"
                    >
                      Accept Changes <span className="bg-emerald-800 px-1.5 py-0.5 rounded text-[8px] font-bold">Ctrl+d</span>
                    </button>
                    <button
                      onClick={() => handleSubmitApproval("rejected")}
                      className="bg-[#1e293b]/80 border border-neutral-800 hover:bg-rose-950/20 text-[#5F7E97] hover:text-rose-400 rounded-full px-4 py-1.5 font-bold active:scale-[0.96] transition-all flex items-center gap-1.5"
                    >
                      Reject <span className="bg-neutral-850 px-1.5 py-0.5 rounded text-[8px] font-bold">Ctrl+-</span>
                    </button>
                    <div className="w-[1px] h-3.5 bg-neutral-800" />
                    <div className="flex items-center gap-1.5 text-neutral-500 text-[9px]">
                      <span className="bg-neutral-900 border border-neutral-850 px-1.5 py-0.5 rounded font-bold">↑ Alt+K</span>
                      <span className="bg-neutral-900 border border-neutral-850 px-1.5 py-0.5 rounded font-bold">↓ Alt+J</span>
                    </div>
                  </div>
                )}

                {/* Editor Footer */}
                <div className="h-7 bg-[#252526] border-t border-[#2b2b2b] px-5 py-1 flex items-center justify-between text-[9px] font-mono text-neutral-500 shrink-0 select-none">
                  <span>workspace / {activeTab}</span>
                  <div className="flex items-center gap-5">
                    {unsavedChanges[activeTab] && (
                      <span className="text-amber-500 font-bold tracking-wide animate-pulse">• UNSAVED CHANGES (CTRL+S)</span>
                    )}
                    <span>UTF-8</span>
                    <span>PYTHON SWARM DIRECTIVE</span>
                  </div>
                </div>

              </div>
            ) : (
              /* Pixel perfect Welcome Dashboard for Nexera OS */
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 select-none bg-radial-glow relative bg-[#1e1e1e]">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl" />
                
                {/* Nexera stylized N logo with a high-fidelity glowing ring */}
                <div className="relative mb-6 group/welcome flex items-center justify-center">
                  <div className="absolute w-28 h-28 rounded-full bg-gradient-to-tr from-[#3279f9] to-[#00d8ff] opacity-10 blur-2xl animate-pulse" />
                  <svg viewBox="0 0 100 100" className="w-24 h-24 text-[#3279F9] drop-shadow-[0_0_35px_rgba(50,121,249,0.6)] hover:scale-105 active:scale-95 transition-all duration-500">
                    <defs>
                      <linearGradient id="nexeraGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#3279F9" />
                        <stop offset="50%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#00d8ff" />
                      </linearGradient>
                    </defs>
                    <path d="M25 15 H40 L60 65 V15 H75 V85 H60 L40 35 V85 H25 Z" fill="url(#nexeraGrad)" />
                  </svg>
                </div>
                
                <h1 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-neutral-200 via-[#E3E3E2] to-neutral-400 tracking-[0.25em] uppercase font-mono drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]">
                  Nexera OS
                </h1>
                
                {/* Visual Welcome shortcuts with 3D mechanical keycaps */}
                <div className="mt-8 flex flex-col gap-4 max-w-sm w-full font-mono text-[10px]">
                  <div className="flex items-center justify-between bg-[#252526]/50 border border-[#3c3c3c]/70 px-4 py-3 rounded-lg hover:border-neutral-800 transition-colors">
                    <span className="text-neutral-400 font-bold">Code with Swarm Agent</span>
                    <button
                      onClick={() => promptInputRef.current?.focus()}
                      className="bg-indigo-950/40 border border-[#3c3c3c]/70 hover:bg-indigo-900/30 text-indigo-400 font-bold px-3 py-1 rounded shadow-inner transition-all hover:scale-[1.02]"
                    >
                      Code with Agent
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between bg-[#252526]/50 border border-[#3c3c3c]/70 px-4 py-3 rounded-lg hover:border-neutral-800 transition-colors">
                    <span className="text-neutral-400 font-bold">Focus Swarm Command Panel</span>
                    <div className="flex items-center gap-1.5 select-none pr-1">
                      <kbd className="keycap">Ctrl</kbd>
                      <span className="text-neutral-600 text-[8px] font-bold">+</span>
                      <kbd className="keycap">L</kbd>
                    </div>
                  </div>
                </div>

                <p className="text-[9.5px] text-neutral-600 max-w-xs mt-8 leading-relaxed font-mono">
                  Select editable python targets in explorer, manage active source commits, or prompt swarm agents to build host architectures.
                </p>
              </div>
            )}
          </div>

          {/* Bottom Console terminal */}
          {isTerminalOpen && (
            <div className="h-44 bg-[#2d2d30] border-t border-[#2b2b2b] flex flex-col overflow-hidden shrink-0">
              {/* Bottom panel tab bar — VS Code style */}
              <div className="h-9 border-b border-[#252526] bg-[#252526] flex items-end justify-between px-2 shrink-0 select-none">
                <div className="flex items-end h-full">
                  {/* Problems tab */}
                  <button
                    onClick={() => setActiveConsoleTab("system")}
                    className={`h-full px-3.5 flex items-center gap-1.5 text-[11px] font-mono border-r border-[#1e1e1e]/0 transition-colors relative ${
                      activeConsoleTab === "system"
                        ? "text-[#cccccc] bg-[#1e1e1e]"
                        : "text-[#808080] hover:text-[#cccccc]"
                    }`}
                    style={activeConsoleTab === "system" ? { boxShadow: "inset 0 1px 0 #3279F9" } : {}}
                  >
                    Problems
                    <span className={`text-[9px] px-1 rounded font-bold ${activeConsoleTab === "system" ? "bg-[#3279F9]/20 text-[#3279F9]" : "bg-neutral-700 text-neutral-400"}`}>
                      {logs.filter(l => l.type === "error").length || 0}
                    </span>
                  </button>
                  {/* Output tab */}
                  <button
                    onClick={() => setActiveConsoleTab("output")}
                    className={`h-full px-3.5 flex items-center text-[11px] font-mono transition-colors relative ${activeConsoleTab === "output" ? "text-[#cccccc] bg-[#1e1e1e]" : "text-[#808080] hover:text-[#cccccc]"}`}
                    style={activeConsoleTab === "output" ? { boxShadow: "inset 0 1px 0 #3279F9" } : {}}
                  >Output</button>
                  {/* Debug Console tab */}
                  <button
                    onClick={() => setActiveConsoleTab("debug")}
                    className={`h-full px-3.5 flex items-center text-[11px] font-mono transition-colors relative ${activeConsoleTab === "debug" ? "text-[#cccccc] bg-[#1e1e1e]" : "text-[#808080] hover:text-[#cccccc]"}`}
                    style={activeConsoleTab === "debug" ? { boxShadow: "inset 0 1px 0 #3279F9" } : {}}
                  >Debug Console</button>
                  {/* Terminal tab */}
                  <button
                    onClick={() => setActiveConsoleTab("powershell")}
                    className={`h-full px-3.5 flex items-center text-[11px] font-mono transition-colors relative ${
                      activeConsoleTab === "powershell"
                        ? "text-[#cccccc] bg-[#1e1e1e]"
                        : "text-[#808080] hover:text-[#cccccc]"
                    }`}
                    style={activeConsoleTab === "powershell" ? { boxShadow: "inset 0 1px 0 #3279F9" } : {}}
                  >
                    Terminal
                  </button>
                  {/* Ports tab */}
                  <button
                    onClick={() => setActiveConsoleTab("ports")}
                    className={`h-full px-3.5 flex items-center text-[11px] font-mono transition-colors relative ${activeConsoleTab === "ports" ? "text-[#cccccc] bg-[#1e1e1e]" : "text-[#808080] hover:text-[#cccccc]"}`}
                    style={activeConsoleTab === "ports" ? { boxShadow: "inset 0 1px 0 #3279F9" } : {}}
                  >Ports</button>
                </div>
                {/* Right-side actions */}
                <div className="flex items-center gap-2 pb-1.5 text-[#808080]">
                  {activeConsoleTab === "powershell" && (
                    <button
                      onClick={() => {
                        if (terminalSocketRef.current) {
                          terminalSocketRef.current.send(JSON.stringify({ type: "terminal_reset" }));
                        }
                        setTerminalBuffer("");
                      }}
                      className="text-[10px] hover:text-neutral-300 font-mono transition-colors flex items-center gap-1"
                      title="Reset PowerShell session"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (activeConsoleTab === "system") setLogs([]);
                      else if (activeConsoleTab === "output") setLogs(prev => prev.filter(l => l.type !== "system" && l.type !== "success"));
                      else if (activeConsoleTab === "debug") setLogs(prev => prev.filter(l => l.type !== "agent"));
                      else if (activeConsoleTab === "powershell") setTerminalBuffer("");
                    }}
                    className="text-[10px] hover:text-neutral-300 font-mono transition-colors px-1.5 py-0.5 rounded hover:bg-neutral-700/40"
                    title="Clear"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                  <span className="text-[9px] font-mono text-neutral-600 pr-1 select-none">
                    {activeConsoleTab === "powershell" ? "PowerShell Extension" : "Nexera Swarm"}
                  </span>
                </div>
              </div>
              
              {activeConsoleTab === "system" ? (
                <div className="flex-1 p-4 overflow-y-auto font-mono text-[9.5px] leading-relaxed flex flex-col gap-1.5 bg-[#1e1e1e] select-text custom-scrollbar font-mono">
                  {logs.length === 0 ? (
                    <span className="text-neutral-700 tracking-wide">Shell Console active. Awaiting swarm log inputs...</span>
                  ) : (
                    logs.map((log, index) => {
                      const isSuccess = log.type === "success" || 
                                        (log.message && (
                                          log.message.toLowerCase().includes("success") || 
                                          log.message.toLowerCase().includes("passed") ||
                                          log.message.toLowerCase().includes("completed")
                                        ));
                      if (log.type === "error") {
                        return (
                          <div key={index} className="text-rose-400 border-l-2 border-rose-600 pl-3.5 bg-rose-950/10 py-0.5 font-mono">
                            {log.message}
                          </div>
                        );
                      } else if (isSuccess) {
                        return (
                          <div key={index} className="text-emerald-400 border-l-2 border-emerald-500 pl-3.5 bg-emerald-950/10 py-0.5 font-mono">
                            {log.message}
                          </div>
                        );
                      } else if (log.type === "system") {
                        return (
                          <div key={index} className="text-amber-400 border-l-2 border-amber-500/50 pl-3.5 bg-amber-950/5 py-0.5 font-mono">
                            {log.message}
                          </div>
                        );
                      } else if (log.type === "agent") {
                        let agentStyle = "border-l-2 border-indigo-500/50 bg-[#252526]/50 text-indigo-300";
                        if (log.agent === "CEO") {
                          agentStyle = "border-l-2 border-violet-500/80 bg-violet-950/10 text-violet-300";
                        } else if (log.agent === "Engineer") {
                          agentStyle = "border-l-2 border-sky-500/80 bg-sky-950/10 text-sky-300";
                        } else if (log.agent === "QA") {
                          agentStyle = "border-l-2 border-emerald-500/80 bg-emerald-950/10 text-emerald-300";
                        }
                        return (
                          <div key={index} className={`font-mono px-3 py-1.5 rounded-r-lg my-0.5 max-w-3xl ${agentStyle}`}>
                            <span className="font-extrabold tracking-wider uppercase">[{log.agent}]: </span>
                            {log.message}
                          </div>
                        );
                      }
                      return null;
                    })
                  )}
                  <div ref={terminalEndRef} />
                </div>
              ) : activeConsoleTab === "output" ? (
                <div className="flex-1 p-4 overflow-y-auto font-mono text-[9.5px] leading-relaxed flex flex-col gap-1 bg-[#1e1e1e] select-text custom-scrollbar">
                  {logs.filter(l => l.type === "system" || l.type === "success").length === 0
                    ? <span className="text-neutral-700">No output yet. Run a task to see output here.</span>
                    : logs.filter(l => l.type === "system" || l.type === "success").map((l, i) => (
                      <div key={i} className={`pl-3 border-l-2 py-0.5 ${l.type === "success" ? "border-emerald-500 text-emerald-400" : "border-neutral-700 text-neutral-300"}`}>{l.message}</div>
                    ))
                  }
                  <div ref={terminalEndRef} />
                </div>
              ) : activeConsoleTab === "debug" ? (
                <div className="flex-1 p-4 overflow-y-auto font-mono text-[9.5px] leading-relaxed flex flex-col gap-1 bg-[#1e1e1e] select-text custom-scrollbar">
                  {logs.filter(l => l.type === "agent").length === 0
                    ? <span className="text-neutral-700">No agent traces yet. Start a swarm task to see debug output.</span>
                    : logs.filter(l => l.type === "agent").map((l, i) => {
                        const color = l.agent === "CEO" ? "border-violet-500 text-violet-300" : l.agent === "Engineer" ? "border-sky-500 text-sky-300" : "border-emerald-500 text-emerald-300";
                        return <div key={i} className={`pl-3 border-l-2 py-0.5 ${color}`}><span className="font-bold uppercase">[{l.agent}]</span> {l.message}</div>;
                      })
                  }
                  <div ref={terminalEndRef} />
                </div>
              ) : activeConsoleTab === "ports" ? (
                <div className="flex-1 p-4 overflow-y-auto font-mono text-[9.5px] leading-relaxed bg-[#1e1e1e] select-text custom-scrollbar">
                  <table className="w-full text-[9.5px] font-mono border-collapse">
                    <thead><tr className="text-neutral-500 border-b border-[#2d2d30] text-left"><th className="py-1.5 pr-6">Port</th><th className="pr-6">Address</th><th className="pr-6">Running Process</th><th>Action</th></tr></thead>
                    <tbody>
                      <tr className="border-b border-[#2d2d30] text-neutral-300"><td className="py-1.5 pr-6 text-[#3279F9] font-bold">8000</td><td className="pr-6">127.0.0.1:8000</td><td className="pr-6 text-emerald-400">● Nexera Backend (FastAPI)</td><td><span className="text-[9px] bg-emerald-900/30 text-emerald-400 px-2 py-0.5 rounded">ACTIVE</span></td></tr>
                      <tr className="border-b border-[#2d2d30] text-neutral-300"><td className="py-1.5 pr-6 text-[#3279F9] font-bold">3000</td><td className="pr-6">localhost:3000</td><td className="pr-6 text-emerald-400">● Next.js Dev Server</td><td><span className="text-[9px] bg-emerald-900/30 text-emerald-400 px-2 py-0.5 rounded">ACTIVE</span></td></tr>
                      <tr className="text-neutral-300"><td className="py-1.5 pr-6 text-neutral-600">11434</td><td className="pr-6">127.0.0.1:11434</td><td className="pr-6 text-neutral-500">Ollama LLM Server</td><td><span className="text-[9px] bg-neutral-800 text-neutral-500 px-2 py-0.5 rounded">OPTIONAL</span></td></tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div
                  onClick={() => powershellInputRef.current?.focus()}
                  className="flex-1 p-4 overflow-y-auto font-mono text-[9.5px] leading-normal bg-[#1e1e1e] select-text custom-scrollbar font-mono flex flex-col cursor-text"
                >
                  <pre className="whitespace-pre-wrap text-neutral-300 leading-relaxed font-mono">
                    {terminalBuffer || "Initializing PowerShell secure stream...\n"}
                  </pre>
                  <div className="flex items-center gap-1.5 mt-1 shrink-0">
                    <span className="text-[#3279F9] font-bold select-none">PS &gt;</span>
                    <input
                      ref={powershellInputRef}
                      type="text"
                      value={terminalInput}
                      onChange={(e) => setTerminalInput(e.target.value)}
                      onKeyDown={handleTerminalKeyDown}
                      placeholder="Type a PowerShell command and hit Enter (e.g. dir, Get-Process)..."
                      className="flex-1 bg-transparent border-none outline-none text-[#00d8ff] font-mono text-[9.5px] p-0 focus:ring-0"
                      autoFocus
                    />
                  </div>
                  <div ref={terminalEndRef} />
                </div>
              )}
            </div>
          )}

        </section>

        {/* 5. Right-Hand Swarm Chat Sidebar (Accordion DX style) */}
        {showHistoryPanel && <div className="fixed inset-0 z-40" onClick={() => setShowHistoryPanel(false)} />}
        {isRightSidebarOpen && (
          <section className="w-80 bg-[#252526] border-l border-[#2b2b2b] flex flex-col overflow-hidden shrink-0 select-none">
            
            {/* Right panel header — VS Code Antigravity style */}
            <div className="h-9 border-b border-[#252526] bg-[#252526] flex items-center justify-between px-3 shrink-0 select-none relative">
              <button
                onClick={() => setShowHistoryPanel(p => !p)}
                className="text-[11px] font-semibold text-[#cccccc] font-mono truncate flex items-center gap-1.5 hover:text-white transition-colors min-w-0"
              >
                <span className="truncate">
                  {convSessions.find(s => s.id === activeSessionId)?.title || "Nexera Autonomous OS Bootstrap"}
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className={`text-neutral-500 shrink-0 transition-transform ${showHistoryPanel ? "rotate-180" : ""}`}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
              </button>

              {/* History dropdown */}
              {showHistoryPanel && (
                <div className="absolute top-9 left-0 right-0 z-50 bg-[#1e1e1e] border border-[#3c3c3c] shadow-2xl max-h-72 overflow-y-auto custom-scrollbar">
                  {convSessions.length === 0 ? (
                    <div className="px-4 py-6 text-center text-[10px] text-neutral-600 font-mono">No saved conversations yet.<br/>Click + to start a new one.</div>
                  ) : (
                    convSessions.slice().reverse().map((s) => (
                      <div
                        key={s.id}
                        onClick={() => { setChatMessages(s.messages); setActiveSessionId(s.id); setShowHistoryPanel(false); }}
                        className={`flex items-center justify-between px-3 py-2.5 cursor-pointer border-b border-[#2d2d30] hover:bg-[#2a2d2e] transition-colors group ${s.id === activeSessionId ? "bg-[#252526]" : ""}`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-5 h-5 rounded bg-[#3279F9]/20 flex items-center justify-center shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="#3279F9" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3v-3z" /></svg>
                          </div>
                          <div className="min-w-0">
                            <div className="text-[10px] text-[#cccccc] font-mono truncate max-w-[160px]">{s.title}</div>
                            <div className="text-[9px] text-neutral-600 font-mono">{new Date(s.ts).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                          </div>
                        </div>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            try { await fetch(`http://127.0.0.1:8000/api/conversations/${s.id}`, { method: "DELETE" }); } catch { /* offline */ }
                            setConvSessions(p => p.filter(x => x.id !== s.id));
                            if (s.id === activeSessionId) { setChatMessages([]); setActiveSessionId("default"); }
                          }}
                          className="opacity-0 group-hover:opacity-100 text-[10px] text-rose-500 hover:text-rose-400 px-1 transition-all shrink-0"
                          title="Delete conversation"
                        >🗑</button>
                      </div>
                    ))
                  )}
                </div>
              )}

              <div className="flex items-center gap-0.5 text-[#808080] shrink-0">
                {/* New conversation */}
                <button
                  onClick={async () => {
                    if (chatMessages.length > 0) {
                      const firstUser = chatMessages.find((m: any) => m.role === "user");
                      const title = firstUser?.content?.slice(0, 60) || "Conversation";
                      try {
                        const res = await fetch("http://127.0.0.1:8000/api/conversations", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ project_name: projectName, title, messages: chatMessages })
                        });
                        if (res.ok) {
                          const { id } = await res.json();
                          setConvSessions(p => [{ id, title, messages: chatMessages, ts: Date.now(), project: projectName }, ...p]);
                          setActiveSessionId(id);
                        }
                      } catch { /* offline — fall back to local */ }
                    }
                    setChatMessages([]);
                    setShowHistoryPanel(false);
                  }}
                  title="New conversation (saves current)"
                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-neutral-700/60 hover:text-neutral-300 transition-colors text-[13px] font-light"
                >+</button>
                {/* Reload history */}
                <button
                  onClick={() => fetchConversations()}
                  title="Reload conversation history from database"
                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-neutral-700/60 hover:text-neutral-300 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                </button>
                {/* Speech Mute/Unmute Toggle */}
                <button
                  onClick={() => {
                    const nextMuted = !isMuted;
                    setIsMuted(nextMuted);
                    if (nextMuted) {
                      window.speechSynthesis?.cancel();
                    } else {
                      if (typeof window !== "undefined" && window.speechSynthesis) {
                        const utterance = new SpeechSynthesisUtterance("Voice synthesis active");
                        utterance.rate = 1.05;
                        window.speechSynthesis.speak(utterance);
                      }
                    }
                  }}
                  title={isMuted ? "Unmute Swarm Speech (AI Text-To-Speech)" : "Mute Swarm Speech (AI Text-To-Speech)"}
                  className={`w-6 h-6 flex items-center justify-center rounded hover:bg-neutral-700/60 transition-colors ${isMuted ? "text-neutral-500" : "text-[#00d8ff] font-bold"}`}
                >
                  {isMuted ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l4-4m0 4l-4-4" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  )}
                </button>
                {/* Close right panel */}
                <button
                  onClick={() => setIsRightSidebarOpen(false)}
                  title="Close panel"
                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-neutral-700/60 hover:text-neutral-300 transition-colors text-[13px]"
                >×</button>
              </div>
            </div>

            {/* Project memory context bar */}
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[#2b2b2b] bg-[#1e1e1e]/60 shrink-0">
              <span className="text-[9px] text-neutral-600 font-mono uppercase tracking-wider shrink-0">Project:</span>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                onBlur={() => fetchConversations(projectName)}
                onKeyDown={(e) => { if (e.key === "Enter") { fetchConversations(projectName); (e.target as HTMLInputElement).blur(); } }}
                className="flex-1 bg-transparent text-[10px] font-mono text-[#3279F9] border-b border-transparent focus:border-[#3279F9]/50 outline-none px-0.5 min-w-0"
                placeholder="default"
              />
              <span className="text-[8px] text-neutral-700 font-mono shrink-0">{convSessions.length} saved</span>
            </div>

            <div className="flex-1 p-4 flex flex-col justify-between overflow-hidden">

              {/* Message scroll container */}
              <div className="flex-1 overflow-y-auto flex flex-col gap-4 pr-1 custom-scrollbar pb-4 select-text">
                
                {/* Voice indicator waveform visualizer if microphone is active */}
                {isListening && (
                  <div className="bg-black/80 border border-[#3279F9]/30 rounded-xl p-3 flex flex-col items-center justify-center relative overflow-hidden shadow-inner shrink-0 aspect-video select-none">
                    <canvas ref={canvasRef} width="220" height="70" className="w-full h-full" />
                    <span className="absolute bottom-2.5 right-2.5 bg-emerald-950/40 border border-emerald-900/60 text-emerald-400 px-2 py-0.5 rounded text-[8px] font-mono font-bold tracking-widest animate-pulse">
                      ● MIC MONITOR ACTIVE
                    </span>
                  </div>
                )}

                {/* CEO agent blueprint logs */}
                {isExecuting && (
                  <div className="bg-indigo-950/10 border border-indigo-900/30 rounded-xl p-3 flex flex-col gap-2 shrink-0 select-none">
                    <span className="text-[8.5px] font-black text-indigo-400 tracking-wider">SWARM RESOLUTION STEPS</span>
                    <div className="flex flex-col gap-1 text-[9px] font-mono text-neutral-400">
                      <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" /> CEO: Decomposing host blueprint...</span>
                      <span className="flex items-center gap-1.5 text-neutral-600">● Engineer: Awaiting planner triggers...</span>
                      <span className="flex items-center gap-1.5 text-neutral-600">● QA: Awaiting code build compile passes...</span>
                    </div>
                  </div>
                )}

                {/* Dynamic Chat Messages */}
                {chatMessages.map((msg) => (
                  <div key={msg.id} className={`flex flex-col gap-1.5 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                    
                    {/* User message styling */}
                    {msg.role === "user" ? (
                      <div className="flex items-end gap-2 max-w-[85%]">
                        <div className="bg-[#131F37] border border-[#1E3050] rounded-2xl rounded-tr-none px-3.5 py-2 text-[10px] font-mono text-[#E2EAF8] shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
                          {msg.content}
                        </div>
                        <div className="w-5 h-5 rounded-full bg-[#3279F9]/20 border border-[#3279F9]/40 flex items-center justify-center font-bold text-[8px] text-[#3279F9] shrink-0 font-mono select-none">
                          U
                        </div>
                      </div>
                    ) : (
                      // Assistant message styling
                      <div className="flex flex-col gap-3 w-full">
                        {/* Text Content */}
                        {msg.content && (
                          <div className="flex items-start gap-2 max-w-[90%] group">
                            <div className="w-5 h-5 rounded-full bg-indigo-950/50 border border-indigo-900/40 flex items-center justify-center font-bold text-[8px] text-[#00d8ff] shrink-0 font-mono select-none">
                              N
                            </div>
                            <div className="relative text-[10px] font-mono text-[#C9D1D9] leading-relaxed whitespace-pre-line bg-[#2d2d30]/80 border border-[#3c3c3c]/80 rounded-2xl rounded-tl-none px-3.5 py-2 shadow-sm pr-8">
                              {msg.content}
                              <button
                                onClick={() => speakResponse(msg.content, true)}
                                title="Read message aloud"
                                className="absolute right-2 top-2 text-[#808080] hover:text-[#00d8ff] opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Artifact Card rendering */}
                        {msg.hasArtifact && (
                          <div className="bg-gradient-to-br from-[#040810] to-[#02050A] border border-indigo-950 rounded-xl p-3 shadow-xl flex flex-col gap-2.5 max-w-[92%] ml-7">
                            <div className="flex items-center justify-between border-b border-[#2b2b2b]/80 pb-2">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-indigo-400">📝</span>
                                <span className="text-[9px] font-bold text-neutral-300 font-mono tracking-wide">{msg.artifactTitle}</span>
                              </div>
                              <span className="text-[8px] bg-indigo-950 text-indigo-400 border border-indigo-900/30 px-1.5 py-0.5 rounded font-mono select-none">
                                Reviewing
                              </span>
                            </div>
                            <p className="text-[8.5px] font-mono text-neutral-500 leading-relaxed">
                              {msg.artifactSummary}
                            </p>
                            <div className="flex items-center justify-between text-[8px] font-mono text-neutral-600 bg-neutral-950/30 p-1.5 rounded border border-[#2b2b2b]">
                              <span>98% MATCH</span>
                              <span>1 NEW FILE</span>
                              <span>0 DELETED</span>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => addLog({ type: "system", message: "🛡️ Swarm Artifact Accepted by User" })}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded py-1.5 text-[8.5px] font-bold font-mono transition-all active:scale-[0.98]"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => addLog({ type: "system", message: "🛡️ Swarm Artifact Rejected by User" })}
                                className="flex-1 bg-rose-950/20 hover:bg-rose-900/20 border border-rose-900/30 text-rose-400 rounded py-1.5 text-[8.5px] font-bold font-mono transition-all active:scale-[0.98]"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Execution Trace rendering with nested Accordions */}
                        {msg.isExecutionTrace && (
                          <div className="flex flex-col gap-2 w-full pl-7">
                            
                            {/* Accordion 1: File Traversal */}
                            <div className="border border-[#2b2b2b] bg-[#2d2d30]/40 rounded-lg overflow-hidden transition-all">
                              <button
                                onClick={() => toggleCard("explored")}
                                className="w-full px-3 py-2 flex items-center justify-between font-mono text-[9px] font-bold text-neutral-400 hover:bg-neutral-900/40"
                              >
                                <span className="flex items-center gap-1.5">📂 Explored 1 file &gt;</span>
                                <span className="text-neutral-600 text-[8px]">{expandedCards["explored"] ? "▼" : "◀"}</span>
                              </button>
                              {expandedCards["explored"] && (
                                <div className="px-3 pb-3 pt-1 border-t border-[#2b2b2b] bg-black/30 font-mono text-[8.5px] text-neutral-500 leading-normal select-text">
                                  Indexed workspace targets: `d:/Nexera/mobile/src/app/page.tsx` read completed successfully with 1518 lines parsed.
                                </div>
                              )}
                            </div>

                            {/* Accordion 2: Thought logs */}
                            <div className="border border-[#2b2b2b] bg-[#2d2d30]/40 rounded-lg overflow-hidden transition-all">
                              <button
                                onClick={() => toggleCard("thought")}
                                className="w-full px-3 py-2 flex items-center justify-between font-mono text-[9px] font-bold text-neutral-400 hover:bg-neutral-900/40"
                              >
                                <span className="flex items-center gap-1.5">🧠 Thought for 3s &gt;</span>
                                <span className="text-neutral-600 text-[8px]">{expandedCards["thought"] ? "▼" : "◀"}</span>
                              </button>
                              {expandedCards["thought"] && (
                                <div className="px-3 pb-3 pt-1 border-t border-[#2b2b2b] bg-black/30 font-mono text-[8.5px] text-neutral-500 leading-normal select-text">
                                  Applying semantic search matrices. Synthesizing user visual layout with existing Next.js PWA active hooks and routes. Ready to compile layout replacement.
                                </div>
                              )}
                            </div>

                            {/* Accordion 3: Diffs & Accept/Reject Controls */}
                            <div className="border border-[#2b2b2b] bg-[#2d2d30]/40 rounded-lg overflow-hidden transition-all">
                              <button
                                onClick={() => toggleCard("git-diff")}
                                className="w-full px-3 py-2 flex items-center justify-between font-mono text-[9px] font-bold text-neutral-400 hover:bg-neutral-900/40"
                              >
                                <span className="flex items-center gap-1.5 text-emerald-400">🌿 3 files changed | +382 -18 &gt;</span>
                                <span className="text-neutral-600 text-[8px]">{expandedCards["git-diff"] ? "▼" : "◀"}</span>
                              </button>
                              {expandedCards["git-diff"] && (
                                <div className="px-3 pb-3 pt-1 border-t border-[#2b2b2b] bg-black/30 font-mono text-[8.5px] text-neutral-500 leading-normal select-text flex flex-col gap-2">
                                  <div className="flex flex-col gap-1 text-[8px] text-neutral-400 max-h-36 overflow-y-auto custom-scrollbar font-mono">
                                    <div className="flex justify-between border-b border-[#2b2b2b] pb-1">
                                      <span className="text-emerald-400">page.tsx</span>
                                      <span className="text-neutral-600">+185 / -12</span>
                                    </div>
                                    <div className="flex justify-between border-b border-[#2b2b2b] pb-1">
                                      <span className="text-emerald-400">main.py</span>
                                      <span className="text-neutral-600">+94 / -4</span>
                                    </div>
                                    <div className="flex justify-between border-b border-[#2b2b2b] pb-1">
                                      <span className="text-emerald-400">pattern_engine.py</span>
                                      <span className="text-neutral-600">+103 / -2</span>
                                    </div>
                                  </div>
                                  <div className="flex gap-2 mt-1">
                                    <button
                                      onClick={() => addLog({ type: "success", message: "✅ User accepted all swarm code modifications." })}
                                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded py-1 text-[8px] font-bold font-mono transition-all active:scale-[0.98]"
                                    >
                                      Accept All
                                    </button>
                                    <button
                                      onClick={() => addLog({ type: "system", message: "❌ User rejected all swarm code modifications." })}
                                      className="flex-1 bg-rose-950/20 hover:bg-rose-900/20 border border-rose-900/30 text-rose-400 rounded py-1 text-[8px] font-bold font-mono transition-all active:scale-[0.98]"
                                    >
                                      Reject All
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>

                          </div>
                        )}

                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Bottom Input block */}
              <form onSubmit={handleStartTask} className="flex flex-col gap-2.5 pt-3 border-t border-[#2b2b2b] bg-[#252526]/60 select-none">
                
                {/* Horizontal Files Review / Accept Bar matching screenshot perfectly */}
                <div className="flex items-center justify-between bg-[#2d2d30]/60 border border-[#2b2b2b]/60 rounded-xl px-3 py-2 text-[9px] font-mono">
                  {gitStatus.modified_files.length > 0 ? (
                    <>
                      <div className="flex items-center gap-1.5 text-neutral-400">
                        <span>📁</span>
                        <span className="truncate max-w-[130px] font-bold">{gitStatus.modified_files.length} Files Modified</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setGitStatus(prev => ({ ...prev, modified_files: [] }));
                            addLog({ type: "system", message: "❌ Reverted all active workspace visual edits." });
                          }}
                          className="text-neutral-500 hover:text-rose-400 transition-colors font-bold"
                        >
                          Reject all
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCommitMessage("Auto-commit swarm updates");
                            addLog({ type: "success", message: "✅ Staging and accepting all active workspace updates..." });
                            fetch("http://127.0.0.1:8000/api/git/commit", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ message: "Auto-commit swarm updates" })
                            }).then(() => loadGitStatus());
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded px-2.5 py-1 font-bold shadow-md shadow-emerald-700/10 transition-all active:scale-[0.97]"
                        >
                          Accept all
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5 text-neutral-500">
                        <span>📁</span>
                        <span>0 Files With Pending Changes</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          loadGitStatus();
                          addLog({ type: "system", message: "🔍 Staging trees refreshed. Checking code status..." });
                        }}
                        className="bg-[#1e293b]/40 hover:bg-[#334155]/40 border border-neutral-800 text-[#3279F9] rounded px-2.5 py-1 font-bold transition-all"
                      >
                        Review Changes
                      </button>
                    </>
                  )}
                </div>

                {/* Text input area with voice mic inside */}
                <div className="relative flex items-center">
                  <input
                    ref={promptInputRef}
                    type="text"
                    value={activeTask}
                    onChange={(e) => {
                      setActiveTask(e.target.value);
                      testExpandPrompt(e.target.value); // test expansion real-time in brain tab
                    }}
                    placeholder="Ask anything, @ to mention, / for actions"
                    className="w-full bg-black/60 border border-[#3c3c3c] rounded-xl pl-3.5 pr-10 py-3 text-xs text-neutral-200 placeholder:text-neutral-700 focus:outline-none focus:border-[#3279F9]/80 focus:shadow-[0_0_15px_rgba(50,121,249,0.15)] transition-all font-mono select-text"
                  />
                  
                  {/* Microphone speech trigger */}
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`absolute right-2.5 p-1.5 rounded-lg border transition-all active:scale-95 ${
                      isListening
                        ? "bg-rose-500/20 border-rose-500 text-rose-400"
                        : "bg-black/60 border-[#2b2b2b] text-neutral-500 hover:text-neutral-300"
                    }`}
                    title="Speak command query input"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </button>
                </div>

                {/* Active model label — matches "Gemini 3.5 Flash (High)" in screenshot */}
                <div className="flex items-center justify-between px-1 mb-1">
                  <span className="text-[9px] text-[#808080] font-mono flex items-center gap-1">
                    {configModelName || "No model selected"}
                    <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                  </span>
                </div>

                {/* Bottom line: Provider Select on Left, Send circular green button on Right */}
                <div className="flex justify-between items-center px-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[9px] text-neutral-600 font-bold font-mono uppercase mr-0.5 select-none">AGENT:</span>
                    {agentsList.map((agent) => {
                      const isActive = configProvider === agent.id;
                      return (
                        <button
                          key={agent.id}
                          type="button"
                          onClick={() => handleProviderChange(agent.id)}
                          className={`px-2.5 py-0.5 rounded-full border text-[8.5px] font-bold font-mono transition-all duration-200 flex items-center gap-1.5 active:scale-95 select-none ${
                            isActive
                              ? "bg-[#3279F9]/10 border-[#3279F9] text-white shadow-[0_0_8px_rgba(50,121,249,0.15)]"
                              : "bg-[#252526]/40 border-[#3c3c3c] text-neutral-500 hover:text-neutral-300 hover:border-neutral-700"
                          }`}
                          title={`${agent.name} (${agent.model})`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${isActive ? "animate-pulse" : ""}`}
                            style={{
                              backgroundColor: agent.color,
                              boxShadow: isActive ? `0 0 6px ${agent.color}` : "none",
                            }}
                          />
                          <span>{agent.id === "ollama" ? "Local" : agent.id === "anthropic" ? "Claude" : agent.id === "gemini" ? "Gemini" : "OpenAI"}</span>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="submit"
                    disabled={!activeTask.trim()}
                    className="w-8 h-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full flex items-center justify-center shrink-0 shadow-lg shadow-emerald-700/10 transition-all active:scale-95 disabled:opacity-30 disabled:scale-100"
                    title="Submit query to swarm agent"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} className="rotate-90">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
                    </svg>
                  </button>
                </div>

                {isExecuting && (
                  <button
                    onClick={handleStopTask}
                    className="w-full bg-rose-950/20 hover:bg-rose-900/10 border border-rose-900/30 text-rose-400 rounded-xl py-2.5 text-xs font-bold font-mono tracking-wider active:scale-[0.98] transition-all"
                  >
                    ABORT EXECUTION
                  </button>
                )}

              </form>

            </div>

          </section>
        )}

      </div>

      {/* 6. Status Bar (Bottom Ribbon) */}
      <footer className="h-6 bg-[#252526] border-t border-[#2b2b2b] px-4 flex items-center justify-between text-[10px] font-mono text-neutral-500 shrink-0 select-none">

        {/* Left Side Statuses */}
        <div className="flex items-center gap-4">
          <span className="hover:text-indigo-400 cursor-pointer font-bold tracking-wider">Nexera Project</span>
          <span className="text-[#3279F9] font-bold">🌿 {gitStatus.branch || "master"}*</span>
          <span className="flex items-center gap-1 text-amber-500 font-bold" title="Warnings count">
            <span>⚠</span>
            <span>0</span>
          </span>
          <span className="flex items-center gap-1 text-neutral-600 font-bold" title="Errors count">
            <span>✗</span>
            <span>0</span>
          </span>
          {/* Sandbox mode indicator */}
          <span
            title={sandboxMode === "docker" ? "Docker sandbox active — agent commands are containerised" : "Host mode — Docker not detected, running on local OS"}
            className={`flex items-center gap-1 font-bold cursor-pointer ${sandboxMode === "docker" ? "text-emerald-400" : sandboxMode === "host" ? "text-amber-500" : "text-neutral-600"}`}
            onClick={fetchSandboxStatus}
          >
            <span>{sandboxMode === "docker" ? "🐳" : "⚙"}</span>
            <span>{sandboxMode === "unknown" ? "SANDBOX..." : sandboxMode === "docker" ? "DOCKER" : "HOST MODE"}</span>
          </span>
        </div>

        {/* Right Side Statuses */}
        <div className="flex items-center gap-4 text-neutral-500 text-[10px]">
          <span>Ln 1, Col 1</span>
          <span>Spaces: 4</span>
          <span>UTF-8</span>
          <span>LF</span>
          <span className="text-neutral-400">
            {activeTab
              ? activeTab.endsWith(".tsx") ? "{} TypeScript JSX"
              : activeTab.endsWith(".ts") ? "{} TypeScript"
              : activeTab.endsWith(".py") ? "{} Python"
              : activeTab.endsWith(".json") ? "{} JSON"
              : activeTab.endsWith(".md") ? "{} Markdown"
              : activeTab.endsWith(".css") ? "{} CSS"
              : activeTab.endsWith(".sh") ? "{} Shell"
              : activeTab.endsWith(".ps1") ? "{} PowerShell"
              : "{} Plaintext"
              : "{} Plaintext"}
          </span>
          <span
            onClick={() => handleDockIconClick("settings")}
            className="text-[#3279F9] font-extrabold tracking-wider hover:text-indigo-400 cursor-pointer"
          >
            Nexera - Settings
          </span>
        </div>
      </footer>

    </div>
  );
}

interface FileTreeNodeProps {
  node: FileNode;
  onFileClick: (path: string) => void;
  activeFile: string;
  onCreateItem: (parentPath: string, name: string, isDir: boolean) => void;
  onDeleteItem: (path: string) => void;
  onMoveItem: (sourcePath: string, targetFolderPath: string) => void;
  selectedNode: { path: string; isDir: boolean } | null;
  setSelectedNode: (node: { path: string; isDir: boolean } | null) => void;
  inlineCreate: { parentPath: string; isDir: boolean } | null;
  setInlineCreate: (state: { parentPath: string; isDir: boolean } | null) => void;
  inlineCreateName: string;
  setInlineCreateName: (name: string) => void;
  collapsedAllTrigger: number;
}

function FileTreeNode({
  node,
  onFileClick,
  activeFile,
  onCreateItem,
  onDeleteItem,
  onMoveItem,
  selectedNode,
  setSelectedNode,
  inlineCreate,
  setInlineCreate,
  inlineCreateName,
  setInlineCreateName,
  collapsedAllTrigger
}: FileTreeNodeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    if (collapsedAllTrigger > 0) {
      setIsOpen(false);
    }
  }, [collapsedAllTrigger]);

  useEffect(() => {
    if (inlineCreate && inlineCreate.parentPath === node.path) {
      setIsOpen(true);
    }
  }, [inlineCreate, node.path]);
  
  if (node.is_dir) {
    const isSelected = selectedNode?.path === node.path;

    return (
      <div
        className="pl-1 leading-normal"
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }}
        onDragLeave={(e) => { e.stopPropagation(); setIsDragOver(false); }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragOver(false);
          const src = e.dataTransfer.getData("text/plain");
          if (src && src !== node.path && !src.startsWith(node.path + "\\") && !src.startsWith(node.path + "/")) {
            onMoveItem(src, node.path);
          }
        }}
      >
        <div className={`flex justify-between items-center group/node rounded pr-2 transition-colors ${isDragOver ? "bg-[#3279F9]/20 border border-[#3279F9]/40" : "hover:bg-neutral-900/20"}`}>
          <button
            onClick={() => {
              setSelectedNode({ path: node.path, isDir: true });
              setIsOpen(!isOpen);
            }}
            className={`flex items-center gap-2 py-1.5 text-[11px] hover:text-neutral-200 transition-colors flex-1 text-left font-mono font-semibold ${
              isSelected
                ? "text-[#3279F9] bg-indigo-950/15 border-l-2 border-[#3279F9] pl-1.5 pr-1 rounded"
                : "text-neutral-400"
            }`}
          >
            <span className="text-[8px] text-neutral-600 tracking-none">{isOpen ? "▼" : "▶"}</span>
            <span className="truncate max-w-[140px] inline-block align-middle">📁 {node.name}</span>
          </button>
          
          <div className="opacity-0 group-hover/node:opacity-100 transition-opacity flex gap-1.5 items-center shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedNode({ path: node.path, isDir: true });
                setInlineCreate({ parentPath: node.path, isDir: false });
                setInlineCreateName("");
              }}
              className="text-[9px] text-indigo-400 hover:text-indigo-300 font-bold px-1 transition-colors"
              title="Add File"
            >
              [+]
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedNode({ path: node.path, isDir: true });
                setInlineCreate({ parentPath: node.path, isDir: true });
                setInlineCreateName("");
              }}
              className="text-[9px] text-[#8B5CF6] hover:text-indigo-300 font-bold px-1 transition-colors"
              title="Add Folder"
            >
              [📁+]
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteItem(node.path);
              }}
              className="text-[9px] text-rose-500 hover:text-rose-400 font-bold px-1 transition-colors"
              title="Delete Directory"
            >
              [🗑️]
            </button>
          </div>
        </div>

        {isOpen && (
          <div className="pl-3 border-l border-[#2b2b2b] ml-2 flex flex-col mt-0.5">
            {inlineCreate && inlineCreate.parentPath === node.path && (
              <InlineCreateInput
                isDir={inlineCreate.isDir}
                inlineCreateName={inlineCreateName}
                setInlineCreateName={setInlineCreateName}
                onConfirm={() => {
                  onCreateItem(inlineCreate.parentPath, inlineCreateName, inlineCreate.isDir);
                  setInlineCreate(null);
                }}
                onCancel={() => setInlineCreate(null)}
              />
            )}
            {node.children && node.children.map((child) => (
              <FileTreeNode
                key={child.path}
                node={child}
                onFileClick={onFileClick}
                activeFile={activeFile}
                onCreateItem={onCreateItem}
                onDeleteItem={onDeleteItem}
                onMoveItem={onMoveItem}
                selectedNode={selectedNode}
                setSelectedNode={setSelectedNode}
                inlineCreate={inlineCreate}
                setInlineCreate={setInlineCreate}
                inlineCreateName={inlineCreateName}
                setInlineCreateName={setInlineCreateName}
                collapsedAllTrigger={collapsedAllTrigger}
              />
            ))}
          </div>
        )}
      </div>
    );
  } else {
    const isActive = activeFile === node.path;
    const isSelected = selectedNode?.path === node.path;

    const ext = node.name.split(".").pop();
    let fileIcon = "📄";
    if (ext === "py") fileIcon = "🐍";
    else if (ext === "json") fileIcon = "⚙️";
    else if (ext === "md") fileIcon = "📝";

    return (
      <div
        draggable
        onDragStart={(e) => { e.dataTransfer.setData("text/plain", node.path); e.dataTransfer.effectAllowed = "move"; }}
        className={`pl-5 py-1 text-[11px] font-mono hover:bg-neutral-900/30 rounded transition-all flex justify-between items-center group/node cursor-grab active:cursor-grabbing ${isSelected || isActive ? "text-[#3279F9] font-bold bg-indigo-950/15 border-l-2 border-[#3279F9] pl-4" : "text-[#5F7E97]"}`}>
        <button
          onClick={() => {
            setSelectedNode({ path: node.path, isDir: false });
            onFileClick(node.path);
          }}
          className="text-left flex-1 flex items-center gap-2"
        >
          <span>{fileIcon}</span>
          <span className="truncate max-w-[140px] inline-block align-middle">{node.name}</span>
        </button>
        
        <div className="flex items-center shrink-0 pr-1 select-none">
          {node.size !== undefined && <span className="text-[8px] text-neutral-700 font-mono pr-2 group-hover/node:hidden">{node.size}B</span>}
          
          <div className="opacity-0 group-hover/node:opacity-100 transition-opacity flex items-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteItem(node.path);
              }}
              className="text-[9px] text-rose-500 hover:text-rose-400 font-bold px-1 transition-colors"
              title="Delete File"
            >
              [🗑️]
            </button>
          </div>
        </div>
      </div>
    );
  }
}

interface InlineCreateInputProps {
  isDir: boolean;
  inlineCreateName: string;
  setInlineCreateName: (val: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

function InlineCreateInput({ isDir, inlineCreateName, setInlineCreateName, onConfirm, onCancel }: InlineCreateInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <div className="pl-4 py-1 text-[11px] font-mono flex items-center gap-2 bg-[#0d121f]/60 border border-[#3279F9]/40 rounded my-0.5 shadow-md shadow-[#3279F9]/5">
      <span className="shrink-0">{isDir ? "📁" : "📄"}</span>
      <input
        ref={inputRef}
        type="text"
        value={inlineCreateName}
        onChange={(e) => setInlineCreateName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onConfirm();
          } else if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
        onBlur={() => {
          setTimeout(() => onCancel(), 180);
        }}
        placeholder={isDir ? "New folder..." : "New file..."}
        className="flex-1 bg-transparent border-none outline-none text-neutral-300 font-mono focus:ring-0 p-0 text-[11px]"
      />
    </div>
  );
}
