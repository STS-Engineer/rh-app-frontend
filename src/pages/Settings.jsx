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
    alert(`${t('languageChangedTo')} ${getLanguageLabel(newLanguage)}`);
  };

  const getLanguageLabel = (lang) => {
    const labels = {
      fr: 'Français',
      en: 'English',
      zh: '中文 (Chinese)',
      ko: '한국어 (Korean)',
      hi: 'हिन्दी (Hindi)'
    };
    return labels[lang] || lang;
  };

  const getLanguageFlag = (lang) => {
    const flags = {
      fr: '🇫🇷',
      en: '🇬🇧',
      zh: '🇨🇳',
      ko: '🇰🇷',
      hi: '🇮🇳'
    };
    return flags[lang] || '🌐';
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
          <p>{t('managePreferences')}</p>
        </header>

        <div className="settings-grid">
          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-icon">🌐</div>
              <h3>{t('language')} / Language</h3>
            </div>
            
            <div className="language-section">
              <p className="section-description">
                {t('chooseLanguage')}
              </p>
              
              <div className="language-options">
                <button 
                  className={`language-option ${language === 'fr' ? 'active' : ''}`}
                  onClick={() => handleLanguageChange('fr')}
                >
                  <span className="flag">🇫🇷</span>
                  <div className="language-info">
                    <strong>Français</strong>
                    <small>{t('defaultLanguage')}</small>
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
                    <small>{t('englishLanguage')}</small>
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
                    <small>{t('chineseLanguage')}</small>
                  </div>
                  {language === 'zh' && <span className="checkmark">✓</span>}
                </button>

                <button 
                  className={`language-option ${language === 'ko' ? 'active' : ''}`}
                  onClick={() => handleLanguageChange('ko')}
                >
                  <span className="flag">🇰🇷</span>
                  <div className="language-info">
                    <strong>한국어</strong>
                    <small>Korean language</small>
                  </div>
                  {language === 'ko' && <span className="checkmark">✓</span>}
                </button>

                <button 
                  className={`language-option ${language === 'hi' ? 'active' : ''}`}
                  onClick={() => handleLanguageChange('hi')}
                >
                  <span className="flag">🇮🇳</span>
                  <div className="language-info">
                    <strong>हिन्दी</strong>
                    <small>Hindi language</small>
                  </div>
                  {language === 'hi' && <span className="checkmark">✓</span>}
                </button>
              </div>
              
              <div className="current-language-info">
                <div className="current-language-label">{t('currentLanguage')}:</div>
                <div className="current-language-value">
                  <span className="flag">{getLanguageFlag(language)}</span>
                  {getLanguageLabel(language)}
                </div>
                <p className="language-note">
                  <span className="note-icon">ℹ️</span>
                  {t('changeEffectiveImmediately')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;