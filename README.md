# InfraScan — AI Infrastructure Damage Detection System

> An AI-powered full-stack platform for citizen reporting, automated damage detection, priority scoring, and drone-based field verification of infrastructure damage.


---

##  Core Features

| Feature | Description |
|:--- |:--- |
| **Unified Auth** | Modern sliding Authentication page for seamless Login & Signup. |
| **2500+ Image Trained AI** | AI models trained on a massive dataset of 2500+ infrastructure images in **Roboflow**. |
| **Priority Scoring** | Automatically calculates an infrastructure priority score based on damage severity and location. |
| **Drone Dispatch** | One-click dispatch to **APM Planner 2** for real-time field verification. |
| **Live HUD Map** | Real-time drone telemetry (Alt, Speed, Mode) displayed over an incident map. |

---

##  Quick Start (Automated Demo)

The easiest way to run InfraScan is to use the included demo script which automates all dependency installations and service startups.

### 1. Clone & Launch
```bash
git clone repolink
cd InfraScan
chmod +x start_demo.sh
./start_demo.sh
```

### 2. Requirements
- **APM Planner 2** ([Download Here](https://ardupilot.org/planner2/docs/installing-apm-planner-2.html)) — *Open Source Ground Control Station required for drone telemetry.*
- **Node.js 18+** & **Python 3.9+**

---

## Ground Control & Dispatch

InfraScan integrates directly with **APM Planner 2** for aerial verification.

### Connection Steps:
1. Open **APM Planner 2**.
2. Go to **Communication** → **Add Link**.
3. Select **TCP** and use:
   - **Host**: `127.0.0.1`
   - **Port**: `5760`
4. The InfraScan Admin Dashboard will now display live telemetry and allow drone dispatch to reported incident coordinates.

---

## 📁 Project Structure

```
InfraScan/
├── 📂 backend/                # FastAPI Application Layer
│   ├── main.py                # core: API Routes (Auth, Reports, Drone)
│   ├── ai_model.py            # ai: Roboflow Inference + Priority Logic
│   ├── mavlink_bridge.py      # bridge: MAVLink Telemetry (Port 8001)
│   ├── models.py              # db: SQLAlchemy Database Models
│   ├── schemas.py             # validation: Pydantic Data Schemas
│   ├── database.py            # config: SQLite Connection
│   ├── infrastructure.db      # data: Local SQLite Database
│   ├── 📂 uploads/            # storage: Processed Citizen & Drone Images
│   └── requirements.txt       # deps: Python Backend Dependencies
│
├── 📂 src/                    # React Frontend Layer
│   ├── App.jsx                # root: Navigation & Sidebar logic
│   ├── index.css              # style: Full Design System & Utilities
│   ├── 📂 pages/              # views:
│   │   ├── Auth.jsx           # Unified Sliding Sign-in/Signup
│   │   ├── Auth.css           # Sliding Panel Animations
│   │   ├── AdminDashboard.jsx # Admin Command Hub (GIS Map + Analytics)
│   │   ├── UserDashboard.jsx  # Citizen Report Tracker
│   │   ├── Home.jsx           # Landing Page
│   │   └── SubmitComplaint.jsx# Report Submission Wizard
│   ├── 📂 components/         # shared: Contexts, Modals, and Widgets
│   └── 📂 assets/             # media: AI-generated Illustrations
│
├── 📂 public/                 # Static Assets
├── start_demo.sh              # EXEC: One-Click Demo Launcher (macOS/Linux)
├── start_demo.ps1             # EXEC: One-Click Demo Launcher (Windows)
├── vite.config.js             # config: Frontend Build Settings
├── package.json               # deps: Node.js/React Dependencies
└── README.md                  # docs: GitHub Documentation

```

---

## Open Source Components
- **FastAPI**: High-performance backend.
- **React**: Modern reactive frontend.
- **ArduPilot SITL**: Drone simulation environment.
- **APM Planner 2**: Open Source mission monitoring.


---Team InfraXperts
