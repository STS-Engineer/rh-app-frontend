import React, { useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { useLanguage } from '../contexts/LanguageContext';
import './FranceModules.css';

const departments = ['Engineering', 'Design', 'Product', 'HR', 'Finance'];
const IT_TEST_EMAIL = 'rami.mejri@avocarbon.com';

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
  const lt = (value) => localLabels[language]?.[value] || value;
  const [form, setForm] = useState(initialForm);
  const [selectedSoftware, setSelectedSoftware] = useState(allSoftwareNames);
  const [selectedEquipment, setSelectedEquipment] = useState(allEquipmentNames);
  const [selectedTraining, setSelectedTraining] = useState(allTrainingNames);
  const [success, setSuccess] = useState(false);

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
  };

  const emailPreview = useMemo(() => {
    const name = form.fullName || '[new hire name]';
    const softwareList = selectedSoftware.length
      ? selectedSoftware.map((toolName) => `- ${lt(toolName)}`).join('\n')
      : `- ${t('none')}`;
    const equipmentList = selectedEquipment.length
      ? selectedEquipment.map((itemName) => `- ${lt(itemName)}`).join('\n')
      : `- ${t('none')}`;
    const trainingList = selectedTraining.length
      ? selectedTraining.map((itemName) => `- ${lt(itemName)}`).join('\n')
      : `- ${t('none')}`;

    return `To: ${IT_TEST_EMAIL}
Subject: ${t('setupRequestPrepared')} ${name}

${t('notesToIT')},

${t('prepareOnboardingRequests')}

${t('fullName')}: ${name}
${t('position')}: ${form.jobTitle || '[job title]'}
${t('department')}: ${lt(form.department)}
${t('startDate')}: ${form.startDate || '[start date]'}
${t('employeeEmail') || 'Work email to create'}: ${form.workEmail || '[work email]'}
${t('managerName') || 'Manager name'}: ${form.managerName || '[manager name]'}

${t('softwareLicences')}:
${softwareList}

${t('equipmentRequests')}:
${equipmentList}

${t('trainingRequests')}:
${trainingList}

${t('notes')}:
${form.notes || `${t('none')} ${t('notes').toLowerCase()}.`}

${lt('Thank you.')}`;
  }, [form, selectedSoftware, selectedEquipment, selectedTraining, language]);

  return (
    <div className="fr-module-layout">
      <Sidebar />
      <main className="fr-module-content">
        <section className="lifecycle-shell">
          <div className="lifecycle-topbar">
            <div>
              <h1 className="lifecycle-title">{t('onboarding')}</h1>
              <p className="lifecycle-subtitle">
                {t('prepareOnboardingRequests')}
              </p>
            </div>
          </div>

          <div className="lifecycle-stack">
            {success && (
              <div className="life-alert">
                {t('setupRequestPrepared')} {IT_TEST_EMAIL}.
              </div>
            )}

            <section className="lifecycle-card">
              <h2>{t('newEmployeeDetails')}</h2>
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
                  <label>{t('managerName') || 'Manager name'}</label>
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
              <h2>{t('softwareLicences')}</h2>
              <div className="tool-grid">
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
            </section>

            <section className="lifecycle-card">
              <h2>{t('equipmentRequests')}</h2>
              <div className="tool-grid">
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
            </section>

            <section className="lifecycle-card">
              <h2>{t('trainingRequests')}</h2>
              <div className="tool-grid">
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
            </section>

            <section className="lifecycle-card">
              <h2>{t('notesToIT')}</h2>
              <div className="lifecycle-field" style={{ marginTop: 0 }}>
                <textarea
                  className="lifecycle-textarea"
                  value={form.notes}
                  onChange={(event) => updateField('notes', event.target.value)}
                placeholder={t('notesToIT')}
              />
              </div>
            </section>

            <section className="lifecycle-card">
              <h2>{t('emailPreviewIT')}</h2>
              <pre className="email-preview">{emailPreview}</pre>
              <p className="lifecycle-card-note">
                {t('localPreviewNote')} {IT_TEST_EMAIL}.
              </p>
              <div className="lifecycle-actions">
                <button className="life-btn ghost" type="button" onClick={resetForm}>
                  {t('reset')}
                </button>
                <button className="life-btn" type="button" onClick={() => setSuccess(true)}>
                  {t('sendToIT')}
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
