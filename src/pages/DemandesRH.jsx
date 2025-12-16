import React, { useState, useEffect, useCallback } from 'react';
import './DemandesRH.css';
import Sidebar from '../components/Sidebar';
import { useLanguage } from '../contexts/LanguageContext';


const DemandesRH = () => {
  const { t } = useLanguage();
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    statut: '',
    type_demande: '',
    date_debut: '',
    date_fin: ''
  });
  const [filtersApplied, setFiltersApplied] = useState(false);
  const [timeoutId, setTimeoutId] = useState(null);
  const [lastResponse, setLastResponse] = useState(null);
  const [selectedDemande, setSelectedDemande] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const API_BASE_URL = 'https://backend-rh.azurewebsites.net';

  const statuts = ['en_attente', 'approuve', 'refuse'];
  const typesDemande = ['congé', 'autorisation_absence', 'mission'];

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.statut) count++;
    if (filters.type_demande) count++;
    if (filters.date_debut) count++;
    if (filters.date_fin) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  const getStatutLabel = (statut) => {
    const labels = {
      'en_attente': t('pending'),
      'approuve': t('approved'),
      'refuse': t('refused')
    };
    return labels[statut] || statut;
  };

  const getTypeDemandeLabel = (type) => {
    const labels = {
      'congé': t('leave'),
      'autorisation_absence': t('absenceAuthorization'),
      'mission': t('mission')
    };
    return labels[type] || type;
  };

  const getResponsableStatus = (demande, responsableNum) => {
    if (responsableNum === 1) {
      if (demande.approuve_responsable1 === true) return 'approved';
      if (demande.approuve_responsable1 === false) return 'refused';
      return 'pending';
    } else {
      if (demande.approuve_responsable2 === true) return 'approved';
      if (demande.approuve_responsable2 === false) return 'refused';
      return 'pending';
    }
  };

  const getResponsableStatusLabel = (status) => {
    const labels = {
      'approved': t('approved'),
      'refused': t('refused'),
      'pending': t('pending')
    };
    return labels[status] || status;
  };

  const getResponsableStatusClass = (status) => {
    const classes = {
      'approved': 'status-approved',
      'refused': 'status-refused',
      'pending': 'status-pending'
    };
    return classes[status] || '';
  };

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
      
      if (filters.statut) {
        queryParams.append('statut', filters.statut);
      }
      
      if (filters.type_demande) {
        queryParams.append('type_demande', filters.type_demande);
      }
      
      if (filters.date_debut) {
        queryParams.append('date_debut', filters.date_debut);
      }
      
      if (filters.date_fin) {
        queryParams.append('date_fin', filters.date_fin);
      }

      if (force) {
        queryParams.append('_t', Date.now());
      }

      const url = `${API_BASE_URL}/api/demandes?${queryParams}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        cache: 'no-cache'
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ ' + t('serverError'), errorText);
        throw new Error(`${t('error')} ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      setLastResponse(data);
      
      if (data.success && Array.isArray(data.demandes)) {
        setDemandes(data.demandes);
      } else {
        setDemandes([]);
      }
      
    } catch (error) {
      console.error('❌ ' + t('errorFetchingRequests'), error);
      setError(`${t('connectionError')}: ${error.message}`);
      setDemandes([]);
    } finally {
      setLoading(false);
    }
  }, [filters, API_BASE_URL, t]);

  useEffect(() => {
    fetchDemandes(true);
  }, []);

  useEffect(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    const hasActiveFilters = activeFiltersCount > 0;
    setFiltersApplied(hasActiveFilters);
    
    const newTimeoutId = setTimeout(() => {
      fetchDemandes(true);
    }, 300);
    
    setTimeoutId(newTimeoutId);
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [filters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      statut: '',
      type_demande: '',
      date_debut: '',
      date_fin: ''
    });
    setFiltersApplied(false);
    setTimeout(() => fetchDemandes(true), 100);
  };

  const retryFetch = () => {
    fetchDemandes(true);
  };

  const getStatutBadge = (statut) => {
    const statutConfig = {
      'en_attente': { label: t('pending'), class: 'statut-en-attente' },
      'approuve': { label: t('approved'), class: 'statut-approuve' },
      'refuse': { label: t('refused'), class: 'statut-refuse' }
    };
    
    const config = statutConfig[statut] || { label: statut, class: 'statut-default' };
    return <span className={`statut-badge ${config.class}`}>{config.label}</span>;
  };

  const formatDate = (dateString) => {
    if (!dateString) return t('na');
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString();
    } catch (e) {
      return dateString;
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return t('na');
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch (e) {
      return dateString;
    }
  };

  const getTypeIcon = (type) => {
    const icons = {
      'congé': '🏖️',
      'autorisation_absence': '⏰',
      'mission': '✈️'
    };
    return icons[type] || '📄';
  };

  const handleViewDetails = (demande) => {
    setSelectedDemande(demande);
    setShowModal(true);
  };

  const handleExportExcel = () => {
    if (!demandes || demandes.length === 0) {
      alert(t('noRequestsToExport'));
      return;
    }

    const headers = ['ID', t('title'), t('type'), t('leaveType'), t('status'), t('employee'), t('employeeID'), t('creationDate'), t('supervisor1'), t('supervisor2')];
    const rows = demandes.map(d => [
      d.id,
      d.titre,
      getTypeDemandeLabel(d.type_demande),
      d.type_conge === 'autre' ? d.type_conge_autre || t('other') : d.type_conge || '',
      getStatutLabel(d.statut),
      `${d.employe_prenom} ${d.employe_nom}`,
      d.employe_matricule || '',
      formatDate(d.created_at),
      d.mail_responsable1 || t('notAssigned'),
      d.mail_responsable2 || t('notRequired')
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(';'))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `demandes_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const Modal = ({ demande, onClose }) => {
    if (!demande) return null;

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>📋 {t('requestDetails')}</h2>
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
                    <strong>{t('leaveType')}:</strong> {demande.type_conge === 'autre' 
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
                {demande.frais_deplacement && (
                  <div className="detail-row">
                    <span className="detail-label">💰 {t('travelExpenses')}:</span>
                    <span className="detail-value">{demande.frais_deplacement} DH</span>
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
          </div>

          <div className="modal-footer">
            <button className="btn-close-modal" onClick={onClose}>
              {t('close')}
            </button>
          </div>
        </div>
      </div>
    );
  };

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
            <select 
              value={filters.statut} 
              onChange={(e) => handleFilterChange('statut', e.target.value)}
            >
              <option value="">{t('allStatus')}</option>
              {statuts.map(s => (
                <option key={s} value={s}>{getStatutLabel(s)}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>{t('type')}</label>
            <select 
              value={filters.type_demande} 
              onChange={(e) => handleFilterChange('type_demande', e.target.value)}
            >
              <option value="">{t('allTypes')}</option>
              {typesDemande.map(s => (
                <option key={s} value={s}>{getTypeDemandeLabel(s)}</option>
              ))}
            </select>
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
            <span className="filter-tag">
              {t('activeFilters')} ({activeFiltersCount}): 
              {filters.statut && <span className="tag">{t('status')}: {getStatutLabel(filters.statut)}</span>}
              {filters.type_demande && <span className="tag">{t('type')}: {getTypeDemandeLabel(filters.type_demande)}</span>}
              {filters.date_debut && <span className="tag">{t('fromDate')}: {formatDate(filters.date_debut)}</span>}
              {filters.date_fin && <span className="tag">{t('toDate')}: {formatDate(filters.date_fin)}</span>}
            </span>
          </div>
        )}
      </div>

      <div className="stats-section">
        <div className="stat-card total">
          <div className="stat-icon"><span className="fi fi-rr-rectangle-list"></span></div>
          <div className="stat-content">
            <div className="stat-number">{demandes.length}</div>
            <div className="stat-label">{t('totalRequests')}</div>
          </div>
        </div>
        <div className="stat-card pending">
          <div className="stat-icon"><span className="fi fi-rr-hourglass-end"></span></div>
          <div className="stat-content">
            <div className="stat-number">{demandes.filter(d => d.statut === 'en_attente').length}</div>
            <div className="stat-label">{t('pending')}</div>
          </div>
        </div>
        <div className="stat-card approved">
          <div className="stat-icon"><span className="fi fi-rs-badge-check"></span></div>
          <div className="stat-content">
            <div className="stat-number">{demandes.filter(d => d.statut === 'approuve').length}</div>
            <div className="stat-label">{t('approved')}</div>
          </div>
        </div>
        <div className="stat-card refused">
          <div className="stat-icon"><span className="fi fi-bs-shield-xmar"></span></div>
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
            <button className="btn-retry" onClick={retryFetch}>
              {t('retry')}
            </button>
          </div>
        ) : demandes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>{t('noRequests')}</h3>
            <p>
              {filtersApplied 
                ? t('noMatchingCriteria') 
                : t('noRequestsAvailable')
              }
            </p>
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
                    <div className="demande-status">
                      {getStatutBadge(demande.statut)}
                    </div>
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
                      
                      {demande.frais_deplacement && (
                        <div className="detail">
                          <span className="label">💰 {t('travelExpenses')}:</span>
                          <span className="value">{demande.frais_deplacement} DH</span>
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
                    
                    <div className="card-actions">
                      <button className="btn-action btn-view" onClick={() => handleViewDetails(demande)}>
                        👁️ {t('viewDetails')}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {showModal && <Modal demande={selectedDemande} onClose={() => setShowModal(false)} />}
    </div>
  );
};

export default DemandesRH;
