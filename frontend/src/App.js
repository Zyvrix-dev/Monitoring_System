import React, { useMemo, useState } from 'react';

import AppHeader from './components/AppHeader';
import ApplicationUsagePanel from './components/ApplicationUsagePanel';
import ConnectionsChart from './components/ConnectionsChart';
import HistoryPanel from './components/HistoryPanel';
import KpiGrid from './components/KpiGrid';
import MetricChart from './components/MetricChart';
import PerformanceSummary from './components/PerformanceSummary';
import SettingsPanel from './components/SettingsPanel';
import StatusTimeline from './components/StatusTimeline';
import { useLiveMetrics } from './hooks/useLiveMetrics';
import { useMetricsHistory } from './hooks/useMetricsHistory';
import { useSettings } from './hooks/useSettings';
import { buildStatistics } from './utils/statistics';
import DomainTrafficPanel from './components/DomainTrafficPanel';

function App() {
  const { retentionSeconds, retentionDays, updateSetting } = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const {
    metrics,
    latestMetric,
    previousMetric,
    connectionState,
    health,
    statusEvents
  } = useLiveMetrics({ retentionSeconds });

  const stats = useMemo(() => buildStatistics(metrics), [metrics]);
  const { snapshots, saveSnapshot, deleteSnapshot, clearSnapshots, exportSnapshot } = useMetricsHistory({
    metrics,
    latestMetric,
    stats
  });

  const handleSaveSnapshot = () => {
    const saved = saveSnapshot();
    if (saved) {
      setHistoryOpen(true);
    }
  };

  return (
    <div className="app-shell">
      <AppHeader
        connectionState={connectionState}
        health={health}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenHistory={() => setHistoryOpen(true)}
        onSaveSnapshot={handleSaveSnapshot}
        retentionDays={retentionDays}
        canSaveSnapshot={metrics.length > 0}
        historyCount={snapshots.length}
      />

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

        <section className="panel-grid panel-grid--balanced" aria-label="Process and network analytics">
          <ApplicationUsagePanel applications={latestMetric?.applications ?? []} />
          <DomainTrafficPanel
            domains={latestMetric?.domains ?? []}
            totalConnections={latestMetric?.connections}
            throughput={{ inbound: latestMetric?.netRx, outbound: latestMetric?.netTx }}
          />
        </section>
      </main>

      <footer className="app-footer">
        <p>Monitoring System · Ready for launch</p>
      </footer>

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        retentionDays={retentionDays}
        onRetentionChange={(value) => updateSetting('retentionDays', value)}
      />

      <HistoryPanel
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        snapshots={snapshots}
        onDeleteSnapshot={deleteSnapshot}
        onClearSnapshots={clearSnapshots}
        onExportSnapshot={exportSnapshot}
      />
    </div>
  );
}

export default App;

