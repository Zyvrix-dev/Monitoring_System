import React from 'react';

import {
  formatConnections,
  formatCpuCores,
  formatLoad,
  formatLoadPerCore,
  formatPercent,
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
              <th scope="row">Avg net in (30s)</th>
              <td>{formatThroughput(latestMetric?.netRxAvg)}</td>
              <td>{stats.netRxAvg?.avg !== null ? formatThroughput(stats.netRxAvg.avg) : '--'}</td>
              <td>{stats.netRxAvg?.peak !== null ? formatThroughput(stats.netRxAvg.peak) : '--'}</td>
            </tr>
            <tr>
              <th scope="row">Avg net out (30s)</th>
              <td>{formatThroughput(latestMetric?.netTxAvg)}</td>
              <td>{stats.netTxAvg?.avg !== null ? formatThroughput(stats.netTxAvg.avg) : '--'}</td>
              <td>{stats.netTxAvg?.peak !== null ? formatThroughput(stats.netTxAvg.peak) : '--'}</td>
            </tr>
            <tr>
              <th scope="row">Swap</th>
              <td>{formatPercentLabel(latestMetric?.swap)}</td>
              <td>{stats.swap?.avg !== null ? formatPercentLabel(stats.swap.avg) : '--'}</td>
              <td>{stats.swap?.peak !== null ? formatPercentLabel(stats.swap.peak) : '--'}</td>
            </tr>
            <tr>
              <th scope="row">Processes</th>
              <td>{formatConnections(latestMetric?.processes)}</td>
              <td>{stats.processes?.avg !== null ? formatConnections(Math.round(stats.processes.avg)) : '--'}</td>
              <td>{stats.processes?.peak !== null ? formatConnections(Math.round(stats.processes.peak)) : '--'}</td>
            </tr>
            <tr>
              <th scope="row">Threads</th>
              <td>{formatConnections(latestMetric?.threads)}</td>
              <td>{stats.threads?.avg !== null ? formatConnections(Math.round(stats.threads.avg)) : '--'}</td>
              <td>{stats.threads?.peak !== null ? formatConnections(Math.round(stats.threads.peak)) : '--'}</td>
            </tr>
            <tr>
              <th scope="row">Listening TCP</th>
              <td>{formatConnections(latestMetric?.listeningTcp)}</td>
              <td>{stats.listeningTcp?.avg !== null ? formatConnections(Math.round(stats.listeningTcp.avg)) : '--'}</td>
              <td>{stats.listeningTcp?.peak !== null ? formatConnections(Math.round(stats.listeningTcp.peak)) : '--'}</td>
            </tr>
            <tr>
              <th scope="row">Listening UDP</th>
              <td>{formatConnections(latestMetric?.listeningUdp)}</td>
              <td>{stats.listeningUdp?.avg !== null ? formatConnections(Math.round(stats.listeningUdp.avg)) : '--'}</td>
              <td>{stats.listeningUdp?.peak !== null ? formatConnections(Math.round(stats.listeningUdp.peak)) : '--'}</td>
            </tr>
            <tr>
              <th scope="row">Open file descriptors</th>
              <td>{formatConnections(latestMetric?.openFds)}</td>
              <td>{stats.openFds?.avg !== null ? formatConnections(Math.round(stats.openFds.avg)) : '--'}</td>
              <td>{stats.openFds?.peak !== null ? formatConnections(Math.round(stats.openFds.peak)) : '--'}</td>
            </tr>
            <tr>
              <th scope="row">Unique domains</th>
              <td>{formatConnections(latestMetric?.uniqueDomains)}</td>
              <td>{stats.uniqueDomains?.avg !== null ? formatConnections(Math.round(stats.uniqueDomains.avg)) : '--'}</td>
              <td>{stats.uniqueDomains?.peak !== null ? formatConnections(Math.round(stats.uniqueDomains.peak)) : '--'}</td>
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
          <div className="insights-meta__item" role="listitem">
            <p className="insights-meta__label">Docker containers</p>
            <p className="insights-meta__value">
              {latestMetric?.dockerAvailable
                ? `${formatConnections(latestMetric?.dockerContainers?.length ?? 0)} running`
                : 'Unavailable'}
            </p>
          </div>
          <div className="insights-meta__item" role="listitem">
            <p className="insights-meta__label">30s CPU average</p>
            <p className="insights-meta__value">{formatPercent(latestMetric?.cpuAvg)}%</p>
          </div>
        </div>
      </div>
    </article>
  );
}

export default PerformanceSummary;

