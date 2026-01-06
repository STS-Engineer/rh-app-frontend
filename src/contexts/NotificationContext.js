import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications doit être utilisé dans NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [demandCount, setDemandCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setDemandCount(0);
        setLoading(false);
        return;
      }

      const response = await axios.get('/api/notifications/demandes/count', {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });

      if (response.data.success) {
        const newCount = parseInt(response.data.count) || 0;
        setDemandCount(newCount);
        setLastUpdate(response.data.lastUpdated || new Date().toISOString());
        console.log(`📊 Notifications: ${newCount} demandes en attente`);
      }
    } catch (error) {
      console.error('❌ Erreur chargement notifications:', error);
      // En cas d'erreur, on ne modifie pas le count pour éviter les flashs
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      await axios.post('/api/notifications/demandes/mark-as-read', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Réinitialiser le compteur localement
      setDemandCount(0);
      setLastUpdate(new Date().toISOString());
      
      console.log('✅ Notifications marquées comme lues');
    } catch (error) {
      console.error('❌ Erreur marquage comme lu:', error);
    }
  };

  const refreshNotifications = () => {
    setLoading(true);
    fetchNotifications();
  };

  // Vérifier l'authentification et charger les notifications
  useEffect(() => {
    const checkAuthAndLoad = () => {
      const token = localStorage.getItem('token');
      if (token) {
        fetchNotifications();
      } else {
        setDemandCount(0);
        setLoading(false);
      }
    };

    checkAuthAndLoad();
  }, [fetchNotifications]);

  // Polling pour nouvelles notifications (toutes les 30 secondes)
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000); // 30 secondes

    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Écouter les changements de token (login/logout)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'token') {
        if (e.newValue) {
          // Token ajouté (login)
          setTimeout(() => fetchNotifications(), 1000);
        } else {
          // Token supprimé (logout)
          setDemandCount(0);
          setLoading(false);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [fetchNotifications]);

  return (
    <NotificationContext.Provider value={{
      demandCount,
      loading,
      lastUpdate,
      fetchNotifications,
      markAsRead,
      refreshNotifications
    }}>
      {children}
    </NotificationContext.Provider>
  );
};
