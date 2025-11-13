import React, { useState, useEffect } from 'react';
import './DemandesRH.css';

const DemandesRH = () => {
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    type: '',
    statut: '',
    dateDebut: '',
    dateFin: ''
  });

  const typesDemande = ['congé', 'autorisation_absence', 'frais_deplacement', 'autre'];
  const statuts = ['en_attente', 'approuve', 'refuse', 'en_cours_traitement'];

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

      const params = new URLSearchParams();
      if (filters.type) params.append('type', filters.type);
      if (filters.statut) params.append('statut', filters.statut);
      if (filters.dateDebut) params.append('dateDebut', filters.dateDebut);
      if (filters.dateFin) params.append('dateFin', filters.dateFin);

      console.log('🔍 Fetching demandes avec params:', params.toString());

      const response = await fetch(`/api/demandes-rh?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📦 Données reçues:', data);
      setDemandes(data);

    } catch (error) {
      console.error('💥 Erreur fetch:', error);
      setError(`Erreur de chargement: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Test simple sans authentification
  const testSimpleRoute = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/test-demandes');
      
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}`);
      }
      
      const data = await response.json();
      console.log('🧪 Test simple:', data);
      
      if (data.success) {
        alert(`✅ Test réussi: ${data.count} demandes trouvées`);
        if (data.count > 0) {
          setDemandes(data.demandes);
        }
      } else {
        alert('❌ Test échoué: ' + (data.error || 'Erreur inconnue'));
      }
    } catch (error) {
      console.error('Erreur test simple:', error);
      alert('❌ Erreur test: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Debug complet
  const testDebugRoute = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/debug-demandes');
      
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}`);
      }
      
      const data = await response.json();
      console.log('🐛 Debug complet:', data);
      
      if (data.success) {
        let message = `Total demandes: ${data.total_demandes}\n`;
        message += `Structure: ${data.structure_table.length} colonnes\n`;
        
        if (data.total_demandes > 0) {
          message += `✅ Données disponibles!`;
          alert(message);
          // Recharger les données
          fetchDemandes();
        } else {
          message += `❌ Aucune donnée dans la table`;
          alert(message);
        }
      } else {
        alert('❌ Debug échoué: ' + (data.error || 'Erreur inconnue'));
      }
    } catch (error) {
      console.error('Erreur debug:', error);
      alert('❌ Erreur debug: ' + error.message);
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

  const clearFilters = () => {
    setFilters({
      type: '',
      statut: '',
      dateDebut: '',
      dateFin: ''
    });
  };

  const getStatutBadge = (statut) => {
    const statutConfig = {
      'en_attente': { class: 'statut-en-attente', label: 'En attente' },
      'approuve': { class: 'statut-approuve', label: 'Approuvé' },
      'refuse': { class: 'statut-refuse', label: 'Refusé' },
      'en_cours_traitement': { class: 'statut-en-cours', label: 'En cours' }
    };
    
    const config = statutConfig[statut] || { class: 'statut-default', label: statut };
    return <span className={`statut-badge ${config.class}`}>{config.label}</span>;
  };

  const getTypeDemande = (type) => {
    const types = {
      'congé': 'Congé',
      'autorisation_absence': 'Autorisation d\'absence',
      'frais_deplacement': 'Frais de déplacement',
      'autre': 'Autre demande'
    };
    return types[type] || type;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Non définie';
    try {
      return new Date(dateString).toLocaleDateString('fr-FR');
    } catch (error) {
      return 'Date invalide';
    }
  };

  const getEmployeDisplayName = (demande) => {
    if (demande.employe_nom && demande.employe_prenom) {
      return `${demande.employe_prenom} ${demande.employe_nom}`;
    }
    return `ID: ${demande.employe_id}`;
  };

  if (loading) {
    return (
      <div className="demandes-rh-container">
        <div className="loading">
          <div>Chargement des demandes...</div>
          <div className="debug-actions">
            <button onClick={testSimpleRoute} className="debug-btn">
              🧪 Test Simple
            </button>
            <button onClick={testDebugRoute} className="debug-btn">
              🐛 Debug Complet
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="demandes-rh-container">
        <div className="error-message">
          <h3>❌ Erreur</h3>
          <p>{error}</p>
          <div className="error-actions">
            <button onClick={testSimpleRoute} className="debug-btn">
              🧪 Test Simple
            </button>
            <button onClick={testDebugRoute} className="debug-btn">
              🐛 Debug Complet
            </button>
            <button onClick={fetchDemandes} className="retry-btn">
              🔄 Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="demandes-rh-container">
      <div className="demandes-header">
        <div>
          <h1>📋 Demandes RH</h1>
          <p>Gestion des demandes de congés, absences et frais</p>
        </div>
        <div className="header-actions">
          <button onClick={testSimpleRoute} className="debug-btn">
            🧪 Test
          </button>
          <button onClick={testDebugRoute} className="debug-btn">
            🐛 Debug
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="filters-section">
        <div className="filters-header">
          <h3>Filtres</h3>
          <button onClick={clearFilters} className="clear-filters-btn">
            🔄 Effacer
          </button>
        </div>
        
        <div className="filters-grid">
          <div className="filter-group">
            <label>Type de demande</label>
            <select 
              value={filters.type} 
              onChange={(e) => handleFilterChange('type', e.target.value)}
            >
              <option value="">Tous les types</option>
              {typesDemande.map(type => (
                <option key={type} value={type}>
                  {getTypeDemande(type)}
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
              value={filters.dateDebut}
              onChange={(e) => handleFilterChange('dateDebut', e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label>Date de fin</label>
            <input 
              type="date" 
              value={filters.dateFin}
              onChange={(e) => handleFilterChange('dateFin', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Liste des demandes */}
      <div className="demandes-list">
        <div className="demandes-stats">
          <div className="stat-card">
            <span className="stat-number">{demandes.length}</span>
            <span className="stat-label">Total demandes</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">
              {demandes.filter(d => d.statut === 'en_attente').length}
            </span>
            <span className="stat-label">En attente</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">
              {demandes.filter(d => d.statut === 'approuve').length}
            </span>
            <span className="stat-label">Approuvées</span>
          </div>
        </div>

        {demandes.length === 0 ? (
          <div className="no-data">
            <p>📭 Aucune demande trouvée</p>
            <p>Ajustez vos filtres ou vérifiez qu'il y a des demandes dans le système.</p>
            <div className="debug-actions">
              <button onClick={testSimpleRoute} className="debug-btn">
                🧪 Test Simple
              </button>
              <button onClick={testDebugRoute} className="debug-btn">
                🐛 Debug Complet
              </button>
            </div>
          </div>
        ) : (
          <div className="demandes-grid">
            {demandes.map((demande) => (
              <div key={demande.id} className="demande-card">
                <div className="demande-header">
                  <div className="demande-title">
                    <h3>{demande.titre || 'Sans titre'}</h3>
                    {getStatutBadge(demande.statut)}
                  </div>
                  <span className="demande-type">{getTypeDemande(demande.type_demande)}</span>
                </div>

                <div className="demande-body">
                  <div className="demande-info">
                    <div className="info-item">
                      <span className="info-label">👤 Employé:</span>
                      <span className="info-value">{getEmployeDisplayName(demande)}</span>
                    </div>
                    
                    {demande.date_depart && (
                      <div className="info-item">
                        <span className="info-label">📅 Date départ:</span>
                        <span className="info-value">{formatDate(demande.date_depart)}</span>
                      </div>
                    )}
                    
                    {demande.date_retour && (
                      <div className="info-item">
                        <span className="info-label">📅 Date retour:</span>
                        <span className="info-value">{formatDate(demande.date_retour)}</span>
                      </div>
                    )}
                    
                    {demande.frais_deplacement && (
                      <div className="info-item">
                        <span className="info-label">💰 Frais:</span>
                        <span className="info-value">{demande.frais_deplacement} €</span>
                      </div>
                    )}
                  </div>

                  {demande.commentaire_refus && (
                    <div className="commentaire-refus">
                      <strong>Commentaire de refus:</strong>
                      <p>{demande.commentaire_refus}</p>
                    </div>
                  )}
                </div>

                <div className="demande-footer">
                  <div className="demande-dates">
                    <small>Créé le: {formatDate(demande.created_at)}</small>
                  </div>
                  <div className="demande-actions">
                    <button className="btn-view">👁️ Voir</button>
                    <button className="btn-edit">✏️ Modifier</button>
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
