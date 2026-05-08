#!/bin/bash
# Kill whatever is on port 3000 and restart the Next.js dev server
echo "Stopping port 3000..."
kill -9 $(lsof -ti:3000) 2>/dev/null
sleep 1
echo "Starting Next.js on port 3000..."
cd "$(dirname "$0")"
npx next dev --port 3000
