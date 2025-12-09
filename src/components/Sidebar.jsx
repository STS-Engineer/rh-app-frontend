import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import './Sidebar.css';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  const menuItems = [
    { path: '/dashboard', label: t('dashboard'), icon: '📊' },
    { path: '/team', label: t('team'), icon: '👥' },
    { path: '/demandes-rh', label: t('demands'), icon: '📋' }, 
    { path: '/fiche-de-paie', label: t('payslip'), icon: '💰' },
    { path: '/archives', label: t('archives'), icon: '📁' },
    { path: '/statistics', label: t('statistics'), icon: '📈' }, 
    { path: '/settings', label: t('settings'), icon: '⚙️' }, // Nouvel item
    { path: '/visa', label: t('visa'), icon: '✈️' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>🏢 RH Manager</h2>
        <p className="sidebar-subtitle">Gestion des ressources humaines</p>
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
          <span className="language-icon">🌐</span>
          <span className="language-text">
            {t('language') === 'language' ? 'Langue' : t('language')}
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
