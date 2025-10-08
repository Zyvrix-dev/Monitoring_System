import React, { useMemo } from 'react';

import AppHeader from './components/AppHeader';
import ConnectionsChart from './components/ConnectionsChart';
import KpiGrid from './components/KpiGrid';
import MetricChart from './components/MetricChart';
import PerformanceSummary from './components/PerformanceSummary';
import StatusTimeline from './components/StatusTimeline';
import { useLiveMetrics } from './hooks/useLiveMetrics';
import { buildStatistics } from './utils/statistics';

function App() {
  const {
    metrics,
    latestMetric,
    previousMetric,
    connectionState,
    health,
    statusEvents
  } = useLiveMetrics();

  const stats = useMemo(() => buildStatistics(metrics), [metrics]);

  return (
    <div className="app-shell">
      <AppHeader connectionState={connectionState} health={health} />

      <main className="app-main">
        <KpiGrid
          latestMetric={latestMetric}
          previousMetric={previousMetric}
          stats={stats}
          health={health}
        />

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

        <section className="panel-grid panel-grid--balanced" aria-label="Operational insights">
          <article className="panel">
            <div className="panel__header">
              <div>
                <h2>Health timeline</h2>
                <p>Key state changes recorded during this session.</p>
              </div>
            </div>
            <StatusTimeline events={statusEvents} />
          </article>

          <PerformanceSummary latestMetric={latestMetric} stats={stats} />
        </section>
      </main>

      <footer className="app-footer">
        <p>Monitoring System · Ready for launch</p>
      </footer>
    </div>
  );
}

export default App;

