import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import AppLayout from './layouts/AppLayout';
import { OfflineStatusBar } from './components/ui/OfflineStatusBar';
import { LoaderOne } from './components/ui/loader';
import { OrganizationAuthGuard } from './components/auth/OrganizationAuthGuard';

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
const OrganizationLogin = lazy(() => import('./pages/OrganizationLogin').then(module => ({ default: module.OrganizationLogin })));
const UserHome = lazy(() => import('./pages/UserHome'));
const UserMap = lazy(() => import('./pages/UserMap'));
const UserAlerts = lazy(() => import('./pages/UserAlerts'));
const UserHelp = lazy(() => import('./pages/UserHelp'));
const UserPrepare = lazy(() => import('./pages/UserPrepare'));
const UserWelcome = lazy(() => import('./pages/UserWelcome'));
const UserSignup = lazy(() => import('./pages/UserSignup'));
const UserLogin = lazy(() => import('./pages/UserLogin'));
const UserSettings = lazy(() => import('./pages/UserSettings'));

const prefetchRoutes = () => {
  // Preload key chunks in the background so transitions are instant
  import('./pages/Home').catch(() => {});
  import('./pages/Alerts').catch(() => {});
  import('./pages/EarlyWarning').catch(() => {});
  import('./pages/DisasterMap').catch(() => {});
  import('./pages/LiveTelemetry').catch(() => {});
  import('./pages/Reports').catch(() => {});
  import('./pages/ReportIncident').catch(() => {});
  import('./pages/VolunteerDashboard').catch(() => {});
  import('./pages/Settings').catch(() => {});
  import('./pages/OrganizationLogin').catch(() => {});
  import('./pages/UserHome').catch(() => {});
  import('./pages/UserMap').catch(() => {});
  import('./pages/UserAlerts').catch(() => {});
  import('./pages/UserHelp').catch(() => {});
  import('./pages/UserPrepare').catch(() => {});
  import('./pages/UserWelcome').catch(() => {});
  import('./pages/UserSignup').catch(() => {});
  import('./pages/UserLogin').catch(() => {});
  import('./pages/UserSettings').catch(() => {});
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
          {/* Landing Page (Accessible on all devices: Desktop & Mobile) */}
          <Route path="/" element={<Landing />} />
          <Route path="/landing" element={<Landing />} />

          {/* Organization Authentication Gate (Strictly Login-Only: No public signup/guest) */}
          <Route path="/organization-login" element={<OrganizationLogin />} />
          <Route path="/app/login" element={<OrganizationLogin />} />

          {/* Citizen / User Mode Routes (Mobile & Citizen Safety Interface) */}
          <Route path="/user/welcome" element={<UserWelcome />} />
          <Route path="/user/auth" element={<UserWelcome />} />
          <Route path="/user/signup" element={<UserSignup />} />
          <Route path="/user/create-account" element={<UserSignup />} />
          <Route path="/user/login" element={<UserLogin />} />
          <Route path="/user/settings" element={<UserSettings />} />
          <Route path="/user" element={<UserHome />} />
          <Route path="/user/map" element={<UserMap />} />
          <Route path="/user/alerts" element={<UserAlerts />} />
          <Route path="/user/report" element={<ReportIncident />} />
          <Route path="/user/help" element={<UserHelp />} />
          <Route path="/user/prepare" element={<UserPrepare />} />
          
          {/* Organization Mode Routes (Desktop Command Center - Protected by OrganizationAuthGuard) */}
          <Route
            path="/app"
            element={
              <OrganizationAuthGuard>
                <AppLayout />
              </OrganizationAuthGuard>
            }
          >
            <Route index element={<Home />} />
            <Route path="alerts" element={<Alerts />} />
            <Route path="early-warning" element={<EarlyWarning />} />
            <Route path="map" element={<DisasterMap />} />
            <Route path="telemetry" element={<LiveTelemetry />} />
            <Route path="reports" element={<Reports />} />
            <Route path="report" element={<Navigate to="/app/reports" replace />} />
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
