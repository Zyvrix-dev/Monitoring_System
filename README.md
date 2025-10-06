# Monitoring System

## 📖 Overview
This repository contains a full-stack **Network Monitoring System** for capturing, storing, and visualising runtime metrics from web servers. The project is composed of a **C++ telemetry agent**, a **React dashboard**, and a **time-series storage + observability stack** powered by **InfluxDB** and **Grafana**. Docker Compose bundles every service, but you can also run the backend and frontend separately for local development.

---

## ⚙️ Features
- 📡 Real-time network and system monitoring (CPU, memory, active connections)
- 🔌 WebSocket streaming from the C++ backend for low-latency updates
- 🗄️ InfluxDB time-series database for historic metrics
- 📊 Pre-built Grafana dashboards for operations visibility
- 🎨 React-based single-page UI with live charts and health timeline
- 🐳 Fully dockerised stack for one-command provisioning

---

## 🛠️ Tech Stack
- **C++20** – Core monitoring backend (Boost.Beast, cpprestsdk, nlohmann/json, OpenSSL)
- **InfluxDB** – Time-series storage for metrics
- **Grafana** – Dashboarding and alerting layer
- **React (Create React App)** – Frontend application (served on port `3000`)
- **Docker Compose** – Local orchestration of all services

---

## 📦 Prerequisites
Install the following tools depending on how you would like to run the system:

### Common
- [Git](https://git-scm.com/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) **or** Docker Engine + Docker Compose Plugin

### Running without Docker
- A C++20 compiler (GCC 11+, Clang 13+, or MSVC 19.3+)
- [CMake 3.15+](https://cmake.org/)
- Development libraries: `libboost-all-dev`, `libssl-dev`, `nlohmann-json3-dev`, `libcpprest-dev`
- [Node.js 18+](https://nodejs.org/) and npm (or yarn/pnpm)

---

## 🚀 Getting Started (Docker)

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/monitoring_system_full.git
   cd monitoring_system_full
   ```

2. **Launch the full stack**
   ```bash
   docker compose up --build
   ```

3. **Access the services**
   - Backend REST API → http://localhost:8080/metrics
   - WebSocket Stream → ws://localhost:9002
   - Frontend Dashboard → http://localhost:3000
   - Grafana UI → http://localhost:3001 (default login `admin` / `admin`)

> ℹ️  The first startup may take a few minutes while Docker pulls images and installs dependencies.

---

## 🧩 Running Services Separately
The project is structured so that you can iterate on the backend or frontend without rebuilding the whole Docker stack. These steps assume you have the prerequisites from the _Running without Docker_ section.

### 1. Start InfluxDB & Grafana (via Docker)
Even when running the application code locally, it is easiest to keep InfluxDB and Grafana in containers:
```bash
docker compose up -d influxdb grafana
```
This spins up the databases while leaving the backend and frontend for manual execution.

### 2. Run the C++ Backend Locally
```bash
cd backend
cmake -S . -B build
cmake --build build
./build/cpp_monitor
```
The backend exposes:
- REST endpoint at `http://localhost:8080/metrics`
- WebSocket server on `ws://localhost:9002`

> ✅ Ensure the required system packages (Boost, cpprestsdk, OpenSSL, nlohmann-json) are installed before configuring CMake.

### 3. Run the React Frontend Locally
```bash
cd frontend
npm install
npm start
```
By default the dashboard expects the backend at `ws://localhost:9002`. To point to a different environment create a `.env.local` file:
```bash
REACT_APP_WS_URL=ws://your-backend-host:9002
```
Then restart the dev server so the new environment variable is applied.

### 4. Stopping Local Services
- Stop the backend with `Ctrl+C` in the terminal running `cpp_monitor`.
- Stop the frontend dev server with `Ctrl+C` in the terminal running `npm start`.
- Tear down Docker services when you are finished:
  ```bash
  docker compose down
  ```

---

## 📂 Project Structure
```
monitoring_system_full/
│── backend/          # C++ monitoring service (CMake project)
│── frontend/         # React dashboard (Create React App)
│── grafana/          # Provisioned Grafana dashboards & datasources
│── docker-compose.yml
│── setup_monitoring.sh
│── setup_monitoring.bat
│── README.md
```

---

## 📊 Grafana Dashboard
Grafana is provisioned with a dashboard that visualises:
- Requests per second and active connections trends
- CPU and memory utilisation timelines
- Overall system health status and history

Open Grafana at http://localhost:3001 (login: `admin` / `admin`) to explore and customise the panels. Datasources are pre-configured to point at the InfluxDB instance spun up by Docker Compose.

---

## 🧑‍💻 Development Notes
- The C++ backend publishes metrics both via REST and WebSocket; the frontend only requires the WebSocket stream for real-time charts.
- Metrics are periodically written to InfluxDB for historic querying and dashboards.
- Modify `frontend/src/App.js` or add new components under `frontend/src/components/` to extend the UI.
- Update `backend/src/system_metrics.cpp` to change how metrics are collected from the host.

---

## 🧾 License
This project is open-source and available under the MIT License.
