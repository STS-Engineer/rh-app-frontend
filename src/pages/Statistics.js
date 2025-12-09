import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { employeesAPI } from '../services/api';
import { exportToPDF, exportToExcel, exportEmployeesToExcel } from '../services/exportService';
import { useLanguage } from '../contexts/LanguageContext';
import './Statistics.css';

const Statistics = () => {
  const { t } = useLanguage();
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

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      const byDepartment = {};
      const byContract = {};
      let totalSalary = 0;
      let recentHires = 0;
      const recentHiresList = [];

      employeesData.forEach(emp => {
        byDepartment[emp.site_dep] = (byDepartment[emp.site_dep] || 0) + 1;
        byContract[emp.type_contrat] = (byContract[emp.type_contrat] || 0) + 1;
        totalSalary += parseFloat(emp.salaire_brute || 0);
        
        const empDate = new Date(emp.date_debut);
        if (empDate.getMonth() === currentMonth && empDate.getFullYear() === currentYear) {
          recentHires++;
          recentHiresList.push(emp);
        }
      });

      const averageSalary = employeesData.length > 0 ? totalSalary / employeesData.length : 0;

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
      console.error(t('errorLoadingStats'), error);
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
      console.error(t('exportError'), error);
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = () => {
    setExporting(true);
    try {
      exportToExcel(stats, `statistiques-rh-${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error(t('exportError'), error);
    } finally {
      setExporting(false);
    }
  };

  const handleExportEmployeesExcel = () => {
    setExporting(true);
    try {
      exportEmployeesToExcel(employees, `liste-employes-${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error(t('exportError'), error);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="statistics-container">
        <Sidebar />
        <div className="statistics-content">
          <div className="loading">{t('loadingStatistics')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="statistics-container">
      <Sidebar />
      <div className="statistics-content" id="statistics-content">
        <header className="statistics-header">
          <h1>📊 {t('statisticsDashboard')}</h1>
          <p>{t('hrAnalysis')} - {new Date().toLocaleDateString()}</p>
        </header>

        <div className="stats-overview">
          <div className="stat-card primary">
            <div className="stat-icon">👥</div>
            <div className="stat-info">
              <h3>{t('totalEmployees')}</h3>
              <p className="stat-number">{stats.totalEmployees}</p>
              <p className="stat-detail">{stats.recentHires} {t('newThisMonth')}</p>
            </div>
          </div>

          <div className="stat-card success">
            <div className="stat-icon">💰</div>
            <div className="stat-info">
              <h3>{t('totalSalary')}</h3>
              <p className="stat-number">{stats.totalSalary.toLocaleString()} DT</p>
              <p className="stat-detail">{t('monthlyGross')}</p>
            </div>
          </div>

          <div className="stat-card warning">
            <div className="stat-icon">📈</div>
            <div className="stat-info">
              <h3>{t('averageSalary')}</h3>
              <p className="stat-number">{stats.averageSalary.toFixed(0)} DT</p>
              <p className="stat-detail">{t('perEmployee')}</p>
            </div>
          </div>

          <div className="stat-card info">
            <div className="stat-icon">🏢</div>
            <div className="stat-info">
              <h3>{t('departments')}</h3>
              <p className="stat-number">{Object.keys(stats.byDepartment).length}</p>
              <p className="stat-detail">{t('activeSites')}</p>
            </div>
          </div>
        </div>

        <div className="charts-grid">
          <div className="chart-card">
            <h3>📋 {t('departmentDistribution')}</h3>
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

          <div className="chart-card">
            <h3>📄 {t('contractTypes')}</h3>
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

          <div className="chart-card">
            <h3>💵 {t('salaryAnalysis')}</h3>
            <div className="salary-stats">
              <div className="salary-item">
                <span className="salary-label">{t('minimumSalary')}</span>
                <span className="salary-value">{stats.salaryStats.min.toLocaleString()} DT</span>
              </div>
              <div className="salary-item">
                <span className="salary-label">{t('maximumSalary')}</span>
                <span className="salary-value">{stats.salaryStats.max.toLocaleString()} DT</span>
              </div>
              <div className="salary-item">
                <span className="salary-label">{t('medianSalary')}</span>
                <span className="salary-value">{stats.salaryStats.median.toLocaleString()} DT</span>
              </div>
              <div className="salary-item">
                <span className="salary-label">{t('averageSalary')}</span>
                <span className="salary-value">{stats.averageSalary.toFixed(0)} DT</span>
              </div>
            </div>
          </div>

          <div className="chart-card">
            <h3>🆕 {t('recentHires')}</h3>
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
                      {new Date(emp.date_debut).toLocaleDateString()}
                    </div>
                  </div>
                ))
              }
              {stats.recentHiresList.length === 0 && (
                <p className="no-data">{t('noHiresThisMonth')}</p>
              )}
            </div>
          </div>
        </div>

        <div className="export-section">
          <h3>📤 {t('exportData')}</h3>
          <div className="export-buttons">
            <button 
              className="export-btn pdf"
              onClick={handleExportPDF}
              disabled={exporting}
            >
              {exporting ? '⏳' : '📄'} {t('exportDataPDF')}
            </button>
            <button 
              className="export-btn excel"
              onClick={handleExportExcel}
              disabled={exporting}
            >
              {exporting ? '⏳' : '📊'} {t('exportStatisticsExcel')}
            </button>
            <button 
              className="export-btn excel"
              onClick={handleExportEmployeesExcel}
              disabled={exporting}
            >
              {exporting ? '⏳' : '👥'} {t('exportEmployeesExcel')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Statistics;
