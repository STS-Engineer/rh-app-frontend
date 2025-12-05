import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { employeesAPI, getArchivedEmployees } from '../services/api';
import { exportEmployeesToExcel } from '../services/exportService';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalEmployees: 0,
    newThisMonth: 0,
    contractsToRenew: 0,
    totalSalary: 0,
    cdiCount: 0,
    cddCount: 0,
    stageCount: 0,
    freelanceCount: 0,
    archivesCount: 0,
    civpcount:0
  });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await employeesAPI.getAll();
      const employees = response.data;
      
      // Charger les archives
      const archivesResponse = await getArchivedEmployees();
      const archivesCount = archivesResponse.data.length;
      
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      // Employés embauchés ce mois-ci
      const newThisMonth = employees.filter(emp => {
        const empDate = new Date(emp.date_debut);
        return empDate.getMonth() === currentMonth && empDate.getFullYear() === currentYear;
      }).length;

      // Contrats à renouveler (CDD qui expirent dans 30 jours)
      const contractsToRenew = employees.filter(emp => {
        if (emp.type_contrat === 'CDD') {
          const endDate = new Date(emp.date_debut);
          endDate.setMonth(endDate.getMonth() + 6); // Suppose CDD de 6 mois
          const today = new Date();
          const diffTime = endDate - today;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return diffDays <= 30 && diffDays > 0;
        }
        return false;
      }).length;

      // Calculs des salaires et types de contrat
      const totalSalary = employees.reduce((sum, emp) => sum + parseFloat(emp.salaire_brute || 0), 0);
      const cdiCount = employees.filter(emp => emp.type_contrat === 'CDI').length;
      const civpCount = employees.filter(emp => emp.type_contrat === 'CIVP').length;
      const cddCount = employees.filter(emp => emp.type_contrat === 'CDD').length;
      const stageCount = employees.filter(emp => emp.type_contrat === 'Stage').length;
      const freelanceCount = employees.filter(emp => emp.type_contrat === 'Freelance').length;

      setStats({
        totalEmployees: employees.length,
        newThisMonth: newThisMonth,
        contractsToRenew: contractsToRenew,
        totalSalary: totalSalary,
        cdiCount: cdiCount,
        cddCount: cddCount,
        stageCount: stageCount,
        freelanceCount: freelanceCount,
        archivesCount: archivesCount,
        civpCount: civpCount,
      });

    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
      alert('Erreur lors du chargement des données du tableau de bord');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const response = await employeesAPI.getAll();
      const success = exportEmployeesToExcel(
        response.data, 
        `liste-employes-${new Date().toISOString().split('T')[0]}.xlsx`
      );
      
      if (success) {
        alert('✅ Liste des employés exportée avec succès!');
      }
    } catch (error) {
      console.error('Erreur export Excel:', error);
      alert('❌ Erreur lors de l\'export Excel: ' + error.message);
    } finally {
      setExporting(false);
    }
  };

  const handleViewStatistics = () => {
    navigate('/statistics');
  };

  const handleViewArchives = () => {
    navigate('/archives');
  };

  const getContractTypesText = () => {
    const types = [];
    if (stats.cdiCount > 0) types.push(`${stats.cdiCount} CDI`);
    if (stats.cddCount > 0) types.push(`${stats.cddCount} CDD`);
    if (stats.civpCount > 0) types.push(`${stats.civpCount} CIVP`);
    if (stats.stageCount > 0) types.push(`${stats.stageCount} Stage`);
    if (stats.freelanceCount > 0) types.push(`${stats.freelanceCount} Freelance`);
    
    
    
    return types.length > 0 ? types.join(' • ') : 'Aucun employé';
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <Sidebar />
        <div className="dashboard-content">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Chargement des statistiques...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="dashboard-content">
        <header className="dashboard-header">
          <h1>🏢 Tableau de Bord RH</h1>
          <p>Vue d'ensemble de votre gestion des ressources humaines</p>
          <div className="last-update">
            Dernière mise à jour: {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR')}
          </div>
        </header>

        {/* Cartes de statistiques */}
        <div className="dashboard-stats">
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-info">
              <h3>Effectif Total</h3>
              <p className="stat-number">{stats.totalEmployees}</p>
              <p className="stat-detail">
                {getContractTypesText()}
              </p>
            </div>
            <div className="stat-trend">
              <span className="trend-up">↗️</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-info">
              <h3>Nouveaux ce mois</h3>
              <p className="stat-number">{stats.newThisMonth}</p>
              <p className="stat-detail">
                {stats.newThisMonth > 0 ? 'Croissance active' : 'Stable ce mois-ci'}
              </p>
            </div>
            <div className="stat-trend">
              {stats.newThisMonth > 0 ? <span className="trend-up">📈</span> : <span className="trend-neutral">➡️</span>}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📅</div>
            <div className="stat-info">
              <h3>Contrats à renouveler</h3>
              <p className="stat-number">{stats.contractsToRenew}</p>
              <p className="stat-detail">
                Dans les 30 prochains jours
              </p>
            </div>
            <div className="stat-trend">
              {stats.contractsToRenew > 0 ? <span className="trend-warning">⚠️</span> : <span className="trend-ok">✅</span>}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-info">
              <h3>Masse Salariale</h3>
              <p className="stat-number">{stats.totalSalary.toLocaleString('fr-FR')} DT</p>
              <p className="stat-detail">
                Salaire brut mensuel total
              </p>
            </div>
            <div className="stat-trend">
              <span className="trend-up">💸</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📁</div>
            <div className="stat-info">
              <h3>Employés Archivés</h3>
              <p className="stat-number">{stats.archivesCount}</p>
              <p className="stat-detail">
                Anciens employés
              </p>
            </div>
            <div className="stat-trend">
              <span className="trend-neutral">📊</span>
            </div>
          </div>
        </div>

        {/* Cartes d'actions principales */}
        <div className="dashboard-actions">
          <button 
            className="action-card"
            onClick={() => navigate('/team')}
          >
            <div className="action-icon">👥</div>
            <div className="action-content">
              <h3>Gérer l'Équipe</h3>
              <p>Consulter, modifier et ajouter des employés</p>
              <div className="action-badge">{stats.totalEmployees} employés</div>
            </div>
            <div className="action-arrow">→</div>
          </button>

          <button 
            className="action-card"
            onClick={handleViewStatistics}
          >
            <div className="action-icon">📈</div>
            <div className="action-content">
              <h3>Analytiques Avancées</h3>
              <p>Statistiques détaillées et rapports</p>
              <div className="action-badge">Voir les tendances</div>
            </div>
            <div className="action-arrow">→</div>
          </button>

          <button 
            className="action-card"
            onClick={handleViewArchives}
          >
            <div className="action-icon">📁</div>
            <div className="action-content">
              <h3>Consulter les Archives</h3>
              <p>Employés ayant quitté l'entreprise</p>
              <div className="action-badge">{stats.archivesCount} archivés</div>
            </div>
            <div className="action-arrow">→</div>
          </button>

          <button 
            className="action-card"
            onClick={handleExportExcel}
            disabled={exporting}
          >
            <div className="action-icon">📁</div>
            <div className="action-content">
              <h3>Exporter les Données</h3>
              <p>Télécharger la liste des employés en Excel</p>
              <div className="action-badge">
                {exporting ? 'Génération...' : 'Format Excel'}
              </div>
            </div>
            <div className="action-arrow">→</div>
          </button>
        </div>

        {/* Actions rapides */}
        <div className="quick-actions">
          <h3>⚡ Actions Rapides</h3>
          <div className="action-buttons">
            <button 
              className="quick-btn primary"
              onClick={() => navigate('/team')}
            >
              <span className="btn-icon">➕</span>
              Ajouter un employé
            </button>
            <button 
              className="quick-btn secondary"
              onClick={handleViewStatistics}
            >
              <span className="btn-icon">📊</span>
              Voir les statistiques
            </button>
            <button 
              className="quick-btn tertiary"
              onClick={handleViewArchives}
            >
              <span className="btn-icon">📁</span>
              Consulter les archives
            </button>
            <button 
              className="quick-btn tertiary"
              onClick={handleExportExcel}
              disabled={exporting || stats.totalEmployees === 0}
            >
              <span className="btn-icon">{exporting ? '⏳' : '📁'}</span>
              {exporting ? 'Export en cours...' : 'Exporter Excel'}
            </button>
          </div>
        </div>

        {/* Résumé rapide */}
        <div className="quick-summary">
          <h3>📋 Résumé Rapide</h3>
          <div className="summary-grid">
            <div className="summary-item">
              <span className="summary-label">Employés actifs:</span>
              <span className="summary-value">{stats.totalEmployees}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Embauches ce mois:</span>
              <span className="summary-value">{stats.newThisMonth}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Contrats CDI:</span>
              <span className="summary-value">{stats.cdiCount}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Contrats CDD:</span>
              <span className="summary-value">{stats.cddCount}</span>
            </div>
             <div className="summary-item">
              <span className="summary-label">Contrats CIVP:</span>
              <span className="summary-value">{stats.civpCount}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">À renouveler:</span>
              <span className="summary-value">{stats.contractsToRenew}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Masse salariale:</span>
              <span className="summary-value">{stats.totalSalary.toLocaleString('fr-FR')} DT</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Employés archivés:</span>
              <span className="summary-value">{stats.archivesCount}</span>
            </div>
          </div>
        </div>

        {/* Message si pas d'employés */}
        {stats.totalEmployees === 0 && (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <h3>Aucun employé enregistré</h3>
            <p>Commencez par ajouter votre premier employé pour voir les statistiques</p>
            <button 
              className="empty-action-btn"
              onClick={() => navigate('/team')}
            >
              ➕ Ajouter le premier employé
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
