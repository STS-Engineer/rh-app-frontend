/**
 * EtatDesLieux.jsx — FIXED timezone/day-shift bug in getEmployeeStatusOnDate
 *
 * ✅ Fix: remove toISOString().split('T')[0] comparisons (UTC day-shift)
 * ✅ Fix: compare days using LOCAL midnight timestamps
 * ✅ Extra safety: supports date strings like "YYYY-MM-DD" / ISO datetime, and also "DD-MM-YYYY"
 *
 * ✅ i18n Fix (missing keys safety):
 * - Some EDL keys are missing in your `fr` translations.
 * - This component now uses a safe helper `tf(key, fallback)` so the UI stays translated
 *   even when a key is missing (fallback is French by default).
 *
 * ✅ Layout Fix: wrapped all content in .etat-des-lieux-content so sidebar
 *   no longer overlaps page content.
 *
 * Note: I kept your "end date inclusive" logic (<=). If in your business rule
 * date_retour means "first day back present", change <= to < (marked below).
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { employeesAPI, demandesAPI } from '../services/api';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import './EtatDesLieux.css';
import Sidebar from '../components/Sidebar';

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

// --- NEW: robust parsing + local-day comparison helpers ----------------------

/**
 * Parse API date safely.
 * Supports:
 * - Date object
 * - ISO like "2026-02-24" or "2026-02-24T10:00:00Z"
 * - "DD-MM-YYYY" like "24-02-2026"
 *
 * Returns a Date, or null if invalid.
 */
const parseApiDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;

  if (typeof value === 'string') {
    const s = value.trim();

    // If it's DD-MM-YYYY (or DD/MM/YYYY), parse manually to avoid MM/DD confusion
    const m = s.match(/^(\d{2})[-\/](\d{2})[-\/](\d{4})$/);
    if (m) {
      const dd = Number(m[1]);
      const mm = Number(m[2]);
      const yyyy = Number(m[3]);
      const d = new Date(yyyy, mm - 1, dd);
      return isNaN(d.getTime()) ? null : d;
    }

    // Otherwise try normal Date parsing (works well for ISO formats)
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  // If backend sends numbers (timestamps)
  if (typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
};

/**
 * Convert any Date-like value into a LOCAL "day key" (midnight local time).
 * This removes timezone hour shifts when comparing days.
 */
const dayKeyLocal = (value) => {
  const d = parseApiDate(value);
  if (!d) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

const EtatDesLieux = () => {
  const { t } = useLanguage();

  /**
   * Safe translation with fallback:
   * If key is missing, your t() returns the key itself.
   * We detect that and return the provided fallback instead.
   */
  const tf = (key, fallback) => {
    const v = t(key);
    return v === key ? fallback : v;
  };

  // Local fallbacks (French) for keys missing in your FR translations
  const FALLBACKS = useMemo(() => ({
    loading_data: 'Chargement des données...',
    presence_tracker: 'Suivi des Présences',
    real_time_monitoring: 'Suivi en temps réel',
    this_week: 'Cette semaine',
    this_month: 'Ce mois',
    custom_range: 'Période personnalisée',
    edl_custom_choose: 'Choisissez une période',
    edl_custom_start: 'Date de début',
    edl_custom_end: 'Date de fin',
    search_employee: 'Rechercher un employé',
    search_by_name_matricule_position: 'Nom, matricule ou poste...',
    all_departments: 'Tous les départements',
    specific_employee: 'Employé spécifique',
    all_employees: 'Tous les employés',
    available: 'Disponible',
    on_leave: 'En congé',
    on_mission: 'En mission',
    authorized_absence: "Autorisation d'absence",
    late: 'Retard',
    sick_leave: 'Maladie',
    presence_overview: "Vue d'ensemble des présences",
    employees: 'employés',
    edl_custom_max_days: '(max 62 jours)',
    weekend: 'Weekend',
    'congé': 'Congé',
    mission: 'Mission',
    autorisation: 'Autorisation',
    retard: 'Retard',
    formation: 'Formation',
    maladie: 'Maladie',
    days: 'jours',
    export: 'Exporter',
    print: 'Imprimer',
    previous: 'Précédent',
    next: 'Suivant',
    today: "Aujourd'hui",
    department: 'Département',
    employee: 'Employé'
  }), []);

  const label = (key) => tf(key, FALLBACKS[key] ?? key);

  const [employees, setEmployees] = useState([]);
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - new Date().getDay())),
    end: new Date(new Date().setDate(new Date().getDate() - new Date().getDay() + 6))
  });

  const [customStartDate, setCustomStartDate] = useState(null);
  const [customEndDate, setCustomEndDate] = useState(null);

  const [filterType, setFilterType] = useState('week');
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [viewMode, setViewMode] = useState('week');
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [selectedAbsence, setSelectedAbsence] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const statusColors = {
    'congé': 'linear-gradient(135deg, #ff6b6b 0%, #ff8e8e 100%)',
    'mission': 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)',
    'autorisation': 'linear-gradient(135deg, #45b7d1 0%, #5e72e4 100%)',
    'retard': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'formation': 'linear-gradient(135deg, #96e6a1 0%, #d4fc79 100%)',
    'maladie': 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
    'default': 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)'
  };

  const statusIcons = {
    'congé': ICONS.CONGE,
    'mission': ICONS.MISSION,
    'autorisation': ICONS.AUTORISATION,
    'retard': ICONS.LATE,
    'formation': '📚',
    'maladie': '🤒',
    'default': ICONS.PRESENT
  };

  const normalizeDate = (d) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };

  useEffect(() => { loadData(); }, []);

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
      console.error(t('errorLoadingData'), error);
      setLoading(false);
    }
  };

  const formatAbsencePeriod = (demande) => {
    if (!demande) return '';

    const dateDepart = parseApiDate(demande.date_depart) || new Date();
    const dateRetour = demande.date_retour ? (parseApiDate(demande.date_retour) || dateDepart) : dateDepart;

    const formatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    const formattedDepart = dateDepart.toLocaleDateString('fr-FR', formatOptions);
    const formattedRetour = dateRetour.toLocaleDateString('fr-FR', formatOptions);
    if (dateDepart.toDateString() === dateRetour.toDateString()) {
      return t('onDate', { date: formattedDepart });
    }
    return t('fromToDate', { from: formattedDepart, to: formattedRetour });
  };

  const datesToDisplay = useMemo(() => {
    const dates = [];
    switch (viewMode) {
      case 'day':
        dates.push(selectedDate);
        break;
      case 'week': {
        const startOfWeek = new Date(dateRange.start);
        startOfWeek.setHours(0, 0, 0, 0);
        for (let i = 0; i < 7; i++) {
          const date = new Date(startOfWeek);
          date.setDate(startOfWeek.getDate() + i);
          dates.push(date);
        }
        break;
      }
      case 'month': {
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let i = 1; i <= daysInMonth; i++) dates.push(new Date(year, month, i));
        break;
      }
      case 'custom': {
        if (!customStartDate || !customEndDate) return [];
        const start = normalizeDate(customStartDate);
        const end = normalizeDate(customEndDate);
        if (start > end) return [];
        const cursor = new Date(start);
        const MAX_DAYS = 62;
        while (cursor <= end && dates.length < MAX_DAYS) {
          dates.push(new Date(cursor));
          cursor.setDate(cursor.getDate() + 1);
        }
        break;
      }
      default:
        dates.push(selectedDate);
    }
    return dates;
  }, [viewMode, selectedDate, dateRange, customStartDate, customEndDate]);

  const filteredEmployees = useMemo(() => {
    let filtered = employees;
    if (selectedDepartment !== 'all') {
      filtered = filtered.filter(emp => emp.departement === selectedDepartment);
    }
    if (searchQuery) {
      filtered = filtered.filter(emp =>
        `${emp.prenom} ${emp.nom}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (emp.matricule || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (emp.poste || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (selectedEmployee !== 'all') {
      filtered = filtered.filter(emp => emp.id.toString() === selectedEmployee);
    }
    return filtered;
  }, [employees, selectedDepartment, searchQuery, selectedEmployee]);

  // ✅ FIXED: timezone-safe day comparison
  const getEmployeeStatusOnDate = (employeeId, date) => {
    const demandesApprouvees = demandes.filter(
      d => d.employe_id === employeeId && d.statut === 'approuve'
    );

    const currentDay = dayKeyLocal(date);
    if (currentDay == null) {
      return { status: 'available', color: statusColors.default, icon: ICONS.PRESENT };
    }

    const demande = demandesApprouvees.find(d => {
      const startDay = dayKeyLocal(d.date_depart);
      const endDay = dayKeyLocal(d.date_retour || d.date_depart);
      if (startDay == null || endDay == null) return false;

      // Inclusive end (current behavior)
      return currentDay >= startDay && currentDay <= endDay;

      // If your business meaning is "date_retour = first day back PRESENT", use this instead:
      // return currentDay >= startDay && currentDay < endDay;
    });

    if (!demande) {
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      return {
        status: isWeekend ? 'weekend' : 'available',
        color: isWeekend ? '#f3f4f6' : statusColors.default,
        icon: isWeekend ? '😴' : ICONS.PRESENT
      };
    }

    const statusType = demande.type_demande || 'autorisation';
    return {
      status: statusType,
      color: statusColors[statusType] || statusColors.default,
      icon: statusIcons[statusType] || ICONS.AUTORISATION,
      demande
    };
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
  };

  const navigateDate = (direction) => {
    const newDate = new Date(selectedDate);
    switch (viewMode) {
      case 'day':
        newDate.setDate(newDate.getDate() + direction);
        setSelectedDate(newDate);
        break;
      case 'week': {
        const newStart = new Date(dateRange.start);
        newStart.setDate(newStart.getDate() + direction * 7);
        const newEnd = new Date(newStart);
        newEnd.setDate(newEnd.getDate() + 6);
        setDateRange({ start: newStart, end: newEnd });
        break;
      }
      case 'month':
        newDate.setMonth(newDate.getMonth() + direction);
        setSelectedDate(newDate);
        break;
      case 'custom':
        break;
      default:
        break;
    }
  };

  const handleCellClick = (employee, date, status) => {
    if (status.status !== 'available' && status.status !== 'weekend') {
      setSelectedAbsence({ employee, date, ...status });
      setShowDetailsPanel(true);
    }
  };

  const getDepartments = () => {
    const departments = new Set(employees.map(emp => emp.departement).filter(Boolean));
    return ['all', ...Array.from(departments)];
  };

  const exportToExcel = () => { console.log(t('exportingData')); };
  const printReport = () => { window.print(); };

  const customLabel = () => {
    if (!customStartDate || !customEndDate) return label('edl_custom_choose');
    return `${customStartDate.toLocaleDateString('fr-FR')} → ${customEndDate.toLocaleDateString('fr-FR')}`;
  };

  if (loading) {
    return (
      <div className="etat-des-lieux-container">
        <Sidebar />
        <div className="etat-des-lieux-content">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p className="text-gradient">{label('loading_data')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="etat-des-lieux-container">
      <Sidebar />

      {/* ✅ FIX: all page content wrapped in this div so sidebar doesn't overlap */}
      <div className="etat-des-lieux-content">

        <div className="etat-header">
          <h1>
            <span className="text-gradient">{label('presence_tracker')}</span>
            <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 'normal', marginLeft: '10px' }}>
              {label('real_time_monitoring')}
            </span>
          </h1>

          <div className="main-navigation">
            <div className="view-controls">
              <button className={`view-btn ${viewMode === 'day' ? 'active' : ''}`} onClick={() => setViewMode('day')}>
                {ICONS.CALENDAR} {t('today')}
              </button>
              <button className={`view-btn ${viewMode === 'week' ? 'active' : ''}`} onClick={() => setViewMode('week')}>
                {ICONS.TEAM} {label('this_week')}
              </button>
              <button className={`view-btn ${viewMode === 'month' ? 'active' : ''}`} onClick={() => setViewMode('month')}>
                {ICONS.STATS} {label('this_month')}
              </button>
              <button
                className={`view-btn ${viewMode === 'custom' ? 'active' : ''}`}
                onClick={() => setViewMode('custom')}
                title={label('custom_range')}
              >
                {ICONS.CALENDAR} {label('custom_range')}
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

              {viewMode === 'custom' && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <DatePicker
                    selected={customStartDate}
                    onChange={(d) => setCustomStartDate(d)}
                    dateFormat="dd/MM/yyyy"
                    placeholderText={label('edl_custom_start')}
                    className="date-picker"
                  />
                  <span style={{ opacity: 0.8 }}>→</span>
                  <DatePicker
                    selected={customEndDate}
                    onChange={(d) => setCustomEndDate(d)}
                    dateFormat="dd/MM/yyyy"
                    placeholderText={label('edl_custom_end')}
                    className="date-picker"
                    minDate={customStartDate || undefined}
                  />
                  <span style={{ fontSize: 12, color: '#64748b' }}>{customLabel()}</span>
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

          {/* Advanced filters */}
          <div className="advanced-filters">
            <div className="filter-group">
              <label className="filter-label">{ICONS.FILTER} {label('search_employee')}</label>
              <input
                type="text"
                placeholder={label('search_by_name_matricule_position')}
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
                <option value="all">{label('all_departments')}</option>
                {getDepartments().slice(1).map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">{ICONS.EMPLOYEE} {label('specific_employee')}</label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="filter-select"
                size="10"
              >
                <option value="all">{label('all_employees')}</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.prenom} {emp.nom} ({emp.matricule})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="legend-container">
          <div className="legend-item">
            <div className="color-box" style={{ background: statusColors.default }}></div>
            <span>{label('available')}</span>
          </div>
          <div className="legend-item">
            <div className="color-box" style={{ background: statusColors.congé }}></div>
            <span>{label('on_leave')}</span>
          </div>
          <div className="legend-item">
            <div className="color-box" style={{ background: statusColors.mission }}></div>
            <span>{label('on_mission')}</span>
          </div>
          <div className="legend-item">
            <div className="color-box" style={{ background: statusColors.autorisation }}></div>
            <span>{label('authorized_absence')}</span>
          </div>
          <div className="legend-item">
            <div className="color-box" style={{ background: statusColors.retard }}></div>
            <span>{label('late')}</span>
          </div>
          <div className="legend-item">
            <div className="color-box" style={{ background: statusColors.maladie }}></div>
            <span>{label('sick_leave')}</span>
          </div>
        </div>

        {/* Main table */}
        <div className="presence-table-container">
          <div className="table-header">
            <h2>
              {ICONS.TEAM} {label('presence_overview')}
              <span style={{ fontSize: '14px', fontWeight: 'normal', opacity: 0.9, marginLeft: '10px' }}>
                {filteredEmployees.length} {label('employees')} • {datesToDisplay.length} {t('days')}
                {viewMode === 'custom' && customStartDate && customEndDate && datesToDisplay.length === 62 && (
                  <span style={{ marginLeft: 8 }}>{label('edl_custom_max_days')}</span>
                )}
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
                            <div className="status-icon">{status.icon}</div>
                            {status.status !== 'available' && status.status !== 'weekend' && (
                              <>
                                <div className="status-type">{label(status.status)}</div>
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

        {/* Details Panel */}
        {showDetailsPanel && selectedAbsence && (
          <div className="details-panel">
            <div className="details-panel-header">
              <h3>{t('absenceDetails')}</h3>
              <button className="close-btn" onClick={() => setShowDetailsPanel(false)}>×</button>
            </div>
            <div className="details-panel-content">
              <p><strong>{t('employee')}:</strong> {selectedAbsence.employee.prenom} {selectedAbsence.employee.nom}</p>
              <p><strong>{t('date')}:</strong> {formatDate(selectedAbsence.date)}</p>
              <p><strong>{t('status')}:</strong> {label(selectedAbsence.status)}</p>
              {selectedAbsence.demande && (
                <>
                  <p><strong>{t('type')}:</strong> {label(selectedAbsence.demande.type_demande)}</p>
                  {selectedAbsence.demande.date_depart && selectedAbsence.demande.date_retour && (
                    <p><strong>{t('period')}:</strong> {formatAbsencePeriod(selectedAbsence.demande)}</p>
                  )}
                  {selectedAbsence.demande.commentaire && (
                    <p><strong>{t('comments')}:</strong> {selectedAbsence.demande.commentaire}</p>
                  )}
                </>
              )}
            </div>
          </div>
        )}

      </div>{/* end etat-des-lieux-content */}
    </div>
  );
};

export default EtatDesLieux;
