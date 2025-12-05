import React, { useState, useEffect, useCallback } from 'react';
import './DemandesRH.css';
import Sidebar from '../components/Sidebar';

const DemandesRH = () => {
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

  // Fonction utilitaire pour compter les filtres actifs
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
      'en_attente': 'En attente',
      'approuve': 'Approuvé',
      'refuse': 'Refusé'
    };
    return labels[statut] || statut;
  };

  const getTypeDemandeLabel = (type) => {
    const labels = {
      'congé': 'Congé',
      'autorisation_absence': 'Autorisation d\'absence',
      'mission': 'Mission'
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
      'approved': 'Approuvé',
      'refused': 'Refusé',
      'pending': 'En attente'
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
        setError('Token d\'authentification manquant');
        setDemandes([]);
        setLoading(false);
        return;
      }

      // DEBUG : Afficher les filtres envoyés
      console.log('🔍 Debug frontend - Filtres envoyés:', {
        type_demande: filters.type_demande,
        statut: filters.statut,
        date_debut: filters.date_debut,
        date_fin: filters.date_fin,
        rawType: typeof filters.type_demande,
        isEmpty: filters.type_demande === ''
      });

      // Utiliser la route standard /api/demandes
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
      console.log('🔗 URL de la requête:', url);
      console.log('🔍 Filtres actifs:', {
        statut: filters.statut || 'tous',
        type_demande: filters.type_demande || 'tous',
        date_debut: filters.date_debut || 'toutes',
        date_fin: filters.date_fin || 'toutes'
      });

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        cache: 'no-cache'
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erreur serveur:', errorText);
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📊 Données reçues:', {
        success: data.success,
        count: data.demandes?.length || 0,
        hasData: !!data.demandes && Array.isArray(data.demandes)
      });
      
      setLastResponse(data);
      
      if (data.success && Array.isArray(data.demandes)) {
        setDemandes(data.demandes);
        console.log(`✅ ${data.demandes.length} demandes chargées avec succès`);
      } else {
        console.warn('⚠️ Réponse inattendue du serveur:', data);
        setDemandes([]);
      }
      
    } catch (error) {
      console.error('❌ Erreur récupération demandes:', error);
      setError(`Erreur de connexion: ${error.message}`);
      setDemandes([]);
    } finally {
      setLoading(false);
    }
  }, [filters, API_BASE_URL]);

  // Effet initial
  useEffect(() => {
    console.log('🚀 Composant monté - Chargement initial');
    fetchDemandes(true);
  }, []);

  // Effet pour les changements de filtre
  useEffect(() => {
    console.log('🔄 Filtres modifiés:', filters);
    
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    // Vérifier si des filtres sont actifs
    const hasActiveFilters = activeFiltersCount > 0;
    setFiltersApplied(hasActiveFilters);
    
    const newTimeoutId = setTimeout(() => {
      console.log('📤 Envoi des filtres au serveur');
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
    console.log(`📝 Modification filtre ${key}: "${value}" (ancienne valeur: "${filters[key]}")`);
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    console.log('🧹 Effacement de tous les filtres');
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
    console.log('🔄 Nouvelle tentative de chargement');
    fetchDemandes(true);
  };

  const getStatutBadge = (statut) => {
    const statutConfig = {
      'en_attente': { label: 'En attente', class: 'statut-en-attente' },
      'approuve': { label: 'Approuvé', class: 'statut-approuve' },
      'refuse': { label: 'Refusé', class: 'statut-refuse' }
    };
    
    const config = statutConfig[statut] || { label: statut, class: 'statut-default' };
    return <span className={`statut-badge ${config.class}`}>{config.label}</span>;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
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
      alert('Aucune demande à exporter');
      return;
    }

    const headers = ['ID', 'Titre', 'Type', 'Type Congé', 'Statut', 'Employé', 'Matricule', 'Date création', 'Responsable 1', 'Responsable 2'];
    const rows = demandes.map(d => [
      d.id,
      d.titre,
      getTypeDemandeLabel(d.type_demande),
      d.type_conge === 'autre' ? d.type_conge_autre || 'Autre' : d.type_conge || '',
      getStatutLabel(d.statut),
      `${d.employe_prenom} ${d.employe_nom}`,
      d.employe_matricule || '',
      formatDate(d.created_at),
      d.mail_responsable1 || 'Non assigné',
      d.mail_responsable2 || 'Non requis'
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

  // Fonction de test pour vérifier les filtres
  const testFiltres = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    console.log('🧪 Test des filtres...');
    
    // Test avec "congé"
    const testUrl = `${API_BASE_URL}/api/debug/demandes-filtres?type_demande=congé`;
    try {
      const response = await fetch(testUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      console.log('🧪 Résultat test "congé":', data);
    } catch (error) {
      console.error('❌ Erreur test:', error);
    }
  };

  const Modal = ({ demande, onClose }) => {
    if (!demande) return null;

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>📋 Détails de la demande</h2>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
          
          <div className="modal-body">
            <div className="modal-section">
              <h3>Informations générales</h3>
              <div className="info-grid">
                <div className="info-item">
                  <strong>Titre:</strong> {demande.titre}
                </div>
                <div className="info-item">
                  <strong>Type:</strong> {getTypeDemandeLabel(demande.type_demande)}
                </div>
                {demande.type_conge && (
                  <div className="info-item">
                    <strong>Type de congé:</strong> {demande.type_conge === 'autre' 
                      ? demande.type_conge_autre || 'Autre' 
                      : demande.type_conge}
                  </div>
                )}
                <div className="info-item">
                  <strong>Statut:</strong> {getStatutBadge(demande.statut)}
                </div>
                <div className="info-item">
                  <strong>Créé le:</strong> {formatDateTime(demande.created_at)}
                </div>
              </div>
            </div>

            <div className="modal-section">
              <h3>Informations employé</h3>
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
                  <p><strong>Poste:</strong> {demande.employe_poste || 'N/A'}</p>
                  <p><strong>Matricule:</strong> {demande.employe_matricule || 'N/A'}</p>
                </div>
              </div>
            </div>

            <div className="modal-section">
              <h3>Processus d'approbation</h3>
              <div className="approval-process">
                <div className="approval-step">
                  <div className="step-header">
                    <span className="step-title">Responsable 1</span>
                    <span className={`step-status ${getResponsableStatusClass(getResponsableStatus(demande, 1))}`}>
                      {getResponsableStatusLabel(getResponsableStatus(demande, 1))}
                    </span>
                  </div>
                  <div className="step-details">
              
                    <p><strong>Email:</strong> {demande.mail_responsable1 || 'N/A'}</p>
                  </div>
                </div>

                <div className="approval-step">
                  <div className="step-header">
                    <span className="step-title">Responsable 2</span>
                    {demande.mail_responsable2 && (
                      <span className={`step-status ${getResponsableStatusClass(getResponsableStatus(demande, 2))}`}>
                        {getResponsableStatusLabel(getResponsableStatus(demande, 2))}
                      </span>
                    )}
                  </div>
                  <div className="step-details">
                 
                    <p><strong>Email:</strong> {demande.mail_responsable2 || 'Non applicable'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-section">
              <h3>Détails de la demande</h3>
              <div className="details-grid">
                {demande.date_depart && (
                  <div className="detail-row">
                    <span className="detail-label">📅 Date début:</span>
                    <span className="detail-value">{formatDate(demande.date_depart)}</span>
                  </div>
                )}
                {demande.date_retour && (
                  <div className="detail-row">
                    <span className="detail-label">📅 Date retour:</span>
                    <span className="detail-value">{formatDate(demande.date_retour)}</span>
                  </div>
                )}
                {demande.heure_depart && (
                  <div className="detail-row">
                    <span className="detail-label">⏰ Heure départ:</span>
                    <span className="detail-value">{demande.heure_depart}</span>
                  </div>
                )}
                {demande.heure_retour && (
                  <div className="detail-row">
                    <span className="detail-label">⏰ Heure retour:</span>
                    <span className="detail-value">{demande.heure_retour}</span>
                  </div>
                )}
                {demande.frais_deplacement && (
                  <div className="detail-row">
                    <span className="detail-label">💰 Frais déplacement:</span>
                    <span className="detail-value">{demande.frais_deplacement} DH</span>
                  </div>
                )}
                {demande.demi_journee && (
                  <div className="detail-row">
                    <span className="detail-label">🕐 Demi-journée:</span>
                    <span className="detail-value">Oui</span>
                  </div>
                )}
              </div>
            </div>

            {demande.commentaire_refus && (
              <div className="modal-section">
                <h3>💬 Commentaire de refus</h3>
                <div className="commentaire-box">
                  <p>{demande.commentaire_refus}</p>
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button className="btn-close-modal" onClick={onClose}>
              Fermer
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
        <h1>📋 Consultation des Demandes RH</h1>
        <p>Visualisation et suivi des demandes des collaborateurs</p>
      </div>

      {error && (
        <div className="error-banner">
          <div className="error-content">
            <span className="error-icon">⚠️</span>
            <div className="error-details">
              <h4>Erreur</h4>
              <p>{error}</p>
            </div>
            <button className="btn-retry" onClick={retryFetch}>
              🔄 Réessayer
            </button>
            <button className="btn-test" onClick={testFiltres}>
              🧪 Tester filtres
            </button>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="filters-section">
        <div className="filters-header">
          <h3>🔍 Filtres de recherche</h3>
          <div className="filters-actions">
            <button className="btn-export" onClick={handleExportExcel} disabled={demandes.length === 0}>
              📤 Exporter Excel
            </button>
            <button className="btn-refresh" onClick={retryFetch}>
              🔄 Actualiser
            </button>
            {filtersApplied && (
              <button className="btn-clear" onClick={clearFilters}>
                🧹 Effacer filtres
              </button>
            )}
          </div>
        </div>
        
        <div className="filters-grid">
          <div className="filter-group">
            <label>Statut</label>
            <select 
              value={filters.statut} 
              onChange={(e) => handleFilterChange('statut', e.target.value)}
            >
              <option value="">Tous les statuts</option>
              {statuts.map(s => (
                <option key={s} value={s}>{getStatutLabel(s)}</option>
              ))}
            </select>
          </div>

       

          <div className="filter-group">
            <label>Date début</label>
            <input 
              type="date" 
              value={filters.date_debut}
              onChange={(e) => handleFilterChange('date_debut', e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label>Date fin</label>
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
              Filtres actifs ({activeFiltersCount}): 
              {filters.statut && <span className="tag">Statut: {getStatutLabel(filters.statut)}</span>}
              {filters.type_demande && <span className="tag">Type: {getTypeDemandeLabel(filters.type_demande)}</span>}
              {filters.date_debut && <span className="tag">À partir du: {formatDate(filters.date_debut)}</span>}
              {filters.date_fin && <span className="tag">Jusqu'au: {formatDate(filters.date_fin)}</span>}
            </span>
          </div>
        )}
      </div>

      {/* Statistiques */}
      <div className="stats-section">
        <div className="stat-card total">
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <div className="stat-number">{demandes.length}</div>
            <div className="stat-label">Total demandes</div>
          </div>
        </div>
        <div className="stat-card pending">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <div className="stat-number">{demandes.filter(d => d.statut === 'en_attente').length}</div>
            <div className="stat-label">En attente</div>
          </div>
        </div>
        <div className="stat-card approved">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-number">{demandes.filter(d => d.statut === 'approuve').length}</div>
            <div className="stat-label">Approuvées</div>
          </div>
        </div>
        <div className="stat-card refused">
          <div className="stat-icon">❌</div>
          <div className="stat-content">
            <div className="stat-number">{demandes.filter(d => d.statut === 'refuse').length}</div>
            <div className="stat-label">Refusées</div>
          </div>
        </div>
      </div>

      {/* Liste des demandes */}
      <div className="demandes-content">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Chargement des demandes...</p>
            {filtersApplied && <p className="loading-sub">Application des filtres</p>}
          </div>
        ) : error ? (
          <div className="error-state">
            <div className="error-icon">⚠️</div>
            <h3>Erreur de chargement</h3>
            <p>{error}</p>
            <button className="btn-retry" onClick={retryFetch}>
              Réessayer
            </button>
          </div>
        ) : demandes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>Aucune demande trouvée</h3>
            <p>
              {filtersApplied 
                ? 'Aucune demande ne correspond à vos critères de recherche' 
                : 'Aucune demande disponible pour le moment'
              }
            </p>
            {filtersApplied && (
              <button className="btn-clear-all" onClick={clearFilters}>
                Afficher toutes les demandes
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="results-header">
              <h3>Résultats ({demandes.length})</h3>
              <div className="results-info">
                {lastResponse?.pagination && (
                  <span className="pagination-info">
                    Page {lastResponse.pagination.page} sur {lastResponse.pagination.pages}
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
                        <p>{demande.employe_poste} • Matricule: {demande.employe_matricule || 'N/A'}</p>
                      </div>
                    </div>
                    
                    {/* Afficher le type de congé si applicable */}
                    {demande.type_conge && (
                      <div className="detail type-conge">
                        <span className="label">🎯 Type de congé:</span>
                        <span className="value">
                          {demande.type_conge === 'autre' 
                            ? demande.type_conge_autre || 'Autre' 
                            : demande.type_conge}
                        </span>
                      </div>
                    )}
                    
                    <div className="approval-status">
                      <strong>Processus d'approbation :</strong>
                    </div>
                    
                    <div className="responsables-section">
                      <div className="responsable-card">
                        <div className="responsable-header">
                          
                          <div className={`responsable-status ${getResponsableStatusClass(getResponsableStatus(demande, 1))}`}>
                            {getResponsableStatusLabel(getResponsableStatus(demande, 1))}
                          </div>
                        </div>
                        <div className="responsable-email">
                          {demande.mail_responsable1 || 'Email non disponible'}
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
                          {demande.mail_responsable2 || 'Non applicable'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="demande-details">
                      {demande.date_depart && (
                        <div className="detail">
                          <span className="label">📅 Date début:</span>
                          <span className="value">{formatDate(demande.date_depart)}</span>
                        </div>
                      )}
                      
                      {demande.date_retour && (
                        <div className="detail">
                          <span className="label">📅 Date retour:</span>
                          <span className="value">{formatDate(demande.date_retour)}</span>
                        </div>
                      )}
                      
                      {demande.heure_depart && (
                        <div className="detail">
                          <span className="label">⏰ Heure départ:</span>
                          <span className="value">{demande.heure_depart}</span>
                        </div>
                      )}
                      
                      {demande.frais_deplacement && (
                        <div className="detail">
                          <span className="label">💰 Frais déplacement:</span>
                          <span className="value">{demande.frais_deplacement} DH</span>
                        </div>
                      )}
                      
                      <div className="detail">
                        <span className="label">📝 Créé le:</span>
                        <span className="value">{formatDate(demande.created_at)}</span>
                      </div>
                      
                      <div className="detail">
                        <span className="label">🔄 Dernière mise à jour:</span>
                        <span className="value">{formatDate(demande.updated_at)}</span>
                      </div>
                    </div>
                    
                    {demande.commentaire_refus && (
                      <div className="commentaire">
                        <div className="comment-label">💬 Commentaire de refus:</div>
                        <p>{demande.commentaire_refus}</p>
                      </div>
                    )}
                    
                    {/* Bouton d'action unique - Voir détails seulement */}
                    <div className="card-actions">
                      <button className="btn-action btn-view" onClick={() => handleViewDetails(demande)}>
                        👁️ Voir les détails complets
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal de détails */}
      {showModal && <Modal demande={selectedDemande} onClose={() => setShowModal(false)} />}
    </div>
  );
};

export default DemandesRH;
