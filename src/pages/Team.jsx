import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import EmployeeCard from '../components/EmployeeCard';
import EmployeeModal from '../components/EmployeeModal';
import AddEmployeeModal from '../components/AddEmployeeModal';
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
      console.error(t('errorLoadingEmployees'), error);
      alert(t('errorLoadingEmployeesAlert'));
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeClick = (employee) => {
    setSelectedEmployee(employee);
    setIsModalOpen(true);
  };

  const handleEmployeeUpdate = (updatedEmployee) => {
    setEmployees(prev => prev.map(emp => 
      emp.id === updatedEmployee.id ? updatedEmployee : emp
    ));
    setSelectedEmployee(updatedEmployee);
    loadEmployees();
  };

  const handleEmployeeArchive = (archivedEmployee) => {
    setEmployees(prev => prev.filter(emp => emp.id !== archivedEmployee.id));
    setFilteredEmployees(prev => prev.filter(emp => emp.id !== archivedEmployee.id));
    setIsModalOpen(false);
    setSelectedEmployee(null);
  };

  const handleEmployeeAdd = (newEmployee) => {
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
          <div className="loading">{t('loadingEmployees')}</div>
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
            <h3>{t('noResults')}</h3>
            <p>{searchTerm ? t('noResultsForSearch') : t('noActiveEmployees')}</p>
            <button 
              className="add-first-btn"
              onClick={() => setIsAddModalOpen(true)}
            >
              ➕ {t('addFirstEmployee')}
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
