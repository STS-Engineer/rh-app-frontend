import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import EmployeeCard from '../components/EmployeeCard';
import ArchiveEmployeeModal from '../components/ArchiveEmployeeModal';
import { getArchivedEmployees } from '../services/api';
import './Archives.css';

const Archives = () => {
  const navigate = useNavigate();
  const [archivedEmployees, setArchivedEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadArchivedEmployees();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = archivedEmployees.filter(emp =>
        emp.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.poste.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.matricule.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredEmployees(filtered);
    } else {
      setFilteredEmployees(archivedEmployees);
    }
  }, [searchTerm, archivedEmployees]);

  const loadArchivedEmployees = async () => {
    try {
      setLoading(true);
      const response = await getArchivedEmployees();
      setArchivedEmployees(response.data);
      setFilteredEmployees(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des archives:', error);
      alert('Erreur lors du chargement des archives');
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeClick = (employee) => {
    setSelectedEmployee(employee);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEmployee(null);
  };

  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleViewEntretien = (employee, e) => {
    e.stopPropagation();
    
    if (!employee.entretien_depart) {
      alert('❌ Aucun entretien de départ disponible pour cet employé');
      return;
    }

    // Vérifier si c'est une URL valide
    if (!isValidUrl(employee.entretien_depart)) {
      alert('❌ Le lien vers l\'entretien n\'est pas une URL valide');
      return;
    }

    // Ouvrir directement le lien PDF dans un nouvel onglet
    try {
      window.open(employee.entretien_depart, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Erreur lors de l\'ouverture du PDF:', error);
      // Méthode de secours
      const link = document.createElement('a');
      link.href = employee.entretien_depart;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const truncateUrl = (url, maxLength) => {
    if (!url) return '';
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div className="archives-container">
        <Sidebar />
        <div className="archives-content">
          <div className="loading">
            <div className="loading-spinner"></div>
            <p>Chargement des archives...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="archives-container">
      <Sidebar />
      <div className="archives-content">
        <header className="archives-header">
          <h1>📁 Archives des Employés</h1>
          <p>Liste des employés ayant quitté l'entreprise</p>
        </header>

        <div className="archives-stats">
          <div className="archive-stat-card">
            <div className="stat-icon">📁</div>
            <div className="stat-info">
              <h3>Total Archivés</h3>
              <p className="stat-number">{archivedEmployees.length}</p>
              <p className="stat-detail">Anciens employés</p>
            </div>
          </div>
          
          <div className="archive-stat-card">
            <div className="stat-icon">📄</div>
            <div className="stat-info">
              <h3>Avec Entretien</h3>
              <p className="stat-number">
                {archivedEmployees.filter(emp => emp.entretien_depart).length}
              </p>
              <p className="stat-detail">Entretiens de départ</p>
            </div>
          </div>
        </div>

        <div className="search-section">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Rechercher dans les archives..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <span className="search-icon">🔍</span>
          </div>
          <div className="archives-count">
            {filteredEmployees.length} employé(s) archivé(s) trouvé(s)
          </div>
          <div className="action-buttons">
            <button className="refresh-btn" onClick={loadArchivedEmployees}>
              🔄 Actualiser
            </button>
            <button 
              className="back-to-team-btn"
              onClick={() => navigate('/team')}
            >
              👥 Retour à l'équipe
            </button>
          </div>
        </div>

        <div className="archives-grid">
          {filteredEmployees.map(employee => (
            <div key={employee.id} className="archive-card-wrapper">
              <div onClick={() => handleEmployeeClick(employee)} style={{ cursor: 'pointer' }}>
                <EmployeeCard
                  employee={employee}
                  onClick={() => {}} // Désactiver le click original
                />
              </div>
              <div className="archive-info">
                <p className="departure-date">
                  📅 Départ: {new Date(employee.date_depart).toLocaleDateString('fr-FR')}
                </p>
                <div className="archive-actions">
                  {employee.entretien_depart ? (
                    <div className="entretien-section">
                      <button 
                        className="view-entretien-btn"
                        onClick={(e) => handleViewEntretien(employee, e)}
                        title="Ouvrir le PDF de l'entretien"
                      >
                        📄 Voir l'entretien
                      </button>
                     
                    </div>
                  ) : (
                    <span className="no-entretien">Aucun entretien</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredEmployees.length === 0 && !loading && (
          <div className="no-archives">
            <div className="empty-archive-icon">📁</div>
            <h3>Aucun employé archivé</h3>
            <p>Les employés archivés apparaîtront ici après leur départ</p>
            <button 
              className="back-to-team-btn"
              onClick={() => navigate('/team')}
            >
              👥 Voir les employés actifs
            </button>
          </div>
        )}

        {/* Modal pour afficher les détails de l'employé archivé */}
        <ArchiveEmployeeModal
          employee={selectedEmployee}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      </div>
    </div>
  );
};

export default Archives;