# -*- coding: utf-8 -*-
"""
Nexera OS Self-Tester & Diagnostic Suite
A high-fidelity terminal tool to validate backend, frontend, database, and agent swarm systems.
"""

import os
import sys
import ast
import time
import io
import sqlite3
import unittest
import subprocess
from datetime import datetime

# Enable ANSI escape sequences on Windows if possible
if sys.platform == "win32":
    try:
        import ctypes
        kernel32 = ctypes.windll.kernel32
        kernel32.SetConsoleMode(kernel32.GetStdHandle(-11), 7)
    except Exception:
        pass

# UI Colors & Glyph definitions
COLOR_GREEN = "\033[1;32m"
COLOR_RED = "\033[1;31m"
COLOR_BLUE = "\033[1;36m"
COLOR_YELLOW = "\033[1;33m"
COLOR_MAGENTA = "\033[1;35m"
COLOR_RESET = "\033[0m"

GLYPH_PASS = f"{COLOR_GREEN}✓{COLOR_RESET}"
GLYPH_FAIL = f"{COLOR_RED}✗{COLOR_RESET}"
GLYPH_INFO = f"{COLOR_BLUE}ℹ{COLOR_RESET}"
GLYPH_WARN = f"{COLOR_YELLOW}⚠{COLOR_RESET}"
GLYPH_SWARM = f"{COLOR_MAGENTA}⚙{COLOR_RESET}"

def safe_print(text, end="\n"):
    try:
        sys.stdout.write(text + end)
        sys.stdout.flush()
    except UnicodeEncodeError:
        try:
            # Fall back to safe characters
            clean = (text.replace("✓", "[PASS]")
                         .replace("✗", "[FAIL]")
                         .replace("ℹ", "[INFO]")
                         .replace("⚠", "[WARN]")
                         .replace("⚙", "[SWARM]")
                         .replace("●", "*")
                         .replace("★", "SUCCESS"))
            # Replace any other non-ascii character
            clean = clean.encode("ascii", "replace").decode("ascii")
            sys.stdout.write(clean + end)
            sys.stdout.flush()
        except Exception:
            pass

def clear_line():
    try:
        sys.stdout.write("\r\033[K")
        sys.stdout.flush()
    except Exception:
        pass

def print_header(title):
    safe_print(f"\n{COLOR_BLUE}● {title.upper()}{COLOR_RESET}")
    safe_print(f"{COLOR_BLUE}{'=' * 65}{COLOR_RESET}")

def run_step(name, action_func):
    safe_print(f"  {GLYPH_SWARM} {name} ... ", end="")
    
    start_t = time.time()
    try:
        success, message = action_func()
        duration = time.time() - start_t
        clear_line()
        if success:
            safe_print(f"  {GLYPH_PASS} {name} ({duration:.2f}s) | {message}")
            return True, message
        else:
            safe_print(f"  {GLYPH_FAIL} {name} ({duration:.2f}s) | {COLOR_RED}{message}{COLOR_RESET}")
            return False, message
    except Exception as e:
        duration = time.time() - start_t
        clear_line()
        safe_print(f"  {GLYPH_FAIL} {name} ({duration:.2f}s) | Exception: {COLOR_RED}{e}{COLOR_RESET}")
        return False, str(e)

# --- INDIVIDUAL VALIDATION CHECKS ---

def check_environment():
    # Verify directories exist
    required_dirs = ["backend", "mobile", "workspace"]
    missing = [d for d in required_dirs if not os.path.exists(d)]
    
    if missing:
        return False, f"Missing required folders: {', '.join(missing)}"
    
    py_ver = ".".join(map(str, sys.version_info[:3]))
    return True, f"Python v{py_ver} | Workspace boundaries verified"

def check_python_ast():
    backend_dir = os.path.abspath("backend")
    workspace_dir = os.path.abspath("workspace")
    
    errors = []
    for directory in [backend_dir, workspace_dir]:
        if not os.path.exists(directory):
            continue
        for root, _, files in os.walk(directory):
            for file in files:
                if file.endswith(".py"):
                    filepath = os.path.join(root, file)
                    try:
                        with open(filepath, "r", encoding="utf-8") as f:
                            ast.parse(f.read())
                    except Exception as e:
                        rel_path = os.path.relpath(filepath, os.getcwd())
                        errors.append(f"{rel_path}: {e}")
                        
    if errors:
        return False, f"AST compilation failed for:\n      " + "\n      ".join(errors)
    return True, "All backend and workspace Python modules parsed successfully"

def check_database():
    db_path = "db.sqlite3"
    if not os.path.exists(db_path):
        return False, "db.sqlite3 not found"
        
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check required tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [r[0] for r in cursor.fetchall()]
        
        required = ["agent_logs", "build_state"]
        missing = [t for t in required if t not in tables]
        
        if missing:
            conn.close()
            return False, f"Missing database tables: {', '.join(missing)}"
            
        cursor.execute("SELECT count(*) FROM agent_logs")
        logs_count = cursor.fetchone()[0]
        
        conn.close()
        return True, f"Connected | Logs count: {logs_count} | Tables integrity verified"
    except Exception as e:
        return False, f"Database access failed: {e}"

def check_backend_tests():
    # Programmatic Discovery & Running of Workspace Unittests
    loader = unittest.TestLoader()
    workspace_dir = os.path.abspath("workspace")
    if not os.path.exists(workspace_dir):
        return False, "Workspace directory does not exist"
        
    try:
        suite = loader.discover(start_dir=workspace_dir, pattern="test_*.py")
        stream = io.StringIO()
        runner = unittest.TextTestRunner(stream=stream, verbosity=1)
        
        result = runner.run(suite)
        total = result.testsRun
        failed = len(result.failures) + len(result.errors)
        passed = total - failed
        
        if failed > 0:
            err_details = []
            for test, err in result.failures + result.errors:
                err_details.append(f"{test}: {err.splitlines()[-1] if err.splitlines() else str(err)}")
            return False, f"Failed {failed}/{total} tests:\n      " + "\n      ".join(err_details)
            
        return True, f"100% Pass | {passed}/{total} tests completed successfully"
    except Exception as e:
        return False, f"Subprocess discovery error: {e}"

def check_frontend_types():
    mobile_dir = os.path.abspath("mobile")
    if not os.path.exists(mobile_dir):
        return False, "mobile/ directory missing"
        
    try:
        res = subprocess.run(
            "npx tsc --noEmit",
            shell=True,
            cwd=mobile_dir,
            capture_output=True,
            text=True,
            timeout=30
        )
        if res.returncode == 0:
            return True, "Static TypeScript analysis completed cleanly with 0 type errors"
        else:
            errors = res.stderr or res.stdout
            short_err = "\n      ".join(errors.splitlines()[:5])
            if len(errors.splitlines()) > 5:
                short_err += "\n      ... and more"
            return False, f"TypeScript checks failed:\n      {short_err}"
    except Exception as e:
        return False, f"TypeScript validator execution failed: {e}"

def check_frontend_build():
    mobile_dir = os.path.abspath("mobile")
    if not os.path.exists(mobile_dir):
        return False, "mobile/ directory missing"
        
    try:
        res = subprocess.run(
            "npm run build",
            shell=True,
            cwd=mobile_dir,
            capture_output=True,
            text=True,
            timeout=120
        )
        if res.returncode == 0:
            return True, "Next.js pages optimized and compiled cleanly for deployment"
        else:
            errors = res.stderr or res.stdout
            short_err = "\n      ".join(errors.splitlines()[:5])
            return False, f"Next.js build compilation failed:\n      {short_err}"
    except Exception as e:
        return False, f"Production bundler execution failed: {e}"

def check_agent_orchestrator():
    try:
        # Dry-run initialization of backend agents
        from backend.graph import CEO, Engineer, QA
        
        ceo = CEO()
        engineer = Engineer()
        qa = QA()
        
        if ceo.name == "CEO" and engineer.name == "Engineer" and qa.name == "QA":
            return True, "CEOs, Engineers, and QA Agents initialized correctly with hybrid router configurations"
        else:
            return False, "Agent configurations loaded incorrect name parameters"
    except Exception as e:
        return False, f"Agent Swarm initialization failed: {e}"


def main():
    safe_print(f"\n{COLOR_GREEN}================================================================={COLOR_RESET}")
    safe_print(f"{COLOR_GREEN}    NEXERA OS: SELF-TESTING & DIAGNOSTIC BLUEPRINT GATEWAY     {COLOR_RESET}")
    safe_print(f"{COLOR_GREEN}================================================================={COLOR_RESET}")
    safe_print(f"{GLYPH_INFO} Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    safe_print(f"{GLYPH_INFO} Workspace: {os.getcwd()}")
    
    results = {}
    
    # 1. Environment & Config
    print_header("1. Environment & Architecture System")
    results["Environment Setup"] = run_step("Environment Config", check_environment)
    
    # 2. Database Checks
    print_header("2. SQLite Telemetry Storage")
    results["Database Schema"] = run_step("Database Integrity", check_database)
    
    # 3. Backend Code Parsing & Unittests
    print_header("3. Python Backend Modules")
    results["Python AST"] = run_step("AST Syntax Verification", check_python_ast)
    results["Backend Unittests"] = run_step("Unit Test Discoveries", check_backend_tests)
    
    # 4. Agent Swarm Validation
    print_header("4. Orchestration & LLM Swarm Nodes")
    results["Swarm Core"] = run_step("Multi-Agent Configurations", check_agent_orchestrator)
    
    # 5. Frontend Validations
    print_header("5. React Frontend / Mobile CTO Gateway")
    results["Frontend TS Types"] = run_step("TypeScript Compilation", check_frontend_types)
    results["NextJS Production Bundle"] = run_step("Next.js Static Builds", check_frontend_build)
    
    # --- FINAL SCORE CARD REPORT ---
    print_header("Diagnostic Execution Summary")
    
    passed_cnt = sum(1 for name, res in results.items() if res[0])
    total_cnt = len(results)
    health_ratio = (passed_cnt / total_cnt) * 100
    
    safe_print(f"\n  Tests Run:      {total_cnt}")
    safe_print(f"  Tests Passed:   {COLOR_GREEN}{passed_cnt}{COLOR_RESET}")
    safe_print(f"  Tests Failed:   {COLOR_RED if total_cnt - passed_cnt > 0 else COLOR_GREEN}{total_cnt - passed_cnt}{COLOR_RESET}")
    
    score_color = COLOR_GREEN if health_ratio == 100.0 else COLOR_YELLOW if health_ratio >= 75.0 else COLOR_RED
    safe_print(f"  Health Score:   {score_color}{health_ratio:.1f}%{COLOR_RESET}")
    
    safe_print(f"\n{COLOR_GREEN}================================================================={COLOR_RESET}")
    if health_ratio == 100.0:
        safe_print(f"  {COLOR_GREEN}★ SUCCESS: All validation pipelines successfully verified!{COLOR_RESET}")
    else:
        safe_print(f"  {COLOR_RED}⚠ ATTENTION: Some validation pipeline tests failed. Review logs!{COLOR_RESET}")
    safe_print(f"{COLOR_GREEN}=================================================================\n{COLOR_RESET}")
    
    if health_ratio < 100.0:
        sys.exit(1)
    else:
        sys.exit(0)

if __name__ == "__main__":
    main()
