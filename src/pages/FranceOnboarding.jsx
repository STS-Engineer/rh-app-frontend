import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { employeesAPI, tenantV2API } from '../services/api';
import './FranceModules.css';

const emptyEmergency = { nom: '', prenom: '', relation: '', telephone: '', email: '' };

const FranceOnboarding = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState('');
  const [saving, setSaving] = useState(false);
  const [employeeForm, setEmployeeForm] = useState({
    poste: '',
    site_dep: '',
    date_debut: '',
    type_contrat: '',
    salaire_brute: '',
    adresse_mail: '',
    mail_responsable1: '',
    mail_responsable2: ''
  });
  const [emergency, setEmergency] = useState(emptyEmergency);
  const [onboarding, setOnboarding] = useState({ status: 'in_progress', start_date: '', target_completion_date: '', owner_email: '', notes: '' });
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState({ title: '', task_code: 'training' });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const response = await employeesAPI.getAll();
        setEmployees(response.data || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const selectedEmployee = useMemo(
    () => employees.find((e) => String(e.id) === String(selectedId)),
    [employees, selectedId]
  );

  useEffect(() => {
    const loadDetail = async () => {
      if (!selectedEmployee) return;
      setEmployeeForm({
        poste: selectedEmployee.poste || '',
        site_dep: selectedEmployee.site_dep || '',
        date_debut: selectedEmployee.date_debut ? String(selectedEmployee.date_debut).slice(0, 10) : '',
        type_contrat: selectedEmployee.type_contrat || '',
        salaire_brute: selectedEmployee.salaire_brute || '',
        adresse_mail: selectedEmployee.adresse_mail || '',
        mail_responsable1: selectedEmployee.mail_responsable1 || '',
        mail_responsable2: selectedEmployee.mail_responsable2 || ''
      });
      try {
        const response = await tenantV2API.getFranceEmergencyContact(selectedEmployee.id);
        setEmergency(response.data || emptyEmergency);
      } catch {
        setEmergency(emptyEmergency);
      }
      try {
        const ob = await tenantV2API.getFranceOnboarding(selectedEmployee.id);
        if (ob.data?.record) {
          setOnboarding({
            status: ob.data.record.status || 'in_progress',
            start_date: ob.data.record.start_date ? String(ob.data.record.start_date).slice(0, 10) : '',
            target_completion_date: ob.data.record.target_completion_date ? String(ob.data.record.target_completion_date).slice(0, 10) : '',
            owner_email: ob.data.record.owner_email || '',
            notes: ob.data.record.notes || ''
          });
          setTasks(ob.data.tasks || []);
        } else {
          setTasks([]);
        }
      } catch {}
    };
    loadDetail();
  }, [selectedEmployee]);

  const handleSave = async () => {
    if (!selectedEmployee) return;
    setSaving(true);
    try {
      await employeesAPI.update(selectedEmployee.id, {
        ...selectedEmployee,
        ...employeeForm
      });
      await tenantV2API.saveFranceEmergencyContact(selectedEmployee.id, emergency);
      await tenantV2API.saveFranceOnboarding(selectedEmployee.id, onboarding);
      alert('Onboarding data saved.');
    } catch (e) {
      alert(e?.response?.data?.error || e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const addTask = async () => {
    if (!selectedEmployee || !newTask.title.trim()) return;
    await tenantV2API.addFranceOnboardingTask(selectedEmployee.id, newTask);
    const ob = await tenantV2API.getFranceOnboarding(selectedEmployee.id);
    setTasks(ob.data.tasks || []);
    setNewTask({ title: '', task_code: 'custom' });
  };
  const updateTaskStatus = async (taskId, status) => {
    await tenantV2API.updateFranceOnboardingTask(taskId, { status });
    const ob = await tenantV2API.getFranceOnboarding(selectedEmployee.id);
    setTasks(ob.data.tasks || []);
  };

  return (
    <div className="fr-module-layout">
      <Sidebar />
      <main className="fr-module-content">
        <h1>France - Onboarding</h1>
        <p className="fr-module-subtitle">Manage onboarding profile and emergency contact for France tenant employees.</p>

        <div className="fr-module-card">
          {loading ? (
            <p>Loading employees...</p>
          ) : (
            <>
              <label className="fr-label">Employee</label>
              <select className="fr-input" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                <option value="">Select employee...</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.prenom} {e.nom} ({e.matricule})
                  </option>
                ))}
              </select>

              {selectedEmployee && (
                <>
                  <h3 className="fr-section-title">Professional Information</h3>
                  <div className="fr-grid">
                    <input className="fr-input" placeholder="Job title" value={employeeForm.poste} onChange={(e) => setEmployeeForm((p) => ({ ...p, poste: e.target.value }))} />
                    <input className="fr-input" placeholder="Plant / department" value={employeeForm.site_dep} onChange={(e) => setEmployeeForm((p) => ({ ...p, site_dep: e.target.value }))} />
                    <input className="fr-input" type="date" value={employeeForm.date_debut} onChange={(e) => setEmployeeForm((p) => ({ ...p, date_debut: e.target.value }))} />
                    <input className="fr-input" placeholder="Contract type" value={employeeForm.type_contrat} onChange={(e) => setEmployeeForm((p) => ({ ...p, type_contrat: e.target.value }))} />
                    <input className="fr-input" type="number" placeholder="Gross salary" value={employeeForm.salaire_brute} onChange={(e) => setEmployeeForm((p) => ({ ...p, salaire_brute: e.target.value }))} />
                  </div>

                  <h3 className="fr-section-title">Contacts</h3>
                  <div className="fr-grid">
                    <input className="fr-input" placeholder="Employee email" value={employeeForm.adresse_mail} onChange={(e) => setEmployeeForm((p) => ({ ...p, adresse_mail: e.target.value }))} />
                    <input className="fr-input" placeholder="Line manager email" value={employeeForm.mail_responsable1} onChange={(e) => setEmployeeForm((p) => ({ ...p, mail_responsable1: e.target.value }))} />
                    <input className="fr-input" placeholder="Backup manager email" value={employeeForm.mail_responsable2} onChange={(e) => setEmployeeForm((p) => ({ ...p, mail_responsable2: e.target.value }))} />
                  </div>

                  <h3 className="fr-section-title">Emergency Contact</h3>
                  <div className="fr-grid">
                    <input className="fr-input" placeholder="Last name" value={emergency.nom || ''} onChange={(e) => setEmergency((p) => ({ ...p, nom: e.target.value }))} />
                    <input className="fr-input" placeholder="First name" value={emergency.prenom || ''} onChange={(e) => setEmergency((p) => ({ ...p, prenom: e.target.value }))} />
                    <input className="fr-input" placeholder="Relation" value={emergency.relation || ''} onChange={(e) => setEmergency((p) => ({ ...p, relation: e.target.value }))} />
                    <input className="fr-input" placeholder="Phone" value={emergency.telephone || ''} onChange={(e) => setEmergency((p) => ({ ...p, telephone: e.target.value }))} />
                    <input className="fr-input" placeholder="Email" value={emergency.email || ''} onChange={(e) => setEmergency((p) => ({ ...p, email: e.target.value }))} />
                  </div>

                  <h3 className="fr-section-title">Onboarding Workflow</h3>
                  <div className="fr-kpis">
                    <div className="fr-kpi"><div className="fr-kpi-label">Total Tasks</div><div className="fr-kpi-value">{tasks.length}</div></div>
                    <div className="fr-kpi"><div className="fr-kpi-label">Done</div><div className="fr-kpi-value">{tasks.filter((t) => t.status === 'done').length}</div></div>
                    <div className="fr-kpi"><div className="fr-kpi-label">In Progress</div><div className="fr-kpi-value">{tasks.filter((t) => t.status === 'in_progress').length}</div></div>
                    <div className="fr-kpi"><div className="fr-kpi-label">Blocked</div><div className="fr-kpi-value">{tasks.filter((t) => t.status === 'blocked').length}</div></div>
                  </div>
                  <div className="fr-grid">
                    <select className="fr-input" value={onboarding.status} onChange={(e) => setOnboarding((p) => ({ ...p, status: e.target.value }))}>
                      <option value="in_progress">In progress</option><option value="completed">Completed</option><option value="blocked">Blocked</option>
                    </select>
                    <input className="fr-input" type="date" value={onboarding.start_date} onChange={(e) => setOnboarding((p) => ({ ...p, start_date: e.target.value }))} />
                    <input className="fr-input" type="date" value={onboarding.target_completion_date} onChange={(e) => setOnboarding((p) => ({ ...p, target_completion_date: e.target.value }))} />
                    <input className="fr-input" placeholder="Owner email" value={onboarding.owner_email} onChange={(e) => setOnboarding((p) => ({ ...p, owner_email: e.target.value }))} />
                  </div>
                  <textarea className="fr-input fr-textarea" placeholder="Workflow notes" value={onboarding.notes} onChange={(e) => setOnboarding((p) => ({ ...p, notes: e.target.value }))} />
                  <div className="fr-grid">
                    <input className="fr-input" placeholder="New task title" value={newTask.title} onChange={(e) => setNewTask((p) => ({ ...p, title: e.target.value }))} />
                    <select className="fr-input" value={newTask.task_code} onChange={(e) => setNewTask((p) => ({ ...p, task_code: e.target.value }))}>
                      <option value="training">Training</option>
                      <option value="license">Software License</option>
                      <option value="india_session">India Team Session</option>
                      <option value="equipment">Equipment Request (IT)</option>
                    </select>
                    <button className="fr-btn secondary" onClick={addTask}>Add Task</button>
                  </div>
                  <ul className="fr-task-list">
                    {tasks.map((t) => (
                      <li key={t.id} className="fr-task-item">
                        <div>
                          <strong>{t.title}</strong>
                          <div style={{ fontSize: 12, color: '#64748b' }}>{t.task_code}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span className={`fr-badge ${t.status}`}>{t.status}</span>
                          <select className="fr-input" style={{ width: 130 }} value={t.status} onChange={(e) => updateTaskStatus(t.id, e.target.value)}>
                            <option value="todo">todo</option><option value="in_progress">in_progress</option><option value="done">done</option><option value="blocked">blocked</option>
                          </select>
                        </div>
                      </li>
                    ))}
                  </ul>

                  <button className="fr-btn" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Onboarding'}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default FranceOnboarding;
