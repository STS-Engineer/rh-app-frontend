import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import './Login.css';
import logoo from './logo_sts.png';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // ✅ NEW
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotError, setForgotError] = useState('');

  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authAPI.login(email, password, rememberMe);

      if (response.data.success) {
        const token = response.data.token;

        // ✅ Remember me storage behavior
        if (rememberMe) {
          localStorage.setItem('token', token);
          sessionStorage.removeItem('token');
        } else {
          sessionStorage.setItem('token', token);
          localStorage.removeItem('token');
        }

        navigate('/dashboard');
      } else {
        setError(t('emailPasswordIncorrect'));
      }
    } catch (error) {
      if (error.response?.status === 401) {
        setError(t('emailPasswordIncorrect'));
      } else if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else {
        setError(t('connectionError'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotMessage('');
    setForgotError('');

    try {
      const response = await authAPI.sendNewPassword(forgotEmail);

      if (response.data.success) {
        setForgotMessage(t('newPasswordSent'));
        setForgotEmail('');

        setTimeout(() => {
          setShowForgotPassword(false);
          setForgotMessage('');
        }, 5000);
      } else {
        setForgotError(response.data.message || t('errorOccurred'));
      }
    } catch (error) {
      if (error.response?.data?.message) {
        setForgotError(error.response.data.message);
      } else if (error.response?.data?.error) {
        setForgotError(error.response.data.error);
      } else {
        setForgotError(t('sendRequestError'));
      }
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <img src={logoo} alt="Logo" className="header-logo" />
          <p>{t('loginToYourAccount')}</p>
        </div>

        {!showForgotPassword ? (
          <form onSubmit={handleSubmit} className="login-form">
            {error && <div className="error-message">{error}</div>}

            <div className="form-group">
              <label htmlFor="email">{t('email')}</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="votre@email.com"
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">{t('password')}</label>

              <div className="password-field">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder={t('yourPassword')}
                  autoComplete="current-password"
                />

                <button
                  type="button"
                  className="toggle-password-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? (t('hidePassword') || 'Hide password') : (t('showPassword') || 'Show password')}
                  title={showPassword ? (t('hidePassword') || 'Hide password') : (t('showPassword') || 'Show password')}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div className="remember-row">
              <label className="remember-me">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>{t('rememberMe') || 'Remember me (30 days)'}</span>
              </label>
            </div>

            <button type="submit" disabled={loading} className="login-btn">
              {loading ? (
                <>
                  <span className="spinner"></span>
                  {t('loggingIn')}
                </>
              ) : (
                t('login')
              )}
            </button>

            <div className="forgot-password-link">
              <button
                type="button"
                className="forgot-btn"
                onClick={() => setShowForgotPassword(true)}
              >
                {t('forgotPassword')}
              </button>
            </div>
          </form>
        ) : (
          <div className="forgot-password-form">
            <h3>🔐 {t('forgotPassword')}</h3>
            <p>{t('enterEmailForNewPassword')}</p>

            <form onSubmit={handleForgotPassword}>
              {forgotMessage && <div className="success-message">{forgotMessage}</div>}
              {forgotError && <div className="error-message">{forgotError}</div>}

              <div className="form-group">
                <label htmlFor="forgot-email">{t('email')}</label>
                <input
                  id="forgot-email"
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  placeholder="votre@email.com"
                  autoComplete="email"
                />
              </div>

              <div className="forgot-password-actions">
                <button type="submit" disabled={forgotLoading} className="forgot-submit-btn">
                  {forgotLoading ? (
                    <>
                      <span className="spinner"></span>
                      {t('sending')}
                    </>
                  ) : (
                    t('sendNewPassword')
                  )}
                </button>

                <button
                  type="button"
                  className="back-to-login-btn"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotEmail('');
                    setForgotMessage('');
                    setForgotError('');
                  }}
                >
                  {t('backToLogin')}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="login-footer">
          <p>{t('appDescription')}</p>
          <p className="version">{t('version')} 1.0.0</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
