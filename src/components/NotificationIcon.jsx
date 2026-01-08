import React, { useState, useEffect, useCallback } from 'react';
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
  const [notificationsRead, setNotificationsRead] = useState(() => {
    // Récupérer l'état depuis localStorage
    const saved = localStorage.getItem('notificationsRead');
    return saved ? JSON.parse(saved) : false;
  });

  const API_BASE_URL = 'https://backend-rh.azurewebsites.net';

  // Fonction pour récupérer le nombre de notifications
  const fetchNotificationCount = useCallback(async () => {
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
        const newCount = data.count || 0;
        setNotificationCount(newCount);
        
        // Mettre à jour localStorage si pas de notifications
        if (newCount === 0) {
          localStorage.setItem('notificationsRead', 'true');
          setNotificationsRead(true);
        }
      }
    } catch (error) {
      console.error('❌ Erreur récupération notifications:', error);
    }
  }, []);

  // Fonction pour marquer toutes les notifications comme lues
  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // Appel API pour marquer toutes comme lues
      const response = await fetch(`${API_BASE_URL}/api/notifications/mark-all-read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Réinitialiser le compteur
        setNotificationCount(0);
        
        // Mettre à jour l'état local
        setNotificationsRead(true);
        localStorage.setItem('notificationsRead', 'true');
        
        // Mettre à jour les notifications affichées
        setRecentNotifications(prev => 
          prev.map(notif => ({ ...notif, read: true }))
        );
        
        console.log('✅ Toutes les notifications marquées comme lues');
      }
    } catch (error) {
      console.error('❌ Erreur marquer comme lu:', error);
    }
  };

  // Fonction pour marquer une notification spécifique comme lue
  const markNotificationAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/notifications/${notificationId}/mark-read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Mettre à jour l'état local
        setRecentNotifications(prev =>
          prev.map(notif =>
            notif.id === notificationId ? { ...notif, read: true } : notif
          )
        );
        
        // Décrémenter le compteur
        setNotificationCount(prev => Math.max(0, prev - 1));
        
        // Vérifier si toutes sont lues
        const allRead = recentNotifications.every(n => n.read || n.id === notificationId);
        if (allRead && notificationCount <= 1) {
          setNotificationsRead(true);
          localStorage.setItem('notificationsRead', 'true');
        }
      }
    } catch (error) {
      console.error('❌ Erreur marquer notification comme lue:', error);
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
        const notifications = data.notifications || [];
        setRecentNotifications(notifications);
        
        // Vérifier si toutes les notifications sont lues
        const allRead = notifications.every(n => n.read);
        if (allRead && notificationCount === 0) {
          setNotificationsRead(true);
          localStorage.setItem('notificationsRead', 'true');
        }
      }
    } catch (error) {
      console.error('❌ Erreur récupération notifications récentes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Récupérer le nombre de notifications au chargement et périodiquement
  useEffect(() => {
    fetchNotificationCount();
    
    // Actualiser toutes les 30 secondes
    const interval = setInterval(fetchNotificationCount, 30000);
    
    return () => clearInterval(interval);
  }, [fetchNotificationCount]);

  // Récupérer les détails quand on ouvre le dropdown
  useEffect(() => {
    if (showDropdown) {
      fetchRecentNotifications();
    }
  }, [showDropdown]);

  // Synchroniser l'état avec le backend quand le compteur change
  useEffect(() => {
    if (notificationCount === 0) {
      setNotificationsRead(true);
      localStorage.setItem('notificationsRead', 'true');
    } else {
      setNotificationsRead(false);
      localStorage.setItem('notificationsRead', 'false');
    }
  }, [notificationCount]);

  const handleToggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  const handleViewAll = async () => {
    // Marquer toutes comme lues avant de naviguer
    if (notificationCount > 0) {
      await markAllAsRead();
    }
    
    setShowDropdown(false);
    navigate('/demandes-rh');
  };

  const handleNotificationClick = async (notification) => {
    // Marquer cette notification comme lue
    if (!notification.read) {
      await markNotificationAsRead(notification.id);
    }
    
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
      'mission': '✈️',
      'visa': '🛂',
      'conge': '🏖️'
    };
    return icons[type] || '📄';
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  // Calculer le nombre de notifications non lues dans la liste
  const unreadInList = recentNotifications.filter(n => !n.read).length;

  return (
    <div className="notification-wrapper">
      <button 
        className={`notification-button ${notificationCount > 0 ? 'has-notifications' : ''}`}
        onClick={handleToggleDropdown}
        aria-label={t('notifications') || 'Notifications'}
        title={notificationCount > 0 ? `${notificationCount} nouvelle(s) notification(s)` : 'Aucune nouvelle notification'}
        
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
              {notificationCount > 0 && (
                <div className="notification-header-actions">
                  <span className="notification-count-badge">
                    {unreadInList > 0 ? `${unreadInList} non lues` : 'Toutes lues'}
                  </span>
                  {unreadInList > 0 && (
                    <button 
                      className="btn-mark-read"
                      onClick={handleMarkAllRead}
                      title="Marquer toutes comme lues"
                    >
                      ✓
                    </button>
                  )}
                </div>
              )}
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
                recentNotifications.map((notif, index) => (
                  <div 
                    key={notif.id}
                    className={`notification-item ${notif.read ? 'read' : 'unread'}`}
                    onClick={() => handleNotificationClick(notif)}
                    style={{ '--item-index': index }}
                  >
                    <div className="notification-avatar">
                      {notif.employe_photo ? (
                        <img 
                          src={notif.employe_photo} 
                          alt="" 
                          onError={(e) => {
                            e.target.style.display = 'none';
                            const placeholder = e.target.parentElement.querySelector('.avatar-placeholder-fallback');
                            if (placeholder) placeholder.style.display = 'flex';
                          }} 
                        />
                      ) : (
                        <div className="avatar-placeholder">
                          {notif.employe_prenom?.[0] || 'E'}{notif.employe_nom?.[0] || 'M'}
                        </div>
                      )}
                      <div className="avatar-placeholder-fallback" style={{ display: 'none' }}>
                        {notif.employe_prenom?.[0] || 'E'}{notif.employe_nom?.[0] || 'M'}
                      </div>
                    </div>
                    <div className="notification-content">
                      <div className="notification-title">
                        <span className="type-icon">{getTypeIcon(notif.type_demande)}</span>
                        <span className="title-text">{notif.titre || 'Nouvelle demande'}</span>
                      </div>
                      <div className="notification-subtitle">
                        {notif.employe_prenom || 'Employé'} {notif.employe_nom || ''}
                      </div>
                      <div className="notification-time">
                        {formatDate(notif.created_at)}
                      </div>
                    </div>
                    {!notif.read && (
                      <div className="notification-indicator"></div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="notification-footer">
              <button 
                className="btn-view-all"
                onClick={handleViewAll}
              >
                {t('viewAll') || 'Voir toutes les demandes'} →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationIcon;
