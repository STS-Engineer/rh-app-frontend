import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { employeesAPI, getCurrentUser, isGlobalHrManager, tenantV2API } from '../services/api';
import './FranceModules.css';

const monthIndex = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11
};

const monthLabels = Object.keys(monthIndex);
const avatarColors = ['#534ab7', '#22a06b', '#f28500', '#e24b4a', '#0f7aa5', '#7c3aed'];

const emptyRoleForm = {
  role: '',
  from: '',
  previousTo: ''
};

const getEmployeeKey = (employee) => `${employee.tenant_schema || 'public'}-${employee.id}`;

const getEmployeeName = (employee) =>
  `${employee.prenom || ''} ${employee.nom || ''}`.trim() || employee.name || 'Unnamed employee';

const getEmployeeDepartment = (employee) =>
  employee.site_dep || employee.departement || employee.department || 'Unassigned';

const getInitials = (name) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

const parseMonthYear = (value) => {
  if (!value) return null;
  const cleanValue = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}/.test(cleanValue)) {
    const date = new Date(cleanValue);
    return Number.isNaN(date.getTime()) ? null : { month: date.getMonth(), year: date.getFullYear() };
  }

  if (/^\d{4}-\d{2}$/.test(cleanValue)) {
    const [year, month] = cleanValue.split('-').map(Number);
    return { month: month - 1, year };
  }

  const [month, year] = cleanValue.split(/\s+/);
  const normalizedMonth = month ? month.slice(0, 3) : '';
  if (!monthIndex.hasOwnProperty(normalizedMonth) || !year) return null;
  return { month: monthIndex[normalizedMonth], year: Number(year) };
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

const formatDuration = (from, to) => {
  const start = parseMonthYear(from);
  const end = to ? parseMonthYear(to) : { month: new Date().getMonth(), year: new Date().getFullYear() };

  if (!start || !end || Number.isNaN(start.year) || Number.isNaN(end.year)) {
    return 'Duration pending';
  }

  const totalMonths = Math.max(1, (end.year - start.year) * 12 + end.month - start.month + 1);

  if (totalMonths < 12) {
    return `${totalMonths} month${totalMonths > 1 ? 's' : ''}`;
  }

  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  return `${years}y${months ? ` ${months}m` : ''}`;
};

const getRoleEvents = (events) =>
  events
    .filter((event) => event.event_type === 'role_change' || event.event_type === 'promotion' || event.new_value)
    .sort((a, b) => new Date(a.event_date || 0) - new Date(b.event_date || 0) || a.id - b.id);

const buildTimeline = (employee, events) => {
  const roleEvents = getRoleEvents(events);
  const profileRole = employee.poste || 'Role not specified';
  const profileStart = employee.date_debut || employee.created_at || roleEvents[0]?.event_date || new Date().toISOString();

  if (!roleEvents.length) {
    return [
      {
        role: profileRole,
        from: profileStart,
        to: null,
        details: 'Current role from employee profile'
      }
    ];
  }

  const firstRole = roleEvents[0].old_value || profileRole;
  const timeline = [
    {
      role: firstRole,
      from: profileStart,
      to: roleEvents[0].event_date,
      details: 'Initial role before recorded career changes'
    }
  ];

  roleEvents.forEach((event, index) => {
    const nextEvent = roleEvents[index + 1];
    timeline.push({
      role: event.new_value || event.title || profileRole,
      from: event.event_date,
      to: nextEvent?.event_date || null,
      details: event.details
    });
  });

  return timeline;
};

const FranceCareerDevelopment = () => {
  const canFilterByPlant = isGlobalHrManager(getCurrentUser());
  const [employees, setEmployees] = useState([]);
  const [eventsByEmployee, setEventsByEmployee] = useState({});
  const [search, setSearch] = useState('');
  const [plantFilter, setPlantFilter] = useState('');
  const [openEmployeeKey, setOpenEmployeeKey] = useState('');
  const [addingForKey, setAddingForKey] = useState('');
  const [roleForm, setRoleForm] = useState(emptyRoleForm);
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
          loadEvents(rows[0]);
        }
      } catch (err) {
        setError(err?.response?.data?.error || err.message || 'Unable to load employees.');
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
      setError(err?.response?.data?.error || err.message || 'Unable to load career events.');
    } finally {
      setEventsLoadingKey('');
    }
  };

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();
    const scopedEmployees = canFilterByPlant && plantFilter
      ? employees.filter((employee) => getEmployeeDepartment(employee) === plantFilter)
      : employees;

    if (!query) return scopedEmployees;

    return scopedEmployees.filter((employee) => {
      const haystack = [
        getEmployeeName(employee),
        getEmployeeDepartment(employee),
        employee.poste,
        employee.matricule,
        employee.adresse_mail
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [employees, search, plantFilter, canFilterByPlant]);

  const plantOptions = useMemo(
    () =>
      Array.from(new Set(employees.map((employee) => getEmployeeDepartment(employee)).filter(Boolean))).sort((a, b) =>
        String(a).localeCompare(String(b))
      ),
    [employees]
  );

  const toggleEmployee = (employee) => {
    const key = getEmployeeKey(employee);
    const nextKey = openEmployeeKey === key ? '' : key;
    setOpenEmployeeKey(nextKey);
    setAddingForKey('');
    setRoleForm(emptyRoleForm);
    if (nextKey) loadEvents(employee);
  };

  const startAddingRole = (employee) => {
    const key = getEmployeeKey(employee);
    setOpenEmployeeKey(key);
    setAddingForKey((current) => (current === key ? '' : key));
    setRoleForm(emptyRoleForm);
    loadEvents(employee);
  };

  const saveRole = async (employee) => {
    const key = getEmployeeKey(employee);
    const nextRole = roleForm.role.trim();
    const eventDate = monthYearToIsoDate(roleForm.from);
    const previousEnd = roleForm.previousTo.trim() || roleForm.from.trim();

    if (!nextRole || !eventDate) return;

    try {
      setSavingKey(key);
      const timeline = buildTimeline(employee, eventsByEmployee[key] || []);
      const currentRole = timeline[timeline.length - 1]?.role || employee.poste || '';

      await tenantV2API.addFranceCareerEvent(
        employee.id,
        {
          event_type: 'role_change',
          event_date: eventDate,
          title: `Role changed to ${nextRole}`,
          details: `Previous role ended: ${previousEnd || formatMonthYear(eventDate)}`,
          old_value: currentRole,
          new_value: nextRole,
          tenant_schema: employee.tenant_schema
        },
        employee.tenant_schema
      );

      const updatedEmployee = { ...employee, poste: nextRole, tenant_schema: employee.tenant_schema };
      await employeesAPI.update(employee.id, updatedEmployee);

      setEmployees((currentEmployees) =>
        currentEmployees.map((item) => (getEmployeeKey(item) === key ? { ...item, poste: nextRole } : item))
      );

      const refreshed = await tenantV2API.getFranceCareerEvents(employee.id, employee.tenant_schema);
      setEventsByEmployee((current) => ({ ...current, [key]: refreshed.data || [] }));
      setOpenEmployeeKey(key);
      setAddingForKey('');
      setRoleForm(emptyRoleForm);
      setError('');
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Unable to save role change.');
    } finally {
      setSavingKey('');
    }
  };

  return (
    <div className="fr-module-layout">
      <Sidebar />
      <main className="fr-module-content">
        <section className="lifecycle-shell">
          <div className="lifecycle-topbar">
            <div>
              <h1 className="lifecycle-title">Career development</h1>
              <p className="lifecycle-subtitle">
                Track employee role evolution using live employee profiles and saved career events.
              </p>
            </div>
            <div className="lifecycle-topbar-actions">
              {canFilterByPlant && (
                <select
                  className="lifecycle-select"
                  value={plantFilter}
                  onChange={(event) => setPlantFilter(event.target.value)}
                >
                  <option value="">All plants</option>
                  {plantOptions.map((plant) => (
                    <option key={plant} value={plant}>
                      {plant}
                    </option>
                  ))}
                </select>
              )}
              <input
                className="lifecycle-input lifecycle-search"
                type="search"
                placeholder="Search by employee, department, email..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>

          {error && <div className="life-alert">{error}</div>}

          {loading ? (
            <div className="lifecycle-card">Loading employees...</div>
          ) : (
            <div className="career-list">
              {filteredEmployees.map((employee, index) => {
                const key = getEmployeeKey(employee);
                const isOpen = openEmployeeKey === key;
                const employeeName = getEmployeeName(employee);
                const events = eventsByEmployee[key] || [];
                const timeline = buildTimeline(employee, events);
                const currentRole = timeline[timeline.length - 1];

                return (
                  <article className="lifecycle-card compact" key={key}>
                    <button className="employee-summary" type="button" onClick={() => toggleEmployee(employee)}>
                      <span
                        className="employee-avatar"
                        style={{ background: avatarColors[index % avatarColors.length] }}
                      >
                        {getInitials(employeeName)}
                      </span>
                      <span className="employee-main">
                        <span className="employee-name">{employeeName}</span>
                        <span className="employee-current">
                          {currentRole.role}
                          {employee.adresse_mail ? ` • ${employee.adresse_mail}` : ''}
                        </span>
                      </span>
                      <span className="department-pill">{getEmployeeDepartment(employee)}</span>
                      <span className="accordion-caret">{isOpen ? '−' : '+'}</span>
                    </button>

                    {isOpen && (
                      <div className="employee-panel">
                        {eventsLoadingKey === key ? (
                          <p className="lifecycle-card-note">Loading timeline...</p>
                        ) : (
                          <div className="timeline">
                            {timeline.map((item, itemIndex) => {
                              const isCurrent = itemIndex === timeline.length - 1;

                              return (
                                <div className="timeline-item" key={`${key}-${item.role}-${item.from}`}>
                                  <span className={`timeline-dot${isCurrent ? ' current' : ''}`} />
                                  <div className="timeline-row">
                                    <div>
                                      <div className="timeline-role">
                                        {item.role} {isCurrent && <span className="current-pill">Current</span>}
                                      </div>
                                      <div className="timeline-date">
                                        {formatMonthYear(item.from)} → {item.to ? formatMonthYear(item.to) : 'present'}
                                      </div>
                                      {item.details && <div className="timeline-date">{item.details}</div>}
                                    </div>
                                    <div className="timeline-duration">{formatDuration(item.from, item.to)}</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <button className="life-btn ghost" type="button" onClick={() => startAddingRole(employee)}>
                          + Add new role
                        </button>

                        {addingForKey === key && (
                          <div className="inline-form">
                            <div className="lifecycle-grid three">
                              <div className="lifecycle-field">
                                <label>New role title</label>
                                <input
                                  className="lifecycle-input"
                                  placeholder="Operations Manager"
                                  value={roleForm.role}
                                  onChange={(event) =>
                                    setRoleForm((current) => ({ ...current, role: event.target.value }))
                                  }
                                />
                              </div>
                              <div className="lifecycle-field">
                                <label>Start date</label>
                                <input
                                  className="lifecycle-input"
                                  placeholder="Jul 2026"
                                  value={roleForm.from}
                                  onChange={(event) =>
                                    setRoleForm((current) => ({ ...current, from: event.target.value }))
                                  }
                                />
                              </div>
                              <div className="lifecycle-field">
                                <label>Previous role end date</label>
                                <input
                                  className="lifecycle-input"
                                  placeholder="Defaults to start date"
                                  value={roleForm.previousTo}
                                  onChange={(event) =>
                                    setRoleForm((current) => ({ ...current, previousTo: event.target.value }))
                                  }
                                />
                              </div>
                            </div>
                            <div className="lifecycle-actions">
                              <button className="life-btn ghost" type="button" onClick={() => setAddingForKey('')}>
                                Cancel
                              </button>
                              <button
                                className="life-btn"
                                type="button"
                                disabled={!roleForm.role.trim() || !monthYearToIsoDate(roleForm.from) || savingKey === key}
                                onClick={() => saveRole(employee)}
                              >
                                {savingKey === key ? 'Saving...' : 'Save role'}
                              </button>
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

          {!loading && filteredEmployees.length === 0 && (
            <div className="empty-state">No employee matches this search.</div>
          )}
        </section>
      </main>
    </div>
  );
};

export default FranceCareerDevelopment;
