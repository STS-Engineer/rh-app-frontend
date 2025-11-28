import React, { useState, useEffect, useCallback } from 'react';
import './DemandesRH.css';

const DemandesRH = () => {
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    statut: '',
    date_debut: '',
    date_fin: ''
  });

  const API_BASE_URL = 'https://backend-rh.azurewebsites.net';

  const statuts = [
    'en_attente',
    'approuve',
    'refuse'
  ];

  // ✅ fetchDemandes mémorisée, dépend de filters
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
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== '') {
          queryParams.append(key, value);
        }
      });

      const response = await fetch(`${API_BASE_URL}/api/demandes?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setDemandes(data.demandes || []);
      
    } catch (error) {
      console.error('❌ Erreur récupération demandes:', error);
      setError(error.message);
      setDemandes([]);
    } finally {
      setLoading(false);
    }
  }, [filters, API_BASE_URL]);

  // ✅ Respecte react-hooks/exhaustive-deps (dépend de fetchDemandes)
  useEffect(() => {
    fetchDemandes();
  }, [fetchDemandes]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const getStatutBadge = (statut) => {
    const statutConfig = {
      'en_attente': { label: 'En attente', class: 'statut-en-attente' },
      'approuve': { label: 'Approuvé', class: 'statut-approuve' },
      'refuse': { label: 'Refusé', class: 'statut-refuse' },
      'en_cours': { label: 'En cours', class: 'statut-en-cours' }
    };
    
    const config = statutConfig[statut] || { label: statut, class: 'statut-default' };
    return <span className={`statut-badge ${config.class}`}>{config.label}</span>;
  };

  const getTypeDemandeLabel = (type) => {
    const labels = {
      'congé': 'Congé',
      'autorisation_absence': 'Autorisation d\'absence',
      'frais_deplacement': 'Frais de déplacement',
      'autre': 'Autre'
    };
    return labels[type] || type;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
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

  // ✅ Statut global d'approbation (texte)
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

  // ✅ Statut individuel d'un responsable (badge)
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

  const clearFilters = () => {
    setFilters({
      statut: '',
      date_debut: '',
      date_fin: ''
    });
  };

  const retryFetch = () => {
    setError(null);
    fetchDemandes();
  };

  const getTypeIcon = (type) => {
    const icons = {
      'congé': '🏖️',
      'autorisation_absence': '⏰',
      'frais_deplacement': '💰',
      'autre': '📄'
    };
    return icons[type] || '📋';
  };

  return (
    <div className="demandes-rh">
      <div className="demandes-header">
        <h1>📋 Gestion des Demandes</h1>
        <p>Suivi et traitement des demandes des collaborateurs</p>
      </div>

      {error && (
        <div className="error-banner">
          <div className="error-content">
            <span className="error-icon">⚠️</span>
            <div className="error-details">
              <h4>Erreur de connexion</h4>
              <p>{error}</p>
            </div>
            <button className="btn-retry" onClick={retryFetch}>
              🔄 Réessayer
            </button>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="filters-section">
        <div className="filters-header">
          <h3>🔍 Filtres de recherche</h3>
          <button className="btn-clear" onClick={clearFilters}>
            Effacer les filtres
          </button>
        </div>
        
        <div className="filters-grid">
          <div className="filter-group">
            <label>Statut de la demande</label>
            <select 
              value={filters.statut} 
              onChange={(e) => handleFilterChange('statut', e.target.value)}
            >
              <option value="">Tous les statuts</option>
              {statuts.map(statut => (
                <option key={statut} value={statut}>
                  {getStatutBadge(statut).props.children}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Date de début</label>
            <input 
              type="date" 
              value={filters.date_debut}
              onChange={(e) => handleFilterChange('date_debut', e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label>Date de fin</label>
            <input 
              type="date" 
              value={filters.date_fin}
              onChange={(e) => handleFilterChange('date_fin', e.target.value)}
            />
          </div>
        </div>

        <div className="filters-info">
          <small>Les filtres s'appliquent automatiquement</small>
        </div>
      </div>

      {/* Statistiques */}
      <div className="stats-section">
        <div className="stat-card">
          <div className="stat-icon">📥</div>
          <div className="stat-info">
            <div className="stat-number">{demandes.length}</div>
            <div className="stat-label">Total demandes</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-info">
            <div className="stat-number">
              {demandes.filter(d => d.statut === 'en_attente').length}
            </div>
            <div className="stat-label">En attente</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <div className="stat-number">
              {demandes.filter(d => d.statut === 'approuve').length}
            </div>
            <div className="stat-label">Approuvées</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">❌</div>
          <div className="stat-info">
            <div className="stat-number">
              {demandes.filter(d => d.statut === 'refuse').length}
            </div>
            <div className="stat-label">Refusées</div>
          </div>
        </div>
      </div>

      {/* Liste des demandes */}
      <div className="demandes-list">
        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
            Chargement des demandes...
          </div>
        ) : error ? (
          <div className="no-data">
            <div className="no-data-icon">🚫</div>
            <h3>Impossible de charger les demandes</h3>
            <p>{error}</p>
            <button className="btn-primary" onClick={retryFetch}>
              🔄 Réessayer
            </button>
          </div>
        ) : demandes.length === 0 ? (
          <div className="no-data">
            <div className="no-data-icon">📭</div>
            <h3>Aucune demande trouvée</h3>
            <p>Ajustez vos filtres ou vérifiez si des demandes existent</p>
            <button className="btn-primary" onClick={fetchDemandes}>
              🔄 Actualiser
            </button>
          </div>
        ) : (
          <div className="demandes-grid">
            {demandes.map(demande => (
              <div key={demande.id} className="demande-card">
                {/* En-tête de la carte */}
                <div className="demande-card-header">
                  <div className="demande-type-icon">
                    {getTypeIcon(demande.type_demande)}
                  </div>
                  <div className="demande-title-section">
                    <h3 className="demande-title">{demande.titre}</h3>
                    <span className="demande-type">
                      {getTypeDemandeLabel(demande.type_demande)}
                    </span>
                  </div>
                  <div className="demande-meta">
                    {getStatutBadge(demande.statut)}
                    <span className="demande-date">
                      {formatDate(demande.created_at)}
                    </span>
                  </div>
                </div>

                {/* Informations du collaborateur */}
                <div className="employe-section">
                  <div className="employe-avatar">
                    {demande.employe_photo ? (
                      <img
                        src={demande.employe_photo}
                        alt={`${demande.employe_prenom} ${demande.employe_nom}`}
                      />
                    ) : (
                      <div className="avatar-placeholder">
                        {demande.employe_prenom?.charAt(0)}
                        {demande.employe_nom?.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="employe-info">
                    <h4 className="employe-name">
                      {demande.employe_prenom} {demande.employe_nom}
                    </h4>
                    <p className="employe-details">
                      {demande.employe_poste} • Matricule: {demande.employe_matricule}
                    </p>
                  </div>
                </div>

                {/* Détails de la demande */}
                <div className="demande-content">
                  {/* Statut d'approbation global */}
                  <div className="approval-status">
                    <strong>Statut d'approbation:</strong> {getApprovalStatus(demande)}
                  </div>

                  {/* Détails spécifiques */}
                  <div className="details-grid">
                    {demande.type_demande === 'congé' && (
                      <>
                        {demande.date_depart && (
                          <div className="detail-item">
                            <span className="detail-label">📅 Date de départ</span>
                            <span className="detail-value">{formatDate(demande.date_depart)}</span>
                          </div>
                        )}
                        {demande.date_retour && (
                          <div className="detail-item">
                            <span className="detail-label">📅 Date de retour</span>
                            <span className="detail-value">{formatDate(demande.date_retour)}</span>
                          </div>
                        )}
                        {demande.type_conge && (
                          <div className="detail-item">
                            <span className="detail-label">📋 Type de congé</span>
                            <span className="detail-value">{demande.type_conge}</span>
                          </div>
                        )}
                      </>
                    )}

                    {demande.type_demande === 'autorisation_absence' && (
                      <>
                        {demande.date_depart && (
                          <div className="detail-item">
                            <span className="detail-label">📅 Date</span>
                            <span className="detail-value">{formatDate(demande.date_depart)}</span>
                          </div>
                        )}
                        {demande.heure_depart && (
                          <div className="detail-item">
                            <span className="detail-label">⏰ Heure de départ</span>
                            <span className="detail-value">{formatTime(demande.heure_depart)}</span>
                          </div>
                        )}
                        {demande.heure_retour && (
                          <div className="detail-item">
                            <span className="detail-label">⏰ Heure de retour</span>
                            <span className="detail-value">{formatTime(demande.heure_retour)}</span>
                          </div>
                        )}
                      </>
                    )}

                    {demande.type_demande === 'frais_deplacement' && (
                      <>
                        {demande.date_depart && (
                          <div className="detail-item">
                            <span className="detail-label">📅 Date du déplacement</span>
                            <span className="detail-value">{formatDate(demande.date_depart)}</span>
                          </div>
                        )}
                        {demande.frais_deplacement && (
                          <div className="detail-item">
                            <span className="detail-label">💰 Montant des frais</span>
                            <span className="detail-value">
                              {parseFloat(demande.frais_deplacement).toFixed(2)} €
                            </span>
                          </div>
                        )}
                      </>
                    )}

                    <div className="detail-item">
                      <span className="detail-label">🔄 Dernière mise à jour</span>
                      <span className="detail-value">{formatDate(demande.updated_at)}</span>
                    </div>
                  </div>

                  {/* Responsables d'approbation */}
                  <div className="approval-section">
                    <h4 className="approval-title">🏢 Responsables d'approbation</h4>
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
                    <div className="commentaire-section">
                      <div className="commentaire-header">
                        <span className="commentaire-label">💬 Commentaire de refus</span>
                      </div>
                      <p className="commentaire-text">{demande.commentaire_refus}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DemandesRH;
