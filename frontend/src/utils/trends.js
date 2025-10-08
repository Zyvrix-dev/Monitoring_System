export const buildTrend = (latestMetric, previousMetric, key, unitSuffix) => {
  if (!latestMetric || !previousMetric) {
    return null;
  }

  const latestValue = Number(latestMetric[key]);
  const previousValue = Number(previousMetric[key]);

  if (!Number.isFinite(latestValue) || !Number.isFinite(previousValue)) {
    return null;
  }

  const delta = latestValue - previousValue;
  const threshold = unitSuffix === '%' ? 0.1 : 1;
  const direction = Math.abs(delta) < threshold ? 'steady' : delta > 0 ? 'up' : 'down';

  if (direction === 'steady') {
    return {
      direction: 'steady',
      label: 'Stable vs last sample'
    };
  }

  const symbol = delta > 0 ? '+' : '-';
  const formattedDelta =
    unitSuffix === '%'
      ? Math.abs(delta).toFixed(1)
      : Math.round(Math.abs(delta)).toLocaleString();

  return {
    direction,
    label: `${symbol}${formattedDelta}${unitSuffix} vs last sample`
  };
};

