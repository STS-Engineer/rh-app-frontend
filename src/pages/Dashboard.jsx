import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { employeesAPI, getArchivedEmployees, getCurrentUser, isGlobalHrManager } from '../services/api';
import { exportEmployeesToExcel } from '../services/exportService';
import { getEmployeeSite } from '../utils/employeeProfile';
import { useLanguage } from '../contexts/LanguageContext';
import { useSiteFilter } from '../contexts/SiteFilterContext';
import './Dashboard.css';
import NotificationIcon from '../components/NotificationIcon';

const Dashboard = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const canFilterBySite = isGlobalHrManager(getCurrentUser());
  const { siteFilter, setSiteFilter } = useSiteFilter();
  const [employees, setEmployees] = useState([]);
  const [archivesCount, setArchivesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await employeesAPI.getAll();
      setEmployees(response.data || []);

      const archivesResponse = await getArchivedEmployees();
      setArchivesCount(archivesResponse.data.length);
    } catch (error) {
      console.error(t('errorLoadingStats'), error);
      alert(t('errorLoadingDashboard'));
    } finally {
      setLoading(false);
    }
  };

  const siteOptions = useMemo(
    () => Array.from(new Set(employees.map((emp) => getEmployeeSite(emp)).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [employees]
  );

  const scopedEmployees = useMemo(
    () => (canFilterBySite && siteFilter ? employees.filter((emp) => getEmployeeSite(emp) === siteFilter) : employees),
    [employees, siteFilter, canFilterBySite]
  );

  const stats = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const newThisMonth = scopedEmployees.filter(emp => {
      const empDate = new Date(emp.date_debut);
      return empDate.getMonth() === currentMonth && empDate.getFullYear() === currentYear;
    }).length;

    const contractsToRenew = scopedEmployees.filter(emp => {
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

    const totalSalary = scopedEmployees.reduce((sum, emp) => sum + parseFloat(emp.salaire_brute || 0), 0);
    const cdiCount = scopedEmployees.filter(emp => emp.type_contrat === 'CDI').length;
    const civpCount = scopedEmployees.filter(emp => emp.type_contrat === 'CIVP').length;
    const cddCount = scopedEmployees.filter(emp => emp.type_contrat === 'CDD').length;
    const stageCount = scopedEmployees.filter(emp => emp.type_contrat === 'Stage').length;
    const freelanceCount = scopedEmployees.filter(emp => emp.type_contrat === 'Freelance').length;

    return {
      totalEmployees: scopedEmployees.length,
      newThisMonth,
      contractsToRenew,
      totalSalary,
      cdiCount,
      cddCount,
      stageCount,
      freelanceCount,
      archivesCount,
      civpCount,
    };
  }, [scopedEmployees, archivesCount]);

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const response = await employeesAPI.getAll();
      const success = exportEmployeesToExcel(
        response.data, 
        `${t('employeeList')}-${new Date().toISOString().split('T')[0]}.xlsx`
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
    if (stats.cdiCount > 0) types.push(`${stats.cdiCount} ${t('cdiContracts')}`);
    if (stats.cddCount > 0) types.push(`${stats.cddCount} ${t('cddContracts')}`);
    if (stats.civpCount > 0) types.push(`${stats.civpCount} ${t('civpContracts')}`);
    if (stats.stageCount > 0) types.push(`${stats.stageCount} ${t('internship')}`);
    if (stats.freelanceCount > 0) types.push(`${stats.freelanceCount} ${t('freelance')}`);
    
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
        <div className="sidebar-notification-container">
          <NotificationIcon />
        </div>
        <header className="dashboard-header">
          <h1>🏢 {t('dashboard')}</h1>
          <p>{t('overview')} {t('appSubtitle')}</p>
          <div className="last-update">
            {t('lastUpdate')}: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
          </div>
        </header>

        {canFilterBySite && siteOptions.length > 0 && (
          <div className="dashboard-site-filter">
            <label htmlFor="dashboard-site-filter">{t('plantSite')}</label>
            <select
              id="dashboard-site-filter"
              value={siteFilter}
              onChange={(event) => setSiteFilter(event.target.value)}
            >
              <option value="">{t('allSites')}</option>
              {siteOptions.map((site) => (
                <option key={site} value={site}>{site}</option>
              ))}
            </select>
          </div>
        )}

        <div className="dashboard-stats">
          {/* ✅ Total Employees → /team (no filter) */}
          <div
            className="stat-card"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate('/team')}
          >
            <div className="stat-icon">👥</div>
            <div className="stat-info">
              <h3>{t('totalEmployees')}</h3>
              <p className="stat-number">{stats.totalEmployees}</p>
              <p className="stat-detail">
                {getContractTypesText()}
              </p>
            </div>
          </div>

          {/* ✅ New This Month → /team with newThisMonth filter */}
          <div
            className="stat-card"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate('/team', { state: { filter: 'newThisMonth' } })}
          >
            <div className="stat-icon">📊</div>
            <div className="stat-info">
              <h3>{t('newThisMonth')}</h3>
              <p className="stat-number">{stats.newThisMonth}</p>
              <p className="stat-detail">
                {stats.newThisMonth > 0 ? t('activeGrowth') : t('stableThisMonth')}
              </p>
            </div>
          </div>

          {/* ✅ Contracts to Renew → /team with contractsToRenew filter */}
          <div
            className="stat-card"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate('/team', { state: { filter: 'contractsToRenew' } })}
          >
            <div className="stat-icon">📅</div>
            <div className="stat-info">
              <h3>{t('contractsToRenew')}</h3>
              <p className="stat-number">{stats.contractsToRenew}</p>
              <p className="stat-detail">
                {t('next30Days')}
              </p>
            </div>
            <div className="stat-trend">
              {stats.contractsToRenew > 0 ? <span className="trend-warning" title={t('attention')}>⚠️</span> : <span className="trend-ok"></span>}
            </div>
          </div>

          {/* ✅ Total Salary → /statistics */}
          <div
            className="stat-card"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate('/statistics')}
          >
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

          {/* ✅ Archives → /archives */}
          <div
            className="stat-card"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate('/archives')}
          >
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
