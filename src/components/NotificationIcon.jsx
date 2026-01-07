import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import './NotificationIcon.css';

const NotificationIcon = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [notificationCount, setNotificationCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const API_BASE_URL = 'https://backend-rh.azurewebsites.net';

  // Fonction pour récupérer le nombre de notifications
  const fetchNotificationCount = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/notifications/count`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setNotificationCount(data.count || 0);
      }
    } catch (error) {
      console.error('❌ Erreur récupération notifications:', error);
    }
  };

  // Fonction pour récupérer les notifications récentes
  const fetchRecentNotifications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/notifications/recent`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRecentNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('❌ Erreur récupération notifications récentes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Récupérer le nombre de notifications au chargement
  useEffect(() => {
    fetchNotificationCount();
    
    // Actualiser toutes les 30 secondes
    const interval = setInterval(fetchNotificationCount, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Récupérer les détails quand on ouvre le dropdown
  useEffect(() => {
    if (showDropdown) {
      fetchRecentNotifications();
    }
  }, [showDropdown]);

  const handleToggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  const handleViewAll = () => {
    setShowDropdown(false);
    navigate('/demandes-rh');
  };

  const handleNotificationClick = (notification) => {
    setShowDropdown(false);
    navigate('/demandes-rh');
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return t('justNow') || 'À l\'instant';
    if (diffMins < 60) return `${diffMins} ${t('minutesAgo') || 'min'}`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} ${t('hoursAgo') || 'h'}`;
    
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const getTypeIcon = (type) => {
    const icons = {
      'congé': '🏖️',
      'autorisation_absence': '⏰',
      'mission': '✈️'
    };
    return icons[type] || '📄';
  };

  return (
    <div className="notification-wrapper">
      <button 
        className={`notification-button ${notificationCount > 0 ? 'has-notifications' : ''}`}
        onClick={handleToggleDropdown}
        aria-label={t('notifications') || 'Notifications'}
      >
        <span className="notification-icon">🔔</span>
        {notificationCount > 0 && (
          <span className="notification-badge">
            {notificationCount > 99 ? '99+' : notificationCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          <div 
            className="notification-overlay" 
            onClick={() => setShowDropdown(false)}
          />
          <div className="notification-dropdown">
            <div className="notification-header">
              <h3>🔔 {t('notifications') || 'Notifications'}</h3>
              <span className="notification-count-badge">
                {notificationCount} {t('new') || 'nouvelles'}
              </span>
            </div>

            <div className="notification-list">
              {loading ? (
                <div className="notification-loading">
                  <div className="spinner-small"></div>
                  <p>{t('loading') || 'Chargement...'}</p>
                </div>
              ) : recentNotifications.length === 0 ? (
                <div className="notification-empty">
                  <span className="empty-icon">📭</span>
                  <p>{t('noNewNotifications') || 'Aucune nouvelle notification'}</p>
                </div>
              ) : (
                recentNotifications.map((notif) => (
                  <div 
                    key={notif.id}
                    className="notification-item"
                    onClick={() => handleNotificationClick(notif)}
                  >
                    <div className="notification-avatar">
                      {notif.employe_photo ? (
                        <img src={notif.employe_photo} alt="" />
                      ) : (
                        <div className="avatar-placeholder">
                          {notif.employe_prenom?.[0]}{notif.employe_nom?.[0]}
                        </div>
                      )}
                    </div>
                    <div className="notification-content">
                      <div className="notification-title">
                        <span className="type-icon">{getTypeIcon(notif.type_demande)}</span>
                        {notif.titre}
                      </div>
                      <div className="notification-subtitle">
                        {notif.employe_prenom} {notif.employe_nom}
                      </div>
                      <div className="notification-time">
                        {formatDate(notif.created_at)}
                      </div>
                    </div>
                    <div className="notification-indicator"></div>
                  </div>
                ))
              )}
            </div>

            {recentNotifications.length > 0 && (
              <div className="notification-footer">
                <button 
                  className="btn-view-all"
                  onClick={handleViewAll}
                >
                  {t('viewAll') || 'Voir toutes les demandes'} →
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationIcon;
