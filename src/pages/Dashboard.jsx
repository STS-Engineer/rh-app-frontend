import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { employeesAPI, getArchivedEmployees } from '../services/api';
import { exportEmployeesToExcel } from '../services/exportService';
import { useLanguage } from '../contexts/LanguageContext';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
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
    civpcount: 0
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
      
      const archivesResponse = await getArchivedEmployees();
      const archivesCount = archivesResponse.data.length;
      
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const newThisMonth = employees.filter(emp => {
        const empDate = new Date(emp.date_debut);
        return empDate.getMonth() === currentMonth && empDate.getFullYear() === currentYear;
      }).length;

      const contractsToRenew = employees.filter(emp => {
        if (emp.type_contrat === 'CDD') {
          const endDate = new Date(emp.date_debut);
          endDate.setMonth(endDate.getMonth() + 6);
          const today = new Date();
          const diffTime = endDate - today;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return diffDays <= 30 && diffDays > 0;
        }
        return false;
      }).length;

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
      console.error(t('errorLoadingStats'), error);
      alert(t('errorLoadingDashboard'));
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
        alert('✅ ' + t('exportSuccess'));
      }
    } catch (error) {
      console.error(t('exportError'), error);
      alert('❌ ' + t('exportError') + ': ' + error.message);
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
    
    return types.length > 0 ? types.join(' • ') : t('noEmployees');
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <Sidebar />
        <div className="dashboard-content">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>{t('loadingStats')}</p>
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
          <h1>🏢 {t('dashboard')}</h1>
          <p>{t('overview')} {t('appSubtitle')}</p>
          <div className="last-update">
            {t('lastUpdate')}: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
          </div>
        </header>

        <div className="dashboard-stats">
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-info">
              <h3>{t('totalEmployees')}</h3>
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
              <h3>{t('newThisMonth')}</h3>
              <p className="stat-number">{stats.newThisMonth}</p>
              <p className="stat-detail">
                {stats.newThisMonth > 0 ? t('activeGrowth') : t('stableThisMonth')}
              </p>
            </div>
            <div className="stat-trend">
              {stats.newThisMonth > 0 ? <span className="trend-up"></span> : <span className="trend-neutral">➡️</span>}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📅</div>
            <div className="stat-info">
              <h3>{t('contractsToRenew')}</h3>
              <p className="stat-number">{stats.contractsToRenew}</p>
              <p className="stat-detail">
                {t('next30Days')}
              </p>
            </div>
            <div className="stat-trend">
              {stats.contractsToRenew > 0 ? <span className="trend-warning">⚠️</span> : <span className="trend-ok"></span>}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-info">
              <h3>{t('totalSalary')}</h3>
              <p className="stat-number">{stats.totalSalary.toLocaleString()} DT</p>
              <p className="stat-detail">
                {t('monthlyGross')}
              </p>
            </div>
            <div className="stat-trend">
              <span className="trend-up"></span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📁</div>
            <div className="stat-info">
              <h3>{t('archivesCount')}</h3>
              <p className="stat-number">{stats.archivesCount}</p>
              <p className="stat-detail">
                {t('formerEmployees')}
              </p>
            </div>
            <div className="stat-trend">
              <span className="trend-neutral"></span>
            </div>
          </div>
        </div>

        <div className="dashboard-actions">
          <button 
            className="action-card"
            onClick={() => navigate('/team')}
          >
            <div className="action-icon">👥</div>
            <div className="action-content">
              <h3>{t('manageTeam')}</h3>
              <p>{t('consultEmployees')}</p>
              <div className="action-badge">{stats.totalEmployees} {t('employees')}</div>
            </div>
            <div className="action-arrow">→</div>
          </button>

          <button 
            className="action-card"
            onClick={handleViewStatistics}
          >
            <div className="action-icon">📈</div>
            <div className="action-content">
              <h3>{t('advancedAnalytics')}</h3>
              <p>{t('detailedStats')}</p>
              <div className="action-badge">{t('viewTrends')}</div>
            </div>
            <div className="action-arrow">→</div>
          </button>

          <button 
            className="action-card"
            onClick={handleViewArchives}
          >
            <div className="action-icon">📁</div>
            <div className="action-content">
              <h3>{t('viewArchives')}</h3>
              <p>{t('formerEmployees')}</p>
              <div className="action-badge">{stats.archivesCount} {t('archived')}</div>
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
              <h3>{t('exportData')}</h3>
              <p>{t('downloadEmployeeList')}</p>
              <div className="action-badge">
                {exporting ? t('generating') : t('excelFormat')}
              </div>
            </div>
            <div className="action-arrow">→</div>
          </button>
        </div>

        <div className="quick-actions">
          <h3>⚡ {t('quickActions')}</h3>
          <div className="action-buttons">
            <button 
              className="quick-btn primary"
              onClick={() => navigate('/team')}
            >
              <span className="btn-icon">➕</span>
              {t('addEmployee')}
            </button>
            <button 
              className="quick-btn secondary"
              onClick={handleViewStatistics}
            >
              <span className="btn-icon">📊</span>
              {t('viewStatistics')}
            </button>
            <button 
              className="quick-btn tertiary"
              onClick={handleViewArchives}
            >
              <span className="btn-icon">📁</span>
              {t('viewArchives')}
            </button>
            <button 
              className="quick-btn tertiary"
              onClick={handleExportExcel}
              disabled={exporting || stats.totalEmployees === 0}
            >
              <span className="btn-icon">{exporting ? '⏳' : '📁'}</span>
              {exporting ? t('exporting') : t('exportExcel')}
            </button>
          </div>
        </div>

        <div className="quick-summary">
          <h3>📋 {t('summary')}</h3>
          <div className="summary-grid">
            <div className="summary-item">
              <span className="summary-label">{t('activeEmployees')}:</span>
              <span className="summary-value">{stats.totalEmployees}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">{t('hiresThisMonth')}:</span>
              <span className="summary-value">{stats.newThisMonth}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">{t('cdiContracts')}:</span>
              <span className="summary-value">{stats.cdiCount}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">{t('cddContracts')}:</span>
              <span className="summary-value">{stats.cddCount}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">{t('civpContracts')}:</span>
              <span className="summary-value">{stats.civpCount}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">{t('toRenew')}:</span>
              <span className="summary-value">{stats.contractsToRenew}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">{t('salaryMass')}:</span>
              <span className="summary-value">{stats.totalSalary.toLocaleString()} DT</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">{t('archivedEmployees')}:</span>
              <span className="summary-value">{stats.archivesCount}</span>
            </div>
          </div>
        </div>

        {stats.totalEmployees === 0 && (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <h3>{t('noEmployeesRegistered')}</h3>
            <p>{t('startByAddingFirstEmployee')}</p>
            <button 
              className="empty-action-btn"
              onClick={() => navigate('/team')}
            >
              ➕ {t('addFirstEmployee')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
