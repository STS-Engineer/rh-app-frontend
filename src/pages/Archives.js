import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import EmployeeCard from '../components/EmployeeCard';
import ArchiveEmployeeModal from '../components/ArchiveEmployeeModal';
import { getArchivedEmployees } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import './Archives.css';

const Archives = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
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
      console.error(t('errorLoadingArchives'), error);
      alert(t('errorLoadingArchivesAlert'));
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
      alert('❌ ' + t('noDepartureInterviewAvailable'));
      return;
    }

    if (!isValidUrl(employee.entretien_depart)) {
      alert('❌ ' + t('invalidInterviewLink'));
      return;
    }

    try {
      window.open(employee.entretien_depart, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error(t('errorOpeningPDF'), error);
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
            <p>{t('loadingArchives')}</p>
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
          <h1>📁 {t('archives')}</h1>
          <p>{t('formerEmployeesList')}</p>
        </header>

        <div className="archives-stats">
          <div className="archive-stat-card">
            <div className="stat-icon">📁</div>
            <div className="stat-info">
              <h3>{t('totalArchived')}</h3>
              <p className="stat-number">{archivedEmployees.length}</p>
              <p className="stat-detail">{t('formerEmployees')}</p>
            </div>
          </div>
          
          <div className="archive-stat-card">
            <div className="stat-icon">📄</div>
            <div className="stat-info">
              <h3>{t('withInterview')}</h3>
              <p className="stat-number">
                {archivedEmployees.filter(emp => emp.entretien_depart).length}
              </p>
              <p className="stat-detail">{t('departureInterviews')}</p>
            </div>
          </div>
        </div>

        <div className="search-section">
          <div className="search-bar">
            <input
              type="text"
              placeholder={t('searchArchives')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <span className="search-icon">🔍</span>
          </div>
         
          <div className="action-buttons">
            <button className="refresh-btn" onClick={loadArchivedEmployees}>
              🔄 {t('refresh')}
            </button>
            <button 
              className="back-to-team-btn"
              onClick={() => navigate('/team')}
            >
              👥 {t('backToTeam')}
            </button>
          </div>
        </div>

        <div className="archives-grid">
          {filteredEmployees.map(employee => (
            <div key={employee.id} className="archive-card-wrapper">
              <div onClick={() => handleEmployeeClick(employee)} style={{ cursor: 'pointer' }}>
                <EmployeeCard
                  employee={employee}
                  onClick={() => {}}
                />
              </div>
              <div className="archive-info">
                <p className="departure-date">
                  📅 {t('departure')}: {new Date(employee.date_depart).toLocaleDateString()}
                </p>
               
              </div>
            </div>
          ))}
        </div>

        {filteredEmployees.length === 0 && !loading && (
          <div className="no-archives">
            <div className="empty-archive-icon">📁</div>
            <h3>{t('noArchives')}</h3>
            <p>{t('archivedWillAppear')}</p>
            <button 
              className="back-to-team-btn"
              onClick={() => navigate('/team')}
            >
              👥 {t('viewActiveEmployees')}
            </button>
          </div>
        )}

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
