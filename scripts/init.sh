#!/usr/bin/env bash
# Session start: install dependencies and make sure the project builds.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -f package-lock.json ]; then npm ci --silent --no-audit --no-fund; else npm install --silent --no-audit --no-fund; fi
cargo build -q
echo "init: ok"
