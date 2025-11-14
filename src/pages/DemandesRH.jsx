import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import './DemandesRH.css';

const DemandesRH = () => {
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtres, setFiltres] = useState({
    type_demande: '',
    statut: '',
    recherche: ''
  });
  const [selectedDemande, setSelectedDemande] = useState(null);

  useEffect(() => {
    fetchDemandes();
  }, []);

  const fetchDemandes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/demandes', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Erreur lors du chargement');
      
      const data = await response.json();
      setDemandes(data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleApprouver = async (id, niveau) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:5000/api/demandes/${id}/approuver`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ niveau })
      });
      fetchDemandes();
      setSelectedDemande(null);
    } catch (err) {
      alert('Erreur lors de l\'approbation');
    }
  };

  const handleRejeter = async (id, commentaire) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:5000/api/demandes/${id}/rejeter`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ commentaire_refus: commentaire })
      });
      fetchDemandes();
      setSelectedDemande(null);
    } catch (err) {
      alert('Erreur lors du rejet');
    }
  };

  const demandesFiltrees = demandes.filter(d => {
    const matchType = !filtres.type_demande || d.type_demande === filtres.type_demande;
    const matchStatut = !filtres.statut || d.statut === filtres.statut;
    const matchRecherche = !filtres.recherche || 
      d.titre?.toLowerCase().includes(filtres.recherche.toLowerCase()) ||
      d.employe_nom?.toLowerCase().includes(filtres.recherche.toLowerCase());
    
    return matchType && matchStatut && matchRecherche;
  });

  const getStatutBadge = (statut) => {
    const badges = {
      'en_attente': { label: 'En attente', className: 'badge-warning' },
      'approuve': { label: 'Approuvée', className: 'badge-success' },
      'rejete': { label: 'Rejetée', className: 'badge-danger' },
      'en_cours': { label: 'En cours', className: 'badge-info' }
    };
    const badge = badges[statut] || { label: statut, className: 'badge-default' };
    return <span className={`badge ${badge.className}`}>{badge.label}</span>;
  };

  const getTypeIcon = (type) => {
    const icons = {
      'conge': '🏖️',
      'autorisation': '⏰',
      'deplacement': '✈️',
      'teletravail': '💻',
      'autre': '📄'
    };
    return icons[type] || '📄';
  };

  if (loading) {
    return (
      <div className="page-container">
        <Sidebar />
        <div className="main-content">
          <div className="loading">Chargement des demandes...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <Sidebar />
      <div className="main-content">
        <div className="demandes-header">
          <div className="header-top">
            <h1>📝 Demandes RH</h1>
            <button className="btn-primary">+ Nouvelle demande</button>
          </div>
          
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-icon">⏳</div>
              <div className="stat-info">
                <p className="stat-value">{demandes.filter(d => d.statut === 'en_attente').length}</p>
                <p className="stat-label">En attente</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon success">✓</div>
              <div className="stat-info">
                <p className="stat-value">{demandes.filter(d => d.statut === 'approuve').length}</p>
                <p className="stat-label">Approuvées</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon danger">✕</div>
              <div className="stat-info">
                <p className="stat-value">{demandes.filter(d => d.statut === 'rejete').length}</p>
                <p className="stat-label">Rejetées</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon info">📊</div>
              <div className="stat-info">
                <p className="stat-value">{demandes.length}</p>
                <p className="stat-label">Total</p>
              </div>
            </div>
          </div>

          <div className="filtres-container">
            <div className="filtre-group">
              <label>🔍 Recherche</label>
              <input
                type="text"
                placeholder="Titre, employé..."
                value={filtres.recherche}
                onChange={(e) => setFiltres({...filtres, recherche: e.target.value})}
                className="input-filtre"
              />
            </div>
            
            <div className="filtre-group">
              <label>📋 Type</label>
              <select
                value={filtres.type_demande}
                onChange={(e) => setFiltres({...filtres, type_demande: e.target.value})}
                className="select-filtre"
              >
                <option value="">Tous les types</option>
                <option value="conge">Congé</option>
                <option value="autorisation">Autorisation</option>
                <option value="deplacement">Déplacement</option>
                <option value="teletravail">Télétravail</option>
                <option value="autre">Autre</option>
              </select>
            </div>

            <div className="filtre-group">
              <label>🎯 Statut</label>
              <select
                value={filtres.statut}
                onChange={(e) => setFiltres({...filtres, statut: e.target.value})}
                className="select-filtre"
              >
                <option value="">Tous les statuts</option>
                <option value="en_attente">En attente</option>
                <option value="en_cours">En cours</option>
                <option value="approuve">Approuvée</option>
                <option value="rejete">Rejetée</option>
              </select>
            </div>

            <button 
              className="btn-reset"
              onClick={() => setFiltres({ type_demande: '', statut: '', recherche: '' })}
            >
              🔄 Réinitialiser
            </button>
          </div>
        </div>

        <div className="demandes-list">
          {demandesFiltrees.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">📭</span>
              <h3>Aucune demande trouvée</h3>
              <p>Aucune demande ne correspond aux filtres sélectionnés</p>
            </div>
          ) : (
            demandesFiltrees.map(demande => (
              <div 
                key={demande.id} 
                className="demande-card"
                onClick={() => setSelectedDemande(demande)}
              >
                <div className="demande-header">
                  <div className="demande-type">
                    <span className="type-icon">{getTypeIcon(demande.type_demande)}</span>
                    <span className="type-label">{demande.type_demande}</span>
                  </div>
                  {getStatutBadge(demande.statut)}
                </div>

                <h3 className="demande-titre">{demande.titre || 'Sans titre'}</h3>

                <div className="demande-info">
                  <div className="info-item">
                    <span className="info-icon">👤</span>
                    <span>{demande.employe_nom || 'Employé inconnu'}</span>
                  </div>
                  
                  {demande.date_depart && (
                    <div className="info-item">
                      <span className="info-icon">📅</span>
                      <span>
                        {new Date(demande.date_depart).toLocaleDateString('fr-FR')}
                        {demande.date_retour && ` → ${new Date(demande.date_retour).toLocaleDateString('fr-FR')}`}
                      </span>
                    </div>
                  )}

                  {demande.demi_journee && (
                    <div className="info-item">
                      <span className="info-icon">⏰</span>
                      <span>Demi-journée</span>
                    </div>
                  )}

                  {demande.frais_deplacement && (
                    <div className="info-item">
                      <span className="info-icon">💰</span>
                      <span>{parseFloat(demande.frais_deplacement).toFixed(2)} TND</span>
                    </div>
                  )}
                </div>

                <div className="demande-footer">
                  <span className="date-creation">
                    Créée le {new Date(demande.created_at).toLocaleDateString('fr-FR')}
                  </span>
                  <button className="btn-details">Voir détails →</button>
                </div>
              </div>
            ))
          )}
        </div>

        {selectedDemande && (
          <div className="modal-overlay" onClick={() => setSelectedDemande(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{getTypeIcon(selectedDemande.type_demande)} {selectedDemande.titre}</h2>
                <button className="close-btn" onClick={() => setSelectedDemande(null)}>✕</button>
              </div>

              <div className="modal-body">
                <div className="detail-section">
                  <h3>📋 Informations générales</h3>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <label>Type de demande</label>
                      <p>{selectedDemande.type_demande}</p>
                    </div>
                    <div className="detail-item">
                      <label>Statut</label>
                      {getStatutBadge(selectedDemande.statut)}
                    </div>
                    <div className="detail-item">
                      <label>Employé</label>
                      <p>{selectedDemande.employe_nom}</p>
                    </div>
                    <div className="detail-item">
                      <label>Date de création</label>
                      <p>{new Date(selectedDemande.created_at).toLocaleString('fr-FR')}</p>
                    </div>
                  </div>
                </div>

                {selectedDemande.type_demande === 'conge' && (
                  <div className="detail-section">
                    <h3>🏖️ Détails du congé</h3>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <label>Type de congé</label>
                        <p>{selectedDemande.type_conge || selectedDemande.type_conge_autre}</p>
                      </div>
                      <div className="detail-item">
                        <label>Période</label>
                        <p>
                          Du {new Date(selectedDemande.date_depart).toLocaleDateString('fr-FR')}
                          {selectedDemande.date_retour && 
                            ` au ${new Date(selectedDemande.date_retour).toLocaleDateString('fr-FR')}`}
                        </p>
                      </div>
                      {selectedDemande.demi_journee && (
                        <div className="detail-item">
                          <label>Demi-journée</label>
                          <p>Oui</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedDemande.frais_deplacement && (
                  <div className="detail-section">
                    <h3>💰 Frais de déplacement</h3>
                    <p className="montant-frais">{parseFloat(selectedDemande.frais_deplacement).toFixed(2)} TND</p>
                  </div>
                )}

                <div className="detail-section">
                  <h3>✓ Approbations</h3>
                  <div className="approbations">
                    <div className={`approbation-item ${selectedDemande.approuve_responsable1 ? 'approved' : 'pending'}`}>
                      <span className="approbation-icon">
                        {selectedDemande.approuve_responsable1 ? '✓' : '⏳'}
                      </span>
                      <span>Responsable 1</span>
                    </div>
                    <div className={`approbation-item ${selectedDemande.approuve_responsable2 ? 'approved' : 'pending'}`}>
                      <span className="approbation-icon">
                        {selectedDemande.approuve_responsable2 ? '✓' : '⏳'}
                      </span>
                      <span>Responsable 2</span>
                    </div>
                  </div>
                </div>

                {selectedDemande.commentaire_refus && (
                  <div className="detail-section refus">
                    <h3>❌ Commentaire de refus</h3>
                    <p>{selectedDemande.commentaire_refus}</p>
                  </div>
                )}
              </div>

              {selectedDemande.statut === 'en_attente' && (
                <div className="modal-actions">
                  <button 
                    className="btn-approve"
                    onClick={() => handleApprouver(selectedDemande.id, 1)}
                  >
                    ✓ Approuver
                  </button>
                  <button 
                    className="btn-reject"
                    onClick={() => {
                      const commentaire = prompt('Raison du rejet:');
                      if (commentaire) handleRejeter(selectedDemande.id, commentaire);
                    }}
                  >
                    ✕ Rejeter
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DemandesRH;
