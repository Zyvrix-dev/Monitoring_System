import {
  formatBoolean,
  formatConnections,
  formatCount,
  formatCpuCores,
  formatLoad,
  formatLoadPerCore,
  formatMegabytes,
  formatPercent,
  formatThroughput,
  formatThroughputPair
} from './formatters';

const buildSummaryItem = (label, value, description) => ({
  label,
  value,
  description
});

const buildDomainItems = (domains = []) =>
  domains.map((domain) => ({
    id: domain.domain,
    title: domain.domain,
    subtitle: `${formatConnections(domain.connections)} active connections`,
    description: `Inbound ${formatThroughput(domain.receiveRate)} • Outbound ${formatThroughput(domain.transmitRate)}`
  }));

const buildApplicationItems = (applications = []) =>
  applications.map((app) => ({
    id: String(app.pid),
    title: `${app.name}`,
    subtitle: `PID ${formatCount(app.pid)} • CPU ${formatPercent(app.cpu)}%`,
    description: `Memory ${formatMegabytes(app.memoryMb)}${app.commandLine ? ` • ${app.commandLine}` : ''}`
  }));

const buildDockerContainerItems = (containers = []) =>
  containers.map((container) => ({
    id: container.id || container.name,
    title: container.name || container.id,
    subtitle: `${container.image || 'unknown image'} • ${container.status || 'status unavailable'}`,
    description: [
      container.cpuPercent !== undefined && container.cpuPercent !== null
        ? `CPU ${formatPercent(container.cpuPercent)}%`
        : null,
      container.memoryUsageMb !== undefined && container.memoryUsageMb !== null
        ? `Memory ${formatMegabytes(container.memoryUsageMb)}`
        : null,
      container.networkRxKb !== undefined && container.networkTxKb !== undefined
        ? `Network ${formatThroughput(container.networkRxKb)} in / ${formatThroughput(container.networkTxKb)} out`
        : null
    ]
      .filter(Boolean)
      .join(' • ')
  }));

const buildDockerImageItems = (images = []) =>
  images.map((image) => ({
    id: image.id,
    title: image.repository || 'repository unknown',
    subtitle: `${image.tag || 'latest'} • ${image.id || 'image id unavailable'}`,
    description: image.size ? `Size ${image.size}` : 'Size unavailable'
  }));

export const buildMetricDetailsMap = ({ latestMetric, previousMetric, stats }) => {
  if (!latestMetric) {
    return {};
  }

  const detailMap = {
    cpu: {
      id: 'cpu',
      title: 'CPU utilisation',
      headline: `${formatPercent(latestMetric.cpu)}%`,
      summary: [
        buildSummaryItem('Current utilisation', `${formatPercent(latestMetric.cpu)}%`),
        buildSummaryItem(
          'Average (session)',
          `${formatPercent(stats?.cpu?.avg)}%`,
          'Rolling average computed across the active monitoring session.'
        ),
        buildSummaryItem('Load average (1m)', formatLoad(latestMetric.load1)),
        buildSummaryItem(
          'Load per core',
          formatLoadPerCore(latestMetric.load1, latestMetric.cpuCores),
          `Detected ${formatCpuCores(latestMetric.cpuCores)} CPU cores.`
        )
      ]
    },
    memory: {
      id: 'memory',
      title: 'Memory usage',
      headline: `${formatPercent(latestMetric.memory)}%`,
      summary: [
        buildSummaryItem('Physical memory in use', `${formatPercent(latestMetric.memory)}%`),
        buildSummaryItem('Swap usage', `${formatPercent(latestMetric.swap)}%`),
        buildSummaryItem('Processes tracked', formatCount(latestMetric.processes)),
        buildSummaryItem('Threads tracked', formatCount(latestMetric.threads))
      ],
      items: buildApplicationItems(latestMetric.applications)
    },
    disk: {
      id: 'disk',
      title: 'Disk usage',
      headline: `${formatPercent(latestMetric.disk)}%`,
      summary: [
        buildSummaryItem('Current utilisation', `${formatPercent(latestMetric.disk)}%`),
        buildSummaryItem(
          'Peak utilisation',
          `${formatPercent(stats?.disk?.peak)}%`,
          'Highest disk saturation recorded during the session.'
        ),
        buildSummaryItem('Open file descriptors', formatCount(latestMetric.openFds))
      ]
    },
    connections: {
      id: 'connections',
      title: 'Active connections',
      headline: formatConnections(latestMetric.connections),
      summary: [
        buildSummaryItem('Active TCP connections', formatConnections(latestMetric.connections)),
        buildSummaryItem(
          'Listening sockets',
          `${formatCount(latestMetric.listeningTcp)} TCP • ${formatCount(latestMetric.listeningUdp)} UDP`
        ),
        buildSummaryItem('Unique domains', formatCount(latestMetric.uniqueDomains))
      ],
      items: buildDomainItems(latestMetric.domains)
    },
    throughput: {
      id: 'throughput',
      title: 'Network throughput',
      headline: formatThroughputPair(latestMetric.netRx, latestMetric.netTx),
      summary: [
        buildSummaryItem('Inbound rate', formatThroughput(latestMetric.netRx)),
        buildSummaryItem('Outbound rate', formatThroughput(latestMetric.netTx)),
        buildSummaryItem(
          'Average inbound (30s)',
          formatThroughput(stats?.netRx?.avg)
        ),
        buildSummaryItem('Average outbound (30s)', formatThroughput(stats?.netTx?.avg))
      ],
      items: buildDomainItems(latestMetric.domains)
    },
    cpuAvg: {
      id: 'cpuAvg',
      title: 'CPU average (60s)',
      headline: `${formatPercent(latestMetric.cpuAvg)}%`,
      summary: [
        buildSummaryItem('Rolling 60s average', `${formatPercent(latestMetric.cpuAvg)}%`),
        buildSummaryItem('Session average', `${formatPercent(stats?.cpuAvg?.avg)}%`),
        buildSummaryItem(
          'Change since previous sample',
          previousMetric ? `${formatPercent(latestMetric.cpuAvg - previousMetric.cpuAvg)}%` : '--'
        )
      ]
    },
    swap: {
      id: 'swap',
      title: 'Swap usage',
      headline: `${formatPercent(latestMetric.swap)}%`,
      summary: [
        buildSummaryItem('Swap in use', `${formatPercent(latestMetric.swap)}%`),
        buildSummaryItem('Memory pressure', `${formatPercent(latestMetric.memory)}%`),
        buildSummaryItem('Processes', formatCount(latestMetric.processes))
      ]
    },
    processes: {
      id: 'processes',
      title: 'Processes',
      headline: formatCount(latestMetric.processes),
      summary: [
        buildSummaryItem('Running processes', formatCount(latestMetric.processes)),
        buildSummaryItem('Threads observed', formatCount(latestMetric.threads)),
        buildSummaryItem('CPU utilisation', `${formatPercent(latestMetric.cpu)}%`)
      ],
      items: buildApplicationItems(latestMetric.applications)
    },
    threads: {
      id: 'threads',
      title: 'Threads',
      headline: formatCount(latestMetric.threads),
      summary: [
        buildSummaryItem('Total threads', formatCount(latestMetric.threads)),
        buildSummaryItem('Processes', formatCount(latestMetric.processes)),
        buildSummaryItem('CPU utilisation', `${formatPercent(latestMetric.cpu)}%`)
      ],
      items: buildApplicationItems(latestMetric.applications)
    },
    listeningSockets: {
      id: 'listeningSockets',
      title: 'Listening sockets',
      headline: `${formatCount(latestMetric.listeningTcp)} TCP • ${formatCount(latestMetric.listeningUdp)} UDP`,
      summary: [
        buildSummaryItem('Listening TCP sockets', formatCount(latestMetric.listeningTcp)),
        buildSummaryItem('Listening UDP sockets', formatCount(latestMetric.listeningUdp)),
        buildSummaryItem('Active TCP connections', formatConnections(latestMetric.connections))
      ],
      description:
        'Socket level telemetry is aggregated for privacy. Combine this with domain analytics to understand inbound and outbound listeners.'
    },
    uniqueDomains: {
      id: 'uniqueDomains',
      title: 'Unique domains',
      headline: formatCount(latestMetric.uniqueDomains),
      summary: [
        buildSummaryItem('Unique domains observed', formatCount(latestMetric.uniqueDomains)),
        buildSummaryItem('Total connections', formatConnections(latestMetric.connections)),
        buildSummaryItem('Inbound rate', formatThroughput(latestMetric.netRx)),
        buildSummaryItem('Outbound rate', formatThroughput(latestMetric.netTx))
      ],
      items: buildDomainItems(latestMetric.domains)
    },
    docker: {
      id: 'docker',
      title: 'Docker containers',
      headline: formatCount(latestMetric?.dockerContainers?.length ?? 0),
      summary: [
        buildSummaryItem('Docker available', formatBoolean(latestMetric.dockerAvailable)),
        buildSummaryItem('Running containers', formatCount(latestMetric?.dockerContainers?.length ?? 0)),
        buildSummaryItem('Images discovered', formatCount(latestMetric?.dockerImages?.length ?? 0))
      ],
      items: [
        ...buildDockerContainerItems(latestMetric?.dockerContainers ?? []),
        ...buildDockerImageItems(latestMetric?.dockerImages ?? [])
      ]
    }
  };

  return detailMap;
};

