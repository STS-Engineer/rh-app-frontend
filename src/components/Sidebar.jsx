import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { path: '/dashboard', label: 'Tableau de Bord', icon: '📊' },
    { path: '/team', label: 'Équipe', icon: '👥' },
    { path: '/demandes-rh', label: 'Demandes RH', icon: '📋' }, 
    { path: '/fiche-de-paie', label: 'Fiche de Paie', icon: '💰' },// Nouvel item
    { path: '/archives', label: 'Archives', icon: '📁' },
    { path: '/statistics', label: 'Statistiques', icon: '📈' }, 
    { path: '/settings', label: 'Demandes Visa', icon: '✈️' },
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
        
        <button className="logout-btn" onClick={handleLogout}>
          🚪 Déconnexion
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
