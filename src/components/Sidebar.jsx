import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

import './Sidebar.css';
import logo from './logo_sts.png';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language, getAvailableLanguages } = useLanguage();
  
  // State to manage sidebar collapsed/expanded
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Load saved state from localStorage on component mount
  useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState !== null) {
      setIsCollapsed(JSON.parse(savedState));
    }
  }, []);

  // Toggle sidebar and save state
  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', JSON.stringify(newState));
  };

  const menuItems = [
    { path: '/dashboard', label: t('dashboard'), icon: '📊' },
    { path: '/team', label: t('team'), icon: '👥' },
    { path: '/organigramme', label: t('orgTitle'), icon: '🏢' },
    { path: '/demandes-rh', label: t('demands'), icon: '📋' }, 
    { path: '/fiche-de-paie', label: t('payslip'), icon: '💰' },
    { path: '/archives', label: t('archives'), icon: '📁' },
    { path: '/statistics', label: t('statistics'), icon: '📈' }, 
    { path: '/etat-des-lieux', label: t('edlPresenceTracker'), icon: '📅' },
    { path: '/visa', label: t('visa'), icon: '✈️' },
    { path: '/settings', label: t('settings'), icon: '⚙️' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  const getCurrentLanguageFlag = () => {
    const languages = getAvailableLanguages();
    const currentLang = languages.find(l => l.code === language);
    return currentLang ? currentLang.flag : '🌐';
  };

  return (
    <>
      {/* Toggle button that appears outside the sidebar when collapsed */}
      {isCollapsed && (
        <button 
          className="sidebar-toggle-btn collapsed-mode"
          onClick={toggleSidebar}
          title={t('expandSidebar') || 'Expand sidebar'}
        >
          <span className="toggle-icon">→</span>
        </button>
      )}

      <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
        {/* Toggle button inside sidebar when expanded */}
        <button 
          className="sidebar-toggle-btn"
          onClick={toggleSidebar}
          title={isCollapsed ? t('expandSidebar') : t('collapseSidebar')}
        >
          <span className="toggle-icon">{isCollapsed ? '→' : '←'}</span>
        </button>

        <div className="sidebar-header">
          <img src={logo} alt="Logo" className="header-logo" />
        </div>
        
        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <button
              key={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
              title={isCollapsed ? item.label : ''}
            >
              <span className="nav-icon">{item.icon}</span>
              {!isCollapsed && <span className="nav-label">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          {!isCollapsed && (
            <div className="language-indicator">
              <span className="language-text">
                {t('language')}: {language.toUpperCase()}
              </span>
            </div>
          )}
          <button className="logout-btn" onClick={handleLogout} title={isCollapsed ? t('logout') : ''}>
            🚪 {!isCollapsed && t('logout')}
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
