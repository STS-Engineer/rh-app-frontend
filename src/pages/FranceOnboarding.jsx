import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { tenantV2API } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import './FranceModules.css';

const departments = ['Engineering', 'Design', 'Product', 'HR', 'Finance'];
const IT_TEST_EMAIL = 'rami.mejri@avocarbon.com';
const TRAINING_CONTACT_EMAIL = 'amira.aydi@avocarbon.com';

const softwareTools = [
  { name: 'Microsoft 365', category: 'Productivity' },
  { name: 'Slack', category: 'Communication' },
  { name: 'Jira', category: 'Project management' },
  { name: 'GitHub', category: 'Engineering' },
  { name: 'Figma', category: 'Design' },
  { name: 'Notion', category: 'Knowledge base' },
  { name: 'Zoom', category: 'Meetings' },
  { name: 'Azure AD', category: 'Identity' },
  { name: 'VPN', category: 'Security' },
  { name: 'Salesforce', category: 'Sales' }
];

const equipmentOptions = [
  { name: 'Laptop', category: 'Portable computer' },
  { name: 'Desktop PC', category: 'Fixed workstation' },
  { name: 'Second monitor', category: 'Display' },
  { name: 'Mouse', category: 'Peripherals' },
  { name: 'Ergonomic mouse pad', category: 'Ergonomics' },
  { name: 'Drawing table', category: 'Design' },
  { name: 'Office chair', category: 'Ergonomics' },
  { name: 'Footrest', category: 'Ergonomics' },
  { name: 'Specialized equipment', category: 'Custom request' }
];

const trainingOptions = [
  { name: 'Onboarding training', category: 'General' },
  { name: 'Sales training', category: 'Job specific' },
  { name: 'Purchasing training', category: 'Job specific' },
  { name: 'Project management training', category: 'Job specific' },
  { name: 'Management training', category: 'Leadership' },
  { name: 'Process / tools training', category: 'Operations' }
];

const localLabels = {
  ko: {
    Engineering: '엔지니어링',
    Design: '디자인',
    Product: '제품',
    HR: '인사',
    Finance: '재무',
    Productivity: '생산성',
    Communication: '커뮤니케이션',
    'Project management': '프로젝트 관리',
    'Knowledge base': '지식 베이스',
    Meetings: '회의',
    Identity: '계정',
    Security: '보안',
    Sales: '영업',
    Laptop: '노트북',
    'Desktop PC': '데스크톱 PC',
    'Second monitor': '보조 모니터',
    Mouse: '마우스',
    'Ergonomic mouse pad': '인체공학 마우스패드',
    'Drawing table': '드로잉 태블릿',
    'Office chair': '사무용 의자',
    Footrest: '발받침',
    'Specialized equipment': '특수 장비',
    'Portable computer': '휴대용 컴퓨터',
    'Fixed workstation': '고정형 워크스테이션',
    Display: '디스플레이',
    Peripherals: '주변기기',
    Ergonomics: '인체공학',
    'Custom request': '맞춤 요청',
    'Onboarding training': '온보딩 교육',
    'Sales training': '영업 교육',
    'Purchasing training': '구매 교육',
    'Project management training': '프로젝트 관리 교육',
    'Management training': '관리자 교육',
    'Process / tools training': '프로세스 / 도구 교육',
    General: '일반',
    'Job specific': '직무별',
    Leadership: '리더십',
    Operations: '운영',
    'Product Engineer': '제품 엔지니어',
    'Thank you.': '감사합니다.'
  },
  de: {
    Engineering: 'Technik',
    Design: 'Design',
    Product: 'Produkt',
    HR: 'Personal',
    Finance: 'Finanzen',
    Productivity: 'Produktivität',
    Communication: 'Kommunikation',
    'Project management': 'Projektmanagement',
    'Knowledge base': 'Wissensdatenbank',
    Meetings: 'Meetings',
    Identity: 'Identität',
    Security: 'Sicherheit',
    Sales: 'Vertrieb',
    Laptop: 'Laptop',
    'Desktop PC': 'Desktop-PC',
    'Second monitor': 'Zweiter Monitor',
    Mouse: 'Maus',
    'Ergonomic mouse pad': 'Ergonomisches Mauspad',
    'Drawing table': 'Grafiktablett',
    'Office chair': 'Bürostuhl',
    Footrest: 'Fußstütze',
    'Specialized equipment': 'Spezialausrüstung',
    'Portable computer': 'Tragbarer Computer',
    'Fixed workstation': 'Fester Arbeitsplatz',
    Display: 'Anzeige',
    Peripherals: 'Peripheriegeräte',
    Ergonomics: 'Ergonomie',
    'Custom request': 'Sonderanfrage',
    'Onboarding training': 'Onboarding-Schulung',
    'Sales training': 'Vertriebsschulung',
    'Purchasing training': 'Einkaufsschulung',
    'Project management training': 'Projektmanagement-Schulung',
    'Management training': 'Management-Schulung',
    'Process / tools training': 'Prozess- / Tool-Schulung',
    General: 'Allgemein',
    'Job specific': 'Stellenbezogen',
    Leadership: 'Führung',
    Operations: 'Betrieb',
    'Product Engineer': 'Produktingenieur',
    'Thank you.': 'Danke.'
  },
  es: {
    Engineering: 'Ingeniería',
    Design: 'Diseño',
    Product: 'Producto',
    HR: 'RR. HH.',
    Finance: 'Finanzas',
    Productivity: 'Productividad',
    Communication: 'Comunicación',
    'Project management': 'Gestión de proyectos',
    'Knowledge base': 'Base de conocimiento',
    Meetings: 'Reuniones',
    Identity: 'Identidad',
    Security: 'Seguridad',
    Sales: 'Ventas',
    Laptop: 'Portátil',
    'Desktop PC': 'PC de escritorio',
    'Second monitor': 'Segundo monitor',
    Mouse: 'Ratón',
    'Ergonomic mouse pad': 'Alfombrilla ergonómica',
    'Drawing table': 'Tableta gráfica',
    'Office chair': 'Silla de oficina',
    Footrest: 'Reposapiés',
    'Specialized equipment': 'Equipo especializado',
    'Portable computer': 'Ordenador portátil',
    'Fixed workstation': 'Puesto fijo',
    Display: 'Pantalla',
    Peripherals: 'Periféricos',
    Ergonomics: 'Ergonomía',
    'Custom request': 'Solicitud personalizada',
    'Onboarding training': 'Formación de incorporación',
    'Sales training': 'Formación de ventas',
    'Purchasing training': 'Formación de compras',
    'Project management training': 'Formación en gestión de proyectos',
    'Management training': 'Formación de gestión',
    'Process / tools training': 'Formación en procesos / herramientas',
    General: 'General',
    'Job specific': 'Específica del puesto',
    Leadership: 'Liderazgo',
    Operations: 'Operaciones',
    'Product Engineer': 'Ingeniero de producto',
    'Thank you.': 'Gracias.'
  },
  zh: {
    Engineering: '工程',
    Design: '设计',
    Product: '产品',
    HR: '人力资源',
    Finance: '财务',
    Productivity: '生产力',
    Communication: '沟通',
    'Project management': '项目管理',
    'Knowledge base': '知识库',
    Meetings: '会议',
    Identity: '身份',
    Security: '安全',
    Sales: '销售',
    Laptop: '笔记本电脑',
    'Desktop PC': '台式电脑',
    'Second monitor': '第二显示器',
    Mouse: '鼠标',
    'Ergonomic mouse pad': '人体工学鼠标垫',
    'Drawing table': '绘图板',
    'Office chair': '办公椅',
    Footrest: '脚踏',
    'Specialized equipment': '专用设备',
    'Portable computer': '便携式电脑',
    'Fixed workstation': '固定工位',
    Display: '显示器',
    Peripherals: '外设',
    Ergonomics: '人体工学',
    'Custom request': '定制请求',
    'Onboarding training': '入职培训',
    'Sales training': '销售培训',
    'Purchasing training': '采购培训',
    'Project management training': '项目管理培训',
    'Management training': '管理培训',
    'Process / tools training': '流程 / 工具培训',
    General: '通用',
    'Job specific': '岗位专项',
    Leadership: '领导力',
    Operations: '运营',
    'Product Engineer': '产品工程师',
    'Thank you.': '谢谢。'
  },
  ta: {
    Engineering: 'பொறியியல்',
    Design: 'வடிவமைப்பு',
    Product: 'தயாரிப்பு',
    HR: 'HR',
    Finance: 'நிதி',
    Productivity: 'உற்பத்தித்திறன்',
    Communication: 'தொடர்பு',
    'Project management': 'திட்ட மேலாண்மை',
    'Knowledge base': 'அறிவு தளம்',
    Meetings: 'கூட்டங்கள்',
    Identity: 'அடையாளம்',
    Security: 'பாதுகாப்பு',
    Sales: 'விற்பனை',
    Laptop: 'மடிக்கணினி',
    'Desktop PC': 'மேசை கணினி',
    'Second monitor': 'இரண்டாவது திரை',
    Mouse: 'மவுஸ்',
    'Ergonomic mouse pad': 'எர்கோனாமிக் மவுஸ் பேட்',
    'Drawing table': 'வரைதல் மேசை',
    'Office chair': 'அலுவலக நாற்காலி',
    Footrest: 'கால் ஆதாரம்',
    'Specialized equipment': 'சிறப்பு உபகரணம்',
    'Portable computer': 'கைக்கணினி',
    'Fixed workstation': 'நிலையான பணியிடம்',
    Display: 'திரை',
    Peripherals: 'சுற்றுப்பொருட்கள்',
    Ergonomics: 'எர்கோனாமிக்ஸ்',
    'Custom request': 'சிறப்பு கோரிக்கை',
    'Onboarding training': 'இணைப்பு பயிற்சி',
    'Sales training': 'விற்பனை பயிற்சி',
    'Purchasing training': 'கொள்முதல் பயிற்சி',
    'Project management training': 'திட்ட மேலாண்மை பயிற்சி',
    'Management training': 'மேலாண்மை பயிற்சி',
    'Process / tools training': 'செயல்முறை / கருவிகள் பயிற்சி',
    General: 'பொது',
    'Job specific': 'பணி சார்ந்தது',
    Leadership: 'தலைமை',
    Operations: 'செயல்பாடுகள்',
    'Product Engineer': 'தயாரிப்பு பொறியாளர்',
    'No selection yet': 'இதுவரை தேர்வு இல்லை',
    'Thank you.': 'நன்றி.'
  }
};

const pageText = {
  ko: {
    onboarding: '온보딩',
    prepareOnboardingRequests: '신규 입사자를 위한 IT, 장비 및 교육 요청을 준비합니다.',
    setupRequestPrepared: '설정 요청 미리보기가 준비되었습니다:',
    newEmployeeDetails: '신규 직원 정보',
    softwareLicences: '소프트웨어 및 라이선스',
    equipmentRequests: '장비 요청',
    trainingRequests: '교육 요청',
    notesToIT: 'IT / 지원팀 메모',
    emailPreviewIT: 'IT용 이메일 미리보기',
    localPreviewNote: '이 미리보기는 현재 로컬 전용입니다. IT 테스트 수신자:',
    sendToIT: 'IT에 보내기',
    managerName: '관리자 이름'
  },
  de: {
    onboarding: 'Einarbeitung',
    prepareOnboardingRequests: 'IT-, Ausrüstungs- und Schulungsanfragen für neue Mitarbeitende vorbereiten.',
    setupRequestPrepared: 'Die Einrichtungsanfrage ist bereit für',
    newEmployeeDetails: 'Details des neuen Mitarbeiters',
    softwareLicences: 'Software und Lizenzen',
    equipmentRequests: 'Ausrüstungsanfragen',
    trainingRequests: 'Schulungsanfragen',
    notesToIT: 'Hinweise für IT / Support',
    emailPreviewIT: 'E-Mail-Vorschau an IT',
    localPreviewNote: 'Diese Vorschau ist derzeit nur lokal. IT-Testempfänger:',
    sendToIT: 'An IT senden',
    managerName: 'Name des Vorgesetzten'
  },
  es: {
    onboarding: 'Incorporación',
    prepareOnboardingRequests: 'Preparar solicitudes de IT, equipos y formación para una nueva incorporación.',
    setupRequestPrepared: 'La vista previa de la solicitud está lista para',
    newEmployeeDetails: 'Detalles del nuevo empleado',
    softwareLicences: 'Software y licencias',
    equipmentRequests: 'Solicitudes de equipo',
    trainingRequests: 'Solicitudes de formación',
    notesToIT: 'Notas para IT / soporte',
    emailPreviewIT: 'Vista previa del correo a IT',
    localPreviewNote: 'Esta vista previa es local por ahora. Destinatario de prueba de IT:',
    sendToIT: 'Enviar a IT',
    managerName: 'Nombre del responsable'
  },
  zh: {
    onboarding: '入职',
    prepareOnboardingRequests: '为新员工准备 IT、设备和培训请求。',
    setupRequestPrepared: '设置请求预览已准备好：',
    newEmployeeDetails: '新员工详情',
    softwareLicences: '软件和许可证',
    equipmentRequests: '设备请求',
    trainingRequests: '培训请求',
    notesToIT: '给 IT / 支持团队的备注',
    emailPreviewIT: '发送给 IT 的邮件预览',
    localPreviewNote: '该预览当前仅在本地显示。IT 测试收件人：',
    sendToIT: '发送给 IT',
    managerName: '经理姓名'
  }
};

const initialForm = {
  fullName: '',
  jobTitle: '',
  department: departments[0],
  startDate: '',
  workEmail: '',
  managerName: '',
  notes: ''
};

const allSoftwareNames = softwareTools.map((tool) => tool.name);
const allEquipmentNames = equipmentOptions.map((item) => item.name);
const allTrainingNames = trainingOptions.map((item) => item.name);

const FranceOnboarding = () => {
  const { t, language } = useLanguage();
  const location = useLocation();
  const lt = (value) => localLabels[language]?.[value] || value;
  const tt = (key) => pageText[language]?.[key] || t(key);
  const [form, setForm] = useState(initialForm);
  const [selectedSoftware, setSelectedSoftware] = useState(allSoftwareNames);
  const [selectedEquipment, setSelectedEquipment] = useState(allEquipmentNames);
  const [selectedTraining, setSelectedTraining] = useState(allTrainingNames);
  const [success, setSuccess] = useState(false);
  const [openSections, setOpenSections] = useState({ software: false, equipment: false, training: false });
  const [previewTab, setPreviewTab] = useState('it');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');

  const toggleSection = (key) => {
    setOpenSections((current) => ({ ...current, [key]: !current[key] }));
  };

  useEffect(() => {
    const newEmployee = location.state?.newEmployee;
    if (!newEmployee) return;

    setForm((current) => ({
      ...current,
      fullName: `${newEmployee.prenom || ''} ${newEmployee.nom || ''}`.trim() || current.fullName,
      jobTitle: newEmployee.poste || current.jobTitle,
      startDate: newEmployee.date_debut || current.startDate,
      workEmail: newEmployee.adresse_mail || current.workEmail
    }));
  }, [location.state]);

  const updateField = (field, value) => {
    setSuccess(false);
    setForm((current) => ({ ...current, [field]: value }));
  };

  const toggleSelection = (setter, toolName) => {
    setSuccess(false);
    setter((current) =>
      current.includes(toolName) ? current.filter((name) => name !== toolName) : [...current, toolName]
    );
  };

  const resetForm = () => {
    setForm(initialForm);
    setSelectedSoftware(allSoftwareNames);
    setSelectedEquipment(allEquipmentNames);
    setSelectedTraining(allTrainingNames);
    setSuccess(false);
    setSendError('');
  };

  const emailPreview = useMemo(() => {
    const name = form.fullName || '[new hire name]';
    const softwareList = selectedSoftware.length
      ? selectedSoftware.map((toolName) => `- ${lt(toolName)}`).join('\n')
      : `- ${t('none')}`;
    const equipmentList = selectedEquipment.length
      ? selectedEquipment.map((itemName) => `- ${lt(itemName)}`).join('\n')
      : `- ${t('none')}`;

    return `To: ${IT_TEST_EMAIL}
Subject: ${tt('setupRequestPrepared')} ${name}

${tt('notesToIT')},

${tt('prepareOnboardingRequests')}

${t('fullName')}: ${name}
${t('position')}: ${form.jobTitle || '[job title]'}
${t('department')}: ${lt(form.department)}
${t('startDate')}: ${form.startDate || '[start date]'}
${t('employeeEmail') || 'Work email to create'}: ${form.workEmail || '[work email]'}
${tt('managerName')}: ${form.managerName || '[manager name]'}

${tt('softwareLicences')}:
${softwareList}

${tt('equipmentRequests')}:
${equipmentList}

${t('notes')}:
${form.notes || `${t('none')} ${t('notes').toLowerCase()}.`}

${lt('Thank you.')}`;
  }, [form, selectedSoftware, selectedEquipment, language]);

  const trainingPreview = useMemo(() => {
    const name = form.fullName || '[new hire name]';
    const trainingList = selectedTraining.length
      ? selectedTraining.map((itemName) => `- ${lt(itemName)}`).join('\n')
      : `- ${t('none')}`;

    return `To: ${TRAINING_CONTACT_EMAIL}
Subject: ${tt('trainingRequests')} — ${name}

${tt('notesToIT')},

${t('fullName')}: ${name}
${t('position')}: ${form.jobTitle || '[job title]'}
${t('department')}: ${lt(form.department)}
${t('startDate')}: ${form.startDate || '[start date]'}

${tt('trainingRequests')}:
${trainingList}

${lt('Thank you.')}`;
  }, [form, selectedTraining, language]);

  const handleSend = async () => {
    setSending(true);
    setSendError('');
    try {
      await tenantV2API.sendOnboardingRequestEmails({
        employeeName: form.fullName,
        itEmailBody: emailPreview,
        trainingEmailBody: selectedTraining.length ? trainingPreview : null
      });
      setSuccess(true);
    } catch (error) {
      setSendError(error?.response?.data?.error || error.message || 'Unable to send onboarding emails.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fr-module-layout">
      <Sidebar />
      <main className="fr-module-content">
        <section className="lifecycle-shell">
          <div className="lifecycle-topbar">
            <div>
              <h1 className="lifecycle-title">{tt('onboarding')}</h1>
              <p className="lifecycle-subtitle">
                {tt('prepareOnboardingRequests')}
              </p>
            </div>
          </div>

          <div className="lifecycle-stack">
            {success && (
              <div className="life-alert">
                {tt('setupRequestPrepared')} {IT_TEST_EMAIL}
                {selectedTraining.length ? ` / ${tt('trainingRequests')} ${TRAINING_CONTACT_EMAIL}` : ''}.
              </div>
            )}
            {sendError && <div className="life-alert">{sendError}</div>}

            <section className="lifecycle-card">
              <h2>{tt('newEmployeeDetails')}</h2>
              <div className="lifecycle-grid">
                <div className="lifecycle-field">
                  <label>{t('fullName') || 'Full name'}</label>
                  <input
                    className="lifecycle-input"
                    value={form.fullName}
                    onChange={(event) => updateField('fullName', event.target.value)}
                    placeholder="Alex Martin"
                  />
                </div>
                <div className="lifecycle-field">
                  <label>{t('position')}</label>
                  <input
                    className="lifecycle-input"
                    value={form.jobTitle}
                    onChange={(event) => updateField('jobTitle', event.target.value)}
                    placeholder={lt('Product Engineer')}
                  />
                </div>
                <div className="lifecycle-field">
                  <label>{t('department')}</label>
                  <select
                    className="lifecycle-select"
                    value={form.department}
                    onChange={(event) => updateField('department', event.target.value)}
                  >
                    {departments.map((department) => (
                      <option key={department} value={department}>
                        {lt(department)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="lifecycle-field">
                  <label>{t('startDate')}</label>
                  <input
                    className="lifecycle-input"
                    type="date"
                    value={form.startDate}
                    onChange={(event) => updateField('startDate', event.target.value)}
                  />
                </div>
                <div className="lifecycle-field">
                  <label>{t('employeeEmail') || 'Work email to create'}</label>
                  <input
                    className="lifecycle-input"
                    type="email"
                    value={form.workEmail}
                    onChange={(event) => updateField('workEmail', event.target.value)}
                    placeholder="alex.martin@company.com"
                  />
                </div>
                <div className="lifecycle-field">
                  <label>{tt('managerName')}</label>
                  <input
                    className="lifecycle-input"
                    value={form.managerName}
                    onChange={(event) => updateField('managerName', event.target.value)}
                    placeholder="Maya Dupont"
                  />
                </div>
              </div>
            </section>

            <section className="lifecycle-card">
              <button type="button" className="collapsible-header" onClick={() => toggleSection('software')}>
                <h2>{tt('softwareLicences')} ({selectedSoftware.length})</h2>
                <span className="accordion-caret">{openSections.software ? '−' : '+'}</span>
              </button>
              {openSections.software && (
                <div className="tool-grid tool-list collapsible-content">
                  {softwareTools.map((tool) => {
                    const checked = selectedSoftware.includes(tool.name);
                    return (
                      <label className={`tool-card${checked ? ' selected' : ''}`} key={tool.name}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSelection(setSelectedSoftware, tool.name)}
                        />
                        <span>
                          <span className="tool-name">{lt(tool.name)}</span>
                          <span className="tool-category">{lt(tool.category)}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="lifecycle-card">
              <button type="button" className="collapsible-header" onClick={() => toggleSection('equipment')}>
                <h2>{tt('equipmentRequests')} ({selectedEquipment.length})</h2>
                <span className="accordion-caret">{openSections.equipment ? '−' : '+'}</span>
              </button>
              {openSections.equipment && (
                <div className="tool-grid tool-list collapsible-content">
                  {equipmentOptions.map((item) => {
                    const checked = selectedEquipment.includes(item.name);
                    return (
                      <label className={`tool-card${checked ? ' selected' : ''}`} key={item.name}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSelection(setSelectedEquipment, item.name)}
                        />
                        <span>
                          <span className="tool-name">{lt(item.name)}</span>
                          <span className="tool-category">{lt(item.category)}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="lifecycle-card">
              <button type="button" className="collapsible-header" onClick={() => toggleSection('training')}>
                <h2>{tt('trainingRequests')} ({selectedTraining.length})</h2>
                <span className="accordion-caret">{openSections.training ? '−' : '+'}</span>
              </button>
              {openSections.training && (
                <div className="tool-grid tool-list collapsible-content">
                  {trainingOptions.map((item) => {
                    const checked = selectedTraining.includes(item.name);
                    return (
                      <label className={`tool-card${checked ? ' selected' : ''}`} key={item.name}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSelection(setSelectedTraining, item.name)}
                        />
                        <span>
                          <span className="tool-name">{lt(item.name)}</span>
                          <span className="tool-category">{lt(item.category)}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="lifecycle-card">
              <h2>{tt('notesToIT')}</h2>
              <div className="lifecycle-field" style={{ marginTop: 0 }}>
                <textarea
                  className="lifecycle-textarea"
                  value={form.notes}
                  onChange={(event) => updateField('notes', event.target.value)}
                placeholder={tt('notesToIT')}
              />
              </div>
            </section>

            <section className="lifecycle-card">
              <h2>{tt('emailPreviewIT')}</h2>
              <div className="preview-tabs">
                <button
                  type="button"
                  className={`preview-tab${previewTab === 'it' ? ' active' : ''}`}
                  onClick={() => setPreviewTab('it')}
                >
                  {tt('emailPreviewIT')}
                </button>
                {selectedTraining.length > 0 && (
                  <button
                    type="button"
                    className={`preview-tab${previewTab === 'training' ? ' active' : ''}`}
                    onClick={() => setPreviewTab('training')}
                  >
                    {tt('trainingRequests')}
                  </button>
                )}
              </div>
              <pre className="email-preview">{previewTab === 'training' ? trainingPreview : emailPreview}</pre>
              <p className="lifecycle-card-note">
                {tt('localPreviewNote')} {IT_TEST_EMAIL}
                {selectedTraining.length ? ` / ${TRAINING_CONTACT_EMAIL}` : ''}.
              </p>
              <div className="lifecycle-actions">
                <button className="life-btn ghost" type="button" onClick={resetForm} disabled={sending}>
                  {t('reset')}
                </button>
                <button className="life-btn" type="button" onClick={handleSend} disabled={sending}>
                  {sending ? t('saving') : tt('sendToIT')}
                </button>
              </div>
            </section>
          </div>
        </section>
      </main>
    </div>
  );
};

export default FranceOnboarding;
