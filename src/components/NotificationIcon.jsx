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
  const [hasNewNotifications, setHasNewNotifications] = useState(false);
  const [notificationsRead, setNotificationsRead] = useState(false);

  const API_BASE_URL = 'https://backend-rh.azurewebsites.net';

  // Fonction pour récupérer le nombre de notifications
  const fetchNotificationCount = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      console.log('🔔 Fetching notification count...');
      const response = await fetch(`${API_BASE_URL}/api/notifications/count`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const newCount = data.count || 0;
        console.log(`🔔 Notification count: ${newCount}`);
        setNotificationCount(newCount);
        
        // Déterminer s'il y a de nouvelles notifications
        if (newCount > 0 && !notificationsRead) {
          setHasNewNotifications(true);
        } else {
          setHasNewNotifications(false);
        }
      }
    } catch (error) {
      console.error('❌ Erreur récupération notifications:', error);
    }
  };

  // Fonction pour marquer toutes les notifications comme lues
  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      console.log('✅ Marquer toutes les notifications comme lues');
      
      // Pour votre backend actuel, on va simplement mettre à jour l'état local
      // Si vous ajoutez un endpoint pour marquer comme lu, utilisez-le ici
      
      // Pour l'instant, on réinitialise juste le compteur
      setNotificationCount(0);
      setHasNewNotifications(false);
      setNotificationsRead(true);
      
      // Marquer les notifications comme lues localement
      setRecentNotifications(prev => 
        prev.map(notif => ({ ...notif, read: true }))
      );
      
    } catch (error) {
      console.error('❌ Erreur marquer comme lu:', error);
    }
  };

  // Fonction pour récupérer les notifications récentes
  const fetchRecentNotifications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      console.log('🔔 Fetching recent notifications...');
      const response = await fetch(`${API_BASE_URL}/api/notifications/recent`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`🔔 ${data.notifications?.length || 0} notifications récentes`);
        setRecentNotifications(data.notifications || []);
        
        // Vérifier si des notifications sont non lues
        const unreadCount = data.notifications?.length || 0;
        if (unreadCount === 0) {
          setHasNewNotifications(false);
        }
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

  // Marquer comme lu quand on ferme le dropdown
  useEffect(() => {
    if (!showDropdown && hasNewNotifications) {
      // On ne marque pas automatiquement, seulement quand l'utilisateur clique
    }
  }, [showDropdown, hasNewNotifications]);

  const handleToggleDropdown = () => {
    const newShowDropdown = !showDropdown;
    setShowDropdown(newShowDropdown);
    
    // Si on ouvre le dropdown et qu'il y a des nouvelles notifications, on les marque comme lues
    if (newShowDropdown && hasNewNotifications) {
      // On pourrait marquer ici, mais on laisse l'utilisateur le faire manuellement
    }
  };

  const handleViewAll = () => {
    setShowDropdown(false);
    
    // Marquer comme lues quand on va sur la page des demandes
    if (hasNewNotifications) {
      markAllAsRead();
    }
    
    navigate('/demandes-rh');
  };

  const handleNotificationClick = (notification) => {
    // Fermer le dropdown
    setShowDropdown(false);
    
    // Marquer comme lue localement
    setRecentNotifications(prev =>
      prev.map(notif =>
        notif.id === notification.id ? { ...notif, read: true } : notif
      )
    );
    
    // Décrémenter le compteur si > 0
    setNotificationCount(prev => Math.max(0, prev - 1));
    
    // Naviguer vers les demandes
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

  const handleMarkAllRead = () => {
    markAllAsRead();
  };

  return (
    <div className="notification-wrapper">
      <button 
        className={`notification-button ${hasNewNotifications ? 'has-notifications' : ''}`}
        onClick={handleToggleDropdown}
        aria-label={t('notifications') || 'Notifications'}
        title={`${notificationCount} nouvelle(s) notification(s)`}
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
                    {notificationCount} {t('new') || 'nouvelles'}
                  </span>
                  <button 
                    className="btn-mark-read"
                    onClick={handleMarkAllRead}
                    title="Marquer toutes comme lues"
                  >
                    ✓
                  </button>
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
                recentNotifications.map((notif) => (
                  <div 
                    key={notif.id}
                    className={`notification-item ${notificationsRead ? 'read' : 'unread'}`}
                    onClick={() => handleNotificationClick(notif)}
                  >
                    <div className="notification-avatar">
                      {notif.employe_photo ? (
                        <img src={notif.employe_photo} alt="" onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.innerHTML = 
                            `<div class="avatar-placeholder">
                              ${notif.employe_prenom?.[0] || 'E'}${notif.employe_nom?.[0] || 'M'}
                            </div>`;
                        }} />
                      ) : (
                        <div className="avatar-placeholder">
                          {notif.employe_prenom?.[0] || 'E'}{notif.employe_nom?.[0] || 'M'}
                        </div>
                      )}
                    </div>
                    <div className="notification-content">
                      <div className="notification-title">
                        <span className="type-icon">{getTypeIcon(notif.type_demande)}</span>
                        {notif.titre || 'Nouvelle demande'}
                      </div>
                      <div className="notification-subtitle">
                        {notif.employe_prenom || 'Employé'} {notif.employe_nom || ''}
                      </div>
                      <div className="notification-time">
                        {formatDate(notif.created_at)}
                      </div>
                    </div>
                    {!notificationsRead && (
                      <div className="notification-indicator"></div>
                    )}
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
