import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar';
import MultiSelectDropdown from '../components/MultiSelectDropdown';
import { employeesAPI, getCurrentUser, isGlobalHrManager } from '../services/api';
import { getEmployeeSite } from '../utils/employeeProfile';
import { useLanguage } from '../contexts/LanguageContext';
import { useSiteFilter } from '../contexts/SiteFilterContext';
import './FranceModules.css';

const IT_TEST_EMAIL = 'rami.mejri@avocarbon.com';
const departments = ['Engineering', 'Design', 'Product', 'HR', 'Finance'];
const reasons = ['Resignation', 'End of contract', 'Retirement', 'Redundancy', 'Dismissal'];

const licences = [
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
    Resignation: '사직',
    'End of contract': '계약 종료',
    Retirement: '퇴직',
    Redundancy: '감원',
    Dismissal: '해고',
    'Open text': '서술형',
    'Rating 1-5': '평점 1-5',
    'Rating 1–5': '평점 1-5',
    'Rating 1â€“5': '평점 1-5',
    'Yes/No': '예/아니오',
    'What made you decide to leave?': '퇴사를 결정한 이유는 무엇인가요?',
    'How would you rate your overall experience?': '전반적인 경험을 어떻게 평가하시겠습니까?',
    'Did you feel supported by your manager?': '관리자의 지원을 충분히 받았다고 느끼셨나요?',
    'What should we improve for future employees?': '향후 직원을 위해 무엇을 개선해야 할까요?',
    'Would you recommend the company as a workplace?': '이 회사를 일하기 좋은 곳으로 추천하시겠습니까?',
    'What would have made your experience better?': '어떤 점이 있었다면 더 나은 경험이 되었을까요?',
    'All plants': '모든 사이트',
    'Email missing': '이메일 없음',
    'No extra access listed.': '추가 회수 권한이 없습니다.',
    'No questions configured.': '설정된 질문이 없습니다.',
    'We would love your feedback': '귀하의 의견을 듣고 싶습니다',
    'Exit survey': '퇴사 설문',
    'Hello': '안녕하세요',
    'Questions': '질문',
    'Thank you.': '감사합니다.',
    'Survey intro': '함께해 주셔서 감사합니다. 짧은 퇴사 설문을 통해 의견을 들려주세요.',
    'Survey footer': '귀하의 답변은 앞으로 직원 경험을 개선하는 데 도움이 됩니다.',
    'Offboarding emails prepared': '오프보딩 이메일이 준비되었습니다',
    'Product Engineer': '제품 엔지니어'
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
    Resignation: 'Kündigung',
    'End of contract': 'Vertragsende',
    Retirement: 'Ruhestand',
    Redundancy: 'Stellenabbau',
    Dismissal: 'Entlassung',
    'Open text': 'Freitext',
    'Rating 1-5': 'Bewertung 1-5',
    'Rating 1–5': 'Bewertung 1-5',
    'Rating 1â€“5': 'Bewertung 1-5',
    'Yes/No': 'Ja/Nein',
    'What made you decide to leave?': 'Warum haben Sie sich entschieden zu gehen?',
    'How would you rate your overall experience?': 'Wie bewerten Sie Ihre Gesamterfahrung?',
    'Did you feel supported by your manager?': 'Haben Sie sich von Ihrer Führungskraft unterstützt gefühlt?',
    'What should we improve for future employees?': 'Was sollten wir für zukünftige Mitarbeitende verbessern?',
    'Would you recommend the company as a workplace?': 'Würden Sie das Unternehmen als Arbeitsplatz empfehlen?',
    'What would have made your experience better?': 'Was hätte Ihre Erfahrung verbessern können?',
    'All plants': 'Alle Standorte',
    'Email missing': 'E-Mail fehlt',
    'No extra access listed.': 'Kein zusätzlicher Zugriff aufgeführt.',
    'No questions configured.': 'Keine Fragen konfiguriert.',
    'We would love your feedback': 'Wir würden uns über Ihr Feedback freuen',
    'Exit survey': 'Austrittsumfrage',
    'Hello': 'Hallo',
    'Questions': 'Fragen',
    'Thank you.': 'Danke.',
    'Survey intro': 'Vielen Dank für Ihre Zeit bei uns. Bitte teilen Sie uns Ihr Feedback in dieser kurzen Austrittsumfrage mit.',
    'Survey footer': 'Ihre Antworten helfen HR, die Mitarbeitererfahrung für zukünftige Teammitglieder zu verbessern.',
    'Offboarding emails prepared': 'Offboarding-E-Mails vorbereitet',
    'Product Engineer': 'Produktingenieur'
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
    Resignation: 'Renuncia',
    'End of contract': 'Fin de contrato',
    Retirement: 'Jubilación',
    Redundancy: 'Redundancia',
    Dismissal: 'Despido',
    'Open text': 'Texto libre',
    'Rating 1-5': 'Puntuación 1-5',
    'Rating 1–5': 'Puntuación 1-5',
    'Rating 1â€“5': 'Puntuación 1-5',
    'Yes/No': 'Sí/No',
    'What made you decide to leave?': '¿Qué le hizo decidirse a irse?',
    'How would you rate your overall experience?': '¿Cómo calificaría su experiencia general?',
    'Did you feel supported by your manager?': '¿Se sintió apoyado por su gerente?',
    'What should we improve for future employees?': '¿Qué deberíamos mejorar para futuros empleados?',
    'Would you recommend the company as a workplace?': '¿Recomendaría la empresa como lugar de trabajo?',
    'What would have made your experience better?': '¿Qué habría hecho mejor su experiencia?',
    'All plants': 'Todos los centros',
    'Email missing': 'Correo faltante',
    'No extra access listed.': 'No hay accesos adicionales indicados.',
    'No questions configured.': 'No hay preguntas configuradas.',
    'We would love your feedback': 'Nos encantaría conocer su opinión',
    'Exit survey': 'Encuesta de salida',
    'Hello': 'Hola',
    'Questions': 'Preguntas',
    'Thank you.': 'Gracias.',
    'Survey intro': 'Gracias por el tiempo compartido con nosotros. Queremos conocer su opinión en esta breve encuesta de salida.',
    'Survey footer': 'Sus respuestas ayudarán a RR. HH. a mejorar la experiencia de futuros colaboradores.',
    'Offboarding emails prepared': 'Correos de salida preparados',
    'Product Engineer': 'Ingeniero de producto'
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
    Resignation: '辞职',
    'End of contract': '合同结束',
    Retirement: '退休',
    Redundancy: '裁员',
    Dismissal: '解雇',
    'Open text': '开放文本',
    'Rating 1-5': '评分 1-5',
    'Rating 1–5': '评分 1-5',
    'Rating 1â€“5': '评分 1-5',
    'Yes/No': '是/否',
    'What made you decide to leave?': '是什么让您决定离开？',
    'How would you rate your overall experience?': '您如何评价整体体验？',
    'Did you feel supported by your manager?': '您觉得得到了经理的支持吗？',
    'What should we improve for future employees?': '我们应为未来员工改进什么？',
    'Would you recommend the company as a workplace?': '您会推荐这家公司作为工作场所吗？',
    'What would have made your experience better?': '什么能让您的体验更好？',
    'All plants': '所有站点',
    'Email missing': '缺少邮箱',
    'No extra access listed.': '未列出额外访问权限。',
    'No questions configured.': '未配置问题。',
    'We would love your feedback': '我们很希望听到您的反馈',
    'Exit survey': '离职调查',
    'Hello': '您好',
    'Questions': '问题',
    'Thank you.': '谢谢。',
    'Survey intro': '感谢您与我们共事。希望您通过这份简短的离职调查分享反馈。',
    'Survey footer': '您的回答将帮助人力资源改进未来员工的体验。',
    'Offboarding emails prepared': '离职邮件已准备好',
    'Product Engineer': '产品工程师'
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
    Resignation: 'ராஜினாமா',
    'End of contract': 'ஒப்பந்த முடிவு',
    Retirement: 'ஓய்வு',
    Redundancy: 'பணியிடம் நீக்கம்',
    Dismissal: 'பணி நீக்கம்',
    'Open text': 'திறந்த உரை',
    'Rating 1-5': '1-5 மதிப்பீடு',
    'Rating 1–5': '1-5 மதிப்பீடு',
    'Yes/No': 'ஆம்/இல்லை',
    'What made you decide to leave?': 'நீங்கள் விலக முடிவு செய்ய காரணம் என்ன?',
    'How would you rate your overall experience?': 'உங்கள் மொத்த அனுபவத்தை எப்படி மதிப்பிடுவீர்கள்?',
    'Did you feel supported by your manager?': 'உங்கள் மேலாளரின் ஆதரவு கிடைத்ததாக உணர்ந்தீர்களா?',
    'What should we improve for future employees?': 'எதிர்கால பணியாளர்களுக்காக எதை மேம்படுத்த வேண்டும்?',
    'Would you recommend the company as a workplace?': 'இந்த நிறுவனத்தை பணியிடமாக பரிந்துரைப்பீர்களா?',
    'What would have made your experience better?': 'உங்கள் அனுபவத்தை மேம்படுத்த என்ன உதவியிருக்கும்?',
    'All plants': 'அனைத்து தளங்களும்',
    'Email missing': 'மின்னஞ்சல் இல்லை',
    'No extra access listed.': 'கூடுதல் அணுகல் குறிப்பிடப்படவில்லை.',
    'No questions configured.': 'கேள்விகள் அமைக்கப்படவில்லை.',
    'We would love your feedback': 'உங்கள் கருத்தை அறிய விரும்புகிறோம்',
    'Exit survey': 'விடைபெறும் கணக்கெடுப்பு',
    'Hello': 'வணக்கம்',
    'Questions': 'கேள்விகள்',
    'Thank you.': 'நன்றி.',
    'Survey intro': 'உங்கள் பங்களிப்புக்கும் எங்களுடன் செலவிட்ட நேரத்திற்கும் நன்றி. இந்த குறுகிய வெளியேறும் கணக்கெடுப்பின் மூலம் உங்கள் கருத்தை அறிய விரும்புகிறோம்.',
    'Survey footer': 'உங்கள் பதில்கள் எதிர்கால குழு உறுப்பினர்களுக்கான பணியாளர் அனுபவத்தை மேம்படுத்த HR-க்கு உதவும்.',
    'Offboarding emails prepared': 'விடைபெறும் மின்னஞ்சல்கள் தயாராக உள்ளன'
  }
};

const pageText = {
  ko: {
    offboarding: '오프보딩',
    manageLicenceCancellation: '라이선스 해지와 퇴사 만족도 설문을 관리합니다.',
    leavingEmployeeDetails: '퇴사 예정 직원 정보',
    plantSite: '사이트 / 공장',
    selectEmployee: '직원 선택',
    searchEmployeeOrEmail: '이름 또는 이메일로 직원 검색',
    searchEmployeeOrEmailPlaceholder: '이름, 사번 또는 이메일을 입력하세요...',
    lastWorkingDay: '마지막 근무일',
    surveyEmail: '설문 이메일',
    reason: '사유',
    licencesToCancel: '해지할 라이선스',
    equipmentToReturn: '반납할 장비',
    extraAccessToRevoke: '회수할 추가 접근 권한',
    satisfactionSurvey: '만족도 설문 (HR 수정 가능)',
    addQuestion: '질문 추가',
    questionType: '질문 유형',
    emailPreviews: '이메일 미리보기',
    itCancellation: 'IT 해지',
    surveyToEmployee: '직원 설문',
    sendBothEmails: '두 이메일 보내기'
  },
  de: {
    offboarding: 'Austritt',
    manageLicenceCancellation: 'Lizenzkündigungen und Austrittszufriedenheitsumfrage verwalten.',
    leavingEmployeeDetails: 'Details des austretenden Mitarbeiters',
    plantSite: 'Standort / Werk',
    selectEmployee: 'Mitarbeiter auswählen',
    searchEmployeeOrEmail: 'Mitarbeiter nach Name oder E-Mail suchen',
    searchEmployeeOrEmailPlaceholder: 'Name, Personalnummer oder E-Mail eingeben...',
    lastWorkingDay: 'Letzter Arbeitstag',
    surveyEmail: 'Umfrage-E-Mail',
    reason: 'Grund',
    licencesToCancel: 'Zu kündigende Lizenzen',
    equipmentToReturn: 'Zurückzugebende Ausrüstung',
    extraAccessToRevoke: 'Zusätzliche Zugriffe widerrufen',
    satisfactionSurvey: 'Zufriedenheitsumfrage (von HR bearbeitbar)',
    addQuestion: 'Frage hinzufügen',
    questionType: 'Fragetyp',
    emailPreviews: 'E-Mail-Vorschauen',
    itCancellation: 'IT-Kündigung',
    surveyToEmployee: 'Umfrage an Mitarbeiter',
    sendBothEmails: 'Beide E-Mails senden'
  },
  es: {
    offboarding: 'Salida de empleado',
    manageLicenceCancellation: 'Gestionar la cancelación de licencias y la encuesta de salida.',
    leavingEmployeeDetails: 'Detalles del empleado saliente',
    plantSite: 'Centro / planta',
    selectEmployee: 'Seleccionar empleado',
    searchEmployeeOrEmail: 'Buscar empleado por nombre o correo',
    searchEmployeeOrEmailPlaceholder: 'Escriba un nombre, matrícula o correo...',
    lastWorkingDay: 'Último día laborable',
    surveyEmail: 'Correo de la encuesta',
    reason: 'Motivo',
    licencesToCancel: 'Licencias por cancelar',
    equipmentToReturn: 'Equipo por devolver',
    extraAccessToRevoke: 'Accesos adicionales por revocar',
    satisfactionSurvey: 'Encuesta de satisfacción (editable por RR. HH.)',
    addQuestion: 'Añadir pregunta',
    questionType: 'Tipo de pregunta',
    emailPreviews: 'Vistas previas del correo',
    itCancellation: 'Cancelación IT',
    surveyToEmployee: 'Encuesta al empleado',
    sendBothEmails: 'Enviar ambos correos'
  },
  zh: {
    offboarding: '离职',
    manageLicenceCancellation: '管理许可证取消和离职满意度调查。',
    leavingEmployeeDetails: '离职员工详情',
    plantSite: '站点 / 工厂',
    selectEmployee: '选择员工',
    searchEmployeeOrEmail: '按姓名或邮箱搜索员工',
    searchEmployeeOrEmailPlaceholder: '输入姓名、工号或邮箱...',
    lastWorkingDay: '最后工作日',
    surveyEmail: '调查邮箱',
    reason: '原因',
    licencesToCancel: '需取消的许可证',
    equipmentToReturn: '需归还的设备',
    extraAccessToRevoke: '需撤销的额外访问权限',
    satisfactionSurvey: '满意度调查（HR 可编辑）',
    addQuestion: '添加问题',
    questionType: '问题类型',
    emailPreviews: '邮件预览',
    itCancellation: 'IT 取消',
    surveyToEmployee: '发送给员工的调查',
    sendBothEmails: '发送两封邮件'
  }
};

const allLicenceNames = licences.map((licence) => licence.name);
const allEquipmentNames = equipmentOptions.map((item) => item.name);

const initialForm = {
  fullName: '',
  jobTitle: '',
  department: departments[0],
  lastWorkingDay: '',
  personalEmail: '',
  reason: reasons[0],
  revokeNotes: ''
};

const initialQuestions = [
  { id: 'q1', text: 'What made you decide to leave?', type: 'Open text' },
  { id: 'q2', text: 'How would you rate your overall experience?', type: 'Rating 1–5' },
  { id: 'q3', text: 'Did you feel supported by your manager?', type: 'Yes/No' },
  { id: 'q4', text: 'What should we improve for future employees?', type: 'Open text' },
  { id: 'q5', text: 'Would you recommend the company as a workplace?', type: 'Yes/No' }
];

const getEmployeeKey = (employee) => `${employee.tenant_schema || 'public'}-${employee.id}`;
const getEmployeeName = (employee) =>
  `${employee.prenom || ''} ${employee.nom || ''}`.trim() || employee.name || 'Unnamed employee';
const getEmployeeDepartment = (employee) =>
  employee.site_dep || employee.departement || employee.department || departments[0];

const FranceOffboarding = () => {
  const { t, language } = useLanguage();
  const lt = (value) => localLabels[language]?.[value] || value;
  const tt = (key) => pageText[language]?.[key] || t(key);
  const canFilterByPlant = isGlobalHrManager(getCurrentUser());
  const [employees, setEmployees] = useState([]);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const { siteFilter: plantFilter, setSiteFilter: setPlantFilter } = useSiteFilter();
  const [selectedEmployeeKey, setSelectedEmployeeKey] = useState('');
  const [form, setForm] = useState(initialForm);
  const [selectedLicences, setSelectedLicences] = useState([]);
  const [selectedEquipment, setSelectedEquipment] = useState([]);
  const [questions, setQuestions] = useState(initialQuestions);
  const [newQuestion, setNewQuestion] = useState({ text: '', type: 'Open text' });
  const [previewTab, setPreviewTab] = useState('it');
  const [success, setSuccess] = useState(false);
  const [lookupError, setLookupError] = useState('');

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const response = await employeesAPI.getAll();
        // Offboarding doesn't apply to Tunisia (no offboarding_records table
        // there, and the backend rejects it) -- keep those employees out of
        // this page entirely.
        setEmployees((response.data || []).filter((employee) => employee.tenant_schema !== 'public'));
      } catch (error) {
        setLookupError(error?.response?.data?.error || error.message || t('errorLoadingEmployees') || 'Unable to load employees.');
      }
    };

    loadEmployees();
  }, []);

  const filteredEmployees = useMemo(() => {
    const query = employeeSearch.trim().toLowerCase();
    const scopedEmployees = canFilterByPlant && plantFilter
      ? employees.filter((employee) => getEmployeeSite(employee) === plantFilter)
      : employees;

    if (!query) return scopedEmployees.slice(0, 30);

    return scopedEmployees
      .filter((employee) =>
        [
          getEmployeeName(employee),
          employee.adresse_mail,
          employee.matricule,
          employee.poste,
          getEmployeeDepartment(employee)
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(query)
      )
      .slice(0, 30);
  }, [employees, employeeSearch, plantFilter, canFilterByPlant]);

  const plantOptions = useMemo(
    () =>
      Array.from(new Set(employees.map((employee) => getEmployeeSite(employee)).filter(Boolean))).sort((a, b) =>
        String(a).localeCompare(String(b))
      ),
    [employees]
  );

  const departmentOptions = useMemo(
    () =>
      Array.from(
        new Set([...departments, ...employees.map((employee) => getEmployeeDepartment(employee)).filter(Boolean)])
      ),
    [employees]
  );

  const updateField = (field, value) => {
    setSuccess(false);
    setForm((current) => ({ ...current, [field]: value }));
  };

  const selectEmployee = (employeeKey) => {
    setSelectedEmployeeKey(employeeKey);
    setSuccess(false);

    const employee = employees.find((item) => getEmployeeKey(item) === employeeKey);
    if (!employee) return;

    const department = getEmployeeDepartment(employee);
    setForm((current) => ({
      ...current,
      fullName: getEmployeeName(employee),
      jobTitle: employee.poste || current.jobTitle,
      department,
      personalEmail: employee.adresse_mail || current.personalEmail
    }));
  };

  const toggleLicence = (licenceName) => {
    setSuccess(false);
    setSelectedLicences((current) =>
      current.includes(licenceName)
        ? current.filter((name) => name !== licenceName)
        : [...current, licenceName]
    );
  };

  const toggleEquipment = (itemName) => {
    setSuccess(false);
    setSelectedEquipment((current) =>
      current.includes(itemName)
        ? current.filter((name) => name !== itemName)
        : [...current, itemName]
    );
  };

  const updateQuestion = (questionId, text) => {
    setSuccess(false);
    setQuestions((current) =>
      current.map((question) => (question.id === questionId ? { ...question, text } : question))
    );
  };

  const deleteQuestion = (questionId) => {
    setSuccess(false);
    setQuestions((current) => current.filter((question) => question.id !== questionId));
  };

  const addQuestion = () => {
    const text = newQuestion.text.trim();
    if (!text) return;

    setQuestions((current) => [
      ...current,
      {
        id: `q${Date.now()}`,
        text,
        type: newQuestion.type
      }
    ]);
    setNewQuestion({ text: '', type: 'Open text' });
    setSuccess(false);
  };

  const resetForm = () => {
    setForm(initialForm);
    setSelectedEmployeeKey('');
    setEmployeeSearch('');
    setSelectedLicences([]);
    setSelectedEquipment([]);
    setQuestions(initialQuestions);
    setNewQuestion({ text: '', type: 'Open text' });
    setPreviewTab('it');
    setSuccess(false);
  };

  const itPreview = useMemo(() => {
    const name = form.fullName || '[employee name]';
    const licenceList = selectedLicences.length
      ? selectedLicences.map((licenceName) => `- ${lt(licenceName)}`).join('\n')
      : `- ${t('none')}`;
    const equipmentList = selectedEquipment.length
      ? selectedEquipment.map((itemName) => `- ${lt(itemName)}`).join('\n')
      : `- ${t('none')}`;

    return `To: ${IT_TEST_EMAIL}
Subject: ${tt('offboarding')} — ${tt('licencesToCancel')} for ${name}

${t('notesToIT')},

${tt('manageLicenceCancellation')}

Name: ${name}
${t('position')}: ${form.jobTitle || '[job title]'}
${t('department')}: ${lt(form.department)}
${tt('lastWorkingDay')}: ${form.lastWorkingDay || '[last working day]'}
${tt('reason')}: ${lt(form.reason)}

${tt('licencesToCancel')}:
${licenceList}

${tt('equipmentToReturn')}:
${equipmentList}

${tt('extraAccessToRevoke')}:
${form.revokeNotes || lt('No extra access listed.')}

${t('sendToIT')}.`;
  }, [form, selectedLicences, selectedEquipment]);

  const surveyPreview = useMemo(() => {
    const name = form.fullName || '[employee name]';
    const questionList = questions.length
      ? questions.map((question, index) => `${index + 1}. ${lt(question.text)} (${lt(question.type)})`).join('\n')
      : lt('No questions configured.');

    return `To: ${form.personalEmail || '[personal email]'}
Subject: ${lt('We would love your feedback')} - ${lt('Exit survey')}

${lt('Hello')} ${name},

${lt('Survey intro')}

${lt('Questions')}:
${questionList}

${lt('Survey footer')}

${lt('Thank you.')}`;
  }, [form.fullName, form.personalEmail, questions, language]);

  return (
    <div className="fr-module-layout">
      <Sidebar />
      <main className="fr-module-content">
        <section className="lifecycle-shell">
          <div className="lifecycle-topbar">
            <div>
              <h1 className="lifecycle-title">{tt('offboarding')}</h1>
              <p className="lifecycle-subtitle">
                {tt('manageLicenceCancellation')}
              </p>
            </div>
          </div>

          <div className="lifecycle-stack">
            {success && (
              <div className="life-alert">
                {lt('Offboarding emails prepared')}: {tt('itCancellation')} {IT_TEST_EMAIL} / {tt('surveyToEmployee')}.
              </div>
            )}

            <section className="lifecycle-card">
              <h2>{tt('leavingEmployeeDetails')}</h2>
              {lookupError && <p className="lifecycle-card-note">{lookupError}</p>}
              <div className="lifecycle-grid" style={{ marginBottom: 14 }}>
                {canFilterByPlant && (
                  <div className="lifecycle-field">
                    <label>{tt('plantSite')}</label>
                    <select
                      className="lifecycle-select"
                      value={plantFilter}
                      onChange={(event) => setPlantFilter(event.target.value)}
                    >
                      <option value="">{lt('All plants')}</option>
                      {plantOptions.map((plant) => (
                        <option key={plant} value={plant}>
                          {plant}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="lifecycle-field">
                  <label>{tt('searchEmployeeOrEmail')}</label>
                  <input
                    className="lifecycle-input"
                    value={employeeSearch}
                    onChange={(event) => setEmployeeSearch(event.target.value)}
                    placeholder={tt('searchEmployeeOrEmailPlaceholder')}
                  />
                </div>
                <div className="lifecycle-field">
                  <label>{tt('selectEmployee')}</label>
                  <select
                    className="lifecycle-select"
                    value={selectedEmployeeKey}
                    onChange={(event) => selectEmployee(event.target.value)}
                  >
                    <option value="">{tt('selectEmployee')}</option>
                    {filteredEmployees.map((employee) => (
                      <option key={getEmployeeKey(employee)} value={getEmployeeKey(employee)}>
                        {getEmployeeName(employee)} — {employee.adresse_mail || lt('Email missing')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="lifecycle-grid">
                <div className="lifecycle-field">
                  <label>{t('fullName')}</label>
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
                    {departmentOptions.map((department) => (
                      <option key={department} value={department}>
                        {lt(department)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="lifecycle-field">
                  <label>{tt('lastWorkingDay')}</label>
                  <input
                    className="lifecycle-input"
                    type="date"
                    value={form.lastWorkingDay}
                    onChange={(event) => updateField('lastWorkingDay', event.target.value)}
                  />
                </div>
                <div className="lifecycle-field">
                  <label>{tt('surveyEmail')}</label>
                  <input
                    className="lifecycle-input"
                    type="email"
                    value={form.personalEmail}
                    onChange={(event) => updateField('personalEmail', event.target.value)}
                    placeholder="alex.personal@email.com"
                  />
                </div>
                <div className="lifecycle-field">
                  <label>{tt('reason')}</label>
                  <select
                    className="lifecycle-select"
                    value={form.reason}
                    onChange={(event) => updateField('reason', event.target.value)}
                  >
                    {reasons.map((reason) => (
                      <option key={reason} value={reason}>
                        {lt(reason)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <section className="lifecycle-card">
              <h2>{tt('licencesToCancel')}</h2>
              <MultiSelectDropdown
                label={tt('licencesToCancel')}
                options={licences}
                selected={selectedLicences}
                onToggle={toggleLicence}
                lt={lt}
                danger
              />
              <div className="lifecycle-field" style={{ marginTop: 14 }}>
                <label>{tt('extraAccessToRevoke')}</label>
                <textarea
                  className="lifecycle-textarea"
                  value={form.revokeNotes}
                  onChange={(event) => updateField('revokeNotes', event.target.value)}
                  placeholder={tt('extraAccessToRevoke')}
                />
              </div>
            </section>

            <section className="lifecycle-card">
              <h2>{tt('equipmentToReturn')}</h2>
              <MultiSelectDropdown
                label={tt('equipmentToReturn')}
                options={equipmentOptions}
                selected={selectedEquipment}
                onToggle={toggleEquipment}
                lt={lt}
                danger
              />
            </section>

            <section className="lifecycle-card">
              <h2>{tt('satisfactionSurvey')}</h2>
              <div className="question-list">
                {questions.map((question, index) => (
                  <div className="question-row" key={question.id}>
                    <span className="question-number">{index + 1}</span>
                    <input
                      className="lifecycle-input"
                      value={lt(question.text)}
                      onChange={(event) => updateQuestion(question.id, event.target.value)}
                    />
                    <span className="question-type">{question.type}</span>
                    <button
                      className="delete-question"
                      type="button"
                      onClick={() => deleteQuestion(question.id)}
                    >
                      {t('remove')}
                    </button>
                  </div>
                ))}
              </div>

              <div className="inline-form">
                <div className="lifecycle-grid">
                  <div className="lifecycle-field">
                    <label>{tt('addQuestion')}</label>
                    <input
                      className="lifecycle-input"
                      value={newQuestion.text}
                      onChange={(event) =>
                        setNewQuestion((current) => ({ ...current, text: event.target.value }))
                      }
                      placeholder="What would have made your experience better?"
                    />
                  </div>
                  <div className="lifecycle-field">
                    <label>{tt('questionType')}</label>
                    <select
                      className="lifecycle-select"
                      value={newQuestion.type}
                      onChange={(event) =>
                        setNewQuestion((current) => ({ ...current, type: event.target.value }))
                      }
                    >
                      <option value="Open text">{lt('Open text')}</option>
                      <option value="Rating 1–5">{lt('Rating 1–5')}</option>
                      <option value="Yes/No">{lt('Yes/No')}</option>
                    </select>
                  </div>
                </div>
                <div className="lifecycle-actions">
                  <button
                    className="life-btn danger"
                    type="button"
                    disabled={!newQuestion.text.trim()}
                    onClick={addQuestion}
                  >
                    {tt('addQuestion')}
                  </button>
                </div>
              </div>
            </section>

            <section className="lifecycle-card">
              <h2>{tt('emailPreviews')}</h2>
              <div className="preview-tabs">
                <button
                  className={`preview-tab${previewTab === 'it' ? ' active' : ''}`}
                  type="button"
                  onClick={() => setPreviewTab('it')}
                >
                  {tt('itCancellation')}
                </button>
                <button
                  className={`preview-tab${previewTab === 'survey' ? ' active' : ''}`}
                  type="button"
                  onClick={() => setPreviewTab('survey')}
                >
                  {tt('surveyToEmployee')}
                </button>
              </div>
              <pre className="email-preview">{previewTab === 'it' ? itPreview : surveyPreview}</pre>
              <div className="lifecycle-actions">
                <button className="life-btn ghost" type="button" onClick={resetForm}>
                  {t('reset')}
                </button>
                <button className="life-btn danger" type="button" onClick={() => setSuccess(true)}>
                  {tt('sendBothEmails')}
                </button>
              </div>
            </section>
          </div>
        </section>
      </main>
    </div>
  );
};

export default FranceOffboarding;
