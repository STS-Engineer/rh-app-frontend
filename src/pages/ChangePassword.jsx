import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authAPI } from '../services/api';
import './ChangePassword.css';

const ChangePassword = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/dashboard';
  
  // Vérifier si le mot de passe est temporaire
  const isTemporaryPassword = () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.passwordIsTemporary === true;
      } catch (e) {
        console.error('Erreur décodage token:', e);
      }
    }
    return false;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('🔄 Début du changement de mot de passe...');
    console.log('Données:', { currentPassword, newPassword, confirmPassword });
    
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
      const isTemporary = isTemporaryPassword();
      console.log('Mot de passe temporaire?', isTemporary);
      
      // Si le mot de passe est temporaire, on n'envoie pas currentPassword
      const dataToSend = isTemporary ? { newPassword } : { currentPassword, newPassword };
      
      console.log('Données envoyées au serveur:', dataToSend);
      console.log('Token présent:', !!localStorage.getItem('token'));
      
      const response = await authAPI.changePassword(
        isTemporary ? '' : currentPassword, 
        newPassword
      );
      
      console.log('Réponse du serveur:', response.data);
      
      if (response.data.success) {
        setMessage('✅ Mot de passe changé avec succès !');
        
        // Mettre à jour le token si disponible dans la réponse
        if (response.data.token) {
          localStorage.setItem('token', response.data.token);
          console.log('Token mis à jour');
        }
        
        // Rediriger après 2 secondes
        setTimeout(() => {
          navigate(from, { replace: true });
        }, 2000);
      } else {
        setError(response.data.message || 'Erreur lors du changement de mot de passe');
      }
    } catch (error) {
      console.error('Erreur complète:', error);
      console.error('Réponse d\'erreur:', error.response?.data);
      
      if (error.response?.status === 401) {
        setError('Mot de passe actuel incorrect');
      } else if (error.response?.status === 400) {
        setError(error.response.data.message || 'Données invalides');
      } else if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else if (error.message) {
        setError(error.message);
      } else {
        setError('Erreur de connexion au serveur');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  const isTemporary = isTemporaryPassword();

  return (
    <div className="change-password-container">
      <div className="change-password-card">
        <div className="change-password-header">
          <h1>🔐 {isTemporary ? 'Changement de mot de passe obligatoire' : 'Changer mon mot de passe'}</h1>
          
          {isTemporary && (
            <div className="security-warning">
              <p className="warning-icon">⚠️</p>
              <p className="warning-text">
                <strong>Pour des raisons de sécurité</strong>, vous devez changer votre mot de passe temporaire avant d'accéder à l'application.
              </p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="change-password-form">
          {message && <div className="success-message">{message}</div>}
          {error && <div className="error-message">{error}</div>}
          
          {!isTemporary && (
            <div className="form-group">
              <label htmlFor="currentPassword">Mot de passe actuel *</label>
              <input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required={!isTemporary}
                placeholder="Votre mot de passe actuel"
                disabled={loading}
                autoComplete="current-password"
              />
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="newPassword">Nouveau mot de passe *</label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              placeholder="Minimum 6 caractères"
              minLength="6"
              disabled={loading}
              autoComplete="new-password"
            />
            <div className="password-hint">
              <small>Utilisez au moins 6 caractères. Pour plus de sécurité, combinez lettres, chiffres et caractères spéciaux.</small>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirmer le nouveau mot de passe *</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Répétez le mot de passe"
              minLength="6"
              disabled={loading}
              autoComplete="new-password"
            />
          </div>

          <div className="form-actions">
            <button 
              type="submit" 
              disabled={loading} 
              className="submit-btn"
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Changement en cours...
                </>
              ) : 'Changer le mot de passe'}
            </button>
            
            {!isTemporary && (
              <>
                <button 
                  type="button" 
                  className="cancel-btn"
                  onClick={() => navigate('/dashboard')}
                  disabled={loading}
                >
                  Annuler
                </button>
                
                <button 
                  type="button" 
                  className="logout-btn"
                  onClick={handleLogout}
                  disabled={loading}
                >
                  Se déconnecter
                </button>
              </>
            )}
          </div>
        </form>

        <div className="change-password-footer">
          <div className="security-tips">
            <h3>💡 Conseils pour un mot de passe sécurisé :</h3>
            <ul>
              <li>Utilisez au moins 8 caractères</li>
              <li>Combinez lettres majuscules et minuscules</li>
              <li>Ajoutez des chiffres et caractères spéciaux (!@#$%^&*)</li>
              <li>Évitez les mots du dictionnaire ou informations personnelles</li>
              <li>Ne réutilisez pas d'anciens mots de passe</li>
            </ul>
          </div>
          
          {isTemporary && (
            <div className="temporary-password-info">
              <p><strong>Pourquoi dois-je changer mon mot de passe ?</strong></p>
              <p>
                Vous avez utilisé la fonction "Mot de passe oublié" et avez reçu un mot de passe temporaire par email. 
                Pour protéger votre compte, vous devez choisir un nouveau mot de passe personnel.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
