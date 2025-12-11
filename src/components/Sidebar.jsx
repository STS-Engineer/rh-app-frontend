import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import './Sidebar.css';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language, getAvailableLanguages, changeLanguage } = useLanguage();
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Menu items sans "settings"
  const menuItems = [
    { path: '/dashboard', label: t('dashboard'), icon: '📊' },
    { path: '/team', label: t('team'), icon: '👥' },
    { path: '/demandes-rh', label: t('demands'), icon: '📋' }, 
    { path: '/fiche-de-paie', label: t('payslip'), icon: '💰' },
    { path: '/archives', label: t('archives'), icon: '📁' },
    { path: '/statistics', label: t('statistics'), icon: '📈' }, 
    { path: '/visa', label: t('visa'), icon: '✈️' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  const handleLanguageSelect = (langCode) => {
    changeLanguage(langCode);
    setIsLanguageDropdownOpen(false);
    
    // Notification subtile
    const lang = getAvailableLanguages().find(l => l.code === langCode);
    showLanguageNotification(lang.name);
  };

  const getCurrentLanguageInfo = () => {
    const languages = getAvailableLanguages();
    return languages.find(l => l.code === language) || languages[0];
  };

  // Fermer le dropdown en cliquant à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsLanguageDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLang = getCurrentLanguageInfo();

  // Fonction pour afficher une notification de changement de langue
  const showLanguageNotification = (languageName) => {
    // Vous pouvez remplacer cela par un système de notifications plus élaboré
    console.log(`Langue changée en ${languageName}`);
  };

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
        
        {/* Section Paramètres directement dans la sidebar */}
        <div className="settings-section">
          <div className="settings-title">
            <span className="settings-icon">⚙️</span>
            <span className="settings-label">{t('settings')}</span>
          </div>
          
          {/* Sélecteur de langue dans la section paramètres */}
          <div className="language-selector-sidebar" ref={dropdownRef}>
            <div 
              className="language-selector-trigger"
              onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
            >
              <div className="language-selector-content">
                <span className="language-icon-global">🌐</span>
                <div className="language-selector-info">
                  <span className="language-selector-label">{t('language')}</span>
                  <span className="language-selector-current">
                    {currentLang.name} {currentLang.flag}
                  </span>
                </div>
                <span className={`language-chevron ${isLanguageDropdownOpen ? 'open' : ''}`}>
                  ▼
                </span>
              </div>
            </div>
            
            {isLanguageDropdownOpen && (
              <div className="language-selector-dropdown">
                <div className="language-dropdown-header">
                  <span className="dropdown-title">Sélectionner la langue</span>
                  <span className="dropdown-subtitle">Select language</span>
                </div>
                
                <div className="language-dropdown-options">
                  {getAvailableLanguages().map((lang) => (
                    <div
                      key={lang.code}
                      className={`language-dropdown-option ${language === lang.code ? 'selected' : ''}`}
                      onClick={() => handleLanguageSelect(lang.code)}
                    >
                      <div className="language-option-content">
                        <span className="language-option-flag">{lang.flag}</span>
                        <div className="language-option-details">
                          <span className="language-option-name">{lang.name}</span>
                          <span className="language-option-code">{lang.code.toUpperCase()}</span>
                        </div>
                      </div>
                      {language === lang.code && (
                        <span className="language-selected-indicator">
                          <div className="selected-dot"></div>
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="language-dropdown-footer">
                  <span className="dropdown-help">
                    La modification sera appliquée immédiatement
                  </span>
                </div>
              </div>
            )}
          </div>
          
          {/* Autres options de paramètres peuvent être ajoutées ici */}
          <div className="settings-option">
            <span className="settings-option-icon">🔔</span>
            <span className="settings-option-label">Notifications</span>
            <span className="settings-option-badge">3</span>
          </div>
          
          <div className="settings-option">
            <span className="settings-option-icon">🎨</span>
            <span className="settings-option-label">Thème</span>
            <span className="settings-option-status">Sombre</span>
          </div>
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="user-avatar">
            <span>👤</span>
          </div>
          <div className="user-info">
            <span className="user-name">John Doe</span>
            <span className="user-role">Administrateur</span>
          </div>
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
