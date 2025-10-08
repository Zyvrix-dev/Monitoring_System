import { useEffect, useMemo, useRef, useState } from 'react';

import { appConfig, buildWebSocketUrl } from '../config';
import { connectionLabel } from '../constants/status';
import { createStatusEvent, determineHealth } from '../utils/health';
import { normaliseMetricPayload } from '../utils/payload';

const CONNECTION_STATES = Object.keys(connectionLabel);

const sanitiseConnectionState = (state) =>
  CONNECTION_STATES.includes(state) ? state : 'connecting';

export const useLiveMetrics = () => {
  const [metrics, setMetrics] = useState([]);
  const [connectionState, setConnectionState] = useState('connecting');
  const [statusEvents, setStatusEvents] = useState([]);
  const previousHealth = useRef('unknown');

  useEffect(() => {
    let ws;
    let reconnectTimer;
    let cancelled = false;

    const connect = () => {
      if (cancelled) {
        return;
      }

      setConnectionState('connecting');

      ws = new WebSocket(buildWebSocketUrl());

      ws.onopen = () => {
        if (!cancelled) {
          setConnectionState('connected');
        }
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const metric = normaliseMetricPayload(payload);

          setMetrics((previous) => {
            const next = [...previous, metric];
            if (next.length > appConfig.maxDataPoints) {
              next.shift();
            }
            return next;
          });
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('Failed to parse metric payload', error);
        }
      };

      ws.onclose = () => {
        if (cancelled) {
          return;
        }
        setConnectionState('disconnected');
        reconnectTimer = setTimeout(connect, 4000);
      };

      ws.onerror = () => {
        if (ws && ws.readyState !== WebSocket.CLOSING) {
          ws.close();
        }
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        ws.close();
      }
    };
  }, []);

  const latestMetric = metrics.length ? metrics[metrics.length - 1] : undefined;
  const previousMetric = metrics.length > 1 ? metrics[metrics.length - 2] : undefined;

  useEffect(() => {
    if (!latestMetric) {
      return;
    }

    const health = determineHealth(latestMetric);
    if (previousHealth.current !== health) {
      const event = createStatusEvent(health, latestMetric);
      setStatusEvents((prev) => [event, ...prev].slice(0, 10));
      previousHealth.current = health;
    }
  }, [latestMetric]);

  const health = useMemo(() => determineHealth(latestMetric), [latestMetric]);

  return {
    metrics,
    latestMetric,
    previousMetric,
    connectionState: sanitiseConnectionState(connectionState),
    health,
    statusEvents
  };
};

