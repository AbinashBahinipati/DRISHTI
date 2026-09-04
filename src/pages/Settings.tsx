import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Bell, MapPin, Shield,
  Activity, AlertTriangle, Trash2,
  Cloud, CloudOff, CheckCircle2, XCircle,
  Sun, Moon, Palette, Monitor
} from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { useSystemStatus } from '../hooks/useSystemStatus';
import { useLocation } from '../hooks/useLocation';
import { useReports } from '../hooks/useReports';
import '../styles/Settings.css';

type SettingsTab = 'identity' | 'appearance' | 'alerts' | 'location' | 'system' | 'privacy';

export const SettingsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SettingsTab>('identity');
  const [showClearModal, setShowClearModal] = useState(false);

  const { settings, updateTheme, updateAlertRadius, toggleAlertPreference, clearAllData } = useSettings();
  const { isOnline, notificationPermission, requestNotificationPermission, storage, serviceWorkerActive } = useSystemStatus();
  const { location, requestLocation } = useLocation();
  const { reports } = useReports();

  const pendingReportsCount = reports.filter(r => r.status === 'PendingSync').length;

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'identity':
        return (
          <div className="settings-section">
            <div className="section-header">
              <h2 className="section-title">OPERATOR & STATION IDENTITY</h2>
              <p className="section-desc">Authorized emergency operations coordinator credentials and station parameters.</p>
            </div>

            <div className="settings-card flex flex-col gap-6">
              {/* Operator Node Profile Card */}
              <div className="operator-profile-box">
                <div className="operator-avatar-badge">
                  <Shield size={28} className="text-blue-500" />
                </div>
                <div className="operator-profile-details">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="operator-title">DRISHTI Command Node</h3>
                    <span className="operator-status-badge">
                      <span className="status-dot-pulse" />
                      Authorized Operator
                    </span>
                  </div>
                  <p className="operator-subtitle">
                    Emergency Operations Center • Multi-Agency Disaster Response & Early Warning Dispatch
                  </p>
                </div>
              </div>

              {/* Station Parameters Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="station-param-card">
                  <span className="station-param-label">Operational Role</span>
                  <span className="station-param-value">Emergency Verification & Dispatch Lead</span>
                </div>
                <div className="station-param-card">
                  <span className="station-param-label">Station Jurisdiction</span>
                  <span className="station-param-value">
                    {location.coords ? `${location.coords.latitude.toFixed(4)}°N, ${location.coords.longitude.toFixed(4)}°E` : 'Command Operations District'}
                  </span>
                </div>
                <div className="station-param-card">
                  <span className="station-param-label">Access Clearance</span>
                  <span className="station-param-value">Level 3 Multi-Hazard Intelligence</span>
                </div>
                <div className="station-param-card">
                  <span className="station-param-label">Active Network Sync</span>
                  <span className={`station-param-value ${isOnline ? 'text-success' : 'text-warning'}`}>
                    {isOnline ? 'Live Mesh & Cloud Telemetry' : 'Local Offline Cache Mode'}
                  </span>
                </div>
              </div>

              {/* Quick Operational Navigation */}
              <div className="border-t border-border pt-5">
                <span className="text-xs font-bold text-text-secondary uppercase tracking-wider block mb-3">
                  Operational Control Feeds
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <button className="settings-btn primary" onClick={() => navigate('/app/early-warning')}>
                    Early Warning →
                  </button>
                  <button className="settings-btn secondary" onClick={() => navigate('/app/reports')}>
                    Incident Queue →
                  </button>
                  <button className="settings-btn secondary" onClick={() => navigate('/app/volunteer')}>
                    Volunteer Hub →
                  </button>
                  <button className="settings-btn secondary" onClick={() => navigate('/app/map')}>
                    Disaster Map →
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      case 'appearance':
        return (
          <div className="settings-section">
            <div className="section-header">
              <h2 className="section-title">APPEARANCE & THEME</h2>
              <p className="section-desc">Select your preferred interface theme across DRISHTI.</p>
            </div>

            <div className="settings-card flex flex-col gap-4">
              <div className="row-label mb-2">
                <span className="row-title">Global Theme</span>
                <span className="row-desc">Automatically synchronize with your operating system or select a manual theme.</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div
                  className={`role-option ${settings.theme === 'system' ? 'selected' : ''}`}
                  onClick={() => updateTheme('system')}
                  style={{ cursor: 'pointer', padding: '16px', borderRadius: '12px' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="role-option-title flex items-center gap-2 font-bold text-text">
                      <Monitor size={18} className="text-blue-500" /> System Default
                    </div>
                    {settings.theme === 'system' && <CheckCircle2 size={18} className="text-accent" />}
                  </div>
                  <p className="role-option-desc text-xs text-text-secondary">
                    Automatically adapts to your device / OS theme settings (Light or Dark).
                  </p>
                </div>

                <div
                  className={`role-option ${settings.theme === 'light' ? 'selected' : ''}`}
                  onClick={() => updateTheme('light')}
                  style={{ cursor: 'pointer', padding: '16px', borderRadius: '12px' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="role-option-title flex items-center gap-2 font-bold text-text">
                      <Sun size={18} className="text-amber-500" /> Light Mode
                    </div>
                    {settings.theme === 'light' && <CheckCircle2 size={18} className="text-accent" />}
                  </div>
                  <p className="role-option-desc text-xs text-text-secondary">
                    Crisp, clean operational palette with high readability for command room daylight operations.
                  </p>
                </div>

                <div
                  className={`role-option ${settings.theme === 'dark' ? 'selected' : ''}`}
                  onClick={() => updateTheme('dark')}
                  style={{ cursor: 'pointer', padding: '16px', borderRadius: '12px' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="role-option-title flex items-center gap-2 font-bold text-text">
                      <Moon size={18} className="text-indigo-400" /> Dark Mode
                    </div>
                    {settings.theme === 'dark' && <CheckCircle2 size={18} className="text-accent" />}
                  </div>
                  <p className="role-option-desc text-xs text-text-secondary">
                    Tactical dark surface theme with high-contrast indicator highlights for low-light command centers.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      case 'alerts':
        return (
          <div className="settings-section">
            <div className="section-header">
              <h2 className="section-title">ALERT PREFERENCES</h2>
              <p className="section-desc">Configure the types of alerts DRISHTI delivers.</p>
            </div>

            <div className="settings-card flex flex-col gap-0">
              <div className="settings-row">
                <div className="row-label">
                  <span className="row-title">Notification Permission</span>
                  <span className="row-desc">
                    {notificationPermission === 'granted' ? 'Allowed' :
                      notificationPermission === 'denied' ? 'Denied' : 'Not requested'}
                  </span>
                </div>
                {notificationPermission !== 'granted' && (
                  <button className="settings-btn primary py-1" onClick={requestNotificationPermission}>
                    Enable
                  </button>
                )}
                {notificationPermission === 'denied' && (
                  <span className="text-xs text-danger font-bold">Blocked in browser</span>
                )}
              </div>
            </div>

            <div className="settings-card flex flex-col gap-0 mt-4">
              {[
                { key: 'critical', label: 'Critical Disaster Alerts', desc: 'Immediate threat to life or property' },
                { key: 'weather', label: 'Weather Alerts', desc: 'Severe weather developments' },
                { key: 'flood', label: 'Flood Alerts', desc: 'Rising water levels in your area' },
                { key: 'cyclone', label: 'Cyclone Alerts', desc: 'Storm tracking and warnings' },
                { key: 'nearby', label: 'Nearby Incident Alerts', desc: 'Community reported emergencies near you' },
                { key: 'updates', label: 'Emergency Updates', desc: 'General system broadcasts' },
              ].map(pref => (
                <div className="settings-row" key={pref.key}>
                  <div className="row-label">
                    <span className="row-title">{pref.label}</span>
                    <span className="row-desc">{pref.desc}</span>
                  </div>
                  <div
                    className={`toggle-switch ${settings.alertPreferences[pref.key as keyof typeof settings.alertPreferences] ? 'active' : ''}`}
                    onClick={() => toggleAlertPreference(pref.key as keyof typeof settings.alertPreferences)}
                  >
                    <div className="toggle-knob" />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <h3 className="section-title text-sm mb-4">ALERT AREA</h3>
              <p className="text-sm text-text-secondary mb-4">DRISHTI can use this area to prioritize location-relevant disaster information.</p>
              <select
                className="settings-select w-full max-w-xs"
                value={settings.alertRadiusKm}
                onChange={e => updateAlertRadius(Number(e.target.value))}
              >
                <option value={10}>10 km</option>
                <option value={25}>25 km</option>
                <option value={50}>50 km</option>
                <option value={100}>100 km</option>
              </select>
            </div>
          </div>
        );
      case 'location':
        return (
          <div className="settings-section">
            <div className="section-header">
              <h2 className="section-title">LOCATION & SAFETY</h2>
              <p className="section-desc">Manage location access for nearby resources and alerts.</p>
            </div>

            <div className="settings-card">
              <div className="flex flex-col gap-4">
                <div>
                  <span className="text-xs font-bold text-text-secondary uppercase tracking-widest block mb-1">Status</span>
                  <span className={`font-bold flex items-center gap-2 ${location.coords ? 'text-success' : 'text-warning'}`}>
                    {location.coords ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                    {location.coords ? 'Location Detected' : 'Location Unavailable'}
                  </span>
                </div>

                {location.coords && (
                  <div className="grid grid-cols-2 gap-4 bg-black/20 p-4 rounded-md border border-border">
                    <div>
                      <span className="text-xs font-bold text-text-secondary uppercase tracking-widest block mb-1">Latitude</span>
                      <span className="font-mono text-sm">{location.coords.latitude.toFixed(6)}</span>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-text-secondary uppercase tracking-widest block mb-1">Longitude</span>
                      <span className="font-mono text-sm">{location.coords.longitude.toFixed(6)}</span>
                    </div>
                    {location.coords.accuracy && (
                      <div className="col-span-2">
                        <span className="text-xs font-bold text-text-secondary uppercase tracking-widest block mb-1">Accuracy</span>
                        <span className="font-mono text-sm">~ {location.coords.accuracy.toFixed(0)} meters</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-4 mt-2">
                  <button className="settings-btn primary flex-1" onClick={requestLocation}>
                    Update Location
                  </button>
                  <button className="settings-btn secondary flex-1" onClick={() => alert('Location permissions are managed by your browser settings.')}>
                    Manage Permission
                  </button>
                </div>

                {location.error && (
                  <p className="text-xs text-danger mt-2">{location.error}</p>
                )}
              </div>
            </div>
          </div>
        );
      case 'system':
        return (
          <div className="settings-section">
            <div className="section-header">
              <h2 className="section-title">SYSTEM STATUS</h2>
              <p className="section-desc">Health and connectivity metrics for the DRISHTI platform.</p>
            </div>

            <div className="metric-grid">
              <div className="metric-card">
                <span className="metric-label">Internet</span>
                <span className={`metric-value ${isOnline ? 'online' : 'offline'}`}>
                  {isOnline ? <Cloud size={16} /> : <CloudOff size={16} />}
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              <div className="metric-card">
                <span className="metric-label">Location API</span>
                <span className={`metric-value ${location.coords ? 'online' : 'offline'}`}>
                  {location.coords ? <MapPin size={16} /> : <XCircle size={16} />}
                  {location.coords ? 'Available' : 'Unavailable'}
                </span>
              </div>
              <div className="metric-card">
                <span className="metric-label">Service Worker</span>
                <span className={`metric-value ${serviceWorkerActive ? 'online' : 'offline'}`}>
                  {serviceWorkerActive ? <Activity size={16} /> : <AlertTriangle size={16} />}
                  {serviceWorkerActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="metric-card">
                <span className="metric-label">Push Notifications</span>
                <span className={`metric-value ${notificationPermission === 'granted' ? 'online' : 'offline'}`}>
                  {notificationPermission === 'granted' ? <Bell size={16} /> : <Bell size={16} />}
                  {notificationPermission === 'granted' ? 'Allowed' : 'Denied/Not Requested'}
                </span>
              </div>
            </div>

            <div className="mt-4">
              <h3 className="section-title text-sm mb-4">OFFLINE READINESS</h3>
              <div className="settings-card flex flex-col gap-0">
                <div className="settings-row">
                  <div className="row-label">
                    <span className="row-title">Pending Reports</span>
                    <span className="row-desc">Waiting to synchronize with server</span>
                  </div>
                  <span className={`font-bold ${pendingReportsCount > 0 ? 'text-warning' : 'text-success'}`}>
                    {pendingReportsCount}
                  </span>
                </div>
                <div className="settings-row">
                  <div className="row-label">
                    <span className="row-title">Local Storage Usage</span>
                    <span className="row-desc">Cached incident and intelligence data</span>
                  </div>
                  <span className="font-mono text-sm">
                    {storage.supported ? `${formatBytes(storage.usage)} / ${formatBytes(storage.quota)}` : 'Unknown'}
                  </span>
                </div>
              </div>
              {!isOnline && (
                <div className="mt-4 p-3 bg-warning/10 border border-warning/20 rounded-md text-xs text-warning flex items-start gap-2">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <p>DRISHTI is currently offline. You are using locally cached information. Reports and status updates will be synchronized when connectivity is restored.</p>
                </div>
              )}
            </div>

            <div className="mt-4">
              <h3 className="section-title text-sm mb-4">DATA SOURCES</h3>
              <div className="settings-card flex flex-col gap-0">
                <div className="settings-row">
                  <div className="row-label">
                    <span className="row-title">Weather & Environment</span>
                    <span className="row-desc font-mono mt-1 text-[10px]">open-meteo.com</span>
                  </div>
                  <span className="text-xs font-bold text-success">Connected</span>
                </div>
                <div className="settings-row">
                  <div className="row-label">
                    <span className="row-title">Infrastructure & Maps</span>
                    <span className="row-desc font-mono mt-1 text-[10px]">openstreetmap.org / overpass-api.de</span>
                  </div>
                  <span className="text-xs font-bold text-success">Connected</span>
                </div>
                <div className="settings-row">
                  <div className="row-label">
                    <span className="row-title">Geolocation</span>
                    <span className="row-desc font-mono mt-1 text-[10px]">Browser API</span>
                  </div>
                  <span className={`text-xs font-bold ${location.coords ? 'text-success' : 'text-warning'}`}>
                    {location.coords ? 'Available' : 'Unavailable'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 text-center">
              <span className="text-[10px] text-text-muted">DRISHTI v1.0.0 (Build 824)</span>
            </div>
          </div>
        );
      case 'privacy':
        return (
          <div className="settings-section">
            <div className="section-header">
              <h2 className="section-title">PRIVACY & DATA</h2>
              <p className="section-desc">How DRISHTI manages your information.</p>
            </div>

            <div className="settings-card flex flex-col gap-4 text-sm text-text-secondary leading-relaxed">
              <div>
                <strong className="text-text block mb-1">Location</strong>
                Used to provide location-aware alerts, nearby resources, and navigation. Your exact location is never broadcasted publicly unless attached to an Incident Report.
              </div>
              <div>
                <strong className="text-text block mb-1">Incident Reports</strong>
                Reports submitted to the community may include your location, provided description, and uploaded evidence.
              </div>
              <div>
                <strong className="text-text block mb-1">Notifications</strong>
                Used to deliver disaster-related alerts when permission is granted by your browser.
              </div>
            </div>

            <div className="mt-8 border-t border-border pt-6">
              <h3 className="section-title text-sm mb-4 text-danger flex items-center gap-2">
                <Trash2 size={16} /> DANGER ZONE
              </h3>
              <p className="text-sm text-text-secondary mb-4">
                Clearing local data will remove all cached intelligence, offline map resources, and pending reports from this device.
              </p>
              <button className="settings-btn danger" onClick={() => setShowClearModal(true)}>
                Clear Cached Data
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="settings-container">
      <header className="settings-header">
        <div>
          <h1 className="settings-title">PROFILE & SETTINGS</h1>
          <p className="settings-subtitle">Manage your DRISHTI identity, alerts, location and preferences.</p>
        </div>
        <div className={`system-status-badge ${isOnline ? '' : 'offline'}`}>
          {isOnline ? '● DRISHTI SYSTEM ONLINE' : '○ OFFLINE MODE'}
        </div>
      </header>

      <div className="settings-content">
        <aside className="settings-nav">
          <button className={`settings-nav-item ${activeTab === 'identity' ? 'active' : ''}`} onClick={() => setActiveTab('identity')}>
            <User size={18} /> <span>Identity</span>
          </button>
          <button className={`settings-nav-item ${activeTab === 'appearance' ? 'active' : ''}`} onClick={() => setActiveTab('appearance')}>
            <Palette size={18} /> <span>Appearance</span>
          </button>
          <button className={`settings-nav-item ${activeTab === 'alerts' ? 'active' : ''}`} onClick={() => setActiveTab('alerts')}>
            <Bell size={18} /> <span>Alerts</span>
          </button>
          <button className={`settings-nav-item ${activeTab === 'location' ? 'active' : ''}`} onClick={() => setActiveTab('location')}>
            <MapPin size={18} /> <span>Location</span>
          </button>
          <button className={`settings-nav-item ${activeTab === 'system' ? 'active' : ''}`} onClick={() => setActiveTab('system')}>
            <Activity size={18} /> <span>System & Data</span>
          </button>
          <button className={`settings-nav-item ${activeTab === 'privacy' ? 'active' : ''}`} onClick={() => setActiveTab('privacy')}>
            <Shield size={18} /> <span>Privacy</span>
          </button>
        </aside>

        <main className="settings-panel">
          {renderContent()}
        </main>
      </div>

      <AnimatePresence>
        {showClearModal && (
          <div className="modal-overlay">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="modal-content"
            >
              <h2 className="modal-title"><AlertTriangle size={24} /> CLEAR LOCAL DATA?</h2>
              <p className="modal-desc">
                This will remove locally cached intelligence and offline data from this device.
              </p>
              {pendingReportsCount > 0 && (
                <div className="p-3 bg-danger/10 border border-danger/20 rounded-md text-xs text-danger">
                  <strong>WARNING:</strong> You have {pendingReportsCount} report(s) waiting to synchronize. Clearing data will permanently delete them.
                </div>
              )}
              <div className="modal-actions">
                <button className="settings-btn secondary" onClick={() => setShowClearModal(false)}>Cancel</button>
                <button className="settings-btn danger" onClick={clearAllData}>Confirm & Clear</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
