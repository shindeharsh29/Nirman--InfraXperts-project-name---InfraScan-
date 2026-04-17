# 🛡️ InfraScan — AI Infrastructure Damage Detection System

> An AI-powered full-stack platform for citizen reporting, automated damage detection, priority scoring, and drone-based field verification of infrastructure damage.

![InfraScan](https://img.shields.io/badge/AI--Powered-Roboflow-blue) ![FastAPI](https://img.shields.io/badge/Backend-FastAPI-green) ![React](https://img.shields.io/badge/Frontend-React%2018-61DAFB) ![GCS](https://img.shields.io/badge/GCS-APM%20Planner%202-red)

---

## 🌟 Core Features

| Feature | Description |
|:--- |:--- |
| 📸 **Unified Auth** | Modern sliding Authentication page for seamless Login & Signup. |
| 🤖 **2500+ Image Trained AI** | AI models trained on a massive dataset of 2500+ infrastructure images in **Roboflow**. |
| ⚖️ **Priority Scoring** | Automatically calculates an infrastructure priority score based on damage severity and location. |
| 🚁 **Drone Dispatch** | One-click dispatch to **APM Planner 2** for real-time field verification. |
| 🗺️ **Live HUD Map** | Real-time drone telemetry (Alt, Speed, Mode) displayed over an incident map. |

---

## 🚀 Quick Start (Automated Demo)

The easiest way to run InfraScan is to use the included demo script which automates all dependency installations and service startups.

### 1. Clone & Launch
```bash
git clone https://github.com/Utkarshc8619/InfraScan.git
cd InfraScan
chmod +x start_demo.sh
./start_demo.sh
```

### 2. Requirements
- **APM Planner 2** ([Download Here](https://ardupilot.org/planner2/docs/installing-apm-planner-2.html)) — *Open Source Ground Control Station required for drone telemetry.*
- **Node.js 18+** & **Python 3.9+**

---

## 🚁 Ground Control & Dispatch

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
├── backend/
│   ├── main.py              # FastAPI app + all routes
│   ├── ai_model.py          # Roboflow inference + scoring
│   ├── mavlink_bridge.py    # MAVLink drone bridge
│   └── requirements.txt     # Python dependencies
├── src/                     # React Frontend
├── start_demo.sh            # Automated demo launcher
└── README.md
```

---

## 🤝 Open Source Components
- **FastAPI**: High-performance backend.
- **React**: Modern reactive frontend.
- **ArduPilot SITL**: Drone simulation environment.
- **APM Planner 2**: Open Source mission monitoring.

Built with ❤️ for Infrastructure Safety.
Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

Built with ❤️ by [Utkarsh](https://github.com/Utkarshc8619)
