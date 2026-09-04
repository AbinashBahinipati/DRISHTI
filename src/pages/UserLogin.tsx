import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Mail, Lock, CheckCircle2, AlertCircle, Eye, EyeOff, Compass, ArrowLeft, Loader2, LogIn } from 'lucide-react';
import { useUserAuth } from '../hooks/useUserAuth';
import { Logo } from '../components/ui/Logo';
import '../styles/UserAuth.css';

export const UserLogin: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, continueAsGuest } = useUserAuth();

  const state = location.state as { accountCreated?: boolean; emailOrPhone?: string } | null;
  const [emailOrPhone, setEmailOrPhone] = useState(state?.emailOrPhone || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!emailOrPhone.trim()) {
      setErrorMessage('Please enter your email or phone number.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    const result = await login(emailOrPhone, password);
    setIsSubmitting(false);

    if (!result.success) {
      setErrorMessage(result.error || 'Login failed. Please check your credentials.');
    } else {
      navigate('/user');
    }
  };

  const handleContinueAsGuest = () => {
    continueAsGuest();
    navigate('/user');
  };

  return (
    <div className="user-auth-page">
      <div className="user-auth-container">
        {/* Top Header */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.25rem', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={() => navigate('/user/welcome')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text, #0f172a)',
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              padding: '0.25rem'
            }}
            aria-label="Back to welcome"
          >
            <ArrowLeft size={22} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Logo size={24} color="#10b981" />
            <span style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.01em' }}>DRISHTI</span>
          </div>
        </div>

        <div className="user-auth-header" style={{ marginBottom: '1.25rem', paddingTop: '0' }}>
          <h1 className="user-auth-title" style={{ fontSize: '1.5rem' }}>Welcome Back</h1>
          <p className="user-auth-subtitle">Log in to your DRISHTI citizen account</p>
        </div>

        {/* Account Created Success Banner */}
        {state?.accountCreated && (
          <div className="user-auth-alert success">
            <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>Account created successfully! Please enter your password to log in.</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="user-auth-alert error">
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <div className="user-auth-card">
          <form className="user-auth-form" onSubmit={handleSubmit}>
            {/* Email or Phone */}
            <div className="user-auth-field">
              <label className="user-auth-label" htmlFor="login-email-phone">Email or Phone Number</label>
              <div className="user-auth-input-wrapper">
                <Mail size={18} className="user-auth-input-icon" />
                <input
                  id="login-email-phone"
                  type="text"
                  className="user-auth-input"
                  placeholder="name@example.com or +91 9876543210"
                  value={emailOrPhone}
                  onChange={(e) => setEmailOrPhone(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="user-auth-field">
              <label className="user-auth-label" htmlFor="login-password">Password</label>
              <div className="user-auth-input-wrapper">
                <Lock size={18} className="user-auth-input-icon" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="user-auth-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="user-auth-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="user-auth-btn-primary"
              disabled={isSubmitting}
              style={{ marginTop: '0.5rem' }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Logging in...</span>
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  <span>Login</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Alternative Actions */}
        <div className="user-auth-actions">
          <button
            type="button"
            className="user-auth-btn-guest"
            onClick={handleContinueAsGuest}
          >
            <Compass size={18} />
            <span>Continue as Guest</span>
          </button>

          <button
            type="button"
            className="user-auth-switch-link"
            onClick={() => navigate('/user/signup')}
          >
            Don't have an account? Create Account
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserLogin;
