import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

import './Sidebar.css';
import logo from './logo_sts.png';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language, getAvailableLanguages } = useLanguage();

  const menuItems = [
    { path: '/dashboard', label: t('dashboard'), icon: '📊' },
    { path: '/team', label: t('team'), icon: '👥' },
    { path: '/organigramme', label: t('orgTitle'), icon: '🏢' }, // Changed from 'organigram' to 'orgTitle'
    { path: '/demandes-rh', label: t('demands'), icon: '📋' }, 
    { path: '/fiche-de-paie', label: t('payslip'), icon: '💰' },
    { path: '/archives', label: t('archives'), icon: '📁' },
    { path: '/statistics', label: t('statistics'), icon: '📈' }, 
    { path: '/etat-des-lieux', label: t('edlPresenceTracker'), icon: '📅' }, // Changed from 'presence' to 'presence_tracker'
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
    <div className="sidebar">
      <div className="sidebar-header">
        <img src={logo} alt="Logo" className="header-logo" />
      </div>
      
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.path}
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="language-indicator">
          <span className="language-text">
            {t('language')}: {language.toUpperCase()}
          </span>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          🚪 {t('logout')}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
