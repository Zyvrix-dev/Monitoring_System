const normaliseApplications = (rawApplications) => {
  if (!Array.isArray(rawApplications)) {
    return [];
  }

  return rawApplications
    .map((app) => {
      const pid = Number(app?.pid ?? app?.processId ?? app?.id);
      const cpu = Number(app?.cpu ?? app?.cpuPercent ?? app?.cpuUsage ?? 0);
      const memoryMb = Number(app?.memoryMb ?? app?.memory ?? app?.memoryUsage ?? 0);
      return {
        pid: Number.isFinite(pid) ? pid : 0,
        name: String(app?.name ?? app?.process ?? `PID ${pid}`),
        cpu,
        memoryMb
      };
    })
    .filter((app) => app.name);
};

const normaliseDomains = (rawDomains) => {
  if (!Array.isArray(rawDomains)) {
    return [];
  }

  return rawDomains
    .map((domain) => ({
      domain: String(domain?.domain ?? domain?.host ?? domain?.address ?? 'unresolved'),
      connections: Number(domain?.connections ?? domain?.count ?? 0),
      receiveRate: Number(domain?.receiveRate ?? domain?.inbound ?? 0),
      transmitRate: Number(domain?.transmitRate ?? domain?.outbound ?? 0)
    }))
    .filter((item) => item.domain);
};

const normaliseDockerContainers = (rawContainers) => {
  if (!Array.isArray(rawContainers)) {
    return [];
  }

  return rawContainers.map((container) => ({
    id: String(container?.id ?? container?.containerId ?? ''),
    name: String(container?.name ?? container?.Names ?? container?.container ?? '').trim(),
    image: String(container?.image ?? container?.Image ?? '').trim(),
    status: String(container?.status ?? container?.State ?? container?.Status ?? '').trim()
  }));
};

const normaliseDockerImages = (rawImages) => {
  if (!Array.isArray(rawImages)) {
    return [];
  }

  return rawImages.map((image) => ({
    repository: String(image?.repository ?? image?.repo ?? image?.Repository ?? '').trim(),
    tag: String(image?.tag ?? image?.Tag ?? '').trim(),
    id: String(image?.id ?? image?.imageId ?? image?.ID ?? '').trim(),
    size: String(image?.size ?? image?.Size ?? '').trim()
  }));
};

export const normaliseMetricPayload = (payload) => {
  const timestampIso = payload.timestamp || payload.time || new Date().toISOString();
  let sampleDate = new Date(timestampIso);
  if (Number.isNaN(sampleDate.getTime())) {
    sampleDate = new Date();
  }

  return {
    cpu: Number(payload.cpu ?? payload.cpuUsage ?? 0),
    cpuAvg: Number(payload.cpuAvg ?? payload.cpuAverage ?? payload.cpuUsageAverage ?? 0),
    memory: Number(payload.memory ?? payload.memoryUsage ?? 0),
    swap: Number(payload.swap ?? payload.swapUsage ?? 0),
    connections: Number(payload.connections ?? payload.activeConnections ?? 0),
    disk: Number(payload.disk ?? payload.diskUsage ?? 0),
    load1: Number(payload.load1 ?? payload.loadAverage1 ?? 0),
    load5: Number(payload.load5 ?? payload.loadAverage5 ?? 0),
    load15: Number(payload.load15 ?? payload.loadAverage15 ?? 0),
    netRx: Number(payload.netRx ?? payload.networkReceiveRate ?? 0),
    netTx: Number(payload.netTx ?? payload.networkTransmitRate ?? 0),
    netRxAvg: Number(payload.netRxAvg ?? payload.networkReceiveRateAverage ?? 0),
    netTxAvg: Number(payload.netTxAvg ?? payload.networkTransmitRateAverage ?? 0),
    cpuCores: Number(payload.cpuCores ?? payload.cpuCount ?? 0),
    processes: Number(payload.processes ?? payload.processCount ?? 0),
    threads: Number(payload.threads ?? payload.threadCount ?? 0),
    listeningTcp: Number(payload.listeningTcp ?? payload.tcpListening ?? 0),
    listeningUdp: Number(payload.listeningUdp ?? payload.udpListening ?? 0),
    openFds: Number(payload.openFds ?? payload.openFileDescriptors ?? 0),
    uniqueDomains: Number(payload.uniqueDomains ?? payload.domainCount ?? 0),
    dockerAvailable: Boolean(payload.dockerAvailable ?? payload.docker ?? false),
    dockerContainers: normaliseDockerContainers(payload.dockerContainers ?? payload.containers),
    dockerImages: normaliseDockerImages(payload.dockerImages ?? payload.images),
    applications: normaliseApplications(payload.applications ?? payload.topApplications),
    domains: normaliseDomains(payload.domains ?? payload.domainUsage),
    time: sampleDate.toLocaleTimeString([], {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }),
    timestamp: sampleDate.toISOString()
  };
};

