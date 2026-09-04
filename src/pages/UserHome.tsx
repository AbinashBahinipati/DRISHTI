import React, { useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Bell,
  Phone,
  Building2,
  Map as MapIcon,
  Flame,
  Activity,
  ArrowRight,
  CloudRain,
  Wind,
  Thermometer,
  ShieldCheck,
  Eye,
  AlertTriangle,
  AlertOctagon,
  LifeBuoy,
  Compass,
  Navigation,
  ShieldAlert,
  Home as HomeIcon,
  BookOpen,
  Waves,
  CheckCircle2,
  HelpCircle,
  User as UserIcon,
  LogOut
} from 'lucide-react';
import { useLocation } from '../hooks/useLocation';
import { useWeather } from '../hooks/useWeather';
import { useAlerts } from '../hooks/useAlerts';
import { useNearbyFacilities, calculateDistance, type Facility } from '../hooks/useNearbyFacilities';
import { useEarlyWarning } from '../hooks/useEarlyWarning';
import { useUserAuth } from '../hooks/useUserAuth';
import { Logo } from '../components/ui/Logo';
import '../styles/UserHome.css';

type CitizenSafetyState = 'NORMAL' | 'ADVISORY' | 'WATCH' | 'WARNING' | 'EMERGENCY' | 'UNAVAILABLE';

export const UserHome: React.FC = () => {
  const navigate = useNavigate();
  const { location } = useLocation();
  const { user, isAuthenticated, isGuest, hasVisitedBefore, logout } = useUserAuth();

  // First-time visit entry flow: guide unauthenticated/unassigned mobile users to welcome screen
  useEffect(() => {
    if (!isAuthenticated && !isGuest && !hasVisitedBefore) {
      navigate('/user/welcome', { replace: true });
    }
  }, [isAuthenticated, isGuest, hasVisitedBefore, navigate]);

  // 1. Real GPS Location Coordinates
  const lat = location.coords?.latitude ?? 20.4625;
  const lon = location.coords?.longitude ?? 85.8828;
  const addressName = location.address || (location.coords ? `${lat.toFixed(3)}°N, ${lon.toFixed(3)}°E` : 'Bhubaneswar, Odisha');

  // 2. Real Telemetry Data (Zero Mock Data)
  const { data: weatherData } = useWeather(lat, lon);
  const { alerts } = useAlerts(lat, lon);
  const { facilities, loading: facilitiesLoading } = useNearbyFacilities(lat, lon, 15);
  const { assessments, highestRisk } = useEarlyWarning(5, [lat, lon], addressName);

  // 3. Deterministic Safety State Calculation from Existing Real-Time Risk Intelligence
  const overallRisk = assessments?.overall?.riskScore ?? highestRisk?.riskScore ?? 0;
  const warningStage = assessments?.overall?.warningStage ?? highestRisk?.warningStage ?? 'Normal';
  const highestHazardType = highestRisk?.hazardType || 'Flood';

  const isLiveDataOffline = !weatherData && !highestRisk && alerts.length === 0;

  const safetyState: CitizenSafetyState = useMemo(() => {
    if (isLiveDataOffline) {
      return 'UNAVAILABLE';
    }

    const hasCriticalAlert = alerts.some(a => a.severity === 'Critical' && a.status !== 'Resolved');
    const hasWarningAlert = alerts.some(a => a.severity === 'Warning' && a.status !== 'Resolved');
    const hasAdvisoryAlert = alerts.some(a => a.severity === 'Advisory' && a.status !== 'Resolved');

    if (warningStage === 'Emergency' || overallRisk >= 80 || hasCriticalAlert) {
      return 'EMERGENCY';
    }
    if (warningStage === 'Warning' || overallRisk >= 60) {
      return 'WARNING';
    }
    if (warningStage === 'Watch' || overallRisk >= 40 || hasWarningAlert) {
      return 'WATCH';
    }
    if (warningStage === 'Advisory' || overallRisk >= 20 || hasAdvisoryAlert) {
      return 'ADVISORY';
    }
    return 'NORMAL';
  }, [isLiveDataOffline, warningStage, overallRisk, alerts]);

  // 4. Categorized Real Facilities with Individual Distance Calculation
  const nearestFacilitiesByCategory = useMemo(() => {
    const getNearest = (type: Facility['type']): { facility: Facility | null; distance: number } => {
      const filtered = facilities.filter(f => f.type === type);
      if (filtered.length === 0) return { facility: null, distance: 0 };
      
      // Sort strictly by individual Haversine distance
      const sorted = [...filtered].sort((a, b) => {
        const distA = a.distance ?? calculateDistance(lat, lon, a.lat, a.lon);
        const distB = b.distance ?? calculateDistance(lat, lon, b.lat, b.lon);
        return distA - distB;
      });

      const closest = sorted[0];
      const dist = closest.distance ?? calculateDistance(lat, lon, closest.lat, closest.lon);
      return { facility: closest, distance: dist };
    };

    return {
      hospital: getNearest('hospital'),
      police: getNearest('police'),
      fire: getNearest('fire'),
      shelter: getNearest('shelter')
    };
  }, [facilities, lat, lon]);

  // Safety Card Presentation Config
  const statusConfig = {
    NORMAL: {
      headline: 'YOU ARE SAFE',
      subline: 'No immediate hazards detected from available live data.',
      className: 'state-safe',
      icon: <ShieldCheck size={28} />
    },
    ADVISORY: {
      headline: 'MONITOR CONDITIONS',
      subline: 'Conditions are being monitored in your area.',
      className: 'state-monitor',
      icon: <Eye size={28} />
    },
    WATCH: {
      headline: 'BE ALERT',
      subline: 'Elevated hazard conditions detected.',
      className: 'state-alert',
      icon: <AlertTriangle size={28} />
    },
    WARNING: {
      headline: 'TAKE ACTION',
      subline: 'A significant hazard is affecting your area.',
      className: 'state-warning',
      icon: <AlertOctagon size={28} />
    },
    EMERGENCY: {
      headline: 'TAKE ACTION NOW',
      subline: 'Follow local emergency instructions immediately.',
      className: 'state-action',
      icon: <ShieldAlert size={28} />
    },
    UNAVAILABLE: {
      headline: 'Live assessment unavailable',
      subline: 'Unable to fetch live sensor telemetry. Check local weather broadcasts.',
      className: 'state-unavailable',
      icon: <HelpCircle size={28} />
    }
  }[safetyState];

  // Dynamic Citizen Recommended Actions (2-4 items derived from highest hazard & severity)
  const citizenRecommendedActions = useMemo(() => {
    if (safetyState === 'EMERGENCY' || safetyState === 'WARNING') {
      switch (highestHazardType) {
        case 'Flood':
          return [
            'Move immediately to higher ground and stay clear of riverbanks.',
            'Never walk, swim, or drive through moving water ("Turn around, don\'t drown").',
            'Keep phone and power banks charged; follow municipal evacuation orders.'
          ];
        case 'Fire':
          return [
            'Evacuate immediately if ordered by emergency services.',
            'Close windows and wear a damp cloth or N95 mask to avoid smoke.',
            'Stay away from smoke-filled corridors and report hot spots.'
          ];
        case 'Cyclone':
          return [
            'Remain indoors inside the strongest central room away from glass windows.',
            'Do not venture outside during the calm eye of the storm.',
            'Unplug electrical appliances and keep emergency flashlights ready.'
          ];
        case 'Earthquake':
          return [
            'DROP, COVER, and HOLD ON under a sturdy table or interior wall.',
            'Stay away from glass windows, exterior walls, and tall furniture.',
            'Be prepared for aftershocks; do not use elevators.'
          ];
        default:
          return [
            'Follow instructions from local emergency authorities immediately.',
            'Move to a designated municipal shelter if instructed.',
            'Keep emergency numbers (112, 108, 101) ready.'
          ];
      }
    }

    if (safetyState === 'WATCH' || safetyState === 'ADVISORY') {
      switch (highestHazardType) {
        case 'Flood':
          return [
            'Inspect drainage around your property and move valuables off the ground.',
            'Check nearest elevated shelters on the Citizen Safety Map.',
            'Monitor rainfall accumulation and regional weather bulletins.'
          ];
        case 'Fire':
          return [
            'Strictly avoid open outdoor burning or discarded combustible items.',
            'Clear dry leaves and brush within 10 meters of your building.'
          ];
        case 'Cyclone':
          return [
            'Secure outdoor furniture, tin sheets, and loose signboards.',
            'Stock at least 3 days of drinking water and non-perishable rations.'
          ];
        case 'Earthquake':
          return [
            'Fasten tall cupboards and heavy fixtures securely to walls.',
            'Review earthquake safety spots with family members.'
          ];
        default:
          return [
            'Conditions are being monitored. Stay tuned to local civil advisories.',
            'Check that your 72-hour emergency kit is ready.'
          ];
      }
    }

    // NORMAL state
    return [
      'Keep emergency helpline numbers (112, 108, 101) saved on your phone.',
      'Check your 72-hour emergency go-bag and essential medications.',
      'Follow instructions from local authorities and emergency responders.'
    ];
  }, [safetyState, highestHazardType]);

  return (
    <div className="user-portal-container">
      {/* 1. Header */}
      <header className="user-portal-header">
        <div className="user-header-brand">
          <Logo size={30} color="#10b981" />
          <div className="user-brand-text">
            <span className="user-brand-title">DRISHTI</span>
            <span className="user-brand-subtitle">Citizen Safety</span>
          </div>
        </div>

        <div className="user-header-actions">
          {/* Current Location */}
          <div className="user-location-badge" title={`Live GPS: ${addressName}`}>
            <MapPin size={13} className="text-emerald-400 flex-shrink-0" />
            <span>{addressName}</span>
          </div>

          {/* Notification Button */}
          <button
            type="button"
            onClick={() => navigate('/user/alerts')}
            className="user-icon-btn"
            title="View Local Disaster Alerts"
            aria-label="Alerts"
          >
            <Bell size={16} />
            {alerts.length > 0 && (
              <span className="user-badge-count">{alerts.length}</span>
            )}
          </button>

          {/* Citizen Account / Settings Button */}
          <button
            type="button"
            onClick={() => navigate('/user/settings')}
            className="user-icon-btn"
            title={isAuthenticated && user ? `Citizen: ${user.fullName}` : 'Citizen Account (Guest Mode)'}
            aria-label="Account Settings"
            style={{ position: 'relative' }}
          >
            {isAuthenticated && user ? (
              <div
                style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: user.avatarColor || '#10b981',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 700
              }}
            >
              {user.fullName.charAt(0).toUpperCase()}
            </div>
            ) : (
              <UserIcon size={16} />
            )}
          </button>

          {/* Citizen Log Out Option */}
          {isAuthenticated && (
            <button
              type="button"
              onClick={() => {
                logout();
                navigate('/user/welcome');
              }}
              className="user-icon-btn text-rose-400 hover:text-rose-300 hover:bg-rose-500/15"
              title="Sign Out of Citizen Account"
              aria-label="Sign Out"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </header>

      {/* 2. Main Page Content */}
      <main className="user-portal-content">
        {/* Main Safety Status Card */}
        <section className={`user-status-card ${statusConfig.className}`} aria-label="Current Safety Status">
          <div className="user-status-header">
            <div className="user-status-icon-box">
              {statusConfig.icon}
            </div>
            <div className="user-status-text-block">
              <h1 className="user-status-headline">{statusConfig.headline}</h1>
              <p className="user-status-subline">{statusConfig.subline}</p>
            </div>
          </div>

          {/* Dynamic Citizen Recommended Actions */}
          <div className="user-status-actions-wrap">
            <h2 className="user-status-actions-title">
              <CheckCircle2 size={13} className="text-emerald-400" />
              <span>Recommended Actions</span>
            </h2>

            <ul className="user-status-actions-list">
              {citizenRecommendedActions.map((action, idx) => (
                <li key={idx} className="user-status-action-item">
                  <span className="user-status-action-bullet">•</span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>

            {/* Provenance Tag */}
            <div className="user-status-data-tag">
              <span className="user-live-indicator-dot" />
              <span>Based on available live data</span>
            </div>
          </div>
        </section>

        {/* 3. Current Conditions */}
        <section aria-label="Current Environmental Conditions">
          <h2 className="user-section-title">
            <Compass size={14} className="text-sky-400" />
            <span>Current Conditions</span>
          </h2>

          <div className="user-conditions-grid">
            {/* Temperature */}
            <div className="user-condition-card">
              <div className="user-condition-header">
                <span className="user-condition-label">Temperature</span>
                <Thermometer size={16} className="text-amber-400" />
              </div>
              <div className={`user-condition-value ${!weatherData ? 'unavailable' : ''}`}>
                {typeof weatherData?.temperature === 'number'
                  ? `${weatherData.temperature.toFixed(1)}°C`
                  : 'Data unavailable'}
              </div>
            </div>

            {/* Rainfall / Precipitation */}
            <div className="user-condition-card">
              <div className="user-condition-header">
                <span className="user-condition-label">Rainfall (24h)</span>
                <CloudRain size={16} className="text-sky-400" />
              </div>
              <div className={`user-condition-value ${!weatherData ? 'unavailable' : ''}`}>
                {typeof weatherData?.precipitationAccumulation24h === 'number'
                  ? `${weatherData.precipitationAccumulation24h} mm`
                  : typeof weatherData?.precipitation === 'number'
                    ? `${weatherData.precipitation} mm`
                    : 'Data unavailable'}
              </div>
            </div>

            {/* Wind */}
            <div className="user-condition-card">
              <div className="user-condition-header">
                <span className="user-condition-label">Wind</span>
                <Wind size={16} className="text-teal-400" />
              </div>
              <div className={`user-condition-value ${!weatherData ? 'unavailable' : ''}`}>
                {typeof weatherData?.windSpeed === 'number'
                  ? `${weatherData.windSpeed.toFixed(0)} km/h`
                  : 'Data unavailable'}
              </div>
            </div>
          </div>
        </section>

        {/* 4. Quick Actions */}
        <section aria-label="Citizen Quick Actions">
          <h2 className="user-section-title">
            <Compass size={14} className="text-emerald-400" />
            <span>Quick Actions</span>
          </h2>

          <div className="user-quick-actions-grid">
            <button
              type="button"
              onClick={() => navigate('/user/report')}
              className="user-action-button-card btn-report-incident"
            >
              <div className="user-action-icon-circle">
                <AlertTriangle size={20} />
              </div>
              <div className="user-action-text-area">
                <h3 className="user-action-title">Report Incident</h3>
                <p className="user-action-desc">Submit ground disaster report to emergency responders</p>
              </div>
              <ArrowRight size={16} className="text-zinc-500" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/user/map')}
              className="user-action-button-card btn-location-check"
            >
              <div className="user-action-icon-circle">
                <MapIcon size={20} />
              </div>
              <div className="user-action-text-area">
                <h3 className="user-action-title">Check a Location</h3>
                <p className="user-action-desc">Inspect hazards & facilities on Disaster Map</p>
              </div>
              <ArrowRight size={16} className="text-zinc-500" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/user/help')}
              className="user-action-button-card btn-emergency-help"
            >
              <div className="user-action-icon-circle">
                <Phone size={20} />
              </div>
              <div className="user-action-text-area">
                <h3 className="user-action-title">Get Emergency Help</h3>
                <p className="user-action-desc">Call 112 or contact nearest emergency services</p>
              </div>
              <ArrowRight size={16} className="text-zinc-500" />
            </button>
          </div>
        </section>

        {/* 5. Nearby Help (Real OSM Facilities with Individual Distance) */}
        <section aria-label="Nearest Real Emergency Facilities">
          <h2 className="user-section-title">
            <Building2 size={14} className="text-rose-400" />
            <span>Nearby Help</span>
          </h2>

          <div className="user-facilities-grid">
            {/* Hospital */}
            <div className="user-facility-item">
              <div className="user-facility-left">
                <div className="user-facility-category-icon cat-hospital">
                  <Activity size={18} />
                </div>
                <div className="user-facility-details">
                  <h4 className="user-facility-title">
                    {nearestFacilitiesByCategory.hospital.facility?.name || (facilitiesLoading ? 'Scanning...' : 'Hospital')}
                  </h4>
                  <span className="user-facility-dist">
                    {nearestFacilitiesByCategory.hospital.facility
                      ? `Hospital • ~${nearestFacilitiesByCategory.hospital.distance} km away`
                      : facilitiesLoading
                        ? 'Locating nearest hospital...'
                        : 'Scanning regional database'}
                  </span>
                </div>
              </div>

              <div className="user-facility-actions-wrap">
                {nearestFacilitiesByCategory.hospital.facility?.phone && (
                  <a
                    href={`tel:${nearestFacilitiesByCategory.hospital.facility.phone}`}
                    className="user-facility-call-btn"
                    title={`Call ${nearestFacilitiesByCategory.hospital.facility.name}`}
                  >
                    <Phone size={13} />
                  </a>
                )}
                {nearestFacilitiesByCategory.hospital.facility && (
                  <button
                    type="button"
                    onClick={() => navigate('/user/map', {
                      state: {
                        center: [nearestFacilitiesByCategory.hospital.facility!.lat, nearestFacilitiesByCategory.hospital.facility!.lon]
                      }
                    })}
                    className="user-facility-nav-btn"
                    title="View & Navigate on Map"
                  >
                    <Navigation size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Police */}
            <div className="user-facility-item">
              <div className="user-facility-left">
                <div className="user-facility-category-icon cat-police">
                  <ShieldAlert size={18} />
                </div>
                <div className="user-facility-details">
                  <h4 className="user-facility-title">
                    {nearestFacilitiesByCategory.police.facility?.name || (facilitiesLoading ? 'Scanning...' : 'Police Station')}
                  </h4>
                  <span className="user-facility-dist">
                    {nearestFacilitiesByCategory.police.facility
                      ? `Police • ~${nearestFacilitiesByCategory.police.distance} km away`
                      : facilitiesLoading
                        ? 'Locating nearest police station...'
                        : 'Scanning regional database'}
                  </span>
                </div>
              </div>

              <div className="user-facility-actions-wrap">
                {nearestFacilitiesByCategory.police.facility?.phone ? (
                  <a
                    href={`tel:${nearestFacilitiesByCategory.police.facility.phone}`}
                    className="user-facility-call-btn"
                    title={`Call ${nearestFacilitiesByCategory.police.facility.name}`}
                  >
                    <Phone size={13} />
                  </a>
                ) : (
                  <a href="tel:112" className="user-facility-call-btn" title="Call Police 112">
                    <Phone size={13} />
                  </a>
                )}
                {nearestFacilitiesByCategory.police.facility && (
                  <button
                    type="button"
                    onClick={() => navigate('/user/map', {
                      state: {
                        center: [nearestFacilitiesByCategory.police.facility!.lat, nearestFacilitiesByCategory.police.facility!.lon]
                      }
                    })}
                    className="user-facility-nav-btn"
                    title="View & Navigate on Map"
                  >
                    <Navigation size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Fire Station */}
            <div className="user-facility-item">
              <div className="user-facility-left">
                <div className="user-facility-category-icon cat-fire">
                  <Flame size={18} />
                </div>
                <div className="user-facility-details">
                  <h4 className="user-facility-title">
                    {nearestFacilitiesByCategory.fire.facility?.name || (facilitiesLoading ? 'Scanning...' : 'Fire Station')}
                  </h4>
                  <span className="user-facility-dist">
                    {nearestFacilitiesByCategory.fire.facility
                      ? `Fire Station • ~${nearestFacilitiesByCategory.fire.distance} km away`
                      : facilitiesLoading
                        ? 'Locating nearest fire station...'
                        : 'Scanning regional database'}
                  </span>
                </div>
              </div>

              <div className="user-facility-actions-wrap">
                {nearestFacilitiesByCategory.fire.facility?.phone ? (
                  <a
                    href={`tel:${nearestFacilitiesByCategory.fire.facility.phone}`}
                    className="user-facility-call-btn"
                    title={`Call ${nearestFacilitiesByCategory.fire.facility.name}`}
                  >
                    <Phone size={13} />
                  </a>
                ) : (
                  <a href="tel:101" className="user-facility-call-btn" title="Call Fire 101">
                    <Phone size={13} />
                  </a>
                )}
                {nearestFacilitiesByCategory.fire.facility && (
                  <button
                    type="button"
                    onClick={() => navigate('/user/map', {
                      state: {
                        center: [nearestFacilitiesByCategory.fire.facility!.lat, nearestFacilitiesByCategory.fire.facility!.lon]
                      }
                    })}
                    className="user-facility-nav-btn"
                    title="View & Navigate on Map"
                  >
                    <Navigation size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Relief Shelter */}
            <div className="user-facility-item">
              <div className="user-facility-left">
                <div className="user-facility-category-icon cat-shelter">
                  <Building2 size={18} />
                </div>
                <div className="user-facility-details">
                  <h4 className="user-facility-title">
                    {nearestFacilitiesByCategory.shelter.facility?.name || 'Designated Community Shelter'}
                  </h4>
                  <span className="user-facility-dist">
                    {nearestFacilitiesByCategory.shelter.facility
                      ? `Shelter • ~${nearestFacilitiesByCategory.shelter.distance} km away`
                      : 'Municipal Disaster Evacuation Shelter'}
                  </span>
                </div>
              </div>

              <div className="user-facility-actions-wrap">
                <button
                  type="button"
                  onClick={() => navigate('/user/map')}
                  className="user-facility-nav-btn"
                  title="View Shelters on Map"
                >
                  <Navigation size={13} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Prepare Section */}
        <section aria-label="Disaster Preparedness Guidance">
          <h2 className="user-section-title">
            <BookOpen size={14} className="text-amber-400" />
            <span>Prepare</span>
          </h2>

          <div className="user-prepare-grid">
            <button
              type="button"
              onClick={() => navigate('/user/prepare')}
              className="user-prepare-card prepare-flood"
            >
              <div className="user-prepare-icon-wrap">
                <Waves size={22} />
              </div>
              <h3 className="user-prepare-title">Flood</h3>
              <p className="user-prepare-hint">Safety checklist</p>
            </button>

            <button
              type="button"
              onClick={() => navigate('/user/prepare')}
              className="user-prepare-card prepare-fire"
            >
              <div className="user-prepare-icon-wrap">
                <Flame size={22} />
              </div>
              <h3 className="user-prepare-title">Fire</h3>
              <p className="user-prepare-hint">Safety checklist</p>
            </button>

            <button
              type="button"
              onClick={() => navigate('/user/prepare')}
              className="user-prepare-card prepare-cyclone"
            >
              <div className="user-prepare-icon-wrap">
                <Wind size={22} />
              </div>
              <h3 className="user-prepare-title">Cyclone</h3>
              <p className="user-prepare-hint">Safety checklist</p>
            </button>

            <button
              type="button"
              onClick={() => navigate('/user/prepare')}
              className="user-prepare-card prepare-earthquake"
            >
              <div className="user-prepare-icon-wrap">
                <Activity size={22} />
              </div>
              <h3 className="user-prepare-title">Earthquake</h3>
              <p className="user-prepare-hint">Safety checklist</p>
            </button>
          </div>
        </section>
      </main>

      {/* 7. Bottom Navigation */}
      <nav className="user-bottom-nav" aria-label="Citizen Navigation Bar">
        <button
          type="button"
          className="user-nav-item active"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <HomeIcon size={18} />
          <span>HOME</span>
        </button>

        <button
          type="button"
          className="user-nav-item"
          onClick={() => navigate('/user/map')}
        >
          <MapIcon size={18} />
          <span>MAP</span>
        </button>

        <button
          type="button"
          className="user-nav-item"
          onClick={() => navigate('/user/alerts')}
        >
          <Bell size={18} />
          <span>ALERTS</span>
        </button>

        <button
          type="button"
          className="user-nav-item"
          onClick={() => navigate('/user/help')}
        >
          <LifeBuoy size={18} />
          <span>HELP</span>
        </button>

        <button
          type="button"
          className="user-nav-item"
          onClick={() => navigate('/user/prepare')}
        >
          <BookOpen size={18} />
          <span>PREPARE</span>
        </button>
      </nav>
    </div>
  );
};

export default UserHome;
