import React from 'react';

import MetricCard from './MetricCard';
import {
  formatConnections,
  formatPercent,
  formatThroughput,
  formatThroughputPair
} from '../utils/formatters';
import { buildTrend } from '../utils/trends';

function KpiGrid({ latestMetric, previousMetric, stats, health }) {
  return (
    <section className="kpi-grid" aria-label="Key metrics">
      <MetricCard
        title="CPU utilisation"
        value={formatPercent(latestMetric?.cpu)}
        unit="%"
        status={health}
        trend={buildTrend(latestMetric, previousMetric, 'cpu', '%')}
        helper={
          stats.cpu?.avg !== null
            ? `Avg ${formatPercent(stats.cpu.avg)}% • Peak ${formatPercent(stats.cpu.peak)}%`
            : 'Waiting for samples'
        }
      />
      <MetricCard
        title="Memory usage"
        value={formatPercent(latestMetric?.memory)}
        unit="%"
        status={health}
        trend={buildTrend(latestMetric, previousMetric, 'memory', '%')}
        helper={
          stats.memory?.avg !== null
            ? `Avg ${formatPercent(stats.memory.avg)}% • Peak ${formatPercent(stats.memory.peak)}%`
            : 'Waiting for samples'
        }
      />
      <MetricCard
        title="Disk usage"
        value={formatPercent(latestMetric?.disk)}
        unit="%"
        status={health}
        trend={buildTrend(latestMetric, previousMetric, 'disk', '%')}
        helper={
          stats.disk?.avg !== null
            ? `Avg ${formatPercent(stats.disk.avg)}% • Peak ${formatPercent(stats.disk.peak)}%`
            : 'Waiting for samples'
        }
      />
      <MetricCard
        title="Active connections"
        value={formatConnections(latestMetric?.connections)}
        status={health}
        unit=""
        trend={buildTrend(latestMetric, previousMetric, 'connections', '')}
        helper={
          stats.connections?.avg !== null
            ? `Avg ${Math.round(stats.connections.avg).toLocaleString()} • Peak ${Math.round(
                stats.connections.peak
              ).toLocaleString()}`
            : 'Waiting for samples'
        }
      />
      <MetricCard
        title="Network throughput"
        value={formatThroughputPair(latestMetric?.netRx, latestMetric?.netTx)}
        unit=""
        status={health}
        trend={null}
        helper={
          stats.netRx?.avg !== null && stats.netTx?.avg !== null
            ? `Avg ↓${formatThroughput(stats.netRx.avg)} • ↑${formatThroughput(stats.netTx.avg)}`
            : 'Waiting for samples'
        }
      />
    </section>
  );
}

export default KpiGrid;

