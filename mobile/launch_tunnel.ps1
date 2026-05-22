# Nexera OS PWA Cloudflare Tunnel Launch Script (PowerShell)
# Exposes local port 3001 (Next.js PWA Client) to a secure public URL.

Write-Output "--------------------------------------------------------"
Write-Output "🌌 Nexera OS: Starting Secure Remote CTO Gateway Tunnel..."
Write-Output "--------------------------------------------------------"

if (-not (Get-Command "cloudflared" -ErrorAction SilentlyContinue)) {
    Write-Output "❌ ERROR: 'cloudflared' command not found."
    Write-Output "💡 Please install the Cloudflare Tunnel CLI daemon: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/install-lookup/"
    exit 1
}

Write-Output "🚀 Exposing Next.js PWA Client (http://localhost:3001) over HTTPS..."
cloudflared tunnel --url http://localhost:3001
