import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom"; // ✅ ADDED
import Sidebar from "../components/Sidebar";
import EmployeeCard from "../components/EmployeeCard";
import EmployeeModal from "../components/EmployeeModal";
import AddEmployeeModal from "../components/AddEmployeeModal";
import { employeesAPI } from "../services/api";
import { useLanguage } from "../contexts/LanguageContext";
import "./Team.css";

const Team = () => {
  const { t } = useLanguage();
  const location = useLocation(); // ✅ ADDED
  const navigate = useNavigate(); // ✅ ADDED

  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);

  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  // ✅ ADDED: tracks which dashboard filter is active (for the banner)
  const [dashboardFilter, setDashboardFilter] = useState(null);

  // ✅ Filtres
  const [filters, setFilters] = useState({
    site_dep: "",
    poste: "",
    type_contrat: "",
    date_debut_from: "",
    date_debut_to: "",
    date_fin_contrat_from: "",
    date_fin_contrat_to: "",
    date_depart_from: "",
    date_depart_to: "",
  });

  useEffect(() => {
    loadEmployees();
    // ⚠️ pas de eslint-disable ici (ça causait ton erreur)
  }, []);

  // ✅ ADDED: Apply dashboard filter once employees are loaded
  useEffect(() => {
    if (loading || employees.length === 0) return;
    const filter = location.state?.filter;
    if (!filter) return;

    // Clear navigation state so refresh doesn't re-apply
    navigate(location.pathname, { replace: true, state: {} });

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    if (filter === 'newThisMonth') {
      const firstDay = new Date(currentYear, currentMonth, 1);
      const lastDay = new Date(currentYear, currentMonth + 1, 0);
      const fmt = (d) => d.toISOString().split('T')[0];
      setFilters(prev => ({
        ...prev,
        date_debut_from: fmt(firstDay),
        date_debut_to: fmt(lastDay),
      }));
      setDashboardFilter('newThisMonth');
    }

    if (filter === 'contractsToRenew') {
      const in30 = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      setFilters(prev => ({
        ...prev,
        type_contrat: 'CDD',
        date_fin_contrat_from: today.toISOString().split('T')[0],
        date_fin_contrat_to: in30.toISOString().split('T')[0],
      }));
      setDashboardFilter('contractsToRenew');
    }
  }, [loading, employees]); // eslint-disable-line

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const response = await employeesAPI.getAll();
      setEmployees(response.data);
      setFilteredEmployees(response.data);
    } catch (error) {
      console.error("Erreur lors du chargement des employés", error);
      alert("Erreur lors du chargement des employés.");
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeClick = (employee) => {
    setSelectedEmployee(employee);
    setIsModalOpen(true);
  };

  const handleEmployeeUpdate = (updatedEmployee) => {
    setEmployees((prev) =>
      prev.map((emp) => (emp.id === updatedEmployee.id ? updatedEmployee : emp))
    );
    setSelectedEmployee(updatedEmployee);
    loadEmployees();
  };

  const handleEmployeeArchive = (archivedEmployee) => {
    setEmployees((prev) => prev.filter((emp) => emp.id !== archivedEmployee.id));
    setFilteredEmployees((prev) =>
      prev.filter((emp) => emp.id !== archivedEmployee.id)
    );
    setIsModalOpen(false);
    setSelectedEmployee(null);
  };

  const handleEmployeeAdd = (newEmployee) => {
    setEmployees((prev) => [...prev, newEmployee]);
    setFilteredEmployees((prev) => [...prev, newEmployee]);
    setIsAddModalOpen(false);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEmployee(null);
  };

  // ✅ Options uniques pour les selects
  const filterOptions = useMemo(() => {
    const uniq = (arr) =>
      Array.from(new Set(arr.filter(Boolean))).sort((a, b) =>
        String(a).localeCompare(String(b))
      );

    return {
      departments: uniq(employees.map((e) => e.site_dep)),
      postes: uniq(employees.map((e) => e.poste)),
      contractTypes: uniq(employees.map((e) => e.type_contrat)),
    };
  }, [employees]);

  // ✅ Dates
  const toDateOnly = (value) => {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  };

  const inDateRange = (value, from, to) => {
    const d = toDateOnly(value);
    if (!d) return false;
    const f = toDateOnly(from);
    const tt = toDateOnly(to);
    if (f && d < f) return false;
    if (tt && d > tt) return false;
    return true;
  };

  // ✅ Filtrage global (recherche + filtres)
  useEffect(() => {
    const term = searchTerm.trim().toLowerCase();

    const result = employees.filter((emp) => {
      // Recherche
      const matchesSearch = !term
        ? true
        : (emp.nom || "").toLowerCase().includes(term) ||
          (emp.prenom || "").toLowerCase().includes(term) ||
          (emp.matricule || "").toLowerCase().includes(term);

      if (!matchesSearch) return false;

      // Filtres texte
      if (filters.site_dep && emp.site_dep !== filters.site_dep) return false;
      if (filters.poste && emp.poste !== filters.poste) return false;
      if (filters.type_contrat && emp.type_contrat !== filters.type_contrat)
        return false;

      // Dates
      if (filters.date_debut_from || filters.date_debut_to) {
        if (
          !inDateRange(
            emp.date_debut,
            filters.date_debut_from,
            filters.date_debut_to
          )
        )
          return false;
      }

      if (filters.date_fin_contrat_from || filters.date_fin_contrat_to) {
        if (
          !inDateRange(
            emp.date_fin_contrat,
            filters.date_fin_contrat_from,
            filters.date_fin_contrat_to
          )
        )
          return false;
      }

      if (filters.date_depart_from || filters.date_depart_to) {
        if (
          !inDateRange(
            emp.date_depart,
            filters.date_depart_from,
            filters.date_depart_to
          )
        )
          return false;
      }

      return true;
    });

    setFilteredEmployees(result);
  }, [searchTerm, employees, filters]);

  const updateFilter = (name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setDashboardFilter(null); // ✅ ADDED: also clear the banner
    setFilters({
      site_dep: "",
      poste: "",
      type_contrat: "",
      date_debut_from: "",
      date_debut_to: "",
      date_fin_contrat_from: "",
      date_fin_contrat_to: "",
      date_depart_from: "",
      date_depart_to: "",
    });
  };

  const hasActiveFilters = useMemo(() => {
    return Object.values(filters).some((v) => String(v || "").trim() !== "");
  }, [filters]);

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
          <h1>👥 Équipe</h1>
          <p>Consultez et gérez la liste des employés.</p>
        </header>

        {/* ✅ ADDED: Banner shown when redirected from dashboard */}
        {dashboardFilter && (
          <div style={{
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: 10,
            padding: '10px 16px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.9rem',
            color: '#1d4ed8',
            fontWeight: 600
          }}>
            <span>
              {dashboardFilter === 'newThisMonth' && '📊 Filtre actif : Employés embauchés ce mois-ci'}
              {dashboardFilter === 'contractsToRenew' && '📅 Filtre actif : Contrats CDD à renouveler dans 30 jours'}
            </span>
            <button
              onClick={clearFilters}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1d4ed8', fontWeight: 700, fontSize: '1rem' }}
            >
              ✕ Effacer
            </button>
          </div>
        )}

        {/* ✅ BARRE UNIQUE: Recherche + filtres + actions */}
        <div className="toolbar">
          {/* Recherche */}
          <div className="toolbar-search">
            <label className="toolbar-label">Recherche</label>
            <div className="search-bar">
              <input
                type="text"
                placeholder="Nom, prénom ou matricule..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input toolbar-control"
              />
              <span className="search-icon">🔍</span>
            </div>
          </div>

          {/* Département */}
          <div className="toolbar-field">
            <label className="toolbar-label">Département</label>
            <select
              value={filters.site_dep}
              onChange={(e) => updateFilter("site_dep", e.target.value)}
              className="toolbar-control"
            >
              <option value="">Tous</option>
              {filterOptions.departments.map((dep) => (
                <option key={dep} value={dep}>
                  {dep}
                </option>
              ))}
            </select>
          </div>

          {/* Poste */}
          <div className="toolbar-field">
            <label className="toolbar-label">Poste</label>
            <select
              value={filters.poste}
              onChange={(e) => updateFilter("poste", e.target.value)}
              className="toolbar-control"
            >
              <option value="">Tous</option>
              {filterOptions.postes.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Type de contrat */}
          <div className="toolbar-field">
            <label className="toolbar-label">Type de contrat</label>
            <select
              value={filters.type_contrat}
              onChange={(e) => updateFilter("type_contrat", e.target.value)}
              className="toolbar-control"
            >
              <option value="">Tous</option>
              {filterOptions.contractTypes.map((ct) => (
                <option key={ct} value={ct}>
                  {ct}
                </option>
              ))}
            </select>
          </div>

          {/* Date début (du / au) */}
          <div className="toolbar-field">
            <label className="toolbar-label">Date d'embauche (Du)</label>
            <input
              type="date"
              value={filters.date_debut_from}
              onChange={(e) => updateFilter("date_debut_from", e.target.value)}
              className="toolbar-control"
            />
          </div>

          <div className="toolbar-field">
            <label className="toolbar-label">Date d'embauche (Au)</label>
            <input
              type="date"
              value={filters.date_debut_to}
              onChange={(e) => updateFilter("date_debut_to", e.target.value)}
              className="toolbar-control"
            />
          </div>

          {/* Fin contrat (du / au) */}
          <div className="toolbar-field">
            <label className="toolbar-label">Fin de contrat (Du)</label>
            <input
              type="date"
              value={filters.date_fin_contrat_from}
              onChange={(e) =>
                updateFilter("date_fin_contrat_from", e.target.value)
              }
              className="toolbar-control"
            />
          </div>

          <div className="toolbar-field">
            <label className="toolbar-label">Fin de contrat (Au)</label>
            <input
              type="date"
              value={filters.date_fin_contrat_to}
              onChange={(e) =>
                updateFilter("date_fin_contrat_to", e.target.value)
              }
              className="toolbar-control"
            />
          </div>

          {/* Actions */}
          <div className="toolbar-actions">
            <div className="employees-count">
              {filteredEmployees.length} employé(s)
            </div>

            <button className="refresh-btn" onClick={loadEmployees}>
              🔄 Actualiser
            </button>

            <button
              className="add-employee-btn"
              onClick={() => setIsAddModalOpen(true)}
            >
              ➕ Ajouter
            </button>

            <button
              className="clear-filters-btn"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              title="Réinitialiser les filtres"
            >
              🧹 Réinitialiser
            </button>
          </div>
        </div>

        {/* Cartes employés */}
        <div className="employees-grid">
          {filteredEmployees.map((employee) => (
            <EmployeeCard
              key={employee.id}
              employee={employee}
              onClick={handleEmployeeClick}
            />
          ))}
        </div>

        {filteredEmployees.length === 0 && (
          <div className="no-results">
            <div className="no-results-icon">👥</div>
            <h3>Aucun résultat</h3>
            <p>
              {searchTerm || hasActiveFilters
                ? "Aucun employé ne correspond à vos critères."
                : "Aucun employé actif."}
            </p>
            <button
              className="add-first-btn"
              onClick={() => setIsAddModalOpen(true)}
            >
              ➕ Ajouter un employé
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
