import React from 'react';

import { formatMegabytes, formatPercentLabel } from '../utils/formatters';

function ApplicationUsagePanel({ applications }) {
  const hasData = Array.isArray(applications) && applications.length > 0;

  return (
    <article className="panel">
      <div className="panel__header">
        <div>
          <h2>Application utilisation</h2>
          <p>Top processes ranked by CPU saturation with resident memory usage.</p>
        </div>
      </div>
      {hasData ? (
        <table className="detail-table" aria-label="Top application resource usage">
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
                  <div className="entity-name">{app.name || `Process ${app.pid}`}</div>
                  <div className="entity-meta">PID {app.pid}</div>
                </th>
                <td>{formatPercentLabel(app.cpu)}</td>
                <td>{formatMegabytes(app.memoryMb)}</td>
                <td>{app.pid}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="panel__empty" role="status">
          <p>No processes sampled yet. Waiting for activity.</p>
        </div>
      )}
    </article>
  );
}

export default ApplicationUsagePanel;

