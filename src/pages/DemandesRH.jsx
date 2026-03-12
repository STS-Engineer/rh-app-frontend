import React, { useState, useEffect, useCallback, useRef } from 'react';
import './DemandesRH.css';
import Sidebar from '../components/Sidebar';
import { useLanguage } from '../contexts/LanguageContext';
import { useLocation, useNavigate } from 'react-router-dom';

// ─── Modal moved OUTSIDE DemandesRH so it never gets redefined on re-render
const Modal = ({
  demande,
  onClose,
  rejectMode,
  setRejectMode,
  rejectComment,
  setRejectComment,
  actionLoading,
  onApprove,
  onReject,
  t,
  getTypeDemandeLabel,
  getStatutBadge,
  getResponsableStatus,
  getResponsableStatusLabel,
  getResponsableStatusClass,
  formatDate,
  formatDateTime,
}) => {
  if (!demande) return null;
  const canAct = demande.statut === 'en_attente';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📑 {t('requestDetails')}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="modal-section">
            <h3>{t('generalInfo')}</h3>
            <div className="info-grid">
              <div className="info-item">
                <strong>{t('title')}:</strong> {demande.titre}
              </div>
              <div className="info-item">
                <strong>{t('type')}:</strong> {getTypeDemandeLabel(demande.type_demande)}
              </div>
              {demande.type_conge && (
                <div className="info-item">
                  <strong>{t('leaveType')}:</strong>{' '}
                  {demande.type_conge === 'autre'
                    ? demande.type_conge_autre || t('other')
                    : demande.type_conge}
                </div>
              )}
              <div className="info-item">
                <strong>{t('status')}:</strong> {getStatutBadge(demande.statut)}
              </div>
              <div className="info-item">
                <strong>{t('createdOn')}:</strong> {formatDateTime(demande.created_at)}
              </div>
            </div>
          </div>

          <div className="modal-section">
            <h3>{t('employeeInfo')}</h3>
            <div className="employee-details">
              <div className="employee-avatar-large">
                {demande.employe_photo ? (
                  <img src={demande.employe_photo} alt={`${demande.employe_prenom} ${demande.employe_nom}`} />
                ) : (
                  <div className="avatar-default-large">
                    {demande.employe_prenom?.[0] || ''}{demande.employe_nom?.[0] || ''}
                  </div>
                )}
              </div>
              <div className="employee-info">
                <h4>{demande.employe_prenom} {demande.employe_nom}</h4>
                <p><strong>{t('position')}:</strong> {demande.employe_poste || t('na')}</p>
                <p><strong>{t('employeeID')}:</strong> {demande.employe_matricule || t('na')}</p>
              </div>
            </div>
          </div>

          <div className="modal-section">
            <h3>{t('approvalProcess')}</h3>
            <div className="approval-process">
              <div className="approval-step">
                <div className="step-header">
                  <span className="step-title">{t('supervisor1')}</span>
                  <span className={`step-status ${getResponsableStatusClass(getResponsableStatus(demande, 1))}`}>
                    {getResponsableStatusLabel(getResponsableStatus(demande, 1))}
                  </span>
                </div>
                <div className="step-details">
                  <p><strong>{t('email')}:</strong> {demande.mail_responsable1 || t('na')}</p>
                </div>
              </div>
              <div className="approval-step">
                <div className="step-header">
                  <span className="step-title">{t('supervisor2')}</span>
                  {demande.mail_responsable2 && (
                    <span className={`step-status ${getResponsableStatusClass(getResponsableStatus(demande, 2))}`}>
                      {getResponsableStatusLabel(getResponsableStatus(demande, 2))}
                    </span>
                  )}
                </div>
                <div className="step-details">
                  <p><strong>{t('email')}:</strong> {demande.mail_responsable2 || t('notRequired')}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="modal-section">
            <h3>{t('requestDetails')}</h3>
            <div className="details-grid">
              {demande.date_depart && (
                <div className="detail-row">
                  <span className="detail-label">📅 {t('startDateReq')}:</span>
                  <span className="detail-value">{formatDate(demande.date_depart)}</span>
                </div>
              )}
              {demande.date_retour && (
                <div className="detail-row">
                  <span className="detail-label">📅 {t('returnDate')}:</span>
                  <span className="detail-value">{formatDate(demande.date_retour)}</span>
                </div>
              )}
              {demande.heure_depart && (
                <div className="detail-row">
                  <span className="detail-label">⏰ {t('departureTime')}:</span>
                  <span className="detail-value">{demande.heure_depart}</span>
                </div>
              )}
              {demande.heure_retour && (
                <div className="detail-row">
                  <span className="detail-label">⏰ {t('returnTime')}:</span>
                  <span className="detail-value">{demande.heure_retour}</span>
                </div>
              )}
              {demande.demi_journee && (
                <div className="detail-row">
                  <span className="detail-label">🕐 {t('halfDay')}:</span>
                  <span className="detail-value">{t('yes')}</span>
                </div>
              )}
            </div>
          </div>

          {demande.commentaire_refus && (
            <div className="modal-section">
              <h3>💬 {t('refusalComment')}</h3>
              <div className="commentaire-box">
                <p>{demande.commentaire_refus}</p>
              </div>
            </div>
          )}

          {canAct && rejectMode && (
            <div className="modal-section">
              <h3>❌ {t('refusalComment')}</h3>
              <textarea
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                placeholder={t('refusalComment') || 'Motif du refus'}
                rows={3}
                style={{ width: '100%' }}
                disabled={actionLoading}
              />
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          {canAct && !rejectMode && (
            <>
              <button
                className="btn-action btn-approve"
                onClick={() => onApprove(demande)}
                disabled={actionLoading}
                style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
              >
                ✅ {actionLoading ? (t('processing') || 'Traitement...') : 'Approuver'}
              </button>
              <button
                className="btn-action btn-reject"
                onClick={() => setRejectMode(true)}
                disabled={actionLoading}
                style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
              >
                ❌ Refuser
              </button>
            </>
          )}

          {canAct && rejectMode && (
            <>
              <button
                className="btn-action btn-reject"
                onClick={() => onReject(demande)}
                disabled={actionLoading}
                style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
              >
                ❌ {actionLoading ? (t('processing') || 'Traitement...') : 'Confirmer le refus'}
              </button>
              <button
                className="btn-close-modal"
                onClick={() => { setRejectMode(false); setRejectComment(''); }}
                disabled={actionLoading}
              >
                {t('cancel') || 'Annuler'}
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

const DemandesRH = () => {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const defaultFilters = {
    statut: '',
    employe_id: '',
    date_debut: '',
    date_fin: ''
  };

  const [filters, setFilters] = useState(defaultFilters);
  const [employes, setEmployes] = useState([]);
  const [loadingEmployes, setLoadingEmployes] = useState(false);
  const [filtersApplied, setFiltersApplied] = useState(false);
  const [lastResponse, setLastResponse] = useState(null);
  const [selectedDemande, setSelectedDemande] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectComment, setRejectComment] = useState('');

  const pendingOpenIdRef = useRef(null);
  const isFirstMount = useRef(true);

  const API_BASE_URL = 'https://backend-rh.azurewebsites.net';

  const statuts = ['en_attente', 'approuve', 'refuse'];

  // ─── helpers ────────────────────────────────────────────────────────────────

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.statut) count++;
    if (filters.employe_id) count++;
    if (filters.date_debut) count++;
    if (filters.date_fin) count++;
    return count;
  };
  const activeFiltersCount = getActiveFiltersCount();

  const getStatutLabel = (statut) => {
    const labels = { en_attente: t('pending'), approuve: t('approved'), refuse: t('refused') };
    return labels[statut] || statut;
  };

  const getTypeDemandeLabel = (type) => {
    const labels = {
      'congé': t('leave'),
      autorisation_absence: t('absenceAuthorization'),
      mission: t('mission')
    };
    return labels[type] || type;
  };

  const getResponsableStatus = (demande, num) => {
    const key = num === 1 ? 'approuve_responsable1' : 'approuve_responsable2';
    if (demande[key] === true) return 'approved';
    if (demande[key] === false) return 'refused';
    return 'pending';
  };

  const getResponsableStatusLabel = (status) => {
    const labels = { approved: t('approved'), refused: t('refused'), pending: t('pending') };
    return labels[status] || status;
  };

  const getResponsableStatusClass = (status) => {
    const classes = { approved: 'status-approved', refused: 'status-refused', pending: 'status-pending' };
    return classes[status] || '';
  };

  const getStatutBadge = (statut) => {
    const cfg = {
      en_attente: { label: t('pending'), class: 'statut-en-attente' },
      approuve: { label: t('approved'), class: 'statut-approuve' },
      refuse: { label: t('refused'), class: 'statut-refuse' }
    };
    const c = cfg[statut] || { label: statut, class: 'statut-default' };
    return <span className={`statut-badge ${c.class}`}>{c.label}</span>;
  };

  const formatDate = (dateString) => {
    if (!dateString) return t('na');
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('fr-FR');
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return t('na');
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('fr-FR') + ' ' + date.toLocaleTimeString('fr-FR');
  };

  const getTypeIcon = (type) => {
    const icons = { 'congé': '🏖️', autorisation_absence: '⏰', mission: '✈️' };
    return icons[type] || '📄';
  };

  const calculateWorkingDays = (dateDepart, dateRetour, demiJournee, typeDemande) => {
    if (!dateDepart || !dateRetour) return '';
    try {
      const start = new Date(`${dateDepart}T00:00:00`);
      const end = new Date(`${dateRetour}T00:00:00`);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return '';

      if (typeDemande === 'congé' && end.getTime() === start.getTime()) {
        const day = start.getDay();
        const base = (day !== 0 && day !== 6) ? 1 : 0;
        if (demiJournee && base > 0) return `${base - 0.5} ${t('workingDays')}`;
        return `${base} ${base > 1 ? t('workingDays') : t('workingDay')}`;
      }

      if (end < start) return `0 ${t('workingDay')}`;

      let count = 0;
      const current = new Date(start);
      while (current < end) {
        const day = current.getDay();
        if (day !== 0 && day !== 6) count++;
        current.setDate(current.getDate() + 1);
      }

      if (demiJournee && count > 0) return `${count - 0.5} ${t('workingDays')}`;
      return `${count} ${count > 1 ? t('workingDays') : t('workingDay')}`;
    } catch (e) {
      return '';
    }
  };

  const getEmployeNameById = (id) => {
    const emp = employes.find(e => e.id === parseInt(id));
    return emp ? `${emp.prenom} ${emp.nom}` : '';
  };

  // ─── API calls ───────────────────────────────────────────────────────────────

  const fetchDemandeById = useCallback(async (id) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;
      const response = await fetch(`${API_BASE_URL}/api/demandes/${id}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        cache: 'no-cache'
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data?.demande || (data?.id ? data : null);
    } catch (e) {
      return null;
    }
  }, [API_BASE_URL]);

  const fetchEmployes = useCallback(async () => {
    try {
      setLoadingEmployes(true);
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await fetch(`${API_BASE_URL}/api/employee`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Erreur chargement employés');
      const data = await response.json();
      if (Array.isArray(data)) {
        setEmployes(data.sort((a, b) =>
          `${a.prenom} ${a.nom}`.toLowerCase().localeCompare(`${b.prenom} ${b.nom}`.toLowerCase())
        ));
      } else {
        setEmployes([]);
      }
    } catch (e) {
      setEmployes([]);
    } finally {
      setLoadingEmployes(false);
    }
  }, [API_BASE_URL]);

  const fetchDemandes = useCallback(async (force = false) => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      if (!token) {
        setError(t('missingAuthToken'));
        setDemandes([]);
        setLoading(false);
        return;
      }
      const queryParams = new URLSearchParams();
      if (filters.statut) queryParams.append('statut', filters.statut);
      if (filters.employe_id) queryParams.append('employe_id', filters.employe_id);
      if (filters.date_debut) queryParams.append('date_debut', filters.date_debut);
      if (filters.date_fin) queryParams.append('date_fin', filters.date_fin);
      if (force) queryParams.append('_t', Date.now());

      const response = await fetch(`${API_BASE_URL}/api/demandes?${queryParams}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        cache: 'no-cache'
      });
      if (!response.ok) throw new Error('Erreur serveur');
      const data = await response.json();
      setLastResponse(data);
      setDemandes(data.success && Array.isArray(data.demandes) ? data.demandes : []);
    } catch (err) {
      setError(`${t('connectionError')}: ${err.message}`);
      setDemandes([]);
    } finally {
      setLoading(false);
    }
  }, [filters, API_BASE_URL, t]);

  // ─── Approve / Reject ────────────────────────────────────────────────────────

  const approveSelected = async (demandeToAct = selectedDemande) => {
    if (!demandeToAct) return;
    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE_URL}/api/demandes/${demandeToAct.id}/approuver-app`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        }
      );
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Erreur lors de l\'approbation');
      }

      setDemandes(prev => prev.map(d =>
        d.id === demandeToAct.id
          ? { ...d, statut: 'approuve', approuve_responsable1: true }
          : d
      ));
      setSelectedDemande(prev =>
        prev?.id === demandeToAct.id
          ? { ...prev, statut: 'approuve', approuve_responsable1: true }
          : prev
      );

      handleCloseModal();
    } catch (e) {
      alert(e.message || t('connectionError') || 'Erreur');
    } finally {
      setActionLoading(false);
    }
  };

  const rejectSelected = async (demandeToAct = selectedDemande) => {
    if (!demandeToAct) return;
    if (!rejectComment.trim()) {
      alert(t('refusalComment') || 'Motif du refus requis');
      return;
    }
    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE_URL}/api/demandes/${demandeToAct.id}/refuser-app`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ commentaire: rejectComment })
        }
      );
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Erreur lors du refus');
      }

      setDemandes(prev => prev.map(d =>
        d.id === demandeToAct.id
          ? { ...d, statut: 'refuse', approuve_responsable1: false, commentaire_refus: rejectComment }
          : d
      ));
      setSelectedDemande(prev =>
        prev?.id === demandeToAct.id
          ? { ...prev, statut: 'refuse', approuve_responsable1: false, commentaire_refus: rejectComment }
          : prev
      );

      handleCloseModal();
    } catch (e) {
      alert(e.message || t('connectionError') || 'Erreur');
    } finally {
      setActionLoading(false);
      setRejectMode(false);
      setRejectComment('');
    }
  };

  // ─── Effects ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    const openId = location.state?.openDemandeId;
    if (openId) {
      pendingOpenIdRef.current = String(openId);
      navigate(location.pathname, { replace: true, state: {} });
    }
    const filterStatut = location.state?.filterStatut;
    if (filterStatut) {
      setFilters(prev => ({ ...prev, statut: filterStatut }));
      setFiltersApplied(true);
    }
    fetchDemandes(true);
    fetchEmployes();
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!pendingOpenIdRef.current) return;
    if (loading) return;
    const id = pendingOpenIdRef.current;
    const found = demandes.find(d => String(d.id) === id);
    if (found) {
      setSelectedDemande(found);
      setShowModal(true);
      pendingOpenIdRef.current = null;
    } else {
      fetchDemandeById(id).then(demand => {
        if (demand) {
          setSelectedDemande(demand);
          setShowModal(true);
        }
        pendingOpenIdRef.current = null;
      });
    }
  }, [loading, demandes]); // eslint-disable-line

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    const hasActiveFilters = activeFiltersCount > 0;
    setFiltersApplied(hasActiveFilters);
    const timer = setTimeout(() => fetchDemandes(true), 300);
    return () => clearTimeout(timer);
  }, [filters]); // eslint-disable-line

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters(defaultFilters);
    setFiltersApplied(false);
    setTimeout(() => fetchDemandes(true), 100);
  };

  const retryFetch = () => fetchDemandes(true);

  // ✅ FIX: Always reset rejectMode and rejectComment before opening modal
  const handleViewDetails = (demande) => {
    setRejectMode(false);
    setRejectComment('');
    setSelectedDemande(demande);
    setShowModal(true);
  };

  // ✅ FIX: Open modal in reject mode cleanly — reset comment first
  const handleOpenRejectModal = (demande) => {
    setRejectComment('');       // clear any leftover comment from previous demande
    setRejectMode(true);        // enter reject mode
    setSelectedDemande(demande);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedDemande(null);
    setRejectMode(false);
    setRejectComment('');
  };

  const handleExportExcel = () => {
    if (!demandes || demandes.length === 0) {
      alert(t('noRequestsToExport'));
      return;
    }
    const headers = [
      'ID', t('title'), t('type'), t('leaveType'), t('status'),
      t('employee'), t('employeeID'), t('position'),
      t('startDateReq'), t('returnDate'), t('departureTime'), t('returnTime'),
      t('numberOfWorkingDays'), t('halfDay'),
      t('supervisor1'), t('supervisor1Status'),
      t('supervisor2'), t('supervisor2Status'),
      t('refusalComment'), t('creationDate'), t('lastUpdated')
    ];
    const rows = demandes.map(d => [
      d.id, d.titre,
      getTypeDemandeLabel(d.type_demande),
      d.type_conge === 'autre' ? d.type_conge_autre || t('other') : d.type_conge || '',
      getStatutLabel(d.statut),
      `${d.employe_prenom} ${d.employe_nom}`,
      d.employe_matricule || '', d.employe_poste || '',
      formatDate(d.date_depart), formatDate(d.date_retour),
      d.heure_depart || '', d.heure_retour || '',
      calculateWorkingDays(d.date_depart, d.date_retour, d.demi_journee, d.type_demande),
      d.demi_journee ? t('yes') : t('no'),
      d.mail_responsable1 || t('notAssigned'),
      getResponsableStatusLabel(getResponsableStatus(d, 1)),
      d.mail_responsable2 || t('notRequired'),
      d.mail_responsable2 ? getResponsableStatusLabel(getResponsableStatus(d, 2)) : '',
      d.commentaire_refus || '',
      formatDateTime(d.created_at), formatDateTime(d.updated_at)
    ]);
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(';'))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `demandes_RH_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="demandes-rh">
      <Sidebar />

      <div className="demandes-header">
        <h1>📋 {t('hrRequests')}</h1>
        <p>{t('requestTracking')}</p>
      </div>

      {error && (
        <div className="error-banner">
          <div className="error-content">
            <span className="error-icon">⚠️</span>
            <div className="error-details">
              <h4>{t('error')}</h4>
              <p>{error}</p>
            </div>
            <button className="btn-retry" onClick={retryFetch}>
              🔄 {t('retry')}
            </button>
          </div>
        </div>
      )}

      <div className="filters-section">
        <div className="filters-header">
          <h3>🔍 {t('searchFilters')}</h3>
          <div className="filters-actions">
            <button className="btn-export" onClick={handleExportExcel} disabled={demandes.length === 0}>
              📤 {t('exportExcel')}
            </button>
            <button className="btn-refresh" onClick={retryFetch}>
              🔄 {t('refresh')}
            </button>
            {filtersApplied && (
              <button className="btn-clear" onClick={clearFilters}>
                🧹 {t('clearFilters')}
              </button>
            )}
          </div>
        </div>

        <div className="filters-grid">
          <div className="filter-group">
            <label>{t('status')}</label>
            <select value={filters.statut} onChange={(e) => handleFilterChange('statut', e.target.value)}>
              <option value="">{t('allStatus')}</option>
              {statuts.map(s => (
                <option key={s} value={s}>{getStatutLabel(s)}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>{t('employee')}</label>
            <select
              value={filters.employe_id}
              onChange={(e) => handleFilterChange('employe_id', e.target.value)}
              disabled={loadingEmployes}
            >
              <option value="">{t('allEmployees')}</option>
              {employes.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.prenom} {emp.nom}
                  {emp.poste ? ` - ${emp.poste}` : ''}
                  {emp.matricule ? ` (${emp.matricule})` : ''}
                </option>
              ))}
            </select>
            {loadingEmployes && (
              <div className="loading-indicator">
                <span className="loading-spinner-small"></span>
                <span>{t('loading')}...</span>
              </div>
            )}
          </div>

          <div className="filter-group">
            <label>{t('fromDate')}</label>
            <input
              type="date"
              value={filters.date_debut}
              onChange={(e) => handleFilterChange('date_debut', e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label>{t('toDate')}</label>
            <input
              type="date"
              value={filters.date_fin}
              onChange={(e) => handleFilterChange('date_fin', e.target.value)}
            />
          </div>
        </div>

        {activeFiltersCount > 0 && (
          <div className="active-filters">
            <div className="filter-tag-container">
              <span className="filter-tag-label">
                {t('activeFilters')} ({activeFiltersCount}):
              </span>
              <div className="filter-tags">
                {filters.statut && (
                  <span className="tag">{t('status')}: {getStatutLabel(filters.statut)}</span>
                )}
                {filters.employe_id && (
                  <span className="tag">{t('employee')}: {getEmployeNameById(filters.employe_id) || filters.employe_id}</span>
                )}
                {filters.date_debut && (
                  <span className="tag">{t('fromDate')}: {formatDate(filters.date_debut)}</span>
                )}
                {filters.date_fin && (
                  <span className="tag">{t('toDate')}: {formatDate(filters.date_fin)}</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="stats-section">
        <div className="stat-card total" style={{ cursor: 'pointer' }} onClick={() => { handleFilterChange('statut', ''); setFiltersApplied(false); }}>
          <div className="stat-icon"><i className="fi fi-rr-rectangle-list"></i></div>
          <div className="stat-content">
            <div className="stat-number">{demandes.length}</div>
            <div className="stat-label">{t('totalRequests')}</div>
          </div>
        </div>
        <div className="stat-card pending" style={{ cursor: 'pointer' }} onClick={() => handleFilterChange('statut', 'en_attente')}>
          <div className="stat-icon"><span className="fi fi-rr-hourglass-end"></span></div>
          <div className="stat-content">
            <div className="stat-number">{demandes.filter(d => d.statut === 'en_attente').length}</div>
            <div className="stat-label">{t('pending')}</div>
          </div>
        </div>
        <div className="stat-card approved" style={{ cursor: 'pointer' }} onClick={() => handleFilterChange('statut', 'approuve')}>
          <div className="stat-icon"><span className="fi fi-rs-badge-check"></span></div>
          <div className="stat-content">
            <div className="stat-number">{demandes.filter(d => d.statut === 'approuve').length}</div>
            <div className="stat-label">{t('approved')}</div>
          </div>
        </div>
        <div className="stat-card refused" style={{ cursor: 'pointer' }} onClick={() => handleFilterChange('statut', 'refuse')}>
          <div className="stat-icon">📛</div>
          <div className="stat-content">
            <div className="stat-number">{demandes.filter(d => d.statut === 'refuse').length}</div>
            <div className="stat-label">{t('refused')}</div>
          </div>
        </div>
      </div>

      <div className="demandes-content">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>{t('loadingRequests')}</p>
            {filtersApplied && <p className="loading-sub">{t('applyingFilters')}</p>}
          </div>
        ) : error ? (
          <div className="error-state">
            <div className="error-icon">⚠️</div>
            <h3>{t('loadingError')}</h3>
            <p>{error}</p>
            <button className="btn-retry" onClick={retryFetch}>{t('retry')}</button>
          </div>
        ) : demandes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>{t('noRequests')}</h3>
            <p>{filtersApplied ? t('noMatchingCriteria') : t('noRequestsAvailable')}</p>
            {filtersApplied && (
              <button className="btn-clear-all" onClick={clearFilters}>
                {t('showAllRequests')}
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="results-header">
              <h3>{t('results')} ({demandes.length})</h3>
              <div className="results-info">
                {lastResponse?.pagination && (
                  <span className="pagination-info">
                    {t('page')} {lastResponse.pagination.page} {t('of')} {lastResponse.pagination.pages}
                  </span>
                )}
              </div>
            </div>

            <div className="demandes-grid">
              {demandes.map((demande, index) => (
                <div key={demande.id} className="demande-card" style={{ animationDelay: `${index * 0.1}s` }}>
                  <div className="card-header">
                    <div className="demande-type">
                      <span className="type-icon">{getTypeIcon(demande.type_demande)}</span>
                      <span className="type-label">{getTypeDemandeLabel(demande.type_demande)}</span>
                    </div>
                    <div className="demande-status">{getStatutBadge(demande.statut)}</div>
                  </div>

                  <div className="card-body">
                    <h3 className="demande-title">{demande.titre}</h3>

                    <div className="employe-info">
                      <div className="avatar">
                        {demande.employe_photo ? (
                          <img
                            src={demande.employe_photo}
                            alt={`${demande.employe_prenom} ${demande.employe_nom}`}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.parentElement.innerHTML =
                                `<div class="avatar-default">${demande.employe_prenom?.[0] || ''}${demande.employe_nom?.[0] || ''}</div>`;
                            }}
                          />
                        ) : (
                          <div className="avatar-default">
                            {demande.employe_prenom?.[0] || ''}{demande.employe_nom?.[0] || ''}
                          </div>
                        )}
                      </div>
                      <div className="employe-details">
                        <h4>{demande.employe_prenom} {demande.employe_nom}</h4>
                        <p>{demande.employe_poste} • {t('employeeID')}: {demande.employe_matricule || t('na')}</p>
                      </div>
                    </div>

                    {demande.type_conge && (
                      <div className="detail type-conge">
                        <span className="label">🎯 {t('leaveType')}:</span>
                        <span className="value">
                          {demande.type_conge === 'autre'
                            ? demande.type_conge_autre || t('other')
                            : demande.type_conge}
                        </span>
                      </div>
                    )}

                    <div className="approval-status">
                      <strong>{t('approvalProcess')}:</strong>
                    </div>

                    <div className="responsables-section">
                      <div className="responsable-card">
                        <div className="responsable-header">
                          <div className={`responsable-status ${getResponsableStatusClass(getResponsableStatus(demande, 1))}`}>
                            {getResponsableStatusLabel(getResponsableStatus(demande, 1))}
                          </div>
                        </div>
                        <div className="responsable-email">
                          {demande.mail_responsable1 || t('emailNotAvailable')}
                        </div>
                      </div>

                      <div className="responsable-card">
                        <div className="responsable-header">
                          {demande.mail_responsable2 && (
                            <div className={`responsable-status ${getResponsableStatusClass(getResponsableStatus(demande, 2))}`}>
                              {getResponsableStatusLabel(getResponsableStatus(demande, 2))}
                            </div>
                          )}
                        </div>
                        <div className="responsable-email">
                          {demande.mail_responsable2 || t('notRequired')}
                        </div>
                      </div>
                    </div>

                    <div className="demande-details">
                      {demande.date_depart && (
                        <div className="detail">
                          <span className="label">📅 {t('startDateReq')}:</span>
                          <span className="value">{formatDate(demande.date_depart)}</span>
                        </div>
                      )}
                      {demande.date_retour && (
                        <div className="detail">
                          <span className="label">📅 {t('returnDate')}:</span>
                          <span className="value">{formatDate(demande.date_retour)}</span>
                        </div>
                      )}
                      {demande.heure_depart && (
                        <div className="detail">
                          <span className="label">⏰ {t('departureTime')}:</span>
                          <span className="value">{demande.heure_depart}</span>
                        </div>
                      )}
                      {demande.heure_retour && (
                        <div className="detail">
                          <span className="label">⏰ {t('returnTime')}:</span>
                          <span className="value">{demande.heure_retour}</span>
                        </div>
                      )}
                      {demande.demi_journee && (
                        <div className="detail">
                          <span className="label">🕐 {t('halfDay')}:</span>
                          <span className="value">{t('yes')}</span>
                        </div>
                      )}
                      <div className="detail">
                        <span className="label">📝 {t('createdOn')}:</span>
                        <span className="value">{formatDate(demande.created_at)}</span>
                      </div>
                      <div className="detail">
                        <span className="label">🔄 {t('lastUpdated')}:</span>
                        <span className="value">{formatDate(demande.updated_at)}</span>
                      </div>
                    </div>

                    {demande.commentaire_refus && (
                      <div className="commentaire">
                        <div className="comment-label">💬 {t('refusalComment')}:</div>
                        <p>{demande.commentaire_refus}</p>
                      </div>
                    )}

                    {/* ✅ FIX: Card actions only open the modal — NO direct API calls from cards */}
                    <div className="card-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                      <button
                        className="btn-action btn-view"
                        onClick={() => handleViewDetails(demande)}
                      >
                        👁️ {t('viewDetails')}
                      </button>

                      {demande.statut === 'en_attente' && (
                        <>
                          {/* ✅ FIX: Opens modal for confirmation — does NOT call API directly */}
                          <button
                            className="btn-action btn-approve"
                            disabled={actionLoading}
                            onClick={() => handleViewDetails(demande)}
                            style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
                          >
                            ✅ Approuver
                          </button>
                          {/* ✅ FIX: Uses handleOpenRejectModal — resets comment, sets rejectMode cleanly */}
                          <button
                            className="btn-action btn-reject"
                            disabled={actionLoading}
                            onClick={() => handleOpenRejectModal(demande)}
                            style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
                          >
                            ❌ Refuser
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {showModal && (
        <Modal
          demande={selectedDemande}
          onClose={handleCloseModal}
          rejectMode={rejectMode}
          setRejectMode={setRejectMode}
          rejectComment={rejectComment}
          setRejectComment={setRejectComment}
          actionLoading={actionLoading}
          onApprove={approveSelected}
          onReject={rejectSelected}
          t={t}
          getTypeDemandeLabel={getTypeDemandeLabel}
          getStatutBadge={getStatutBadge}
          getResponsableStatus={getResponsableStatus}
          getResponsableStatusLabel={getResponsableStatusLabel}
          getResponsableStatusClass={getResponsableStatusClass}
          formatDate={formatDate}
          formatDateTime={formatDateTime}
        />
      )}
    </div>
  );
};

export default DemandesRH;
