import { useCallback, useMemo, useState } from 'react';

const STORAGE_KEY = 'monitoring.history.snapshots.v1';
const MAX_SNAPSHOTS = 25;

const cloneValue = (value) => {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    return value;
  }
};

const readStoredSnapshots = () => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed;
  } catch (error) {
    return [];
  }
};

const persistSnapshots = (snapshots) => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshots));
  } catch (error) {
    // Swallow storage errors (e.g. quota exceeded) to avoid breaking the UI.
  }
};

const createSnapshot = (metrics, latestMetric, stats) => {
  if (!Array.isArray(metrics) || metrics.length === 0) {
    return undefined;
  }

  const clonedMetrics = cloneValue(metrics);
  const safeLatest = cloneValue(latestMetric ?? {});
  const safeStats = cloneValue(stats ?? {});

  const first = metrics[0];
  const last = metrics[metrics.length - 1];

  const range = {
    start: first?.timestamp ?? null,
    end: last?.timestamp ?? null
  };

  return {
    id: `snapshot-${Date.now()}`,
    savedAt: new Date().toISOString(),
    sampleCount: metrics.length,
    range,
    stats: safeStats,
    latestMetric: safeLatest,
    applications: cloneValue(safeLatest?.applications ?? []),
    domains: cloneValue(safeLatest?.domains ?? []),
    metrics: clonedMetrics
  };
};

export const useMetricsHistory = ({ metrics, latestMetric, stats }) => {
  const [snapshots, setSnapshots] = useState(() => readStoredSnapshots());

  const saveSnapshot = useCallback(() => {
    const snapshot = createSnapshot(metrics, latestMetric, stats);
    if (!snapshot) {
      return undefined;
    }

    setSnapshots((previous) => {
      const next = [snapshot, ...previous];
      if (next.length > MAX_SNAPSHOTS) {
        next.length = MAX_SNAPSHOTS;
      }
      persistSnapshots(next);
      return next;
    });

    return snapshot;
  }, [metrics, latestMetric, stats]);

  const deleteSnapshot = useCallback((id) => {
    setSnapshots((previous) => {
      const next = previous.filter((item) => item.id !== id);
      persistSnapshots(next);
      return next;
    });
  }, []);

  const clearSnapshots = useCallback(() => {
    setSnapshots(() => {
      persistSnapshots([]);
      return [];
    });
  }, []);

  const exportSnapshot = useCallback((snapshot) => {
    if (typeof window === 'undefined' || typeof document === 'undefined' || !snapshot) {
      return;
    }

    const data = JSON.stringify(snapshot, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${snapshot.id || 'snapshot'}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    URL.revokeObjectURL(url);
  }, []);

  const sortedSnapshots = useMemo(() => {
    return [...snapshots].sort((a, b) => {
      const left = new Date(a.savedAt).getTime();
      const right = new Date(b.savedAt).getTime();
      if (Number.isNaN(left) || Number.isNaN(right)) {
        return 0;
      }
      return right - left;
    });
  }, [snapshots]);

  return {
    snapshots: sortedSnapshots,
    saveSnapshot,
    deleteSnapshot,
    clearSnapshots,
    exportSnapshot
  };
};

