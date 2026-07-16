/**
 * EtatDesLieux.jsx
 *
 * Fixes included:
 * - compare days using LOCAL midnight timestamps
 * - date_retour is treated as FIRST DAY BACK TO WORK (excluded from leave period)
 * - same-day leave still counts correctly
 * - safe translations with French fallbacks
 * - sidebar/content layout preserved
 * - removed employee text search area
 * - employee selector changed to normal dropdown
 * - department/site resolver made more robust for different backend payload shapes
 * - added name/matricule search filter
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useSiteFilter } from '../contexts/SiteFilterContext';
import { employeesAPI, demandesAPI } from '../services/api';
import { formatEmployeeNom, formatEmployeePrenom } from '../utils/employeeAvatar';
import { getEmployeeSite, getEmployeeDepartment } from '../utils/employeeProfile';
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

/**
 * Parse API date safely.
 */
const parseApiDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;

  if (typeof value === 'string') {
    const s = value.trim();
    const m = s.match(/^(\d{2})[-\/](\d{2})[-\/](\d{4})$/);
    if (m) {
      const dd = Number(m[1]);
      const mm = Number(m[2]);
      const yyyy = Number(m[3]);
      const d = new Date(yyyy, mm - 1, dd);
      return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  if (typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
};

/**
 * Convert any Date-like value into a LOCAL "day key" (midnight local time).
 */
const dayKeyLocal = (value) => {
  const d = parseApiDate(value);
  if (!d) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

const EtatDesLieux = () => {
  const { t } = useLanguage();

  const tf = (key, fallback) => {
    const v = t(key);
    return v === key ? fallback : v;
  };

  const KEY_ALIASES = useMemo(() => ({
    loading_data: 'edlLoadingData',
    presence_tracker: 'edlPresenceTracker',
    real_time_monitoring: 'edlRealTimeMonitoring',
    this_week: 'edlThisWeek',
    this_month: 'edlThisMonth',
    custom_range: 'edlCustomRange',
    edl_custom_choose: 'edlCustomChoose',
    edl_custom_start: 'edlCustomStart',
    edl_custom_end: 'edlCustomEnd',
    all_departments: 'edlAllDepartments',
    specific_employee: 'edlSpecificEmployee',
    all_employees: 'edlAllEmployees',
    available: 'edlAvailable',
    on_leave: 'edlOnLeave',
    on_mission: 'edlOnMission',
    authorized_absence: 'edlAuthorizedAbsence',
    late: 'edlLate',
    sick_leave: 'edlSickLeave',
    presence_overview: 'edlPresenceOverview',
    employees: 'edlEmployeesCount',
    edl_custom_max_days: 'edlCustomMaxDays',
    weekend: 'edlWeekend',
    'congé': 'edlStatusConge',
    conge: 'edlStatusConge',
    conges: 'edlStatusConge',
    mission: 'edlStatusMission',
    autorisation: 'edlStatusAutorisation',
    retard: 'edlStatusRetard',
    formation: 'edlStatusFormation',
    maladie: 'edlStatusMaladie',
    search_employee: 'edlSearchEmployee',
    search_placeholder: 'edlSearchPlaceholder'
  }), []);

  const FALLBACKS = useMemo(() => ({
    edlLoadingData: 'Loading data...',
    edlPresenceTracker: 'Presence tracking',
    edlRealTimeMonitoring: 'Real-time monitoring',
    edlThisWeek: 'This week',
    edlThisMonth: 'This month',
    edlCustomRange: 'Custom period',
    edlCustomChoose: 'Choose a period',
    edlCustomStart: 'Start date',
    edlCustomEnd: 'End date',
    edlAllDepartments: 'All departments',
    edlSpecificEmployee: 'Specific employee',
    edlAllEmployees: 'All employees',
    edlAvailable: 'Available',
    edlOnLeave: 'On leave',
    edlOnMission: 'On mission',
    edlAuthorizedAbsence: 'Authorized absence',
    edlLate: 'Late',
    edlSickLeave: 'Sick leave',
    edlPresenceOverview: 'Presence overview',
    edlEmployeesCount: 'employees',
    edlCustomMaxDays: '(max 62 days)',
    edlWeekend: 'Weekend',
    edlStatusConge: 'Leave',
    edlStatusMission: 'Mission',
    edlStatusAutorisation: 'Authorization',
    edlStatusRetard: 'Late',
    edlStatusFormation: 'Training',
    edlStatusMaladie: 'Sick leave',
    edlSearchEmployee: 'Search employee',
    edlSearchPlaceholder: 'Name, first name or ID...'
  }), []);

  const label = (key) => {
    const translationKey = KEY_ALIASES[key] || key;
    return tf(translationKey, FALLBACKS[translationKey] ?? FALLBACKS[key] ?? key);
  };

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
  const { siteFilter: selectedSite, setSiteFilter: setSelectedSite } = useSiteFilter();
  const [nameSearch, setNameSearch] = useState('');   // ← NEW: name search state
  const [viewMode, setViewMode] = useState('week');
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [selectedAbsence, setSelectedAbsence] = useState(null);

  const statusColors = {
    'congé': 'linear-gradient(135deg, #ff6b6b 0%, #ff8e8e 100%)',
    'conges': 'linear-gradient(135deg, #ff6b6b 0%, #ff8e8e 100%)',
    'mission': 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)',
    'autorisation': 'linear-gradient(135deg, #45b7d1 0%, #5e72e4 100%)',
    'retard': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'formation': 'linear-gradient(135deg, #96e6a1 0%, #d4fc79 100%)',
    'maladie': 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
    'default': 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)'
  };

  const statusIcons = {
    'congé': ICONS.CONGE,
    'conges': ICONS.CONGE,
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

  const normalizeStatusType = (type) => {
    const v = (type || '').toString().trim().toLowerCase();
    if (['conges', 'congé', 'conge'].includes(v)) return 'conges';
    if (['mission', 'missions'].includes(v)) return 'mission';
    if (['autorisation', 'autorisations'].includes(v)) return 'autorisation';
    if (['retard', 'retards'].includes(v)) return 'retard';
    if (['formation', 'formations'].includes(v)) return 'formation';
    if (['maladie', 'maladies'].includes(v)) return 'maladie';
    return v || 'autorisation';
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

  // ← UPDATED: filteredEmployees now includes nameSearch
  const filteredEmployees = useMemo(() => {
    let filtered = employees;

    if (selectedDepartment !== 'all') {
      filtered = filtered.filter(emp => getEmployeeDepartment(emp) === selectedDepartment);
    }

    if (selectedSite !== '') {
      filtered = filtered.filter(emp => getEmployeeSite(emp) === selectedSite);
    }

    if (selectedEmployee !== 'all') {
      filtered = filtered.filter(emp => emp.id.toString() === selectedEmployee);
    }

    if (nameSearch.trim()) {
      const q = nameSearch.trim().toLowerCase();
      filtered = filtered.filter(emp =>
        `${emp.prenom} ${emp.nom}`.toLowerCase().includes(q) ||
        (emp.matricule || '').toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [employees, selectedDepartment, selectedSite, selectedEmployee, nameSearch]);

  const getEmployeeStatusOnDate = (employeeId, date) => {
    const currentDay = dayKeyLocal(date);
    if (currentDay == null) {
      return { status: 'available', color: statusColors.default, icon: ICONS.PRESENT };
    }

    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    if (isWeekend) {
      return {
        status: 'weekend',
        color: '#f3f4f6',
        icon: '😴'
      };
    }

    const demandesApprouvees = demandes.filter(
      d => d.employe_id === employeeId && d.statut === 'approuve'
    );

    const demande = demandesApprouvees.find(d => {
      const startDay = dayKeyLocal(d.date_depart);
      const endDayRaw = dayKeyLocal(d.date_retour || d.date_depart);
      if (startDay == null || endDayRaw == null) return false;

      const exclusiveEndDay =
        startDay === endDayRaw
          ? startDay + 24 * 60 * 60 * 1000
          : endDayRaw;

      return currentDay >= startDay && currentDay < exclusiveEndDay;
    });

    if (!demande) {
      return {
        status: 'available',
        color: statusColors.default,
        icon: ICONS.PRESENT
      };
    }

    const statusType = normalizeStatusType(demande.type_demande);
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
    const departments = new Set(
      employees
        .map(emp => getEmployeeDepartment(emp))
        .filter(Boolean)
    );
    return ['all', ...Array.from(departments)];
  };

  const getSites = () => {
    const sites = new Set(
      employees
        .map(emp => getEmployeeSite(emp))
        .filter(Boolean)
    );
    return ['all', ...Array.from(sites)];
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

          <div className="advanced-filters">

            {/* ← NEW: Name search filter */}
            <div className="filter-group">
              <label className="filter-label">{ICONS.FILTER} {label('search_employee')}</label>
              <input
                type="text"
                value={nameSearch}
                onChange={(e) => setNameSearch(e.target.value)}
                placeholder={label('search_placeholder')}
                className="filter-select"
                style={{ minWidth: 220 }}
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
              <label className="filter-label">{ICONS.LOCATION} {t('plantSite')}</label>
              <select
                value={selectedSite}
                onChange={(e) => setSelectedSite(e.target.value)}
                className="department-select"
              >
                <option value="">{t('allSites')}</option>
                {getSites().slice(1).map(site => (
                  <option key={site} value={site}>{site}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">{ICONS.EMPLOYEE} {label('specific_employee')}</label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="filter-select"
              >
                <option value="all">{label('all_employees')}</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {formatEmployeePrenom(emp.prenom)} {formatEmployeeNom(emp.nom)} ({emp.matricule})
                  </option>
                ))}
              </select>
            </div>

          </div>
        </div>

        <div className="legend-container">
          <div className="legend-item">
            <div className="color-box" style={{ background: statusColors.default }}></div>
            <span>{label('available')}</span>
          </div>
          <div className="legend-item">
            <div className="color-box" style={{ background: statusColors.conges }}></div>
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
                  <tr key={`${employee.tenant_schema || 'public'}-${employee.id}`} className="employee-row">
                    <td className="employee-cell">
                      <div className="employee-info">
                        <div className="employee-name">
                          <div className="employee-avatar">
                            {employee.prenom.charAt(0)}{employee.nom.charAt(0)}
                          </div>
                          {formatEmployeePrenom(employee.prenom)} {formatEmployeeNom(employee.nom)}
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
                          title={`${formatEmployeePrenom(employee.prenom)} ${formatEmployeeNom(employee.nom)} - ${formatDate(date)}`}
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

        {showDetailsPanel && selectedAbsence && (
          <div className="details-panel">
            <div className="details-panel-header">
              <h3>{t('absenceDetails')}</h3>
              <button className="close-btn" onClick={() => setShowDetailsPanel(false)}>×</button>
            </div>
            <div className="details-panel-content">
              <p><strong>{t('employee')}:</strong> {formatEmployeePrenom(selectedAbsence.employee.prenom)} {formatEmployeeNom(selectedAbsence.employee.nom)}</p>
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

      </div>
    </div>
  );
};

export default EtatDesLieux;
