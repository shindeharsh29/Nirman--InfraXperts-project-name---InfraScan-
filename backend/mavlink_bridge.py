"""
InfraScan MAVLink Bridge — with built-in dronekit-sitl
Runs on port 8001.

Usage:
    cd backend && source venv/bin/activate
    python mavlink_bridge.py

This script:
1. Automatically starts a dronekit-sitl ArduCopter instance
2. Connects to it via pymavlink
3. Exposes REST API for InfraScan frontend:
   GET  /telemetry   — live drone telemetry
   POST /waypoint    — fly drone to lat/lng
   POST /return-home — RTL
   POST /land        — land drone

APM Planner 2 connection:
   Connect to TCP → 127.0.0.1:5760
   (or UDP → 127.0.0.1:14550)

For a PHYSICAL drone via USB (skip SITL):
   Set USE_SITL = False
   Set SERIAL_PORT = '/dev/tty.usbmodem1'
"""

import threading
import time
import logging
import socket
from typing import Optional
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

logging.basicConfig(level=logging.INFO, format='%(asctime)s [DRONE] %(message)s')
log = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────────────────────
USE_SITL    = True          # False = connect to real drone instead
SERIAL_PORT = '/dev/tty.usbmodem1'   # used only if USE_SITL = False
BAUD_RATE   = 57600
BRIDGE_PORT = 8001

HOME_LAT = 19.0760   # Mumbai — change to your city
HOME_LNG = 72.8777
HOME_ALT = 584.0     # altitude above sea level (metres)

# ── Shared telemetry state ────────────────────────────────────────────────────
drone_state = {
    "lat": HOME_LAT, "lng": HOME_LNG, "alt": 0.0,
    "speed": 0.0, "heading": 0.0, "armed": False,
    "mode": "STABILIZE", "battery": 100,
    "connected": False, "stale": True, "last_update": 0,
    "sitl_port": None,
}
state_lock = threading.Lock()
mavlink_conn = None
sitl_instance = None   # dronekit_sitl handle
apm_clients = set()    # set of (ip, port) tuples that have sent us a packet
apm_lock = threading.Lock()


# ── Start SITL & MAVLink reader ───────────────────────────────────────────────
def start_sitl_and_connect():
    global mavlink_conn, sitl_instance
    from pymavlink import mavutil

    if USE_SITL:
        try:
            import dronekit_sitl
            log.info("Starting dronekit-sitl ArduCopter ...")
            sitl_instance = dronekit_sitl.SITL()
            sitl_instance.download('copter', '3.3', verbose=False)
            sitl_args = [
                '--model', 'quad',
                '--home', f'{HOME_LAT},{HOME_LNG},{HOME_ALT},0',
                '--out', '127.0.0.1:14550' # Keep UDP output just in case
            ]
            sitl_instance.launch(sitl_args, await_ready=True, restart=True)
            connection_string = sitl_instance.connection_string()
            with state_lock:
                drone_state["sitl_port"] = connection_string
            log.info(f"SITL started → {connection_string}")
            log.info("✅ Connect APM Planner 2 to: TCP → 127.0.0.1:5760")
        except Exception as e:
            log.error(f"SITL start failed: {e}")
            return
    else:
        connection_string = f"serial:{SERIAL_PORT}:{BAUD_RATE}"
        log.info(f"Physical drone mode → {connection_string}")

    # Loop: connect and read MAVLink
    while True:
        try:
            log.info(f"Connecting to {connection_string} ...")
            mavlink_conn = mavutil.mavlink_connection(connection_string)
            log.info("Waiting for heartbeat ...")
            mavlink_conn.wait_heartbeat(timeout=30)
            log.info(f"✅ Heartbeat! System {mavlink_conn.target_system}")
            with state_lock:
                drone_state["connected"] = True
                drone_state["stale"] = False

            while True:
                msg = mavlink_conn.recv_match(
                    type=['GLOBAL_POSITION_INT', 'HEARTBEAT', 'VFR_HUD', 'BATTERY_STATUS'],
                    blocking=True, timeout=5
                )
                if not msg:
                    continue

                mt = msg.get_type()
                with state_lock:
                    if mt == 'GLOBAL_POSITION_INT':
                        drone_state["lat"]     = msg.lat / 1e7
                        drone_state["lng"]     = msg.lon / 1e7
                        drone_state["alt"]     = round(msg.relative_alt / 1000.0, 1)
                        drone_state["heading"] = msg.hdg / 100.0 if msg.hdg != 65535 else drone_state["heading"]
                        drone_state["last_update"] = time.time()
                        drone_state["stale"]   = False

                    elif mt == 'VFR_HUD':
                        drone_state["speed"] = round(msg.groundspeed, 1)

                    elif mt == 'HEARTBEAT':
                        from pymavlink import mavutil as mu
                        drone_state["armed"] = bool(msg.base_mode & mu.mavlink.MAV_MODE_FLAG_SAFETY_ARMED)
                        try:
                            drone_state["mode"] = mavlink_conn.flightmode or "UNKNOWN"
                        except Exception:
                            pass

                    elif mt == 'BATTERY_STATUS':
                        if msg.battery_remaining >= 0:
                            drone_state["battery"] = msg.battery_remaining

        except Exception as e:
            log.error(f"MAVLink error: {e}. Reconnecting in 5s ...")
            with state_lock:
                drone_state["connected"] = False
                drone_state["stale"] = True
            mavlink_conn = None
            time.sleep(5)


# ── FastAPI REST API ──────────────────────────────────────────────────────────
app = FastAPI(title="InfraScan MAVLink Bridge", version="1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.get("/")
def root():
    return {"service": "InfraScan MAVLink Bridge", "port": BRIDGE_PORT, "use_sitl": USE_SITL}


@app.get("/telemetry")
def get_telemetry():
    with state_lock:
        snap = dict(drone_state)
    if snap["last_update"]:
        snap["stale"] = (time.time() - snap["last_update"]) > 10
    return snap


class WaypointRequest(BaseModel):
    lat: float
    lng: float
    alt: float = 30.0


@app.post("/waypoint")
def send_waypoint(wp: WaypointRequest):
    global mavlink_conn
    if mavlink_conn is None:
        return {"success": False, "error": "Drone not connected"}
    try:
        from pymavlink import mavutil

        mavlink_conn.set_mode("GUIDED")
        time.sleep(0.5)

        with state_lock:
            is_armed = drone_state["armed"]
            current_alt = drone_state["alt"]

        if not is_armed:
            mavlink_conn.arducopter_arm()
            log.info("Arming ...")
            time.sleep(2)

        if current_alt < 2.0:
            mavlink_conn.mav.command_long_send(
                mavlink_conn.target_system, mavlink_conn.target_component,
                mavutil.mavlink.MAV_CMD_NAV_TAKEOFF,
                0, 0, 0, 0, 0, 0, 0, wp.alt
            )
            log.info(f"Taking off to {wp.alt}m ...")
            time.sleep(4)

        mavlink_conn.mav.mission_item_send(
            mavlink_conn.target_system, mavlink_conn.target_component,
            0, mavutil.mavlink.MAV_FRAME_GLOBAL_RELATIVE_ALT,
            mavutil.mavlink.MAV_CMD_NAV_WAYPOINT,
            2, 1, 0, 0, 0, 0,
            wp.lat, wp.lng, wp.alt
        )
        log.info(f"✅ Waypoint → lat={wp.lat}, lng={wp.lng}, alt={wp.alt}m")
        return {"success": True, "waypoint": wp.dict()}
    except Exception as e:
        log.error(f"Waypoint error: {e}")
        return {"success": False, "error": str(e)}


@app.post("/return-home")
def return_to_launch():
    global mavlink_conn
    if not mavlink_conn:
        return {"success": False, "error": "Not connected"}
    try:
        mavlink_conn.set_mode("RTL")
        return {"success": True, "action": "RTL"}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/land")
def land():
    global mavlink_conn
    if not mavlink_conn:
        return {"success": False, "error": "Not connected"}
    try:
        mavlink_conn.set_mode("LAND")
        return {"success": True, "action": "LAND"}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.get("/sitl-info")
def sitl_info():
    """Return SITL connection info for APM Planner 2."""
    with state_lock:
        port = drone_state.get("sitl_port")
    return {
        "sitl_active": USE_SITL,
        "connection_string": port,
        "apm_planner_connect": "TCP → 127.0.0.1:5760",
        "bridge_api": f"http://localhost:{BRIDGE_PORT}",
    }


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    # 1. MAVLink reader (telemetry for InfraScan + native out to 14550)
    t1 = threading.Thread(target=start_sitl_and_connect, daemon=True, name="mavlink")
    t1.start()

    log.info(f"Bridge REST API          → http://0.0.0.0:{BRIDGE_PORT}")
    log.info(f"APM Planner 2 — connect  → TCP → 127.0.0.1:5760")
    log.info("InfraScan Admin Map      → shows live drone telemetry")
    uvicorn.run(app, host="0.0.0.0", port=BRIDGE_PORT, log_level="warning")

