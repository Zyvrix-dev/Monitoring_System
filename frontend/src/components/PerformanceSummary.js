import React from 'react';

import {
  formatConnections,
  formatCpuCores,
  formatLoad,
  formatLoadPerCore,
  formatPercentLabel,
  formatThroughput
} from '../utils/formatters';

function PerformanceSummary({ latestMetric, stats }) {
  return (
    <article className="panel">
      <div className="panel__header">
        <div>
          <h2>Performance summary</h2>
          <p>Aggregates calculated from the active session.</p>
        </div>
      </div>
      <div className="insights">
        <table className="insights-table">
          <thead>
            <tr>
              <th scope="col">Metric</th>
              <th scope="col">Current</th>
              <th scope="col">Average</th>
              <th scope="col">Peak</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">CPU</th>
              <td>{formatPercentLabel(latestMetric?.cpu)}</td>
              <td>{stats.cpu?.avg !== null ? formatPercentLabel(stats.cpu.avg) : '--'}</td>
              <td>{stats.cpu?.peak !== null ? formatPercentLabel(stats.cpu.peak) : '--'}</td>
            </tr>
            <tr>
              <th scope="row">Memory</th>
              <td>{formatPercentLabel(latestMetric?.memory)}</td>
              <td>{stats.memory?.avg !== null ? formatPercentLabel(stats.memory.avg) : '--'}</td>
              <td>{stats.memory?.peak !== null ? formatPercentLabel(stats.memory.peak) : '--'}</td>
            </tr>
            <tr>
              <th scope="row">Connections</th>
              <td>{formatConnections(latestMetric?.connections)}</td>
              <td>
                {stats.connections?.avg !== null
                  ? formatConnections(Math.round(stats.connections.avg))
                  : '--'}
              </td>
              <td>
                {stats.connections?.peak !== null
                  ? formatConnections(Math.round(stats.connections.peak))
                  : '--'}
              </td>
            </tr>
            <tr>
              <th scope="row">Disk</th>
              <td>{formatPercentLabel(latestMetric?.disk)}</td>
              <td>{stats.disk?.avg !== null ? formatPercentLabel(stats.disk.avg) : '--'}</td>
              <td>{stats.disk?.peak !== null ? formatPercentLabel(stats.disk.peak) : '--'}</td>
            </tr>
            <tr>
              <th scope="row">Network in</th>
              <td>{formatThroughput(latestMetric?.netRx)}</td>
              <td>{stats.netRx?.avg !== null ? formatThroughput(stats.netRx.avg) : '--'}</td>
              <td>{stats.netRx?.peak !== null ? formatThroughput(stats.netRx.peak) : '--'}</td>
            </tr>
            <tr>
              <th scope="row">Network out</th>
              <td>{formatThroughput(latestMetric?.netTx)}</td>
              <td>{stats.netTx?.avg !== null ? formatThroughput(stats.netTx.avg) : '--'}</td>
              <td>{stats.netTx?.peak !== null ? formatThroughput(stats.netTx.peak) : '--'}</td>
            </tr>
            <tr>
              <th scope="row">Load 1m</th>
              <td>{formatLoad(latestMetric?.load1)}</td>
              <td>{stats.load1?.avg !== null ? formatLoad(stats.load1.avg) : '--'}</td>
              <td>{stats.load1?.peak !== null ? formatLoad(stats.load1.peak) : '--'}</td>
            </tr>
            <tr>
              <th scope="row">Load 5m</th>
              <td>{formatLoad(latestMetric?.load5)}</td>
              <td>{stats.load5?.avg !== null ? formatLoad(stats.load5.avg) : '--'}</td>
              <td>{stats.load5?.peak !== null ? formatLoad(stats.load5.peak) : '--'}</td>
            </tr>
            <tr>
              <th scope="row">Load 15m</th>
              <td>{formatLoad(latestMetric?.load15)}</td>
              <td>{stats.load15?.avg !== null ? formatLoad(stats.load15.avg) : '--'}</td>
              <td>{stats.load15?.peak !== null ? formatLoad(stats.load15.peak) : '--'}</td>
            </tr>
          </tbody>
        </table>
        <div className="insights-meta" role="list">
          <div className="insights-meta__item" role="listitem">
            <p className="insights-meta__label">CPU cores</p>
            <p className="insights-meta__value">{formatCpuCores(latestMetric?.cpuCores)}</p>
          </div>
          <div className="insights-meta__item" role="listitem">
            <p className="insights-meta__label">1m load per core</p>
            <p className="insights-meta__value">
              {formatLoadPerCore(latestMetric?.load1, latestMetric?.cpuCores)}
            </p>
          </div>
          <div className="insights-meta__item" role="listitem">
            <p className="insights-meta__label">5m load per core</p>
            <p className="insights-meta__value">
              {formatLoadPerCore(latestMetric?.load5, latestMetric?.cpuCores)}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

export default PerformanceSummary;

