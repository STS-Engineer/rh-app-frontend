import React, { useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar';
import './FranceModules.css';

const departments = ['Engineering', 'Design', 'Product', 'HR', 'Finance'];
const IT_TEST_EMAIL = 'rami.mejri@avocarbon.com';

const tools = [
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

const initialForm = {
  fullName: '',
  jobTitle: '',
  department: departments[0],
  startDate: '',
  workEmail: '',
  managerName: '',
  notes: ''
};

const allToolNames = tools.map((tool) => tool.name);

const FranceOnboarding = () => {
  const [form, setForm] = useState(initialForm);
  const [selectedTools, setSelectedTools] = useState(allToolNames);
  const [success, setSuccess] = useState(false);

  const updateField = (field, value) => {
    setSuccess(false);
    setForm((current) => ({ ...current, [field]: value }));
  };

  const toggleTool = (toolName) => {
    setSuccess(false);
    setSelectedTools((current) =>
      current.includes(toolName) ? current.filter((name) => name !== toolName) : [...current, toolName]
    );
  };

  const resetForm = () => {
    setForm(initialForm);
    setSelectedTools(allToolNames);
    setSuccess(false);
  };

  const emailPreview = useMemo(() => {
    const name = form.fullName || '[new hire name]';
    const toolList = selectedTools.length
      ? selectedTools.map((toolName) => `- ${toolName}`).join('\n')
      : '- No tools selected yet';

    return `To: ${IT_TEST_EMAIL}
Subject: New employee setup — ${name}

Hello IT team,

Please prepare the setup for the following new hire:

Name: ${name}
Job title: ${form.jobTitle || '[job title]'}
Department: ${form.department}
Start date: ${form.startDate || '[start date]'}
Work email to create: ${form.workEmail || '[work email]'}
Manager: ${form.managerName || '[manager name]'}

Tools and licences requested:
${toolList}

Additional notes:
${form.notes || 'No additional notes.'}

Thank you.`;
  }, [form, selectedTools]);

  return (
    <div className="fr-module-layout">
      <Sidebar />
      <main className="fr-module-content">
        <section className="lifecycle-shell">
          <div className="lifecycle-topbar">
            <div>
              <h1 className="lifecycle-title">Onboarding</h1>
              <p className="lifecycle-subtitle">Send an IT setup request for a new hire.</p>
            </div>
          </div>

          <div className="lifecycle-stack">
            {success && (
              <div className="life-alert">
                Setup request prepared. The preview is ready for {IT_TEST_EMAIL}.
              </div>
            )}

            <section className="lifecycle-card">
              <h2>New employee details</h2>
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
                    {departments.map((department) => (
                      <option key={department} value={department}>
                        {department}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="lifecycle-field">
                  <label>Start date</label>
                  <input
                    className="lifecycle-input"
                    type="date"
                    value={form.startDate}
                    onChange={(event) => updateField('startDate', event.target.value)}
                  />
                </div>
                <div className="lifecycle-field">
                  <label>Work email to create</label>
                  <input
                    className="lifecycle-input"
                    type="email"
                    value={form.workEmail}
                    onChange={(event) => updateField('workEmail', event.target.value)}
                    placeholder="alex.martin@company.com"
                  />
                </div>
                <div className="lifecycle-field">
                  <label>Manager name</label>
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
              <h2>Tools & licences to set up</h2>
              <div className="tool-grid">
                {tools.map((tool) => {
                  const checked = selectedTools.includes(tool.name);
                  return (
                    <label className={`tool-card${checked ? ' selected' : ''}`} key={tool.name}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleTool(tool.name)}
                      />
                      <span>
                        <span className="tool-name">{tool.name}</span>
                        <span className="tool-category">{tool.category}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
              <div className="lifecycle-field" style={{ marginTop: 14 }}>
                <label>Notes to IT</label>
                <textarea
                  className="lifecycle-textarea"
                  value={form.notes}
                  onChange={(event) => updateField('notes', event.target.value)}
                  placeholder="Laptop preferences, security groups, shared folders, or any special setup..."
                />
              </div>
            </section>

            <section className="lifecycle-card">
              <h2>Email preview to IT</h2>
              <pre className="email-preview">{emailPreview}</pre>
              <p className="lifecycle-card-note">
                This preview is local for now. IT test recipient: {IT_TEST_EMAIL}.
              </p>
              <div className="lifecycle-actions">
                <button className="life-btn ghost" type="button" onClick={resetForm}>
                  Reset
                </button>
                <button className="life-btn" type="button" onClick={() => setSuccess(true)}>
                  Send to IT
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
