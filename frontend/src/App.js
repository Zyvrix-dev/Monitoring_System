import React, { useEffect, useMemo, useState } from 'react';

import AppHeader from './components/AppHeader';
import ApplicationUsagePanel from './components/ApplicationUsagePanel';
import ConnectionsChart from './components/ConnectionsChart';
import HistoryPanel from './components/HistoryPanel';
import KpiGrid from './components/KpiGrid';
import MetricChart from './components/MetricChart';
import MetricDetailsPanel from './components/MetricDetailsPanel';
import PerformanceSummary from './components/PerformanceSummary';
import SettingsPanel from './components/SettingsPanel';
import StatusTimeline from './components/StatusTimeline';
import { useLiveMetrics } from './hooks/useLiveMetrics';
import { useMetricsHistory } from './hooks/useMetricsHistory';
import { useSettings } from './hooks/useSettings';
import { buildStatistics } from './utils/statistics';
import DomainTrafficPanel from './components/DomainTrafficPanel';
import SecurityOverview from './components/SecurityOverview';
import DockerResourcesPanel from './components/DockerResourcesPanel';
import OptimizationInsightsPanel from './components/OptimizationInsightsPanel';
import { buildMetricDetailsMap } from './utils/metricDetails';

const NAVIGATION = [
  {
    id: 'overview',
    label: 'Overview',
    description: 'Health, saturation, and stability'
  },
  {
    id: 'network',
    label: 'Network',
    description: 'Connections and traffic intelligence'
  },
  {
    id: 'operations',
    label: 'Operations',
    description: 'Processes, security, and containers'
  }
];

function App() {
  const { retentionSeconds, retentionDays, updateSetting } = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [activePage, setActivePage] = useState('overview');
  const [selectedMetricId, setSelectedMetricId] = useState(null);
  const {
    metrics,
    latestMetric,
    previousMetric,
    connectionState,
    health,
    statusEvents
  } = useLiveMetrics({ retentionSeconds });

  const stats = useMemo(() => buildStatistics(metrics), [metrics]);
  const metricDetails = useMemo(
    () => buildMetricDetailsMap({ latestMetric, previousMetric, stats }),
    [latestMetric, previousMetric, stats]
  );
  const selectedMetric = selectedMetricId ? metricDetails[selectedMetricId] : null;

  useEffect(() => {
    if (selectedMetricId && !metricDetails[selectedMetricId]) {
      setSelectedMetricId(null);
    }
  }, [metricDetails, selectedMetricId]);

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

  const handleMetricSelect = (metricId) => {
    if (!metricId || !metricDetails[metricId]) {
      return;
    }
    setSelectedMetricId(metricId);
  };

  const handleCloseDetails = () => {
    setSelectedMetricId(null);
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
        <nav className="app-nav" aria-label="Dashboard navigation">
          {NAVIGATION.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`app-nav__item ${activePage === item.id ? 'app-nav__item--active' : ''}`}
              onClick={() => setActivePage(item.id)}
            >
              <span className="app-nav__label">{item.label}</span>
              <span className="app-nav__description">{item.description}</span>
            </button>
          ))}
        </nav>

        <div className="app-page" role="tabpanel">
          {activePage === 'overview' && (
            <>
              <KpiGrid
                latestMetric={latestMetric}
                previousMetric={previousMetric}
                stats={stats}
                health={health}
                onSelectMetric={handleMetricSelect}
              />

              <section className="panel-grid panel-grid--single" aria-label="Resource utilisation">
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
              </section>

              <section className="panel-grid panel-grid--balanced" aria-label="Operational state">
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
            </>
          )}

          {activePage === 'network' && (
            <>
              <section className="panel-grid panel-grid--single" aria-label="Connection analytics">
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

              <section className="panel-grid panel-grid--balanced" aria-label="Traffic insights">
                <DomainTrafficPanel
                  domains={latestMetric?.domains ?? []}
                  totalConnections={latestMetric?.connections}
                  throughput={{ inbound: latestMetric?.netRx, outbound: latestMetric?.netTx }}
                />

                <article className="panel">
                  <div className="panel__header">
                    <div>
                      <h2>Snapshot history</h2>
                      <p>Capture session state for later comparison.</p>
                    </div>
                    <button
                      type="button"
                      className="panel__action"
                      onClick={handleSaveSnapshot}
                      disabled={!metrics.length}
                    >
                      Save snapshot
                    </button>
                  </div>
                  <p className="panel__body-text">
                    Use the header actions to browse or export previously saved states. Snapshots capture the values feeding this
                    network view, allowing you to compare trends over time.
                  </p>
                </article>
              </section>
            </>
          )}

          {activePage === 'operations' && (
            <>
              <section className="panel-grid panel-grid--balanced" aria-label="Workload focus">
                <ApplicationUsagePanel applications={latestMetric?.applications ?? []} />
                <OptimizationInsightsPanel latestMetric={latestMetric} stats={stats} />
              </section>

              <section className="panel-grid panel-grid--balanced" aria-label="Security and containers">
                <SecurityOverview latestMetric={latestMetric} />
                <DockerResourcesPanel
                  dockerAvailable={latestMetric?.dockerAvailable}
                  containers={latestMetric?.dockerContainers ?? []}
                  images={latestMetric?.dockerImages ?? []}
                />
              </section>
            </>
          )}
        </div>
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

      <MetricDetailsPanel metric={selectedMetric} onClose={handleCloseDetails} />
    </div>
  );
}

export default App;
