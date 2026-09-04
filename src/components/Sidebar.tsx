import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Bell,
  Map,
  Activity,
  FileText,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  PhoneCall,
  ShieldAlert
} from 'lucide-react';
import { Logo } from './ui/Logo';
import { Tooltip } from './ui/Tooltip';
import '../styles/Sidebar.css';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse?: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

const navSections = [
  {
    title: 'ORGANIZATION',
    items: [
      { label: 'Home', path: '/app', icon: <Home size={17} strokeWidth={2} />, exact: true },
      { label: 'Reports', path: '/app/reports', icon: <FileText size={17} strokeWidth={2} /> },
      { label: 'Early Warning', path: '/app/early-warning', icon: <ShieldAlert size={17} strokeWidth={2} />, hasBadge: true },
      { label: 'Disaster Map', path: '/app/map', icon: <Map size={17} strokeWidth={2} /> },
      { label: 'Volunteer Hub', path: '/app/volunteer', icon: <Users size={17} strokeWidth={2} /> },
      { label: 'Live Telemetry', path: '/app/telemetry', icon: <Activity size={17} strokeWidth={2} /> },
    ]
  },
  {
    title: 'SYSTEM',
    items: [
      { label: 'Notifications', path: '/app/notifications', icon: <Bell size={17} strokeWidth={2} /> },
      { label: 'Settings', path: '/app/settings', icon: <Settings size={17} strokeWidth={2} /> },
    ]
  }
];

const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onMobileClose
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  const isItemActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path) && path !== '/app';
  };

  return (
    <>
      {isMobileOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="sidebar-mobile-overlay"
          onClick={onMobileClose}
        />
      )}

      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}>
        {/* Brand Header */}
        <div className="sidebar-header">
          <motion.div
            className="flex items-center cursor-pointer select-none"
            onClick={() => navigate('/')}
            title="Go to Landing Page"
          >
            <div className="sidebar-brand-icon-wrapper">
              <Logo className="sidebar-brand-icon" size={24} color="#10b981" />
            </div>

            <AnimatePresence>
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={{ duration: 0.15 }}
                  className="sidebar-brand ml-3.5"
                >
                  DRISHTI
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Clean Glass Collapse Button */}
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="sidebar-collapse-btn interactive-cursor"
              aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {isCollapsed ? <ChevronRight size={13} strokeWidth={2.5} /> : <ChevronLeft size={13} strokeWidth={2.5} />}
            </button>
          )}
        </div>

        {/* Navigation Sections */}
        <div className="sidebar-content custom-sidebar-scrollbar">
          {navSections.map((section, idx) => (
            <div key={idx} className="sidebar-section">
              {!isCollapsed && (
                <div className="sidebar-section-title">
                  {section.title}
                </div>
              )}
              <nav className="sidebar-nav">
                {section.items.map((item, itemIdx) => {
                  const active = isItemActive(item.path, item.exact);

                  return (
                    <Tooltip
                      key={itemIdx}
                      content={item.label}
                      position="right"
                      disabled={!isCollapsed}
                    >
                      <NavLink
                        to={item.path}
                        end={item.exact}
                        className={({ isActive }) => `sidebar-item interactive-cursor ${isActive ? 'active' : ''}`}
                        onClick={() => {
                          if (isMobileOpen) onMobileClose();
                        }}
                      >
                        {/* Fluid Spring Inset Active Pill */}
                        {active && (
                          <motion.div
                            layoutId="sidebar-active-indicator"
                            className="sidebar-active-bg"
                            initial={false}
                            transition={{
                              type: "spring",
                              stiffness: 420,
                              damping: 35
                            }}
                          />
                        )}

                        {/* Icon */}
                        <span className="sidebar-icon z-10 relative">
                          {item.icon}
                        </span>

                        {/* Label */}
                        {!isCollapsed && (
                          <span className="sidebar-item-label z-10 relative">
                            {item.label}
                          </span>
                        )}

                        {/* Notification Dot */}
                        {item.hasBadge && (
                          <span className="sidebar-badge-dot z-10 relative" />
                        )}
                      </NavLink>
                    </Tooltip>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* Emergency Helpline Bottom Tactical Card */}
        <div className="sidebar-footer">
          <a
            href="tel:112"
            className={`emergency-helpline-card interactive-cursor ${isCollapsed ? 'collapsed' : ''}`}
            title="National Emergency Dispatch Helpline: Dial 112"
          >
            <div className="emergency-call-badge">
              <PhoneCall size={14} strokeWidth={2.5} className="text-[#f87171]" />
            </div>
            {!isCollapsed && (
              <div className="emergency-call-text">
                <span className="emergency-call-title">Emergency Helpline</span>
                <span className="emergency-call-number">Dial 112</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                  <span className="emergency-call-sub">24×7 Rapid Response</span>
                </div>
              </div>
            )}
          </a>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
