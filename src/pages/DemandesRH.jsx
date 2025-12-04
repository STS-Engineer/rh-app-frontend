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

  const API_BASE_URL = 'https://backend-rh.azurewebsites.net';

  const statuts = ['en_attente', 'approuve', 'refuse'];
  const typesDemande = ['congé', 'autorisation_absence', 'mission'];

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

  const fetchDemandes = useCallback(async () => {
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

      queryParams.append('_t', Date.now());

      const url = `${API_BASE_URL}/api/demandes?${queryParams}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        cache: 'no-cache'
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && Array.isArray(data.demandes)) {
        setDemandes(data.demandes);
      } else {
        setDemandes([]);
      }
      
    } catch (error) {
      console.error('❌ Erreur récupération demandes:', error);
      setError(`Erreur: ${error.message}`);
      setDemandes([]);
    } finally {
      setLoading(false);
    }
  }, [filters, API_BASE_URL]);

  // Effet initial
  useEffect(() => {
    fetchDemandes();
  }, []);

  // Effet pour les changements de filtre
  useEffect(() => {
    const hasActiveFilters = filters.statut || filters.type_demande || filters.date_debut || filters.date_fin;
    setFiltersApplied(hasActiveFilters);
    
    const timer = setTimeout(() => {
      fetchDemandes();
    }, 300);
    
    return () => clearTimeout(timer);
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
  };

  const retryFetch = () => {
    fetchDemandes();
  };

  const getStatutBadge = (statut) => {
    const statutConfig = {
      'en_attente': { label: 'En attente', class: 'badge-warning' },
      'approuve': { label: 'Approuvé', class: 'badge-success' },
      'refuse': { label: 'Refusé', class: 'badge-danger' }
    };
    
    const config = statutConfig[statut] || { label: statut, class: 'badge-secondary' };
    return <span className={`badge ${config.class}`}>{config.label}</span>;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('fr-FR');
    } catch (e) {
      return dateString;
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return '-';
    try {
      return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return timeString;
    }
  };

  const getResponsableName = (responsablePrenom, responsableNom, email) => {
    if (responsablePrenom && responsableNom) {
      return `${responsablePrenom} ${responsableNom}`;
    }
    if (email) {
      const username = email.split('@')[0];
      const nameParts = username.split('.');
      const formattedName = nameParts.map(part => 
        part.charAt(0).toUpperCase() + part.slice(1)
      ).join(' ');
      return formattedName;
    }
    return 'Non assigné';
  };

  const getTypeIcon = (type) => {
    const icons = {
      'congé': '🏖️',
      'autorisation_absence': '⏰',
      'mission': '✈️'
    };
    return icons[type] || '📄';
  };

  const getApprovalStatus = (demande) => {
    const hasSecondResponsable = !!demande.mail_responsable2;
    const responsable1 = getResponsableName(
      demande.responsable1_prenom,
      demande.responsable1_nom,
      demande.mail_responsable1
    );
    const responsable2 = hasSecondResponsable
      ? getResponsableName(
          demande.responsable2_prenom,
          demande.responsable2_nom,
          demande.mail_responsable2
        )
      : null;

    if (demande.statut === 'approuve') {
      if (hasSecondResponsable) {
        if (demande.approuve_responsable1 && demande.approuve_responsable2) {
          return '✅ Approuvée par les deux responsables';
        }
        if (demande.approuve_responsable1 && !demande.approuve_responsable2) {
          return `✅ Approuvée (enregistrée comme approuvée, ${responsable1} a validé)`;
        }
        if (!demande.approuve_responsable1 && demande.approuve_responsable2) {
          return `✅ Approuvée (enregistrée comme approuvée, ${responsable2} a validé)`;
        }
        return '✅ Approuvée';
      }

      if (demande.approuve_responsable1) {
        return `✅ Approuvée par ${responsable1}`;
      }
      return '✅ Approuvée';
    }

    if (demande.statut === 'refuse') {
      if (demande.approuve_responsable1 === false) {
        return `❌ Refusée par ${responsable1} : ${demande.commentaire_refus || 'Raison non spécifiée'}`;
      }
      if (hasSecondResponsable && demande.approuve_responsable2 === false) {
        return `❌ Refusée par ${responsable2} : ${demande.commentaire_refus || 'Raison non spécifiée'}`;
      }
      return `❌ Refusée : ${demande.commentaire_refus || 'Raison non spécifiée'}`;
    }

    if (demande.statut === 'en_attente') {
      if (hasSecondResponsable) {
        if (demande.approuve_responsable1 === true && (demande.approuve_responsable2 == null)) {
          return `⏳ En attente du 2ème responsable (${responsable1} a approuvé)`;
        }
        if (demande.approuve_responsable2 === true && (demande.approuve_responsable1 == null)) {
          return `⏳ En attente du 1er responsable (${responsable2} a approuvé)`;
        }
      }
      return '⏳ En attente d\'approbation';
    }

    return demande.statut;
  };

  const getResponsableStatus = (demande, responsableNumber) => {
    const isResponsable1 = responsableNumber === 1;

    const approuve = isResponsable1
      ? demande.approuve_responsable1
      : demande.approuve_responsable2;

    const mailResponsable = isResponsable1
      ? demande.mail_responsable1
      : demande.mail_responsable2;

    if (!mailResponsable) {
      return null;
    }

    if (approuve === true) {
      return { status: 'approved', label: '✅ Approuvé' };
    }

    if (approuve === false) {
      return { status: 'refused', label: '❌ Refusé' };
    }

    return { status: 'pending', label: '⏳ En attente' };
  };

  const shouldShowSecondResponsable = (demande) => {
    return !!demande.mail_responsable2;
  };

  const handleExportExcel = () => {
    if (!demandes || demandes.length === 0) {
      alert('Aucune demande à exporter');
      return;
    }

    const headers = ['ID', 'Titre', 'Type', 'Statut', 'Employé', 'Matricule', 'Date création'];
    const rows = demandes.map(d => [
      d.id,
      d.titre,
      getTypeDemandeLabel(d.type_demande),
      getStatutLabel(d.statut),
      `${d.employe_prenom} ${d.employe_nom}`,
      d.employe_matricule || '',
      formatDate(d.created_at)
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

  return (
    <div className="demandes-rh">
      <Sidebar />
      
      <div className="main-content">
        {/* Header */}
        <div className="page-header">
          <h1>
            <span className="header-icon">📋</span>
            Gestion des Demandes RH
          </h1>
          <p className="page-subtitle">Suivi et traitement des demandes des collaborateurs</p>
        </div>

        {/* Filtres */}
        <div className="filters-card">
          <div className="card-header">
            <h3 className="card-title">
              <span className="filter-icon">🔍</span>
              Filtres de recherche
            </h3>
            <div className="card-actions">
              <button 
                className="btn btn-outline-primary btn-sm"
                onClick={retryFetch}
                disabled={loading}
              >
                {loading ? '⌛' : '🔄'} Actualiser
              </button>
              <button 
                className="btn btn-outline-secondary btn-sm"
                onClick={clearFilters}
              >
                🧹 Effacer
              </button>
              <button 
                className="btn btn-outline-success btn-sm"
                onClick={handleExportExcel}
                disabled={demandes.length === 0}
              >
                📤 Exporter
              </button>
            </div>
          </div>
          
          <div className="card-body">
            <div className="row filters-row">
              <div className="col-md-3">
                <div className="form-group">
                  <label className="form-label">Statut</label>
                  <select 
                    className="form-select"
                    value={filters.statut}
                    onChange={(e) => handleFilterChange('statut', e.target.value)}
                  >
                    <option value="">Tous les statuts</option>
                    {statuts.map(statut => (
                      <option key={statut} value={statut}>
                        {getStatutLabel(statut)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="col-md-3">
                <div className="form-group">
                  <label className="form-label">Type de demande</label>
                  <select 
                    className="form-select"
                    value={filters.type_demande}
                    onChange={(e) => handleFilterChange('type_demande', e.target.value)}
                  >
                    <option value="">Tous les types</option>
                    {typesDemande.map(type => (
                      <option key={type} value={type}>
                        {getTypeDemandeLabel(type)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="col-md-3">
                <div className="form-group">
                  <label className="form-label">Date de début</label>
                  <input 
                    type="date"
                    className="form-control"
                    value={filters.date_debut}
                    onChange={(e) => handleFilterChange('date_debut', e.target.value)}
                  />
                </div>
              </div>
              
              <div className="col-md-3">
                <div className="form-group">
                  <label className="form-label">Date de fin</label>
                    <input 
                    type="date"
                    className="form-control"
                    value={filters.date_fin}
                    onChange={(e) => handleFilterChange('date_fin', e.target.value)}
                  />
                </div>
              </div>
            </div>
            
            {/* Indicateur de filtres actifs */}
            {(filters.statut || filters.type_demande || filters.date_debut || filters.date_fin) && (
              <div className="active-filters">
                <span className="filter-label">Filtres actifs:</span>
                {filters.statut && (
                  <span className="filter-tag">
                    Statut: {getStatutLabel(filters.statut)}
                  </span>
                )}
                {filters.type_demande && (
                  <span className="filter-tag">
                    Type: {getTypeDemandeLabel(filters.type_demande)}
                  </span>
                )}
                {filters.date_debut && (
                  <span className="filter-tag">
                    À partir du: {formatDate(filters.date_debut)}
                  </span>
                )}
                {filters.date_fin && (
                  <span className="filter-tag">
                    Jusqu'au: {formatDate(filters.date_fin)}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Statistiques */}
        <div className="stats-container">
          <div className="row">
            <div className="col-md-3">
              <div className="stat-card stat-total">
                <div className="stat-icon">📋</div>
                <div className="stat-content">
                  <div className="stat-number">{demandes.length}</div>
                  <div className="stat-label">Total</div>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="stat-card stat-pending">
                <div className="stat-icon">⏳</div>
                <div className="stat-content">
                  <div className="stat-number">
                    {demandes.filter(d => d.statut === 'en_attente').length}
                  </div>
                  <div className="stat-label">En attente</div>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="stat-card stat-approved">
                <div className="stat-icon">✅</div>
                <div className="stat-content">
                  <div className="stat-number">
                    {demandes.filter(d => d.statut === 'approuve').length}
                  </div>
                  <div className="stat-label">Approuvées</div>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="stat-card stat-refused">
                <div className="stat-icon">❌</div>
                <div className="stat-content">
                  <div className="stat-number">
                    {demandes.filter(d => d.statut === 'refuse').length}
                  </div>
                  <div className="stat-label">Refusées</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contenu principal */}
        <div className="content-card">
          <div className="card-header">
            <h3 className="card-title">Liste des demandes</h3>
            <div className="card-subtitle">
              {loading ? (
                <span className="text-warning">⌛ Chargement en cours...</span>
              ) : error ? (
                <span className="text-danger">❌ {error}</span>
              ) : (
                <span className="text-muted">
                  {demandes.length} demande{demandes.length !== 1 ? 's' : ''} trouvée{demandes.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
          
          <div className="card-body">
            {loading ? (
              <div className="loading-container">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Chargement...</span>
                </div>
                <p className="mt-3">Chargement des demandes...</p>
              </div>
            ) : error ? (
              <div className="error-container text-center py-5">
                <div className="error-icon mb-3">⚠️</div>
                <h4 className="text-danger">Erreur de chargement</h4>
                <p className="text-muted mb-4">{error}</p>
                <button 
                  className="btn btn-primary"
                  onClick={retryFetch}
                >
                  🔄 Réessayer
                </button>
              </div>
            ) : demandes.length === 0 ? (
              <div className="empty-container text-center py-5">
                <div className="empty-icon mb-3">📭</div>
                <h4 className="text-muted">Aucune demande trouvée</h4>
                <p className="text-muted mb-4">
                  {filters.statut || filters.type_demande || filters.date_debut || filters.date_fin
                    ? 'Aucune demande ne correspond à vos critères de recherche'
                    : 'Aucune demande disponible pour le moment'
                  }
                </p>
                {(filters.statut || filters.type_demande || filters.date_debut || filters.date_fin) && (
                  <button 
                    className="btn btn-outline-primary"
                    onClick={clearFilters}
                  >
                    🧹 Afficher toutes les demandes
                  </button>
                )}
              </div>
            ) : (
              <div className="demandes-grid">
                {demandes.map(demande => (
                  <div key={demande.id} className="demande-item">
                    <div className="demande-header">
                      <div className="demande-type">
                        <span className="type-icon">{getTypeIcon(demande.type_demande)}</span>
                        <span className="type-text">{getTypeDemandeLabel(demande.type_demande)}</span>
                      </div>
                      <div className="demande-status">
                        {getStatutBadge(demande.statut)}
                      </div>
                    </div>
                    
                    <div className="demande-body">
                      <h5 className="demande-title">{demande.titre || 'Sans titre'}</h5>
                      
                      {/* Informations de l'employé */}
                      <div className="employe-info">
                        <div className="avatar">
                          {demande.employe_photo ? (
                            <img 
                              src={demande.employe_photo} 
                              alt={`${demande.employe_prenom} ${demande.employe_nom}`}
                              className="employee-photo"
                            />
                          ) : (
                            <div className="avatar-default">
                              {demande.employe_prenom?.[0]}{demande.employe_nom?.[0]}
                            </div>
                          )}
                        </div>
                        <div className="employe-details">
                          <h6>{demande.employe_prenom} {demande.employe_nom}</h6>
                          <p className="text-muted">
                            {demande.employe_poste || 'Non spécifié'} • 
                            Matricule: {demande.employe_matricule || 'N/A'}
                          </p>
                        </div>
                      </div>
                      
                      {/* Statut d'approbation */}
                      <div className="approval-status">
                        <strong>Statut d'approbation:</strong> {getApprovalStatus(demande)}
                      </div>
                      
                      {/* Détails spécifiques selon le type de demande */}
                      <div className="demande-details">
                        {demande.type_demande === 'congé' && (
                          <>
                            {demande.date_depart && (
                              <div className="detail-row">
                                <span className="detail-label">📅 Date de départ:</span>
                                <span className="detail-value">{formatDate(demande.date_depart)}</span>
                              </div>
                            )}
                            {demande.date_retour && (
                              <div className="detail-row">
                                <span className="detail-label">📅 Date de retour:</span>
                                <span className="detail-value">{formatDate(demande.date_retour)}</span>
                              </div>
                            )}
                            {demande.type_conge && (
                              <div className="detail-row">
                                <span className="detail-label">📋 Type de congé:</span>
                                <span className="detail-value">{demande.type_conge}</span>
                              </div>
                            )}
                            {demande.type_conge_autre && (
                              <div className="detail-row">
                                <span className="detail-label">📝 Autre type:</span>
                                <span className="detail-value">{demande.type_conge_autre}</span>
                              </div>
                            )}
                            {demande.demi_journee && (
                              <div className="detail-row">
                                <span className="detail-label">⏰ Demi-journée:</span>
                                <span className="detail-value">Oui</span>
                              </div>
                            )}
                          </>
                        )}

                        {demande.type_demande === 'autorisation_absence' && (
                          <>
                            {demande.date_depart && (
                              <div className="detail-row">
                                <span className="detail-label">📅 Date:</span>
                                <span className="detail-value">{formatDate(demande.date_depart)}</span>
                              </div>
                            )}
                            {demande.heure_depart && (
                              <div className="detail-row">
                                <span className="detail-label">⏰ Heure de départ:</span>
                                <span className="detail-value">{formatTime(demande.heure_depart)}</span>
                              </div>
                            )}
                            {demande.heure_retour && (
                              <div className="detail-row">
                                <span className="detail-label">⏰ Heure de retour:</span>
                                <span className="detail-value">{formatTime(demande.heure_retour)}</span>
                              </div>
                            )}
                            {demande.demi_journee && (
                              <div className="detail-row">
                                <span className="detail-label">⏰ Demi-journée:</span>
                                <span className="detail-value">Oui</span>
                              </div>
                            )}
                          </>
                        )}

                        {demande.type_demande === 'mission' && (
                          <>
                            {demande.date_depart && (
                              <div className="detail-row">
                                <span className="detail-label">📅 Date de départ:</span>
                                <span className="detail-value">{formatDate(demande.date_depart)}</span>
                              </div>
                            )}
                            {demande.date_retour && (
                              <div className="detail-row">
                                <span className="detail-label">📅 Date de retour:</span>
                                <span className="detail-value">{formatDate(demande.date_retour)}</span>
                              </div>
                            )}
                            {demande.frais_deplacement && (
                              <div className="detail-row">
                                <span className="detail-label">💰 Frais de mission:</span>
                                <span className="detail-value">
                                  {parseFloat(demande.frais_deplacement).toFixed(2)} €
                                </span>
                              </div>
                            )}
                          </>
                        )}
                        
                        {/* Informations communes */}
                        <div className="detail-row">
                          <span className="detail-label">📅 Date création:</span>
                          <span className="detail-value">{formatDate(demande.created_at)}</span>
                        </div>
                        
                        <div className="detail-row">
                          <span className="detail-label">🔄 Dernière mise à jour:</span>
                          <span className="detail-value">{formatDate(demande.updated_at)}</span>
                        </div>
                      </div>
                      
                      {/* Responsables d'approbation */}
                      <div className="approval-section">
                        <h6 className="approval-title">🏢 Responsables d'approbation</h6>
                        <div className="approval-grid">
                          {/* Responsable 1 */}
                          {demande.mail_responsable1 && (() => {
                            const r1Status = getResponsableStatus(demande, 1);
                            if (!r1Status) return null;

                            return (
                              <div className="approval-item">
                                <div className="responsable-info">
                                  <span className="responsable-name">
                                    {getResponsableName(
                                      demande.responsable1_prenom,
                                      demande.responsable1_nom,
                                      demande.mail_responsable1
                                    )}
                                  </span>
                                  <span className="responsable-email">
                                    {demande.mail_responsable1}
                                  </span>
                                </div>
                                <span className={`approval-badge ${r1Status.status}`}>
                                  {r1Status.label}
                                </span>
                              </div>
                            );
                          })()}

                          {/* Responsable 2 */}
                          {shouldShowSecondResponsable(demande) && (() => {
                            const r2Status = getResponsableStatus(demande, 2);
                            if (!r2Status) return null;

                            return (
                              <div className="approval-item">
                                <div className="responsable-info">
                                  <span className="responsable-name">
                                    {getResponsableName(
                                      demande.responsable2_prenom,
                                      demande.responsable2_nom,
                                      demande.mail_responsable2
                                    )}
                                  </span>
                                  <span className="responsable-email">
                                    {demande.mail_responsable2}
                                  </span>
                                </div>
                                <span className={`approval-badge ${r2Status.status}`}>
                                  {r2Status.label}
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                      
                      {/* Commentaire de refus */}
                      {demande.commentaire_refus && (
                        <div className="commentaire-box">
                          <div className="commentaire-label">💬 Commentaire de refus</div>
                          <p className="commentaire-text">{demande.commentaire_refus}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="demande-footer">
                      <span className="demande-id">ID: {demande.id}</span>
                      <span className="demande-date">
                        Créé le: {formatDate(demande.created_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="footer-info">
          <div className="row">
            <div className="col-md-6">
              <small className="text-muted">
                Dernière mise à jour: {new Date().toLocaleTimeString('fr-FR')}
              </small>
            </div>
            <div className="col-md-6 text-end">
              <small className="text-muted">
                Système de gestion des demandes RH
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemandesRH;
