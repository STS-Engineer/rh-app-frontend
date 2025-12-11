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
      zh: '中文 (Chinese)'
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
              </div>
              
              <div className="current-language-info">
                <div className="current-language-label">{t('currentLanguage')}:</div>
                <div className="current-language-value">
                  <span className="flag">{language === 'fr' ? '🇫🇷' : language === 'en' ? '🇬🇧' : '🇨🇳'}</span>
                  {getLanguageLabel(language)}
                </div>
                <p className="language-note">
                  <span className="note-icon">ℹ️</span>
                  {t('changeEffectiveImmediately')}
                </p>
              </div>
            </div>
          </div>

          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-icon">🔔</div>
              <h3>{t('notifications')}</h3>
            </div>
            
            <div className="notifications-section">
              <p className="section-description">
                {t('configureNotifications')}
              </p>
              
              <div className="notification-options">
                <div className="notification-option">
                  <div className="notification-info">
                    <div className="notification-title">{t('emailNotifications')}</div>
                    <div className="notification-description">
                      {t('receiveAlertsByEmail')}
                    </div>
                  </div>
                  <label className="switch">
                    <input 
                      type="checkbox" 
                      checked={notifications.email}
                      onChange={() => handleNotificationChange('email')}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
                
                <div className="notification-option">
                  <div className="notification-info">
                    <div className="notification-title">{t('pushNotifications')}</div>
                    <div className="notification-description">
                      {t('realTimeAlerts')}
                    </div>
                  </div>
                  <label className="switch">
                    <input 
                      type="checkbox" 
                      checked={notifications.push}
                      onChange={() => handleNotificationChange('push')}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
                
                <div className="notification-option">
                  <div className="notification-info">
                    <div className="notification-title">{t('weeklyReport')}</div>
                    <div className="notification-description">
                      {t('weeklySummaryEmail')}
                    </div>
                  </div>
                  <label className="switch">
                    <input 
                      type="checkbox" 
                      checked={notifications.weeklyReport}
                      onChange={() => handleNotificationChange('weeklyReport')}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-icon">ℹ️</div>
              <h3>{t('about')}</h3>
            </div>
            
            <div className="about-section">
              <div className="about-option">
                <button className="about-btn">
                  <span className="btn-icon">📖</span>
                  {t('userGuide')}
                </button>
              </div>
              
              <div className="about-option">
                <button className="about-btn">
                  <span className="btn-icon">🔧</span>
                  {t('technicalSupport')}
                </button>
              </div>
              
              <div className="about-option">
                <button className="about-btn">
                  <span className="btn-icon">📝</span>
                  {t('termsOfUse')}
                </button>
              </div>
              
              <div className="about-option">
                <button className="about-btn">
                  <span className="btn-icon">🔒</span>
                  {t('privacyPolicy')}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="settings-footer">
          <button className="save-changes-btn">
            💾 {t('saveChanges')}
          </button>
          <button className="restore-defaults-btn">
            ↩️ {t('restoreDefaults')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
