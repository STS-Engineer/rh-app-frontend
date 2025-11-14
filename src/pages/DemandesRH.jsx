import React, { useEffect, useState, useMemo } from 'react';
import Sidebar from '../components/Sidebar';
import './DemandesRh.css';

// Adapte cette constante à la façon dont tu appelles déjà ton backend
const API_BASE_URL =
  import.meta?.env?.VITE_API_URL ||
  process.env.REACT_APP_API_URL ||
  'http://localhost:5000';

const DemandesRh = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [demandes, setDemandes] = useState([]);

  // Filtres
  const [statutFilter, setStatutFilter] = useState('all');
  const [typeDemandeFilter, setTypeDemandeFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchDemandes = async () => {
      try {
        setLoading(true);
        setError('');

        const token = localStorage.getItem('token');
        if (!token) {
          setError('Token manquant, veuillez vous reconnecter.');
          setLoading(false);
          return;
        }

        const res = await fetch(`${API_BASE_URL}/api/demandes-rh`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error(`Erreur API (${res.status})`);
        }

        const data = await res.json();
        setDemandes(data);
      } catch (err) {
        console.error('Erreur fetch demandes:', err);
        setError("Impossible de charger les demandes RH.");
      } finally {
        setLoading(false);
      }
    };

    fetchDemandes();
  }, []);

  // Liste des valeurs pour les selects, basée sur les données
  const typeDemandeOptions = useMemo(() => {
    const set = new Set();
    demandes.forEach((d) => {
      if (d.type_demande) set.add(d.type_demande);
    });
    return Array.from(set);
  }, [demandes]);

  const statutOptions = ['en_attente', 'approuvee', 'refusee', 'annulee'];

  // Filtres appliqués côté client
  const filteredDemandes = useMemo(() => {
    return demandes.filter((d) => {
      // Filtre statut
      if (statutFilter !== 'all' && (d.statut || '').toLowerCase() !== statutFilter) {
        return false;
      }

      // Filtre type demande
      if (
        typeDemandeFilter !== 'all' &&
        (d.type_demande || '').toLowerCase() !== typeDemandeFilter.toLowerCase()
      ) {
        return false;
      }

      // Recherche texte sur titre + nom/prenom
      if (search.trim()) {
        const s = search.toLowerCase();
        const titre = (d.titre || '').toLowerCase();
        const nomComplet = `${d.prenom || ''} ${d.nom || ''}`.toLowerCase();
        if (!titre.includes(s) && !nomComplet.includes(s)) {
          return false;
        }
      }

      return true;
    });
  }, [demandes, statutFilter, typeDemandeFilter, search]);

  // Stats
  const stats = useMemo(() => {
    const total = demandes.length;
    const enAttente = demandes.filter(
      (d) => (d.statut || '').toLowerCase() === 'en_attente'
    ).length;
    const approuvees = demandes.filter(
      (d) => (d.statut || '').toLowerCase() === 'approuvee'
    ).length;
    const refusees = demandes.filter(
      (d) => (d.statut || '').toLowerCase() === 'refusee'
    ).length;

    return { total, enAttente, approuvees, refusees };
  }, [demandes]);

  const formatDate = (value) => {
    if (!value) return '-';
    try {
      return new Date(value).toLocaleDateString('fr-FR');
    } catch {
      return value;
    }
  };

  const formatHeure = (value) => {
    if (!value) return '-';
    return value.toString().slice(0, 5); // "HH:MM"
  };

  const renderStatutBadge = (statut) => {
    const s = (statut || '').toLowerCase();
    let className = 'badge badge-default';
    let label = statut || 'N/A';

    if (s === 'en_attente') {
      className = 'badge badge-warning';
      label = 'En attente';
    } else if (s === 'approuvee') {
      className = 'badge badge-success';
      label = 'Approuvée';
    } else if (s === 'refusee') {
      className = 'badge badge-danger';
      label = 'Refusée';
    } else if (s === 'annulee') {
      className = 'badge badge-muted';
      label = 'Annulée';
    }

    return <span className={className}>{label}</span>;
  };

  const renderApprovalChip = (value) => {
    if (value === true) return <span className="chip chip-ok">✔</span>;
    if (value === false) return <span className="chip chip-ko">✖</span>;
    return <span className="chip chip-pending">•</span>;
  };

  return (
    <div className="page-layout">
      <Sidebar />

      <div className="page-content demandes-page">
        <header className="page-header">
          <div>
            <h1>Demandes RH</h1>
            <p className="page-subtitle">
              Vue globale des demandes de congé, déplacement et autres demandes RH.
            </p>
          </div>
          <div className="header-badge">
            {stats.total} demande{stats.total > 1 ? 's' : ''}
          </div>
        </header>

        {/* Cartes de stats */}
        <section className="stats-grid">
          <div className="stat-card">
            <p className="stat-label">Total</p>
            <p className="stat-value">{stats.total}</p>
          </div>
          <div className="stat-card stat-card-warning">
            <p className="stat-label">En attente</p>
            <p className="stat-value">{stats.enAttente}</p>
          </div>
          <div className="stat-card stat-card-success">
            <p className="stat-label">Approuvées</p>
            <p className="stat-value">{stats.approuvees}</p>
          </div>
          <div className="stat-card stat-card-danger">
            <p className="stat-label">Refusées</p>
            <p className="stat-value">{stats.refusees}</p>
          </div>
        </section>

        {/* Filtres */}
        <section className="filters-bar">
          <div className="filter-group">
            <label>Recherche</label>
            <input
              type="text"
              placeholder="Titre, nom d'employé..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label>Statut</label>
            <select
              value={statutFilter}
              onChange={(e) => setStatutFilter(e.target.value)}
            >
              <option value="all">Tous</option>
              {statutOptions.map((s) => (
                <option key={s} value={s}>
                  {s === 'en_attente'
                    ? 'En attente'
                    : s === 'approuvee'
                    ? 'Approuvée'
                    : s === 'refusee'
                    ? 'Refusée'
                    : 'Annulée'}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Type de demande</label>
            <select
              value={typeDemandeFilter}
              onChange={(e) => setTypeDemandeFilter(e.target.value)}
            >
              <option value="all">Tous</option>
              {typeDemandeOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* Contenu principal */}
        <section className="table-section">
          {loading && <div className="info-message">Chargement des demandes...</div>}
          {error && <div className="error-message">{error}</div>}

          {!loading && !error && filteredDemandes.length === 0 && (
            <div className="info-message">
              Aucune demande ne correspond aux filtres actuels.
            </div>
          )}

          {!loading && !error && filteredDemandes.length > 0 && (
            <div className="table-wrapper">
              <table className="demandes-table">
                <thead>
                  <tr>
                    <th>Date demande</th>
                    <th>Titre</th>
                    <th>Employé</th>
                    <th>Type</th>
                    <th>Période</th>
                    <th>Statut</th>
                    <th>Resp. 1</th>
                    <th>Resp. 2</th>
                    <th>Frais</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDemandes.map((d) => (
                    <tr key={d.id}>
                      <td>{formatDate(d.created_at)}</td>
                      <td className="cell-titre">{d.titre || '-'}</td>
                      <td>
                        <div className="cell-employe">
                          <div className="avatar-circle">
                            {((d.prenom || '?')[0] + (d.nom || '?')[0]).toUpperCase()}
                          </div>
                          <div>
                            <div className="employe-name">
                              {d.prenom} {d.nom}
                            </div>
                            <div className="employe-job">
                              {d.poste || '-'} {d.site_dep ? `• ${d.site_dep}` : ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="cell-type">
                          <span className="type-main">{d.type_demande || '-'}</span>
                          {d.type_conge && (
                            <span className="type-sub">{d.type_conge}</span>
                          )}
                          {d.type_conge_autre && (
                            <span className="type-sub">
                              Autre : {d.type_conge_autre}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="cell-periode">
                          <span>
                            Du {formatDate(d.date_depart)} au {formatDate(d.date_retour)}
                          </span>
                          <span className="periode-heure">
                            {d.demi_journee
                              ? 'Demi-journée'
                              : `${formatHeure(d.heure_depart)} → ${formatHeure(
                                  d.heure_retour
                                )}`}
                          </span>
                        </div>
                      </td>
                      <td>{renderStatutBadge(d.statut)}</td>
                      <td>{renderApprovalChip(d.approuve_responsable1)}</td>
                      <td>{renderApprovalChip(d.approuve_responsable2)}</td>
                      <td>
                        {d.frais_deplacement
                          ? `${Number(d.frais_deplacement).toFixed(2)} DT`
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default DemandesRh;
