import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useNotifications } from '../contexts/NotificationContext';
import './Sidebar.css';
import logo from './logo_sts.png';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language, getAvailableLanguages } = useLanguage();
  const { demandCount, loading, markAsRead } = useNotifications();
  const [lastPath, setLastPath] = useState('');

  const menuItems = [
    { path: '/dashboard', label: t('dashboard'), icon: '📊' },
    { path: '/team', label: t('team'), icon: '👥' },
    { 
      path: '/demandes-rh', 
      label: t('demands'), 
      icon: '📋',
      showNotification: true
    }, 
    { path: '/fiche-de-paie', label: t('payslip'), icon: '💰' },
    { path: '/archives', label: t('archives'), icon: '📁' },
    { path: '/statistics', label: t('statistics'), icon: '📈' }, 
    { path: '/settings', label: t('settings'), icon: '⚙️' },
    { path: '/visa', label: t('visa'), icon: '✈️' },
  ];

  // Marquer comme lues quand on quitte la page des demandes
  useEffect(() => {
    if (lastPath === '/demandes-rh' && location.pathname !== '/demandes-rh' && demandCount > 0) {
      // Vous pourriez appeler markAsRead() ici si vous voulez
      console.log('📌 Quitte la page demandes - notifications:', demandCount);
    }
    setLastPath(location.pathname);
  }, [location.pathname, lastPath, demandCount]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  const handleDemandsClick = () => {
    // Option: marquer comme lues quand on clique
    // markAsRead();
    navigate('/demandes-rh');
  };

  const getCurrentLanguageFlag = () => {
    const languages = getAvailableLanguages();
    const currentLang = languages.find(l => l.code === language);
    return currentLang ? currentLang.flag : '🌐';
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <img src={logo} alt="Logo STS" className="header-logo" />
      </div>
      
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <div key={item.path} className="nav-item-wrapper">
            <button
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => item.path === '/demandes-rh' ? handleDemandsClick() : navigate(item.path)}
              data-path={item.path}
              data-notification={item.showNotification && demandCount > 0 ? "true" : "false"}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
              
              {/* Badge de notification pour les demandes */}
              {item.showNotification && demandCount > 0 && (
                <span className="notification-badge">
                  {demandCount > 99 ? '99+' : demandCount}
                </span>
              )}
            </button>
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="language-indicator">
          <span className="language-flag">{getCurrentLanguageFlag()}</span>
          <span className="language-text">
            {language.toUpperCase()}
          </span>
        </div>
        
        {/* Afficher le nombre de notifications dans le footer si vous voulez */}
        {demandCount > 0 && (
          <div className="global-notification">
            <span className="notification-info">
              ⚡ {demandCount} {t('pendingDemands')}
            </span>
          </div>
        )}
        
        <button className="logout-btn" onClick={handleLogout}>
          <span className="logout-icon">🚪</span>
          {t('logout')}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
