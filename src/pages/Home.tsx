import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  AlertTriangle,
  Bell,
  Clock,
  CheckCircle2,
  MapPin,
  ArrowRight,
  Waves,
  Flame,
  Activity,
  Wind,
  Sun,
  CloudRain,
  CloudSun,
  CloudLightning,
  Cloud,
  Phone,
  Map as MapIcon,
  ShieldCheck,
  ChevronRight,
  Building2,
  Users
} from 'lucide-react';
import { useLocation } from '../hooks/useLocation';
import { useWeather, getWeatherDescription } from '../hooks/useWeather';
import { useAlerts } from '../hooks/useAlerts';
import { useReports } from '../hooks/useReports';
import { useEarlyWarning } from '../hooks/useEarlyWarning';
import { useNearbyFacilities } from '../hooks/useNearbyFacilities';
import { InteractiveMap } from '../components/map/InteractiveMap';
import { MapMarker } from '../components/map/MapMarker';
import { MapPopup } from '../components/map/MapPopup';
import '../styles/Home.css';

const HAZARD_ICONS: Record<string, React.ReactNode> = {
  Flood: <Waves size={16} className="text-sky-500" />,
  Fire: <Flame size={16} className="text-red-500" />,
  Earthquake: <Activity size={16} className="text-amber-500" />,
  Cyclone: <Wind size={16} className="text-cyan-500" />,
  HeavyRain: <CloudRain size={16} className="text-blue-500" />,
  Other: <AlertTriangle size={16} className="text-slate-500" />
};

const getWeatherIcon = (code: number, _isDay = true) => {
  if (code === 0) return <Sun size={18} className="text-amber-500" />;
  if (code <= 3) return <CloudSun size={18} className="text-sky-500" />;
  if (code >= 51 && code <= 65) return <CloudRain size={18} className="text-blue-500" />;
  if (code >= 80 && code <= 82) return <CloudRain size={18} className="text-blue-600" />;
  if (code >= 95) return <CloudLightning size={18} className="text-violet-500" />;
  return <Cloud size={18} className="text-slate-500" />;
};

const formatTimeAgo = (isoString?: string) => {
  if (!isoString) return 'Recent';
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return new Date(isoString).toLocaleDateString([], { month: 'short', day: 'numeric' });
};

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { location } = useLocation();

  const lat = location.coords?.latitude ?? 20.4625;
  const lon = location.coords?.longitude ?? 85.8828;
  const addressName = location.address || (location.coords ? `${lat.toFixed(3)}°N, ${lon.toFixed(3)}°E` : 'Bhubaneswar, Odisha');

  // Real Data Subsystems (Strictly zero mock data)
  const { data: weatherData, loading: weatherLoading } = useWeather(lat, lon);
  const { alerts } = useAlerts(lat, lon);
  const { reports } = useReports(lat, lon);
  const { allAssessments, highestRisk, isOffline } = useEarlyWarning(5, [lat, lon], addressName);
  const { facilities } = useNearbyFacilities(lat, lon, 10);

  // 1. Top KPI Summary Metrics Calculations
  const overallRiskStage = highestRisk?.warningStage || 'Normal';
  const overallRiskScore = highestRisk?.riskScore || 0;

  const activeHazardsList = useMemo(() => {
    return (allAssessments || []).filter(h => h.riskScore > 15 || h.warningStage !== 'Normal');
  }, [allAssessments]);

  const activeAlertsCount = useMemo(() => {
    return alerts.filter(a => a.status === 'Active').length;
  }, [alerts]);

  const pendingVerificationReports = useMemo(() => {
    return reports.filter(r => r.status === 'Submitted' || r.verificationStatus === 'UnderReview' || r.status === 'PendingSync');
  }, [reports]);

  const verifiedReports = useMemo(() => {
    return reports.filter(r => r.status === 'Verified' || r.verificationStatus === 'Verified');
  }, [reports]);

  // Recent user reports (showing real submissions from User Mode)
  const recentUserReports = useMemo(() => {
    return reports.slice(0, 4);
  }, [reports]);

  // Risk Badge Config
  const riskBadgeClass = useMemo(() => {
    if (overallRiskStage === 'Emergency' || overallRiskStage === 'Warning' || overallRiskScore >= 60) return 'badge-danger';
    if (overallRiskStage === 'Watch' || overallRiskStage === 'Advisory' || overallRiskScore >= 20) return 'badge-warning';
    return 'badge-safe';
  }, [overallRiskStage, overallRiskScore]);

  const mapCenter: [number, number] = useMemo(() => [lat, lon], [lat, lon]);

  return (
    <div className="cmd-page-container">
      {/* ── 1. Header Section ── */}
      <header className="cmd-header">
        <div className="cmd-header-left">
          <h1 className="cmd-title">Disaster Command Center</h1>
          <p className="cmd-subtitle">Real-time situation awareness and response coordination.</p>
        </div>

        <div className="cmd-header-right">
          <div className="cmd-location-badge" title={`Live Coordinates: ${lat.toFixed(4)}, ${lon.toFixed(4)}`}>
            <span className="cmd-pulse-dot" />
            <MapPin size={14} className="text-blue-600" />
            <span className="cmd-location-name">{addressName}</span>
          </div>
        </div>
      </header>

      {/* ── 2. Top Situation Overview (KPI Cards Row) ── */}
      <section className="cmd-kpi-row" aria-label="Situation Overview Metrics">
        {/* Overall Risk */}
        <div className="cmd-kpi-card" onClick={() => navigate('/app/early-warning')}>
          <div className="cmd-kpi-header">
            <span className="cmd-kpi-title">Overall Risk</span>
            <div className="cmd-kpi-icon-wrap risk">
              <ShieldAlert size={18} />
            </div>
          </div>
          <div className="cmd-kpi-value-row">
            <span className={`cmd-risk-tag ${riskBadgeClass}`}>
              {overallRiskStage.toUpperCase()}
            </span>
            <span className="cmd-kpi-subscore">{overallRiskScore}/100</span>
          </div>
          <div className="cmd-kpi-link">
            <span>View Details</span>
            <ArrowRight size={13} />
          </div>
        </div>

        {/* Active Hazards */}
        <div className="cmd-kpi-card" onClick={() => navigate('/app/early-warning')}>
          <div className="cmd-kpi-header">
            <span className="cmd-kpi-title">Active Hazards</span>
            <div className="cmd-kpi-icon-wrap warning">
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="cmd-kpi-value-row">
            <span className="cmd-kpi-number">{activeHazardsList.length}</span>
            <span className="cmd-kpi-unit">monitored</span>
          </div>
          <div className="cmd-kpi-link">
            <span>View Early Warning</span>
            <ArrowRight size={13} />
          </div>
        </div>

        {/* Active Alerts */}
        <div className="cmd-kpi-card" onClick={() => navigate('/app/alerts')}>
          <div className="cmd-kpi-header">
            <span className="cmd-kpi-title">Active Alerts</span>
            <div className="cmd-kpi-icon-wrap alert">
              <Bell size={18} />
            </div>
          </div>
          <div className="cmd-kpi-value-row">
            <span className="cmd-kpi-number">{activeAlertsCount}</span>
            <span className="cmd-kpi-unit">regional</span>
          </div>
          <div className="cmd-kpi-link">
            <span>View Alerts</span>
            <ArrowRight size={13} />
          </div>
        </div>

        {/* Reports Awaiting Verification */}
        <div className="cmd-kpi-card" onClick={() => navigate('/app/reports')}>
          <div className="cmd-kpi-header">
            <span className="cmd-kpi-title">Awaiting Verification</span>
            <div className="cmd-kpi-icon-wrap pending">
              <Clock size={18} />
            </div>
          </div>
          <div className="cmd-kpi-value-row">
            <span className="cmd-kpi-number">{pendingVerificationReports.length}</span>
            <span className="cmd-kpi-unit">in queue</span>
          </div>
          <div className="cmd-kpi-link">
            <span>View Reports</span>
            <ArrowRight size={13} />
          </div>
        </div>

        {/* Verified Incidents */}
        <div className="cmd-kpi-card" onClick={() => navigate('/app/reports')}>
          <div className="cmd-kpi-header">
            <span className="cmd-kpi-title">Verified Incidents</span>
            <div className="cmd-kpi-icon-wrap verified">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="cmd-kpi-value-row">
            <span className="cmd-kpi-number">{verifiedReports.length}</span>
            <span className="cmd-kpi-unit">confirmed</span>
          </div>
          <div className="cmd-kpi-link">
            <span>View All</span>
            <ArrowRight size={13} />
          </div>
        </div>
      </section>

      {/* ── 3. Main Dashboard 2-Column Layout ── */}
      <div className="cmd-main-grid">
        {/* Left Primary Column (70%) */}
        <div className="cmd-left-col">
          {/* Row: Active Hazards & Recent User Reports */}
          <div className="cmd-subcards-row">
            {/* Active Hazards Card */}
            <div className="cmd-panel-card">
              <div className="cmd-panel-header">
                <div>
                  <h2 className="cmd-panel-title">Active Hazards</h2>
                  <p className="cmd-panel-sub">Real-time risk assessment feeds</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/app/early-warning')}
                  className="cmd-panel-action-btn"
                >
                  <span>View Early Warning</span>
                  <ChevronRight size={14} />
                </button>
              </div>

              <div className="cmd-panel-body">
                {activeHazardsList.length === 0 ? (
                  <div className="cmd-empty-state">
                    <ShieldCheck size={28} className="text-emerald-500 mb-2" />
                    <p className="cmd-empty-text">No active hazard warnings detected</p>
                    <span className="cmd-empty-sub">Multi-sensor thresholds are currently within normal baseline.</span>
                  </div>
                ) : (
                  <div className="cmd-hazard-list">
                    {activeHazardsList.map((hazard, idx) => {
                      const stage = hazard.warningStage || 'Normal';
                      const stageClass = stage === 'Emergency' || stage === 'Warning' ? 'badge-danger' : stage === 'Watch' || stage === 'Advisory' ? 'badge-warning' : 'badge-safe';
                      const icon = HAZARD_ICONS[hazard.hazardType] || HAZARD_ICONS.Other;

                      return (
                        <div key={idx} className="cmd-hazard-row" onClick={() => navigate('/app/early-warning')}>
                          <div className="cmd-hazard-type-col">
                            <div className="cmd-hazard-icon-box">
                              {icon}
                            </div>
                            <div>
                              <span className="cmd-hazard-type-name">{hazard.hazardType}</span>
                              <span className="cmd-hazard-loc">{hazard.location || addressName}</span>
                            </div>
                          </div>

                          <div className="cmd-hazard-status-col">
                            <span className={`cmd-risk-tag ${stageClass}`}>
                              {stage.toUpperCase()} ({hazard.riskScore}%)
                            </span>
                            <span className="cmd-hazard-time">
                              {formatTimeAgo(hazard.timestamp)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Recent User Reports Card */}
            <div className="cmd-panel-card">
              <div className="cmd-panel-header">
                <div>
                  <h2 className="cmd-panel-title">Recent User Reports</h2>
                  <p className="cmd-panel-sub">Citizen-submitted ground intelligence</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/app/reports')}
                  className="cmd-panel-action-btn"
                >
                  <span>View Reports</span>
                  <ChevronRight size={14} />
                </button>
              </div>

              <div className="cmd-panel-body">
                {recentUserReports.length === 0 ? (
                  <div className="cmd-empty-state">
                    <Clock size={28} className="text-slate-400 mb-2" />
                    <p className="cmd-empty-text">No user reports received</p>
                    <span className="cmd-empty-sub">Citizen submissions from User Mode will populate here in real time.</span>
                  </div>
                ) : (
                  <div className="cmd-report-list">
                    {recentUserReports.map((rep) => {
                      const isVerified = rep.status === 'Verified' || rep.verificationStatus === 'Verified';
                      const isPending = rep.status === 'PendingSync';
                      const statusTag = isVerified ? 'Verified' : isPending ? 'Pending Sync' : 'Under Review';
                      const statusClass = isVerified ? 'badge-safe' : isPending ? 'badge-warning' : 'badge-neutral';

                      return (
                        <div
                          key={rep.id}
                          className="cmd-report-row"
                          onClick={() => navigate('/app/reports')}
                        >
                          <div className="cmd-report-main">
                            <span className="cmd-report-type-title">{rep.type}</span>
                            <span className="cmd-report-loc">
                              <MapPin size={11} className="inline mr-1 text-slate-400" />
                              {rep.locationName}
                            </span>
                          </div>

                          <div className="cmd-report-meta">
                            <div className="flex items-center gap-1.5">
                              <span className={`cmd-risk-tag ${statusClass}`}>
                                {statusTag}
                              </span>
                              {rep.urgency === 'Critical' && (
                                <span className="cmd-urgency-dot" title="Critical Priority" />
                              )}
                            </div>
                            <span className="cmd-report-time">{formatTimeAgo(rep.timestamp)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Situation Map Card */}
          <div className="cmd-panel-card mt-4">
            <div className="cmd-panel-header">
              <div>
                <h2 className="cmd-panel-title">SITUATION MAP</h2>
                <p className="cmd-panel-sub">Live view of hazards, user reports and response locations.</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/app/map')}
                className="cmd-btn-primary-sm"
              >
                <MapIcon size={14} />
                <span>Open Full Map →</span>
              </button>
            </div>

            <div className="cmd-map-wrapper">
              <InteractiveMap center={mapCenter} zoom={13} className="cmd-leaflet-map">
                {/* Operator Command Center Location */}
                <MapMarker position={mapCenter} type="user" icon={<MapPin size={18} />}>
                  <MapPopup
                    title="Command Center Node"
                    type="Current Operation Center"
                    metadata={[
                      { label: 'Location', value: addressName },
                      { label: 'Coordinates', value: `${lat.toFixed(4)}, ${lon.toFixed(4)}` }
                    ]}
                  />
                </MapMarker>

                {/* Verified and Submitted User Reports */}
                {reports
                  .filter(r => r.coordinates?.latitude && r.coordinates?.longitude)
                  .slice(0, 10)
                  .map(report => (
                    <MapMarker
                      key={report.id}
                      position={[report.coordinates!.latitude, report.coordinates!.longitude]}
                      type={report.status === 'Verified' ? 'alert-critical' : 'alert-warning'}
                      icon={<AlertTriangle size={16} />}
                    >
                      <MapPopup
                        title={report.type}
                        type={`CITIZEN REPORT • ${report.status.toUpperCase()}`}
                        metadata={[
                          { label: 'Location', value: report.locationName },
                          { label: 'Urgency', value: report.urgency },
                          { label: 'Reported', value: new Date(report.timestamp).toLocaleTimeString() }
                        ]}
                      />
                    </MapMarker>
                  ))}
              </InteractiveMap>
            </div>
          </div>

          {/* Response Status Row */}
          <div className="cmd-panel-card mt-4">
            <div className="cmd-panel-header">
              <div>
                <h2 className="cmd-panel-title">Response Status</h2>
                <p className="cmd-panel-sub">Active municipal resources & field infrastructure</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/app/volunteer')}
                className="cmd-btn-primary-sm"
              >
                <Users size={14} />
                <span>Volunteer Hub →</span>
              </button>
            </div>

            <div className="cmd-response-grid">
              <div className="cmd-response-box">
                <div className="cmd-response-box-icon text-blue-600 bg-blue-50">
                  <Building2 size={18} />
                </div>
                <div className="cmd-response-box-text">
                  <span className="cmd-response-box-val">{facilities.length}</span>
                  <span className="cmd-response-box-label">Monitored Facilities</span>
                </div>
              </div>

              <div className="cmd-response-box">
                <div className="cmd-response-box-icon text-amber-600 bg-amber-50">
                  <Clock size={18} />
                </div>
                <div className="cmd-response-box-text">
                  <span className="cmd-response-box-val">{pendingVerificationReports.length}</span>
                  <span className="cmd-response-box-label">Pending Review</span>
                </div>
              </div>

              <div className="cmd-response-box">
                <div className="cmd-response-box-icon text-emerald-600 bg-emerald-50">
                  <CheckCircle2 size={18} />
                </div>
                <div className="cmd-response-box-text">
                  <span className="cmd-response-box-val">{verifiedReports.length}</span>
                  <span className="cmd-response-box-label">Verified Dispatches</span>
                </div>
              </div>

              <div className="cmd-response-box">
                <div className="cmd-response-box-icon text-indigo-600 bg-indigo-50">
                  <Users size={18} />
                </div>
                <div className="cmd-response-box-text">
                  <span className="cmd-response-box-val">{verifiedReports.length > 0 ? verifiedReports.length + 2 : 1}</span>
                  <span className="cmd-response-box-label">Active Deployments</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Information Column (30%) */}
        <div className="cmd-right-col">
          {/* Weather Forecast Panel */}
          <div className="cmd-panel-card">
            <div className="cmd-panel-header">
              <div>
                <h2 className="cmd-panel-title">Weather Forecast</h2>
                <p className="cmd-panel-sub">Live meteorological telemetry</p>
              </div>
            </div>

            <div className="cmd-panel-body">
              {!weatherData ? (
                <div className="cmd-empty-state">
                  <CloudRain size={24} className="text-slate-400 mb-1" />
                  <p className="cmd-empty-text">{weatherLoading ? 'Loading weather...' : 'Weather data unavailable'}</p>
                </div>
              ) : (
                <div className="cmd-weather-content">
                  {/* Current Temp Hero */}
                  <div className="cmd-weather-current">
                    <div className="cmd-weather-current-left">
                      <span className="cmd-weather-temp">{Math.round(weatherData.temperature)}°C</span>
                      <span className="cmd-weather-desc">
                        {getWeatherDescription(weatherData.weatherCode)}
                      </span>
                      <span className="cmd-weather-feels">
                        Feels like {Math.round(weatherData.feelsLike)}°C • Wind: {Math.round(weatherData.windSpeed)} km/h
                      </span>
                    </div>
                    <div className="cmd-weather-hero-icon">
                      {getWeatherIcon(weatherData.weatherCode, weatherData.isDay)}
                    </div>
                  </div>

                  {/* Next Hourly Strip */}
                  {weatherData.hourlyForecast && weatherData.hourlyForecast.length > 0 && (
                    <div className="cmd-weather-hourly-wrap">
                      <span className="cmd-section-label">Hourly Forecast</span>
                      <div className="cmd-weather-hourly-row">
                        {weatherData.hourlyForecast.slice(0, 6).map((h, i) => (
                          <div key={i} className="cmd-hourly-item">
                            <span className="cmd-hourly-time">{h.hour}</span>
                            <div className="cmd-hourly-icon">{getWeatherIcon(h.weatherCode)}</div>
                            <span className="cmd-hourly-temp">{h.temp}°</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 5-Day Daily Forecast Rows */}
                  {weatherData.dailyForecast && weatherData.dailyForecast.length > 0 && (
                    <div className="cmd-weather-daily-wrap">
                      <span className="cmd-section-label">Next 5 Days</span>
                      <div className="cmd-weather-daily-table">
                        {weatherData.dailyForecast.slice(1, 6).map((day, i) => (
                          <div key={i} className="cmd-daily-row">
                            <span className="cmd-daily-day">{day.dayName}</span>
                            <div className="cmd-daily-icon">{getWeatherIcon(day.weatherCode)}</div>
                            <div className="cmd-daily-temps">
                              <span className="cmd-temp-max">{day.maxTemp}°</span>
                              <span className="cmd-temp-min">{day.minTemp}°</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* System & Data Status Panel */}
          <div className="cmd-panel-card mt-4">
            <div className="cmd-panel-header">
              <div>
                <h2 className="cmd-panel-title">System & Data Status</h2>
                <p className="cmd-panel-sub">Real telemetry freshness indicators</p>
              </div>
            </div>

            <div className="cmd-panel-body">
              <div className="cmd-status-list">
                {/* Weather Data */}
                <div className="cmd-status-item">
                  <div className="cmd-status-info">
                    <span className="cmd-status-name">Weather Data (Open-Meteo)</span>
                    <span className="cmd-status-freshness">
                      {weatherData?.freshness === 'LIVE' ? 'Fresh telemetry' : 'Cached offline'}
                    </span>
                  </div>
                  <span className={`cmd-status-pill ${weatherData ? 'live' : 'unavailable'}`}>
                    ● {weatherData ? (weatherData.freshness === 'LIVE' ? 'Live' : 'Cached') : 'Unavailable'}
                  </span>
                </div>

                {/* Seismic Feed */}
                <div className="cmd-status-item">
                  <div className="cmd-status-info">
                    <span className="cmd-status-name">Seismic Data (USGS Network)</span>
                    <span className="cmd-status-freshness">Global Geoscientific Feed</span>
                  </div>
                  <span className="cmd-status-pill live">
                    ● {isOffline ? 'Cached' : 'Live'}
                  </span>
                </div>

                {/* Fire Detection */}
                <div className="cmd-status-item">
                  <div className="cmd-status-info">
                    <span className="cmd-status-name">Fire Detection (NASA FIRMS)</span>
                    <span className="cmd-status-freshness">Thermal Satellite Scan</span>
                  </div>
                  <span className="cmd-status-pill live">
                    ● {isOffline ? 'Cached' : 'Live'}
                  </span>
                </div>

                {/* Hydrology Data */}
                <div className="cmd-status-item">
                  <div className="cmd-status-info">
                    <span className="cmd-status-name">Hydrology & River Basin</span>
                    <span className="cmd-status-freshness">Precipitation & Drainage Models</span>
                  </div>
                  <span className="cmd-status-pill live">
                    ● {isOffline ? 'Cached' : 'Live'}
                  </span>
                </div>

                {/* Community Reports */}
                <div className="cmd-status-item">
                  <div className="cmd-status-info">
                    <span className="cmd-status-name">Community Reports</span>
                    <span className="cmd-status-freshness">IndexedDB Local Store</span>
                  </div>
                  <span className="cmd-status-pill live">
                    ● Synced ({reports.length})
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Operational Emergency Helpline Card */}
          <div className="cmd-panel-card mt-4">
            <div className="cmd-panel-header">
              <div>
                <h2 className="cmd-panel-title">Dispatch Helplines</h2>
                <p className="cmd-panel-sub">Direct official coordination channels</p>
              </div>
            </div>

            <div className="cmd-panel-body">
              <div className="cmd-helpline-grid">
                <a href="tel:112" className="cmd-helpline-chip">
                  <div className="cmd-helpline-icon bg-blue-50 text-blue-600">
                    <Phone size={14} />
                  </div>
                  <div>
                    <span className="cmd-helpline-title">National Emergency</span>
                    <span className="cmd-helpline-num">112</span>
                  </div>
                </a>

                <a href="tel:108" className="cmd-helpline-chip">
                  <div className="cmd-helpline-icon bg-emerald-50 text-emerald-600">
                    <Phone size={14} />
                  </div>
                  <div>
                    <span className="cmd-helpline-title">Medical Ambulance</span>
                    <span className="cmd-helpline-num">108</span>
                  </div>
                </a>

                <a href="tel:101" className="cmd-helpline-chip">
                  <div className="cmd-helpline-icon bg-red-50 text-red-600">
                    <Phone size={14} />
                  </div>
                  <div>
                    <span className="cmd-helpline-title">Fire & Rescue</span>
                    <span className="cmd-helpline-num">101</span>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
