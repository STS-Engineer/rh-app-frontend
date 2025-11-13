import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { path: '/dashboard', label: 'Tableau de Bord', icon: '📊' },
    { path: '/team', label: 'Équipe', icon: '👥' },
    { path: '/archives', label: 'Archives', icon: '📁' },
    { path: '/statistics', label: 'Statistiques', icon: '📈' }, 
    { path: '/settings', label: 'Paramètres', icon: '⚙️' },
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
        <div className="user-info">
          <div className="user-avatar">👤</div>
          <div className="user-details">
            <p className="user-name">Administrateur RH</p>
            <p className="user-role">Gestionnaire</p>
          </div>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          🚪 Déconnexion
        </button>
      </div>
    </div>
  );
};

export default Sidebar;