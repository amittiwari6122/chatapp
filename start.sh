#!/bin/bash
# Quick start script — runs both server and client concurrently

echo "🚀 Starting ChatApp..."
echo ""

# Check if mongodb is running
if ! command -v mongod &> /dev/null && ! pgrep -x mongod &> /dev/null; then
  echo "⚠️  MongoDB not detected locally."
  echo "   Either start MongoDB locally, or set MONGO_URI in server/.env to a MongoDB Atlas URI."
  echo ""
fi

# Install deps if needed
if [ ! -d "server/node_modules" ]; then
  echo "📦 Installing server dependencies..."
  (cd server && npm install)
fi

if [ ! -d "client/node_modules" ]; then
  echo "📦 Installing client dependencies..."
  (cd client && npm install)
fi

echo ""
echo "✅ Starting server on http://localhost:5000"
echo "✅ Starting client on http://localhost:5173"
echo ""
echo "Open http://localhost:5173 in your browser"
echo "Press Ctrl+C to stop"
echo ""

# Run both
(cd server && npm run dev) &
(cd client && npm run dev) &

wait
