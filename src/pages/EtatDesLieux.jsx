import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { employeesAPI, demandesAPI } from '../services/api';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import './EtatDesLieux.css';
import Sidebar from '../components/Sidebar';

// Icônes (vous pouvez utiliser react-icons ou des emojis)
const ICONS = {
  CONGE: '🏖️',
  MISSION: '✈️',
  AUTORISATION: '⏰',
  PRESENT: '✅',
  ABSENT: '❌',
  LATE: '⏰',
  CALENDAR: '📅',
  EMPLOYEE: '👤',
  FILTER: '🔍',
  DOWNLOAD: '📥',
  PRINT: '🖨️',
  STATS: '📊',
  TEAM: '👥',
  DEPARTMENT: '🏢',
  TIME: '⏳',
  LOCATION: '📍',
  DOCUMENT: '📄',
  APPROVED: '👍',
  PENDING: '⏳',
  REJECTED: '👎'
};

const EtatDesLieux = () => {
  const { t } = useLanguage();
  const [employees, setEmployees] = useState([]);
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - new Date().getDay())),
    end: new Date(new Date().setDate(new Date().getDate() - new Date().getDay() + 6))
  });
  const [filterType, setFilterType] = useState('week');
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [viewMode, setViewMode] = useState('week');
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [selectedAbsence, setSelectedAbsence] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Couleurs avec dégradés
  const statusColors = {
    'congé': 'linear-gradient(135deg, #ff6b6b 0%, #ff8e8e 100%)',
    'mission': 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)',
    'autorisation': 'linear-gradient(135deg, #45b7d1 0%, #5e72e4 100%)',
    'retard': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'formation': 'linear-gradient(135deg, #96e6a1 0%, #d4fc79 100%)',
    'maladie': 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
    'default': 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)'
  };

  // Icônes par type
  const statusIcons = {
    'congé': ICONS.CONGE,
    'mission': ICONS.MISSION,
    'autorisation': ICONS.AUTORISATION,
    'retard': ICONS.LATE,
    'formation': '📚',
    'maladie': '🤒',
    'default': ICONS.PRESENT
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [employeesRes, demandesRes] = await Promise.all([
        employeesAPI.getAll(),
        demandesAPI.getAll()
      ]);
      
      setEmployees(employeesRes.data);
      setDemandes(demandesRes.data.demandes || demandesRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Erreur chargement données:', error);
      setLoading(false);
    }
  };

  // Fonction pour formater une période d'absence
  const formatAbsencePeriod = (demande) => {
    if (!demande) return '';
    
    const dateDepart = new Date(demande.date_depart);
    const dateRetour = demande.date_retour ? new Date(demande.date_retour) : dateDepart;
    
    const formatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    const formattedDepart = dateDepart.toLocaleDateString('fr-FR', formatOptions);
    const formattedRetour = dateRetour.toLocaleDateString('fr-FR', formatOptions);
    
    if (dateDepart.toDateString() === dateRetour.toDateString()) {
      return `Le ${formattedDepart}`;
    } else {
      return `Du ${formattedDepart} au ${formattedRetour}`;
    }
  };

  const datesToDisplay = useMemo(() => {
    const dates = [];
    
    switch (viewMode) {
      case 'day':
        dates.push(selectedDate);
        break;
      case 'week':
        const startOfWeek = new Date(dateRange.start);
        for (let i = 0; i < 7; i++) {
          const date = new Date(startOfWeek);
          date.setDate(startOfWeek.getDate() + i);
          dates.push(date);
        }
        break;
      case 'month':
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let i = 1; i <= daysInMonth; i++) {
          dates.push(new Date(year, month, i));
        }
        break;
      default:
        dates.push(selectedDate);
    }
    
    return dates;
  }, [viewMode, selectedDate, dateRange]);

  const filteredEmployees = useMemo(() => {
    let filtered = employees;
    
    if (selectedDepartment !== 'all') {
      filtered = filtered.filter(emp => emp.departement === selectedDepartment);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(emp => 
        `${emp.prenom} ${emp.nom}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.matricule.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.poste.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (selectedEmployee !== 'all') {
      filtered = filtered.filter(emp => 
        emp.id.toString() === selectedEmployee
      );
    }
    
    return filtered;
  }, [employees, selectedDepartment, searchQuery, selectedEmployee]);

  const getEmployeeStatusOnDate = (employeeId, date) => {
    const dateStr = date.toISOString().split('T')[0];
    
    // Chercher toutes les demandes approuvées pour cet employé
    const demandesApprouvees = demandes.filter(d => 
      d.employe_id === employeeId && d.statut === 'approuve'
    );
    
    // Chercher une demande qui couvre la date spécifiée
    const demande = demandesApprouvees.find(d => {
      const dateDepart = new Date(d.date_depart);
      const dateRetour = d.date_retour ? new Date(d.date_retour) : dateDepart;
      
      // Normaliser les dates (ignorer l'heure)
      const dateDepartStr = dateDepart.toISOString().split('T')[0];
      const dateRetourStr = dateRetour.toISOString().split('T')[0];
      const currentDateStr = date.toISOString().split('T')[0];
      
      // Comparer les chaînes de caractères des dates
      const dateDepartTime = new Date(dateDepartStr).getTime();
      const dateRetourTime = new Date(dateRetourStr).getTime();
      const currentDateTime = new Date(currentDateStr).getTime();
      
      // Vérifier si la date actuelle est dans l'intervalle [dateDepart, dateRetour]
      // Note: date_retour est incluse dans le congé (c'est la dernière journée de congé)
      return currentDateTime >= dateDepartTime && currentDateTime <= dateRetourTime;
    });
    
    if (!demande) {
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      return { 
        status: isWeekend ? 'weekend' : 'available', 
        color: isWeekend ? '#f3f4f6' : statusColors.default,
        icon: isWeekend ? '😴' : ICONS.PRESENT
      };
    }
    
    let statusType = demande.type_demande || 'autorisation';
    if (statusType === 'congé') statusType = 'congé';
    if (statusType === 'mission') statusType = 'mission';
    if (statusType === 'formation') statusType = 'formation';
    if (statusType === 'maladie') statusType = 'maladie';
    
    return {
      status: statusType,
      color: statusColors[statusType] || statusColors.default,
      icon: statusIcons[statusType] || ICONS.AUTORISATION,
      demande: demande
    };
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const navigateDate = (direction) => {
    const newDate = new Date(selectedDate);
    
    switch (viewMode) {
      case 'day':
        newDate.setDate(newDate.getDate() + direction);
        setSelectedDate(newDate);
        break;
      case 'week':
        const newStart = new Date(dateRange.start);
        newStart.setDate(newStart.getDate() + (direction * 7));
        const newEnd = new Date(newStart);
        newEnd.setDate(newEnd.getDate() + 6);
        setDateRange({ start: newStart, end: newEnd });
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + direction);
        setSelectedDate(newDate);
        break;
    }
  };

  const handleCellClick = (employee, date, status) => {
    if (status.status !== 'available' && status.status !== 'weekend') {
      setSelectedAbsence({
        employee,
        date,
        ...status
      });
      setShowDetailsPanel(true);
    }
  };

  const getDepartments = () => {
    const departments = new Set(employees.map(emp => emp.departement).filter(Boolean));
    return ['all', ...Array.from(departments)];
  };

  const exportToExcel = () => {
    // Implémentez l'export Excel ici
    console.log('Exporting data...');
  };

  const printReport = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="etat-des-lieux-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="text-gradient">{t('loading_data')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="etat-des-lieux-container">
      <div className="etat-header">
        <h1>
          <span className="text-gradient">{t('presence_tracker')}</span>
          <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 'normal' }}>
            {t('real_time_monitoring')}
          </span>
        </h1>
        
        <div className="main-navigation">
          <div className="view-controls">
            <button 
              className={`view-btn ${viewMode === 'day' ? 'active' : ''}`}
              onClick={() => setViewMode('day')}
            >
              {ICONS.CALENDAR} {t('today')}
            </button>
            <button 
              className={`view-btn ${viewMode === 'week' ? 'active' : ''}`}
              onClick={() => setViewMode('week')}
            >
              {ICONS.TEAM} {t('this_week')}
            </button>
            <button 
              className={`view-btn ${viewMode === 'month' ? 'active' : ''}`}
              onClick={() => setViewMode('month')}
            >
              {ICONS.STATS} {t('this_month')}
            </button>
          </div>

          <div className="date-navigation">
            <button className="nav-btn" onClick={() => navigateDate(-1)}>
              ← {t('previous')}
            </button>
            
            {viewMode === 'day' && (
              <DatePicker
                selected={selectedDate}
                onChange={date => setSelectedDate(date)}
                dateFormat="EEEE dd MMMM yyyy"
                className="date-picker"
                customInput={
                  <button className="date-picker custom">
                    {ICONS.CALENDAR} {formatDate(selectedDate)}
                  </button>
                }
              />
            )}
            
            {viewMode === 'week' && (
              <div className="week-display">
                {formatDate(dateRange.start).split(' ')[0]} {dateRange.start.getDate()} - 
                {formatDate(dateRange.end).split(' ')[0]} {dateRange.end.getDate()} {dateRange.end.getFullYear()}
              </div>
            )}
            
            {viewMode === 'month' && (
              <div className="month-display">
                {selectedDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
              </div>
            )}
            
            <button className="nav-btn" onClick={() => navigateDate(1)}>
              {t('next')} →
            </button>
          </div>

          <div className="action-buttons">
            <button className="action-btn secondary-btn" onClick={exportToExcel}>
              {ICONS.DOWNLOAD} {t('export')}
            </button>
            <button className="action-btn secondary-btn" onClick={printReport}>
              {ICONS.PRINT} {t('print')}
            </button>
          </div>
        </div>

        {/* Filtres avancés */}
        <div className="advanced-filters">
          <div className="filter-group">
            <label className="filter-label">{ICONS.FILTER} {t('search_employee')}</label>
            <input
              type="text"
              placeholder={t('search_by_name_matricule_position')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="employee-search"
            />
          </div>
          
          <div className="filter-group">
            <label className="filter-label">{ICONS.DEPARTMENT} {t('department')}</label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="department-select"
            >
              <option value="all">{t('all_departments')}</option>
              {getDepartments().slice(1).map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label className="filter-label">{ICONS.EMPLOYEE} {t('specific_employee')}</label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="filter-select"
            >
              <option value="all">{t('all_employees')}</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.prenom} {emp.nom} ({emp.matricule})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Légende */}
      <div className="legend-container">
        <div className="legend-item">
          <div className="color-box" style={{ background: statusColors.default }}></div>
          <span>{t('available')}</span>
        </div>
        <div className="legend-item">
          <div className="color-box" style={{ background: statusColors.congé }}></div>
          <span>{t('on_leave')}</span>
        </div>
        <div className="legend-item">
          <div className="color-box" style={{ background: statusColors.mission }}></div>
          <span>{t('on_mission')}</span>
        </div>
        <div className="legend-item">
          <div className="color-box" style={{ background: statusColors.autorisation }}></div>
          <span>{t('authorized_absence')}</span>
        </div>
        <div className="legend-item">
          <div className="color-box" style={{ background: statusColors.retard }}></div>
          <span>{t('late')}</span>
        </div>
        <div className="legend-item">
          <div className="color-box" style={{ background: statusColors.maladie }}></div>
          <span>{t('sick_leave')}</span>
        </div>
      </div>

      {/* Tableau principal */}
      <div className="presence-table-container">
        <div className="table-header">
          <h2>
            {ICONS.TEAM} {t('presence_overview')}
            <span style={{ fontSize: '14px', fontWeight: 'normal', opacity: 0.9 }}>
              {filteredEmployees.length} {t('employees')} • {datesToDisplay.length} {t('days')}
            </span>
          </h2>
        </div>
        
        <div className="table-scroll-container">
          <table className="presence-table">
            <thead>
              <tr>
                <th className="employee-column">{t('employee')}</th>
                {datesToDisplay.map((date, index) => {
                  const isToday = new Date().toDateString() === date.toDateString();
                  return (
                    <th key={index} className="date-column">
                      <div className="date-header">
                        <div className="weekday">
                          {date.toLocaleDateString('fr-FR', { weekday: 'short' })}
                        </div>
                        <div className={`day ${isToday ? 'today' : ''}`}>
                          {date.getDate()}
                        </div>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((employee) => (
                <tr key={employee.id} className="employee-row">
                  <td className="employee-cell">
                    <div className="employee-info">
                      <div className="employee-name">
                        <div className="employee-avatar">
                          {employee.prenom.charAt(0)}{employee.nom.charAt(0)}
                        </div>
                        {employee.prenom} {employee.nom}
                      </div>
                      <div className="employee-details">
                        <span className="employee-role">{employee.poste}</span>
                        <span className="employee-id">
                          {ICONS.DOCUMENT} {employee.matricule}
                        </span>
                      </div>
                    </div>
                  </td>
                  
                  {datesToDisplay.map((date, dateIndex) => {
                    const status = getEmployeeStatusOnDate(employee.id, date);
                    const isToday = new Date().toDateString() === date.toDateString();
                    
                    return (
                      <td 
                        key={dateIndex} 
                        className="status-cell"
                        style={{ 
                          background: status.color,
                          border: isToday ? '3px solid #667eea' : '1px solid #e5e7eb'
                        }}
                        onClick={() => handleCellClick(employee, date, status)}
                        title={`${employee.prenom} ${employee.nom} - ${formatDate(date)}`}
                      >
                        <div className="status-content">
                          <div className="status-icon">
                            {status.icon}
                          </div>
                          {status.status !== 'available' && status.status !== 'weekend' && (
                            <>
                              <div className="status-type">
                                {t(status.status)}
                              </div>
                              {status.demande?.heure_depart && (
                                <div className="time-info">
                                  {ICONS.TIME} {status.demande.heure_depart.substring(0, 5)}
                                </div>
                              )}
                              <div className="status-badge"></div>
                            </>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vue détaillée */}
      {viewMode === 'day' && (
        <div className="detailed-view">
          <h3>
            {ICONS.CALENDAR} {t('daily_details')} - {formatDate(selectedDate)}
          </h3>
          
          <div className="absences-grid">
            {filteredEmployees.map(employee => {
              const status = getEmployeeStatusOnDate(employee.id, selectedDate);
              
              if (status.status === 'available' || status.status === 'weekend') return null;
              
              return (
                <div 
                  key={employee.id} 
                  className="absence-card"
                  style={{ borderLeftColor: status.color.split(' ')[2] }}
                  onClick={() => {
                    setSelectedAbsence({ employee, date: selectedDate, ...status });
                    setShowDetailsPanel(true);
                  }}
                >
                  <div className="absence-header">
                    <div className="employee-info-small">
                      <div className="employee-avatar-small">
                        {employee.prenom.charAt(0)}{employee.nom.charAt(0)}
                      </div>
                      <div>
                        <div className="employee-name">{employee.prenom} {employee.nom}</div>
                        <div className="employee-role">{employee.poste}</div>
                      </div>
                    </div>
                    <div 
                      className="absence-type-badge"
                      style={{ background: status.color }}
                    >
                      {status.icon} {t(status.status)}
                    </div>
                  </div>
                  
                  <div className="absence-details">
                    <div className="detail-row">
                      <span className="detail-label">
                        {ICONS.TIME} {t('period')}:
                      </span>
                      <span className="detail-value">
                        {formatAbsencePeriod(status.demande)}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">
                        {ICONS.DOCUMENT} {t('title')}:
                      </span>
                      <span className="detail-value">{status.demande?.titre || 'Non spécifié'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">
                        {ICONS.LOCATION} {t('location')}:
                      </span>
                      <span className="detail-value">{status.demande?.lieu || '-'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {!filteredEmployees.some(emp => 
              getEmployeeStatusOnDate(emp.id, selectedDate).status !== 'available' &&
              getEmployeeStatusOnDate(emp.id, selectedDate).status !== 'weekend'
            ) && (
              <div className="no-absences">
                <p>{t('no_absences_today')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Statistiques */}
      <div className="stats-container">
        <div className="stat-card">
          <div className="stat-icon">{ICONS.TEAM}</div>
          <div className="stat-value">{filteredEmployees.length}</div>
          <div className="stat-label">{t('total_employees')}</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">{ICONS.CONGE}</div>
          <div className="stat-value">
            {filteredEmployees.filter(emp => 
              getEmployeeStatusOnDate(emp.id, selectedDate).status === 'congé'
            ).length}
          </div>
          <div className="stat-label">{t('on_leave')}</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">{ICONS.MISSION}</div>
          <div className="stat-value">
            {filteredEmployees.filter(emp => 
              getEmployeeStatusOnDate(emp.id, selectedDate).status === 'mission'
            ).length}
          </div>
          <div className="stat-label">{t('on_mission')}</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">{ICONS.AUTORISATION}</div>
          <div className="stat-value">
            {filteredEmployees.filter(emp => 
              getEmployeeStatusOnDate(emp.id, selectedDate).status === 'autorisation'
            ).length}
          </div>
          <div className="stat-label">{t('authorized_absences')}</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-value">
            {((filteredEmployees.filter(emp => 
              getEmployeeStatusOnDate(emp.id, selectedDate).status === 'available'
            ).length / filteredEmployees.length) * 100).toFixed(1)}%
          </div>
          <div className="stat-label">{t('presence_rate')}</div>
        </div>
      </div>

      {/* Panneau latéral des détails */}
      <div className={`details-panel ${showDetailsPanel ? 'open' : ''}`}>
        {selectedAbsence && (
          <>
            <div className="panel-header">
              <h3>{t('absence_details')}</h3>
              <button className="close-panel" onClick={() => setShowDetailsPanel(false)}>
                ×
              </button>
            </div>
            
            <div className="panel-content">
              <div className="absence-header">
                <div className="employee-info-small">
                  <div className="employee-avatar-small" style={{ background: selectedAbsence.color }}>
                    {selectedAbsence.employee.prenom.charAt(0)}{selectedAbsence.employee.nom.charAt(0)}
                  </div>
                  <div>
                    <h4>{selectedAbsence.employee.prenom} {selectedAbsence.employee.nom}</h4>
                    <p>{selectedAbsence.employee.poste} • {selectedAbsence.employee.matricule}</p>
                  </div>
                </div>
              </div>
              
              <div className="absence-details">
                <div className="detail-row">
                  <span className="detail-label">{t('date')}:</span>
                  <span className="detail-value">{formatDate(selectedAbsence.date)}</span>
                </div>
                
                <div className="detail-row">
                  <span className="detail-label">{t('period')}:</span>
                  <span className="detail-value">
                    {formatAbsencePeriod(selectedAbsence.demande)}
                  </span>
                </div>
                
                <div className="detail-row">
                  <span className="detail-label">{t('type')}:</span>
                  <span 
                    className="detail-value"
                    style={{ 
                      color: selectedAbsence.color.split(' ')[2],
                      fontWeight: 'bold'
                    }}
                  >
                    {selectedAbsence.icon} {t(selectedAbsence.status)}
                  </span>
                </div>
                
                {selectedAbsence.demande && (
                  <>
                    <div className="detail-row">
                      <span className="detail-label">{t('title')}:</span>
                      <span className="detail-value">{selectedAbsence.demande.titre}</span>
                    </div>
                    
                    <div className="detail-row">
                      <span className="detail-label">{t('description')}:</span>
                      <span className="detail-value">{selectedAbsence.demande.description || '-'}</span>
                    </div>
                    
                    <div className="detail-row">
                      <span className="detail-label">{t('time')}:</span>
                      <span className="detail-value">
                        {selectedAbsence.demande.heure_depart?.substring(0, 5) || 'Toute la journée'}
                        {selectedAbsence.demande.heure_retour && ` - ${selectedAbsence.demande.heure_retour.substring(0, 5)}`}
                      </span>
                    </div>
                    
                    <div className="detail-row">
                      <span className="detail-label">{t('location')}:</span>
                      <span className="detail-value">{selectedAbsence.demande.lieu || '-'}</span>
                    </div>
                    
                    <div className="detail-row">
                      <span className="detail-label">{t('approved_by')}:</span>
                      <span className="detail-value">{selectedAbsence.demande.approuve_par || '-'}</span>
                    </div>
                    
                    <div className="detail-row">
                      <span className="detail-label">{t('status')}:</span>
                      <span className="detail-value" style={{ color: '#48bb78' }}>
                        {ICONS.APPROVED} {t('approved')}
                      </span>
                    </div>
                  </>
                )}
              </div>
              
              <div className="action-buttons" style={{ marginTop: '20px' }}>
                <button className="action-btn primary-btn">
                  {ICONS.DOCUMENT} {t('view_documents')}
                </button>
                <button className="action-btn secondary-btn">
                  {ICONS.PRINT} {t('print_details')}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EtatDesLieux;
