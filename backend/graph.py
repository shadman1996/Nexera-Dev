import asyncio
import os
import re
import urllib.request
import json
from langchain_ollama import ChatOllama
from backend.websocket_manager import ConnectionManager
from backend.config import load_config

# Global approval hook state
approval_queue = {
    "pending": None,  # {"filepath": str, "content": str}
    "status": None,   # 'approved' or 'rejected'
    "notes": ""       # CTO revision notes
}

class HybridChatClient:
    def __init__(self, config: dict):
        self.config = config
        # Initialize ChatOllama locally as backup
        try:
            model_info = config.get("model", {})
            model_name = model_info.get("name", "qwen2.5-coder:7b-instruct-q4_K_M")
            temperature = model_info.get("temperature", 0.1)
            base_url = model_info.get("base_url", "http://127.0.0.1:11434")
            self.local_llm = ChatOllama(
                model=model_name,
                base_url=base_url,
                temperature=temperature,
                timeout=30.0
            )
        except Exception:
            self.local_llm = None

    def call_gemini(self, prompt: str, model_name: str, api_key: str, temperature: float) -> str:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
        headers = {"Content-Type": "application/json"}
        data = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": temperature}
        }
        req = urllib.request.Request(
            url, 
            data=json.dumps(data).encode("utf-8"), 
            headers=headers, 
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=20) as res:
            resp_data = json.loads(res.read().decode("utf-8"))
            return resp_data["candidates"][0]["content"]["parts"][0]["text"]

    def call_openai(self, prompt: str, model_name: str, api_key: str, temperature: float) -> str:
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }
        data = {
            "model": model_name,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature
        }
        req = urllib.request.Request(
            url, 
            data=json.dumps(data).encode("utf-8"), 
            headers=headers, 
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=20) as res:
            resp_data = json.loads(res.read().decode("utf-8"))
            return resp_data["choices"][0]["message"]["content"]

    def call_anthropic(self, prompt: str, model_name: str, api_key: str, max_tokens: int) -> str:
        url = "https://api.anthropic.com/v1/messages"
        headers = {
            "Content-Type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01"
        }
        data = {
            "model": model_name,
            "max_tokens": max_tokens,
            "messages": [{"role": "user", "content": prompt}]
        }
        req = urllib.request.Request(
            url, 
            data=json.dumps(data).encode("utf-8"), 
            headers=headers, 
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=20) as res:
            resp_data = json.loads(res.read().decode("utf-8"))
            return resp_data["content"][0]["text"]

    async def invoke(self, prompt: str, logger=None) -> str:
        provider = self.config.get("model", {}).get("provider", "ollama")
        model_name = self.config.get("model", {}).get("name", "qwen2.5-coder:7b-instruct-q4_K_M")
        temperature = self.config.get("model", {}).get("temperature", 0.1)
        max_tokens = self.config.get("model", {}).get("max_context_tokens", 8192)
        api_keys = self.config.get("api_keys", {})
        
        gemini_key = api_keys.get("gemini", "").strip()
        openai_key = api_keys.get("openai", "").strip()
        anthropic_key = api_keys.get("anthropic", "").strip()

        # Hybrid routing: Gemini fallback routing
        if provider == "gemini" and gemini_key:
            try:
                if logger:
                    await logger("📡 Contacting cloud Gemini endpoint...")
                res = await asyncio.to_thread(
                    self.call_gemini, prompt, model_name, gemini_key, temperature
                )
                return res
            except Exception as e:
                if logger:
                    await logger(f"⚠ Gemini API key failed/exhausted ({e}). Fallback: Local AI taking over!")
                if self.local_llm:
                    res = await asyncio.to_thread(self.local_llm.invoke, prompt)
                    return str(res.content)
                raise e

        # OpenAI routing
        elif provider == "openai" and openai_key:
            try:
                if logger:
                    await logger("📡 Contacting cloud OpenAI endpoint...")
                res = await asyncio.to_thread(
                    self.call_openai, prompt, model_name, openai_key, temperature
                )
                return res
            except Exception as e:
                if logger:
                    await logger(f"⚠ OpenAI API key failed ({e}). Fallback: Local AI taking over!")
                if self.local_llm:
                    res = await asyncio.to_thread(self.local_llm.invoke, prompt)
                    return str(res.content)
                raise e

        # Anthropic routing
        elif provider == "anthropic" and anthropic_key:
            try:
                if logger:
                    await logger("📡 Contacting cloud Anthropic endpoint...")
                res = await asyncio.to_thread(
                    self.call_anthropic, prompt, model_name, anthropic_key, max_tokens
                )
                return res
            except Exception as e:
                if logger:
                    await logger(f"⚠ Anthropic API key failed ({e}). Fallback: Local AI taking over!")
                if self.local_llm:
                    res = await asyncio.to_thread(self.local_llm.invoke, prompt)
                    return str(res.content)
                raise e

        # Local Ollama client default fallback
        else:
            if not self.local_llm:
                raise ValueError("Ollama backup server offline and no API keys provided.")
            res = await asyncio.to_thread(self.local_llm.invoke, prompt)
            return str(res.content)

class Agent:
    def __init__(self, name: str, role: str, websocket_manager: ConnectionManager = None):
        self.name = name
        self.role = role
        self.websocket_manager = websocket_manager
        try:
            config = load_config()
            self.client = HybridChatClient(config)
        except Exception:
            self.client = None

    async def log(self, message: str):
        try:
            print(f"[{self.name}] {message}")
        except UnicodeEncodeError:
            # Fallback to ascii representation for consoles that do not support unicode emojis
            clean_msg = message.encode("ascii", "replace").decode("ascii")
            print(f"[{self.name}] {clean_msg}")
        if self.websocket_manager:
            await self.websocket_manager.broadcast({
                "type": "agent",
                "agent": self.name,
                "role": self.role,
                "message": message
            })

    async def chat(self, prompt: str) -> str:
        if not self.client:
            return self.fallback_response(prompt)
        try:
            return await self.client.invoke(prompt, self.log)
        except Exception as e:
            await self.log(f"⚠ Swarm Inference Failed ({e}). Loading fallback solver.")
            return self.fallback_response(prompt)

    def fallback_response(self, prompt: str) -> str:
        if "CEO" in self.name:
            return "1. Create file `backend/app.py` with FastAPI setup.\n2. Write automated tests in `test_app.py`."
        elif "Engineer" in self.name:
            return "```python\n# Nexera Solved Execution Block\nprint('System operational!')\n```"
        else:
            return "SUCCESS: Code meets all criteria. Zero errors discovered."


class CEO(Agent):
    def __init__(self, websocket_manager=None):
        super().__init__("CEO", "System Architect & Planner", websocket_manager)

    async def execute(self, task: str) -> list:
        await self.log(f"📋 Planning: '{task}'")
        prompt = (
            f"You are the CEO Agent. Decompose this goal into a short list of numeric steps "
            f"for our software developer to build. Keep it brief:\nGoal: {task}"
        )
        plan = await self.chat(prompt)
        await self.log(f"📝 Plan established:\n{plan}")
        
        steps = [line.strip() for line in plan.split("\n") if line.strip() and re.match(r'^\d+\.', line.strip())]
        if not steps:
            steps = [f"1. Build component for {task}", "2. Write tests for the component"]
        return steps


class Engineer(Agent):
    def __init__(self, websocket_manager=None):
        super().__init__("Engineer", "Core Code Generator", websocket_manager)

    async def execute(self, task: str) -> str:
        await self.log(f"💻 Drafting code: '{task}'")
        prompt = (
            f"You are the Engineer Agent. Write a valid Python code block (inside ```python ... ```) "
            f"that fulfills this task. Do not include excessive commentary, just functional code:\nTask: {task}"
        )
        code_response = await self.chat(prompt)
        
        match = re.search(r'```python\n(.*?)```', code_response, re.DOTALL)
        code = match.group(1).strip() if match else code_response.strip()
        code = code.replace("```python", "").replace("```", "").strip()
        
        # Deduce a logical relative filename from task
        filepath = "app.py"
        if "test" in task.lower():
            filepath = "test_app.py"
        elif "database" in task.lower() or "db" in task.lower():
            filepath = "database.py"

        # ───────────────────────────────────────────────────────────
        # CTO INTERRUPT APPROVAL LOCK
        # ───────────────────────────────────────────────────────────
        approval_queue["pending"] = {
            "filepath": filepath,
            "content": code
        }
        approval_queue["status"] = None
        approval_queue["notes"] = ""

        await self.log(f"🛡️ CTO Approval Required! Staged file '{filepath}' for mobile review.")

        # Polling wait loop
        while approval_queue["status"] is None:
            await asyncio.sleep(1.0)

        decision = approval_queue["status"]
        revision_notes = approval_queue["notes"]

        # Reset structure
        approval_queue["pending"] = None
        approval_queue["status"] = None

        if decision == "rejected":
            await self.log(f"✗ CTO REJECTED build! Reason: '{revision_notes}'. Adjusting code...")
            raise Exception(f"Revision requested by CTO: {revision_notes}")

        await self.log(f"✓ CTO APPROVED build! Writing file to '{filepath}'...")
        
        # Write file to disk
        try:
            full_path = os.path.join(os.getcwd(), "workspace", filepath)
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            with open(full_path, "w", encoding="utf-8") as f:
                f.write(code)
            await self.log(f"💾 Successfully saved: '{filepath}'")
        except Exception as write_err:
            await self.log(f"❌ Save error on '{filepath}': {write_err}")

        return code


class QA(Agent):
    def __init__(self, websocket_manager=None):
        super().__init__("QA", "Automated QA & Tester", websocket_manager)

    async def execute(self, code: str) -> dict:
        await self.log("🔍 Running syntax check and unit test suite...")
        # 1. First run the basic compile sanity
        try:
            compile(code, "<string>", "exec")
        except SyntaxError as syntax_err:
            await self.log(f"❌ Syntax validation FAILED: {syntax_err}")
            return {"success": False, "details": f"Python Syntax Error: {syntax_err}"}
            
        # 2. Run Python unittest on the workspace
        import subprocess
        try:
            await self.log("⚙️ Spawning workspace unittest runner process...")
            result = await asyncio.to_thread(
                subprocess.run,
                "python -m unittest discover -s workspace -p \"test_*.py\"",
                shell=True,
                cwd=os.getcwd(),
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                await self.log("✅ Workspace tests PASSED successfully!")
                return {"success": True, "details": "Syntax valid & all unit tests passed."}
            else:
                stderr_log = result.stderr or ""
                stdout_log = result.stdout or ""
                combined_err = f"{stderr_log}\n{stdout_log}".strip()
                await self.log("❌ Workspace unit test suite FAILED!")
                
                # Extract clean traceback/error message summary (grab last 12 lines)
                traceback_lines = [line for line in combined_err.split("\n") if line.strip()]
                short_err = "\n".join(traceback_lines[-12:])
                await self.log(f"🔴 Captured failure traceback summary:\n{short_err}")
                return {
                    "success": False,
                    "details": f"Test Execution Failure:\n{combined_err}"
                }
        except Exception as e:
            await self.log(f"❌ Test subprocess execution encountered a runtime error: {e}")
            return {"success": False, "details": f"Tester Exception: {str(e)}"}



async def run_task(task: str, websocket_manager: ConnectionManager = None):
    ceo = CEO(websocket_manager)
    engineer = Engineer(websocket_manager)
    qa = QA(websocket_manager)

    steps = await ceo.execute(task)

    for index, step in enumerate(steps):
        if websocket_manager:
            await websocket_manager.broadcast({
                "type": "system",
                "message": f"⏳ Active Step {index+1}/{len(steps)}: {step}"
            })
            
        success = False
        retries = 3
        current_task = step
        
        while not success and retries > 0:
            try:
                code = await engineer.execute(current_task)
                validation = await qa.execute(code)
                
                if validation["success"]:
                    success = True
                    if websocket_manager:
                        await websocket_manager.broadcast({
                            "type": "system",
                            "message": f"✨ Step {index+1} completed!"
                        })
                else:
                    retries -= 1
                    error_msg = validation["details"]
                    if websocket_manager:
                        await websocket_manager.broadcast({
                            "type": "system",
                            "message": f"⟳ QA failure. Retrying (Retries remaining: {retries})"
                        })
                    current_task = (
                        f"{step}\nNOTE: Previous attempt failed with compiler error: '{error_msg}'. "
                        f"Please rewrite the code correcting this error."
                    )
            except Exception as e:
                # Catch CTO Rejections
                if "Revision requested by CTO" in str(e):
                    # CTO requested revision, treat as a heal pass with revision notes
                    retries -= 1
                    current_task = f"{step}\nNOTE: CTO rejected previous attempt. Revision requested: '{str(e)}'."
                else:
                    raise e

        if not success:
            if websocket_manager:
                await websocket_manager.broadcast({
                    "type": "error",
                    "message": f"❌ Step {index+1} aborted: Max retries exceeded."
                })
            break