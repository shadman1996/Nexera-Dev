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

from backend.tools.sandbox_manager import DockerSandbox
sandbox = DockerSandbox(WORKSPACE_DIR)
# Perform a quick background status check
sandbox.check_docker_status()


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
    
    # Select spawner parameters dynamically based on sandbox state
    spawner_args = sandbox.get_terminal_spawner()
    is_docker = sandbox.is_active
    
    if is_docker:
        await websocket.send_json({
            "type": "terminal_out",
            "data": "🐳 [INFO] Trapping interactive terminal inside secure Docker sandbox.\r\n"
        })
    else:
        await websocket.send_json({
            "type": "terminal_out",
            "data": "⚠️ [WARNING] Docker sandbox not available. Running in host fallback mode.\r\n"
        })
        
    process = None
    try:
        # Spawn isolated container bash or local powershell process bound to WORKSPACE_DIR
        process = await asyncio.create_subprocess_exec(
            spawner_args[0],
            *spawner_args[1:],
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=WORKSPACE_DIR
        )
    except Exception as e:
        await websocket.send_json({"type": "terminal_out", "data": f"Failed to spawn terminal: {e}\n"})
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
                
                # Check status again on reset
                spawner_args = sandbox.get_terminal_spawner()
                is_docker = sandbox.is_active
                if is_docker:
                    await websocket.send_json({
                        "type": "terminal_out",
                        "data": "\r\n🔄 Resetting secure Docker sandbox session...\r\n"
                    })
                else:
                    await websocket.send_json({
                        "type": "terminal_out",
                        "data": "\r\n🔄 Resetting PowerShell session...\r\n"
                    })
                
                process = await asyncio.create_subprocess_exec(
                    spawner_args[0],
                    *spawner_args[1:],
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
    approval_queue["pending"] = None  # clear immediately so frontend poll stops showing the banner

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

# ───────────────────────────────────────────────────────────────
# SELF-TESTING & SYSTEM DIAGNOSTICS ENDPOINTS
# ───────────────────────────────────────────────────────────────

import io
import time
import ast
import unittest
import subprocess

class StructuredTestResult(unittest.TextTestResult):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.results = []

    def addSuccess(self, test):
        super().addSuccess(test)
        self.results.append({
            "name": str(test),
            "status": "passed",
            "message": ""
        })

    def addFailure(self, test, err):
        super().addFailure(test, err)
        self.results.append({
            "name": str(test),
            "status": "failed",
            "message": self._exc_info_to_string(err, test)
        })

    def addError(self, test, err):
        super().addError(test, err)
        self.results.append({
            "name": str(test),
            "status": "error",
            "message": self._exc_info_to_string(err, test)
        })

@app.post("/api/test/run")
async def run_self_tests(request: Request):
    """
    Triggers the multi-faceted Self-Testing suite:
    1. Python AST parsing sanity on all core backend modules.
    2. Frontend TypeScript types compilation validation.
    3. Programmatic workspace unittests discovery & execution.
    """
    await websocket_manager.broadcast({
        "type": "system",
        "message": "🚀 [Self-Tester]: Initiating full system self-testing sequence..."
    })
    
    # 1. Python Backend AST validation
    await websocket_manager.broadcast({
        "type": "system",
        "message": "🔍 [Self-Tester]: Scanning backend Python files for AST syntax integrity..."
    })
    
    ast_passed = True
    ast_errors = []
    backend_dir = os.path.abspath(os.path.join(os.getcwd(), "backend"))
    try:
        for root, _, files in os.walk(backend_dir):
            for file in files:
                if file.endswith(".py"):
                    filepath = os.path.join(root, file)
                    try:
                        with open(filepath, "r", encoding="utf-8") as f:
                            ast.parse(f.read())
                    except Exception as e:
                        ast_passed = False
                        ast_errors.append({
                            "file": os.path.relpath(filepath, os.getcwd()).replace("\\", "/"),
                            "error": str(e)
                        })
    except Exception as e:
        ast_passed = False
        ast_errors.append({"file": "backend_root", "error": str(e)})

    # 2. Frontend TS check
    await websocket_manager.broadcast({
        "type": "system",
        "message": "🔍 [Self-Tester]: Compiling React frontend models (npx tsc)..."
    })
    
    tsc_passed = True
    tsc_error = ""
    mobile_dir = os.path.abspath(os.path.join(os.getcwd(), "mobile"))
    if os.path.exists(mobile_dir):
        try:
            tsc_res = await asyncio.to_thread(
                subprocess.run,
                "npx tsc --noEmit",
                shell=True,
                cwd=mobile_dir,
                capture_output=True,
                text=True,
                timeout=30
            )
            if tsc_res.returncode != 0:
                tsc_passed = False
                tsc_error = tsc_res.stderr or tsc_res.stdout
        except Exception as e:
            tsc_passed = False
            tsc_error = str(e)
    else:
        tsc_passed = False
        tsc_error = "mobile/ directory not found"

    # 3. Discover and run Python unittests in the workspace
    await websocket_manager.broadcast({
        "type": "system",
        "message": "🔍 [Self-Tester]: Running workspace unit test suites..."
    })
    
    def run_tests_sync():
        loader = unittest.TestLoader()
        suite = loader.discover(start_dir=WORKSPACE_DIR, pattern="test_*.py")
        stream = io.StringIO()
        runner = unittest.TextTestRunner(stream=stream, resultclass=StructuredTestResult, verbosity=2)
        
        start_t = time.time()
        res = runner.run(suite)
        duration = time.time() - start_t
        
        test_cases = getattr(res, "results", [])
        total = res.testsRun
        failed = len(res.failures) + len(res.errors)
        passed = total - failed
        
        stream.seek(0)
        logs = stream.read()
        return {
            "total": total,
            "passed": passed,
            "failed": failed,
            "duration": round(duration, 3),
            "tests": test_cases,
            "logs": logs
        }
        
    try:
        if sandbox.is_active:
            await websocket_manager.broadcast({
                "type": "system",
                "message": "🐳 [Self-Tester]: Running unit tests securely inside Docker container..."
            })
            
            # Python script to run inside the container's workspace
            payload = (
                "import unittest, io, time, json\n"
                "class StructuredTestResult(unittest.TextTestResult):\n"
                "    def __init__(self, *args, **kwargs):\n"
                "        super().__init__(*args, **kwargs)\n"
                "        self.results = []\n"
                "    def addSuccess(self, test):\n"
                "        super().addSuccess(test)\n"
                "        self.results.append({'name': str(test), 'status': 'passed', 'message': ''})\n"
                "    def addFailure(self, test, err):\n"
                "        super().addFailure(test, err)\n"
                "        self.results.append({'name': str(test), 'status': 'failed', 'message': self._exc_info_to_string(err, test)})\n"
                "    def addError(self, test, err):\n"
                "        super().addError(test, err)\n"
                "        self.results.append({'name': str(test), 'status': 'error', 'message': self._exc_info_to_string(err, test)})\n"
                "\n"
                "loader = unittest.TestLoader()\n"
                "suite = loader.discover(start_dir='/workspace', pattern='test_*.py')\n"
                "stream = io.StringIO()\n"
                "runner = unittest.TextTestRunner(stream=stream, resultclass=StructuredTestResult, verbosity=2)\n"
                "start_t = time.time()\n"
                "res = runner.run(suite)\n"
                "duration = time.time() - start_t\n"
                "stream.seek(0)\n"
                "logs = stream.read()\n"
                "print(json.dumps({\n"
                "    'total': res.testsRun,\n"
                "    'passed': res.testsRun - len(res.failures) - len(res.errors),\n"
                "    'failed': len(res.failures) + len(res.errors),\n"
                "    'duration': round(duration, 3),\n"
                "    'tests': getattr(res, 'results', []),\n"
                "    'logs': logs\n"
                "}))\n"
            )
            
            cmd = ["python", "-c", payload]
            wrapped_cmd = sandbox.wrap_command(cmd)
            
            res = await asyncio.to_thread(
                subprocess.run,
                wrapped_cmd,
                shell=False,
                capture_output=True,
                text=True,
                timeout=45
            )
            
            if res.returncode == 0:
                import json
                test_res = json.loads(res.stdout.strip())
            else:
                stderr_err = res.stderr or res.stdout
                raise Exception(f"Container test execution failed: {stderr_err}")
        else:
            await websocket_manager.broadcast({
                "type": "system",
                "message": "⚠️ [Self-Tester]: [WARNING] Docker not detected. Executing terminal tests on local host."
            })
            test_res = await asyncio.to_thread(run_tests_sync)
    except Exception as e:
        test_res = {
            "total": 0,
            "passed": 0,
            "failed": 1,
            "duration": 0.0,
            "tests": [{"name": "discover_tests", "status": "failed", "message": str(e)}],
            "logs": f"Discovery/execution error: {e}"
        }

    # Combined summary
    total_passed = ast_passed and tsc_passed and (test_res["failed"] == 0)
    
    # Save the run outcome to sqlite database log
    try:
        import sqlite3
        conn = sqlite3.connect(os.path.join(os.getcwd(), "db.sqlite3"))
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS agent_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                agent_name TEXT,
                action TEXT,
                result TEXT,
                phase TEXT
            )
        """)
        cursor.execute("""
            INSERT INTO agent_logs (agent_name, action, result, phase)
            VALUES (?, ?, ?, ?)
        """, (
            "Self-Tester",
            "Interactive full self-test execution",
            f"AST: {'OK' if ast_passed else 'FAIL'}, TS: {'OK' if tsc_passed else 'FAIL'}, Tests: {test_res['passed']}/{test_res['total']} Passed",
            "testing"
        ))
        conn.commit()
        conn.close()
    except Exception as dberr:
        print(f"Failed to record self-test in database logs: {dberr}")

    message_str = f"🏁 [Self-Tester]: Self-testing completed! Result: {'✅ PASSED' if total_passed else '❌ FAILED'}. {test_res['passed']}/{test_res['total']} Tests OK."
    await websocket_manager.broadcast({
        "type": "system",
        "message": message_str
    })
    
    import json
    return JSONResponse(content={
        "success": total_passed,
        "ast": {
            "success": ast_passed,
            "errors": ast_errors
        },
        "tsc": {
            "success": tsc_passed,
            "error": tsc_error
        },
        "tests": test_res
    })

@app.get("/api/test/status")
async def get_test_status():
    """Retrieves the latest self-testing and build history from the SQLite database."""
    import sqlite3
    import json
    db_path = os.path.join(os.getcwd(), "db.sqlite3")
    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Query latest 10 test phase agent logs
        cursor.execute("""
            SELECT id, timestamp, agent_name, action, result, phase 
            FROM agent_logs 
            WHERE phase = 'testing' OR agent_name = 'Self-Tester' OR agent_name = 'CI_Swarm'
            ORDER BY id DESC LIMIT 10
        """)
        rows = cursor.fetchall()
        history = [dict(row) for row in rows]
        
        # Query active build states if any
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='build_state'")
        has_build_table = cursor.fetchone() is not None
        build_state = {}
        if has_build_table:
            cursor.execute("SELECT phase, status, files_json FROM build_state")
            for row in cursor.fetchall():
                build_state[row["phase"]] = {
                    "status": row["status"],
                    "data": json.loads(row["files_json"]) if row["files_json"] else {}
                }
        
        conn.close()
        return JSONResponse(content={
            "history": history,
            "build_state": build_state
        })
    except Exception as e:
        return JSONResponse(status_code=500, content={"message": f"Database read error: {e}"})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)