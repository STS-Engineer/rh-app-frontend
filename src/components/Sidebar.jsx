import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import './Sidebar.css';
import logo from './logo_sts.png';
import { getCurrentUser } from '../services/api';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language, getAvailableLanguages } = useLanguage();

  const [isOpen, setIsOpen] = useState(true);
  const user = getCurrentUser();
  const tenantText = [
    user?.country,
    user?.plant,
    user?.tenant_schema,
    user?.tenant_id
  ].filter(Boolean).join(' ').toLowerCase();
  const isTunisiaTenant =
    tenantText.includes('tunisia') ||
    tenantText.includes('public') ||
    tenantText.includes('sts') ||
    tenantText.includes('sceet') ||
    tenantText.includes('same service') ||
    tenantText.includes('same-service');
  const showSharedTenantModules = Boolean(user) && !isTunisiaTenant;

  useEffect(() => {
    const savedState = localStorage.getItem('sidebarOpen');
    if (savedState !== null) {
      setIsOpen(JSON.parse(savedState));
    }
  }, []);

  const toggleSidebar = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    localStorage.setItem('sidebarOpen', JSON.stringify(newState));
  };

  // Generate a daily token based on today's date and open Pointeuse with it.
  // The Pointeuse app generates the same token independently to verify access.
  const handlePointeuseClick = () => {
    const token = btoa('hr-access-' + new Date().toDateString());
    window.open(
      `https://pointeuse-sts.azurewebsites.net/?token=${token}`,
      '_blank',
      'noopener,noreferrer'
    );
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
    ...(isTunisiaTenant
      ? [
          { path: '/visa', label: t('visa'), icon: '✈️' }
        ]
      : []),
    ...(showSharedTenantModules
      ? [
          { path: '/onboarding', label: t('onboarding') || 'Onboarding', icon: '💻' },
          { path: '/career-development', label: t('careerDevelopment') || 'Career Development', icon: '⭐' },
          { path: '/offboarding', label: t('offboarding') || 'Offboarding', icon: '🚪' }
        ]
      : []),
    { path: '/settings', label: t('settings'), icon: '⚙️' },
    ...(isTunisiaTenant
      ? [
          {
            path: 'https://pointeuse-sts.azurewebsites.net/',
            label: t('pointeuse'),
            icon: '🕐',
            external: true,
          }
        ]
      : []),
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  return (
    <>
      {/* Hamburger/X toggle button */}
      <button
        className="sidebar-hamburger-toggle"
        onClick={toggleSidebar}
        title={isOpen ? 'Close menu' : 'Open menu'}
      >
        {isOpen ? '✕' : '☰'}
      </button>

      {/* Sidebar with simple show/hide */}
      <div className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <img src={logo} alt="Logo" className="header-logo" />
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <button
              key={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() =>
                item.external
                  ? handlePointeuseClick()
                  : navigate(item.path)
              }
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
    </>
  );
};

export default Sidebar;

