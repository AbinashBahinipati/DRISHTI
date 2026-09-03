import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Shield, Flame, Plus, MapPin, Navigation, Eye,
  Building2, Phone, ChevronRight,
  LifeBuoy, AlertCircle, Footprints, Car, MoreHorizontal,
  ShieldAlert, Radio, Activity
} from 'lucide-react';
import { useLocation } from '../hooks/useLocation';
import { useNearbyFacilities, type Facility } from '../hooks/useNearbyFacilities';
import { useEarlyWarning } from '../hooks/useEarlyWarning';
import { LoaderOne } from '../components/ui/loader';
import '../styles/EmergencyHelp.css';

import type { ReportType, ReportUrgency } from '../types/report';

// Baseline emergency numbers
const EMERGENCY_CONTACTS = {
  police: '112',
  ambulance: '108',
  fire: '101'
};

// Quick report shortcuts matching the specification with dedicated visual styling
const QUICK_ASSIST_OPTIONS: {
  label: string;
  type: ReportType;
  urgency: ReportUrgency;
  icon: React.ReactNode;
  iconBg: string;
  description: string;
}[] = [
  {
    label: 'I need medical help',
    type: 'Other',
    urgency: 'Critical',
    icon: <LifeBuoy size={16} className="text-emerald-400" />,
    iconBg: 'rgba(16, 185, 129, 0.15)',
    description: 'Immediate medical assistance requested'
  },
  {
    label: 'I am trapped',
    type: 'Other',
    urgency: 'Critical',
    icon: <AlertCircle size={16} className="text-amber-400" />,
    iconBg: 'rgba(245, 158, 11, 0.15)',
    description: 'Person or group trapped, urgent rescue required'
  },
  {
    label: 'I need evacuation',
    type: 'Other',
    urgency: 'Critical',
    icon: <Footprints size={16} className="text-sky-400" />,
    iconBg: 'rgba(56, 189, 248, 0.15)',
    description: 'Evacuation assistance needed from risk zone'
  },
  {
    label: 'Fire nearby',
    type: 'Fire',
    urgency: 'Critical',
    icon: <Flame size={16} className="text-red-400" />,
    iconBg: 'rgba(239, 68, 68, 0.15)',
    description: 'Active fire hazard reported nearby'
  },
  {
    label: 'Report accident',
    type: 'InfrastructureDamage',
    urgency: 'Critical',
    icon: <Car size={16} className="text-violet-400" />,
    iconBg: 'rgba(167, 139, 250, 0.15)',
    description: 'Road traffic or structural accident report'
  },
  {
    label: 'Other emergency',
    type: 'Other',
    urgency: 'Medium',
    icon: <MoreHorizontal size={16} className="text-zinc-300" />,
    iconBg: 'rgba(148, 163, 184, 0.15)',
    description: 'General emergency assistance report'
  },
];

export const EmergencyHelp: React.FC = () => {
  const navigate = useNavigate();
  const { location } = useLocation();
  const { highestRisk } = useEarlyWarning();
  const { facilities, loading } = useNearbyFacilities(
    location.coords?.latitude || 20.4625,
    location.coords?.longitude || 85.8828,
    15
  );

  const handleQuickAssist = (option: typeof QUICK_ASSIST_OPTIONS[0]) => {
    navigate('/app/report', {
      state: {
        prefill: {
          type: option.type,
          urgency: option.urgency,
          description: option.description
        }
      }
    });
  };

  const handleViewOnMap = (facility: Facility) => {
    navigate('/app/map', { state: { center: [facility.lat, facility.lon], selectedId: facility.id } });
  };

  const handleNavigateFacility = (facility: Facility) => {
    navigate('/app/map', {
      state: {
        center: [facility.lat, facility.lon],
        navigateTarget: { lat: facility.lat, lon: facility.lon, name: facility.name }
      }
    });
  };

  // Stage badge dynamic theme colors
  const stageTheme = highestRisk.warningStage === 'Emergency' || highestRisk.warningStage === 'Warning'
    ? { border: 'border-red-500/40 hover:border-red-500/70', badgeBg: 'bg-red-500/20 text-red-300 border-red-500/40', icon: 'text-red-400', iconBg: 'bg-red-500/15 border-red-500/30' }
    : highestRisk.warningStage === 'Watch' || highestRisk.warningStage === 'Advisory'
    ? { border: 'border-amber-500/40 hover:border-amber-500/70', badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40', icon: 'text-amber-400', iconBg: 'bg-amber-500/15 border-amber-500/30' }
    : { border: 'border-emerald-500/30 hover:border-emerald-500/60', badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', icon: 'text-emerald-400', iconBg: 'bg-emerald-500/15 border-emerald-500/30' };

  return (
    <div className="emergency-page-container">
      {/* Top Header */}
      <header className="emergency-top-header">
        <div>
          <h1 className="emergency-main-title">Quick Emergency Help</h1>
          <p className="emergency-main-subtitle">Get immediate assistance and report emergencies.</p>
        </div>

        {/* Real-time Location Badge with Live Beacon */}
        <div className="emergency-location-pill" title="Live GPS Positioning Active">
          <span className="live-gps-beacon">
            <span className="live-gps-ping" />
            <span className="live-gps-dot" />
          </span>
          <MapPin size={13} className="text-zinc-400" />
          <span className="truncate max-w-[220px]">
            {location.address || (location.coords ? `${location.coords.latitude.toFixed(3)}°N, ${location.coords.longitude.toFixed(3)}°E` : 'Locating GPS...')}
          </span>
        </div>
      </header>

      {/* Early Warning Intelligence Live Banner */}
      <motion.div
        whileHover={{ scale: 1.006, y: -1 }}
        whileTap={{ scale: 0.994 }}
        onClick={() => navigate('/app/early-warning')}
        className={`cursor-pointer bg-[#15161a] hover:bg-[#1a1c22] border ${stageTheme.border} rounded-xl p-3.5 flex items-center justify-between shadow-lg shadow-black/40 transition-all duration-200 group`}
        title="Open Early Warning & Risk Intelligence Center"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className={`w-10 h-10 rounded-lg ${stageTheme.iconBg} flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105`}>
            <ShieldAlert size={20} className={stageTheme.icon} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                <Activity size={12} className="text-amber-400 animate-pulse" />
                EARLY WARNING INTELLIGENCE
              </span>
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${stageTheme.badgeBg}`}>
                {highestRisk.warningStage} • {highestRisk.hazardType}
              </span>
            </div>
            <p className="text-xs text-zinc-300 font-medium m-0 mt-0.5 truncate">
              Risk Score: <strong className="text-white font-mono">{highestRisk.riskScore}/100</strong> • Confidence: <strong className="text-emerald-400 font-mono">{highestRisk.confidence}%</strong> • Radius: ~{highestRisk.impactRadiusKm}km
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-bold text-sky-400 bg-sky-500/10 px-3 py-1.5 rounded-lg border border-sky-500/20 group-hover:bg-sky-500/20 group-hover:border-sky-500/40 flex-shrink-0 transition-all">
          <span>Open Center</span>
          <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
        </div>
      </motion.div>

      {/* Top 3 Emergency Action Cards (Police 112, Ambulance 108, Fire 101) */}
      <section className="top-emergency-cards-grid" aria-label="Direct Emergency Contacts">
        {/* Police */}
        <motion.div
          whileHover={{ y: -3, transition: { duration: 0.18 } }}
          whileTap={{ scale: 0.98 }}
          className="top-emergency-card police-theme interactive-cursor"
          onClick={() => window.location.href = `tel:${EMERGENCY_CONTACTS.police}`}
          role="button"
          tabIndex={0}
        >
          <div className="top-card-badge police-badge">
            <Shield size={22} className="text-white" />
          </div>
          <div className="top-card-content">
            <div className="flex items-center justify-between">
              <h3 className="top-card-title">Police</h3>
              <span className="emergency-dial-chip police-chip">Dial 112</span>
            </div>
            <p className="top-card-desc">Report crime or seek immediate police assistance</p>
          </div>
          <ChevronRight size={18} className="top-card-arrow" />
        </motion.div>

        {/* Ambulance */}
        <motion.div
          whileHover={{ y: -3, transition: { duration: 0.18 } }}
          whileTap={{ scale: 0.98 }}
          className="top-emergency-card ambulance-theme interactive-cursor"
          onClick={() => window.location.href = `tel:${EMERGENCY_CONTACTS.ambulance}`}
          role="button"
          tabIndex={0}
        >
          <div className="top-card-badge ambulance-badge">
            <Plus size={24} strokeWidth={3} className="text-white" />
          </div>
          <div className="top-card-content">
            <div className="flex items-center justify-between">
              <h3 className="top-card-title">Ambulance</h3>
              <span className="emergency-dial-chip ambulance-chip">Dial 108</span>
            </div>
            <p className="top-card-desc">Request emergency medical assistance & EMS</p>
          </div>
          <ChevronRight size={18} className="top-card-arrow" />
        </motion.div>

        {/* Fire */}
        <motion.div
          whileHover={{ y: -3, transition: { duration: 0.18 } }}
          whileTap={{ scale: 0.98 }}
          className="top-emergency-card fire-theme interactive-cursor"
          onClick={() => window.location.href = `tel:${EMERGENCY_CONTACTS.fire}`}
          role="button"
          tabIndex={0}
        >
          <div className="top-card-badge fire-badge">
            <Flame size={22} className="text-white" />
          </div>
          <div className="top-card-content">
            <div className="flex items-center justify-between">
              <h3 className="top-card-title">Fire Rescue</h3>
              <span className="emergency-dial-chip fire-chip">Dial 101</span>
            </div>
            <p className="top-card-desc">Report active fire incidents & hazard rescue</p>
          </div>
          <ChevronRight size={18} className="top-card-arrow" />
        </motion.div>
      </section>

      {/* Main 2-Column Section */}
      <main className="emergency-two-column-layout">
        {/* Left Column: NEAREST HELP */}
        <section className="nearest-help-column" aria-label="Nearest Help Facilities">
          <div className="nearest-help-header">
            <div className="nearest-help-header-top">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-amber-500" />
                <h2 className="nearest-help-heading">NEAREST HELP</h2>
              </div>
              <button
                type="button"
                onClick={() => navigate('/app/map')}
                className="view-all-link interactive-cursor"
              >
                View all on map <ChevronRight size={13} />
              </button>
            </div>
            <p className="nearest-help-sub">Verified emergency medical & rescue centres nearby.</p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-zinc-400 bg-[#121215] border border-white/5 rounded-xl">
              <LoaderOne />
              <p className="text-xs mt-3 font-medium">Scanning live OpenStreetMap facilities...</p>
            </div>
          ) : facilities.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-10 text-center text-zinc-400 bg-[#121214] border border-white/10 rounded-xl">
              <Building2 size={24} className="text-zinc-500 mb-2" />
              <p className="text-xs font-semibold text-zinc-300">No emergency facilities found in this sector.</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">Live OpenStreetMap telemetry reports zero facilities within current radius.</p>
            </div>
          ) : (
            <div className="nearest-help-list">
              {facilities.slice(0, 8).map((facility, idx) => (
                <motion.div
                  key={facility.id || idx}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: idx * 0.03 }}
                  className="nearest-facility-card"
                >
                  {/* Facility Details */}
                  <div className="facility-details">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="facility-name" title={facility.name}>{facility.name}</h3>
                      <span className="facility-distance-chip">
                        {typeof facility.distance === 'number' ? `${facility.distance.toFixed(1)} km` : 'Near'}
                      </span>
                    </div>

                    <div className="facility-tag-distance">
                      <span className={`facility-type-badge ${facility.type}`}>
                        {facility.type === 'shelter' ? 'Safe Shelter' : facility.type}
                      </span>
                    </div>

                    <div className="facility-address">
                      <MapPin size={11} className="flex-shrink-0 text-zinc-500" />
                      <span className="truncate" title={facility.address || `${facility.lat.toFixed(3)}°N, ${facility.lon.toFixed(3)}°E`}>
                        {facility.address || `${facility.lat.toFixed(3)}°N, ${facility.lon.toFixed(3)}°E`}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="facility-actions-row">
                      <button
                        type="button"
                        onClick={() => handleViewOnMap(facility)}
                        className="facility-action-btn view-map-btn interactive-cursor"
                      >
                        <Eye size={12} />
                        View on Map
                      </button>
                      <button
                        type="button"
                        onClick={() => handleNavigateFacility(facility)}
                        className="facility-action-btn navigate-btn interactive-cursor"
                      >
                        <Navigation size={12} />
                        Navigate
                      </button>
                    </div>
                  </div>

                  {/* Right Call Action */}
                  <a
                    href={`tel:${facility.phone || (facility.type === 'police' ? '112' : facility.type === 'fire' ? '101' : '108')}`}
                    className="facility-call-btn interactive-cursor"
                    title={`Call ${facility.name}`}
                  >
                    <Phone size={15} />
                  </a>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* Right Column: NEED HELP? */}
        <section className="need-help-column" aria-label="Quick Emergency Assistance">
          <div className="need-help-header">
            <div className="flex items-center gap-2">
              <Radio size={16} className="text-amber-500" />
              <h2 className="need-help-heading">NEED HELP?</h2>
            </div>
            <p className="need-help-sub">Select an option to quickly generate an emergency report for responders.</p>
          </div>

          <div className="quick-assist-list">
            {QUICK_ASSIST_OPTIONS.map((opt, idx) => (
              <motion.button
                key={idx}
                type="button"
                initial={{ opacity: 0, x: 4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.18, delay: idx * 0.03 }}
                whileHover={{ x: 4, transition: { duration: 0.15 } }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleQuickAssist(opt)}
                className="quick-assist-card interactive-cursor group"
              >
                <div
                  className="quick-assist-icon-wrapper"
                  style={{ background: opt.iconBg }}
                >
                  {opt.icon}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <span className="quick-assist-label block">{opt.label}</span>
                  <span className="quick-assist-sub block truncate">{opt.description}</span>
                </div>
                <ChevronRight size={15} className="quick-assist-arrow group-hover:translate-x-1 transition-transform" />
              </motion.button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default EmergencyHelp;
