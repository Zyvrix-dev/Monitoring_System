import React from 'react';

import { connectionLabel, healthLabel } from '../constants/status';

function AppHeader({ connectionState, health }) {
  return (
    <header className="app-header">
      <div className="app-header__titles">
        <p className="app-eyebrow">Observability Control Centre</p>
        <h1>Realtime Infrastructure Overview</h1>
        <p className="app-subtitle">
          Unified insights for system health, utilisation and client connectivity.
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
  );
}

export default AppHeader;

