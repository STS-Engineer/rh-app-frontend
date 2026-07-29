import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { paieAPI } from '../services/api';
import './Paie.css';

function tnd(value) {
  if (value === null || value === undefined) return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

function heures(minutes) {
  return (minutes / 60).toLocaleString('fr-TN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function decimalStr(value, digits = 1) {
  if (value === null || value === undefined) return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString('fr-TN', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function apiErrorMessage(err) {
  return err?.response?.data?.error || err.message || String(err);
}

// --- Import ---------------------------------------------------------------

function ImportTab({ onImported }) {
  const [file, setFile] = useState(null);
  const [periodeDebut, setPeriodeDebut] = useState('');
  const [periodeFin, setPeriodeFin] = useState('');
  const [editingPeriod, setEditingPeriod] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  async function runImport(f, override) {
    setLoading(true);
    setError(null);
    try {
      const res = await paieAPI.importAttendance(
        f,
        override?.debut,
        override?.fin,
        override?.mois
      );
      const body = res.data;
      setPreview(body);
      setPeriodeDebut(body.periodeDebut);
      setPeriodeFin(body.periodeFin);
      setEditingPeriod(false);
      if (onImported) onImported({ periodeDebut: body.periodeDebut, periodeFin: body.periodeFin, moisPaie: body.moisPaie });
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function pickFile(f) {
    setFile(f);
    setPreview(null);
    runImport(f);
  }

  function applyCorrectedPeriod() {
    if (!file) return;
    runImport(file, { debut: periodeDebut, fin: periodeFin });
  }

  const mismatches = (preview?.employees || []).filter(
    (e) =>
      (e.deltaHeuresMinutes && e.deltaHeuresMinutes !== 0) ||
      (e.deltaCongesDays && Number(e.deltaCongesDays) !== 0) ||
      (e.deltaFeriesDays && Number(e.deltaFeriesDays) !== 0)
  );

  return (
    <div className="paie-panel">
      <div className="paie-card">
        <div
          className="paie-dropzone"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) pickFile(f);
          }}
        >
          {file ? (
            <p>Fichier sélectionné : <strong>{file.name}</strong></p>
          ) : (
            <p>📁 Glissez-déposez le rapport plafonné (.xlsx) ici, ou cliquez pour parcourir</p>
          )}
          <input
            type="file"
            accept=".xlsx"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) pickFile(f);
            }}
          />
        </div>

        {loading && <p>Import en cours…</p>}

        {preview && !editingPeriod && (
          <p className="paie-period-line">
            Période détectée : <strong>{periodeDebut} → {periodeFin}</strong> · paie de{' '}
            <strong>{preview.moisPaie}</strong>{' — '}
            <a href="#!" onClick={(e) => { e.preventDefault(); setEditingPeriod(true); }}>corriger</a>
          </p>
        )}

        {preview && editingPeriod && (
          <div className="paie-field-row">
            <label>Période — début
              <input type="date" value={periodeDebut} onChange={(e) => setPeriodeDebut(e.target.value)} />
            </label>
            <label>Période — fin
              <input type="date" value={periodeFin} onChange={(e) => setPeriodeFin(e.target.value)} />
            </label>
            <button onClick={applyCorrectedPeriod} disabled={loading}>Ré-importer avec ces dates</button>
          </div>
        )}
      </div>

      {error && (
        <div className="alert alert-error">
          <span className="alert-icon">❌</span>
          <div><strong>Erreur d'import</strong><p>{error}</p></div>
        </div>
      )}

      {preview && (
        <>
          <div className="alert alert-success">
            <span className="alert-icon">✅</span>
            <div>
              <strong>Import réussi</strong>
              <p>
                {preview.employees.length} employés, {preview.dayColumnsCount} jours ouvrés (
                {preview.expectedHours}h attendues).
                {preview.newConfigCount > 0 && (
                  <> {preview.newConfigCount} nouvel(aux) employé(s) ajouté(s) à l'onglet Employés.</>
                )}
              </p>
            </div>
          </div>

          {preview.unmatchedEmployees?.length > 0 && (
            <div className="alert alert-error">
              <span className="alert-icon">⚠️</span>
              <div>
                <strong>{preview.unmatchedEmployees.length} matricule(s) du rapport introuvable(s) dans le dossier RH</strong>
                <p>Ces employés doivent d'abord être créés dans le module Team avant de pouvoir être payés.</p>
                <ul>
                  {preview.unmatchedEmployees.map((u) => (
                    <li key={u.matricule}>{u.matricule} — {u.employe}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {(preview.unparsedCells?.length > 0 || mismatches.length > 0 || preview.employeesFlaggedCount > 0) && (
            <div className="paie-warnings">
              <h3>À vérifier</h3>
              {preview.employeesFlaggedCount > 0 && (
                <p>
                  <span className="paie-badge warn">{preview.employeesFlaggedCount}</span> employé(s) avec 0h
                  payable ou moins de 50% des heures attendues — exclus par défaut à l'étape Calcul.
                </p>
              )}
              {preview.unparsedCells?.length > 0 && (
                <p>
                  <span className="paie-badge danger">{preview.unparsedCells.length}</span> cellule(s) non
                  reconnue(s) — jamais comptée(s) comme zéro.
                </p>
              )}
              {mismatches.length > 0 && (
                <p>
                  <span className="paie-badge warn">{mismatches.length}</span> employé(s) où le total recalculé
                  diffère du total du fichier (colonnes de total non fiables).
                </p>
              )}
              <a href="#!" onClick={(e) => { e.preventDefault(); setShowDetails((v) => !v); }}>
                {showDetails ? 'Masquer le détail' : 'Voir le détail'}
              </a>
            </div>
          )}

          <div className="paie-card">
            <table className="paie-table">
              <thead>
                <tr>
                  <th>Matricule</th>
                  <th>Employé</th>
                  <th className="num">Heures payables</th>
                  <th className="num">Congés (j)</th>
                  <th className="num">Fériés (j)</th>
                  <th className="num">Retards</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {preview.employees.map((e) => (
                  <tr key={e.matricule} className={e.requiresManualReview ? 'flagged' : ''}>
                    <td>{e.matricule}</td>
                    <td>{e.employe}</td>
                    <td className="num">{heures(e.payableMinutes)}</td>
                    <td className="num">{decimalStr(e.congeDays)}</td>
                    <td className="num">{decimalStr(e.feriesDays)}</td>
                    <td className="num">{e.retards}</td>
                    <td>
                      {e.requiresManualReview ? (
                        <span className="paie-badge warn">Révision requise</span>
                      ) : (
                        <span className="paie-badge ok">OK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// --- Employés ---------------------------------------------------------------

function EmployesTab() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingMatricule, setSavingMatricule] = useState(null);
  const [savedFlash, setSavedFlash] = useState(null);

  async function reload() {
    setLoading(true);
    try {
      const res = await paieAPI.getEmployes();
      setEmployees(res.data);
      setError(null);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  function updateLocal(matricule, field, value) {
    setEmployees((prev) => prev.map((e) => (e.matricule === matricule ? { ...e, [field]: value } : e)));
  }

  async function save(matricule) {
    const emp = employees.find((e) => e.matricule === matricule);
    if (!emp) return;
    setSavingMatricule(matricule);
    try {
      await paieAPI.updateEmploye(matricule, {
        contractType: emp.contractType,
        chefFamille: emp.chefFamille,
        nbEnfants: emp.nbEnfants,
        salaireBase: emp.salaireBase,
        indemnitesImposables: emp.indemnitesImposables,
        indemnitesNonImposables: emp.indemnitesNonImposables,
        acompte: emp.acompte
      });
      setSavedFlash(matricule);
      setError(null);
      setTimeout(() => setSavedFlash(null), 1500);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSavingMatricule(null);
    }
  }

  return (
    <div className="paie-panel">
      {error && <div className="alert alert-error"><span className="alert-icon">❌</span><p>{error}</p></div>}
      <div className="paie-card" style={{ overflowX: 'auto' }}>
        {loading ? (
          <p>Chargement…</p>
        ) : employees.length === 0 ? (
          <p className="paie-muted">
            Aucun employé pour l'instant — importez un fichier de présence (onglet Import) pour les ajouter
            automatiquement.
          </p>
        ) : (
          <table className="paie-table">
            <thead>
              <tr>
                <th>Matricule</th>
                <th>Nom</th>
                <th>Contrat</th>
                <th className="num">Salaire de base</th>
                <th>Chef famille</th>
                <th className="num">Enfants</th>
                <th className="num">Indemn. imposables</th>
                <th className="num">Indemn. non imposables</th>
                <th className="num">Acompte</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => {
                const isCivp = emp.contractType === 'CIVP';
                return (
                  <tr key={emp.matricule}>
                    <td>{emp.matricule}</td>
                    <td>{emp.nom}</td>
                    <td>
                      <select
                        value={emp.contractType}
                        onChange={(e) => updateLocal(emp.matricule, 'contractType', e.target.value)}
                      >
                        <option value="CDI">CDI</option>
                        <option value="CIVP">CIVP</option>
                      </select>
                    </td>
                    <td className="num">
                      <input
                        className="num"
                        value={emp.salaireBase}
                        onChange={(e) => updateLocal(emp.matricule, 'salaireBase', e.target.value)}
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={emp.chefFamille}
                        disabled={isCivp}
                        onChange={(e) => updateLocal(emp.matricule, 'chefFamille', e.target.checked)}
                      />
                    </td>
                    <td className="num">
                      <input
                        className="num"
                        type="number"
                        min={0}
                        disabled={isCivp}
                        value={emp.nbEnfants}
                        onChange={(e) => updateLocal(emp.matricule, 'nbEnfants', Number(e.target.value))}
                      />
                    </td>
                    <td className="num">
                      <input
                        className="num"
                        disabled={isCivp}
                        value={emp.indemnitesImposables}
                        onChange={(e) => updateLocal(emp.matricule, 'indemnitesImposables', e.target.value)}
                      />
                    </td>
                    <td className="num">
                      <input
                        className="num"
                        disabled={isCivp}
                        value={emp.indemnitesNonImposables}
                        onChange={(e) => updateLocal(emp.matricule, 'indemnitesNonImposables', e.target.value)}
                      />
                    </td>
                    <td className="num">
                      <input
                        className="num"
                        disabled={isCivp}
                        value={emp.acompte}
                        onChange={(e) => updateLocal(emp.matricule, 'acompte', e.target.value)}
                      />
                    </td>
                    <td>
                      <button onClick={() => save(emp.matricule)} disabled={savingMatricule === emp.matricule}>
                        {savedFlash === emp.matricule ? 'Enregistré ✓' : 'Enregistrer'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// --- Calcul + Bulletin -------------------------------------------------------

function BulletinBody({ payslip }) {
  const d = payslip.detail;
  const isCivp = payslip.contractType === 'CIVP';
  const Line = ({ label, value, strong }) => (
    <div className={`paie-bulletin-line${strong ? ' total' : ''}`}>
      <span>{label}</span>
      <span>{tnd(value)} TND</span>
    </div>
  );
  return (
    <div className="paie-card paie-bulletin">
      <h2>{payslip.nom}</h2>
      <p className="paie-muted">
        Matricule {payslip.matricule} · {payslip.contractType} · Période {payslip.periodeDebut} →{' '}
        {payslip.periodeFin} · Paie {payslip.moisPaie}
      </p>
      <p className="paie-muted">
        Heures payables : {d.heuresPayables}h · Absence non payée : {d.heuresAbsenceNonPayee}h
      </p>
      {isCivp ? (
        <>
          <h3>Composition (stagiaire CIVP)</h3>
          <Line label="Salaire de base" value={d.salaireBase} />
          <p className="paie-muted paie-small">
            Statut stagiaire : la part ANETI est versée directement par l'ANETI, hors paie de l'entreprise. Pas de
            CNSS, pas d'IRPP, pas de CSS.
          </p>
        </>
      ) : (
        <>
          <h3>Brut</h3>
          <Line label="Salaire de base" value={d.salaireBase} />
          <Line label="Indemnités imposables" value={d.indemnitesImposables} />
          <Line label="Brut" value={d.brut} strong />
          <h3>Retenues</h3>
          <Line label="CNSS" value={d.cnssSalarie} />
          <Line label="Abattement forfaitaire" value={d.abattement} />
          <Line label="Déductions familiales" value={d.deductionsFamiliales} />
          <Line label="Net imposable" value={d.netImposable} strong />
          <Line label="IRPP" value={d.irpp} />
          <Line label="CSS" value={d.css} />
          <Line label="Acompte" value={d.acompte} />
          <h3>Non imposable</h3>
          <Line label="Indemnités non imposables" value={d.indemnitesNonImposables} />
        </>
      )}
      <Line label="Net à payer" value={payslip.netAPayer} strong />
    </div>
  );
}

function CalculTab({ lastPeriod }) {
  const [periodeDebut, setPeriodeDebut] = useState(lastPeriod?.periodeDebut || '');
  const [periodeFin, setPeriodeFin] = useState(lastPeriod?.periodeFin || '');
  const [moisPaie, setMoisPaie] = useState(lastPeriod?.moisPaie || '');
  const [editingPeriod, setEditingPeriod] = useState(!lastPeriod);
  const [overrides, setOverrides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [selectedMatricule, setSelectedMatricule] = useState(null);

  useEffect(() => {
    if (lastPeriod && !result) {
      setPeriodeDebut(lastPeriod.periodeDebut);
      setPeriodeFin(lastPeriod.periodeFin);
      setMoisPaie(lastPeriod.moisPaie);
    }
  }, [lastPeriod]);

  async function run(withOverrides) {
    if (!periodeDebut || !periodeFin || !moisPaie) {
      setError('Période et mois de paie requis');
      setEditingPeriod(true);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await paieAPI.calculer({
        periode_debut: periodeDebut,
        periode_fin: periodeFin,
        mois_paie: moisPaie,
        overrides: withOverrides || overrides
      });
      setResult(res.data);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function includeAnyway(matricule) {
    const next = [...overrides, matricule];
    setOverrides(next);
    run(next);
  }

  const ALL = '__all__';
  const mode = selectedMatricule || ALL;

  return (
    <div className="paie-panel">
      <div className="paie-card">
        {!editingPeriod && periodeDebut && periodeFin && moisPaie ? (
          <p className="paie-period-line">
            Période : <strong>{periodeDebut} → {periodeFin}</strong> · Paie de <strong>{moisPaie}</strong>{' — '}
            <a href="#!" onClick={(e) => { e.preventDefault(); setEditingPeriod(true); }}>modifier</a>
          </p>
        ) : (
          <div className="paie-field-row">
            <label>Période — début<input type="date" value={periodeDebut} onChange={(e) => setPeriodeDebut(e.target.value)} /></label>
            <label>Période — fin<input type="date" value={periodeFin} onChange={(e) => setPeriodeFin(e.target.value)} /></label>
            <label>Mois de paie<input type="month" value={moisPaie} onChange={(e) => setMoisPaie(e.target.value)} /></label>
            {periodeDebut && periodeFin && moisPaie && (
              <button className="secondary" onClick={() => setEditingPeriod(false)}>OK</button>
            )}
          </div>
        )}
        <div style={{ marginTop: 12 }}>
          <button onClick={() => run()} disabled={loading}>
            {loading ? 'Calcul en cours…' : 'Lancer le calcul'}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error"><span className="alert-icon">❌</span><p>{error}</p></div>}

      {result && (
        <>
          {result.excluded.length > 0 && (
            <div className="paie-warnings">
              <h3>Employés exclus de ce calcul</h3>
              <table className="paie-table">
                <thead><tr><th>Matricule</th><th>Nom</th><th>Raison</th><th></th></tr></thead>
                <tbody>
                  {result.excluded.map((x) => (
                    <tr key={x.matricule}>
                      <td>{x.matricule}</td>
                      <td>{x.nom}</td>
                      <td>{x.reason}</td>
                      <td><button className="secondary" onClick={() => includeAnyway(x.matricule)}>Inclure quand même</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="paie-card">
            <h3>Résultats — {result.periodeDebut} → {result.periodeFin} (paie {result.moisPaie})</h3>
            <table className="paie-table">
              <thead><tr><th>Matricule</th><th>Nom</th><th>Contrat</th><th className="num">Net à payer (TND)</th><th></th></tr></thead>
              <tbody>
                {result.payslips.map((p) => (
                  <tr key={p.matricule}>
                    <td>{p.matricule}</td>
                    <td>{p.nom}</td>
                    <td>{p.contractType}</td>
                    <td className="num">{tnd(p.netAPayer)}</td>
                    <td><button className="secondary" onClick={() => setSelectedMatricule(p.matricule)}>Bulletin</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="paie-grand-total">Total net à payer : {tnd(result.totalNet)} TND</div>
          </div>

          <div className="paie-card">
            <div className="paie-field-row">
              <label>Bulletin
                <select value={mode} onChange={(e) => setSelectedMatricule(e.target.value === ALL ? null : e.target.value)}>
                  <option value={ALL}>— Tous les employés ({result.payslips.length}) —</option>
                  {result.payslips.map((p) => (
                    <option key={p.matricule} value={p.matricule}>{p.matricule} — {p.nom}</option>
                  ))}
                </select>
              </label>
              <button onClick={() => window.print()}>Imprimer</button>
            </div>
            {mode === ALL
              ? result.payslips.map((p) => <BulletinBody key={p.matricule} payslip={p} />)
              : (() => {
                  const p = result.payslips.find((x) => x.matricule === mode);
                  return p ? <BulletinBody payslip={p} /> : null;
                })()}
          </div>
        </>
      )}
    </div>
  );
}

// --- Main page ---------------------------------------------------------------

const TABS = [
  { key: 'import', label: '1. Import' },
  { key: 'employes', label: '2. Employés' },
  { key: 'calcul', label: '3. Calcul & Bulletin' }
];

const Paie = () => {
  const [tab, setTab] = useState('import');
  const [lastPeriod, setLastPeriod] = useState(null);

  return (
    <div className="paie-page">
      <Sidebar />
      <div className="main-content paie-content">
        <div className="paie-header">
          <h1>💵 Paie</h1>
          <p className="paie-subtitle">Calcul CNSS / IRPP / CSS à partir du rapport de présence plafonné.</p>
        </div>

        <div className="paie-tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`paie-tab${tab === t.key ? ' active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'import' && <ImportTab onImported={setLastPeriod} />}
        {tab === 'employes' && <EmployesTab />}
        {tab === 'calcul' && <CalculTab lastPeriod={lastPeriod} />}
      </div>
    </div>
  );
};

export default Paie;
