import React from "react";

import { formatConnections, formatThroughput } from "../utils/formatters";

function DomainTrafficPanel({ domains, totalConnections, throughput }) {
  const hasData = Array.isArray(domains) && domains.length > 0;
  const summaryLabel = totalConnections
    ? `${formatConnections(totalConnections)} active connections`
    : "No active connections";

  return (
    <article className="panel">
      <div className="panel__header">
        <div>
          <h2>Network usage by domain</h2>
          <p>
            Observed TCP peers with proportional inbound and outbound
            throughput.
          </p>
        </div>
        <div className="panel__helper" aria-live="polite">
          {summaryLabel}
        </div>
      </div>
      {hasData ? (
        <div className="panel__table-wrapper">
          <table className="detail-table" aria-label="Network usage per domain">
            <thead>
              <tr>
                <th scope="col">Remote domain</th>
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
      ) : (
        <div className="panel__empty" role="status">
          <p>No network peers detected for the current sampling window.</p>
        </div>
      )}
      <footer className="panel__footer">
        <p>
          Aggregate throughput: ↓{formatThroughput(throughput?.inbound)} • ↑
          {formatThroughput(throughput?.outbound)}
        </p>
      </footer>
    </article>
  );
}

export default DomainTrafficPanel;
