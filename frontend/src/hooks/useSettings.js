import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { appConfig } from '../config';

const SettingsContext = createContext(undefined);
const STORAGE_KEY = 'monitoring.settings.v1';

const clampRetentionDays = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return appConfig.defaultRetentionDays;
  }
  return Math.max(1, Math.min(30, Math.round(numeric)));
};

const defaultSettings = {
  retentionDays: appConfig.defaultRetentionDays
};

const readStoredSettings = () => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return defaultSettings;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultSettings;
    }
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return defaultSettings;
    }
    return {
      retentionDays: clampRetentionDays(parsed.retentionDays)
    };
  } catch (error) {
    return defaultSettings;
  }
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => readStoredSettings());

  useEffect(() => {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateSetting = useCallback((key, value) => {
    setSettings((previous) => {
      const nextValue = key === 'retentionDays' ? clampRetentionDays(value) : value;
      if (previous[key] === nextValue) {
        return previous;
      }
      return { ...previous, [key]: nextValue };
    });
  }, []);

  const retentionSeconds = useMemo(() => {
    return Math.max(1, settings.retentionDays) * 24 * 60 * 60;
  }, [settings.retentionDays]);

  const contextValue = useMemo(
    () => ({
      settings,
      retentionSeconds,
      retentionDays: settings.retentionDays,
      updateSetting
    }),
    [settings, retentionSeconds, updateSetting]
  );

  return <SettingsContext.Provider value={contextValue}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

