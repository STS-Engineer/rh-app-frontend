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

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

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
  }, [filters]);

  const fetchDemandes = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Token d\'authentification manquant');
        return;
      }

      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      console.log('🔍 Fetching demandes from:', `${API_BASE_URL}/api/demandes?${queryParams}`);

      const response = await fetch(`${API_BASE_URL}/api/demandes?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Vérification du type de contenu
      const contentType = response.headers.get('content-type');
      
      if (!response.ok) {
        // Si erreur HTTP, essayer de lire le message d'erreur
        let errorMessage = `Erreur ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          // Si pas de JSON, lire le texte
          const text = await response.text();
          if (text) {
            errorMessage = `${errorMessage}: ${text.substring(0, 100)}`;
          }
        }
        throw new Error(errorMessage);
      }

      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('⚠️ Réponse non-JSON reçue:', text.substring(0, 500));
        throw new Error('Le serveur a retourné une réponse non-JSON. Vérifiez l\'URL de l\'API.');
      }

      const data = await response.json();
      console.log('✅ Données reçues:', data);
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

  const handleApprouver = async (demandeId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/demandes/${demandeId}/statut`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ statut: 'approuve' })
      });

      if (response.ok) {
        fetchDemandes(); // Recharger la liste
      } else {
        console.error('Erreur lors de l\'approbation');
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const handleRefuser = async (demandeId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/demandes/${demandeId}/statut`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ statut: 'refuse' })
      });

      if (response.ok) {
        fetchDemandes(); // Recharger la liste
      } else {
        console.error('Erreur lors du refus');
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
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
        <p>Gestion des demandes de congés, absences et frais</p>
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
                  {statut}
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

        <div className="filters-actions">
          <button className="btn-primary" onClick={fetchDemandes}>
            🔄 Appliquer les filtres
          </button>
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

                <div className="demande-details">
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

                  {demande.frais_deplacement && (
                    <div className="detail-item">
                      <span className="label">Frais de déplacement:</span>
                      <span className="value">{demande.frais_deplacement} €</span>
                    </div>
                  )}

                  {demande.commentaire_refus && (
                    <div className="detail-item">
                      <span className="label">Commentaire:</span>
                      <span className="value commentaire">{demande.commentaire_refus}</span>
                    </div>
                  )}
                </div>

                <div className="demande-actions">
                  <button className="btn-secondary">
                    👁️ Voir détails
                  </button>
                  {demande.statut === 'en_attente' && (
                    <>
                      <button 
                        className="btn-success"
                        onClick={() => handleApprouver(demande.id)}
                      >
                        ✅ Approuver
                      </button>
                      <button 
                        className="btn-danger"
                        onClick={() => handleRefuser(demande.id)}
                      >
                        ❌ Refuser
                      </button>
                    </>
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
