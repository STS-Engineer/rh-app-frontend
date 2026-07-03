import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { employeesAPI, getCurrentUser, isGlobalHrManager } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
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

const localLabels = {
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

const allLicenceNames = licences.map((licence) => licence.name);

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
  const canFilterByPlant = isGlobalHrManager(getCurrentUser());
  const [employees, setEmployees] = useState([]);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [plantFilter, setPlantFilter] = useState('');
  const [selectedEmployeeKey, setSelectedEmployeeKey] = useState('');
  const [form, setForm] = useState(initialForm);
  const [selectedLicences, setSelectedLicences] = useState(allLicenceNames);
  const [questions, setQuestions] = useState(initialQuestions);
  const [newQuestion, setNewQuestion] = useState({ text: '', type: 'Open text' });
  const [previewTab, setPreviewTab] = useState('it');
  const [success, setSuccess] = useState(false);
  const [lookupError, setLookupError] = useState('');

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const response = await employeesAPI.getAll();
        setEmployees(response.data || []);
      } catch (error) {
        setLookupError(error?.response?.data?.error || error.message || t('errorLoadingEmployees') || 'Unable to load employees.');
      }
    };

    loadEmployees();
  }, []);

  const filteredEmployees = useMemo(() => {
    const query = employeeSearch.trim().toLowerCase();
    const scopedEmployees = canFilterByPlant && plantFilter
      ? employees.filter((employee) => getEmployeeDepartment(employee) === plantFilter)
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
      Array.from(new Set(employees.map((employee) => getEmployeeDepartment(employee)).filter(Boolean))).sort((a, b) =>
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
    setSelectedLicences(allLicenceNames);
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

    return `To: ${IT_TEST_EMAIL}
Subject: ${t('offboarding')} — ${t('licencesToCancel')} for ${name}

${t('notesToIT')},

${t('manageLicenceCancellation')}

Name: ${name}
${t('position')}: ${form.jobTitle || '[job title]'}
${t('department')}: ${lt(form.department)}
${t('lastWorkingDay')}: ${form.lastWorkingDay || '[last working day]'}
${t('reason')}: ${lt(form.reason)}

${t('licencesToCancel')}:
${licenceList}

${t('extraAccessToRevoke')}:
${form.revokeNotes || lt('No extra access listed.')}

${t('sendToIT')}.`;
  }, [form, selectedLicences]);

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
              <h1 className="lifecycle-title">{t('offboarding')}</h1>
              <p className="lifecycle-subtitle">
                {t('manageLicenceCancellation') || 'Manage licence cancellation and exit satisfaction survey.'}
              </p>
            </div>
          </div>

          <div className="lifecycle-stack">
            {success && (
              <div className="life-alert">
                {lt('Offboarding emails prepared')}: {t('itCancellation')} {IT_TEST_EMAIL} / {t('surveyToEmployee')}.
              </div>
            )}

            <section className="lifecycle-card">
              <h2>{t('leavingEmployeeDetails') || 'Leaving employee details'}</h2>
              {lookupError && <p className="lifecycle-card-note">{lookupError}</p>}
              <div className="lifecycle-grid" style={{ marginBottom: 14 }}>
                {canFilterByPlant && (
                  <div className="lifecycle-field">
                    <label>{t('plantSite') || 'Plant / site'}</label>
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
                  <label>{t('searchEmployeeOrEmail')}</label>
                  <input
                    className="lifecycle-input"
                    value={employeeSearch}
                    onChange={(event) => setEmployeeSearch(event.target.value)}
                    placeholder={t('searchEmployeeOrEmailPlaceholder')}
                  />
                </div>
                <div className="lifecycle-field">
                  <label>{t('selectEmployee') || 'Select employee'}</label>
                  <select
                    className="lifecycle-select"
                    value={selectedEmployeeKey}
                    onChange={(event) => selectEmployee(event.target.value)}
                  >
                    <option value="">{t('selectEmployee') || 'Select employee...'}</option>
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
                  <label>{t('lastWorkingDay')}</label>
                  <input
                    className="lifecycle-input"
                    type="date"
                    value={form.lastWorkingDay}
                    onChange={(event) => updateField('lastWorkingDay', event.target.value)}
                  />
                </div>
                <div className="lifecycle-field">
                  <label>{t('surveyEmail')}</label>
                  <input
                    className="lifecycle-input"
                    type="email"
                    value={form.personalEmail}
                    onChange={(event) => updateField('personalEmail', event.target.value)}
                    placeholder="alex.personal@email.com"
                  />
                </div>
                <div className="lifecycle-field">
                  <label>{t('reason')}</label>
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
              <h2>{t('licencesToCancel') || 'Licences to cancel'}</h2>
              <div className="tool-grid">
                {licences.map((licence) => {
                  const checked = selectedLicences.includes(licence.name);
                  return (
                    <label
                      className={`tool-card danger${checked ? ' selected' : ''}`}
                      key={licence.name}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleLicence(licence.name)}
                      />
                      <span>
                        <span className="tool-name">{lt(licence.name)}</span>
                        <span className="tool-category">{lt(licence.category)}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
              <div className="lifecycle-field" style={{ marginTop: 14 }}>
                <label>{t('extraAccessToRevoke') || 'Extra access to revoke'}</label>
                <textarea
                  className="lifecycle-textarea"
                  value={form.revokeNotes}
                  onChange={(event) => updateField('revokeNotes', event.target.value)}
                  placeholder={t('extraAccessToRevoke')}
                />
              </div>
            </section>

            <section className="lifecycle-card">
              <h2>{t('satisfactionSurvey') || 'Satisfaction survey (HR editable)'}</h2>
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
                    <label>{t('addQuestion')}</label>
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
                    <label>{t('questionType')}</label>
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
                    {t('addQuestion')}
                  </button>
                </div>
              </div>
            </section>

            <section className="lifecycle-card">
              <h2>{t('emailPreviews')}</h2>
              <div className="preview-tabs">
                <button
                  className={`preview-tab${previewTab === 'it' ? ' active' : ''}`}
                  type="button"
                  onClick={() => setPreviewTab('it')}
                >
                  {t('itCancellation')}
                </button>
                <button
                  className={`preview-tab${previewTab === 'survey' ? ' active' : ''}`}
                  type="button"
                  onClick={() => setPreviewTab('survey')}
                >
                  {t('surveyToEmployee')}
                </button>
              </div>
              <pre className="email-preview">{previewTab === 'it' ? itPreview : surveyPreview}</pre>
              <div className="lifecycle-actions">
                <button className="life-btn ghost" type="button" onClick={resetForm}>
                  {t('reset')}
                </button>
                <button className="life-btn danger" type="button" onClick={() => setSuccess(true)}>
                  {t('sendBothEmails')}
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
