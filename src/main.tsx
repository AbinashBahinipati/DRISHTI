/// <reference types="vite-plugin-pwa/client" />
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

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
