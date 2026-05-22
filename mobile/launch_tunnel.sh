#!/bin/bash
# Nexera OS PWA Cloudflare Tunnel Launch Script
# Exposes local port 3000 (Next.js PWA Client) to a secure public URL.

echo "--------------------------------------------------------"
echo "🌌 Nexera OS: Starting Secure Remote CTO Gateway Tunnel..."
echo "--------------------------------------------------------"

if ! command -v cloudflared &> /dev/null
then
    echo "❌ ERROR: 'cloudflared' command not found."
    echo "💡 Please install the Cloudflare Tunnel CLI daemon: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/install-lookup/"
    exit 1
fi

echo "🚀 Exposing Next.js PWA Client (http://localhost:3000) over HTTPS..."
cloudflared tunnel --url http://localhost:3000
