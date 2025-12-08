import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotError, setForgotError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authAPI.login(email, password);
      
      if (response.data.success) {
        localStorage.setItem('token', response.data.token);
        navigate('/dashboard');
      } else {
        setError('Email ou mot de passe incorrect');
      }
    } catch (error) {
      if (error.response?.status === 401) {
        setError('Email ou mot de passe incorrect');
      } else if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else {
        setError('Erreur de connexion. Veuillez réessayer.');
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
        setForgotMessage('✅ Un nouveau mot de passe a été envoyé à votre adresse email.');
        setForgotEmail('');
        
        // Cacher le formulaire après 5 secondes
        setTimeout(() => {
          setShowForgotPassword(false);
          setForgotMessage('');
        }, 5000);
      } else {
        setForgotError(response.data.message || 'Une erreur est survenue');
      }
    } catch (error) {
      if (error.response?.data?.message) {
        setForgotError(error.response.data.message);
      } else if (error.response?.data?.error) {
        setForgotError(error.response.data.error);
      } else {
        setForgotError('Erreur lors de l\'envoi de la demande. Veuillez réessayer.');
      }
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>🏢 RH Manager</h1>
          <p>Connectez-vous à votre espace</p>
        </div>

        {!showForgotPassword ? (
          <>
            <form onSubmit={handleSubmit} className="login-form">
              {error && <div className="error-message">{error}</div>}
              
              <div className="form-group">
                <label htmlFor="email">Email</label>
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
                <label htmlFor="password">Mot de passe</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Votre mot de passe"
                  autoComplete="current-password"
                />
              </div>

              <button type="submit" disabled={loading} className="login-btn">
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Connexion...
                  </>
                ) : 'Se connecter'}
              </button>

              <div className="forgot-password-link">
                <button 
                  type="button" 
                  className="forgot-btn"
                  onClick={() => setShowForgotPassword(true)}
                >
                  Mot de passe oublié ?
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="forgot-password-form">
            <h3>🔐 Mot de passe oublié</h3>
            <p>Entrez votre adresse email pour recevoir un nouveau mot de passe.</p>
            
            <form onSubmit={handleForgotPassword}>
              {forgotMessage && <div className="success-message">{forgotMessage}</div>}
              {forgotError && <div className="error-message">{forgotError}</div>}
              
              <div className="form-group">
                <label htmlFor="forgot-email">Email</label>
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
                <button 
                  type="submit" 
                  disabled={forgotLoading} 
                  className="forgot-submit-btn"
                >
                  {forgotLoading ? (
                    <>
                      <span className="spinner"></span>
                      Envoi en cours...
                    </>
                  ) : 'Envoyer un nouveau mot de passe'}
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
                  Retour à la connexion
                </button>
              </div>
            </form>
            
            <div className="forgot-password-info">
              <p><small>⚠️ Un email contenant un nouveau mot de passe vous sera envoyé.</small></p>
              <p><small>⚠️ Ce mot de passe est temporaire, changez-le après connexion.</small></p>
              <p><small>⚠️ Vérifiez vos spams si vous ne recevez pas l'email.</small></p>
            </div>
          </div>
        )}

        <div className="login-footer">
          <p>Application de gestion des ressources humaines</p>
          <p className="version">Version 1.0.0</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
