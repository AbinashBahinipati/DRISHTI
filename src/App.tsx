import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import AppLayout from './layouts/AppLayout';
import { OfflineStatusBar } from './components/ui/OfflineStatusBar';
import { LoaderOne } from './components/ui/loader';

// Lazy loaded routes
const Home = lazy(() => import('./pages/Home'));
const PlaceholderModule = lazy(() => import('./pages/PlaceholderModule'));
const Alerts = lazy(() => import('./pages/Alerts').then(module => ({ default: module.Alerts })));
const EarlyWarning = lazy(() => import('./pages/EarlyWarning'));
const DisasterMap = lazy(() => import('./pages/DisasterMap').then(module => ({ default: module.DisasterMap })));
const LiveTelemetry = lazy(() => import('./pages/LiveTelemetry').then(module => ({ default: module.LiveTelemetry })));
const Reports = lazy(() => import('./pages/Reports').then(module => ({ default: module.Reports })));
const ReportIncident = lazy(() => import('./pages/ReportIncident').then(module => ({ default: module.ReportIncident })));
const VolunteerDashboard = lazy(() => import('./pages/VolunteerDashboard').then(module => ({ default: module.VolunteerDashboard })));
const SettingsDashboard = lazy(() => import('./pages/Settings').then(module => ({ default: module.SettingsDashboard })));
const UserHome = lazy(() => import('./pages/UserHome'));
const UserMap = lazy(() => import('./pages/UserMap'));
const UserAlerts = lazy(() => import('./pages/UserAlerts'));
const UserHelp = lazy(() => import('./pages/UserHelp'));
const UserPrepare = lazy(() => import('./pages/UserPrepare'));

const prefetchRoutes = () => {
  // Preload all chunks in the background so transitions are instant
  // Added catch to prevent unhandled promise rejections if chunk fails to load
  import('./pages/Home').catch(() => {});
  import('./pages/Alerts').catch(() => {});
  import('./pages/EarlyWarning').catch(() => {});
  import('./pages/DisasterMap').catch(() => {});
  import('./pages/LiveTelemetry').catch(() => {});
  import('./pages/Reports').catch(() => {});
  import('./pages/ReportIncident').catch(() => {});
  import('./pages/VolunteerDashboard').catch(() => {});
  import('./pages/Settings').catch(() => {});
  import('./pages/PlaceholderModule').catch(() => {});
  import('./pages/UserHome').catch(() => {});
  import('./pages/UserMap').catch(() => {});
  import('./pages/UserAlerts').catch(() => {});
  import('./pages/UserHelp').catch(() => {});
  import('./pages/UserPrepare').catch(() => {});
};

const App: React.FC = () => {
  useEffect(() => {
    // Prefetch after initial paint to not block main thread
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(prefetchRoutes, { timeout: 2000 });
    } else {
      setTimeout(prefetchRoutes, 500);
    }
  }, []);

  return (
    <BrowserRouter>
      <OfflineStatusBar />
      <Suspense fallback={
        <div className="flex items-center justify-center h-screen bg-bg">
          <LoaderOne />
        </div>
      }>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/user" element={<UserHome />} />
          <Route path="/user/map" element={<UserMap />} />
          <Route path="/user/alerts" element={<UserAlerts />} />
          <Route path="/user/help" element={<UserHelp />} />
          <Route path="/user/prepare" element={<UserPrepare />} />
          
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Home />} />
            <Route path="alerts" element={<Alerts />} />
            <Route path="early-warning" element={<EarlyWarning />} />
            <Route path="map" element={<DisasterMap />} />
            <Route path="telemetry" element={<LiveTelemetry />} />
            <Route path="reports" element={<Reports />} />
            <Route path="report" element={<ReportIncident />} />
            <Route path="volunteer" element={<VolunteerDashboard />} />
            <Route path="notifications" element={<PlaceholderModule />} />
            <Route path="settings" element={<SettingsDashboard />} />
            
            {/* Catch-all redirect to /app */}
            <Route path="*" element={<Navigate to="/app" replace />} />
          </Route>
          
          {/* Global Catch-all redirect to / */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default App;
