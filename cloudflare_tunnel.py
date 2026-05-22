"""
Nexera OS — Cloudflare Tunnel Launcher
Exposes the mobile PWA (localhost:3000) via a public HTTPS URL using cloudflared.

Usage:
    python cloudflare_tunnel.py             # tunnel to localhost:3000 (default)
    python cloudflare_tunnel.py --port 3001 # tunnel to a different port
"""

import subprocess
import sys
import shutil
import argparse
import re
import threading

CLOUDFLARED_DOWNLOAD = "https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"

def print_safe(msg: str):
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode("ascii", errors="replace").decode("ascii"))

def check_cloudflared() -> str | None:
    """Return path to cloudflared binary, or None if not found."""
    path = shutil.which("cloudflared")
    if path:
        return path
    # Common Windows install locations
    candidates = [
        r"C:\Program Files\cloudflared\cloudflared.exe",
        r"C:\Program Files (x86)\cloudflared\cloudflared.exe",
        r"C:\cloudflared\cloudflared.exe",
    ]
    for c in candidates:
        if shutil.which(c):
            return c
    return None

def stream_output(proc: subprocess.Popen, url_found: threading.Event):
    """Read cloudflared stderr line-by-line, print output, extract tunnel URL."""
    url_pattern = re.compile(r"https://[a-zA-Z0-9\-]+\.trycloudflare\.com")
    for line in iter(proc.stderr.readline, b""):
        decoded = line.decode("utf-8", errors="replace").rstrip()
        print_safe(f"  [cloudflared] {decoded}")
        match = url_pattern.search(decoded)
        if match and not url_found.is_set():
            url = match.group(0)
            print_safe("")
            print_safe("=" * 60)
            print_safe(f"  Nexera Mobile PWA is LIVE at:")
            print_safe(f"  {url}")
            print_safe("=" * 60)
            print_safe("  Open this URL on any device to access Nexera CTO Gateway.")
            print_safe("  Press Ctrl+C to stop the tunnel.")
            print_safe("")
            url_found.set()

def main():
    parser = argparse.ArgumentParser(description="Nexera Cloudflare Tunnel Launcher")
    parser.add_argument("--port", type=int, default=3000, help="Local port to expose (default: 3000)")
    args = parser.parse_args()

    print_safe("")
    print_safe("  Nexera OS -- Cloudflare Tunnel")
    print_safe("  Exposing mobile PWA to the internet...")
    print_safe("")

    binary = check_cloudflared()
    if not binary:
        print_safe("[ERROR] cloudflared not found on this system.")
        print_safe("")
        print_safe("Install cloudflared:")
        print_safe(f"  Windows (winget):  winget install --id Cloudflare.cloudflared")
        print_safe(f"  Manual download:   {CLOUDFLARED_DOWNLOAD}")
        print_safe("")
        print_safe("After installing, re-run: python cloudflare_tunnel.py")
        sys.exit(1)

    print_safe(f"[OK] cloudflared found: {binary}")
    print_safe(f"[OK] Tunneling localhost:{args.port} ...")
    print_safe("")

    cmd = [binary, "tunnel", "--url", f"http://localhost:{args.port}"]
    try:
        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        url_found = threading.Event()
        reader = threading.Thread(target=stream_output, args=(proc, url_found), daemon=True)
        reader.start()
        proc.wait()
    except KeyboardInterrupt:
        print_safe("")
        print_safe("[INFO] Tunnel stopped by user.")
        proc.terminate()
    except Exception as e:
        print_safe(f"[ERROR] Failed to start tunnel: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
