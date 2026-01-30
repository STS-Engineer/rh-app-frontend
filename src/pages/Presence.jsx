import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { employeesAPI, demandesAPI } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import './Presence.css';

const Presence = () => {
  const { t } = useLanguage();
  const [employees, setEmployees] = useState([]);
  const [demandes, setDemandes] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('day');
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  
  const [dateRange, setDateRange] = useState({
    start: new Date(),
    end: new Date(new Date().setDate(new Date().getDate() + 7))
  });
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
    try {
      setLoading(true);
      const [employeesRes, demandesRes] = await Promise.all([
        employeesAPI.getAll(),
        demandesAPI.getAll()
      ]);
      
      setEmployees(employeesRes.data);
      setDemandes(demandesRes.data.demandes || []);
      setFilteredData(employeesRes.data);
    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const getEmployeeStatus = (employeeId, date) => {
    const dateStr = date.toISOString().split('T')[0];
    
    const demandesEmployee = demandes.filter(d => 
      d.employe_id === employeeId && 
      d.statut === 'approuve'
    );
    
    for (const demande of demandesEmployee) {
      const startDate = new Date(demande.date_depart);
      const endDate = demande.date_retour ? new Date(demande.date_retour) : new Date(demande.date_depart);
      
      if (date >= startDate && date <= endDate) {
        return {
          status: demande.type_demande,
          color: getStatusColor(demande.type_demande),
          demande: demande
        };
      }
    }
    
    return { status: 'present', color: '#10B981', demande: null };
  };
  
  const getStatusColor = (type) => {
    switch(type?.toLowerCase()) {
      case 'conge': return '#F59E0B';
      case 'mission': return '#3B82F6';
      case 'autorisation': return '#8B5CF6';
      default: return '#10B981';
    }
  };
  
  const generateWeekDates = () => {
    const dates = [];
    const start = new Date(dateRange.start);
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date);
    }
    
    return dates;
  };
  
  const generateMonthDates = () => {
    const dates = [];
    const start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const end = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
    
    let current = new Date(start);
    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  };
  
  const applyFilters = () => {
    let filtered = employees;
    
    if (selectedEmployee !== 'all') {
      filtered = filtered.filter(emp => emp.id === parseInt(selectedEmployee));
    }
    
    setFilteredData(filtered);
  };
  
  const formatDate = (date) => {
    return date.toLocaleDateString('fr-FR', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    });
  };
  
  if (loading) {
    return (
      <div className="app-container">
        <Sidebar />
        <div className="main-content">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <div className="loading-text">Chargement des données...</div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        {/* PAGE CONTENT WRAPPER */}
        <div className="presence-page">
          {/* Header */}
          <div className="presence-header">
            <h1>📅 État des Lieux - Présence des Collaborateurs</h1>
            <p>Visualisez les congés, missions et autorisations d'absence en temps réel</p>
          </div>
          
          {/* Contrôles */}
          <div className="presence-controls">
            <div className="control-group">
              <label>Mode d'affichage :</label>
              <select 
                value={viewMode} 
                onChange={(e) => setViewMode(e.target.value)}
                className="control-select"
              >
                <option value="day">Jour</option>
                <option value="week">Semaine</option>
                <option value="month">Mois</option>
              </select>
            </div>
            
            <div className="control-group">
              <label>Employé :</label>
              <select 
                value={selectedEmployee} 
                onChange={(e) => {
                  setSelectedEmployee(e.target.value);
                  applyFilters();
                }}
                className="control-select"
              >
                <option value="all">Tous les employés</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.prenom} {emp.nom}
                  </option>
                ))}
              </select>
            </div>
            
            {viewMode === 'day' && (
              <div className="control-group">
                <label>Date :</label>
                <input
                  type="date"
                  value={selectedDate.toISOString().split('T')[0]}
                  onChange={(e) => setSelectedDate(new Date(e.target.value))}
                  className="control-input"
                />
              </div>
            )}
            
            {viewMode === 'week' && (
              <div className="control-group">
                <label>Semaine du :</label>
                <input
                  type="date"
                  value={dateRange.start.toISOString().split('T')[0]}
                  onChange={(e) => setDateRange({
                    ...dateRange,
                    start: new Date(e.target.value)
                  })}
                  className="control-input"
                />
              </div>
            )}
            
            {viewMode === 'month' && (
              <div className="control-group">
                <label>Mois :</label>
                <input
                  type="month"
                  value={`${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`}
                  onChange={(e) => {
                    const [year, month] = e.target.value.split('-');
                    setSelectedDate(new Date(year, month - 1, 1));
                  }}
                  className="control-input"
                />
              </div>
            )}
          </div>
          
          {/* Légende */}
          <div className="presence-legend">
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#10B981' }}></span>
              <span>Présent / Disponible</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#F59E0B' }}></span>
              <span>Congé</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#3B82F6' }}></span>
              <span>Mission</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#8B5CF6' }}></span>
              <span>Autorisation d'absence</span>
            </div>
          </div>
          
          {/* Tableau principal */}
          <div className="presence-table-container">
            <table className="presence-table">
              <thead>
                <tr>
                  <th>Employé</th>
                  <th>Poste</th>
                  
                  {viewMode === 'day' && (
                    <th>{formatDate(selectedDate)}</th>
                  )}
                  
                  {viewMode === 'week' && (
                    generateWeekDates().map(date => (
                      <th key={date.toISOString()}>{formatDate(date)}</th>
                    ))
                  )}
                  
                  {viewMode === 'month' && (
                    generateMonthDates().map((date, index) => (
                      index < 7 && (
                        <th key={date.toISOString()}>{formatDate(date)}</th>
                      )
                    ))
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredData.map(employee => (
                  <tr key={employee.id}>
                    <td className="employee-cell">
                      <div className="employee-info">
                        {employee.photo ? (
                          <img 
                            src={employee.photo} 
                            alt={`${employee.prenom} ${employee.nom}`}
                            className="employee-photo"
                          />
                        ) : (
                          <div className="employee-photo-placeholder">
                            {employee.prenom?.charAt(0)}{employee.nom?.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div className="employee-name">{employee.prenom} {employee.nom}</div>
                          <div className="employee-matricule">{employee.matricule}</div>
                        </div>
                      </div>
                    </td>
                    <td>{employee.poste}</td>
                    
                    {viewMode === 'day' && (
                      <td>
                        <div 
                          className="status-cell"
                          style={{ 
                            backgroundColor: getEmployeeStatus(employee.id, selectedDate).color,
                            color: 'white'
                          }}
                        >
                          {getEmployeeStatus(employee.id, selectedDate).status.toUpperCase()}
                        </div>
                      </td>
                    )}
                    
                    {viewMode === 'week' && (
                      generateWeekDates().map(date => {
                        const status = getEmployeeStatus(employee.id, date);
                        return (
                          <td key={date.toISOString()}>
                            <div 
                              className="status-cell"
                              style={{ 
                                backgroundColor: status.color,
                                color: 'white',
                                cursor: status.demande ? 'pointer' : 'default'
                              }}
                              title={status.demande ? `Titre: ${status.demande.titre}` : 'Présent'}
                            >
                              {status.status.charAt(0).toUpperCase()}
                            </div>
                          </td>
                        );
                      })
                    )}
                    
                    {viewMode === 'month' && (
                      generateMonthDates().map((date, index) => {
                        if (index >= 7) return null;
                        const status = getEmployeeStatus(employee.id, date);
                        return (
                          <td key={date.toISOString()}>
                            <div 
                              className="status-cell small"
                              style={{ 
                                backgroundColor: status.color,
                                color: 'white'
                              }}
                              title={`${formatDate(date)}: ${status.status}`}
                            >
                              {date.getDate()}
                            </div>
                          </td>
                        );
                      })
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            
            {viewMode === 'month' && (
              <div className="month-view-note">
                <p>⚠️ Affichage limité à 7 jours pour lisibilité. Utilisez le filtre date pour naviguer.</p>
              </div>
            )}
          </div>
          
          {/* Calendrier */}
          <div className="calendar-view-container">
            <h3>📅 Calendrier Global des Absences</h3>
            <div className="calendar-grid">
              {generateWeekDates().map(date => (
                <div key={date.toISOString()} className="calendar-day">
                  <div className="calendar-day-header">
                    {formatDate(date)}
                  </div>
                  <div className="calendar-day-content">
                    {employees.slice(0, 5).map(employee => {
                      const status = getEmployeeStatus(employee.id, date);
                      if (status.status !== 'present') {
                        return (
                          <div 
                            key={employee.id} 
                            className="calendar-employee-event"
                            style={{ borderLeft: `4px solid ${status.color}` }}
                          >
                            <strong>{employee.prenom} {employee.nom.charAt(0)}.</strong>
                            <span> - {status.status}</span>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Presence;
