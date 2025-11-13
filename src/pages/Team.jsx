import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import EmployeeCard from '../components/EmployeeCard';
import EmployeeModal from '../components/EmployeeModal';
import AddEmployeeModal from '../components/AddEmployeeModal';
import { employeesAPI } from '../services/api';
import './Team.css';

const Team = () => {
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

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

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const response = await employeesAPI.getAll();
      setEmployees(response.data);
      setFilteredEmployees(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des employés:', error);
      alert('Erreur lors du chargement des employés');
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeClick = (employee) => {
    setSelectedEmployee(employee);
    setIsModalOpen(true);
  };

  const handleEmployeeUpdate = (updatedEmployee) => {
    console.log('🔄 Mise à jour de l\'employé dans la liste:', updatedEmployee);
    
    setEmployees(prev => prev.map(emp => 
      emp.id === updatedEmployee.id ? updatedEmployee : emp
    ));
    
    setSelectedEmployee(updatedEmployee);
    loadEmployees(); // Recharger pour s'assurer des données à jour
  };

  const handleEmployeeArchive = (archivedEmployee) => {
    console.log('📁 Employé archivé:', archivedEmployee);
    
    // Retirer l'employé archivé de la liste des actifs
    setEmployees(prev => prev.filter(emp => emp.id !== archivedEmployee.id));
    setFilteredEmployees(prev => prev.filter(emp => emp.id !== archivedEmployee.id));
    
    setIsModalOpen(false);
    setSelectedEmployee(null);
  };

  const handleEmployeeAdd = (newEmployee) => {
    console.log('➕ Nouvel employé ajouté:', newEmployee);
    
    setEmployees(prev => [...prev, newEmployee]);
    setFilteredEmployees(prev => [...prev, newEmployee]);
    setIsAddModalOpen(false);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEmployee(null);
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
  };

  if (loading) {
    return (
      <div className="team-container">
        <Sidebar />
        <div className="team-content">
          <div className="loading">Chargement des employés...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="team-container">
      <Sidebar />
      <div className="team-content">
        <header className="team-header">
          <h1>👥 Gestion de l'Équipe</h1>
          <p>Consultez et gérez les informations de vos employés actifs</p>
        </header>

        <div className="search-section">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Rechercher par nom, prénom, poste ou matricule..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <span className="search-icon">🔍</span>
          </div>
          <div className="employees-count">
            {filteredEmployees.length} employé(s) trouvé(s)
          </div>
          <div className="action-buttons">
            <button className="refresh-btn" onClick={loadEmployees}>
              🔄 Actualiser
            </button>
            <button 
              className="add-employee-btn"
              onClick={() => setIsAddModalOpen(true)}
            >
              ➕ Ajouter Employé
            </button>
          </div>
        </div>

        <div className="employees-grid">
          {filteredEmployees.map(employee => (
            <EmployeeCard
              key={employee.id}
              employee={employee}
              onClick={handleEmployeeClick}
            />
          ))}
        </div>

        {filteredEmployees.length === 0 && !loading && (
          <div className="no-results">
            <div className="no-results-icon">👥</div>
            <h3>Aucun employé trouvé</h3>
            <p>{searchTerm ? 'Aucun résultat pour votre recherche' : 'Aucun employé actif dans le système'}</p>
            <button 
              className="add-first-btn"
              onClick={() => setIsAddModalOpen(true)}
            >
              ➕ Ajouter le premier employé
            </button>
          </div>
        )}

        <EmployeeModal
          employee={selectedEmployee}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onUpdate={handleEmployeeUpdate}
          onArchive={handleEmployeeArchive}
        />

        <AddEmployeeModal
          isOpen={isAddModalOpen}
          onClose={handleCloseAddModal}
          onAdd={handleEmployeeAdd}
        />
      </div>
    </div>
  );
};

export default Team;