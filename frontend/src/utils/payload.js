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
    time: sampleDate.toLocaleTimeString([], {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }),
    timestamp: sampleDate.toISOString()
  };
};

