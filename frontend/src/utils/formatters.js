export const formatPercent = (value) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '--';
  }
  return Number(value).toFixed(1);
};

export const formatPercentLabel = (value) => {
  const base = formatPercent(value);
  return base === '--' ? '--' : `${base}%`;
};

export const formatConnections = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '--';
  }
  return Number(value).toLocaleString();
};

export const formatLoad = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return '--';
  }
  return numeric.toFixed(2);
};

export const formatLoadPerCore = (value, cores) => {
  const numeric = Number(value);
  const coreCount = Math.max(Number(cores) || 0, 1);
  if (!Number.isFinite(numeric)) {
    return '--';
  }
  return (numeric / coreCount).toFixed(2);
};

const formatThroughputUnit = (numeric) => {
  const absValue = Math.abs(numeric);
  if (absValue >= 1024 * 1024) {
    return `${(numeric / (1024 * 1024)).toFixed(2)} GB/s`;
  }
  if (absValue >= 1024) {
    return `${(numeric / 1024).toFixed(2)} MB/s`;
  }
  return `${numeric.toFixed(1)} KB/s`;
};

export const formatThroughput = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return '--';
  }
  return formatThroughputUnit(numeric);
};

export const formatThroughputPair = (inbound, outbound) => {
  const down = formatThroughput(inbound);
  const up = formatThroughput(outbound);
  if (down === '--' && up === '--') {
    return '--';
  }
  return `↓${down} • ↑${up}`;
};

export const formatCpuCores = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return '--';
  }
  return numeric.toLocaleString();
};

export const formatMegabytes = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return '--';
  }
  if (numeric >= 1024) {
    return `${(numeric / 1024).toFixed(2)} GB`;
  }
  return `${numeric.toFixed(1)} MB`;
};

