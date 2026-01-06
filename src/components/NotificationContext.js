import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [demandCount, setDemandCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get('/api/notifications/demandes/count', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setDemandCount(response.data.count);
      }
    } catch (error) {
      console.error('Erreur chargement notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/notifications/demandes/mark-as-read', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDemandCount(0);
    } catch (error) {
      console.error('Erreur marquage comme lu:', error);
    }
  };

  // Polling toutes les 30 secondes pour nouvelles demandes
  useEffect(() => {
    fetchNotifications();
    
    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000); // 30 secondes

    return () => clearInterval(interval);
  }, []);

  return (
    <NotificationContext.Provider value={{
      demandCount,
      loading,
      fetchNotifications,
      markAsRead
    }}>
      {children}
    </NotificationContext.Provider>
  );
};
