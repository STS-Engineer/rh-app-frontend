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

      const queryParams = new URLSearchParams();
      
      // Ajouter les filtres seulement s'ils ont une valeur
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

      // Ajouter un timestamp pour éviter le cache
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

      console.log('📡 Réponse HTTP:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
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
        total: data.pagination?.total || 0,
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
      console.error('❌ Erreur récupération demandes:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
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
    const hasActiveFilters = filters.statut || filters.type_demande || filters.date_debut || filters.date_fin;
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
    // Recharger sans filtres
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
      return new Date(dateString).toLocaleDateString('fr-FR');
    } catch (e) {
      return dateString;
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
      
      <div className="demandes-header">
        <h1>📋 Gestion des Demandes RH</h1>
        <p>Suivi et traitement des demandes des collaborateurs</p>
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
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="filters-section">
        <div className="filters-header">
          <h3>🔍 Filtres de recherche</h3>
          <div className="filters-actions">
            <button className="btn-export" onClick={handleExportExcel} disabled={demandes.length === 0}>
              📤 Exporter
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
            <label>Type</label>
            <select 
              value={filters.type_demande} 
              onChange={(e) => handleFilterChange('type_demande', e.target.value)}
            >
              <option value="">Tous les types</option>
              {typesDemande.map(t => (
                <option key={t} value={t}>{getTypeDemandeLabel(t)}</option>
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

        {filtersApplied && (
          <div className="active-filters">
            <span className="filter-tag">
              Filtres actifs: 
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
              {demandes.map(demande => (
                <div key={demande.id} className="demande-card">
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
                          <img src={demande.employe_photo} alt="Employé" />
                        ) : (
                          <div className="avatar-default">
                            {demande.employe_prenom?.[0]}{demande.employe_nom?.[0]}
                          </div>
                        )}
                      </div>
                      <div className="employe-details">
                        <h4>{demande.employe_prenom} {demande.employe_nom}</h4>
                        <p>{demande.employe_poste} • {demande.employe_matricule}</p>
                      </div>
                    </div>
                    
                    <div className="demande-details">
                      {demande.date_depart && (
                        <div className="detail">
                          <span className="label">📅 Date:</span>
                          <span className="value">{formatDate(demande.date_depart)}</span>
                        </div>
                      )}
                      
                      {demande.date_retour && (
                        <div className="detail">
                          <span className="label">📅 Retour:</span>
                          <span className="value">{formatDate(demande.date_retour)}</span>
                        </div>
                      )}
                      
                      <div className="detail">
                        <span className="label">🔄 Mise à jour:</span>
                        <span className="value">{formatDate(demande.updated_at)}</span>
                      </div>
                    </div>
                    
                    {demande.commentaire_refus && (
                      <div className="commentaire">
                        <span className="comment-label">💬 Commentaire:</span>
                        <p>{demande.commentaire_refus}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DemandesRH;
