import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Bell, AlertTriangle, Compass, UserCheck, ShieldAlert } from 'lucide-react';
import { useUserAuth } from '../hooks/useUserAuth';
import { Logo } from '../components/ui/Logo';
import '../styles/UserAuth.css';

export const UserWelcome: React.FC = () => {
  const navigate = useNavigate();
  const { continueAsGuest } = useUserAuth();

  const handleContinueAsGuest = () => {
    continueAsGuest();
    navigate('/user');
  };

  const handleCreateAccount = () => {
    navigate('/user/signup');
  };

  const handleLogin = () => {
    navigate('/user/login');
  };

  return (
    <div className="user-auth-page">
      <div className="user-auth-container">
        {/* Brand Header */}
        <div className="user-auth-header">
          <div className="user-auth-badge-icon">
            <Logo size={36} color="#10b981" />
          </div>
          <h1 className="user-auth-title">Welcome to DRISHTI</h1>
          <p className="user-auth-subtitle">Stay informed. Stay prepared. Stay safe.</p>
        </div>

        {/* Feature Highlights for Citizens */}
        <div className="user-auth-features">
          <div className="user-auth-feature-item">
            <div className="user-auth-feature-icon emerald">
              <Bell size={20} />
            </div>
            <div className="user-auth-feature-text">
              <h4>Real-Time Hazard Alerts</h4>
              <p>Instant localized weather, flood, and cyclone warnings</p>
            </div>
          </div>

          <div className="user-auth-feature-item">
            <div className="user-auth-feature-icon blue">
              <ShieldCheck size={20} />
            </div>
            <div className="user-auth-feature-text">
              <h4>Emergency Help & Shelters</h4>
              <p>Direct SOS lines and verified nearest relief shelters</p>
            </div>
          </div>

          <div className="user-auth-feature-item">
            <div className="user-auth-feature-icon amber">
              <AlertTriangle size={20} />
            </div>
            <div className="user-auth-feature-text">
              <h4>Community Incident Reporting</h4>
              <p>Report hazards and waterlogging directly to responders</p>
            </div>
          </div>
        </div>

        {/* Two Clear Options */}
        <div className="user-auth-actions">
          <button
            type="button"
            className="user-auth-btn-primary"
            onClick={handleCreateAccount}
          >
            <UserCheck size={18} />
            <span>CREATE ACCOUNT</span>
          </button>

          <button
            type="button"
            className="user-auth-btn-guest"
            onClick={handleContinueAsGuest}
          >
            <Compass size={18} />
            <span>CONTINUE AS GUEST</span>
          </button>

          <button
            type="button"
            className="user-auth-switch-link"
            onClick={handleLogin}
          >
            Already have an account? Login
          </button>
        </div>
      </div>

      {/* Emergency Notice */}
      <footer className="user-auth-footer">
        <div className="user-auth-emergency-badge">
          <ShieldAlert size={14} />
          <span>Emergency services accessible 24/7 without login</span>
        </div>
      </footer>
    </div>
  );
};

export default UserWelcome;
