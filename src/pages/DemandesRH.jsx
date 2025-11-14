import React, { useState, useEffect } from 'react';
import './DemandesRH.css';

const DemandesRH = () => {
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type_demande: '',
    statut: '',
    date_debut: '',
    date_fin: ''
  });

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
      const token = localStorage.getItem('token');
      
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const response = await fetch(`/api/demandes?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDemandes(data.demandes || []);
      } else {
        console.error('Erreur lors de la récupération des demandes');
      }
    } catch (error) {
      console.error('Erreur:', error);
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
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  return (
    <div className="demandes-rh">
      <div className="demandes-header">
        <h1>📋 Demandes RH</h1>
        <p>Gestion des demandes de congés, absences et frais</p>
      </div>

      {/* Filtres */}
      <div className="filters-section">
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

        <button className="btn-primary" onClick={fetchDemandes}>
          🔄 Actualiser
        </button>
      </div>

      {/* Liste des demandes */}
      <div className="demandes-list">
        {loading ? (
          <div className="loading">Chargement des demandes...</div>
        ) : demandes.length === 0 ? (
          <div className="no-data">Aucune demande trouvée</div>
        ) : (
          <div className="demandes-grid">
            {demandes.map(demande => (
              <div key={demande.id} className="demande-card">
                <div className="demande-header">
                  <div className="demande-info">
                    <h3>{demande.titre}</h3>
                    <p className="employe-name">
                      {demande.employe_prenom} {demande.employe_nom}
                    </p>
                    <p className="employe-poste">{demande.employe_poste}</p>
                  </div>
                  <div className="demande-meta">
                    {getStatutBadge(demande.statut)}
                    <span className="demande-type">
                      {getTypeDemandeLabel(demande.type_demande)}
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
                </div>

                <div className="demande-actions">
                  <button className="btn-secondary">Voir détails</button>
                  {demande.statut === 'en_attente' && (
                    <>
                      <button className="btn-success">Approuver</button>
                      <button className="btn-danger">Refuser</button>
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
