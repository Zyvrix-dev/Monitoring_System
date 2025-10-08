const rawMaxPoints = Number(process.env.REACT_APP_MAX_POINTS || 180);

export const appConfig = {
  websocketUrl: process.env.REACT_APP_WS_URL || 'ws://localhost:9002',
  apiToken: process.env.REACT_APP_API_TOKEN || '',
  maxDataPoints: Number.isFinite(rawMaxPoints) && rawMaxPoints > 0 ? rawMaxPoints : 180
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

