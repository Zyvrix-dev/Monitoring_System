const rawMaxPoints = Number(process.env.REACT_APP_MAX_POINTS || 180);
const rawSampleInterval = Number(process.env.REACT_APP_SAMPLE_INTERVAL_SECONDS || 0.5);
const rawRetentionDays = Number(process.env.REACT_APP_DEFAULT_RETENTION_DAYS || 7);

const sampleIntervalSeconds = Number.isFinite(rawSampleInterval) && rawSampleInterval > 0 ? rawSampleInterval : 1;
const defaultRetentionDays = Number.isFinite(rawRetentionDays) && rawRetentionDays > 0 ? rawRetentionDays : 7;
const defaultRetentionSeconds = defaultRetentionDays * 24 * 60 * 60;
const fallbackMaxPoints = Number.isFinite(rawMaxPoints) && rawMaxPoints > 0 ? rawMaxPoints : Math.ceil(defaultRetentionSeconds / sampleIntervalSeconds);

export const appConfig = {
  websocketUrl: process.env.REACT_APP_WS_URL || 'ws://localhost:9002',
  apiToken: process.env.REACT_APP_API_TOKEN || '',
  sampleIntervalSeconds,
  defaultRetentionDays,
  defaultRetentionSeconds,
  maxDataPoints: Math.max(fallbackMaxPoints, Math.ceil(defaultRetentionSeconds / sampleIntervalSeconds))
};

export const buildWebSocketUrl = () => {
  const { websocketUrl, apiToken } = appConfig;
  try {
    const url = new URL(websocketUrl);
    if (apiToken) {
      url.searchParams.set('token', apiToken);
    }
    return url.toString();
  } catch (error) {
    if (!apiToken) {
      return websocketUrl;
    }
    const separator = websocketUrl.includes('?') ? '&' : '?';
    return `${websocketUrl}${separator}token=${encodeURIComponent(apiToken)}`;
  }
};

