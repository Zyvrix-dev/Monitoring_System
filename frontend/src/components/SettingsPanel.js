import React, { useEffect, useMemo } from "react";

function SettingsPanel({ open, onClose, retentionDays, onRetentionChange }) {
  const safeRetention = useMemo(() => {
    const numeric = Number(retentionDays);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return 1;
    }
    return Math.max(1, Math.min(30, Math.round(numeric)));
  }, [retentionDays]);

  const handleSliderChange = (event) => {
    onRetentionChange(Number(event.target.value));
  };

  const handleNumberChange = (event) => {
    const value = Number(event.target.value);
    if (Number.isFinite(value)) {
      onRetentionChange(value);
    }
  };

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
      className={`settings-panel ${open ? "settings-panel--open" : ""}`}
      aria-hidden={!open}
    >
      <div
        className="settings-panel__backdrop"
        role="presentation"
        onClick={onClose}
      />
      <aside
        className="settings-panel__surface"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-panel-title"
      >
        <header className="settings-panel__header">
          <div>
            <p className="settings-panel__eyebrow">Configuration</p>
            <h2 id="settings-panel-title">Dashboard settings</h2>
            <p className="settings-panel__summary">
              Control retention of historical samples for time series
              visualisations.
            </p>
          </div>
          <button
            type="button"
            className="settings-panel__close"
            onClick={onClose}
          >
            Close
          </button>
        </header>
        <div className="settings-panel__content">
          <label htmlFor="retention-slider" className="settings-panel__label">
            Data retention window
          </label>
          <p className="settings-panel__description">
            Choose how many days of metrics to retain in the live session.
            Increasing this enables long-term trend analysis at the cost of
            higher memory usage in the browser.
          </p>
          <div className="settings-panel__field">
            <input
              id="retention-slider"
              type="range"
              min="1"
              max="30"
              value={safeRetention}
              onChange={handleSliderChange}
            />
            <input
              type="number"
              min="1"
              max="30"
              value={safeRetention}
              onChange={handleNumberChange}
              aria-label="Retention window in days"
            />
            <span className="settings-panel__value">{safeRetention} days</span>
          </div>
          <ul className="settings-panel__tips">
            <li>7 days provides a balance of fidelity and responsiveness.</li>
            <li>Use a smaller window for highly transient workloads.</li>
            <li>Use a larger window to support weekly operational reviews.</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}

export default SettingsPanel;
