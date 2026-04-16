#!/bin/bash
# InfraScan - Full Demo Startup Script
# Starts: Backend API + MAVLink Bridge
# Usage: chmod +x start_demo.sh && ./start_demo.sh

set -e
export PATH=$PATH:/opt/homebrew/bin

BACKEND_DIR="$(cd "$(dirname "$0")/backend" && pwd)"
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "╔═══════════════════════════════════════════════════╗"
echo "║         InfraScan Demo Startup                    ║"
echo "╚═══════════════════════════════════════════════════╝"
echo ""

# Activate virtualenv
source "$BACKEND_DIR/venv/bin/activate"
echo "✅ Python venv activated"

# ── Step 1: InfraScan Backend ────────────────────────────────────────────────
echo ""
echo "▶ Starting InfraScan Backend (port 8000)..."
cd "$BACKEND_DIR"
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
sleep 2
echo "✅ Backend running (PID $BACKEND_PID) → http://localhost:8000"
echo "   Swagger docs → http://localhost:8000/docs"

# ── Step 2: MAVLink Bridge ───────────────────────────────────────────────────
echo ""
echo "▶ Starting MAVLink Bridge (port 8001)..."
echo "  Waiting for drone/SITL on UDP 0.0.0.0:14551 ..."
python mavlink_bridge.py &
BRIDGE_PID=$!
sleep 2
echo "✅ Bridge running (PID $BRIDGE_PID) → http://localhost:8001"

# ── Step 3: Frontend ─────────────────────────────────────────────────────────
echo ""
echo "▶ Starting Frontend (port 5173)..."
cd "$PROJECT_DIR"
npm run dev &
FRONTEND_PID=$!
sleep 3
echo "✅ Frontend running → http://localhost:5173"

# ── Done ─────────────────────────────────────────────────────────────────────
echo ""
echo "╔═══════════════════════════════════════════════════╗"
echo "║  All services running!                            ║"
echo "║                                                   ║"
echo "║  Frontend    → http://localhost:5173              ║"
echo "║  Backend API → http://localhost:8000              ║"
echo "║  API Docs    → http://localhost:8000/docs         ║"
echo "║  MAVLink     → http://localhost:8001              ║"
echo "╠═══════════════════════════════════════════════════╣"
echo "║  SITL Setup (run in a separate terminal):         ║"
echo "║                                                   ║"
echo "║  docker run -it --rm \                            ║"
echo "║    -p 14550:14550/udp -p 14551:14551/udp \        ║"
echo "║    ardupilot/ardupilot-dev-ros bash -c            ║"
echo "║    'cd /ardupilot &&                              ║"
echo "║    python Tools/autotest/sim_vehicle.py           ║"
echo "║    -v ArduCopter                                  ║"
echo "║    --out=udp:host.docker.internal:14550           ║"
echo "║    --out=udp:host.docker.internal:14551'          ║"
echo "║                                                   ║"
echo "║  Then open APM Planner 2 → Connect UDP:14550     ║"
echo "╚═══════════════════════════════════════════════════╝"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for Ctrl+C, then kill all background jobs
trap "echo ''; echo 'Stopping all services...'; kill $BACKEND_PID $BRIDGE_PID $FRONTEND_PID 2>/dev/null; echo 'Done.'" SIGINT SIGTERM
wait
