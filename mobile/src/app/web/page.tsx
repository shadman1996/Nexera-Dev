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

export default function WebDashboard() {
  const [activeTask, setActiveTask] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [wsStatus, setWsStatus] = useState("disconnected");
  
  // Notion Project State
  const [selectedProject, setSelectedProject] = useState("Nexera OS Core");
  const [projects] = useState([
    { name: "Nexera OS Core", status: "active", files: 12 },
    { name: "Auto REST API", status: "completed", files: 5 },
    { name: "Algorithms Sandbox", status: "pending", files: 2 }
  ]);

  // Swarm States (Kanban)
  const [agentStates, setAgentStates] = useState({
    CEO: { status: "Idle", task: "Awaiting prompt..." },
    Engineer: { status: "Idle", task: "Ready to code." },
    QA: { status: "Idle", task: "Ready to test." }
  });

  // CTO Approval Queue States
  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null);
  const [revisionNotes, setRevisionNotes] = useState("");
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);

  // Voice & Vision States
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [screenshotData, setScreenshotData] = useState("");
  const [ocrText, setOcrText] = useState("");
  const [isCapturing, setIsCapturing] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const terminalEndRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // Load browser voice portal APIs
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
          speakResponse(`Running plan for: ${transcript}`);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  // Connect websockets & poll approvals
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
    const interval = setInterval(checkPendingApproval, 2000);
    return () => {
      window.fetch = originalFetch;
      if (socketRef.current) socketRef.current.close();
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  const connectWebSocket = () => {
    try {
      const ws = new WebSocket("ws://127.0.0.1:8000/ws");
      setWsStatus("connecting");

      ws.onopen = () => {
        setWsStatus("connected");
        addLog({ type: "system", message: "🚀 Connected to local Swarm websocket." });
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        addLog(data);

        // Dynamic Kanban Agent status hooks
        if (data.type === "agent") {
          const agentName = data.agent as "CEO" | "Engineer" | "QA";
          if (agentStates[agentName]) {
            setAgentStates((prev) => ({
              ...prev,
              [agentName]: {
                status: data.role || "Active",
                task: data.message.substring(0, 60) + (data.message.length > 60 ? "..." : "")
              }
            }));
          }
          speakResponse(data.message);
        }
      };

      ws.onclose = () => {
        setWsStatus("disconnected");
        addLog({ type: "system", message: "🔌 Gateway offline. Re-establishing link..." });
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
    } catch (e) {
      // Offline fallback
    }
  };

  const speakResponse = (text: string) => {
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
    if (!speechSupported) {
      alert("Voice mic requires Chrome or Edge browser.");
      return;
    }
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
        speakResponse("Desktop screenshot captured.");
      }
    } catch (err) {
      addLog({ type: "error", message: "Failed to grab screen visual." });
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
    } catch (err) {
      addLog({ type: "error", message: "Swarm trigger failed." });
    }
  };

  const handleStopTask = async () => {
    try {
      await fetch("http://127.0.0.1:8000/api/stop", { method: "POST" });
      setIsExecuting(false);
      window.speechSynthesis.cancel();
    } catch (e) {}
  };

  // Submit decision to backend Queue
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
      alert("Submission error.");
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#191919] text-[#E3E3E2] flex font-sans overflow-hidden">
      
      {/* Left Sidebar */}
      <aside className="w-64 bg-[#202020] border-r border-[#2A2A2A] flex flex-col justify-between shrink-0 hidden md:flex">
        <div className="p-4 flex flex-col gap-6">
          
          <div className="flex items-center gap-2 px-1">
            <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center font-bold text-xs text-white">
              W
            </div>
            <span className="font-semibold text-sm text-[#F1F1F0]">Nexera Web Portal</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-[#8A8A88] uppercase tracking-wider px-2">Projects</span>
            {projects.map((proj, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedProject(proj.name)}
                className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors flex items-center justify-between ${
                  selectedProject === proj.name ? "bg-[#2F2F2E] text-[#F1F1F0]" : "text-[#9B9B9A] hover:bg-[#272726] hover:text-[#E3E3E2]"
                }`}
              >
                <span>📁 {proj.name}</span>
                <span className="text-[9px] px-1 rounded bg-[#373736] text-[#8A8A88]">{proj.files}f</span>
              </button>
            ))}
          </div>
          
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-[#8A8A88] uppercase tracking-wider px-2">Active LLM</span>
            <div className="p-2.5 rounded bg-[#252524] border border-[#2D2D2C] text-[11px] font-mono text-neutral-400">
              <span className="text-indigo-400 font-semibold">qwen2.5-coder:7b</span>
              <p className="text-[9px] mt-0.5">Context: 8192w</p>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-[#2A2A2A] flex items-center justify-between text-[11px]">
          <span className="text-neutral-500">Gateway WS</span>
          <span className={`px-2 py-0.5 rounded-full font-mono text-[9px] ${wsStatus === "connected" ? "bg-emerald-950 text-emerald-400 border border-emerald-900" : "bg-rose-950 text-rose-400 border border-rose-900"}`}>
            {wsStatus.toUpperCase()}
          </span>
        </div>
      </aside>

      {/* Main Page Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        
        <header className="md:hidden p-4 bg-[#202020] border-b border-[#2A2A2A] flex items-center justify-between">
          <span className="font-semibold text-sm">Nexera Workspace</span>
          <span className={`w-2.5 h-2.5 rounded-full ${wsStatus === "connected" ? "bg-emerald-500" : "bg-rose-500"}`} />
        </header>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 max-w-7xl mx-auto w-full">
          
          <div className="border-b border-[#2A2A2A] pb-4">
            <h1 className="text-2xl font-bold text-[#F1F1F0] tracking-tight">{selectedProject}</h1>
            <p className="text-xs text-neutral-500 font-mono mt-1">ORGANIZATION & SWARM CONTROL PANEL</p>
          </div>

          {/* Kanban Cards */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(agentStates).map(([agent, data], idx) => (
              <div key={idx} className="bg-[#202020] border border-[#2A2A2A] rounded-xl p-4 flex flex-col gap-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-indigo-400 font-mono uppercase tracking-wider">{agent} Agent</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#272726] border border-[#2A2A2A] text-neutral-400">
                    {data.status}
                  </span>
                </div>
                <p className="text-xs text-neutral-400 font-sans leading-relaxed min-h-[40px]">
                  {data.task}
                </p>
              </div>
            ))}
          </section>

          {/* Central Interactive Split Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            <div className="lg:col-span-7 flex flex-col gap-6">
              
              {/* CTO Approval Card */}
              {pendingApproval ? (
                <div className="rounded-xl border border-indigo-900/60 bg-[#202020] p-6 shadow-xl relative overflow-hidden animate-fade-in">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl" />
                  
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest font-mono">🛡️ CTO Approval Pending</span>
                    <span className="text-[10px] bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded border border-indigo-900/60 font-mono">
                      {pendingApproval.filepath}
                    </span>
                  </div>

                  <div className="w-full border border-[#2A2A2A] bg-neutral-950 rounded-lg p-4 font-mono text-[11px] max-h-64 overflow-y-auto mb-4 text-[#F1F1F0]">
                    <pre className="whitespace-pre-wrap">{pendingApproval.content}</pre>
                  </div>

                  <div className="flex flex-col gap-3">
                    <input
                      type="text"
                      value={revisionNotes}
                      onChange={(e) => setRevisionNotes(e.target.value)}
                      placeholder="Add revision request notes if rejecting build..."
                      className="bg-neutral-950/80 border border-[#2A2A2A] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                    />
                    
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleSubmitApproval("approved")}
                        disabled={isSubmittingApproval}
                        className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-lg py-2.5 text-xs font-semibold transition-all disabled:opacity-50"
                      >
                        ✓ Approve and Write File
                      </button>
                      <button
                        onClick={() => handleSubmitApproval("rejected")}
                        disabled={isSubmittingApproval}
                        className="px-6 bg-rose-950/40 hover:bg-rose-900/30 border border-rose-900/40 hover:border-rose-900/60 text-rose-400 rounded-lg py-2.5 text-xs transition-all disabled:opacity-50"
                      >
                        ✗ Reject & Revise
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-[#2A2A2A] bg-[#202020]/40 p-6 flex flex-col items-center justify-center text-center text-[#8A8A88] min-h-[140px]">
                  <span className="text-xl mb-1">🛡️</span>
                  <span className="text-xs font-semibold">CTO Approval Queue Clean</span>
                  <p className="text-[10px] text-neutral-500 max-w-xs mt-1">Staged file code diffs will populate here automatically for your verification.</p>
                </div>
              )}

              {/* Input console */}
              <div className="rounded-xl border border-[#2A2A2A] bg-[#202020] p-6">
                <span className="text-[10px] font-bold text-[#8A8A88] uppercase tracking-wider mb-3 block">Instruction Portal</span>
                <form onSubmit={handleStartTask} className="flex flex-col gap-4">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={activeTask}
                      onChange={(e) => setActiveTask(e.target.value)}
                      placeholder="Prompt Swarm to build a service, test components..."
                      className="flex-1 bg-neutral-950 border border-[#2A2A2A] rounded-lg px-4 py-3 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                    
                    <button
                      type="button"
                      onClick={toggleListening}
                      className={`w-11 h-11 rounded-lg border flex items-center justify-center transition-all ${
                        isListening
                          ? "bg-rose-500/20 border-rose-500 text-rose-400 animate-pulse"
                          : "bg-neutral-950 border-[#2A2A2A] hover:border-neutral-700 text-neutral-400 hover:text-neutral-200"
                      }`}
                      title="Microphone input"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={isExecuting || !activeTask.trim()}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2.5 text-xs font-semibold transition-all disabled:opacity-50"
                    >
                      Initiate Swarm Plan
                    </button>
                    {isExecuting && (
                      <button
                        type="button"
                        onClick={handleStopTask}
                        className="px-6 bg-rose-950/20 hover:bg-rose-900/10 border border-rose-900/30 text-rose-400 rounded-lg py-2.5 text-xs transition-all"
                      >
                        Abort
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Vision Display */}
              <div className="rounded-xl border border-[#2A2A2A] bg-[#202020] p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold text-[#8A8A88] uppercase tracking-wider">Vision core viewport</span>
                  <button
                    onClick={handleCaptureScreen}
                    disabled={isCapturing}
                    className="text-[10px] px-3 py-1.5 border border-[#2A2A2A] hover:border-indigo-500/50 hover:bg-indigo-950/10 text-indigo-400 font-medium rounded transition-all disabled:opacity-50"
                  >
                    {isCapturing ? "Syncing..." : "Sync Active Screen"}
                  </button>
                </div>

                <div className="w-full border border-[#2A2A2A] bg-neutral-950 rounded-lg overflow-hidden aspect-video flex flex-col items-center justify-center relative group">
                  {screenshotData ? (
                    <>
                      <img src={screenshotData} alt="Active screen frame" className="w-full h-full object-cover" />
                      {ocrText && (
                        <div className="absolute bottom-0 left-0 right-0 bg-neutral-950/95 border-t border-[#2A2A2A] p-2.5 text-[10px] font-mono text-neutral-400">
                          <span className="text-indigo-400 font-bold">OCR Context: </span>
                          {ocrText}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center text-center p-6 gap-1 text-[#8A8A88]">
                      <span className="text-xl mb-1">🖥️</span>
                      <h3 className="text-xs font-semibold">No desktop context synced</h3>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Box: Notion Logs */}
            <div className="lg:col-span-5 h-[580px] flex flex-col">
              <div className="flex-1 rounded-xl border border-[#2A2A2A] bg-[#202020] flex flex-col overflow-hidden shadow-sm">
                
                <div className="px-4 py-3 border-b border-[#2A2A2A] flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#8A8A88] uppercase tracking-wider">Swarm Process logs</span>
                  <button onClick={() => setLogs([])} className="text-[10px] text-[#8A8A88] hover:text-neutral-400 font-mono">
                    Clear
                  </button>
                </div>

                <div className="flex-1 p-4 overflow-y-auto font-mono text-[10px] leading-relaxed flex flex-col gap-2.5 bg-[#1C1C1B]">
                  {logs.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-[#8A8A88]">
                      <span>Waiting for agent logs...</span>
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
                          <div key={index} className="bg-[#202020]/40 border border-[#2A2A2A] rounded p-2.5">
                            <div className="flex items-center gap-1.5 mb-1 text-[9px]">
                              <span className="font-semibold text-indigo-400">{log.agent}</span>
                              <span className="px-1 rounded bg-[#2D2D2C] border border-[#363635] text-[#8A8A88]">
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
                  <div ref={terminalEndRef} />
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

    </div>
  );
}
