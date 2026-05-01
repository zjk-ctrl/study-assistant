#!/bin/bash
set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"

cd "${COZE_WORKSPACE_PATH}"

echo "Installing dependencies..."
pnpm install --prefer-frozen-lockfile --prefer-offline

# 加载环境变量（如果存在）
if [ -f .env.local ]; then
  echo "Loading environment variables from .env.local..."
  set -a
  source .env.local
  set +a
fi

echo "Building the Next.js project..."
pnpm next build

echo "Build completed successfully!"
