import React from "react";

import MetricCard from "./MetricCard";
import {
  formatConnections,
  formatCount,
  formatPercent,
  formatThroughput,
  formatThroughputPair,
} from "../utils/formatters";
import { buildTrend } from "../utils/trends";

function KpiGrid({
  latestMetric,
  previousMetric,
  stats,
  health,
  onSelectMetric,
}) {
  return (
    <section className="kpi-grid" aria-label="Key metrics">
      <MetricCard
        title="CPU utilisation"
        value={formatPercent(latestMetric?.cpu)}
        unit="%"
        status={health}
        trend={buildTrend(latestMetric, previousMetric, "cpu", "%")}
        helper={
          stats.cpu?.avg !== null
            ? `Avg ${formatPercent(stats.cpu.avg)}% • Peak ${formatPercent(
                stats.cpu.peak
              )}%`
            : "Waiting for samples"
        }
        onSelect={() => onSelectMetric?.("cpu")}
      />
      <MetricCard
        title="Memory usage"
        value={formatPercent(latestMetric?.memory)}
        unit="%"
        status={health}
        trend={buildTrend(latestMetric, previousMetric, "memory", "%")}
        helper={
          stats.memory?.avg !== null
            ? `Avg ${formatPercent(stats.memory.avg)}% • Peak ${formatPercent(
                stats.memory.peak
              )}%`
            : "Waiting for samples"
        }
        onSelect={() => onSelectMetric?.("memory")}
      />
      <MetricCard
        title="Disk usage"
        value={formatPercent(latestMetric?.disk)}
        unit="%"
        status={health}
        trend={buildTrend(latestMetric, previousMetric, "disk", "%")}
        helper={
          stats.disk?.avg !== null
            ? `Avg ${formatPercent(stats.disk.avg)}% • Peak ${formatPercent(
                stats.disk.peak
              )}%`
            : "Waiting for samples"
        }
        onSelect={() => onSelectMetric?.("disk")}
      />
      <MetricCard
        title="Active connections"
        value={formatConnections(latestMetric?.connections)}
        status={health}
        unit=""
        trend={buildTrend(latestMetric, previousMetric, "connections", "")}
        helper={
          stats.connections?.avg !== null
            ? `Avg ${Math.round(
                stats.connections.avg
              ).toLocaleString()} • Peak ${Math.round(
                stats.connections.peak
              ).toLocaleString()}`
            : "Waiting for samples"
        }
        onSelect={() => onSelectMetric?.("connections")}
      />
      <MetricCard
        title="Network throughput"
        value={formatThroughputPair(latestMetric?.netRx, latestMetric?.netTx)}
        unit=""
        status={health}
        trend={null}
        helper={
          stats.netRx?.avg !== null && stats.netTx?.avg !== null
            ? `Avg ↓${formatThroughput(stats.netRx.avg)} • ↑${formatThroughput(
                stats.netTx.avg
              )}`
            : "Waiting for samples"
        }
        onSelect={() => onSelectMetric?.("throughput")}
      />
      <MetricCard
        title="CPU avg (60s)"
        value={formatPercent(latestMetric?.cpuAvg)}
        unit="%"
        status={health}
        trend={buildTrend(latestMetric, previousMetric, "cpuAvg", "%")}
        helper={
          stats.cpuAvg?.avg !== null
            ? `Session avg ${formatPercent(stats.cpuAvg.avg)}%`
            : "Waiting for samples"
        }
        onSelect={() => onSelectMetric?.("cpuAvg")}
      />
      <MetricCard
        title="Swap usage"
        value={formatPercent(latestMetric?.swap)}
        unit="%"
        status={health}
        trend={buildTrend(latestMetric, previousMetric, "swap", "%")}
        helper={
          stats.swap?.avg !== null
            ? `Avg ${formatPercent(stats.swap.avg)}% • Peak ${formatPercent(
                stats.swap.peak
              )}%`
            : "Waiting for samples"
        }
        onSelect={() => onSelectMetric?.("swap")}
      />
      <MetricCard
        title="Processes"
        value={formatCount(latestMetric?.processes)}
        unit=""
        status={health}
        trend={buildTrend(latestMetric, previousMetric, "processes", "")}
        helper={
          stats.processes?.avg !== null
            ? `Avg ${formatCount(
                Math.round(stats.processes.avg)
              )} • Peak ${formatCount(Math.round(stats.processes.peak))}`
            : "Waiting for samples"
        }
        onSelect={() => onSelectMetric?.("processes")}
      />
      <MetricCard
        title="Threads"
        value={formatCount(latestMetric?.threads)}
        unit=""
        status={health}
        trend={buildTrend(latestMetric, previousMetric, "threads", "")}
        helper={
          stats.threads?.avg !== null
            ? `Avg ${formatCount(
                Math.round(stats.threads.avg)
              )} • Peak ${formatCount(Math.round(stats.threads.peak))}`
            : "Waiting for samples"
        }
        onSelect={() => onSelectMetric?.("threads")}
      />
      <MetricCard
        title="Listening sockets"
        value={`${formatCount(latestMetric?.listeningTcp)} / ${formatCount(
          latestMetric?.listeningUdp
        )}`}
        unit="TCP / UDP"
        status={health}
        trend={null}
        helper={
          stats.listeningTcp?.avg !== null && stats.listeningUdp?.avg !== null
            ? `Avg TCP ${formatCount(
                Math.round(stats.listeningTcp.avg)
              )} • UDP ${formatCount(Math.round(stats.listeningUdp.avg))}`
            : "Waiting for samples"
        }
        onSelect={() => onSelectMetric?.("listeningSockets")}
      />
      <MetricCard
        title="Unique domains"
        value={formatCount(latestMetric?.uniqueDomains)}
        unit=""
        status={health}
        trend={buildTrend(latestMetric, previousMetric, "uniqueDomains", "")}
        helper={
          stats.uniqueDomains?.avg !== null
            ? `Avg ${formatCount(
                Math.round(stats.uniqueDomains.avg)
              )} • Peak ${formatCount(Math.round(stats.uniqueDomains.peak))}`
            : "Waiting for samples"
        }
        onSelect={() => onSelectMetric?.("uniqueDomains")}
      />
      <MetricCard
        title="Docker containers"
        value={formatCount(latestMetric?.dockerContainers?.length ?? 0)}
        unit=""
        status={latestMetric?.dockerAvailable ? "healthy" : "warning"}
        trend={null}
        helper={
          latestMetric?.dockerAvailable
            ? `${formatCount(
                latestMetric?.dockerImages?.length ?? 0
              )} images discovered`
            : "Docker CLI unavailable"
        }
        onSelect={() => onSelectMetric?.("docker")}
      />
    </section>
  );
}

export default KpiGrid;
