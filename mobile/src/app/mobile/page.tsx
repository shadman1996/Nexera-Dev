"use client";

import React, { useState, useEffect, useRef } from "react";

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

export default function MobileNotionPortal() {
  const [activeTab, setActiveTab] = useState<"workspace" | "kanban" | "approvals" | "chat">("workspace");
  const [activeTask, setActiveTask] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [wsStatus, setWsStatus] = useState("disconnected");
  
  // Notion Project Database State
  const [selectedProject, setSelectedProject] = useState("Nexera OS Core");
  const [projects] = useState([
    { name: "Nexera OS Core", status: "active", files: 12, emoji: "🚀", category: "Core Platform" },
    { name: "Auto REST API", status: "completed", files: 5, emoji: "🔌", category: "Microservices" },
    { name: "Algorithms Sandbox", status: "pending", files: 2, emoji: "📊", category: "Research" }
  ]);

  // Swarm Kanban States
  const [agentStates, setAgentStates] = useState({
    CEO: { status: "Idle", task: "Awaiting prompt..." },
    Engineer: { status: "Idle", task: "Ready to code." },
    QA: { status: "Idle", task: "Ready to test." }
  });

  // CTO Approval Queue States
  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null);
  const [revisionNotes, setRevisionNotes] = useState("");
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);

  // Voice & Screen Portals
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [screenshotData, setScreenshotData] = useState("");
  const [ocrText, setOcrText] = useState("");
  const [isCapturing, setIsCapturing] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const recognitionRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);

  // Initialize Speech & Visuals
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
          speakResponse(`Initiating: ${transcript}`);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  // Canvas waveform visualizer for micro-animation when recording voice
  useEffect(() => {
    if (isListening && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        let angle = 0;
        const render = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = "#191919";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          ctx.beginPath();
          ctx.strokeStyle = "rgba(99, 102, 241, 0.8)";
          ctx.lineWidth = 2.5;
          ctx.lineCap = "round";

          for (let i = 0; i < canvas.width; i++) {
            const y = canvas.height / 2 + Math.sin(i * 0.05 + angle) * 12 * Math.sin(i * 0.01);
            if (i === 0) ctx.moveTo(i, y);
            else ctx.lineTo(i, y);
          }
          ctx.stroke();
          
          angle += 0.15;
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

  // Connect backend components
  useEffect(() => {
    connectWebSocket();
    const interval = setInterval(checkPendingApproval, 1500);
    return () => {
      if (socketRef.current) socketRef.current.close();
      clearInterval(interval);
    };
  }, []);

  const connectWebSocket = () => {
    try {
      const ws = new WebSocket("ws://127.0.0.1:8000/ws");
      setWsStatus("connecting");

      ws.onopen = () => {
        setWsStatus("connected");
        addLog({ type: "system", message: "🔌 Gateway Connected: Active Swarm listening." });
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
                task: data.message.substring(0, 80) + (data.message.length > 80 ? "..." : "")
              }
            }));
          }
          speakResponse(data.message);
        }
      };

      ws.onclose = () => {
        setWsStatus("disconnected");
        addLog({ type: "system", message: "🔌 Gateway offline. Attempting re-link..." });
        setTimeout(connectWebSocket, 3000);
      };

      socketRef.current = ws;
    } catch (err) {
      setWsStatus("error");
    }
  };

  const addLog = (log: LogMessage) => {
    setLogs((prev) => [...prev, log]);
  };

  const checkPendingApproval = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/approvals/pending");
      const data = await res.json();
      if (data.has_pending) {
        setPendingApproval(data.item);
      } else {
        setPendingApproval(null);
      }
    } catch (e) {}
  };

  const speakResponse = (text: string) => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const cleanText = text.replace(/\[.*?\]/g, "").replace(/[^a-zA-Z0-9.,!? ]/g, "");
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.1;
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
        speakResponse("Desktop synced.");
      }
    } catch (err) {
      addLog({ type: "error", message: "Screen synch fail." });
    } finally {
      setIsCapturing(false);
    }
  };

  const handleStartTask = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeTask.trim()) return;

    setIsExecuting(true);
    setLogs([]);
    try {
      await fetch("http://127.0.0.1:8000/api/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: activeTask })
      });
      setActiveTab("kanban"); // Instantly focus board
    } catch (err) {
      addLog({ type: "error", message: "Failed starting Swarm." });
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
    } catch (err) {
      alert("Verification issue.");
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#191919] text-[#E3E3E2] flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      
      {/* Notion Top Nav Bar */}
      <header className="sticky top-0 z-40 bg-[#202020] border-b border-[#2A2A2A] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-indigo-600 flex items-center justify-center font-bold text-[10px] text-white">
            N
          </div>
          <span className="font-semibold text-xs tracking-tight text-[#F1F1F0]">Nexera Notion Portal</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${wsStatus === "connected" ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
          <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">{wsStatus}</span>
        </div>
      </header>

      {/* Notion Page Workspace Layout */}
      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full p-4 gap-4 pb-24">
        
        {/* Page Hero Header */}
        <div className="py-2 border-b border-[#2A2A2A] mb-2">
          <div className="flex items-center gap-1.5 text-neutral-500 text-xs">
            <span>🏠 Workspace</span>
            <span>/</span>
            <span>📂 {selectedProject}</span>
          </div>
          <h1 className="text-2xl font-bold text-[#F1F1F0] tracking-tight mt-1">🤖 Agent Swarm Studio</h1>
          <p className="text-[10px] text-neutral-500 font-mono mt-0.5">SAMSUNG S26 ULTRA ULTRA-PERFORMANCE PORTAL</p>
        </div>

        {/* Dynamic Notion-Style Tabs Panel */}
        <div className="flex bg-[#202020] p-0.5 rounded-lg border border-[#2A2A2A]">
          <button
            onClick={() => setActiveTab("workspace")}
            className={`flex-1 py-2 text-[11px] font-medium rounded transition-colors ${activeTab === "workspace" ? "bg-[#2F2F2E] text-[#F1F1F0] font-semibold" : "text-neutral-500 hover:text-neutral-300"}`}
          >
            📂 Workspace
          </button>
          <button
            onClick={() => setActiveTab("kanban")}
            className={`flex-1 py-2 text-[11px] font-medium rounded transition-colors relative ${activeTab === "kanban" ? "bg-[#2F2F2E] text-[#F1F1F0] font-semibold" : "text-neutral-500 hover:text-neutral-300"}`}
          >
            📋 Swarm Board
            {isExecuting && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />}
          </button>
          <button
            onClick={() => setActiveTab("approvals")}
            className={`flex-1 py-2 text-[11px] font-medium rounded transition-colors relative ${activeTab === "approvals" ? "bg-[#2F2F2E] text-[#F1F1F0] font-semibold" : "text-neutral-500 hover:text-neutral-300"}`}
          >
            🛡️ Approvals
            {pendingApproval && (
              <span className="absolute top-1 right-2 bg-indigo-600 text-white font-bold font-mono text-[8px] h-3.5 px-1 rounded flex items-center justify-center animate-bounce">
                1
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex-1 py-2 text-[11px] font-medium rounded transition-colors ${activeTab === "chat" ? "bg-[#2F2F2E] text-[#F1F1F0] font-semibold" : "text-neutral-500 hover:text-neutral-300"}`}
          >
            💬 Command
          </button>
        </div>

        {/* Tab 1: Notion Workspace Databases */}
        {activeTab === "workspace" && (
          <div className="flex flex-col gap-4 animate-fade-in">
            {/* Project List styled like Notion Table */}
            <div className="bg-[#202020] border border-[#2A2A2A] rounded-xl overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-[#2A2A2A] bg-[#222221] flex items-center justify-between">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">🗃️ Projects Database</span>
                <span className="text-[9px] bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded font-mono">3 Entries</span>
              </div>
              <div className="divide-y divide-[#2A2A2A]">
                {projects.map((proj, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedProject(proj.name)}
                    className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${selectedProject === proj.name ? "bg-[#272726]" : "hover:bg-[#222221]"}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{proj.emoji}</span>
                      <div>
                        <h4 className="text-xs font-semibold text-[#F1F1F0]">{proj.name}</h4>
                        <p className="text-[10px] text-neutral-500 mt-0.5">{proj.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-neutral-400 bg-[#313130] px-2 py-0.5 rounded">{proj.files} Files</span>
                      <span className={`w-2 h-2 rounded-full ${proj.status === "active" ? "bg-indigo-500" : proj.status === "completed" ? "bg-emerald-500" : "bg-amber-500"}`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Stats Database */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#202020] border border-[#2A2A2A] rounded-xl p-4 flex flex-col gap-1 shadow-sm">
                <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">Swarm Engine</span>
                <span className="text-xs font-semibold text-neutral-300">Ollama local core</span>
                <span className="text-[9px] font-mono text-indigo-400 mt-1">qwen2.5-coder:7b</span>
              </div>
              <div className="bg-[#202020] border border-[#2A2A2A] rounded-xl p-4 flex flex-col gap-1 shadow-sm">
                <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">Voice Portal</span>
                <span className="text-xs font-semibold text-neutral-300">Web Speech API</span>
                <span className="text-[9px] font-mono text-emerald-400 mt-1">{speechSupported ? "Supported" : "Not supported"}</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Swarm Kanban Board */}
        {activeTab === "kanban" && (
          <div className="flex flex-col gap-4 animate-fade-in">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider px-1">📊 Active Swarm Kanban</span>
            <div className="flex flex-col gap-3">
              {Object.entries(agentStates).map(([agent, data], idx) => (
                <div key={idx} className="bg-[#202020] border border-[#2A2A2A] rounded-xl p-4 flex flex-col gap-3 shadow-md relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-600" />
                  
                  <div className="flex items-center justify-between pl-1">
                    <span className="font-bold text-xs text-indigo-400 font-mono uppercase tracking-wider">{agent} Agent</span>
                    <span className="text-[9px] px-2 py-0.5 rounded bg-[#2F2F2E] border border-[#373736] text-neutral-400 font-mono">
                      {data.status}
                    </span>
                  </div>
                  
                  <div className="bg-[#191919] p-3 rounded-lg border border-[#2A2A2A] text-xs text-neutral-400 font-sans leading-relaxed min-h-[48px] pl-4">
                    {data.task}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: CTO Approvals */}
        {activeTab === "approvals" && (
          <div className="flex flex-col gap-4 animate-fade-in">
            {pendingApproval ? (
              <div className="bg-[#202020] border border-indigo-900/60 rounded-xl p-5 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl" />
                
                <div className="flex flex-col gap-1.5 mb-4">
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest font-mono">🛡️ CTO Code Verification Required</span>
                  <div className="text-[11px] bg-indigo-950/40 text-indigo-300 border border-indigo-900/50 px-3 py-1.5 rounded-lg font-mono break-all">
                    📁 {pendingApproval.filepath}
                  </div>
                </div>

                {/* Notion Code block style */}
                <div className="w-full border border-[#2A2A2A] bg-neutral-950 rounded-lg p-4 font-mono text-[10px] max-h-72 overflow-y-auto mb-4 text-[#E3E3E2] leading-relaxed select-all">
                  <pre className="whitespace-pre-wrap">{pendingApproval.content}</pre>
                </div>

                <div className="flex flex-col gap-3">
                  <input
                    type="text"
                    value={revisionNotes}
                    onChange={(e) => setRevisionNotes(e.target.value)}
                    placeholder="Enter revision requirements if rejecting build..."
                    className="bg-neutral-950/80 border border-[#2A2A2A] rounded-lg px-3 py-2.5 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSubmitApproval("approved")}
                      disabled={isSubmittingApproval}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-3 text-xs font-semibold transition-all disabled:opacity-50 active:scale-[0.98]"
                    >
                      ✓ Approve and Deploy
                    </button>
                    <button
                      onClick={() => handleSubmitApproval("rejected")}
                      disabled={isSubmittingApproval}
                      className="px-5 bg-rose-950/20 hover:bg-rose-900/20 border border-rose-900/40 text-rose-400 rounded-lg py-3 text-xs transition-all disabled:opacity-50 active:scale-[0.98]"
                    >
                      ✗ Reject
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#202020] border border-[#2A2A2A] rounded-xl p-8 flex flex-col items-center justify-center text-center text-[#8A8A88] min-h-[220px] shadow-sm">
                <span className="text-3xl mb-2">🛡️</span>
                <span className="text-xs font-semibold text-neutral-300">Approval Queue Empty</span>
                <p className="text-[10px] text-neutral-500 max-w-xs mt-1.5 leading-relaxed">
                  Staged files generated by the local developer swarm will populate here automatically.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: AI Command Portal */}
        {activeTab === "chat" && (
          <div className="flex flex-col gap-4 animate-fade-in">
            {/* Input Form console */}
            <div className="bg-[#202020] border border-[#2A2A2A] rounded-xl p-5 shadow-sm">
              <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-3 block">Swarm Speech & Sync Portal</span>
              <form onSubmit={handleStartTask} className="flex flex-col gap-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={activeTask}
                    onChange={(e) => setActiveTask(e.target.value)}
                    placeholder="Ask swarm to write tests, build components..."
                    className="flex-1 bg-neutral-950 border border-[#2A2A2A] rounded-lg px-3.5 py-3 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                  
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`w-12 h-12 rounded-lg border flex items-center justify-center transition-all ${
                      isListening
                        ? "bg-rose-500/20 border-rose-500 text-rose-400"
                        : "bg-neutral-950 border-[#2A2A2A] text-neutral-500"
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </button>
                </div>

                {isListening && (
                  <div className="w-full h-8 bg-[#191919] border border-[#2A2A2A] rounded-lg overflow-hidden">
                    <canvas ref={canvasRef} width="400" height="32" className="w-full h-full" />
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isExecuting || !activeTask.trim()}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-3 text-xs font-semibold transition-all disabled:opacity-50 active:scale-[0.98]"
                  >
                    Initiate Swarm Plan
                  </button>
                  {isExecuting && (
                    <button
                      type="button"
                      onClick={handleStopTask}
                      className="px-6 bg-rose-950/20 border border-rose-900/30 text-rose-400 rounded-lg py-3 text-xs font-semibold active:scale-[0.98]"
                    >
                      Abort
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Screen Sync Portal */}
            <div className="bg-[#202020] border border-[#2A2A2A] rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3.5">
                <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">🖥️ Active Desktop Sync</span>
                <button
                  onClick={handleCaptureScreen}
                  disabled={isCapturing}
                  className="text-[9px] border border-[#2A2A2A] px-3 py-1.5 rounded hover:border-indigo-500/50 hover:bg-indigo-950/10 text-indigo-400 font-semibold transition-all"
                >
                  {isCapturing ? "Syncing..." : "Sync Desktop View"}
                </button>
              </div>

              <div className="w-full border border-[#2A2A2A] bg-neutral-950 rounded-lg overflow-hidden aspect-video flex flex-col items-center justify-center relative">
                {screenshotData ? (
                  <>
                    <img src={screenshotData} alt="Synchronized active screen" className="w-full h-full object-cover" />
                    {ocrText && (
                      <div className="absolute bottom-0 left-0 right-0 bg-neutral-950/95 border-t border-[#2A2A2A] p-2.5 text-[9px] font-mono text-neutral-400">
                        <span className="text-indigo-400 font-bold">OCR Context: </span>
                        {ocrText}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center text-center p-6 gap-1 text-[#8A8A88]">
                    <span className="text-2xl mb-1">🖥️</span>
                    <h3 className="text-xs font-semibold text-neutral-400">No synchronized screen capture</h3>
                  </div>
                )}
              </div>
            </div>

            {/* Swarm process logs */}
            <div className="bg-[#202020] border border-[#2A2A2A] rounded-xl overflow-hidden shadow-sm flex flex-col h-[280px]">
              <div className="px-4 py-3 border-b border-[#2A2A2A] bg-[#222221] flex items-center justify-between">
                <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">🗃️ Process Activity Logs</span>
                <button onClick={() => setLogs([])} className="text-[9px] font-mono text-neutral-500 hover:text-neutral-300">
                  Clear
                </button>
              </div>
              <div className="flex-1 p-3 overflow-y-auto font-mono text-[9px] leading-relaxed flex flex-col gap-2 bg-[#1C1C1B]">
                {logs.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-neutral-600">
                    <span>Awaiting active logs...</span>
                  </div>
                ) : (
                  logs.map((log, index) => {
                    if (log.type === "system") {
                      return (
                        <div key={index} className="text-neutral-500 border-l border-neutral-800 pl-2">
                          {log.message}
                        </div>
                      );
                    } else if (log.type === "error") {
                      return (
                        <div key={index} className="text-rose-400 border-l border-rose-950 pl-2 bg-rose-950/10 py-1">
                          {log.message}
                        </div>
                      );
                    } else if (log.type === "agent") {
                      return (
                        <div key={index} className="bg-[#202020]/30 border border-[#2A2A2A] rounded p-2">
                          <div className="flex items-center gap-1.5 mb-1 text-[8px]">
                            <span className="font-semibold text-indigo-400">{log.agent}</span>
                            <span className="px-1 rounded bg-[#2D2D2C] border border-[#363635] text-neutral-500">
                              {log.role}
                            </span>
                          </div>
                          <p className="text-neutral-300 whitespace-pre-wrap">{log.message}</p>
                        </div>
                      );
                    }
                    return null;
                  })
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
