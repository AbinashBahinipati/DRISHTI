import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, Lock, User, ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import { useOrgAuth } from '../hooks/useOrgAuth';
import { Logo } from '../components/ui/Logo';
import '../styles/OrganizationLogin.css';

export const OrganizationLogin: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, isAuthenticated } = useOrgAuth();

  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // If already authenticated, redirect to /app
  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as any)?.from?.pathname || '/app';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanId = loginId.trim();
    const cleanPass = password.trim();

    if (!cleanId || !cleanPass) {
      setErrorMessage('Please enter both your Organization Login ID and Password.');
      return;
    }

    const result = await login(cleanId, cleanPass);
    if (result.success) {
      const from = (location.state as any)?.from?.pathname || '/app';
      navigate(from, { replace: true });
    } else {
      setErrorMessage(result.error || 'Authentication failed. Please check your credentials.');
    }
  };

  return (
    <div className="org-login-page">
      <div className="org-login-bg-glow" />

      <div className="org-login-wrapper">
        {/* Top Header & Branding */}
        <div className="org-login-header">
          <div className="org-login-badge-icon">
            <Logo size={28} />
          </div>
          <div className="org-login-brand-title">DRISHTI</div>
          <h1 className="org-login-page-title">Organization Sign In</h1>
          <p className="org-login-subtitle">Secure Command Center Access</p>
        </div>

        {/* Centered Login Card */}
        <div className="org-login-card">
          {errorMessage && (
            <div className="org-login-error" role="alert">
              <AlertCircle size={16} className="org-login-error-icon" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="org-login-form">
            {/* Organization Login ID Input */}
            <div className="org-form-group">
              <label htmlFor="org-login-id" className="org-form-label">
                Organization Login ID
              </label>
              <div className="org-input-wrapper">
                <span className="org-input-icon">
                  <User size={16} />
                </span>
                <input
                  id="org-login-id"
                  type="text"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder="Enter organization ID"
                  autoComplete="username"
                  autoCapitalize="none"
                  disabled={isLoading}
                  className="org-form-input"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="org-form-group">
              <label htmlFor="org-password" className="org-form-label">
                Security Password
              </label>
              <div className="org-input-wrapper">
                <span className="org-input-icon">
                  <Lock size={16} />
                </span>
                <input
                  id="org-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  disabled={isLoading}
                  className="org-form-input"
                  required
                />
              </div>
            </div>

            {/* Authenticate Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="org-login-btn"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <Shield size={16} />
                  <span>Sign In to Command Center</span>
                </>
              )}
            </button>
          </form>

          {/* Compact Informational Security Notice */}
          <div className="org-security-notice">
            <Lock size={14} className="org-security-notice-icon" />
            <div className="org-security-notice-text">
              <strong>Access Restricted:</strong> Organization access is provisioned by DRISHTI Administration only.
            </div>
          </div>
        </div>

        {/* Switch to Citizen Portal */}
        <div className="org-switch-portal">
          <button
            type="button"
            onClick={() => navigate('/user')}
            className="org-switch-portal-btn"
          >
            <ArrowLeft size={13} />
            <span>Switch to Citizen Safety Portal</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrganizationLogin;
