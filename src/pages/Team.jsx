import React, { useState, useEffect, useMemo } from 'react';
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

  // ✅ NEW: filters state
  const [filters, setFilters] = useState({
    site_dep: '',         // department
    poste: '',            // job title
    type_contrat: '',     // contract type

    // date ranges (from/to)
    date_debut_from: '',
    date_debut_to: '',

    date_fin_contrat_from: '',
    date_fin_contrat_to: '',

    date_depart_from: '',
    date_depart_to: '',
  });

  useEffect(() => {
    loadEmployees();
  }, []);

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
    setEmployees(prev => prev.map(emp => (emp.id === updatedEmployee.id ? updatedEmployee : emp)));
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

  // ✅ NEW: build dropdown options from employees
  const filterOptions = useMemo(() => {
    const uniq = (arr) => Array.from(new Set(arr.filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b)));

    return {
      departments: uniq(employees.map(e => e.site_dep)),
      postes: uniq(employees.map(e => e.poste)),
      contractTypes: uniq(employees.map(e => e.type_contrat)),
    };
  }, [employees]);

  // ✅ NEW: helpers for date range filtering
  const toDateOnly = (value) => {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    // normalize to midnight for consistent comparisons
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  };

  const inDateRange = (value, from, to) => {
    const d = toDateOnly(value);
    if (!d) return false; // if employee has no date, treat as not matching when filter active
    const f = toDateOnly(from);
    const tt = toDateOnly(to);
    if (f && d < f) return false;
    if (tt && d > tt) return false;
    return true;
  };

  // ✅ NEW: apply search + filters together
  useEffect(() => {
    const term = searchTerm.trim().toLowerCase();

    const hasAnyDateFilter =
      filters.date_debut_from || filters.date_debut_to ||
      filters.date_fin_contrat_from || filters.date_fin_contrat_to ||
      filters.date_depart_from || filters.date_depart_to;

    const result = employees.filter((emp) => {
      // ----- Search -----
      const matchesSearch = !term ? true : (
        (emp.nom || '').toLowerCase().includes(term) ||
        (emp.prenom || '').toLowerCase().includes(term) ||
        (emp.matricule || '').toLowerCase().includes(term)
      );
      if (!matchesSearch) return false;

      // ----- Text filters -----
      if (filters.site_dep && emp.site_dep !== filters.site_dep) return false;
      if (filters.poste && emp.poste !== filters.poste) return false;
      if (filters.type_contrat && emp.type_contrat !== filters.type_contrat) return false;

      // ----- Date filters -----
      // Only apply a date filter group if any boundary is set
      if (filters.date_debut_from || filters.date_debut_to) {
        if (!inDateRange(emp.date_debut, filters.date_debut_from, filters.date_debut_to)) return false;
      }

      if (filters.date_fin_contrat_from || filters.date_fin_contrat_to) {
        if (!inDateRange(emp.date_fin_contrat, filters.date_fin_contrat_from, filters.date_fin_contrat_to)) return false;
      }

      if (filters.date_depart_from || filters.date_depart_to) {
        if (!inDateRange(emp.date_depart, filters.date_depart_from, filters.date_depart_to)) return false;
      }

      // If no date filters at all, we don’t care about missing dates
      // (handled naturally above)
      return true;
    });

    setFilteredEmployees(result);
  }, [searchTerm, employees, filters]);

  const updateFilter = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({
      site_dep: '',
      poste: '',
      type_contrat: '',
      date_debut_from: '',
      date_debut_to: '',
      date_fin_contrat_from: '',
      date_fin_contrat_to: '',
      date_depart_from: '',
      date_depart_to: '',
    });
  };

  const hasActiveFilters = useMemo(() => {
    return Object.values(filters).some(v => String(v || '').trim() !== '');
  }, [filters]);

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

        {/* ✅ NEW: Filters UI */}
        <div className="filters-section">
          <div className="filters-row">
            <div className="filter">
              <label>{t('department') || 'Department'}</label>
              <select value={filters.site_dep} onChange={(e) => updateFilter('site_dep', e.target.value)}>
                <option value="">{t('all') || 'All'}</option>
                {filterOptions.departments.map(dep => (
                  <option key={dep} value={dep}>{dep}</option>
                ))}
              </select>
            </div>

            <div className="filter">
              <label>{t('position') || 'Job title'}</label>
              <select value={filters.poste} onChange={(e) => updateFilter('poste', e.target.value)}>
                <option value="">{t('all') || 'All'}</option>
                {filterOptions.postes.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div className="filter">
              <label>{t('contractType') || 'Contract type'}</label>
              <select value={filters.type_contrat} onChange={(e) => updateFilter('type_contrat', e.target.value)}>
                <option value="">{t('all') || 'All'}</option>
                {filterOptions.contractTypes.map(ct => (
                  <option key={ct} value={ct}>{ct}</option>
                ))}
              </select>
            </div>

            <div className="filter-actions">
              <button className="clear-filters-btn" onClick={clearFilters} disabled={!hasActiveFilters}>
                🧹 {t('clearFilters') || 'Clear filters'}
              </button>
            </div>
          </div>

          <div className="filters-row">
            <div className="filter-group">
              <div className="filter">
                <label>{t('hireDate') || 'Hire date'} (From)</label>
                <input type="date" value={filters.date_debut_from} onChange={(e) => updateFilter('date_debut_from', e.target.value)} />
              </div>
              <div className="filter">
                <label>{t('hireDate') || 'Hire date'} (To)</label>
                <input type="date" value={filters.date_debut_to} onChange={(e) => updateFilter('date_debut_to', e.target.value)} />
              </div>
            </div>

            <div className="filter-group">
              <div className="filter">
                <label>{t('contractEndDate') || 'Contract end'} (From)</label>
                <input type="date" value={filters.date_fin_contrat_from} onChange={(e) => updateFilter('date_fin_contrat_from', e.target.value)} />
              </div>
              <div className="filter">
                <label>{t('contractEndDate') || 'Contract end'} (To)</label>
                <input type="date" value={filters.date_fin_contrat_to} onChange={(e) => updateFilter('date_fin_contrat_to', e.target.value)} />
              </div>
            </div>
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
            <p>
              {searchTerm || hasActiveFilters
                ? (t('noResultsForSearch') || 'No employees match your criteria.')
                : t('noActiveEmployees')}
            </p>
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
          refreshParent={loadEmployees}
        />

        <AddEmployeeModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAdd={handleEmployeeAdd}
        />
      </div>
    </div>
  );
};

export default Team;
