import React, { useEffect, useMemo, useRef, useState } from "react";
import MetricChart from "./components/MetricChart";
import ConnectionsChart from "./components/ConnectionsChart";
import MetricCard from "./components/MetricCard";
import StatusTimeline from "./components/StatusTimeline";

const WS_URL = process.env.REACT_APP_WS_URL || "ws://localhost:9002";
const API_TOKEN = process.env.REACT_APP_API_TOKEN || "";
const MAX_DATA_POINTS = 180; // keep three minutes of second-level data

const buildWebSocketUrl = () => {
  try {
    const url = new URL(WS_URL);
    if (API_TOKEN) {
      url.searchParams.set("token", API_TOKEN);
    }
    return url.toString();
  } catch (error) {
    if (!API_TOKEN) {
      return WS_URL;
    }
    const separator = WS_URL.includes("?") ? "&" : "?";
    return `${WS_URL}${separator}token=${encodeURIComponent(API_TOKEN)}`;
  }
};

const formatPercent = (value) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }
  return value.toFixed(1);
};

const formatPercentLabel = (value) => {
  const base = formatPercent(value);
  return base === "--" ? "--" : `${base}%`;
};

const formatConnections = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "--";
  }
  return Number(value).toLocaleString();
};

const formatLoad = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "--";
  }
  return numeric.toFixed(2);
};

const formatLoadPerCore = (value, cores) => {
  const numeric = Number(value);
  const coreCount = Math.max(Number(cores) || 0, 1);
  if (!Number.isFinite(numeric)) {
    return "--";
  }
  return (numeric / coreCount).toFixed(2);
};

const formatThroughput = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "--";
  }

  const absValue = Math.abs(numeric);
  if (absValue >= 1024 * 1024) {
    return `${(numeric / (1024 * 1024)).toFixed(2)} GB/s`;
  }
  if (absValue >= 1024) {
    return `${(numeric / 1024).toFixed(2)} MB/s`;
  }
  return `${numeric.toFixed(1)} KB/s`;
};

const formatThroughputPair = (inbound, outbound) => {
  const down = formatThroughput(inbound);
  const up = formatThroughput(outbound);
  if (down === "--" && up === "--") {
    return "--";
  }
  return `↓${down} • ↑${up}`;
};

const formatCpuCores = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return "--";
  }
  return numeric.toLocaleString();
};

const determineHealth = (metric) => {
  if (!metric) {
    return "unknown";
  }

  const cpu = Number(metric.cpu) || 0;
  const memory = Number(metric.memory) || 0;
  const disk = Number(metric.disk) || 0;
  const connections = Number(metric.connections) || 0;
  const load1 = Number(metric.load1) || 0;
  const cores = Math.max(Number(metric.cpuCores) || 0, 1);
  const normalizedLoad = load1 / cores;

  if (
    cpu >= 90 ||
    memory >= 92 ||
    disk >= 93 ||
    normalizedLoad >= 2 ||
    connections >= 2000
  ) {
    return "critical";
  }

  if (
    cpu >= 75 ||
    memory >= 82 ||
    disk >= 85 ||
    normalizedLoad >= 1.2 ||
    connections >= 1200
  ) {
    return "warning";
  }

  return "healthy";
};

const STATUS_DESCRIPTIONS = {
  healthy: "All services are performing within the expected ranges.",
  warning: "Resource utilisation is trending high – keep an eye on the load.",
  critical: "Immediate attention required. Investigate the affected nodes.",
  unknown: "Awaiting live telemetry from the monitoring agents.",
};

const connectionLabel = {
  connecting: "Connecting…",
  connected: "Live connection",
  disconnected: "Reconnecting…",
};

const healthLabel = {
  healthy: "Healthy",
  warning: "Warning",
  critical: "Critical",
  unknown: "Offline",
};

const createStatusEvent = (status, metric) => {
  const time = new Date(metric.timestamp || Date.now());
  const formattedTime = time.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const pieces = [];
  const cpuText = formatPercent(metric.cpu);
  if (cpuText !== "--") {
    pieces.push(`CPU ${cpuText}%`);
  }
  const memoryText = formatPercent(metric.memory);
  if (memoryText !== "--") {
    pieces.push(`Memory ${memoryText}%`);
  }
  const diskText = formatPercent(metric.disk);
  if (diskText !== "--") {
    pieces.push(`Disk ${diskText}%`);
  }
  const loadText = formatLoad(metric.load1);
  if (loadText !== "--") {
    pieces.push(`Load ${loadText} (1m)`);
  }
  const netText = formatThroughputPair(metric.netRx, metric.netTx);
  if (netText !== "--") {
    pieces.push(`Net ${netText}`);
  }
  const connectionText = formatConnections(metric.connections);
  if (connectionText !== "--") {
    pieces.push(`Connections ${connectionText}`);
  }

  const description = pieces.length ? pieces.join(", ") : "No metrics reported";

  return {
    id: `${status}-${metric.timestamp || time.getTime()}`,
    status,
    title: healthLabel[status],
    description,
    details: STATUS_DESCRIPTIONS[status],
    timeLabel: formattedTime,
  };
};

function App() {
  const [metrics, setMetrics] = useState([]);
  const [connectionState, setConnectionState] = useState("connecting");
  const [statusEvents, setStatusEvents] = useState([]);
  const previousHealth = useRef("unknown");

  useEffect(() => {
    let ws;
    let reconnectTimer;
    let cancelled = false;

    const connect = () => {
      if (cancelled) {
        return;
      }

      setConnectionState("connecting");

      ws = new WebSocket(buildWebSocketUrl());

      ws.onopen = () => {
        if (!cancelled) {
          setConnectionState("connected");
        }
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const timestampIso =
            payload.timestamp || payload.time || new Date().toISOString();
          let sampleDate = new Date(timestampIso);
          if (Number.isNaN(sampleDate.getTime())) {
            sampleDate = new Date();
          }
          const metric = {
            cpu: Number(payload.cpu ?? payload.cpuUsage ?? 0),
            memory: Number(payload.memory ?? payload.memoryUsage ?? 0),
            connections: Number(
              payload.connections ?? payload.activeConnections ?? 0
            ),
            disk: Number(payload.disk ?? payload.diskUsage ?? 0),
            load1: Number(payload.load1 ?? payload.loadAverage1 ?? 0),
            load5: Number(payload.load5 ?? payload.loadAverage5 ?? 0),
            load15: Number(payload.load15 ?? payload.loadAverage15 ?? 0),
            netRx: Number(payload.netRx ?? payload.networkReceiveRate ?? 0),
            netTx: Number(payload.netTx ?? payload.networkTransmitRate ?? 0),
            cpuCores: Number(payload.cpuCores ?? payload.cpuCount ?? 0),
            time: sampleDate.toLocaleTimeString([], {
              hour12: false,
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
            timestamp: sampleDate.toISOString(),
          };

          setMetrics((previous) => {
            const next = [...previous, metric];
            if (next.length > MAX_DATA_POINTS) {
              next.shift();
            }
            return next;
          });
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error("Failed to parse metric payload", error);
        }
      };

      ws.onclose = () => {
        if (cancelled) {
          return;
        }

        setConnectionState("disconnected");
        reconnectTimer = setTimeout(connect, 4000);
      };

      ws.onerror = () => {
        if (ws && ws.readyState !== WebSocket.CLOSING) {
          ws.close();
        }
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      if (
        ws &&
        (ws.readyState === WebSocket.OPEN ||
          ws.readyState === WebSocket.CONNECTING)
      ) {
        ws.close();
      }
    };
  }, []);

  const latestMetric = metrics.length ? metrics[metrics.length - 1] : undefined;
  const previousMetric =
    metrics.length > 1 ? metrics[metrics.length - 2] : undefined;

  useEffect(() => {
    if (!latestMetric) {
      return;
    }

    const health = determineHealth(latestMetric);

    if (previousHealth.current !== health) {
      const event = createStatusEvent(health, latestMetric);
      setStatusEvents((prev) => [event, ...prev].slice(0, 10));
      previousHealth.current = health;
    }
  }, [latestMetric]);

  const health = determineHealth(latestMetric);

  const stats = useMemo(() => {
    if (!metrics.length) {
      return {
        cpu: { avg: null, peak: null, min: null },
        memory: { avg: null, peak: null, min: null },
        connections: { avg: null, peak: null, min: null },
      };
    }

    const calculate = (key) => {
      const values = metrics
        .map((item) => Number(item[key]))
        .filter((value) => Number.isFinite(value));

      if (!values.length) {
        return { avg: null, peak: null, min: null };
      }

      const sum = values.reduce((total, value) => total + value, 0);
      return {
        avg: sum / values.length,
        peak: Math.max(...values),
        min: Math.min(...values),
      };
    };

    return {
      cpu: calculate("cpu"),
      memory: calculate("memory"),
      disk: calculate("disk"),
      connections: calculate("connections"),
      load1: calculate("load1"),
      load5: calculate("load5"),
      load15: calculate("load15"),
      netRx: calculate("netRx"),
      netTx: calculate("netTx"),
    };
  }, [metrics]);

  const buildTrend = (key, unitSuffix) => {
    if (!latestMetric || !previousMetric) {
      return null;
    }

    const latestValue = Number(latestMetric[key]);
    const previousValue = Number(previousMetric[key]);

    if (!Number.isFinite(latestValue) || !Number.isFinite(previousValue)) {
      return null;
    }

    const delta = latestValue - previousValue;
    const threshold = unitSuffix === "%" ? 0.1 : 1;
    const direction =
      Math.abs(delta) < threshold ? "steady" : delta > 0 ? "up" : "down";

    if (direction === "steady") {
      return {
        direction: "steady",
        label: "Stable vs last sample",
      };
    }

    const symbol = delta > 0 ? "+" : "-";
    const formattedDelta =
      unitSuffix === "%"
        ? Math.abs(delta).toFixed(1)
        : Math.round(Math.abs(delta)).toLocaleString();

    return {
      direction,
      label: `${symbol}${formattedDelta}${unitSuffix} vs last sample`,
    };
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__titles">
          <p className="app-eyebrow">Observability Control Centre</p>
          <h1>Realtime Infrastructure Overview</h1>
          <p className="app-subtitle">
            Unified insights for system health, utilisation and client
            connectivity.
          </p>
        </div>
        <div className="app-header__status">
          <span className={`status-pill status-pill--${connectionState}`}>
            <span className="status-indicator" aria-hidden="true" />
            {connectionLabel[connectionState]}
          </span>
          <span className={`status-pill status-pill--${health}`}>
            <span className="status-indicator" aria-hidden="true" />
            {healthLabel[health]}
          </span>
        </div>
      </header>

      <main className="app-main">
        <section className="kpi-grid" aria-label="Key metrics">
          <MetricCard
            title="CPU utilisation"
            value={formatPercent(latestMetric?.cpu)}
            unit="%"
            status={health}
            trend={buildTrend("cpu", "%")}
            helper={
              stats.cpu.avg !== null
                ? `Avg ${formatPercent(stats.cpu.avg)}% • Peak ${formatPercent(
                    stats.cpu.peak
                  )}%`
                : "Waiting for samples"
            }
          />
          <MetricCard
            title="Memory usage"
            value={formatPercent(latestMetric?.memory)}
            unit="%"
            status={health}
            trend={buildTrend("memory", "%")}
            helper={
              stats.memory.avg !== null
                ? `Avg ${formatPercent(
                    stats.memory.avg
                  )}% • Peak ${formatPercent(stats.memory.peak)}%`
                : "Waiting for samples"
            }
          />
          <MetricCard
            title="Disk usage"
            value={formatPercent(latestMetric?.disk)}
            unit="%"
            status={health}
            trend={buildTrend("disk", "%")}
            helper={
              stats.disk?.avg !== null
                ? `Avg ${formatPercent(stats.disk.avg)}% • Peak ${formatPercent(
                    stats.disk.peak
                  )}%`
                : "Waiting for samples"
            }
          />
          <MetricCard
            title="Active connections"
            value={formatConnections(latestMetric?.connections)}
            status={health}
            unit=""
            trend={buildTrend("connections", "")}
            helper={
              stats.connections.avg !== null
                ? `Avg ${Math.round(
                    stats.connections.avg
                  ).toLocaleString()} • Peak ${Math.round(
                    stats.connections.peak
                  ).toLocaleString()}`
                : "Waiting for samples"
            }
          />
          <MetricCard
            title="Network throughput"
            value={formatThroughputPair(
              latestMetric?.netRx,
              latestMetric?.netTx
            )}
            unit=""
            status={health}
            trend={null}
            helper={
              stats.netRx.avg !== null && stats.netTx.avg !== null
                ? `Avg ↓${formatThroughput(
                    stats.netRx.avg
                  )} • ↑${formatThroughput(stats.netTx.avg)}`
                : "Waiting for samples"
            }
          />
        </section>

        <section className="panel-grid" aria-label="Charts">
          <article className="panel panel--primary">
            <div className="panel__header">
              <div>
                <h2>Resource utilisation</h2>
                <p>CPU and memory saturation sampled each second.</p>
              </div>
              <span className="panel__tag">Live</span>
            </div>
            <MetricChart data={metrics} />
          </article>

          <article className="panel">
            <div className="panel__header">
              <div>
                <h2>Connection load</h2>
                <p>Client connections observed over time.</p>
              </div>
            </div>
            <ConnectionsChart data={metrics} />
          </article>
        </section>

        <section
          className="panel-grid panel-grid--balanced"
          aria-label="Operational insights"
        >
          <article className="panel">
            <div className="panel__header">
              <div>
                <h2>Health timeline</h2>
                <p>Key state changes recorded during this session.</p>
              </div>
            </div>
            <StatusTimeline events={statusEvents} />
          </article>

          <article className="panel">
            <div className="panel__header">
              <div>
                <h2>Performance summary</h2>
                <p>Aggregates calculated from the active session.</p>
              </div>
            </div>
            <div className="insights">
              <table className="insights-table">
                <thead>
                  <tr>
                    <th scope="col">Metric</th>
                    <th scope="col">Current</th>
                    <th scope="col">Average</th>
                    <th scope="col">Peak</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">CPU</th>
                    <td>{formatPercentLabel(latestMetric?.cpu)}</td>
                    <td>
                      {stats.cpu.avg !== null
                        ? formatPercentLabel(stats.cpu.avg)
                        : "--"}
                    </td>
                    <td>
                      {stats.cpu.peak !== null
                        ? formatPercentLabel(stats.cpu.peak)
                        : "--"}
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">Memory</th>
                    <td>{formatPercentLabel(latestMetric?.memory)}</td>
                    <td>
                      {stats.memory.avg !== null
                        ? formatPercentLabel(stats.memory.avg)
                        : "--"}
                    </td>
                    <td>
                      {stats.memory.peak !== null
                        ? formatPercentLabel(stats.memory.peak)
                        : "--"}
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">Connections</th>
                    <td>{formatConnections(latestMetric?.connections)}</td>
                    <td>
                      {stats.connections.avg !== null
                        ? formatConnections(Math.round(stats.connections.avg))
                        : "--"}
                    </td>
                    <td>
                      {stats.connections.peak !== null
                        ? formatConnections(Math.round(stats.connections.peak))
                        : "--"}
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">Disk</th>
                    <td>{formatPercentLabel(latestMetric?.disk)}</td>
                    <td>
                      {stats.disk?.avg !== null
                        ? formatPercentLabel(stats.disk.avg)
                        : "--"}
                    </td>
                    <td>
                      {stats.disk?.peak !== null
                        ? formatPercentLabel(stats.disk.peak)
                        : "--"}
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">Network in</th>
                    <td>{formatThroughput(latestMetric?.netRx)}</td>
                    <td>
                      {stats.netRx.avg !== null
                        ? formatThroughput(stats.netRx.avg)
                        : "--"}
                    </td>
                    <td>
                      {stats.netRx.peak !== null
                        ? formatThroughput(stats.netRx.peak)
                        : "--"}
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">Network out</th>
                    <td>{formatThroughput(latestMetric?.netTx)}</td>
                    <td>
                      {stats.netTx.avg !== null
                        ? formatThroughput(stats.netTx.avg)
                        : "--"}
                    </td>
                    <td>
                      {stats.netTx.peak !== null
                        ? formatThroughput(stats.netTx.peak)
                        : "--"}
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">Load 1m</th>
                    <td>{formatLoad(latestMetric?.load1)}</td>
                    <td>
                      {stats.load1.avg !== null
                        ? formatLoad(stats.load1.avg)
                        : "--"}
                    </td>
                    <td>
                      {stats.load1.peak !== null
                        ? formatLoad(stats.load1.peak)
                        : "--"}
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">Load 5m</th>
                    <td>{formatLoad(latestMetric?.load5)}</td>
                    <td>
                      {stats.load5.avg !== null
                        ? formatLoad(stats.load5.avg)
                        : "--"}
                    </td>
                    <td>
                      {stats.load5.peak !== null
                        ? formatLoad(stats.load5.peak)
                        : "--"}
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">Load 15m</th>
                    <td>{formatLoad(latestMetric?.load15)}</td>
                    <td>
                      {stats.load15.avg !== null
                        ? formatLoad(stats.load15.avg)
                        : "--"}
                    </td>
                    <td>
                      {stats.load15.peak !== null
                        ? formatLoad(stats.load15.peak)
                        : "--"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="insights-meta" role="list">
              <div className="insights-meta__item" role="listitem">
                <p className="insights-meta__label">CPU cores</p>
                <p className="insights-meta__value">
                  {formatCpuCores(latestMetric?.cpuCores)}
                </p>
              </div>
              <div className="insights-meta__item" role="listitem">
                <p className="insights-meta__label">1m load per core</p>
                <p className="insights-meta__value">
                  {formatLoadPerCore(
                    latestMetric?.load1,
                    latestMetric?.cpuCores
                  )}
                </p>
              </div>
              <div className="insights-meta__item" role="listitem">
                <p className="insights-meta__label">5m load per core</p>
                <p className="insights-meta__value">
                  {formatLoadPerCore(
                    latestMetric?.load5,
                    latestMetric?.cpuCores
                  )}
                </p>
              </div>
            </div>
          </article>
        </section>
      </main>

      <footer className="app-footer">
        <p>Monitoring System · Ready for launch</p>
      </footer>
    </div>
  );
}

export default App;
