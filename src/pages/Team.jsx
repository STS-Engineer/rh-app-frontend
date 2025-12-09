import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import EmployeeCard from '../components/EmployeeCard';
import EmployeeModal from '../components/EmployeeModal';
import AddEmployeeModal from '../components/AddEmployeeModal';
import ArchiveModal from '../components/ArchiveModal'; // IMPORTANT: Ajout du modal d'archivage
import { employeesAPI } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import './Team.css';

const Team = () => {
  const { t } = useLanguage();
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [employeeToArchive, setEmployeeToArchive] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [departureDate, setDepartureDate] = useState('');

  // URL du backend
  const backendUrl = 'https://backend-rh.azurewebsites.net';

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = employees.filter(emp =>
        emp.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.poste.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.matricule.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredEmployees(filtered);
    } else {
      setFilteredEmployees(employees);
    }
  }, [searchTerm, employees]);

  // Charger tous les employés actifs
  const loadEmployees = async () => {
    try {
      setLoading(true);
      const response = await employeesAPI.getAll();
      setEmployees(response.data);
      setFilteredEmployees(response.data);
    } catch (error) {
      console.error(t('errorLoadingEmployees'), error);
      alert(t('errorLoadingEmployeesAlert'));
    } finally {
      setLoading(false);
    }
  };

  // Cliquer sur un employé pour voir les détails
  const handleEmployeeClick = (employee) => {
    setSelectedEmployee(employee);
    setIsModalOpen(true);
  };

  // Ouvrir le modal d'archivage pour un employé
  const handleOpenArchiveModal = (employee, date) => {
    setEmployeeToArchive(employee);
    if (date) {
      setDepartureDate(date);
    }
    setIsArchiveModalOpen(true);
  };

  // Fermer le modal d'archivage
  const handleCloseArchiveModal = () => {
    setIsArchiveModalOpen(false);
    setEmployeeToArchive(null);
    setDepartureDate('');
  };

  // Archiver un employé (appelé depuis ArchiveModal)
  const handleArchiveEmployee = async (pdfUrl, dateDepart) => {
    if (!employeeToArchive) return;

    try {
      const token = localStorage.getItem('token');
      
      console.log('📁 Début archivage:', {
        employee: `${employeeToArchive.prenom} ${employeeToArchive.nom}`,
        pdfUrl: pdfUrl,
        dateDepart: dateDepart
      });

      const response = await fetch(
        `${backendUrl}/api/employees/${employeeToArchive.id}/archive`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            pdf_url: pdfUrl,
            entretien_depart: 'Entretien de départ archivé',
            date_depart: dateDepart // Date envoyée depuis le modal
          })
        }
      );

      const responseText = await response.text();
      console.log('📥 Réponse brute:', responseText);

      if (!response.ok) {
        let errorMessage = `Erreur ${response.status}`;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          errorMessage = responseText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // Parser la réponse JSON
      const archivedEmployee = JSON.parse(responseText);
      
      console.log('✅ Employé archivé avec succès:', {
        id: archivedEmployee.id,
        date_depart: archivedEmployee.date_depart,
        statut: archivedEmployee.statut
      });

      // Fermer tous les modals
      setIsArchiveModalOpen(false);
      setIsModalOpen(false);
      
      // Réinitialiser les états
      setEmployeeToArchive(null);
      setSelectedEmployee(null);
      setDepartureDate('');
      
      // Rafraîchir la liste des employés
      await loadEmployees();
      
      // Afficher un message de succès
      alert(`✅ ${employeeToArchive.prenom} ${employeeToArchive.nom} a été archivé avec succès !\nDate de départ: ${new Date(dateDepart).toLocaleDateString('fr-FR')}`);

    } catch (error) {
      console.error('❌ Erreur archivage:', error);
      alert(`❌ Erreur lors de l'archivage: ${error.message}`);
      
      // Ne pas fermer le modal en cas d'erreur
      // L'utilisateur peut réessayer
    }
  };

  // Mettre à jour un employé
  const handleEmployeeUpdate = (updatedEmployee) => {
    setEmployees(prev => prev.map(emp => 
      emp.id === updatedEmployee.id ? updatedEmployee : emp
    ));
    setSelectedEmployee(updatedEmployee);
    // Recharger pour être sûr d'avoir les dernières données
    loadEmployees();
  };

  // Ancienne fonction d'archivage (gardée pour compatibilité)
  const handleEmployeeArchive = (archivedEmployee) => {
    setEmployees(prev => prev.filter(emp => emp.id !== archivedEmployee.id));
    setFilteredEmployees(prev => prev.filter(emp => emp.id !== archivedEmployee.id));
    setIsModalOpen(false);
    setSelectedEmployee(null);
  };

  // Ajouter un nouvel employé
  const handleEmployeeAdd = (newEmployee) => {
    setEmployees(prev => [...prev, newEmployee]);
    setFilteredEmployees(prev => [...prev, newEmployee]);
    setIsAddModalOpen(false);
    // Recharger pour être sûr
    loadEmployees();
  };

  // Fermer le modal de détails
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEmployee(null);
  };

  // Fermer le modal d'ajout
  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
  };

  // Fonction pour restaurer un employé archivé
  const handleRestoreEmployee = async (employeeId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${backendUrl}/api/employees/${employeeId}/restore`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la restauration');
      }

      const restoredEmployee = await response.json();
      console.log('✅ Employé restauré:', restoredEmployee);
      
      // Recharger la liste
      await loadEmployees();
      
      // Si c'est l'employé sélectionné, fermer le modal
      if (selectedEmployee && selectedEmployee.id === employeeId) {
        setIsModalOpen(false);
        setSelectedEmployee(null);
      }
      
      alert('✅ Employé restauré avec succès !');

    } catch (error) {
      console.error('❌ Erreur restauration:', error);
      alert(`❌ Erreur lors de la restauration: ${error.message}`);
    }
  };

  // Statistiques
  const activeEmployeesCount = employees.length;
  const totalEmployeesCount = employees.length; // Pourrait être modifié si on charge aussi les archivés

  if (loading) {
    return (
      <div className="team-container">
        <Sidebar />
        <div className="team-content">
          <div className="loading">
            <div className="loading-spinner"></div>
            <p>{t('loadingEmployees')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="team-container">
      <Sidebar />
      <div className="team-content">
        <header className="team-header">
          <h1>👥 {t('team')}</h1>
          <p>{t('consultEmployees')}</p>
        </header>

        {/* Statistiques */}
        <div className="team-stats">
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-info">
              <h3>{t('activeEmployees')}</h3>
              <p className="stat-number">{activeEmployeesCount}</p>
              <p className="stat-detail">{t('currentlyActive')}</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-info">
              <h3>{t('totalEmployees')}</h3>
              <p className="stat-number">{totalEmployeesCount}</p>
              <p className="stat-detail">{t('inDatabase')}</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">📈</div>
            <div className="stat-info">
              <h3>{t('performance')}</h3>
              <p className="stat-number">100%</p>
              <p className="stat-detail">{t('systemOperational')}</p>
            </div>
          </div>
        </div>

        {/* Recherche et Actions */}
        <div className="search-section">
          <div className="search-bar">
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <span className="search-icon">🔍</span>
          </div>
          <div className="employees-count">
            {filteredEmployees.length} {t('employeesFound')}
          </div>
          <div className="action-buttons">
            <button 
              className="archive-view-btn"
              onClick={() => window.location.href = '/archives'}
            >
              📁 {t('viewArchives')}
            </button>
            <button className="refresh-btn" onClick={loadEmployees}>
              🔄 {t('refresh')}
            </button>
            <button 
              className="add-employee-btn"
              onClick={() => setIsAddModalOpen(true)}
            >
              ➕ {t('addEmployee')}
            </button>
          </div>
        </div>

        {/* Grille des employés */}
        <div className="employees-grid">
          {filteredEmployees.map(employee => (
            <EmployeeCard
              key={employee.id}
              employee={employee}
              onClick={() => handleEmployeeClick(employee)}
              onArchive={(date) => handleOpenArchiveModal(employee, date)}
            />
          ))}
        </div>

        {/* Aucun résultat */}
        {filteredEmployees.length === 0 && !loading && (
          <div className="no-results">
            <div className="no-results-icon">👥</div>
            <h3>{t('noResults')}</h3>
            <p>{searchTerm ? t('noResultsForSearch') : t('noActiveEmployees')}</p>
            <div className="no-results-actions">
              <button 
                className="add-first-btn"
                onClick={() => setIsAddModalOpen(true)}
              >
                ➕ {t('addFirstEmployee')}
              </button>
              <button 
                className="clear-search-btn"
                onClick={() => setSearchTerm('')}
              >
                ✨ {t('clearSearch')}
              </button>
            </div>
          </div>
        )}

        {/* Modals */}
        
        {/* Modal de détails de l'employé */}
        <EmployeeModal
          employee={selectedEmployee}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onUpdate={handleEmployeeUpdate}
          onArchive={handleEmployeeArchive}
          onRestore={handleRestoreEmployee}
          onOpenArchiveModal={handleOpenArchiveModal}
        />

        {/* Modal d'ajout d'employé */}
        <AddEmployeeModal
          isOpen={isAddModalOpen}
          onClose={handleCloseAddModal}
          onAdd={handleEmployeeAdd}
        />

        {/* Modal d'archivage avec date personnalisée */}
        <ArchiveModal
          employee={employeeToArchive}
          isOpen={isArchiveModalOpen}
          onClose={handleCloseArchiveModal}
          onArchive={handleArchiveEmployee}
          departureDate={departureDate}
        />
      </div>
    </div>
  );
};

export default Team;
