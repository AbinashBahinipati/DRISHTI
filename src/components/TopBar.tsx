import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, ShieldCheck, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { Tooltip } from './ui/Tooltip';
import { useLocation as useGeoLocation } from '../hooks/useLocation';
import { useOrgAuth } from '../hooks/useOrgAuth';
import '../styles/TopBar.css';

interface TopBarProps {
  onMobileMenuClick: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ onMobileMenuClick }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { location: geoLocation } = useGeoLocation();
  const { isAuthenticated: isOrgAuth, logout: orgLogout } = useOrgAuth();
  const [activeMapFilter, setActiveMapFilter] = useState('all');
  const [navState, setNavState] = useState<{ isNavigating: boolean; destinationTitle?: string }>({ isNavigating: false });

  useEffect(() => {
    const handleNavState = (e: any) => {
      if (e.detail) {
        setNavState(e.detail);
      }
    };
    window.addEventListener('map-navigation-state', handleNavState);
    return () => window.removeEventListener('map-navigation-state', handleNavState);
  }, []);

  const isHome = location.pathname === '/app';

  const mapFilters = [
    { id: 'all', label: 'All' },
    { id: 'hospital', label: 'Hospital' },
    { id: 'police', label: 'Police Station' },
    { id: 'fire', label: 'Fire Station' }
  ];

  return (
    <header className={`topbar ${isHome ? 'topbar-home' : ''}`}>
      <div className="topbar-left">
        <Tooltip content="Menu" position="right">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="mobile-menu-btn interactive-cursor"
            onClick={onMobileMenuClick}
            aria-label="Open mobile menu"
          >
            <Menu size={20} />
          </motion.button>
        </Tooltip>

        {location.pathname === '/app/telemetry' && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="ml-2 flex flex-col justify-center"
          >
            <h2 className="text-[1.35rem] leading-none font-bold tracking-[0.1em] text-text uppercase">
              LIVE TELEMETRY
            </h2>
            <p className="text-[0.7rem] leading-tight text-text-secondary mt-1">
              Real-time environmental signals and anomaly monitoring
            </p>
          </motion.div>
        )}

        {/* Map filter buttons or Active Navigation Cancel Bar */}
        {location.pathname.includes('/map') && (
          navState.isNavigating ? (
            <div className="flex items-center gap-3 bg-rose-500/15 border border-rose-500/40 rounded-xl px-3.5 py-1.5 shadow-lg">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                </span>
                <span className="text-xs font-bold text-white max-w-[220px] truncate">
                  Route to {navState.destinationTitle || 'Target'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('map-cancel-route'));
                }}
                style={{
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.75rem',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)'
                }}
                className="hover:opacity-90 active:scale-95 transition-all"
              >
                ✕ Cancel Navigation
              </button>
            </div>
          ) : (
            <div className="map-filter-bar" role="toolbar" aria-label="Map filters">
              {mapFilters.map(filter => {
                const isActive = activeMapFilter === filter.id;
                return (
                  <motion.button
                    key={filter.id}
                    type="button"
                    onClick={() => {
                      setActiveMapFilter(filter.id);
                      window.dispatchEvent(new CustomEvent('map-filter-change', { detail: filter.id }));
                    }}
                    className={`map-filter-btn ${isActive ? 'active' : ''}`}
                    data-filter={filter.id}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="map-filter-active-pill"
                        className="map-filter-active-bg"
                        transition={{
                          type: "spring",
                          stiffness: 420,
                          damping: 32
                        }}
                      />
                    )}
                    <span className="map-filter-label">{filter.label}</span>
                  </motion.button>
                );
              })}
            </div>
          )
        )}
      </div>

      <div className="topbar-right flex items-center gap-3">
        {!isHome && (
          <div className={`flex items-center gap-2 text-xs font-semibold ${geoLocation.coords ? 'text-success' : 'text-danger'}`}>
            <div className="w-2 h-2 rounded-full bg-current" />
            {geoLocation.address ? geoLocation.address : geoLocation.coords ? 'Location detected' : 'Location unavailable'}
          </div>
        )}

        <div className="flex items-center gap-2.5 ml-auto">
          {/* Operator Status Badge */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <ShieldCheck size={14} className="text-emerald-400" />
            <span className="font-semibold tracking-wide">
              {isOrgAuth ? 'Command Center' : 'System Operator'}
            </span>
          </div>

          {/* Top-Right Log Out Button */}
          <button
            type="button"
            onClick={() => {
              orgLogout();
              navigate('/organization-login', { replace: true });
            }}
            className="px-3.5 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/35 hover:border-rose-500/60 text-rose-300 hover:text-rose-100 text-xs font-bold flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
            title="Log Out of Organization Command Center"
            aria-label="Log Out of Organization Command Center"
          >
            <LogOut size={14} strokeWidth={2.2} className="text-rose-400" />
            <span>Log Out</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
