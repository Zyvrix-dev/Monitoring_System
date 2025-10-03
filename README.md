# Monitoring System

## 📖 Overview
This is a full-stack **Network Monitoring System** designed to track and visualize metrics from web servers.  
It is built with **C++ (backend agent)**, **React (frontend dashboard)**, and **InfluxDB + Grafana (time-series storage & visualization)**.  
Everything is containerized with **Docker Compose** for easy deployment.

---

## ⚙️ Features
- 📡 Real-time network monitoring (connections, bandwidth, response times)
- 📊 Grafana dashboard with pre-configured charts
- 🌐 WebSocket server in C++ for live metric streaming
- 🗄️ InfluxDB time-series database integration
- 🎨 React-based frontend UI
- 🐳 Fully dockerized (backend, frontend, database, monitoring stack)

---

## 🛠️ Tech Stack
- **C++20** → Core monitoring backend (Boost.Beast, OpenSSL, nlohmann/json)
- **InfluxDB** → Time-series database
- **Grafana** → Visualization and dashboards
- **React + Vite** → Frontend dashboard
- **Docker Compose** → Deployment and orchestration

---

## 🚀 Installation

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/monitoring_system_full.git
cd monitoring_system_full
```

### 2. Build & Run with Docker Compose
```bash
docker compose up --build
```

### 3. Access Services
- **Backend API** → http://localhost:8080  
- **WebSocket Server** → ws://localhost:9002  
- **Frontend Dashboard** → http://localhost:3000  
- **Grafana UI** → http://localhost:3001 (default user/pass: admin/admin)

---

## 📂 Project Structure
```
monitoring_system_full/
│── backend/          # C++ monitoring service
│── frontend/         # React dashboard
│── grafana/          # Preloaded dashboard configs
│── docker-compose.yml
│── setup_monitoring.sh
│── README.md
```

---

## 📊 Grafana Dashboard
The system comes with a **pre-configured Grafana dashboard**.  
Metrics available:
- Requests per second
- Active connections
- Response times
- CPU/Memory usage

---

## 🧑‍💻 Development Notes
- C++ backend uses Boost.Beast WebSocket for metric streaming.
- Data is pushed to InfluxDB periodically.
- React dashboard fetches from backend REST + live WebSocket updates.

---

## 📝 License
This project is open-source and available under the MIT License.
