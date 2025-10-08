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

export const normaliseMetricPayload = (payload) => {
  const timestampIso = payload.timestamp || payload.time || new Date().toISOString();
  let sampleDate = new Date(timestampIso);
  if (Number.isNaN(sampleDate.getTime())) {
    sampleDate = new Date();
  }

  return {
    cpu: Number(payload.cpu ?? payload.cpuUsage ?? 0),
    memory: Number(payload.memory ?? payload.memoryUsage ?? 0),
    connections: Number(payload.connections ?? payload.activeConnections ?? 0),
    disk: Number(payload.disk ?? payload.diskUsage ?? 0),
    load1: Number(payload.load1 ?? payload.loadAverage1 ?? 0),
    load5: Number(payload.load5 ?? payload.loadAverage5 ?? 0),
    load15: Number(payload.load15 ?? payload.loadAverage15 ?? 0),
    netRx: Number(payload.netRx ?? payload.networkReceiveRate ?? 0),
    netTx: Number(payload.netTx ?? payload.networkTransmitRate ?? 0),
    cpuCores: Number(payload.cpuCores ?? payload.cpuCount ?? 0),
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

