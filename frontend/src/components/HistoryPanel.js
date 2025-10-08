import React, { useEffect } from "react";

import {
  formatConnections,
  formatDateTime,
  formatDuration,
  formatMegabytes,
  formatPercentLabel,
  formatThroughput,
  formatThroughputPair,
} from "../utils/formatters";

const formatRangeLabel = (range) => {
  const startLabel = range?.start
    ? formatDateTime(range.start)
    : "Unknown start";
  const endLabel = range?.end ? formatDateTime(range.end) : "Unknown end";
  const durationLabel = formatDuration(range?.start, range?.end);
  return `${startLabel} → ${endLabel}${
    durationLabel ? ` · ${durationLabel}` : ""
  }`;
};

const renderStat = (label, value) => (
  <div className="history-panel__stat" key={label}>
    <dt>{label}</dt>
    <dd>{value}</dd>
  </div>
);

const renderStatGroup = (stats) => {
  if (!stats) {
    return null;
  }

  return (
    <div className="history-panel__stats-grid">
      {renderStat("CPU avg", formatPercentLabel(stats.cpu?.avg))}
      {renderStat("CPU peak", formatPercentLabel(stats.cpu?.peak))}
      {renderStat("Memory avg", formatPercentLabel(stats.memory?.avg))}
      {renderStat("Memory peak", formatPercentLabel(stats.memory?.peak))}
      {renderStat("Disk peak", formatPercentLabel(stats.disk?.peak))}
      {renderStat(
        "Connections peak",
        formatConnections(stats.connections?.peak)
      )}
      {renderStat("Network inbound peak", formatThroughput(stats.netRx?.peak))}
      {renderStat("Network outbound peak", formatThroughput(stats.netTx?.peak))}
    </div>
  );
};

const renderApplications = (applications) => {
  if (!Array.isArray(applications) || applications.length === 0) {
    return (
      <p className="history-panel__empty-row">
        No application data was captured in this snapshot.
      </p>
    );
  }

  return (
    <div className="panel__table-wrapper">
      <table className="detail-table" aria-label="Snapshot application usage">
        <thead>
          <tr>
            <th scope="col">Application</th>
            <th scope="col">CPU</th>
            <th scope="col">Memory</th>
            <th scope="col">PID</th>
          </tr>
        </thead>
        <tbody>
          {applications.map((app) => (
            <tr key={`${app.pid}-${app.name}`}>
              <th scope="row">
                <div className="entity-name">
                  {app.name || `Process ${app.pid}`}
                </div>
                <div className="entity-meta">PID {app.pid}</div>
              </th>
              <td>{formatPercentLabel(app.cpu)}</td>
              <td>{formatMegabytes(app.memoryMb)}</td>
              <td>{app.pid}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const renderDomains = (domains) => {
  if (!Array.isArray(domains) || domains.length === 0) {
    return (
      <p className="history-panel__empty-row">
        No remote domains were observed for this snapshot.
      </p>
    );
  }

  return (
    <div className="panel__table-wrapper">
      <table className="detail-table" aria-label="Snapshot domain usage">
        <thead>
          <tr>
            <th scope="col">Domain</th>
            <th scope="col">Connections</th>
            <th scope="col">Inbound</th>
            <th scope="col">Outbound</th>
          </tr>
        </thead>
        <tbody>
          {domains.map((domain) => (
            <tr key={`${domain.domain}-${domain.connections}`}>
              <th scope="row">
                <div className="entity-name">{domain.domain}</div>
                <div className="entity-meta">
                  {formatConnections(domain.connections)} connections
                </div>
              </th>
              <td>{formatConnections(domain.connections)}</td>
              <td>{formatThroughput(domain.receiveRate)}</td>
              <td>{formatThroughput(domain.transmitRate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

function HistoryPanel({
  open,
  onClose,
  snapshots,
  onDeleteSnapshot,
  onClearSnapshots,
  onExportSnapshot,
}) {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  return (
    <div
      className={`history-panel ${open ? "history-panel--open" : ""}`}
      aria-hidden={!open}
    >
      <div
        className="history-panel__backdrop"
        role="presentation"
        onClick={onClose}
      />
      <aside
        className="history-panel__surface"
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-panel-title"
      >
        <header className="history-panel__header">
          <div>
            <p className="history-panel__eyebrow">Historical snapshots</p>
            <h2 id="history-panel-title">Telemetry history</h2>
            <p className="history-panel__summary">
              Saved datasets capture the full application list, network domains
              and raw samples from the live stream. Export entries for offline
              analysis or remove them to reclaim local storage.
            </p>
          </div>
          <div className="history-panel__actions">
            <button
              type="button"
              className="history-panel__action"
              onClick={onClearSnapshots}
              disabled={!snapshots?.length}
            >
              Clear all
            </button>
            <button
              type="button"
              className="history-panel__close"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </header>
        <div className="history-panel__content">
          {snapshots?.length ? (
            <ul className="history-panel__list">
              {snapshots.map((snapshot) => (
                <li key={snapshot.id} className="history-panel__item">
                  <header className="history-panel__item-header">
                    <div>
                      <h3>Snapshot saved {formatDateTime(snapshot.savedAt)}</h3>
                      <p>{formatRangeLabel(snapshot.range)}</p>
                    </div>
                    <div className="history-panel__item-meta">
                      <span>
                        {snapshot.sampleCount.toLocaleString()} samples
                      </span>
                      <span>
                        {formatThroughputPair(
                          snapshot.latestMetric?.netRx,
                          snapshot.latestMetric?.netTx
                        )}
                      </span>
                    </div>
                  </header>

                  <section
                    aria-label="Resource summary"
                    className="history-panel__section"
                  >
                    <h4>Resource summary</h4>
                    <dl className="history-panel__stats">
                      {renderStatGroup(snapshot.stats)}
                    </dl>
                  </section>

                  <section
                    aria-label="Application utilisation"
                    className="history-panel__section"
                  >
                    <h4>Application utilisation</h4>
                    {renderApplications(snapshot.applications)}
                  </section>

                  <section
                    aria-label="Network domains"
                    className="history-panel__section"
                  >
                    <h4>Observed domains</h4>
                    {renderDomains(snapshot.domains)}
                  </section>

                  <footer className="history-panel__item-footer">
                    <div className="history-panel__item-actions">
                      <button
                        type="button"
                        className="history-panel__action"
                        onClick={() => onExportSnapshot(snapshot)}
                      >
                        Download JSON
                      </button>
                      <button
                        type="button"
                        className="history-panel__action history-panel__action--danger"
                        onClick={() => onDeleteSnapshot(snapshot.id)}
                      >
                        Remove snapshot
                      </button>
                    </div>
                  </footer>
                </li>
              ))}
            </ul>
          ) : (
            <div className="history-panel__empty" role="status">
              <p>
                No snapshots captured yet. Use the “Save snapshot” action in the
                dashboard header to archive the current session.
              </p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

export default HistoryPanel;
