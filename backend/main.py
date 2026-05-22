import asyncio
import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from backend.websocket_manager import ConnectionManager
from backend.tools.screenshot_tool import capture_desktop
from backend.graph import run_task, approval_queue
from backend.config import load_config, save_config

app = FastAPI(title="Nexera Developer Core", version="1.0.0")

WORKSPACE_DIR = os.path.abspath(os.path.join(os.getcwd(), "workspace"))
if not os.path.exists(WORKSPACE_DIR):
    os.makedirs(WORKSPACE_DIR, exist_ok=True)

def secure_path(relative_path: str) -> str:
    target = os.path.abspath(os.path.join(WORKSPACE_DIR, relative_path))
    if not os.path.normcase(target).startswith(os.path.normcase(WORKSPACE_DIR)):
        raise ValueError("Security violation: Path is outside workspace bounds.")
    return target


# CORS config
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

websocket_manager = ConnectionManager()

# Global state to track active tasks
active_tasks = {}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    try:
        await websocket_manager.connect(websocket)
        await websocket_manager.broadcast({
            "type": "system",
            "message": "🔌 Connected to Nexera Core Platform"
        })
        while True:
            data = await websocket.receive_json()
            message_type = data.get('type')
            if message_type == 'ping':
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket)
    except Exception as e:
        print(f"WS Exception: {e}")
        try:
            websocket_manager.disconnect(websocket)
        except Exception:
            pass

@app.websocket("/ws/terminal")
async def terminal_websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    process = None
    try:
        # Spawn isolated powershell process bound to WORKSPACE_DIR
        process = await asyncio.create_subprocess_exec(
            "powershell.exe",
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=WORKSPACE_DIR
        )
    except Exception as e:
        await websocket.send_json({"type": "terminal_out", "data": f"Failed to spawn PowerShell: {e}\n"})
        await websocket.close()
        return

    # Task to read stdout
    async def read_stdout():
        try:
            while True:
                chunk = await process.stdout.read(2048)
                if not chunk:
                    break
                try:
                    text = chunk.decode("utf-8")
                except UnicodeDecodeError:
                    text = chunk.decode("cp1252", errors="replace")
                await websocket.send_json({"type": "terminal_out", "data": text})
        except asyncio.CancelledError:
            pass
        except Exception as e:
            print(f"Stdout read error: {e}")

    # Task to read stderr
    async def read_stderr():
        try:
            while True:
                chunk = await process.stderr.read(2048)
                if not chunk:
                    break
                try:
                    text = chunk.decode("utf-8")
                except UnicodeDecodeError:
                    text = chunk.decode("cp1252", errors="replace")
                await websocket.send_json({"type": "terminal_out", "data": text})
        except asyncio.CancelledError:
            pass
        except Exception as e:
            print(f"Stderr read error: {e}")

    stdout_task = asyncio.create_task(read_stdout())
    stderr_task = asyncio.create_task(read_stderr())

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")
            if msg_type == "terminal_in":
                cmd = data.get("data", "")
                if process.stdin and not process.stdin.is_closing():
                    process.stdin.write(cmd.encode("utf-8"))
                    await process.stdin.drain()
            elif msg_type == "terminal_reset":
                # Cleanly reset and respawn
                stdout_task.cancel()
                stderr_task.cancel()
                if process:
                    try:
                        process.terminate()
                        await process.wait()
                    except Exception:
                        pass
                
                await websocket.send_json({"type": "terminal_out", "data": "\r\n🔄 Resetting PowerShell session...\r\n"})
                
                process = await asyncio.create_subprocess_exec(
                    "powershell.exe",
                    "-NoProfile",
                    "-ExecutionPolicy",
                    "Bypass",
                    stdin=asyncio.subprocess.PIPE,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    cwd=WORKSPACE_DIR
                )
                stdout_task = asyncio.create_task(read_stdout())
                stderr_task = asyncio.create_task(read_stderr())
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WS Terminal exception: {e}")
    finally:
        stdout_task.cancel()
        stderr_task.cancel()
        if process:
            try:
                process.terminate()
                await process.wait()
            except Exception:
                pass
        try:
            await websocket.close()
        except Exception:
            pass

@app.get("/api/workspace/tree")
async def get_workspace_tree_api():
    def traverse(current_path):
        items = []
        try:
            for entry in os.scandir(current_path):
                rel_path = os.path.relpath(entry.path, WORKSPACE_DIR).replace("\\", "/")
                if entry.is_dir():
                    if entry.name in ("__pycache__", ".git", ".next", "node_modules", "venv", ".venv"):
                        continue
                    items.append({
                        "name": entry.name,
                        "path": rel_path,
                        "is_dir": True,
                        "children": traverse(entry.path)
                    })
                else:
                    items.append({
                        "name": entry.name,
                        "path": rel_path,
                        "is_dir": False,
                        "size": entry.stat().st_size
                    })
        except Exception:
            pass
        items.sort(key=lambda x: (not x["is_dir"], x["name"].lower()))
        return items
    return JSONResponse(content=traverse(WORKSPACE_DIR))

@app.get("/api/workspace/search")
async def search_workspace_api(q: str = ""):
    if not q:
        return JSONResponse(content=[])
    matches = []
    try:
        for root, dirs, files in os.walk(WORKSPACE_DIR):
            if any(p in root for p in ("__pycache__", ".git", ".next", "node_modules", "venv", ".venv")):
                continue
            for file in files:
                filepath = os.path.join(root, file)
                rel_path = os.path.relpath(filepath, WORKSPACE_DIR).replace("\\", "/")
                try:
                    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                        for idx, line in enumerate(f):
                            if q.lower() in line.lower():
                                matches.append({
                                    "file": rel_path,
                                    "line": idx + 1,
                                    "content": line.strip()
                                })
                except Exception:
                    pass
    except Exception as e:
        return JSONResponse(status_code=500, content={"message": str(e)})
    return JSONResponse(content=matches[:50])

@app.get("/api/workspace/read")
async def read_workspace_file(path: str):
    try:
        abs_path = secure_path(path)
        if not os.path.exists(abs_path) or os.path.isdir(abs_path):
            return JSONResponse(status_code=404, content={"message": "File not found"})
        with open(abs_path, "r", encoding="utf-8") as f:
            content = f.read()
        return JSONResponse(content={"content": content})
    except ValueError as ve:
        return JSONResponse(status_code=403, content={"message": str(ve)})
    except Exception as e:
        return JSONResponse(status_code=500, content={"message": f"Read error: {str(e)}"})

@app.post("/api/workspace/save")
async def save_workspace_file(request: Request):
    try:
        data = await request.json()
        path = data.get("path")
        content = data.get("content", "")
        if not path:
            return JSONResponse(status_code=400, content={"message": "Path is required"})
        
        abs_path = secure_path(path)
        os.makedirs(os.path.dirname(abs_path), exist_ok=True)
        with open(abs_path, "w", encoding="utf-8") as f:
            f.write(content)
        return JSONResponse(content={"message": "File saved successfully"})
    except ValueError as ve:
        return JSONResponse(status_code=403, content={"message": str(ve)})
    except Exception as e:
        return JSONResponse(status_code=500, content={"message": f"Save error: {str(e)}"})

@app.post("/api/workspace/create")
async def create_workspace_item(request: Request):
    try:
        data = await request.json()
        path = data.get("path")
        is_dir = data.get("is_dir", False)
        if not path:
            return JSONResponse(status_code=400, content={"message": "Path is required"})
        
        abs_path = secure_path(path)
        if is_dir:
            os.makedirs(abs_path, exist_ok=True)
        else:
            os.makedirs(os.path.dirname(abs_path), exist_ok=True)
            if not os.path.exists(abs_path):
                with open(abs_path, "w", encoding="utf-8") as f:
                    f.write("")
        return JSONResponse(content={"message": f"{'Directory' if is_dir else 'File'} created successfully"})
    except ValueError as ve:
        return JSONResponse(status_code=403, content={"message": str(ve)})
    except Exception as e:
        return JSONResponse(status_code=500, content={"message": f"Create error: {str(e)}"})

@app.post("/api/workspace/delete")
async def delete_workspace_item(request: Request):
    try:
        data = await request.json()
        path = data.get("path")
        if not path:
            return JSONResponse(status_code=400, content={"message": "Path is required"})
        
        abs_path = secure_path(path)
        if os.path.exists(abs_path):
            if os.path.isdir(abs_path):
                import shutil
                shutil.rmtree(abs_path)
            else:
                os.remove(abs_path)
            return JSONResponse(content={"message": "Item deleted successfully"})
        return JSONResponse(status_code=404, content={"message": "Item not found"})
    except ValueError as ve:
        return JSONResponse(status_code=403, content={"message": str(ve)})
    except Exception as e:
        return JSONResponse(status_code=500, content={"message": f"Delete error: {str(e)}"})

@app.get("/api/status")
async def get_status():
    config = load_config()
    model_name = config.get("model", {}).get("name", "qwen2.5-coder:7b-instruct-q4_K_M")
    provider = config.get("model", {}).get("provider", "ollama")
    return {
        "status": "online",
        "model": model_name,
        "engine": f"{provider.capitalize()} Core"
    }

@app.get("/api/config")
async def get_config_api():
    return JSONResponse(content=load_config())

@app.post("/api/config/save")
async def save_config_api(request: Request):
    try:
        data = await request.json()
        success = save_config(data)
        if success:
            return JSONResponse(content={"message": "Configuration saved and loaded successfully"})
        else:
            return JSONResponse(status_code=500, content={"message": "Failed to save configuration"})
    except Exception as e:
        return JSONResponse(status_code=400, content={"message": f"Invalid data: {str(e)}"})

@app.get("/api/screenshot")
async def get_screenshot():
    capture_data = capture_desktop()
    return JSONResponse(content=capture_data)

# ───────────────────────────────────────────────────────────────
# CTO APPROVAL QUEUE REST ENDPOINTS
# ───────────────────────────────────────────────────────────────

@app.get("/api/approvals/pending")
async def get_pending_approval():
    """Fetches the active code file awaiting user/CTO review."""
    return JSONResponse(content={
        "has_pending": approval_queue["pending"] is not None,
        "item": approval_queue["pending"]
    })

@app.post("/api/approvals/submit")
async def submit_approval(request: Request):
    """Submits a decision ('approved' or 'rejected') with revision notes."""
    data = await request.json()
    status = data.get("status") # 'approved' or 'rejected'
    notes = data.get("revision_notes", "")
    
    if status not in ["approved", "rejected"]:
        return JSONResponse(status_code=400, content={"message": "Invalid approval status"})
        
    approval_queue["status"] = status
    approval_queue["notes"] = notes
    
    await websocket_manager.broadcast({
        "type": "system",
        "message": f"🛡️ CTO submitted approval: {status.upper()}" + (f" - Notes: '{notes}'" if notes else "")
    })
    
    return JSONResponse(content={"message": "Decision submitted successfully"})

# ───────────────────────────────────────────────────────────────
# TASK RUN LOOPS
# ───────────────────────────────────────────────────────────────

@app.post("/api/start")
async def start_task(request: Request):
    data = await request.json()
    raw_task = data.get('task', '')
    
    if not raw_task:
        return JSONResponse(status_code=400, content={"message": "No task prompt provided"})
        
    # Preprocess casual typing and expand shorthands using the pattern engine
    from backend.pattern_engine import clean_and_expand_prompt
    expansion_res = clean_and_expand_prompt(raw_task)
    task_prompt = expansion_res["expanded"]
    
    # Cancel previous run if any
    task_id = "agent_run_1"
    if task_id in active_tasks and not active_tasks[task_id].done():
        active_tasks[task_id].cancel()
        # Clean queues
        approval_queue["pending"] = None
        approval_queue["status"] = None
        await websocket_manager.broadcast({
            "type": "system",
            "message": "🛑 Cancelled previous active agent execution."
        })

    # Log spelling corrections and shorthand expansion diagnostics
    typos = expansion_res["typos_corrected"]
    shorthands = expansion_res["shorthands_expanded"]
    
    if typos or shorthands:
        style_log = "🧠 [Style Adaptation]: Auto-healing active!\n"
        if typos:
            style_log += f"  🪄 corrected: {', '.join(typos)}\n"
        if shorthands:
            style_log += f"  🚀 expanded shorthand: {', '.join(shorthands)}\n"
        style_log += f"  🔮 Expanded Prompt Blueprint: '{task_prompt}'"
        
        await websocket_manager.broadcast({
            "type": "system",
            "message": style_log
        })

    # Start the LangGraph workflow in background
    loop_task = asyncio.create_task(run_and_log_task(task_prompt))
    active_tasks[task_id] = loop_task

    return JSONResponse(content={"message": "Nexera LangGraph Swarm initiated", "task_id": task_id, "expanded_prompt": task_prompt})

@app.post("/api/stop")
async def stop_task():
    task_id = "agent_run_1"
    if task_id in active_tasks and not active_tasks[task_id].done():
        active_tasks[task_id].cancel()
        # Clean queues
        approval_queue["pending"] = None
        approval_queue["status"] = None
        await websocket_manager.broadcast({
            "type": "system",
            "message": "🛑 Agent execution forcefully aborted."
        })
        return JSONResponse(content={"message": "Execution terminated"})
    return JSONResponse(content={"message": "No active tasks to stop"})

async def run_and_log_task(prompt: str):
    try:
        await websocket_manager.broadcast({
            "type": "agent",
            "agent": "CEO",
            "message": f"🚀 Starting Swarm Plan for task: '{prompt}'"
        })
        
        await run_task(prompt, websocket_manager)
        
        await websocket_manager.broadcast({
            "type": "system",
            "message": "🏁 Task execution completed."
        })
    except asyncio.CancelledError:
        await websocket_manager.broadcast({
            "type": "system",
            "message": "❌ Task execution was aborted by user request."
        })
    except Exception as e:
        await websocket_manager.broadcast({
            "type": "error",
            "message": f"Critical Swarm Error: {str(e)}"
        })

# ───────────────────────────────────────────────────────────────
# PERSONALIZATION & PATTERN LEARNING PORTAL ENDPOINTS
# ───────────────────────────────────────────────────────────────

@app.get("/api/patterns")
async def get_patterns():
    from backend.pattern_engine import load_patterns_config
    return JSONResponse(content=load_patterns_config())

@app.post("/api/patterns/shorthand")
async def save_shorthand_api(request: Request):
    from backend.pattern_engine import add_shorthand
    data = await request.json()
    trigger = data.get("trigger", "").strip().lower()
    expansion = data.get("expansion", "").strip()
    if not trigger or not expansion:
        return JSONResponse(status_code=400, content={"message": "Trigger and expansion required"})
    success = add_shorthand(trigger, expansion)
    return JSONResponse(content={"success": success, "message": "Shorthand trigger successfully saved"})

@app.post("/api/patterns/shorthand/delete")
async def delete_shorthand_api(request: Request):
    from backend.pattern_engine import delete_shorthand
    data = await request.json()
    trigger = data.get("trigger", "").strip().lower()
    if not trigger:
        return JSONResponse(status_code=400, content={"message": "Trigger required"})
    success = delete_shorthand(trigger)
    return JSONResponse(content={"success": success, "message": "Shorthand trigger successfully deleted"})

@app.post("/api/patterns/test")
async def test_pattern_expansion(request: Request):
    from backend.pattern_engine import clean_and_expand_prompt
    data = await request.json()
    prompt = data.get("prompt", "").strip()
    res = clean_and_expand_prompt(prompt, record_stats=False)
    return JSONResponse(content=res)

@app.post("/api/patterns/clear-stats")
async def clear_pattern_stats():
    from backend.pattern_engine import load_patterns_config, save_patterns_config
    patterns = load_patterns_config()
    patterns["analytics"] = {
        "total_prompts": 0,
        "typo_corrections_made": 0,
        "shorthands_applied": 0,
        "total_characters_processed": 0,
        "adaptation_level": "High",
        "user_tone_perception": "Brief & Shorthand"
    }
    success = save_patterns_config(patterns)
    return JSONResponse(content={"success": success, "message": "Adaptive analytics reset."})

# ───────────────────────────────────────────────────────────────
# GIT SOURCE CONTROL PORTAL ENDPOINTS
# ───────────────────────────────────────────────────────────────

@app.get("/api/git/status")
async def get_git_status():
    from backend.tools.git_ops import git_log
    from backend.tools.shell_ops import run_command
    
    # Run git status in workspace root
    status_res = run_command("git status -s", cwd=WORKSPACE_DIR)
    branch_res = run_command("git rev-parse --abbrev-ref HEAD", cwd=WORKSPACE_DIR)
    
    modified_files = []
    status_out = status_res.get("stdout", "").strip()
    if status_out:
        for line in status_out.split("\n"):
            if line.strip():
                # Parse output, e.g. "M backend/main.py"
                parts = line.strip().split(maxsplit=1)
                state = parts[0]
                filepath = parts[1] if len(parts) > 1 else ""
                modified_files.append({"file": filepath, "status": state})
                
    branch_name = branch_res.get("stdout", "").strip() or "main"
    if "not a git repository" in branch_name.lower() or not branch_name:
        branch_name = "main"
        
    commits = []
    try:
        commits = git_log(os.getcwd(), n=5)
    except Exception:
        # Graceful empty fallback if not initialized
        commits = [{"commit_hash": "a1b2c3d", "author": "Nexera", "message": "Initial bootstrap commit"}]
        
    return JSONResponse(content={
        "branch": branch_name,
        "modified_files": modified_files,
        "recent_commits": commits,
        "is_dirty": len(modified_files) > 0
    })

@app.post("/api/git/commit")
async def commit_git_changes(request: Request):
    from backend.tools.git_ops import git_add, git_commit
    data = await request.json()
    message = data.get("message", "Update from Nexera OS").strip()
    
    try:
        # Run add all inside workspace
        git_add(os.getcwd(), ".")
        # Run commit inside workspace
        res = git_commit(os.getcwd(), message)
        await websocket_manager.broadcast({
            "type": "system",
            "message": f"🌿 [Git]: Committed workspace changes: '{message}'"
        })
        return JSONResponse(content={"success": True, "message": "Changes committed successfully"})
    except Exception as e:
        return JSONResponse(status_code=500, content={"message": f"Commit failed: {e}"})

# ───────────────────────────────────────────────────────────────
# OS DESKTOP AUTOMATION PORTAL ENDPOINTS
# ───────────────────────────────────────────────────────────────

@app.post("/api/automation/run")
async def run_desktop_automation(request: Request):
    from backend.tools.automation_ops import trigger_mouse_click, trigger_key_sequence, run_playwright_crawl
    data = await request.json()
    action = data.get("action", "") # 'click', 'type', 'crawl'
    
    await websocket_manager.broadcast({
        "type": "system",
        "message": f"🛡️ [OS Automation]: Executing remote action: '{action.upper()}'"
    })
    
    res = {"success": False, "log": "Unknown action"}
    if action == "click":
        x = int(data.get("x", 0))
        y = int(data.get("y", 0))
        res = trigger_mouse_click(x, y)
    elif action == "type":
        text = data.get("text", "")
        res = trigger_key_sequence(text)
    elif action == "crawl":
        url = data.get("url", "")
        res = await run_playwright_crawl(url)
        
    await websocket_manager.broadcast({
        "type": "system",
        "message": f"🤖 [OS Automation]: {res.get('log', '')}"
    })
    return JSONResponse(content=res)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)