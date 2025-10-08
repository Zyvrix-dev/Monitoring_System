import {
  formatConnections,
  formatLoadPerCore,
  formatPercentLabel,
  formatThroughput
} from './formatters';

const severityWeight = {
  critical: 3,
  warning: 2,
  info: 1,
  success: 0
};

const toNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const getStatValue = (stats, key, property) => {
  if (!stats || !stats[key]) {
    return null;
  }
  return toNumber(stats[key][property]);
};

const describePercentRange = (avg, peak) => {
  const pieces = [];
  if (avg !== null) {
    pieces.push(`avg ${formatPercentLabel(avg)}`);
  }
  if (peak !== null) {
    pieces.push(`peak ${formatPercentLabel(peak)}`);
  }
  return pieces.join(' • ');
};

const pushInsight = (collection, insight) => {
  if (!insight || !insight.id) {
    return;
  }

  if (collection.some((item) => item.id === insight.id)) {
    return;
  }

  const actions = Array.isArray(insight.actions)
    ? insight.actions.filter((action) => typeof action === 'string' && action.trim().length > 0)
    : [];

  collection.push({
    ...insight,
    severity: insight.severity || 'info',
    actions
  });
};

const sortInsights = (insights) =>
  insights
    .map((insight, index) => ({
      ...insight,
      _index: index
    }))
    .sort((a, b) => {
      const severityDiff = (severityWeight[b.severity] ?? 0) - (severityWeight[a.severity] ?? 0);
      if (severityDiff !== 0) {
        return severityDiff;
      }
      return a._index - b._index;
    })
    .map(({ _index, ...rest }) => rest);

export const generateOptimizationInsights = ({ latestMetric, stats }) => {
  const insights = [];
  const cpu = toNumber(latestMetric?.cpu);
  const cpuAvg = getStatValue(stats, 'cpu', 'avg');
  const cpuPeak = getStatValue(stats, 'cpu', 'peak');

  if (cpu === null && cpuAvg === null) {
    pushInsight(insights, {
      id: 'cpu-metrics-missing',
      severity: 'info',
      title: 'CPU metrics unavailable',
      description:
        'The collector did not provide CPU data. Verify that the agent process has permission to read /proc/stat or the equivalent API.',
      actions: ['Check the metrics agent configuration and ensure the host exposes CPU counters.']
    });
  } else if (cpu !== null && (cpu >= 90 || (cpuAvg !== null && cpuAvg >= 85))) {
    pushInsight(insights, {
      id: 'cpu-saturation-critical',
      severity: 'critical',
      title: 'CPU saturation is critical',
      description: `Current CPU usage is ${formatPercentLabel(cpu)} with ${describePercentRange(cpuAvg, cpuPeak)} over the session.`,
      actions: [
        'Capture a CPU profile or flame graph to pinpoint hotspots.',
        'Consider autoscaling the service or increasing CPU limits if the load is expected to continue.'
      ]
    });
  } else if (cpu !== null && (cpu >= 75 || (cpuAvg !== null && cpuAvg >= 70))) {
    pushInsight(insights, {
      id: 'cpu-saturation-warning',
      severity: 'warning',
      title: 'CPU usage is trending high',
      description: `CPU currently sits at ${formatPercentLabel(cpu)}. ${describePercentRange(cpuAvg, cpuPeak) || 'Collect more samples to determine a baseline.'}`,
      actions: ['Review recent deploys or background jobs for CPU intensive work.', 'Enable adaptive throttling or caching where possible.']
    });
  }

  const memory = toNumber(latestMetric?.memory);
  const memoryAvg = getStatValue(stats, 'memory', 'avg');
  const memoryPeak = getStatValue(stats, 'memory', 'peak');

  if (memory !== null && (memory >= 92 || (memoryAvg !== null && memoryAvg >= 88))) {
    pushInsight(insights, {
      id: 'memory-critical',
      severity: 'critical',
      title: 'Memory pressure detected',
      description: `Memory usage is ${formatPercentLabel(memory)} with ${describePercentRange(memoryAvg, memoryPeak)} recorded.`,
      actions: [
        'Inspect heap allocations or enable leak detection tooling.',
        'Increase memory limits or add nodes to distribute the workload.'
      ]
    });
  } else if (memory !== null && (memory >= 80 || (memoryAvg !== null && memoryAvg >= 78))) {
    pushInsight(insights, {
      id: 'memory-warning',
      severity: 'warning',
      title: 'Memory utilisation is elevated',
      description: `Memory currently sits at ${formatPercentLabel(memory)} with ${describePercentRange(memoryAvg, memoryPeak) || 'limited sampling history.'}`,
      actions: ['Audit caches and buffer sizes.', 'Check for unbounded data structures or unexpectedly large payloads.']
    });
  }

  const swap = toNumber(latestMetric?.swap);
  if (swap !== null && swap >= 30) {
    pushInsight(insights, {
      id: 'swap-critical',
      severity: 'critical',
      title: 'High swap usage detected',
      description: `Swap is at ${formatPercentLabel(swap)}, indicating the system is paging heavily which will degrade latency.`,
      actions: ['Reduce memory pressure or provision faster storage for swap.', 'Investigate runaway processes consuming memory.']
    });
  } else if (swap !== null && swap >= 10) {
    pushInsight(insights, {
      id: 'swap-warning',
      severity: 'warning',
      title: 'Swap activity observed',
      description: `Swap usage reached ${formatPercentLabel(swap)}. Paging can throttle performance under load.`,
      actions: ['Consider lowering JVM or runtime heap targets.', 'Move ephemeral workloads with large memory footprints off this node.']
    });
  }

  const disk = toNumber(latestMetric?.disk);
  const diskPeak = getStatValue(stats, 'disk', 'peak');
  if (disk !== null && disk >= 95) {
    pushInsight(insights, {
      id: 'disk-critical',
      severity: 'critical',
      title: 'Disk capacity nearly exhausted',
      description: `Disk usage is ${formatPercentLabel(disk)} (peak ${formatPercentLabel(diskPeak)}). Running out of disk will crash workloads and corrupt caches.`,
      actions: ['Purge unused artifacts or rotate logs immediately.', 'Resize the volume or move stateful services to a larger disk.']
    });
  } else if (disk !== null && disk >= 80) {
    pushInsight(insights, {
      id: 'disk-warning',
      severity: 'warning',
      title: 'Disk usage trending high',
      description: `Disk usage is ${formatPercentLabel(disk)} with a session peak of ${formatPercentLabel(diskPeak)}.`,
      actions: ['Schedule log rotation and clean temporary directories.', 'Project future growth and plan storage expansion.']
    });
  }

  const load1 = toNumber(latestMetric?.load1);
  const cpuCores = toNumber(latestMetric?.cpuCores) || 1;
  if (load1 !== null) {
    const loadPerCore = load1 / Math.max(cpuCores, 1);
    if (loadPerCore >= 1.5) {
      pushInsight(insights, {
        id: 'load-critical',
        severity: 'critical',
        title: 'Run queue saturation',
        description: `1m load average per core is ${formatLoadPerCore(load1, cpuCores)}, suggesting CPU threads are over-scheduled.`,
        actions: ['Distribute work across additional instances.', 'Investigate blocking I/O or locks that keep threads runnable.']
      });
    } else if (loadPerCore >= 1.1) {
      pushInsight(insights, {
        id: 'load-warning',
        severity: 'warning',
        title: 'High runnable thread count',
        description: `Load per core is ${formatLoadPerCore(load1, cpuCores)}. Sustained contention will lead to latency spikes.`,
        actions: ['Review thread pools and asynchronous queues.', 'Ensure background jobs yield frequently.']
      });
    }
  }

  const netRxAvg = toNumber(latestMetric?.netRxAvg);
  const netTxAvg = toNumber(latestMetric?.netTxAvg);
  const peakInbound = getStatValue(stats, 'netRx', 'peak');
  const peakOutbound = getStatValue(stats, 'netTx', 'peak');
  const highInbound = netRxAvg !== null && netRxAvg >= 1024 * 40; // ~40 MB/s
  const highOutbound = netTxAvg !== null && netTxAvg >= 1024 * 40;
  if (highInbound || highOutbound) {
    const severity = netRxAvg >= 1024 * 120 || netTxAvg >= 1024 * 120 ? 'critical' : 'warning';
    pushInsight(insights, {
      id: 'network-throughput',
      severity,
      title: 'Network throughput is heavy',
      description: `Average 30s throughput is ↓${formatThroughput(netRxAvg)} • ↑${formatThroughput(netTxAvg)} (peaks ↓${formatThroughput(peakInbound)} • ↑${formatThroughput(peakOutbound)}).`,
      actions: [
        'Enable response compression or caching to cut bandwidth.',
        'Verify that bulk data transfers are scheduled during off-peak hours.'
      ]
    });
  }

  const uniqueDomains = toNumber(latestMetric?.uniqueDomains);
  if (uniqueDomains !== null && uniqueDomains >= 300) {
    pushInsight(insights, {
      id: 'domains-critical',
      severity: 'critical',
      title: 'Large external surface detected',
      description: `${formatConnections(uniqueDomains)} remote domains were contacted in the sampling window. This may indicate dependency sprawl or unexpected egress.`,
      actions: ['Audit outbound traffic against allow-lists.', 'Lock down network egress policies to limit exposure.']
    });
  } else if (uniqueDomains !== null && uniqueDomains >= 150) {
    pushInsight(insights, {
      id: 'domains-warning',
      severity: 'warning',
      title: 'High number of remote domains',
      description: `${formatConnections(uniqueDomains)} domains observed. Review for unnecessary third-party calls.`,
      actions: ['Instrument outbound requests with tracing to identify noisy integrations.']
    });
  }

  const openFds = toNumber(latestMetric?.openFds);
  if (openFds !== null && openFds >= 15000) {
    pushInsight(insights, {
      id: 'fds-critical',
      severity: 'critical',
      title: 'File descriptor exhaustion risk',
      description: `${formatConnections(openFds)} file descriptors are open. Approaching system limits can crash services or block new connections.`,
      actions: ['Increase ulimit values temporarily.', 'Inspect for leaked sockets or file handles in application logs.']
    });
  } else if (openFds !== null && openFds >= 8000) {
    pushInsight(insights, {
      id: 'fds-warning',
      severity: 'warning',
      title: 'Open file descriptors rising',
      description: `${formatConnections(openFds)} descriptors in use.`,
      actions: ['Ensure HTTP clients and database drivers close connections promptly.']
    });
  }

  const connectionsPeak = getStatValue(stats, 'connections', 'peak');
  if (connectionsPeak !== null && connectionsPeak >= 5000) {
    pushInsight(insights, {
      id: 'connections-warning',
      severity: connectionsPeak >= 10000 ? 'critical' : 'warning',
      title: 'Connection load spike',
      description: `Peak concurrent connections reached ${formatConnections(connectionsPeak)} during this session.`,
      actions: ['Scale the front-end load balancer or tune keep-alive timeouts.', 'Ensure connection pooling is configured for downstream dependencies.']
    });
  }

  const dockerAvailable = Boolean(latestMetric?.dockerAvailable);
  if (!dockerAvailable) {
    pushInsight(insights, {
      id: 'docker-unavailable',
      severity: 'info',
      title: 'Docker telemetry unavailable',
      description: 'Docker CLI access is disabled, preventing container-level optimisation insights.',
      actions: ['Install Docker or grant the monitoring agent permission to access the Docker socket.']
    });
  }

  const applications = Array.isArray(latestMetric?.applications) ? latestMetric.applications : [];
  if (!applications.length) {
    pushInsight(insights, {
      id: 'applications-missing',
      severity: 'info',
      title: 'Process sampling incomplete',
      description: 'No process level metrics were reported. Without top processes it is harder to correlate resource spikes.',
      actions: ['Ensure the agent can read /proc and is running with sufficient privileges.', 'Enable per-process sampling in the configuration.']
    });
  } else {
    const busiestProcess = applications.reduce((max, current) => {
      const currentCpu = toNumber(current?.cpu);
      if (currentCpu === null) {
        return max;
      }
      if (!max) {
        return current;
      }
      return currentCpu > (toNumber(max.cpu) ?? -Infinity) ? current : max;
    }, null);

    const busiestCpu = toNumber(busiestProcess?.cpu);
    if (busiestProcess && busiestCpu !== null && busiestCpu >= 50) {
      pushInsight(insights, {
        id: 'hot-process',
        severity: busiestCpu >= 70 ? 'warning' : 'info',
        title: `${busiestProcess.name || 'Top process'} is CPU heavy`,
        description: `${busiestProcess.name || 'A process'} is using ${formatPercentLabel(busiestCpu)} CPU (PID ${busiestProcess.pid}).`,
        actions: ['Profile this process for optimisation opportunities.', 'Evaluate pinning the service to dedicated resources if the load is expected.']
      });
    }
  }

  const warningsOrCritical = insights.some(
    (insight) => insight.severity === 'critical' || insight.severity === 'warning'
  );

  if (!warningsOrCritical) {
    pushInsight(insights, {
      id: 'system-healthy',
      severity: 'success',
      title: 'System resources look healthy',
      description: 'No optimisation blockers detected in the latest samples. You have headroom to experiment with new features or background tasks.',
      actions: ['Continue to capture baselines to detect regressions early.']
    });
  }

  return sortInsights(insights);
};

