import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { employeesAPI, tenantV2API } from '../services/api';
import './FranceModules.css';

const FranceCareerDevelopment = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ poste: '', salaire_brute: '', type_contrat: '', date_fin_contrat: '' });
  const [events, setEvents] = useState([]);
  const [eventForm, setEventForm] = useState({ event_type: 'note', event_date: '', title: '', details: '' });
  const [yearFilter, setYearFilter] = useState('');

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
      poste: selectedEmployee.poste || '',
      salaire_brute: selectedEmployee.salaire_brute || '',
      type_contrat: selectedEmployee.type_contrat || '',
      date_fin_contrat: selectedEmployee.date_fin_contrat ? String(selectedEmployee.date_fin_contrat).slice(0, 10) : ''
    });
  }, [selectedEmployee]);

  useEffect(() => {
    const loadEvents = async () => {
      if (!selectedEmployee) return;
      const r = await tenantV2API.getFranceCareerEvents(selectedEmployee.id);
      setEvents(r.data || []);
    };
    loadEvents();
  }, [selectedEmployee]);

  const handleSave = async () => {
    if (!selectedEmployee) return;
    setSaving(true);
    try {
      await employeesAPI.update(selectedEmployee.id, { ...selectedEmployee, ...form });
      alert('Career development data saved.');
    } catch (e) {
      alert(e?.response?.data?.error || e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const addEvent = async () => {
    if (!selectedEmployee || !eventForm.event_date || !eventForm.title) return;
    await tenantV2API.addFranceCareerEvent(selectedEmployee.id, eventForm);
    const r = await tenantV2API.getFranceCareerEvents(selectedEmployee.id);
    setEvents(r.data || []);
    setEventForm({ event_type: 'note', event_date: '', title: '', details: '' });
  };
  const filteredEvents = yearFilter
    ? events.filter((ev) => String(ev.event_date).slice(0, 4) === yearFilter)
    : events;

  return (
    <div className="fr-module-layout">
      <Sidebar />
      <main className="fr-module-content">
        <h1>France - Career Development</h1>
        <p className="fr-module-subtitle">Track role and compensation evolution using existing employee profile data.</p>
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
                  <div className="fr-grid">
                    <input className="fr-input" placeholder="Current role" value={form.poste} onChange={(e) => setForm((p) => ({ ...p, poste: e.target.value }))} />
                    <input className="fr-input" type="number" placeholder="Gross salary" value={form.salaire_brute} onChange={(e) => setForm((p) => ({ ...p, salaire_brute: e.target.value }))} />
                    <input className="fr-input" placeholder="Contract type" value={form.type_contrat} onChange={(e) => setForm((p) => ({ ...p, type_contrat: e.target.value }))} />
                    <input className="fr-input" type="date" value={form.date_fin_contrat} onChange={(e) => setForm((p) => ({ ...p, date_fin_contrat: e.target.value }))} />
                  </div>

                  <button className="fr-btn" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Career Data'}
                  </button>
                  <h3 className="fr-section-title">Career Timeline</h3>
                  <div className="fr-kpis">
                    <div className="fr-kpi"><div className="fr-kpi-label">Total Events</div><div className="fr-kpi-value">{events.length}</div></div>
                    <div className="fr-kpi"><div className="fr-kpi-label">Promotions</div><div className="fr-kpi-value">{events.filter((e) => e.event_type === 'promotion').length}</div></div>
                    <div className="fr-kpi"><div className="fr-kpi-label">Reviews</div><div className="fr-kpi-value">{events.filter((e) => e.event_type === 'review').length}</div></div>
                    <div className="fr-kpi"><div className="fr-kpi-label">Trainings</div><div className="fr-kpi-value">{events.filter((e) => e.event_type === 'training').length}</div></div>
                  </div>
                  <div className="fr-grid">
                    <select className="fr-input" value={eventForm.event_type} onChange={(e) => setEventForm((p) => ({ ...p, event_type: e.target.value }))}>
                      <option value="note">Note</option><option value="promotion">Promotion</option><option value="salary_change">Salary Change</option><option value="review">Review</option><option value="training">Training</option>
                    </select>
                    <input className="fr-input" type="date" value={eventForm.event_date} onChange={(e) => setEventForm((p) => ({ ...p, event_date: e.target.value }))} />
                    <input className="fr-input" placeholder="Title" value={eventForm.title} onChange={(e) => setEventForm((p) => ({ ...p, title: e.target.value }))} />
                    <input className="fr-input" placeholder="Details" value={eventForm.details} onChange={(e) => setEventForm((p) => ({ ...p, details: e.target.value }))} />
                    <input className="fr-input" placeholder="Filter by year (YYYY)" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} />
                  </div>
                  <button className="fr-btn secondary" onClick={addEvent}>Add Career Event</button>
                  <ul className="fr-event-list">
                    {filteredEvents.map((ev) => (
                      <li key={ev.id} className="fr-event-item">
                        <div>
                          <strong>{ev.title}</strong>
                          <div style={{ fontSize: 12, color: '#64748b' }}>{ev.details || 'No details'}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span className={`fr-badge ${ev.event_type === 'promotion' ? 'completed' : 'in_progress'}`}>{ev.event_type}</span>
                          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{String(ev.event_date).slice(0,10)}</div>
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

export default FranceCareerDevelopment;
