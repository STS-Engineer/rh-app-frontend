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
      console.log('✅ Données reçues du backend:', data);
      
      console.log('🐛 DEBUG FRONTEND - Structure des données:');
      if (data.demandes && data.demandes.length > 0) {
        data.demandes.forEach((demande, index) => {
          console.log(`\n📋 Demande ${index + 1} au frontend:`);
          console.log('   ID:', demande.id);
          console.log('   Employé:', `${demande.employe_prenom} ${demande.employe_nom}`);
          console.log('   mail_responsable1:', demande.mail_responsable1);
          console.log('   mail_responsable2:', demande.mail_responsable2);
          console.log('   approuve_responsable1:', demande.approuve_responsable1);
          console.log('   approuve_responsable2:', demande.approuve_responsable2);
          
          const nom1 = getResponsableNameFromEmail(demande.mail_responsable1);
          const nom2 = getResponsableNameFromEmail(demande.mail_responsable2);
          console.log('   🧪 Formatage mail_responsable1:', `"${demande.mail_responsable1}" -> "${nom1}"`);
          console.log('   🧪 Formatage mail_responsable2:', `"${demande.mail_responsable2}" -> "${nom2}"`);
        });
      }
      
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
    console.log(`🎯 Changement filtre ${key}:`, value);
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

  const getResponsableNameFromEmail = (email) => {
    console.log('🔧 Formatage email reçu:', email, '(type:', typeof email, ')');
    
    if (!email || email === '' || email === null || email === undefined || email === 'null') {
      console.log('🔧 Email vide ou null, retourne "Non assigné"');
      return 'Non assigné';
    }
    
    const cleanEmail = email.toString().trim();
    
    if (cleanEmail.includes(' ')) {
      console.log('🔧 C\'est déjà un nom formaté:', cleanEmail);
      return cleanEmail;
    }
    
    if (!cleanEmail.includes('@')) {
      console.log('🔧 Ce n\'est pas un email valide:', cleanEmail);
      return cleanEmail;
    }
    
    try {
      const username = cleanEmail.split('@')[0];
      const nameParts = username.split(/[._-]/);
      const formattedName = nameParts.map(part => 
        part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
      ).join(' ');
      
      console.log('🔧 Email formaté:', cleanEmail, '->', formattedName);
      return formattedName;
    } catch (error) {
      console.warn('❌ Erreur formatage email:', cleanEmail, error);
      return cleanEmail;
    }
  };

  const getApprovalStatus = (demande) => {
    if (demande.statut === 'approuve') {
      if (demande.approuve_responsable1 && demande.approuve_responsable2) {
        const responsable1 = getResponsableNameFromEmail(demande.mail_responsable1);
        const responsable2 = getResponsableNameFromEmail(demande.mail_responsable2);
        return `✅ Approuvée par ${responsable1} et ${responsable2}`;
      } else if (demande.approuve_responsable1) {
        const responsable1 = getResponsableNameFromEmail(demande.mail_responsable1);
        return `✅ Approuvée par ${responsable1} (en attente du 2ème responsable)`;
      } else if (demande.approuve_responsable2) {
        const responsable2 = getResponsableNameFromEmail(demande.mail_responsable2);
        return `✅ Approuvée par ${responsable2} (en attente du 1er responsable)`;
      } else {
        return '✅ Approuvée (détails non disponibles)';
      }
    } else if (demande.statut === 'refuse') {
      return `❌ Refusée: ${demande.commentaire_refus || 'Raison non spécifiée'}`;
    } else if (demande.statut === 'en_attente') {
      return '⏳ En attente d\'approbation';
    } else if (demande.statut === 'en_cours') {
      return '🔄 En cours de traitement';
    }
    return demande.statut;
  };

  const clearFilters = () => {
    console.log('🗑️ Effacement des filtres');
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

  const debugData = () => {
    console.log('🐛 Données de debug:', {
      filters,
      demandesCount: demandes.length,
      typesPresents: [...new Set(demandes.map(d => d.type_demande))],
      premierEmploye: demandes[0] ? {
        nom: `${demandes[0].employe_prenom} ${demandes[0].employe_nom}`,
        mail_responsable1: demandes[0].mail_responsable1,
        mail_responsable2: demandes[0].mail_responsable2,
        approuve_responsable1: demandes[0].approuve_responsable1,
        approuve_responsable2: demandes[0].approuve_responsable2
      } : 'Aucune donnée'
    });
  };

  return (
    <div className="demandes-rh">
      <div className="demandes-header">
        <h1>📋 Demandes RH</h1>
        <p>Consultation des demandes de congés, absences et frais</p>
        <button onClick={debugData} style={{fontSize: '12px', padding: '5px', marginTop: '10px', background: '#f39c12', color: 'white', border: 'none', borderRadius: '3px'}}>
          🐛 Debug Data
        </button>
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
          <small>Filtres actifs: 
            {filters.type_demande && ` Type: ${getTypeDemandeLabel(filters.type_demande)}`}
            {filters.statut && ` Statut: ${filters.statut}`}
            {filters.date_debut && filters.date_fin && ` Dates: ${filters.date_debut} à ${filters.date_fin}`}
            {!filters.type_demande && !filters.statut && !filters.date_debut && ' Aucun filtre actif'}
          </small>
        </div>
      </div>

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
                  <div className="approval-status">
                    <strong>Statut d'approbation:</strong> {getApprovalStatus(demande)}
                  </div>

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

                <div className="approval-details">
                  <div className="approval-item">
                    <span className="approval-label">
                      {getResponsableNameFromEmail(demande.mail_responsable1)}:
                    </span>
                    <span className={`approval-status ${demande.approuve_responsable1 ? 'approved' : 'pending'}`}>
                      {demande.approuve_responsable1 ? '✅ Approuvé' : '⏳ En attente'}
                    </span>
                    <small className="approval-email">
                      {demande.mail_responsable1 && demande.mail_responsable1 !== '' && demande.mail_responsable1 !== 'null' 
                        ? demande.mail_responsable1 
                        : 'Email non configuré'}
                    </small>
                  </div>
                  <div className="approval-item">
                    <span className="approval-label">
                      {getResponsableNameFromEmail(demande.mail_responsable2)}:
                    </span>
                    <span className={`approval-status ${demande.approuve_responsable2 ? 'approved' : 'pending'}`}>
                      {demande.approuve_responsable2 ? '✅ Approuvé' : '⏳ En attente'}
                    </span>
                    <small className="approval-email">
                      {demande.mail_responsable2 && demande.mail_responsable2 !== '' && demande.mail_responsable2 !== 'null'
                        ? demande.mail_responsable2 
                        : 'Email non configuré'}
                    </small>
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
