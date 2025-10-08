import React from "react";

import {
  formatCount,
  formatConnections,
  formatThroughput,
} from "../utils/formatters";

function SecurityOverview({ latestMetric }) {
  const tcpListeners = formatCount(latestMetric?.listeningTcp);
  const udpListeners = formatCount(latestMetric?.listeningUdp);
  const uniqueDomains = formatCount(latestMetric?.uniqueDomains);
  const openFds = formatCount(latestMetric?.openFds);
  const processes = formatCount(latestMetric?.processes);
  const threads = formatCount(latestMetric?.threads);
  const avgInbound = formatThroughput(latestMetric?.netRxAvg);
  const avgOutbound = formatThroughput(latestMetric?.netTxAvg);

  return (
    <article className="panel">
      <div className="panel__header">
        <div>
          <h2>Security &amp; exposure overview</h2>
          <p>Snapshot of external reachability and system surface area.</p>
        </div>
      </div>
      <div className="panel__table-wrapper">
        <table className="detail-table" aria-label="Security posture metrics">
          <tbody>
            <tr>
              <th scope="row">Listening sockets</th>
              <td>
                {tcpListeners} TCP • {udpListeners} UDP
              </td>
            </tr>
            <tr>
              <th scope="row">Active remote domains</th>
              <td>{uniqueDomains}</td>
            </tr>
            <tr>
              <th scope="row">Average network throughput (30s)</th>
              <td>
                ↓{avgInbound} • ↑{avgOutbound}
              </td>
            </tr>
            <tr>
              <th scope="row">Open file descriptors</th>
              <td>{openFds}</td>
            </tr>
            <tr>
              <th scope="row">Running processes</th>
              <td>{processes}</td>
            </tr>
            <tr>
              <th scope="row">Total threads</th>
              <td>{threads}</td>
            </tr>
            <tr>
              <th scope="row">Active connections</th>
              <td>{formatConnections(latestMetric?.connections)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>
  );
}

export default SecurityOverview;
