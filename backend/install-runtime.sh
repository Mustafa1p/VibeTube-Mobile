#!/usr/bin/env bash
set -euo pipefail
# Run via SSH. No credentials are read, stored, or included in this script.
runtime="${VIBETUBE_RUNTIME:-$HOME/vibetube-runtime}"
mkdir -p "$runtime"
chmod 700 "$runtime"
cd "$runtime"
curl -fL --max-time 120 https://github.com/yt-dlp/yt-dlp/releases/download/2026.08.19/yt-dlp_linux -o yt-dlp_linux
curl -fL --max-time 30 https://github.com/yt-dlp/yt-dlp/releases/download/2026.08.19/SHA2-256SUMS -o ytdlp-shasums.txt
awk '$2 == "yt-dlp_linux" {print}' ytdlp-shasums.txt | sha256sum --check --status
mv yt-dlp_linux yt-dlp
chmod 700 yt-dlp
curl -fL --max-time 120 https://nodejs.org/dist/v22.23.3/node-v22.23.3-linux-x64.tar.gz -o node-v22.23.3-linux-x64.tar.gz
curl -fL --max-time 30 https://nodejs.org/dist/v22.23.3/SHASUMS256.txt -o node-shasums.txt
awk '$2 == "node-v22.23.3-linux-x64.tar.gz" {print}' node-shasums.txt | sha256sum --check --status
tar -xzf node-v22.23.3-linux-x64.tar.gz
TMPDIR="$runtime" "$runtime/yt-dlp" --version
"$runtime/node-v22.23.3-linux-x64/bin/node" --version
