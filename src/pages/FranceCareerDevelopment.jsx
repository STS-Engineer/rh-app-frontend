import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { employeesAPI, getCurrentUser, isGlobalHrManager, tenantV2API } from '../services/api';
import { getEmployeeAvatarFallback, getEmployeeAvatarSrc, getEmployeeDisplayName } from '../utils/employeeAvatar';
import { useLanguage } from '../contexts/LanguageContext';
import { useSiteFilter } from '../contexts/SiteFilterContext';
import './FranceModules.css';

const monthIndex = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
const monthLabels = Object.keys(monthIndex);

const emptyRoleForm = { role: '', from: '', previousTo: '' };
const emptyReviewForm = { date: '', title: '', details: '', rating: '3' };
const emptyTalentForm = { date: '', title: '', details: '', rating: '3' };
const emptyPreviousJobForm = { employerName: '', title: '', start: '', end: '', details: '' };
const emptySalaryForm = { year: '', amount: '' };

const localLabels = {
  ko: {
    'Role not specified': '직무 미지정',
    Unassigned: '미지정',
    'Date pending': '날짜 미정',
    'Loading timeline...': '타임라인 불러오는 중...',
    Current: '현재',
    present: '현재',
    Logistique: '물류',
    Digitale: '디지털',
    'Ingénieur IA': 'AI 엔지니어',
    'ingénieur de développement produit': '제품 개발 엔지니어',
    'Current role from employee profile': '직원 프로필 기준 현재 직무',
    'Initial role before recorded career changes': '기록된 경력 변경 전 초기 직무',
    'Operations Manager': '운영 관리자',
    'Defaults to start date': '입력하지 않으면 시작일을 사용',
    'Role changed to': '직무 변경',
    'Previous role ended': '이전 직무 종료',
    'Annual review 2026': '2026 연간 평가',
    'Strengths, improvement points, next objectives...': '강점, 개선점, 다음 목표...',
    Rating: '평점',
    'No details provided.': '세부 정보가 없습니다.',
    'Salary change': '급여 변경',
    'Salary evolution': '급여 변동',
    'Annual increase': '연간 인상',
    'Talent review 2026': '2026 인재 리뷰',
    'Potential paths, mobility, leadership readiness...': '가능한 경로, 이동성, 리더십 준비도...',
    'Unable to load employees.': '직원을 불러올 수 없습니다.',
    'Unable to load career events.': '경력 이벤트를 불러올 수 없습니다.',
    'Unable to save career data.': '경력 데이터를 저장할 수 없습니다.'
  },
  de: {
    'Role not specified': 'Rolle nicht angegeben',
    Unassigned: 'Nicht zugewiesen',
    'Date pending': 'Datum ausstehend',
    'Loading timeline...': 'Zeitachse wird geladen...',
    Current: 'Aktuell',
    present: 'heute',
    Logistique: 'Logistik',
    Digitale: 'Digital',
    'Ingénieur IA': 'KI-Ingenieur',
    'ingénieur de développement produit': 'Produktentwicklungsingenieur',
    'Current role from employee profile': 'Aktuelle Rolle laut Mitarbeiterprofil',
    'Initial role before recorded career changes': 'Ausgangsrolle vor erfassten Karriereänderungen',
    'Operations Manager': 'Betriebsleiter',
    'Defaults to start date': 'Standard ist das Startdatum',
    'Role changed to': 'Rolle geändert zu',
    'Previous role ended': 'Vorherige Rolle beendet',
    'Annual review 2026': 'Jahresgespräch 2026',
    'Strengths, improvement points, next objectives...': 'Stärken, Verbesserungen, nächste Ziele...',
    Rating: 'Bewertung',
    'No details provided.': 'Keine Details angegeben.',
    'Salary change': 'Gehaltsänderung',
    'Salary evolution': 'Gehaltsentwicklung',
    'Annual increase': 'Jährliche Erhöhung',
    'Talent review 2026': 'Talentbewertung 2026',
    'Potential paths, mobility, leadership readiness...': 'Mögliche Wege, Mobilität, Führungsreife...',
    'Unable to load employees.': 'Mitarbeitende konnten nicht geladen werden.',
    'Unable to load career events.': 'Karriereereignisse konnten nicht geladen werden.',
    'Unable to save career data.': 'Karrieredaten konnten nicht gespeichert werden.'
  },
  es: {
    'Role not specified': 'Puesto no especificado',
    Unassigned: 'Sin asignar',
    'Date pending': 'Fecha pendiente',
    'Loading timeline...': 'Cargando cronología...',
    Current: 'Actual',
    present: 'actualidad',
    Logistique: 'Logística',
    Digitale: 'Digital',
    'Ingénieur IA': 'Ingeniero de IA',
    'ingénieur de développement produit': 'Ingeniero de desarrollo de producto',
    'Current role from employee profile': 'Puesto actual según el perfil del empleado',
    'Initial role before recorded career changes': 'Puesto inicial antes de los cambios de carrera registrados',
    'Operations Manager': 'Gerente de operaciones',
    'Defaults to start date': 'Por defecto, la fecha de inicio',
    'Role changed to': 'Puesto cambiado a',
    'Previous role ended': 'Puesto anterior finalizado',
    'Annual review 2026': 'Evaluación anual 2026',
    'Strengths, improvement points, next objectives...': 'Fortalezas, puntos de mejora, próximos objetivos...',
    Rating: 'Calificación',
    'No details provided.': 'No se proporcionaron detalles.',
    'Salary change': 'Cambio salarial',
    'Salary evolution': 'Evolución salarial',
    'Annual increase': 'Aumento anual',
    'Talent review 2026': 'Revisión de talento 2026',
    'Potential paths, mobility, leadership readiness...': 'Posibles trayectorias, movilidad, preparación para liderazgo...',
    'Unable to load employees.': 'No se pudieron cargar los empleados.',
    'Unable to load career events.': 'No se pudieron cargar los eventos de carrera.',
    'Unable to save career data.': 'No se pudieron guardar los datos de carrera.'
  },
  zh: {
    'Role not specified': '未指定职位',
    Unassigned: '未分配',
    'Date pending': '日期待定',
    'Loading timeline...': '正在加载时间线...',
    Current: '当前',
    present: '现在',
    Logistique: '物流',
    Digitale: '数字化',
    'Ingénieur IA': '人工智能工程师',
    'ingénieur de développement produit': '产品开发工程师',
    'Current role from employee profile': '来自员工档案的当前职位',
    'Initial role before recorded career changes': '记录职业变动前的初始职位',
    'Operations Manager': '运营经理',
    'Defaults to start date': '默认为开始日期',
    'Role changed to': '职位变更为',
    'Previous role ended': '上一职位结束',
    'Annual review 2026': '2026 年度评估',
    'Strengths, improvement points, next objectives...': '优势、改进点、下一步目标...',
    Rating: '评分',
    'No details provided.': '未提供详细信息。',
    'Salary change': '薪资变更',
    'Salary evolution': '薪资变化',
    'Annual increase': '年度加薪',
    'Talent review 2026': '2026 人才评审',
    'Potential paths, mobility, leadership readiness...': '潜在路径、流动性、领导力准备情况...',
    'Unable to load employees.': '无法加载员工。',
    'Unable to load career events.': '无法加载职业事件。',
    'Unable to save career data.': '无法保存职业数据。'
  },
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

const pageText = {
  ko: {
    careerDevelopment: '경력 개발',
    searchEmployeeDepartmentEmail: '직원, 부서 또는 이메일로 검색...',
    careerTabCareer: '경력',
    careerTabReviews: '연간 평가',
    careerTabSalary: '급여 이력',
    careerTabTalent: '인재 리뷰',
    loadingEmployees: '직원 불러오는 중...',
    noEmployeeMatches: '검색과 일치하는 직원이 없습니다.',
    addNewRole: '새 직무 추가',
    saveRole: '직무 저장',
    saveReview: '평가 저장',
    saveSalaryChange: '급여 변경 저장',
    saveTalentReview: '인재 리뷰 저장'
  },
  de: {
    careerDevelopment: 'Karriereentwicklung',
    searchEmployeeDepartmentEmail: 'Nach Mitarbeiter, Abteilung oder E-Mail suchen...',
    careerTabCareer: 'Karriere',
    careerTabReviews: 'Jahresgespräche',
    careerTabSalary: 'Gehaltsverlauf',
    careerTabTalent: 'Talentbewertung',
    loadingEmployees: 'Mitarbeitende werden geladen...',
    noEmployeeMatches: 'Kein Mitarbeiter passt zu dieser Suche.',
    addNewRole: 'Neue Rolle hinzufügen',
    saveRole: 'Rolle speichern',
    saveReview: 'Bewertung speichern',
    saveSalaryChange: 'Gehaltsänderung speichern',
    saveTalentReview: 'Talentbewertung speichern'
  },
  es: {
    careerDevelopment: 'Desarrollo de carrera',
    searchEmployeeDepartmentEmail: 'Buscar por empleado, departamento o correo...',
    careerTabCareer: 'Carrera',
    careerTabReviews: 'Evaluaciones anuales',
    careerTabSalary: 'Historial salarial',
    careerTabTalent: 'Revisión de talento',
    loadingEmployees: 'Cargando empleados...',
    noEmployeeMatches: 'Ningún empleado coincide con esta búsqueda.',
    addNewRole: 'Añadir nuevo puesto',
    saveRole: 'Guardar puesto',
    saveReview: 'Guardar evaluación',
    saveSalaryChange: 'Guardar cambio salarial',
    saveTalentReview: 'Guardar revisión de talento'
  },
  zh: {
    careerDevelopment: '职业发展',
    searchEmployeeDepartmentEmail: '按员工、部门或邮箱搜索...',
    careerTabCareer: '职业路径',
    careerTabReviews: '年度评估',
    careerTabSalary: '薪资历史',
    careerTabTalent: '人才评审',
    loadingEmployees: '正在加载员工...',
    noEmployeeMatches: '没有员工符合该搜索。',
    addNewRole: '添加新职位',
    saveRole: '保存职位',
    saveReview: '保存评估',
    saveSalaryChange: '保存薪资变更',
    saveTalentReview: '保存人才评审'
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
  const tt = (key) => pageText[language]?.[key] || t(key);
  const canFilterByPlant = isGlobalHrManager(getCurrentUser());
  const [employees, setEmployees] = useState([]);
  const [eventsByEmployee, setEventsByEmployee] = useState({});
  const [search, setSearch] = useState('');
  const { siteFilter: plantFilter, setSiteFilter: setPlantFilter } = useSiteFilter();
  const [openEmployeeKey, setOpenEmployeeKey] = useState('');
  const [activeTabByEmployee, setActiveTabByEmployee] = useState({});
  const [addingForKey, setAddingForKey] = useState('');
  const [roleForm, setRoleForm] = useState(emptyRoleForm);
  const [reviewForm, setReviewForm] = useState(emptyReviewForm);
  const [talentForm, setTalentForm] = useState(emptyTalentForm);
  const [previousJobForm, setPreviousJobForm] = useState(emptyPreviousJobForm);
  const [salaryForm, setSalaryForm] = useState(emptySalaryForm);
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
    setTalentForm(emptyTalentForm);
    setPreviousJobForm(emptyPreviousJobForm);
    setSalaryForm(emptySalaryForm);
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
              <h1 className="lifecycle-title">{tt('careerDevelopment')}</h1>
                <p className="lifecycle-subtitle">
                {tt('careerDevelopment')} — {t('overview')}
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
                placeholder={tt('searchEmployeeDepartmentEmail')}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>

          {error && <div className="life-alert">{error}</div>}

          {loading ? (
            <div className="lifecycle-card">{tt('loadingEmployees')}</div>
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
                const previousJobs = events
                  .filter((event) => event.event_type === 'previous_job')
                  .sort((a, b) => new Date(b.event_date || 0) - new Date(a.event_date || 0));

                const salaryByYearMap = new Map();
                salaryEvents.forEach((event) => {
                  if (!event.event_date) return;
                  const year = new Date(event.event_date).getFullYear();
                  const amount = event.salary_new ?? event.salary_old;
                  if (!year || amount == null) return;
                  const existing = salaryByYearMap.get(year);
                  if (!existing || new Date(event.event_date) >= new Date(existing.event_date)) {
                    salaryByYearMap.set(year, event);
                  }
                });
                const salaryByYear = Array.from(salaryByYearMap.entries())
                  .map(([year, event]) => ({ year, amount: event.salary_new ?? event.salary_old }))
                  .sort((a, b) => a.year - b.year);

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
                          {['career', 'previousJobs', 'reviews', 'salary', 'talent'].map((item) => (
                            <button
                              key={item}
                              type="button"
                              className={`career-tab${tab === item ? ' active' : ''}`}
                              onClick={() => setActiveTabByEmployee((current) => ({ ...current, [key]: item }))}
                            >
                              {item === 'career' && tt('careerTabCareer')}
                              {item === 'previousJobs' && tt('careerTabPreviousJobs')}
                              {item === 'reviews' && tt('careerTabReviews')}
                              {item === 'salary' && tt('careerTabSalary')}
                              {item === 'talent' && tt('careerTabTalent')}
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
                              + {tt('addNewRole')}
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
                                    {savingKey === key ? t('saving') : tt('saveRole')}
                                  </button>
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {tab === 'previousJobs' && (
                          <div className="career-section">
                            <div className="inline-form">
                              <div className="lifecycle-grid three">
                                <div className="lifecycle-field">
                                  <label>{tt('employerName')}</label>
                                  <input className="lifecycle-input" value={previousJobForm.employerName} onChange={(event) => setPreviousJobForm((current) => ({ ...current, employerName: event.target.value }))} placeholder="Acme Corp" />
                                </div>
                                <div className="lifecycle-field">
                                  <label>{t('position')}</label>
                                  <input className="lifecycle-input" value={previousJobForm.title} onChange={(event) => setPreviousJobForm((current) => ({ ...current, title: event.target.value }))} placeholder={lt('Operations Manager')} />
                                </div>
                                <div className="lifecycle-field">
                                  <label>{t('startDate')}</label>
                                  <input className="lifecycle-input" type="date" value={previousJobForm.start} onChange={(event) => setPreviousJobForm((current) => ({ ...current, start: event.target.value }))} />
                                </div>
                                <div className="lifecycle-field">
                                  <label>{t('contractEndDate')}</label>
                                  <input className="lifecycle-input" type="date" value={previousJobForm.end} onChange={(event) => setPreviousJobForm((current) => ({ ...current, end: event.target.value }))} />
                                </div>
                              </div>
                              <div className="lifecycle-field">
                                <label>{t('details')}</label>
                                <textarea className="lifecycle-textarea" value={previousJobForm.details} onChange={(event) => setPreviousJobForm((current) => ({ ...current, details: event.target.value }))} />
                              </div>
                              <div className="lifecycle-actions">
                                <button className="life-btn ghost" type="button" onClick={() => setPreviousJobForm(emptyPreviousJobForm)}>{t('reset')}</button>
                                <button
                                  className="life-btn"
                                  type="button"
                                  disabled={!previousJobForm.employerName.trim() || !previousJobForm.title.trim() || !previousJobForm.start || savingKey === key}
                                  onClick={() =>
                                    addCareerEvent(employee, {
                                      event_type: 'previous_job',
                                      event_date: previousJobForm.start,
                                      end_date: previousJobForm.end || null,
                                      title: previousJobForm.title.trim(),
                                      employer_name: previousJobForm.employerName.trim(),
                                      details: previousJobForm.details.trim() || null
                                    }).then(() => setPreviousJobForm(emptyPreviousJobForm))
                                  }
                                >
                                  {savingKey === key ? t('saving') : tt('savePreviousJob')}
                                </button>
                              </div>
                            </div>
                            <div className="career-list compact-list">
                              {previousJobs.map((event) => (
                                <div className="career-note" key={event.id}>
                                  <div>
                                    <strong>{event.employer_name} — {event.title}</strong>
                                    <div className="lifecycle-card-note">
                                      {formatMonthYear(event.event_date)} → {event.end_date ? formatMonthYear(event.end_date) : t('present')}
                                    </div>
                                  </div>
                                  {event.details && <p>{event.details}</p>}
                                </div>
                              ))}
                              {previousJobs.length === 0 && (
                                <p className="lifecycle-card-note">{lt('No details provided.')}</p>
                              )}
                            </div>
                          </div>
                        )}

                        {tab === 'reviews' && (
                          <div className="career-section">
                            <div className="mini-stats">
                              <div className="mini-stat"><span>{tt('careerTabReviews')}</span><strong>{annualReviews.length}</strong></div>
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
                                  {savingKey === key ? t('saving') : tt('saveReview')}
                                </button>
                              </div>
                            </div>
                            <div className="career-list compact-list">
                              {annualReviews.map((event) => (
                                <div className="career-note" key={event.id}>
                                  <div>
                                    <strong>{event.title || tt('careerTabReviews')}</strong>
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
                              <div className="mini-stat"><span>{tt('salaryYearsRecorded')}</span><strong>{salaryByYear.length}</strong></div>
                              <div className="mini-stat"><span>{t('department')}</span><strong>{getEmployeeDepartment(employee)}</strong></div>
                            </div>
                            <div className="inline-form">
                              <div className="lifecycle-grid three">
                                <div className="lifecycle-field">
                                  <label>{tt('salaryYear')}</label>
                                  <input
                                    className="lifecycle-input"
                                    type="number"
                                    min="1990"
                                    max="2100"
                                    placeholder="2026"
                                    value={salaryForm.year}
                                    onChange={(event) => setSalaryForm((current) => ({ ...current, year: event.target.value }))}
                                  />
                                </div>
                                <div className="lifecycle-field">
                                  <label>{tt('salaryAmount')}</label>
                                  <input
                                    className="lifecycle-input"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={salaryForm.amount}
                                    onChange={(event) => setSalaryForm((current) => ({ ...current, amount: event.target.value }))}
                                  />
                                </div>
                              </div>
                              <div className="lifecycle-actions">
                                <button className="life-btn ghost" type="button" onClick={() => setSalaryForm(emptySalaryForm)}>{t('reset')}</button>
                                <button
                                  className="life-btn"
                                  type="button"
                                  disabled={!salaryForm.year || !salaryForm.amount || savingKey === key}
                                  onClick={() =>
                                    addCareerEvent(employee, {
                                      event_type: 'salary_change',
                                      event_date: `${salaryForm.year}-01-01`,
                                      salary_new: Number(salaryForm.amount),
                                      title: `${tt('careerTabSalary')} ${salaryForm.year}`
                                    }).then(() => setSalaryForm(emptySalaryForm))
                                  }
                                >
                                  {savingKey === key ? t('saving') : tt('saveSalaryChange')}
                                </button>
                              </div>
                            </div>
                            <div className="career-list compact-list">
                              {salaryByYear.map((entry) => (
                                <div className="career-note" key={entry.year}>
                                  <strong>{entry.year}</strong>
                                  <p>{formatCurrency(entry.amount)}</p>
                                </div>
                              ))}
                              {salaryByYear.length === 0 && (
                                <p className="lifecycle-card-note">{lt('No details provided.')}</p>
                              )}
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
                                  {savingKey === key ? t('saving') : tt('saveTalentReview')}
                                </button>
                              </div>
                            </div>
                            <div className="career-list compact-list">
                              {talentNotes.map((event) => (
                                <div className="career-note" key={event.id}>
                                  <div>
                                    <strong>{event.title || tt('careerTabTalent')}</strong>
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

          {!loading && filteredEmployees.length === 0 && <div className="empty-state">{tt('noEmployeeMatches')}</div>}
        </section>
      </main>
    </div>
  );
};

export default FranceCareerDevelopment;
