#!/usr/bin/env bash
# Session start: install dependencies and make sure the project builds.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -f package-lock.json ]; then npm ci; else npm install; fi
cargo build -q
echo "init: ok"
