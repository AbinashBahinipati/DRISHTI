import { useState, useEffect } from 'react';

const SETTINGS_STORAGE_KEY = 'drishti_settings_v1';

export type UserRole = 'citizen' | 'volunteer' | 'authorized_reviewer';

export interface AlertPreferences {
  critical: boolean;
  weather: boolean;
  flood: boolean;
  cyclone: boolean;
  updates: boolean;
  nearby: boolean;
}

export type ThemeMode = 'system' | 'light' | 'dark';

export interface UserSettings {
  role: UserRole;
  alertRadiusKm: number;
  alertPreferences: AlertPreferences;
  theme: ThemeMode;
}

const DEFAULT_SETTINGS: UserSettings = {
  role: 'citizen',
  alertRadiusKm: 25,
  theme: 'system',
  alertPreferences: {
    critical: true,
    weather: true,
    flood: true,
    cyclone: true,
    updates: false,
    nearby: true
  }
};

const getResolvedTheme = (mode: ThemeMode): 'light' | 'dark' => {
  if (mode === 'system') {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  }
  return mode;
};

export const useSettings = () => {
  const [settings, setSettings] = useState<UserSettings>(() => {
    try {
      const cached = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch {}
    return DEFAULT_SETTINGS;
  });

  // Apply data-theme to root element & react to system theme changes
  useEffect(() => {
    const applyCurrentTheme = () => {
      const currentTheme = settings.theme || 'system';
      const resolved = getResolvedTheme(currentTheme);
      document.documentElement.setAttribute('data-theme', resolved);
      document.body.setAttribute('data-theme', resolved);
      if (resolved === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
        document.body.classList.add('dark');
        document.body.classList.remove('light');
      } else {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
        document.body.classList.add('light');
        document.body.classList.remove('dark');
      }
    };

    applyCurrentTheme();

    // Listen for OS theme changes when in 'system' mode
    if (settings.theme === 'system' && typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleSystemChange = () => {
        applyCurrentTheme();
      };
      mediaQuery.addEventListener('change', handleSystemChange);
      return () => mediaQuery.removeEventListener('change', handleSystemChange);
    }
  }, [settings.theme]);

  // Listen for global settings changes from other components/tabs
  useEffect(() => {
    const handleSettingsChanged = () => {
      try {
        const cached = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          setSettings(prev => ({ ...prev, ...parsed }));
        }
      } catch {}
    };

    window.addEventListener('drishti-settings-changed', handleSettingsChanged);
    window.addEventListener('storage', handleSettingsChanged);

    return () => {
      window.removeEventListener('drishti-settings-changed', handleSettingsChanged);
      window.removeEventListener('storage', handleSettingsChanged);
    };
  }, []);

  // Save to local storage
  useEffect(() => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateRole = (role: UserRole) => {
    const updated = { ...settings, role };
    setSettings(updated);
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('drishti-settings-changed', { detail: updated }));
  };

  const updateTheme = (theme: ThemeMode) => {
    const updated = { ...settings, theme };
    setSettings(updated);
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));

    const resolved = getResolvedTheme(theme);
    document.documentElement.setAttribute('data-theme', resolved);
    document.body.setAttribute('data-theme', resolved);
    if (resolved === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      document.body.classList.add('dark');
      document.body.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
      document.body.classList.add('light');
      document.body.classList.remove('dark');
    }

    window.dispatchEvent(new CustomEvent('drishti-settings-changed', { detail: updated }));
  };

  const updateAlertRadius = (radius: number) => {
    setSettings(prev => ({ ...prev, alertRadiusKm: radius }));
  };

  const toggleAlertPreference = (key: keyof AlertPreferences) => {
    setSettings(prev => ({
      ...prev,
      alertPreferences: {
        ...prev.alertPreferences,
        [key]: !prev.alertPreferences[key]
      }
    }));
  };

  const clearAllData = () => {
    localStorage.clear();
    window.location.reload();
  };

  return {
    settings,
    updateRole,
    updateTheme,
    updateAlertRadius,
    toggleAlertPreference,
    clearAllData
  };
};
