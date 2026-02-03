import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { employeesAPI, demandesAPI } from '../services/api';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import './EtatDesLieux.css';

const EtatDesLieux = () => {
  const { t } = useLanguage();
  const [employees, setEmployees] = useState([]);
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dateRange, setDateRange] = useState({
    start: new Date(),
    end: new Date(new Date().setDate(new Date().getDate() + 6))
  });
  const [filterType, setFilterType] = useState('week'); // 'day', 'week', 'month', 'employee'
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [viewMode, setViewMode] = useState('day'); // 'day', 'week', 'month'
  
  // Couleurs pour les différents types d'absence
  const statusColors = {
    'congé': '#ff6b6b', // Rouge pour congé
    'mission': '#4ecdc4', // Turquoise pour mission
    'autorisation': '#45b7d1', // Bleu pour autorisation
    'default': '#f8f9fa' // Gris clair pour disponible
  };

  // Charger les données
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

  // Générer les dates à afficher selon le mode
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

  // Filtrer les employés selon la sélection
  const filteredEmployees = useMemo(() => {
    if (selectedEmployee === 'all') return employees;
    return employees.filter(emp => 
      `${emp.prenom} ${emp.nom}`.toLowerCase().includes(selectedEmployee.toLowerCase()) ||
      emp.matricule.toLowerCase().includes(selectedEmployee.toLowerCase())
    );
  }, [employees, selectedEmployee]);

  // Trouver les demandes pour un employé à une date donnée
  const getEmployeeStatusOnDate = (employeeId, date) => {
    const dateStr = date.toISOString().split('T')[0];
    
    const demande = demandes.find(d => {
      if (d.employe_id !== employeeId) return false;
      
      const demandeDate = new Date(d.date_depart);
      const demandeDateStr = demandeDate.toISOString().split('T')[0];
      
      // Vérifier si la date correspond
      return demandeDateStr === dateStr && d.statut === 'approuve';
    });
    
    if (!demande) return { status: 'available', color: statusColors.default };
    
    // Déterminer le type d'absence
    let statusType = 'autorisation';
    if (demande.type_demande === 'congé') statusType = 'congé';
    if (demande.type_demande === 'mission') statusType = 'mission';
    
    return {
      status: statusType,
      color: statusColors[statusType] || statusColors.default,
      demande: demande
    };
  };

  // Formatage de la date
  const formatDate = (date) => {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  // Navigation dans les dates
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

  if (loading) {
    return (
      <div className="etat-des-lieux-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="etat-des-lieux-container">
      {/* Header avec titre et contrôles */}
      <div className="etat-header">
        <h1>📅 {t('presence')}</h1>
        
        <div className="controls-container">
          {/* Sélection du mode d'affichage */}
          <div className="view-controls">
            <button 
              className={`view-btn ${viewMode === 'day' ? 'active' : ''}`}
              onClick={() => setViewMode('day')}
            >
              {t('today')}
            </button>
            <button 
              className={`view-btn ${viewMode === 'week' ? 'active' : ''}`}
              onClick={() => setViewMode('week')}
            >
              {t('this_week')}
            </button>
            <button 
              className={`view-btn ${viewMode === 'month' ? 'active' : ''}`}
              onClick={() => setViewMode('month')}
            >
              {t('this_month')}
            </button>
          </div>

          {/* Navigation dans les dates */}
          <div className="date-navigation">
            <button 
              className="nav-btn"
              onClick={() => navigateDate(-1)}
            >
              ← {t('previous_week')}
            </button>
            
            {viewMode === 'day' && (
              <DatePicker
                selected={selectedDate}
                onChange={date => setSelectedDate(date)}
                dateFormat="dd/MM/yyyy"
                className="date-picker"
              />
            )}
            
            {viewMode === 'week' && (
              <div className="week-display">
                {formatDate(dateRange.start)} - {formatDate(dateRange.end)}
              </div>
            )}
            
            {viewMode === 'month' && (
              <div className="month-display">
                {selectedDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
              </div>
            )}
            
            <button 
              className="nav-btn"
              onClick={() => navigateDate(1)}
            >
              {t('next_week')} →
            </button>
          </div>

          {/* Filtre par employé */}
          <div className="employee-filter">
            <input
              type="text"
              placeholder={t('filter_by_employee')}
              value={selectedEmployee === 'all' ? '' : selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value || 'all')}
              className="employee-search"
            />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="filter-select"
            >
              <option value="day">{t('filter_by_date')}</option>
              <option value="week">{t('filter_by_week')}</option>
              <option value="month">{t('this_month')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Légende */}
      <div className="legend-container">
        <div className="legend-item">
          <div className="color-box" style={{ backgroundColor: statusColors.default }}></div>
          <span>{t('available')}</span>
        </div>
        <div className="legend-item">
          <div className="color-box" style={{ backgroundColor: statusColors.congé }}></div>
          <span>{t('on_leave')}</span>
        </div>
        <div className="legend-item">
          <div className="color-box" style={{ backgroundColor: statusColors.mission }}></div>
          <span>{t('on_mission')}</span>
        </div>
        <div className="legend-item">
          <div className="color-box" style={{ backgroundColor: statusColors.autorisation }}></div>
          <span>{t('authorized_absence')}</span>
        </div>
      </div>

      {/* Tableau principal */}
      <div className="presence-table-container">
        <table className="presence-table">
          <thead>
            <tr>
              <th className="employee-column">{t('employee_name')}</th>
              {datesToDisplay.map((date, index) => (
                <th key={index} className="date-column">
                  <div className="date-header">
                    <div className="weekday">{date.toLocaleDateString('fr-FR', { weekday: 'short' })}</div>
                    <div className="day">{date.getDate()}</div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map((employee) => (
              <tr key={employee.id} className="employee-row">
                <td className="employee-cell">
                  <div className="employee-info">
                    <div className="employee-name">
                      {employee.prenom} {employee.nom}
                    </div>
                    <div className="employee-details">
                      {employee.poste} • {employee.matricule}
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
                        backgroundColor: status.color,
                        border: isToday ? '2px solid #2563eb' : '1px solid #e5e7eb'
                      }}
                      title={`${employee.prenom} ${employee.nom} - ${formatDate(date)}: ${status.status}`}
                    >
                      <div className="status-content">
                        {status.status !== 'available' && (
                          <div className="status-details">
                            <div className="status-type">
                              {status.demande?.type_demande || status.status}
                            </div>
                            {status.demande?.heure_depart && (
                              <div className="time-info">
                                {status.demande.heure_depart.substring(0, 5)}
                                {status.demande.heure_retour && ` - ${status.demande.heure_retour.substring(0, 5)}`}
                              </div>
                            )}
                          </div>
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

      {/* Vue détaillée pour le mode jour */}
      {viewMode === 'day' && (
        <div className="detailed-view">
          <h3>📋 {t('details_for')} {formatDate(selectedDate)}</h3>
          <div className="absences-list">
            {filteredEmployees.map(employee => {
              const status = getEmployeeStatusOnDate(employee.id, selectedDate);
              
              if (status.status === 'available') return null;
              
              return (
                <div key={employee.id} className="absence-item" style={{ borderLeft: `4px solid ${status.color}` }}>
                  <div className="absence-header">
                    <span className="employee-name">{employee.prenom} {employee.nom}</span>
                    <span className="absence-type" style={{ color: status.color }}>
                      {status.demande?.type_demande || status.status}
                    </span>
                  </div>
                  <div className="absence-details">
                    <div className="detail-row">
                      <span className="detail-label">{t('time')}:</span>
                      <span className="detail-value">
                        {status.demande?.heure_depart?.substring(0, 5) || 'Toute la journée'}
                        {status.demande?.heure_retour && ` - ${status.demande.heure_retour.substring(0, 5)}`}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">{t('reason')}:</span>
                      <span className="detail-value">{status.demande?.titre || 'Non spécifié'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {!filteredEmployees.some(emp => 
              getEmployeeStatusOnDate(emp.id, selectedDate).status !== 'available'
            ) && (
              <div className="no-absences">
                <p>{t('no_absences')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Statistiques */}
      <div className="stats-container">
        <div className="stat-card">
          <div className="stat-value">{filteredEmployees.length}</div>
          <div className="stat-label">{t('all_employees')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: statusColors.congé }}>
            {filteredEmployees.filter(emp => 
              getEmployeeStatusOnDate(emp.id, selectedDate).status === 'congé'
            ).length}
          </div>
          <div className="stat-label">{t('on_leave')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: statusColors.mission }}>
            {filteredEmployees.filter(emp => 
              getEmployeeStatusOnDate(emp.id, selectedDate).status === 'mission'
            ).length}
          </div>
          <div className="stat-label">{t('on_mission')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: statusColors.autorisation }}>
            {filteredEmployees.filter(emp => 
              getEmployeeStatusOnDate(emp.id, selectedDate).status === 'autorisation'
            ).length}
          </div>
          <div className="stat-label">{t('authorized_absence')}</div>
        </div>
      </div>
    </div>
  );
};

export default EtatDesLieux;
