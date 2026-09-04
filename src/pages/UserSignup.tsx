import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Lock, AlertCircle, Eye, EyeOff, Compass, ArrowLeft, Loader2 } from 'lucide-react';
import { useUserAuth } from '../hooks/useUserAuth';
import { Logo } from '../components/ui/Logo';
import '../styles/UserAuth.css';

export const UserSignup: React.FC = () => {
  const navigate = useNavigate();
  const { register, continueAsGuest } = useUserAuth();

  const [fullName, setFullName] = useState('');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate form fields
  const validate = (): string | null => {
    if (!fullName.trim()) return 'Please enter your full name.';
    if (!emailOrPhone.trim()) return 'Please enter your email address or mobile number.';
    
    // Check email or phone format
    const cleanId = emailOrPhone.trim();
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanId);
    const isPhone = /^[0-9+\s()-]{7,15}$/.test(cleanId);
    if (!isEmail && !isPhone) {
      return 'Please enter a valid email address or phone number.';
    }

    if (password.length < 6) {
      return 'Password must be at least 6 characters long.';
    }
    if (password !== confirmPassword) {
      return 'Passwords do not match.';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const error = validate();
    if (error) {
      setErrorMessage(error);
      return;
    }

    setIsSubmitting(true);
    const result = await register(fullName, emailOrPhone, password);
    setIsSubmitting(false);

    if (!result.success) {
      setErrorMessage(result.error || 'Failed to create account.');
    } else {
      // Redirect to Login page with prefilled email/phone and success state
      navigate('/user/login', {
        state: {
          accountCreated: true,
          emailOrPhone: emailOrPhone.trim()
        }
      });
    }
  };

  const handleContinueAsGuest = () => {
    continueAsGuest();
    navigate('/user');
  };

  return (
    <div className="user-auth-page">
      <div className="user-auth-container">
        {/* Header with back button */}
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
          <h1 className="user-auth-title" style={{ fontSize: '1.5rem' }}>Create Account</h1>
          <p className="user-auth-subtitle">Join the citizen disaster resilience network</p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="user-auth-alert error">
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form Card */}
        <div className="user-auth-card">
          <form className="user-auth-form" onSubmit={handleSubmit}>
            {/* Full Name */}
            <div className="user-auth-field">
              <label className="user-auth-label" htmlFor="full-name">Full Name</label>
              <div className="user-auth-input-wrapper">
                <User size={18} className="user-auth-input-icon" />
                <input
                  id="full-name"
                  type="text"
                  className="user-auth-input"
                  placeholder="e.g. Ramesh Chandra"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>
            </div>

            {/* Email or Phone */}
            <div className="user-auth-field">
              <label className="user-auth-label" htmlFor="email-phone">Email or Phone Number</label>
              <div className="user-auth-input-wrapper">
                <Mail size={18} className="user-auth-input-icon" />
                <input
                  id="email-phone"
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
              <label className="user-auth-label" htmlFor="password">Password</label>
              <div className="user-auth-input-wrapper">
                <Lock size={18} className="user-auth-input-icon" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="user-auth-input"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
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

            {/* Confirm Password */}
            <div className="user-auth-field">
              <label className="user-auth-label" htmlFor="confirm-password">Confirm Password</label>
              <div className="user-auth-input-wrapper">
                <Lock size={18} className="user-auth-input-icon" />
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="user-auth-input"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="user-auth-password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
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
                  <span>Creating Account...</span>
                </>
              ) : (
                <span>Create Account</span>
              )}
            </button>
          </form>
        </div>

        {/* Alternative Options */}
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
            onClick={() => navigate('/user/login')}
          >
            Already have an account? Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserSignup;
