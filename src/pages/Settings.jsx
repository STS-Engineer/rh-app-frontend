import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import Sidebar from '../components/Sidebar';
import './Settings.css';

const Settings = () => {
  const { language, setLanguage, t } = useLanguage();
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    weeklyReport: true,
  });

  const handleLanguageChange = (newLanguage) => {
    setLanguage(newLanguage);
    alert(`Langue changée en ${getLanguageLabel(newLanguage)}`);
  };

  const getLanguageLabel = (lang) => {
    const labels = {
      fr: 'Français',
      en: 'English',
      zh: '中文 (Chinois)'
    };
    return labels[lang] || lang;
  };

  const handleNotificationChange = (key) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="settings-container">
      <Sidebar />
      <div className="settings-content">
        <header className="settings-header">
          <h1>⚙️ {t('settings')}</h1>
          <p>Gérez vos préférences et paramètres de l'application</p>
        </header>

        <div className="settings-grid">
          {/* Section Langue */}
          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-icon">🌐</div>
              <h3>Langue / Language</h3>
            </div>
            
            <div className="language-section">
              <p className="section-description">
                Choisissez la langue d'affichage de l'application
              </p>
              
              <div className="language-options">
                <button 
                  className={`language-option ${language === 'fr' ? 'active' : ''}`}
                  onClick={() => handleLanguageChange('fr')}
                >
                  <span className="flag">🇫🇷</span>
                  <div className="language-info">
                    <strong>Français</strong>
                    <small>Langue par défaut</small>
                  </div>
                  {language === 'fr' && <span className="checkmark">✓</span>}
                </button>
                
                <button 
                  className={`language-option ${language === 'en' ? 'active' : ''}`}
                  onClick={() => handleLanguageChange('en')}
                >
                  <span className="flag">🇬🇧</span>
                  <div className="language-info">
                    <strong>English</strong>
                    <small>English language</small>
                  </div>
                  {language === 'en' && <span className="checkmark">✓</span>}
                </button>
                
                <button 
                  className={`language-option ${language === 'zh' ? 'active' : ''}`}
                  onClick={() => handleLanguageChange('zh')}
                >
                  <span className="flag">🇨🇳</span>
                  <div className="language-info">
                    <strong>中文</strong>
                    <small>Chinese language</small>
                  </div>
                  {language === 'zh' && <span className="checkmark">✓</span>}
                </button>
              </div>
              
              
            </div>
          </div>

          

         
        </div>

       
      </div>
    </div>
  );
};

export default Settings;
