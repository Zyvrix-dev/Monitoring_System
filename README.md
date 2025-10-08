# Monitoring System

## 📖 Overview
This repository contains a full-stack **Network Monitoring System** for capturing, storing, and visualising runtime metrics from web servers. The project is composed of a **C++ telemetry agent**, a **React dashboard**, and a **time-series storage + observability stack** powered by **InfluxDB** and **Grafana**. Docker Compose bundles every service, but you can also run the backend and frontend separately for local development.

---

## ⚙️ Features
- 📡 Real-time network and system monitoring (CPU, memory, disk, load averages, active connections)
- 📶 Live insight into network throughput with per-direction bandwidth tracking
- 🔐 Optional API token enforcement for both REST and WebSocket endpoints plus server-side session limits
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

> 🔐 Set the environment variable `MONITORING_API_TOKEN` (and pass the same token to the frontend via `REACT_APP_API_TOKEN`) if you want to restrict access to the telemetry endpoints. When unset the services remain publicly readable for development convenience.

> ℹ️  The first startup may take a few minutes while Docker pulls images and installs dependencies.

---

## 📈 Metrics Collection & Calculations
The C++ telemetry agent samples Linux kernel statistics roughly every 900 ms and caches the most recent snapshot to reduce disk churn. The metrics that surface through the REST and WebSocket APIs are computed as follows:

| Metric | Data Source | Calculation Details |
| --- | --- | --- |
| **CPU Usage (%)** | `/proc/stat` | Parses the aggregated `cpu` line to gather user, nice, system, idle, iowait, irq, softirq, and steal jiffies. The collector retains the previous totals and reports `((totalΔ − idleΔ) / totalΔ) × 100`, clamped between 0–100%. |
| **Memory Usage (%)** | `/proc/meminfo` | Reads the `MemTotal` and `MemAvailable` fields and computes `(MemTotal − MemAvailable) / MemTotal × 100`, bounding the result to 0–100%. |
| **Active TCP Connections** | `/proc/net/tcp`, `/proc/net/tcp6` | Iterates over each socket entry (ignoring headers) and counts states corresponding to active/half-closed sessions (e.g., `0x01` ESTABLISHED, `0x06` TIME_WAIT, `0x08` CLOSE_WAIT). IPv4 and IPv6 counts are summed. |
| **Disk Usage (%)** | `statvfs("/")` | Invokes POSIX `statvfs` on the root filesystem and calculates `(totalBytes − availableBytes) / totalBytes × 100` from block counts and block size. |
| **Network Receive/Transmit (KiB/s)** | `/proc/net/dev` | Aggregates RX/TX byte counters for non-loopback interfaces, compares them with the previous sample, and divides the byte deltas by elapsed seconds × 1024 to yield KiB/s (floored at 0 to suppress negative spikes). |
| **Load Averages (1/5/15 min)** | `getloadavg` | Delegates to the libc `getloadavg` helper to fetch the kernel-maintained rolling averages, defaulting to zeros when unavailable. |
| **CPU Core Count** | `std::thread::hardware_concurrency()` | Lazily caches the reported hardware thread count, defaulting to `1` if the platform returns `0`. |

Each payload is timestamped in ISO-8601 UTC form before being forwarded to InfluxDB, Grafana, and the React dashboard.

---

## ❓ FAQ

### Why do the numbers differ from Task Manager or other monitoring tools?

- **Different sampling windows** – This agent only emits a new sample roughly every 900 ms and reuses the cached snapshot in between requests, whereas other tools can poll faster or average data across longer windows. Short spikes can therefore show up in one tool but not the other.【F:README.md†L73-L104】【F:backend/src/system_metrics.cpp†L90-L135】
- **Kernel level vs. UI level metrics** – The backend reads raw counters from `/proc` and calculates deltas itself (for example CPU usage comes from the aggregated `cpu` line in `/proc/stat`). Desktop task managers often combine additional heuristics, such as per-core graphs, scheduler smoothing, or GPU usage, so their totals may not match the Linux kernel values shown here.【F:README.md†L73-L104】【F:backend/src/system_metrics.cpp†L135-L209】
- **Scope of measurement** – The project reports aggregated statistics for the environment where the backend is running by iterating over every `/proc` process, TCP socket, and network interface it can see. If you run the agent inside a container or VM, it will honour that sandbox’s namespaces, whereas a desktop Task Manager may show host-level utilisation (or vice versa).【F:backend/src/system_metrics.cpp†L142-L483】
- **Unit and rounding differences** – Memory is computed using `MemTotal`/`MemAvailable` and network throughput is derived from byte deltas divided by seconds × 1024. Other tools may use powers-of-ten units, include cached/buffered memory, or display instantaneous byte counters without normalising to KiB/s.【F:README.md†L73-L104】【F:backend/src/system_metrics.cpp†L209-L266】

If consistent numbers are required, ensure all tools poll the same environment with comparable sampling intervals and unit conventions.

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
export MONITORING_API_TOKEN="your-secure-token"   # optional security hardening
export MONITORING_WS_MAX_CLIENTS=32               # optional override
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
REACT_APP_API_TOKEN=your-secure-token
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
- Metrics are cached for sub-second intervals to reduce kernel parsing overhead while still emitting second-level updates.
- The monitoring agent now tracks CPU cores, load averages, disk usage and network throughput alongside CPU/memory/connection metrics.
- Metrics are periodically written to InfluxDB for historic querying and dashboards.
- Modify `frontend/src/App.js` or add new components under `frontend/src/components/` to extend the UI.
- Update `backend/src/system_metrics.cpp` to change how metrics are collected from the host.

---

## 🧾 License
This project is open-source and available under the MIT License.

## Screen Shots
<img width="1900" height="944" alt="image" src="https://github.com/user-attachments/assets/113babba-49ef-4eba-a8d5-baf65f562701" />
<img width="1900" height="938" alt="image" src="https://github.com/user-attachments/assets/f14e810f-a081-4d10-94ba-3c50fd2729f9" />
<img width="1898" height="945" alt="image" src="https://github.com/user-attachments/assets/2c97b964-3d82-445f-92ea-36c4852e49a9" />



