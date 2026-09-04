/// <reference types="vite-plugin-pwa/client" />
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Initialize Theme (Default: system preference)
try {
  const cached = localStorage.getItem('drishti_settings_v1');
  const themeSetting = cached ? JSON.parse(cached).theme || 'system' : 'system';
  const isDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const resolvedTheme = themeSetting === 'system' ? (isDark ? 'dark' : 'light') : themeSetting;
  document.documentElement.setAttribute('data-theme', resolvedTheme);
  document.documentElement.classList.remove('light', 'dark');
  document.documentElement.classList.add(resolvedTheme);
} catch {
  const isDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const fallback = isDark ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', fallback);
  document.documentElement.classList.remove('light', 'dark');
  document.documentElement.classList.add(fallback);
}

// Register Service Worker in production for offline PWA caching
if (!import.meta.env.DEV && 'serviceWorker' in navigator) {
  registerSW({ immediate: true });
} else if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  // Unregister stale service workers in development to ensure instant updates
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
