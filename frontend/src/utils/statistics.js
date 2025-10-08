const metricsToSummarise = [
  'cpu',
  'memory',
  'disk',
  'connections',
  'load1',
  'load5',
  'load15',
  'netRx',
  'netTx'
];

const summariseValues = (values) => {
  if (!values.length) {
    return { avg: null, peak: null, min: null };
  }

  const sum = values.reduce((total, value) => total + value, 0);
  return {
    avg: sum / values.length,
    peak: Math.max(...values),
    min: Math.min(...values)
  };
};

export const buildStatistics = (metrics) => {
  if (!metrics.length) {
    return metricsToSummarise.reduce((acc, key) => {
      acc[key] = { avg: null, peak: null, min: null };
      return acc;
    }, {});
  }

  return metricsToSummarise.reduce((acc, key) => {
    const values = metrics
      .map((item) => Number(item[key]))
      .filter((value) => Number.isFinite(value));

    acc[key] = summariseValues(values);
    return acc;
  }, {});
};

