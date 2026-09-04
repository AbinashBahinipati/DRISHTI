import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  LogOut,
  LogIn,
  UserPlus,
  Moon,
  Sun,
  Laptop,
  ArrowLeft,
  CheckCircle2,
  Home as HomeIcon,
  Map as MapIcon,
  Bell,
  LifeBuoy,
  Settings as SettingsIcon,
  HardDrive
} from 'lucide-react';
import { useUserAuth } from '../hooks/useUserAuth';
import { useSettings } from '../hooks/useSettings';
import { Logo } from '../components/ui/Logo';
import '../styles/UserHome.css';
import '../styles/UserAuth.css';

export const UserSettings: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useUserAuth();
  const { settings, updateTheme } = useSettings();
  const currentTheme = settings.theme;

  const handleLogout = () => {
    logout();
    navigate('/user');
  };

  return (
    <div className="user-portal-container">
      {/* Header */}
      <header className="user-portal-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={() => navigate('/user')}
            className="user-icon-btn"
            aria-label="Back to home"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="user-header-brand">
            <Logo size={26} color="#10b981" />
            <div className="user-brand-text">
              <span className="user-brand-title">Citizen Profile</span>
              <span className="user-brand-subtitle">Account & Settings</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="user-portal-main" style={{ paddingBottom: '90px' }}>
        {/* Profile / Account Status Card */}
        <section className="user-portal-section">
          <div className="user-auth-card" style={{ marginBottom: '1rem' }}>
            {isAuthenticated && user ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '16px',
                      backgroundColor: user.avatarColor || '#10b981',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '1.4rem',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                  >
                    {user.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-text, #0f172a)' }}>
                        {user.fullName}
                      </h3>
                      <span title="Registered Citizen" style={{ color: '#10b981' }}>
                        <CheckCircle2 size={16} />
                      </span>
                    </div>
                    <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.85rem', color: 'var(--color-text-secondary, #64748b)' }}>
                      {user.emailOrPhone}
                    </p>
                    <span
                      style={{
                        display: 'inline-block',
                        marginTop: '0.375rem',
                        fontSize: '0.725rem',
                        fontWeight: 600,
                        backgroundColor: 'rgba(16, 185, 129, 0.12)',
                        color: '#059669',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '6px'
                      }}
                    >
                      Verified Citizen ID: {user.id}
                    </span>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--color-border, #e2e8f0)', paddingTop: '1rem' }}>
                  <button
                    type="button"
                    onClick={handleLogout}
                    style={{
                      width: '100%',
                      height: '44px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      color: '#dc2626',
                      borderRadius: '12px',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      cursor: 'pointer'
                    }}
                  >
                    <LogOut size={16} />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <div
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '16px',
                      backgroundColor: 'var(--color-bg, #f1f5f9)',
                      border: '1px solid var(--color-border, #cbd5e1)',
                      color: 'var(--color-text-secondary, #64748b)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <User size={24} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text, #0f172a)' }}>
                      Guest Citizen Mode
                    </h3>
                    <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.8rem', color: 'var(--color-text-secondary, #64748b)' }}>
                      Full access to safety features and incident reporting active
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  <button
                    type="button"
                    className="user-auth-btn-primary"
                    onClick={() => navigate('/user/signup')}
                    style={{ height: '44px', fontSize: '0.9rem' }}
                  >
                    <UserPlus size={16} />
                    <span>Create Account</span>
                  </button>

                  <button
                    type="button"
                    className="user-auth-btn-guest"
                    onClick={() => navigate('/user/login')}
                    style={{ height: '44px', fontSize: '0.9rem' }}
                  >
                    <LogIn size={16} />
                    <span>Log In to Existing Account</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Appearance & Theme Setting */}
        <section className="user-portal-section">
          <h2 className="user-section-title">
            <Sun size={18} className="text-amber-500" />
            <span>Theme & Display</span>
          </h2>

          <div className="user-auth-card" style={{ padding: '1rem' }}>
            <div className="user-theme-grid">
              <button
                type="button"
                onClick={() => updateTheme('system')}
                className={`user-theme-btn ${currentTheme === 'system' ? 'active' : ''}`}
                aria-label="Set theme to system default"
              >
                <Laptop size={18} />
                <span>System</span>
              </button>

              <button
                type="button"
                onClick={() => updateTheme('light')}
                className={`user-theme-btn ${currentTheme === 'light' ? 'active' : ''}`}
                aria-label="Set theme to light mode"
              >
                <Sun size={18} />
                <span>Light</span>
              </button>

              <button
                type="button"
                onClick={() => updateTheme('dark')}
                className={`user-theme-btn ${currentTheme === 'dark' ? 'active' : ''}`}
                aria-label="Set theme to dark mode"
              >
                <Moon size={18} />
                <span>Dark</span>
              </button>
            </div>
          </div>
        </section>

        {/* Offline & Data Storage */}
        <section className="user-portal-section">
          <h2 className="user-section-title">
            <HardDrive size={18} className="text-blue-500" />
            <span>Offline-First Storage</span>
          </h2>

          <div className="user-auth-card" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ color: '#10b981' }}>
                <CheckCircle2 size={20} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text, #0f172a)' }}>
                  Local Disaster Cache Active
                </h4>
                <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.775rem', color: 'var(--color-text-secondary, #64748b)' }}>
                  Offline emergency guides, nearby facility lists, and pending incident sync are stored locally.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Bottom Navigation */}
      <nav className="user-bottom-nav" aria-label="Citizen Navigation Bar">
        <button
          type="button"
          className="user-nav-item"
          onClick={() => navigate('/user')}
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
          className="user-nav-item active"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <SettingsIcon size={18} />
          <span>SETTINGS</span>
        </button>
      </nav>
    </div>
  );
};

export default UserSettings;
