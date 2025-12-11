import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import './Sidebar.css';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language, getAvailableLanguages, changeLanguage } = useLanguage();
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);

  const menuItems = [
    { path: '/dashboard', label: t('dashboard'), icon: '📊' },
    { path: '/team', label: t('team'), icon: '👥' },
    { path: '/demandes-rh', label: t('demands'), icon: '📋' }, 
    { path: '/fiche-de-paie', label: t('payslip'), icon: '💰' },
    { path: '/archives', label: t('archives'), icon: '📁' },
    { path: '/statistics', label: t('statistics'), icon: '📈' }, 
    { path: '/settings', label: t('settings'), icon: '⚙️' },
    { path: '/visa', label: t('visa'), icon: '✈️' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  const handleLanguageSelect = (langCode) => {
    changeLanguage(langCode);
    setIsLanguageDropdownOpen(false);
  };

  const getCurrentLanguageInfo = () => {
    const languages = getAvailableLanguages();
    return languages.find(l => l.code === language) || languages[0];
  };

  const currentLang = getCurrentLanguageInfo();

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>🏢 {t('appTitle')}</h2>
        <p className="sidebar-subtitle">{t('appSubtitle')}</p>
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
        {/* Sélecteur de langue amélioré */}
        <div className="language-selector-container">
          <div className="language-current" onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}>
            <span className="language-flag">{currentLang.flag}</span>
            <span className="language-name">{currentLang.name}</span>
            <span className="language-chevron">
              {isLanguageDropdownOpen ? '▲' : '▼'}
            </span>
          </div>
          
          {isLanguageDropdownOpen && (
            <div className="language-dropdown">
              {getAvailableLanguages().map((lang) => (
                <div
                  key={lang.code}
                  className={`language-option ${language === lang.code ? 'selected' : ''}`}
                  onClick={() => handleLanguageSelect(lang.code)}
                >
                  <span className="language-option-flag">{lang.flag}</span>
                  <span className="language-option-name">{lang.name}</span>
                  {language === lang.code && (
                    <span className="language-check">✓</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <button className="logout-btn" onClick={handleLogout}>
          <span className="logout-icon">🚪</span>
          {t('logout')}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
