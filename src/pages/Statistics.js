import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { employeesAPI } from '../services/api';
import { exportToPDF, exportToExcel, exportEmployeesToExcel } from '../services/exportService';
import './Statistics.css';

const Statistics = () => {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    byDepartment: {},
    byContract: {},
    salaryStats: {},
    recentHires: 0,
    averageSalary: 0,
    totalSalary: 0,
    recentHiresList: []
  });
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      const response = await employeesAPI.getAll();
      const employeesData = response.data;
      setEmployees(employeesData);

      // Calcul des statistiques
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      const byDepartment = {};
      const byContract = {};
      let totalSalary = 0;
      let recentHires = 0;
      const recentHiresList = [];

      employeesData.forEach(emp => {
        // Par département
        byDepartment[emp.site_dep] = (byDepartment[emp.site_dep] || 0) + 1;
        
        // Par type de contrat
        byContract[emp.type_contrat] = (byContract[emp.type_contrat] || 0) + 1;
        
        // Salaire total
        totalSalary += parseFloat(emp.salaire_brute || 0);
        
        // Embauchés ce mois-ci
        const empDate = new Date(emp.date_debut);
        if (empDate.getMonth() === currentMonth && empDate.getFullYear() === currentYear) {
          recentHires++;
          recentHiresList.push(emp);
        }
      });

      const averageSalary = employeesData.length > 0 ? totalSalary / employeesData.length : 0;

      // Statistiques salariales
      const salaries = employeesData.map(emp => parseFloat(emp.salaire_brute || 0)).sort((a, b) => a - b);
      const salaryStats = {
        min: salaries[0] || 0,
        max: salaries[salaries.length - 1] || 0,
        median: salaries.length > 0 ? salaries[Math.floor(salaries.length / 2)] : 0
      };

      setStats({
        totalEmployees: employeesData.length,
        byDepartment,
        byContract,
        salaryStats,
        recentHires,
        averageSalary,
        totalSalary,
        recentHiresList
      });

    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPercentage = (value, total) => {
    return total > 0 ? ((value / total) * 100).toFixed(1) : 0;
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      await exportToPDF('statistics-content', `statistiques-rh-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Erreur export PDF:', error);
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = () => {
    setExporting(true);
    try {
      exportToExcel(stats, `statistiques-rh-${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Erreur export Excel:', error);
    } finally {
      setExporting(false);
    }
  };

  const handleExportEmployeesExcel = () => {
    setExporting(true);
    try {
      exportEmployeesToExcel(employees, `liste-employes-${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Erreur export employés Excel:', error);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="statistics-container">
        <Sidebar />
        <div className="statistics-content">
          <div className="loading">Chargement des statistiques...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="statistics-container">
      <Sidebar />
      <div className="statistics-content" id="statistics-content">
        <header className="statistics-header">
          <h1>📊 Tableau de Bord Statistiques</h1>
          <p>Analyse détaillée de vos ressources humaines - {new Date().toLocaleDateString('fr-FR')}</p>
        </header>

        <div className="stats-overview">
          <div className="stat-card primary">
            <div className="stat-icon">👥</div>
            <div className="stat-info">
              <h3>Effectif Total</h3>
              <p className="stat-number">{stats.totalEmployees}</p>
              <p className="stat-detail">{stats.recentHires} nouveaux ce mois</p>
            </div>
          </div>

          <div className="stat-card success">
            <div className="stat-icon">💰</div>
            <div className="stat-info">
              <h3>Masse Salariale</h3>
              <p className="stat-number">{stats.totalSalary.toLocaleString()} €</p>
              <p className="stat-detail">Mensuelle brute</p>
            </div>
          </div>

          <div className="stat-card warning">
            <div className="stat-icon">📈</div>
            <div className="stat-info">
              <h3>Salaire Moyen</h3>
              <p className="stat-number">{stats.averageSalary.toFixed(0)} €</p>
              <p className="stat-detail">Par employé</p>
            </div>
          </div>

          <div className="stat-card info">
            <div className="stat-icon">🏢</div>
            <div className="stat-info">
              <h3>Départements</h3>
              <p className="stat-number">{Object.keys(stats.byDepartment).length}</p>
              <p className="stat-detail">Sites actifs</p>
            </div>
          </div>
        </div>

        <div className="charts-grid">
          {/* Répartition par département */}
          <div className="chart-card">
            <h3>📋 Répartition par Département</h3>
            <div className="chart-content">
              {Object.entries(stats.byDepartment).map(([dept, count]) => (
                <div key={dept} className="chart-item">
                  <div className="chart-label">
                    <span>{dept}</span>
                    <span>{count} ({getPercentage(count, stats.totalEmployees)}%)</span>
                  </div>
                  <div className="chart-bar">
                    <div 
                      className="chart-fill"
                      style={{ width: `${getPercentage(count, stats.totalEmployees)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Répartition par type de contrat */}
          <div className="chart-card">
            <h3>📄 Types de Contrat</h3>
            <div className="chart-content">
              {Object.entries(stats.byContract).map(([contract, count]) => (
                <div key={contract} className="chart-item">
                  <div className="chart-label">
                    <span>{contract}</span>
                    <span>{count} ({getPercentage(count, stats.totalEmployees)}%)</span>
                  </div>
                  <div className="chart-bar">
                    <div 
                      className="chart-fill contract"
                      style={{ width: `${getPercentage(count, stats.totalEmployees)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Statistiques salariales */}
          <div className="chart-card">
            <h3>💵 Analyse des Salaires</h3>
            <div className="salary-stats">
              <div className="salary-item">
                <span className="salary-label">Salaire Minimum</span>
                <span className="salary-value">{stats.salaryStats.min.toLocaleString()} €</span>
              </div>
              <div className="salary-item">
                <span className="salary-label">Salaire Maximum</span>
                <span className="salary-value">{stats.salaryStats.max.toLocaleString()} €</span>
              </div>
              <div className="salary-item">
                <span className="salary-label">Salaire Médian</span>
                <span className="salary-value">{stats.salaryStats.median.toLocaleString()} €</span>
              </div>
              <div className="salary-item">
                <span className="salary-label">Salaire Moyen</span>
                <span className="salary-value">{stats.averageSalary.toFixed(0)} €</span>
              </div>
            </div>
          </div>

          {/* Dernières embauches */}
          <div className="chart-card">
            <h3>🆕 Dernières Embauches</h3>
            <div className="recent-hires">
              {stats.recentHiresList
                .sort((a, b) => new Date(b.date_debut) - new Date(a.date_debut))
                .slice(0, 5)
                .map(emp => (
                  <div key={emp.id} className="hire-item">
                    <div className="hire-info">
                      <strong>{emp.prenom} {emp.nom}</strong>
                      <span>{emp.poste} - {emp.site_dep}</span>
                    </div>
                    <div className="hire-date">
                      {new Date(emp.date_debut).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                ))
              }
              {stats.recentHiresList.length === 0 && (
                <p className="no-data">Aucune embauche ce mois-ci</p>
              )}
            </div>
          </div>
        </div>

        <div className="export-section">
          <h3>📤 Exporter les Données</h3>
          <div className="export-buttons">
            <button 
              className="export-btn pdf"
              onClick={handleExportPDF}
              disabled={exporting}
            >
              {exporting ? '⏳' : '📄'} Exporter en PDF
            </button>
            <button 
              className="export-btn excel"
              onClick={handleExportExcel}
              disabled={exporting}
            >
              {exporting ? '⏳' : '📊'} Exporter Statistiques Excel
            </button>
            <button 
              className="export-btn excel"
              onClick={handleExportEmployeesExcel}
              disabled={exporting}
            >
              {exporting ? '⏳' : '👥'} Exporter Liste Employés Excel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Statistics;