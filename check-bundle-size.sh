#!/bin/bash

echo "=== Bundle Size Analysis ==="
echo ""

total=0
for f in .next/static/chunks/*.js; do
  if [ -f "$f" ]; then
    size=$(gzip -c "$f" | wc -c | awk '{print $1}')
    total=$((total + size))
    kb=$(echo "scale=2; $size/1024" | bc)
    echo "$(basename "$f"): ${kb} KB (gzipped)"
  fi
done

total_kb=$(echo "scale=2; $total/1024" | bc)
echo ""
echo "=== Total gzipped JS size: ${total_kb} KB ==="
