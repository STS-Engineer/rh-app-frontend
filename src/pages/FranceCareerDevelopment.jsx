import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { employeesAPI, getCurrentUser, isGlobalHrManager, tenantV2API } from '../services/api';
import { getEmployeeAvatarFallback, getEmployeeAvatarSrc, getEmployeeDisplayName } from '../utils/employeeAvatar';
import { useLanguage } from '../contexts/LanguageContext';
import './FranceModules.css';

const monthIndex = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
const monthLabels = Object.keys(monthIndex);

const emptyRoleForm = { role: '', from: '', previousTo: '' };
const emptyReviewForm = { date: '', title: '', details: '', rating: '3' };
const emptySalaryForm = { date: '', amount: '', details: '' };
const emptyTalentForm = { date: '', title: '', details: '', rating: '3' };

const localLabels = {
  ta: {
    'Role not specified': 'பங்கு குறிப்பிடப்படவில்லை',
    Unassigned: 'ஒதுக்கப்படவில்லை',
    'Date pending': 'தேதி நிலுவையில் உள்ளது',
    'Loading timeline...': 'காலவரிசை ஏற்றப்படுகிறது...',
    Current: 'தற்போது',
    present: 'தற்போது',
    'Operations Manager': 'செயல்பாட்டு மேலாளர்',
    'Defaults to start date': 'இல்லையெனில் தொடக்க தேதி பயன்படுத்தப்படும்',
    'Role changed to': 'பங்கு மாற்றப்பட்டது',
    'Previous role ended': 'முந்தைய பங்கு முடிந்தது',
    'Annual review 2026': '2026 வருடாந்திர மதிப்பீடு',
    'Strengths, improvement points, next objectives...': 'வலிமைகள், மேம்பாட்டு பகுதிகள், அடுத்த இலக்குகள்...',
    Rating: 'மதிப்பீடு',
    'No details provided.': 'விவரங்கள் வழங்கப்படவில்லை.',
    'Salary change': 'சம்பள மாற்றம்',
    'Salary evolution': 'சம்பள வளர்ச்சி',
    'Annual increase': 'வருடாந்திர உயர்வு',
    'Talent review 2026': '2026 திறன் மதிப்பீடு',
    'Potential paths, mobility, leadership readiness...': 'சாத்திய பாதைகள், இடமாற்றம், தலைமைத் தயார்நிலை...',
    'Unable to load employees.': 'பணியாளர்களை ஏற்ற முடியவில்லை.',
    'Unable to load career events.': 'தொழில் நிகழ்வுகளை ஏற்ற முடியவில்லை.',
    'Unable to save career data.': 'தொழில் தரவைச் சேமிக்க முடியவில்லை.'
  }
};

const getEmployeeKey = (employee) => `${employee.tenant_schema || 'public'}-${employee.id}`;
const getEmployeeDepartment = (employee) => employee.site_dep || employee.departement || employee.department || 'Unassigned';
const getCurrentRole = (employee) => employee.role || employee.poste || 'Role not specified';

const parseMonthYear = (value) => {
  if (!value) return null;
  const clean = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
    const date = new Date(clean);
    return Number.isNaN(date.getTime()) ? null : { month: date.getMonth(), year: date.getFullYear() };
  }
  if (/^\d{4}-\d{2}$/.test(clean)) {
    const [year, month] = clean.split('-').map(Number);
    return { month: month - 1, year };
  }
  const [month, year] = clean.split(/\s+/);
  const normalized = month ? month.slice(0, 3) : '';
  if (!monthIndex.hasOwnProperty(normalized) || !year) return null;
  return { month: monthIndex[normalized], year: Number(year) };
};

const monthYearToIsoDate = (value) => {
  const parsed = parseMonthYear(value);
  if (!parsed || Number.isNaN(parsed.year)) return '';
  return `${parsed.year}-${String(parsed.month + 1).padStart(2, '0')}-01`;
};

const formatMonthYear = (value) => {
  const parsed = parseMonthYear(value);
  if (!parsed || Number.isNaN(parsed.year)) return 'Date pending';
  return `${monthLabels[parsed.month]} ${parsed.year}`;
};

const formatCurrency = (value) => {
  const number = Number(value);
  if (Number.isNaN(number)) return '—';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(number);
};

const buildTimeline = (employee, events) => {
  const sorted = [...events].sort((a, b) => new Date(a.event_date || 0) - new Date(b.event_date || 0) || a.id - b.id);
  const profileRole = getCurrentRole(employee);
  const profileStart = employee.date_debut || employee.created_at || sorted[0]?.event_date || new Date().toISOString();
  const roleEvents = sorted.filter((event) => ['role_change', 'promotion'].includes(event.event_type) || event.new_value);

  if (!roleEvents.length) {
    return [{ type: 'current_role', title: profileRole, from: profileStart, to: null, details: 'Current role from employee profile' }];
  }

  const firstRole = roleEvents[0].old_value || profileRole;
  const timeline = [{ type: 'current_role', title: firstRole, from: profileStart, to: roleEvents[0].event_date, details: 'Initial role before recorded career changes' }];

  roleEvents.forEach((event, index) => {
    const nextEvent = roleEvents[index + 1];
    timeline.push({
      type: 'career_event',
      title: event.new_value || event.title || profileRole,
      from: event.event_date,
      to: nextEvent?.event_date || null,
      details: event.details,
      rating: event.rating,
      salary_old: event.salary_old,
      salary_new: event.salary_new,
      event_type: event.event_type
    });
  });

  return timeline;
};

const FranceCareerDevelopment = () => {
  const { t, language } = useLanguage();
  const lt = (value) => localLabels[language]?.[value] || value;
  const canFilterByPlant = isGlobalHrManager(getCurrentUser());
  const [employees, setEmployees] = useState([]);
  const [eventsByEmployee, setEventsByEmployee] = useState({});
  const [search, setSearch] = useState('');
  const [plantFilter, setPlantFilter] = useState('');
  const [openEmployeeKey, setOpenEmployeeKey] = useState('');
  const [activeTabByEmployee, setActiveTabByEmployee] = useState({});
  const [addingForKey, setAddingForKey] = useState('');
  const [roleForm, setRoleForm] = useState(emptyRoleForm);
  const [reviewForm, setReviewForm] = useState(emptyReviewForm);
  const [salaryForm, setSalaryForm] = useState(emptySalaryForm);
  const [talentForm, setTalentForm] = useState(emptyTalentForm);
  const [loading, setLoading] = useState(true);
  const [eventsLoadingKey, setEventsLoadingKey] = useState('');
  const [savingKey, setSavingKey] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        setLoading(true);
        const response = await employeesAPI.getAll();
        const rows = response.data || [];
        setEmployees(rows);
        if (rows.length) {
          const firstKey = getEmployeeKey(rows[0]);
          setOpenEmployeeKey(firstKey);
          setActiveTabByEmployee((current) => ({ ...current, [firstKey]: 'career' }));
          loadEvents(rows[0]);
        }
      } catch (err) {
        setError(err?.response?.data?.error || err.message || lt('Unable to load employees.'));
      } finally {
        setLoading(false);
      }
    };
    loadEmployees();
  }, []);

  const loadEvents = async (employee) => {
    const key = getEmployeeKey(employee);
    if (eventsByEmployee[key]) return;
    try {
      setEventsLoadingKey(key);
      const response = await tenantV2API.getFranceCareerEvents(employee.id, employee.tenant_schema);
      setEventsByEmployee((current) => ({ ...current, [key]: response.data || [] }));
    } catch (err) {
      setError(err?.response?.data?.error || err.message || lt('Unable to load career events.'));
    } finally {
      setEventsLoadingKey('');
    }
  };

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();
    const scoped = canFilterByPlant && plantFilter ? employees.filter((employee) => getEmployeeDepartment(employee) === plantFilter) : employees;
    if (!query) return scoped;
    return scoped.filter((employee) => {
      const haystack = [
        getEmployeeDisplayName(employee),
        getEmployeeDepartment(employee),
        employee.role,
        employee.poste,
        employee.matricule,
        employee.adresse_mail
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [employees, search, plantFilter, canFilterByPlant]);

  const plantOptions = useMemo(
    () => Array.from(new Set(employees.map((employee) => getEmployeeDepartment(employee)).filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b))),
    [employees]
  );

  const toggleEmployee = (employee) => {
    const key = getEmployeeKey(employee);
    const nextKey = openEmployeeKey === key ? '' : key;
    setOpenEmployeeKey(nextKey);
    setAddingForKey('');
    setRoleForm(emptyRoleForm);
    setReviewForm(emptyReviewForm);
    setSalaryForm(emptySalaryForm);
    setTalentForm(emptyTalentForm);
    if (nextKey) {
      setActiveTabByEmployee((current) => ({ ...current, [key]: current[key] || 'career' }));
      loadEvents(employee);
    }
  };

  const startAddingRole = (employee) => {
    const key = getEmployeeKey(employee);
    setOpenEmployeeKey(key);
    setActiveTabByEmployee((current) => ({ ...current, [key]: 'career' }));
    setAddingForKey((current) => (current === key ? '' : key));
    setRoleForm(emptyRoleForm);
    loadEvents(employee);
  };

  const addCareerEvent = async (employee, payload, nextEmployeePatch = {}) => {
    const key = getEmployeeKey(employee);
    try {
      setSavingKey(key);
      await tenantV2API.addFranceCareerEvent(employee.id, { ...payload, tenant_schema: employee.tenant_schema }, employee.tenant_schema);
      if (Object.keys(nextEmployeePatch).length) {
        await employeesAPI.update(employee.id, { ...employee, ...nextEmployeePatch, tenant_schema: employee.tenant_schema });
      }
      const refreshed = await tenantV2API.getFranceCareerEvents(employee.id, employee.tenant_schema);
      setEventsByEmployee((current) => ({ ...current, [key]: refreshed.data || [] }));
      setEmployees((currentEmployees) =>
        currentEmployees.map((item) => (getEmployeeKey(item) === key ? { ...item, ...nextEmployeePatch } : item))
      );
      setError('');
    } catch (err) {
      setError(err?.response?.data?.error || err.message || lt('Unable to save career data.'));
    } finally {
      setSavingKey('');
    }
  };

  const currentTab = (employee) => activeTabByEmployee[getEmployeeKey(employee)] || 'career';

  return (
    <div className="fr-module-layout">
      <Sidebar />
      <main className="fr-module-content">
        <section className="lifecycle-shell">
          <div className="lifecycle-topbar">
            <div>
              <h1 className="lifecycle-title">{t('careerDevelopment')}</h1>
                <p className="lifecycle-subtitle">
                {t('careerDevelopment')} — {t('overview')}
              </p>
            </div>
            <div className="lifecycle-topbar-actions">
              {canFilterByPlant && (
                <select className="lifecycle-select" value={plantFilter} onChange={(event) => setPlantFilter(event.target.value)}>
                  <option value="">{t('edlAllDepartments')}</option>
                  {plantOptions.map((plant) => <option key={plant} value={plant}>{plant}</option>)}
                </select>
              )}
              <input
                className="lifecycle-input lifecycle-search"
                type="search"
                placeholder={t('searchEmployeeDepartmentEmail')}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>

          {error && <div className="life-alert">{error}</div>}

          {loading ? (
            <div className="lifecycle-card">{t('loadingEmployees')}</div>
          ) : (
            <div className="career-list">
              {filteredEmployees.map((employee) => {
                const key = getEmployeeKey(employee);
                const isOpen = openEmployeeKey === key;
                const employeeName = getEmployeeDisplayName(employee);
                const events = eventsByEmployee[key] || [];
                const timeline = buildTimeline(employee, events);
                const currentRole = timeline[timeline.length - 1];
                const avatarFallback = getEmployeeAvatarFallback(employee);
                const tab = currentTab(employee);
                const annualReviews = events.filter((event) => ['annual_review', 'review', 'performance_review'].includes(event.event_type));
                const salaryEvents = events.filter((event) => ['salary_change', 'salary_review', 'compensation_change'].includes(event.event_type) || event.salary_new);
                const talentNotes = events.filter((event) => ['talent_review', 'talent_note'].includes(event.event_type));

                return (
                  <article className="lifecycle-card compact" key={key}>
                    <button className="employee-summary" type="button" onClick={() => toggleEmployee(employee)}>
                      <img
                        className="employee-avatar employee-avatar-image"
                        src={getEmployeeAvatarSrc(employee)}
                        alt={employeeName}
                        onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = avatarFallback; }}
                      />
                      <span className="employee-main">
                        <span className="employee-name">{employeeName}</span>
                        <span className="employee-current">
                          {lt(currentRole.title || getCurrentRole(employee))}
                          {employee.adresse_mail ? ` • ${employee.adresse_mail}` : ''}
                        </span>
                      </span>
                      <span className="department-pill">{lt(getEmployeeDepartment(employee))}</span>
                      <span className="accordion-caret">{isOpen ? '−' : '+'}</span>
                    </button>

                    {isOpen && (
                      <div className="employee-panel">
                        <div className="career-tabs">
                          {['career', 'reviews', 'salary', 'talent'].map((item) => (
                            <button
                              key={item}
                              type="button"
                              className={`career-tab${tab === item ? ' active' : ''}`}
                              onClick={() => setActiveTabByEmployee((current) => ({ ...current, [key]: item }))}
                            >
                              {item === 'career' && t('careerTabCareer')}
                              {item === 'reviews' && t('careerTabReviews')}
                              {item === 'salary' && t('careerTabSalary')}
                              {item === 'talent' && t('careerTabTalent')}
                            </button>
                          ))}
                        </div>

                        {eventsLoadingKey === key ? (
                          <p className="lifecycle-card-note">{lt('Loading timeline...')}</p>
                        ) : null}

                        {tab === 'career' && (
                          <>
                            <div className="timeline">
                              {timeline.map((item, itemIndex) => {
                                const isCurrent = itemIndex === timeline.length - 1;
                                return (
                                  <div className="timeline-item" key={`${key}-${item.role}-${item.from}`}>
                                    <span className={`timeline-dot${isCurrent ? ' current' : ''}`} />
                                    <div className="timeline-row">
                                      <div>
                                        <div className="timeline-role">{lt(item.title)} {isCurrent && <span className="current-pill">{t('current')}</span>}</div>
                                        <div className="timeline-date">{formatMonthYear(item.from)} → {item.to ? formatMonthYear(item.to) : t('present')}</div>
                                        {item.details && <div className="timeline-date">{lt(item.details)}</div>}
                                      </div>
                                      <div className="timeline-duration">{formatMonthYear(item.from)}</div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            <button className="life-btn ghost" type="button" onClick={() => startAddingRole(employee)}>
                              + {t('addNewRole')}
                            </button>

                            {addingForKey === key && (
                              <div className="inline-form">
                                <div className="lifecycle-grid three">
                                  <div className="lifecycle-field">
                                    <label>{t('position')}</label>
                                    <input className="lifecycle-input" placeholder={lt('Operations Manager')} value={roleForm.role} onChange={(event) => setRoleForm((current) => ({ ...current, role: event.target.value }))} />
                                  </div>
                                  <div className="lifecycle-field">
                                    <label>{t('startDate')}</label>
                                    <input className="lifecycle-input" placeholder="Jul 2026" value={roleForm.from} onChange={(event) => setRoleForm((current) => ({ ...current, from: event.target.value }))} />
                                  </div>
                                  <div className="lifecycle-field">
                                    <label>{t('contractEndDate') || 'Previous role end date'}</label>
                                    <input className="lifecycle-input" placeholder={lt('Defaults to start date')} value={roleForm.previousTo} onChange={(event) => setRoleForm((current) => ({ ...current, previousTo: event.target.value }))} />
                                  </div>
                                </div>
                                <div className="lifecycle-actions">
                                  <button className="life-btn ghost" type="button" onClick={() => setAddingForKey('')}>{t('cancel')}</button>
                                  <button
                                    className="life-btn"
                                    type="button"
                                    disabled={!roleForm.role.trim() || !monthYearToIsoDate(roleForm.from) || savingKey === key}
                                    onClick={() =>
                                      addCareerEvent(
                                        employee,
                                        {
                                          event_type: 'role_change',
                                          event_date: monthYearToIsoDate(roleForm.from),
                                          title: `${lt('Role changed to')} ${roleForm.role.trim()}`,
                                          details: `${lt('Previous role ended')}: ${roleForm.previousTo.trim() || roleForm.from.trim()}`,
                                          old_value: getCurrentRole(employee),
                                          new_value: roleForm.role.trim()
                                        },
                                        { role: roleForm.role.trim(), poste: roleForm.role.trim() }
                                      )
                                    }
                                  >
                                    {savingKey === key ? t('saving') : t('saveRole')}
                                  </button>
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {tab === 'reviews' && (
                          <div className="career-section">
                            <div className="mini-stats">
                              <div className="mini-stat"><span>{t('careerTabReviews')}</span><strong>{annualReviews.length}</strong></div>
                              <div className="mini-stat"><span>{t('last')}</span><strong>{annualReviews[0]?.event_date ? formatMonthYear(annualReviews[0].event_date) : '—'}</strong></div>
                              <div className="mini-stat"><span>{t('averageRating')}</span><strong>{annualReviews.length ? (annualReviews.reduce((sum, item) => sum + Number(item.rating || 0), 0) / annualReviews.length).toFixed(1) : '—'}</strong></div>
                            </div>
                            <div className="inline-form">
                              <div className="lifecycle-grid three">
                                <div className="lifecycle-field">
                                  <label>{t('reviewTitle')}</label>
                                  <input className="lifecycle-input" value={reviewForm.title} onChange={(event) => setReviewForm((current) => ({ ...current, title: event.target.value }))} placeholder={lt('Annual review 2026')} />
                                </div>
                                <div className="lifecycle-field">
                                  <label>{t('reviewDate')}</label>
                                  <input className="lifecycle-input" type="date" value={reviewForm.date} onChange={(event) => setReviewForm((current) => ({ ...current, date: event.target.value }))} />
                                </div>
                                <div className="lifecycle-field">
                                  <label>{t('ratingOutOf5')}</label>
                                  <input className="lifecycle-input" type="number" min="1" max="5" step="0.1" value={reviewForm.rating} onChange={(event) => setReviewForm((current) => ({ ...current, rating: event.target.value }))} />
                                </div>
                              </div>
                              <div className="lifecycle-field">
                                <label>{t('reviewDetails')}</label>
                                <textarea className="lifecycle-textarea" value={reviewForm.details} onChange={(event) => setReviewForm((current) => ({ ...current, details: event.target.value }))} placeholder={lt('Strengths, improvement points, next objectives...')} />
                              </div>
                              <div className="lifecycle-actions">
                                  <button className="life-btn ghost" type="button" onClick={() => setReviewForm(emptyReviewForm)}>{t('reset')}</button>
                                <button
                                  className="life-btn"
                                  type="button"
                                  disabled={!reviewForm.title.trim() || !reviewForm.date || savingKey === key}
                                  onClick={() =>
                                    addCareerEvent(employee, {
                                      event_type: 'annual_review',
                                      event_date: reviewForm.date,
                                      title: reviewForm.title.trim(),
                                      details: reviewForm.details.trim() || null,
                                      rating: Number(reviewForm.rating || 0)
                                    })
                                  }
                                >
                                  {savingKey === key ? t('saving') : t('saveReview')}
                                </button>
                              </div>
                            </div>
                            <div className="career-list compact-list">
                              {annualReviews.map((event) => (
                                <div className="career-note" key={event.id}>
                                  <div>
                                    <strong>{event.title || t('careerTabReviews')}</strong>
                                    <div className="lifecycle-card-note">{formatMonthYear(event.event_date)} • {lt('Rating')} {event.rating || '—'}/5</div>
                                  </div>
                                  <p>{event.details || lt('No details provided.')}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {tab === 'salary' && (
                          <div className="career-section">
                            <div className="mini-stats">
                              <div className="mini-stat"><span>{t('currentSalary')}</span><strong>{formatCurrency(employee.salaire_brute)}</strong></div>
                              <div className="mini-stat"><span>{t('salaryEvents')}</span><strong>{salaryEvents.length}</strong></div>
                                  <div className="mini-stat"><span>{t('department')}</span><strong>{getEmployeeDepartment(employee)}</strong></div>
                            </div>
                            <div className="inline-form">
                              <div className="lifecycle-grid three">
                                <div className="lifecycle-field">
                                  <label>{t('salaryDate')}</label>
                                  <input className="lifecycle-input" type="date" value={salaryForm.date} onChange={(event) => setSalaryForm((current) => ({ ...current, date: event.target.value }))} />
                                </div>
                                <div className="lifecycle-field">
                                  <label>{t('newSalary')}</label>
                                  <input className="lifecycle-input" type="number" step="0.01" value={salaryForm.amount} onChange={(event) => setSalaryForm((current) => ({ ...current, amount: event.target.value }))} placeholder="65000" />
                                </div>
                                <div className="lifecycle-field">
                                  <label>{t('changeNote')}</label>
                                  <input className="lifecycle-input" value={salaryForm.details} onChange={(event) => setSalaryForm((current) => ({ ...current, details: event.target.value }))} placeholder={lt('Annual increase')} />
                                </div>
                              </div>
                              <div className="lifecycle-actions">
                                  <button className="life-btn ghost" type="button" onClick={() => setSalaryForm(emptySalaryForm)}>{t('reset')}</button>
                                <button
                                  className="life-btn"
                                  type="button"
                                  disabled={!salaryForm.date || !salaryForm.amount || savingKey === key}
                                  onClick={() =>
                                    addCareerEvent(
                                      employee,
                                      {
                                        event_type: 'salary_change',
                                        event_date: salaryForm.date,
                                        title: lt('Salary evolution'),
                                        details: salaryForm.details.trim() || null,
                                        salary_old: employee.salaire_brute || null,
                                        salary_new: Number(salaryForm.amount)
                                      },
                                      { salaire_brute: Number(salaryForm.amount) }
                                    )
                                  }
                                >
                                  {savingKey === key ? t('saving') : t('saveSalaryChange')}
                                </button>
                              </div>
                            </div>
                            <div className="career-list compact-list">
                              {salaryEvents.map((event) => (
                                <div className="career-note" key={event.id}>
                                  <div>
                                    <strong>{event.title || lt('Salary change')}</strong>
                                    <div className="lifecycle-card-note">{formatMonthYear(event.event_date)}</div>
                                  </div>
                                  <p>{formatCurrency(event.salary_old)} → {formatCurrency(event.salary_new)}</p>
                                  {event.details && <p>{event.details}</p>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {tab === 'talent' && (
                          <div className="career-section">
                            <div className="mini-stats">
                              <div className="mini-stat"><span>{t('talentNotes')}</span><strong>{talentNotes.length}</strong></div>
                              <div className="mini-stat"><span>{t('potential')}</span><strong>—</strong></div>
                              <div className="mini-stat"><span>{t('nextStep')}</span><strong>{t('careerTabReviews')}</strong></div>
                            </div>
                            <div className="inline-form">
                              <div className="lifecycle-grid three">
                                <div className="lifecycle-field">
                                  <label>{t('careerTabTalent')}</label>
                                  <input className="lifecycle-input" value={talentForm.title} onChange={(event) => setTalentForm((current) => ({ ...current, title: event.target.value }))} placeholder={lt('Talent review 2026')} />
                                </div>
                                <div className="lifecycle-field">
                                  <label>{t('startDate')}</label>
                                  <input className="lifecycle-input" type="date" value={talentForm.date} onChange={(event) => setTalentForm((current) => ({ ...current, date: event.target.value }))} />
                                </div>
                                <div className="lifecycle-field">
                                  <label>{t('potentialOutOf5')}</label>
                                  <input className="lifecycle-input" type="number" min="1" max="5" step="0.1" value={talentForm.rating} onChange={(event) => setTalentForm((current) => ({ ...current, rating: event.target.value }))} />
                                </div>
                              </div>
                              <div className="lifecycle-field">
                                <label>{t('details')}</label>
                                <textarea className="lifecycle-textarea" value={talentForm.details} onChange={(event) => setTalentForm((current) => ({ ...current, details: event.target.value }))} placeholder={lt('Potential paths, mobility, leadership readiness...')} />
                              </div>
                              <div className="lifecycle-actions">
                                <button className="life-btn ghost" type="button" onClick={() => setTalentForm(emptyTalentForm)}>{t('reset')}</button>
                                <button
                                  className="life-btn"
                                  type="button"
                                  disabled={!talentForm.title.trim() || !talentForm.date || savingKey === key}
                                  onClick={() =>
                                    addCareerEvent(employee, {
                                      event_type: 'talent_review',
                                      event_date: talentForm.date,
                                      title: talentForm.title.trim(),
                                      details: talentForm.details.trim() || null,
                                      rating: Number(talentForm.rating || 0)
                                    })
                                  }
                                >
                                  {savingKey === key ? t('saving') : t('saveTalentReview')}
                                </button>
                              </div>
                            </div>
                            <div className="career-list compact-list">
                              {talentNotes.map((event) => (
                                <div className="career-note" key={event.id}>
                                  <div>
                                    <strong>{event.title || t('careerTabTalent')}</strong>
                                    <div className="lifecycle-card-note">{formatMonthYear(event.event_date)} • {lt('Rating')} {event.rating || '—'}/5</div>
                                  </div>
                                  <p>{event.details || lt('No details provided.')}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}

          {!loading && filteredEmployees.length === 0 && <div className="empty-state">{t('noEmployeeMatches')}</div>}
        </section>
      </main>
    </div>
  );
};

export default FranceCareerDevelopment;
