import React from "react";

import { connectionLabel, healthLabel } from "../constants/status";

function AppHeader({
  connectionState,
  health,
  onOpenSettings,
  onOpenHistory,
  onSaveSnapshot,
  retentionDays,
  canSaveSnapshot,
  historyCount,
}) {
  const handleOpenSettings = () => {
    if (typeof onOpenSettings === "function") {
      onOpenSettings();
    }
  };

  const handleOpenHistory = () => {
    if (typeof onOpenHistory === "function") {
      onOpenHistory();
    }
  };

  const handleSaveSnapshot = () => {
    if (typeof onSaveSnapshot === "function") {
      onSaveSnapshot();
    }
  };

  const retentionNumeric = Number(retentionDays);
  const retentionLabel =
    Number.isFinite(retentionNumeric) && retentionNumeric > 0
      ? `${retentionNumeric} day${retentionNumeric === 1 ? "" : "s"}`
      : "configurable retention";

  const historyLabel =
    historyCount > 0 ? `History (${historyCount})` : "History";

  return (
    <header className="app-header">
      <div className="app-header__titles">
        <p className="app-eyebrow">Observability Control Centre</p>
        <h1>Realtime Infrastructure Overview</h1>
        <p className="app-subtitle">
          Unified insights for system health, utilisation and client
          connectivity.{" "}
          <span className="app-subtitle__meta">
            Currently retaining {retentionLabel} of streaming telemetry.
          </span>
        </p>
      </div>
      <div className="app-header__status">
        <div className="app-header__actions">
          <button
            type="button"
            className="header-button"
            onClick={handleSaveSnapshot}
            disabled={!canSaveSnapshot}
          >
            Save snapshot
          </button>
          <button
            type="button"
            className="header-button header-button--ghost"
            onClick={handleOpenHistory}
            disabled={!historyCount}
          >
            {historyLabel}
          </button>
          <button
            type="button"
            className="header-button"
            onClick={handleOpenSettings}
          >
            Dashboard settings
          </button>
        </div>
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
  );
}

export default AppHeader;
