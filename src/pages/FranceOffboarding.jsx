import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { employeesAPI, tenantV2API } from '../services/api';
import './FranceModules.css';

const FranceOffboarding = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ date_depart: '', entretien_depart: '', statut: 'actif' });
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
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
    if (!selectedEmployee) return;
    setForm({
      date_depart: selectedEmployee.date_depart ? String(selectedEmployee.date_depart).slice(0, 10) : '',
      entretien_depart: selectedEmployee.entretien_depart || '',
      statut: selectedEmployee.statut || 'actif'
    });
  }, [selectedEmployee]);

  useEffect(() => {
    const loadOffboarding = async () => {
      if (!selectedEmployee) return;
      const r = await tenantV2API.getFranceOffboarding(selectedEmployee.id);
      setTasks(r.data?.tasks || []);
    };
    loadOffboarding();
  }, [selectedEmployee]);

  const handleSave = async () => {
    if (!selectedEmployee) return;
    setSaving(true);
    try {
      await employeesAPI.update(selectedEmployee.id, { ...selectedEmployee, ...form });
      if (form.date_depart) {
        await tenantV2API.createFranceOffboarding(selectedEmployee.id, {
          departure_date: form.date_depart,
          reason: 'offboarding',
          interview_notes: form.entretien_depart
        });
      }
      alert('Offboarding data saved.');
    } catch (e) {
      alert(e?.response?.data?.error || e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };
  const addOffTask = async (task_code, title) => {
    if (!selectedEmployee || !form.date_depart) return alert('Set departure date and save first.');
    await tenantV2API.addFranceOffboardingTask(selectedEmployee.id, { task_code, title });
    const r = await tenantV2API.getFranceOffboarding(selectedEmployee.id);
    setTasks(r.data?.tasks || []);
  };
  const updateTask = async (id, status) => {
    await tenantV2API.updateFranceOffboardingTask(id, { status });
    const r = await tenantV2API.getFranceOffboarding(selectedEmployee.id);
    setTasks(r.data?.tasks || []);
  };

  return (
    <div className="fr-module-layout">
      <Sidebar />
      <main className="fr-module-content">
        <h1>France - Offboarding</h1>
        <p className="fr-module-subtitle">Manage departure status and administrative notes for offboarding.</p>
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
                  <div className="fr-kpis">
                    <div className="fr-kpi"><div className="fr-kpi-label">Current Status</div><div className="fr-kpi-value" style={{ fontSize: 16 }}>{form.statut}</div></div>
                    <div className="fr-kpi"><div className="fr-kpi-label">Departure Date</div><div className="fr-kpi-value" style={{ fontSize: 16 }}>{form.date_depart || '-'}</div></div>
                    <div className="fr-kpi"><div className="fr-kpi-label">Archive PDF</div><div className="fr-kpi-value" style={{ fontSize: 16 }}>{selectedEmployee.pdf_archive_url ? 'Yes' : 'No'}</div></div>
                    <div className="fr-kpi"><div className="fr-kpi-label">RH File</div><div className="fr-kpi-value" style={{ fontSize: 16 }}>{selectedEmployee.dossier_rh ? 'Yes' : 'No'}</div></div>
                  </div>
                  <div className="fr-grid">
                    <input className="fr-input" type="date" value={form.date_depart} onChange={(e) => setForm((p) => ({ ...p, date_depart: e.target.value }))} />
                    <select className="fr-input" value={form.statut} onChange={(e) => setForm((p) => ({ ...p, statut: e.target.value }))}>
                      <option value="actif">Actif</option>
                      <option value="archive">Archive</option>
                    </select>
                  </div>
                  <textarea
                    className="fr-input fr-textarea"
                    placeholder="Departure interview / access revocation notes"
                    value={form.entretien_depart}
                    onChange={(e) => setForm((p) => ({ ...p, entretien_depart: e.target.value }))}
                  />

                  <button className="fr-btn" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Offboarding'}
                  </button>
                  <h3 className="fr-section-title">Offboarding Actions</h3>
                  <div className="fr-grid">
                    <button className="fr-btn secondary" onClick={() => addOffTask('remove_licenses', 'Send email to IT to remove licenses')}>Request IT License Removal</button>
                    <button className="fr-btn secondary" onClick={() => addOffTask('satisfaction_form', 'Send employee satisfaction form')}>Send Satisfaction Form</button>
                    <button className="fr-btn secondary" onClick={() => addOffTask('equipment_return', 'Verify equipment return')}>Track Equipment Return</button>
                  </div>
                  <ul className="fr-task-list">
                    {tasks.map((t) => (
                      <li key={t.id} className="fr-task-item">
                        <div><strong>{t.title}</strong><div style={{ fontSize: 12, color: '#64748b' }}>{t.task_code}</div></div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span className={`fr-badge ${t.status}`}>{t.status}</span>
                          <select className="fr-input" style={{ width: 130 }} value={t.status} onChange={(e) => updateTask(t.id, e.target.value)}>
                            <option value="todo">todo</option><option value="in_progress">in_progress</option><option value="done">done</option><option value="blocked">blocked</option>
                          </select>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default FranceOffboarding;
