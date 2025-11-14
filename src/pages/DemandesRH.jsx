import React, { useState, useEffect } from 'react';
import './DemandesRH.css';

const DemandesRH = () => {
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    type_demande: '',
    statut: '',
    date_debut: '',
    date_fin: ''
  });

  const API_BASE_URL = 'https://backend-rh.azurewebsites.net';

  const typesDemande = [
    'congé',
    'autorisation_absence',
    'frais_deplacement',
    'autre'
  ];

  const statuts = [
    'en_attente',
    'approuve',
    'refuse',
    'en_cours'
  ];

  useEffect(() => {
    fetchDemandes();
  }, [filters]); // Se déclenche quand les filtres changent

  const fetchDemandes = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Token d\'authentification manquant');
        return;
      }

      // Construction des paramètres de requête
      const queryParams = new URLSearchParams();
      
      // Ajouter seulement les filtres non vides
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== '') {
          queryParams.append(key, value);
        }
      });

      console.log('🔍 Fetching demandes avec filtres:', Object.fromEntries(queryParams));

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
      console.log('✅ Données reçues:', data.demandes?.length || 0, 'demandes');
      setDemandes(data.demandes || []);
      
    } catch (error) {
      console.error('❌ Erreur récupération demandes:', error);
      setError(error.message);
      setDemandes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    // Les filtres se déclenchent automatiquement via le useEffect
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

  const getApprovalStatus = (demande) => {
    if (demande.statut === 'approuve') {
      if (demande.approuve_responsable1 && demande.approuve_responsable2) {
        return '✅ Approuvée par les deux responsables';
      } else if (demande.approuve_responsable1) {
        return '✅ Approuvée par le responsable 1 (en attente du responsable 2)';
      } else if (demande.approuve_responsable2) {
        return '✅ Approuvée par le responsable 2 (en attente du responsable 1)';
      }
    } else if (demande.statut === 'refuse') {
      return `❌ Refusée: ${demande.commentaire_refus || 'Raison non spécifiée'}`;
    } else if (demande.statut === 'en_attente') {
      return '⏳ En attente d\'approbation';
    }
    return demande.statut;
  };

  const clearFilters = () => {
    setFilters({
      type_demande: '',
      statut: '',
      date_debut: '',
      date_fin: ''
    });
  };

  const retryFetch = () => {
    setError(null);
    fetchDemandes();
  };

  return (
    <div className="demandes-rh">
      <div className="demandes-header">
        <h1>📋 Demandes RH</h1>
        <p>Consultation des demandes de congés, absences et frais</p>
      </div>

      {/* Affichage des erreurs */}
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
            <label>Type de demande</label>
            <select 
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

          <div className="filter-group">
            <label>Statut</label>
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

      {/* Statistiques rapides */}
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
                <div className="demande-header">
                  <div className="demande-info">
                    <h3>{demande.titre}</h3>
                    <div className="employe-info">
                      <div className="employe-avatar">
                        {demande.employe_photo ? (
                          <img src={demande.employe_photo} alt={`${demande.employe_prenom} ${demande.employe_nom}`} />
                        ) : (
                          <div className="avatar-placeholder">
                            {demande.employe_prenom?.charAt(0)}{demande.employe_nom?.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="employe-details">
                        <p className="employe-name">
                          {demande.employe_prenom} {demande.employe_nom}
                        </p>
                        <p className="employe-poste">{demande.employe_poste}</p>
                        <p className="employe-matricule">Matricule: {demande.employe_matricule}</p>
                      </div>
                    </div>
                  </div>
                  <div className="demande-meta">
                    {getStatutBadge(demande.statut)}
                    <span className="demande-type">
                      {getTypeDemandeLabel(demande.type_demande)}
                    </span>
                    <span className="demande-date">
                      Créée le: {formatDate(demande.created_at)}
                    </span>
                  </div>
                </div>

                {/* Détails complets de la demande */}
                <div className="demande-details">
                  {/* Informations d'approbation */}
                  <div className="approval-status">
                    <strong>Statut d'approbation:</strong> {getApprovalStatus(demande)}
                  </div>

                  {/* Détails spécifiques au type de demande */}
                  {demande.type_demande === 'congé' && (
                    <>
                      {demande.date_depart && (
                        <div className="detail-item">
                          <span className="label">Date de départ:</span>
                          <span className="value">{formatDate(demande.date_depart)}</span>
                        </div>
                      )}
                      
                      {demande.date_retour && (
                        <div className="detail-item">
                          <span className="label">Date de retour:</span>
                          <span className="value">{formatDate(demande.date_retour)}</span>
                        </div>
                      )}

                      {demande.type_conge && (
                        <div className="detail-item">
                          <span className="label">Type de congé:</span>
                          <span className="value">{demande.type_conge}</span>
                        </div>
                      )}

                      {demande.type_conge_autre && (
                        <div className="detail-item">
                          <span className="label">Autre type:</span>
                          <span className="value">{demande.type_conge_autre}</span>
                        </div>
                      )}
                    </>
                  )}

                  {demande.type_demande === 'autorisation_absence' && (
                    <>
                      {demande.date_depart && (
                        <div className="detail-item">
                          <span className="label">Date:</span>
                          <span className="value">{formatDate(demande.date_depart)}</span>
                        </div>
                      )}

                      {demande.heure_depart && (
                        <div className="detail-item">
                          <span className="label">Heure de départ:</span>
                          <span className="value">{formatTime(demande.heure_depart)}</span>
                        </div>
                      )}

                      {demande.heure_retour && (
                        <div className="detail-item">
                          <span className="label">Heure de retour:</span>
                          <span className="value">{formatTime(demande.heure_retour)}</span>
                        </div>
                      )}

                      {demande.demi_journee && (
                        <div className="detail-item">
                          <span className="label">Demi-journée:</span>
                          <span className="value">✅ Oui</span>
                        </div>
                      )}
                    </>
                  )}

                  {demande.type_demande === 'frais_deplacement' && (
                    <>
                      {demande.date_depart && (
                        <div className="detail-item">
                          <span className="label">Date du déplacement:</span>
                          <span className="value">{formatDate(demande.date_depart)}</span>
                        </div>
                      )}

                      {demande.frais_deplacement && (
                        <div className="detail-item">
                          <span className="label">Montant des frais:</span>
                          <span className="value">{parseFloat(demande.frais_deplacement).toFixed(2)} €</span>
                        </div>
                      )}
                    </>
                  )}

                  {demande.type_demande === 'autre' && demande.type_conge_autre && (
                    <div className="detail-item">
                      <span className="label">Description:</span>
                      <span className="value">{demande.type_conge_autre}</span>
                    </div>
                  )}

                  {/* Informations générales */}
                  <div className="detail-item">
                    <span className="label">Dernière mise à jour:</span>
                    <span className="value">{formatDate(demande.updated_at)}</span>
                  </div>

                  {demande.commentaire_refus && (
                    <div className="detail-item commentaire-section">
                      <span className="label">Commentaire de refus:</span>
                      <span className="value commentaire">{demande.commentaire_refus}</span>
                    </div>
                  )}
                </div>

                {/* Section d'approbation détaillée */}
                <div className="approval-details">
                  <div className="approval-item">
                    <span className="approval-label">Responsable 1:</span>
                    <span className={`approval-status ${demande.approuve_responsable1 ? 'approved' : 'pending'}`}>
                      {demande.approuve_responsable1 ? '✅ Approuvé' : '⏳ En attente'}
                    </span>
                  </div>
                  <div className="approval-item">
                    <span className="approval-label">Responsable 2:</span>
                    <span className={`approval-status ${demande.approuve_responsable2 ? 'approved' : 'pending'}`}>
                      {demande.approuve_responsable2 ? '✅ Approuvé' : '⏳ En attente'}
                    </span>
                  </div>
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
