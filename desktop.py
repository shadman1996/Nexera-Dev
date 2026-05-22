"""
Nexera Automation OS — Desktop Launcher
Wraps the FastAPI backend + HTML IDE inside a native webview window.
Mirrors the Antigravity desktop.py pattern.
"""
import os
import sys
import socket
import threading
import time
import subprocess
import webbrowser

# ──────────────────────────────────────────────────────
# Attempt native webview (pywebview). If unavailable,
# fall back to opening the IDE in the default browser.
# ──────────────────────────────────────────────────────
try:
    import webview
    HAS_WEBVIEW = True
except ImportError:
    HAS_WEBVIEW = False

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
IDE_PATH  = os.path.join(BASE_DIR, "desktop", "index.html")
API_HOST  = "127.0.0.1"
API_PORT  = 8000

# ──────────────────────────────────────────────────────
# Start FastAPI / Uvicorn backend
# ──────────────────────────────────────────────────────
def start_backend():
    """Launch the Nexera FastAPI backend in a subprocess."""
    try:
        subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "backend.main:app",
             "--host", API_HOST,
             "--port", str(API_PORT),
             "--reload"],
            cwd=BASE_DIR,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        print(f"[Nexera] Backend started → http://{API_HOST}:{API_PORT}")
    except Exception as e:
        print(f"[Nexera] Backend start error: {e}")


def wait_for_backend(host=API_HOST, port=API_PORT, timeout=15) -> bool:
    """Poll until the FastAPI server is accepting TCP connections."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with socket.create_connection((host, port), timeout=0.4):
                return True
        except OSError:
            time.sleep(0.2)
    return False


# ──────────────────────────────────────────────────────
# Main entry point
# ──────────────────────────────────────────────────────
if __name__ == "__main__":
    print("╔══════════════════════════════════════════╗")
    print("║   NEXERA AUTOMATION OS  ///  GENESIS     ║")
    print("╚══════════════════════════════════════════╝")
    print(f"[Nexera] Booting backend on {API_HOST}:{API_PORT} ...")

    # 1. Start backend
    start_backend()

    # 2. Wait for it to be ready
    if not wait_for_backend():
        print("[Nexera] ⚠  Backend did not start within 15s — opening IDE anyway.")

    print("[Nexera] Backend ready.")

    # 3. Open the IDE
    ide_url = f"http://{API_HOST}:{API_PORT}"  # serve index.html via FastAPI or static

    if HAS_WEBVIEW:
        print("[Nexera] Launching native desktop window (pywebview)...")
        webview.create_window(
            "NEXERA /// Automation OS",
            ide_url if os.path.exists(ide_url) else f"file:///{IDE_PATH.replace(os.sep, '/')}",
            width=1440,
            height=900,
            resizable=True,
            background_color="#0a0e17",
            min_size=(1000, 640),
        )
        webview.start()
    else:
        # Fallback: open in default browser
        print(f"[Nexera] pywebview not installed — opening IDE in browser: {ide_url}")
        print(f"[Nexera] Or open directly: file:///{IDE_PATH}")
        webbrowser.open(f"file:///{IDE_PATH.replace(os.sep, '/')}")
        print("[Nexera] Press Ctrl+C to stop the backend.")
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n[Nexera] Shutdown requested. Goodbye.")
