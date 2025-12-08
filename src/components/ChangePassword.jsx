import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import './ChangePassword.css';

const ChangePassword = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [forceChange, setForceChange] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    // Vérifier si l'utilisateur doit changer son mot de passe
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.passwordIsTemporary) {
          setForceChange(true);
          setMessage('⚠️ Votre mot de passe est temporaire. Vous devez le changer maintenant.');
        }
      } catch (e) {
        console.error('Erreur décodage token:', e);
      }
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (newPassword.length < 6) {
      setError('Le nouveau mot de passe doit contenir au moins 6 caractères');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('Les nouveaux mots de passe ne correspondent pas');
      return;
    }
    
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      const response = await authAPI.changePassword(currentPassword, newPassword);
      
      if (response.data.success) {
        setMessage('✅ Mot de passe changé avec succès !');
        
        // Rediriger après 2 secondes
        setTimeout(() => {
          if (forceChange) {
            // Recharger la page pour obtenir un nouveau token
            window.location.reload();
          } else {
            navigate('/dashboard');
          }
        }, 2000);
      } else {
        setError(response.data.message || 'Erreur lors du changement de mot de passe');
      }
    } catch (error) {
      if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else {
        setError('Erreur lors du changement de mot de passe');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    if (forceChange) {
      alert('Vous devez changer votre mot de passe temporaire pour des raisons de sécurité.');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="change-password-container">
      <div className="change-password-card">
        <div className="change-password-header">
          <h1>🔐 {forceChange ? 'Changement de mot de passe obligatoire' : 'Changer mon mot de passe'}</h1>
          {forceChange && (
            <p className="warning-text">
              ⚠️ Pour des raisons de sécurité, vous devez changer votre mot de passe temporaire.
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="change-password-form">
          {message && <div className="success-message">{message}</div>}
          {error && <div className="error-message">{error}</div>}
          
          {!forceChange && (
            <div className="form-group">
              <label htmlFor="currentPassword">Mot de passe actuel</label>
              <input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required={!forceChange}
                placeholder="Votre mot de passe actuel"
              />
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="newPassword">Nouveau mot de passe</label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              placeholder="Minimum 6 caractères"
              minLength="6"
            />
            <div className="password-hint">
              <small>Le mot de passe doit contenir au moins 6 caractères.</small>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirmer le nouveau mot de passe</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Répétez le mot de passe"
              minLength="6"
            />
          </div>

          <div className="form-actions">
            <button type="submit" disabled={loading} className="submit-btn">
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Changement en cours...
                </>
              ) : 'Changer le mot de passe'}
            </button>
            
            {!forceChange && (
              <button 
                type="button" 
                className="cancel-btn"
                onClick={handleSkip}
              >
                Annuler
              </button>
            )}
          </div>
        </form>

        <div className="change-password-footer">
          <p><strong>Conseils de sécurité :</strong></p>
          <ul>
            <li>Utilisez un mot de passe unique pour ce compte</li>
            <li>Évitez les mots de passe faciles à deviner</li>
            <li>Changez régulièrement votre mot de passe</li>
            <li>Ne partagez jamais votre mot de passe</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
