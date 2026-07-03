import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom"; // ✅ ADDED
import Sidebar from "../components/Sidebar";
import EmployeeCard from "../components/EmployeeCard";
import EmployeeModal from "../components/EmployeeModal";
import AddEmployeeModal from "../components/AddEmployeeModal";
import { employeesAPI, getCurrentUser, isGlobalHrManager } from "../services/api";
import {
  getEmployeeSite,
  getEmployeeDepartment,
  getEmployeeGrade,
  getEmployeeRole
} from "../utils/employeeProfile";
import { useLanguage } from "../contexts/LanguageContext";
import "./Team.css";

const Team = () => {
  const { t } = useLanguage();
  const location = useLocation(); // ✅ ADDED
  const navigate = useNavigate(); // ✅ ADDED
  const canFilterByPlant = isGlobalHrManager(getCurrentUser());
  const siteLabel = (t("plantSite") || "Site").split("/").pop().trim() || "Site";

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
    site: "",
    department: "",
    role: "",
    grade: "",
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
      console.error(t("errorLoadingEmployees"), error);
      alert(t("errorLoadingEmployeesAlert"));
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
      sites: uniq(employees.map((e) => getEmployeeSite(e))),
      departments: uniq(employees.map((e) => getEmployeeDepartment(e))),
      roles: uniq(employees.map((e) => getEmployeeRole(e))),
      grades: uniq(employees.map((e) => getEmployeeGrade(e))),
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
          (emp.matricule || "").toLowerCase().includes(term) ||
          getEmployeeSite(emp).toLowerCase().includes(term) ||
          getEmployeeDepartment(emp).toLowerCase().includes(term);

      if (!matchesSearch) return false;

      // Filtres texte
      if (canFilterByPlant && filters.site && getEmployeeSite(emp) !== filters.site) return false;
      if (filters.department && getEmployeeDepartment(emp) !== filters.department) return false;
      if (filters.role && getEmployeeRole(emp) !== filters.role) return false;
      if (filters.grade && getEmployeeGrade(emp) !== filters.grade) return false;
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
  }, [searchTerm, employees, filters, canFilterByPlant]);

  const updateFilter = (name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setDashboardFilter(null); // ✅ ADDED: also clear the banner
    setFilters({
      site: "",
      department: "",
      role: "",
      grade: "",
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
          <div className="loading">{t("loadingEmployees")}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="team-container">
      <Sidebar />

      <div className="team-content">
        <header className="team-header">
          <h1>👥 {t("team")}</h1>
          <p>{t("consultEmployees")}</p>
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
              {dashboardFilter === 'newThisMonth' && `📊 ${t("activeFilterNewThisMonth")}`}
              {dashboardFilter === 'contractsToRenew' && `📅 ${t("activeFilterContractsToRenew")}`}
            </span>
            <button
              onClick={clearFilters}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1d4ed8', fontWeight: 700, fontSize: '1rem' }}
            >
              ✕ {t("clearFilters")}
            </button>
          </div>
        )}

        {/* ✅ BARRE UNIQUE: Recherche + filtres + actions */}
        <div className="toolbar">
          {/* Recherche */}
          <div className="toolbar-search">
            <label className="toolbar-label">{t("teamSearchLabel")}</label>
            <div className="search-bar">
              <input
                type="text"
                placeholder={t("teamSearchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input toolbar-control"
              />
              <span className="search-icon">🔍</span>
            </div>
          </div>

          {/* Site */}
          {canFilterByPlant && (
            <div className="toolbar-field">
              <label className="toolbar-label">{siteLabel}</label>
              <select
                value={filters.site}
                onChange={(e) => updateFilter("site", e.target.value)}
                className="toolbar-control"
              >
                <option value="">{t("teamFilterAll")}</option>
                {filterOptions.sites.map((site) => (
                  <option key={site} value={site}>
                    {site}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Département */}
          <div className="toolbar-field">
            <label className="toolbar-label">{t("teamFilterDepartment")}</label>
            <select
              value={filters.department}
              onChange={(e) => updateFilter("department", e.target.value)}
              className="toolbar-control"
            >
              <option value="">{t("teamFilterAll")}</option>
                {filterOptions.departments.map((dep) => (
                  <option key={dep} value={dep}>
                    {dep}
                  </option>
                ))}
              </select>
            </div>

          {/* Role */}
          <div className="toolbar-field">
            <label className="toolbar-label">{t("teamFilterPosition")}</label>
            <select
              value={filters.role}
              onChange={(e) => updateFilter("role", e.target.value)}
              className="toolbar-control"
            >
              <option value="">{t("teamFilterAll")}</option>
              {filterOptions.roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          {/* Grade */}
          <div className="toolbar-field">
            <label className="toolbar-label">{t("teamFilterGrade")}</label>
            <select
              value={filters.grade}
              onChange={(e) => updateFilter("grade", e.target.value)}
              className="toolbar-control"
            >
              <option value="">{t("teamFilterAll")}</option>
              {filterOptions.grades.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
          </div>

          {/* Type de contrat */}
          <div className="toolbar-field">
            <label className="toolbar-label">{t("teamFilterContractType")}</label>
            <select
              value={filters.type_contrat}
              onChange={(e) => updateFilter("type_contrat", e.target.value)}
              className="toolbar-control"
            >
              <option value="">{t("teamFilterAll")}</option>
              {filterOptions.contractTypes.map((ct) => (
                <option key={ct} value={ct}>
                  {ct}
                </option>
              ))}
            </select>
          </div>

          {/* Date début (du / au) */}
          <div className="toolbar-field">
            <label className="toolbar-label">{t("teamFilterHireDateFrom")}</label>
            <input
              type="date"
              value={filters.date_debut_from}
              onChange={(e) => updateFilter("date_debut_from", e.target.value)}
              className="toolbar-control"
            />
          </div>

          <div className="toolbar-field">
            <label className="toolbar-label">{t("teamFilterHireDateTo")}</label>
            <input
              type="date"
              value={filters.date_debut_to}
              onChange={(e) => updateFilter("date_debut_to", e.target.value)}
              className="toolbar-control"
            />
          </div>

          {/* Fin contrat (du / au) */}
          <div className="toolbar-field">
            <label className="toolbar-label">{t("teamFilterContractEndFrom")}</label>
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
            <label className="toolbar-label">{t("teamFilterContractEndTo")}</label>
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
              {filteredEmployees.length} {t("teamCount")}
            </div>

            <button className="refresh-btn" onClick={loadEmployees}>
              🔄 {t("teamRefresh")}
            </button>

            <button
              className="add-employee-btn"
              onClick={() => setIsAddModalOpen(true)}
            >
              ➕ {t("teamAdd")}
            </button>

            <button
              className="clear-filters-btn"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              title={t("teamResetFilters")}
            >
              🧹 {t("teamReset")}
            </button>
          </div>
        </div>

        {/* Cartes employés */}
        <div className="employees-grid">
          {filteredEmployees.map((employee) => (
            <EmployeeCard
              key={`${employee.tenant_schema || 'public'}-${employee.id}`}
              employee={employee}
              onClick={handleEmployeeClick}
            />
          ))}
        </div>

        {filteredEmployees.length === 0 && (
          <div className="no-results">
            <div className="no-results-icon">👥</div>
            <h3>{t("teamNoResults")}</h3>
            <p>
              {searchTerm || hasActiveFilters
                ? t("teamNoResultsCriteria")
                : t("teamNoActive")}
            </p>
            <button
              className="add-first-btn"
              onClick={() => setIsAddModalOpen(true)}
            >
              ➕ {t("teamAddEmployee")}
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



