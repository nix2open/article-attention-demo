#!/usr/bin/env bash
# Архивирует текущий index.html и заливает новый (вызывается из CI или вручную)
set -euo pipefail

TARGET="${EMBED_TARGET_DIR:-/opt/premium-measure/public/embed/article-attention-demo-orange}"
SOURCE_FILE="${1:-orange/index.html}"
ARCHIVE_DIR="$TARGET/archived"

if [[ ! -f "$SOURCE_FILE" ]]; then
  echo "Файл не найден: $SOURCE_FILE" >&2
  exit 1
fi

mkdir -p "$ARCHIVE_DIR" "$TARGET"

if [[ -f "$TARGET/index.html" ]]; then
  TS="$(date -u +%Y-%m-%dT%H%M%SZ)"
  cp "$TARGET/index.html" "$ARCHIVE_DIR/index-archived-${TS}.html"
  echo "Archived: index-archived-${TS}.html"
fi

cp "$SOURCE_FILE" "$TARGET/index.html"
echo "Deployed: $TARGET/index.html"
