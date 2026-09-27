#!/bin/sh
if curl -sf -o /dev/null http://127.0.0.1:8080/; then
  exit 0
fi
cd /workspace
npm run dev > /tmp/sable-dev.log 2>&1 &
