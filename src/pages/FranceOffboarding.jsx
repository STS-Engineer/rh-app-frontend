import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { employeesAPI, getCurrentUser, isGlobalHrManager } from '../services/api';
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
        setLookupError(error?.response?.data?.error || error.message || 'Unable to load employees.');
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
      ? selectedLicences.map((licenceName) => `- ${licenceName}`).join('\n')
      : '- No licences selected yet';

    return `To: ${IT_TEST_EMAIL}
Subject: Offboarding — licence cancellation for ${name}

Hello IT team,

Please schedule access and licence cancellation for:

Name: ${name}
Job title: ${form.jobTitle || '[job title]'}
Department: ${form.department}
Last working day: ${form.lastWorkingDay || '[last working day]'}
Reason: ${form.reason}

Licences/access to cancel:
${licenceList}

Extra access to revoke:
${form.revokeNotes || 'No extra access listed.'}

Please confirm completion once the offboarding actions are done.`;
  }, [form, selectedLicences]);

  const surveyPreview = useMemo(() => {
    const name = form.fullName || '[employee name]';
    const questionList = questions.length
      ? questions.map((question, index) => `${index + 1}. ${question.text} (${question.type})`).join('\n')
      : 'No questions configured.';

    return `To: ${form.personalEmail || '[personal email]'}
Subject: We’d love your feedback — exit survey

Hello ${name},

Thank you for your contribution and for the time you spent with us. We would appreciate your feedback through this short exit survey.

Questions:
${questionList}

Your answers help HR improve the employee experience for future team members.

Thank you.`;
  }, [form.fullName, form.personalEmail, questions]);

  return (
    <div className="fr-module-layout">
      <Sidebar />
      <main className="fr-module-content">
        <section className="lifecycle-shell">
          <div className="lifecycle-topbar">
            <div>
              <h1 className="lifecycle-title">Offboarding</h1>
              <p className="lifecycle-subtitle">
                Manage licence cancellation and exit satisfaction survey.
              </p>
            </div>
          </div>

          <div className="lifecycle-stack">
            {success && (
              <div className="life-alert">
                Offboarding emails prepared: IT cancellation for {IT_TEST_EMAIL} and employee survey are ready.
              </div>
            )}

            <section className="lifecycle-card">
              <h2>Leaving employee details</h2>
              {lookupError && <p className="lifecycle-card-note">{lookupError}</p>}
              <div className="lifecycle-grid" style={{ marginBottom: 14 }}>
                {canFilterByPlant && (
                  <div className="lifecycle-field">
                    <label>Plant / site</label>
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
                  </div>
                )}
                <div className="lifecycle-field">
                  <label>Search employee by name or email</label>
                  <input
                    className="lifecycle-input"
                    value={employeeSearch}
                    onChange={(event) => setEmployeeSearch(event.target.value)}
                    placeholder="Type a name, matricule, or email..."
                  />
                </div>
                <div className="lifecycle-field">
                  <label>Select employee</label>
                  <select
                    className="lifecycle-select"
                    value={selectedEmployeeKey}
                    onChange={(event) => selectEmployee(event.target.value)}
                  >
                    <option value="">Select employee...</option>
                    {filteredEmployees.map((employee) => (
                      <option key={getEmployeeKey(employee)} value={getEmployeeKey(employee)}>
                        {getEmployeeName(employee)} — {employee.adresse_mail || 'email missing'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="lifecycle-grid">
                <div className="lifecycle-field">
                  <label>Full name</label>
                  <input
                    className="lifecycle-input"
                    value={form.fullName}
                    onChange={(event) => updateField('fullName', event.target.value)}
                    placeholder="Alex Martin"
                  />
                </div>
                <div className="lifecycle-field">
                  <label>Job title</label>
                  <input
                    className="lifecycle-input"
                    value={form.jobTitle}
                    onChange={(event) => updateField('jobTitle', event.target.value)}
                    placeholder="Product Engineer"
                  />
                </div>
                <div className="lifecycle-field">
                  <label>Department</label>
                  <select
                    className="lifecycle-select"
                    value={form.department}
                    onChange={(event) => updateField('department', event.target.value)}
                  >
                    {departmentOptions.map((department) => (
                      <option key={department} value={department}>
                        {department}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="lifecycle-field">
                  <label>Last working day</label>
                  <input
                    className="lifecycle-input"
                    type="date"
                    value={form.lastWorkingDay}
                    onChange={(event) => updateField('lastWorkingDay', event.target.value)}
                  />
                </div>
                <div className="lifecycle-field">
                  <label>Survey email</label>
                  <input
                    className="lifecycle-input"
                    type="email"
                    value={form.personalEmail}
                    onChange={(event) => updateField('personalEmail', event.target.value)}
                    placeholder="alex.personal@email.com"
                  />
                </div>
                <div className="lifecycle-field">
                  <label>Reason</label>
                  <select
                    className="lifecycle-select"
                    value={form.reason}
                    onChange={(event) => updateField('reason', event.target.value)}
                  >
                    {reasons.map((reason) => (
                      <option key={reason} value={reason}>
                        {reason}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <section className="lifecycle-card">
              <h2>Licences to cancel</h2>
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
                        <span className="tool-name">{licence.name}</span>
                        <span className="tool-category">{licence.category}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
              <div className="lifecycle-field" style={{ marginTop: 14 }}>
                <label>Extra access to revoke</label>
                <textarea
                  className="lifecycle-textarea"
                  value={form.revokeNotes}
                  onChange={(event) => updateField('revokeNotes', event.target.value)}
                  placeholder="Shared folders, admin groups, building badge, special systems..."
                />
              </div>
            </section>

            <section className="lifecycle-card">
              <h2>Satisfaction survey (HR editable)</h2>
              <div className="question-list">
                {questions.map((question, index) => (
                  <div className="question-row" key={question.id}>
                    <span className="question-number">{index + 1}</span>
                    <input
                      className="lifecycle-input"
                      value={question.text}
                      onChange={(event) => updateQuestion(question.id, event.target.value)}
                    />
                    <span className="question-type">{question.type}</span>
                    <button
                      className="delete-question"
                      type="button"
                      onClick={() => deleteQuestion(question.id)}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>

              <div className="inline-form">
                <div className="lifecycle-grid">
                  <div className="lifecycle-field">
                    <label>Add question</label>
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
                    <label>Question type</label>
                    <select
                      className="lifecycle-select"
                      value={newQuestion.type}
                      onChange={(event) =>
                        setNewQuestion((current) => ({ ...current, type: event.target.value }))
                      }
                    >
                      <option value="Open text">Open text</option>
                      <option value="Rating 1–5">Rating 1–5</option>
                      <option value="Yes/No">Yes/No</option>
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
                    Add question
                  </button>
                </div>
              </div>
            </section>

            <section className="lifecycle-card">
              <h2>Email previews</h2>
              <div className="preview-tabs">
                <button
                  className={`preview-tab${previewTab === 'it' ? ' active' : ''}`}
                  type="button"
                  onClick={() => setPreviewTab('it')}
                >
                  IT cancellation
                </button>
                <button
                  className={`preview-tab${previewTab === 'survey' ? ' active' : ''}`}
                  type="button"
                  onClick={() => setPreviewTab('survey')}
                >
                  Survey to employee
                </button>
              </div>
              <pre className="email-preview">{previewTab === 'it' ? itPreview : surveyPreview}</pre>
              <div className="lifecycle-actions">
                <button className="life-btn ghost" type="button" onClick={resetForm}>
                  Reset
                </button>
                <button className="life-btn danger" type="button" onClick={() => setSuccess(true)}>
                  Send both emails
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
