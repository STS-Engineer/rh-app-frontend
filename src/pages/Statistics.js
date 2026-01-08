import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import { employeesAPI } from '../services/api';
import { exportToPDF, exportToExcel, exportEmployeesToExcel } from '../services/exportService';
import { useLanguage } from '../contexts/LanguageContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import './Statistics.css';

const Statistics = () => {
  const { t } = useLanguage();
  const [stats, setStats] = useState({
    totalEmployees: 0,
    byDepartment: {},
    byContract: {},
    salaryStats: {},
    recentHires: 0,
    averageSalary: 0,
    totalSalary: 0,
    recentHiresList: [],
    byExperience: {},
    byAgeGroup: {},
    monthlyHires: [],
    salaryDistribution: []
  });
  
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedChart, setSelectedChart] = useState('department');
  const [timeRange, setTimeRange] = useState('monthly');
  const chartRef = useRef(null);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
  const AGE_GROUPS = ['18-25', '26-35', '36-45', '46-55', '56+'];

  useEffect(() => {
    loadStatistics();
  }, []);

  const calculateExperience = (dateDebut) => {
    const startDate = new Date(dateDebut);
    const today = new Date();
    const years = today.getFullYear() - startDate.getFullYear();
    const months = today.getMonth() - startDate.getMonth();
    return years + months / 12;
  };

  const calculateAge = (dateNaissance) => {
    const birthDate = new Date(dateNaissance);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const loadStatistics = async () => {
    try {
      setLoading(true);
      const response = await employeesAPI.getAll();
      const employeesData = response.data;
      setEmployees(employeesData);

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const last12Months = Array.from({ length: 12 }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        return {
          month: date.toLocaleString('default', { month: 'short' }),
          year: date.getFullYear(),
          hires: 0
        };
      }).reverse();

      const byDepartment = {};
      const byContract = {};
      const byExperience = {
        '0-2 ans': 0,
        '2-5 ans': 0,
        '5-10 ans': 0,
        '10+ ans': 0
      };
      const byAgeGroup = AGE_GROUPS.reduce((acc, group) => {
        acc[group] = 0;
        return acc;
      }, {});
      
      let totalSalary = 0;
      let recentHires = 0;
      const recentHiresList = [];
      const salaryDistribution = Array(10).fill(0);
      let maxSalary = 0;

      employeesData.forEach(emp => {
        // Department stats
        byDepartment[emp.site_dep] = (byDepartment[emp.site_dep] || 0) + 1;
        
        // Contract stats
        byContract[emp.type_contrat] = (byContract[emp.type_contrat] || 0) + 1;
        
        // Salary stats
        const salary = parseFloat(emp.salaire_brute || 0);
        totalSalary += salary;
        
        // Experience stats
        const experience = calculateExperience(emp.date_debut);
        if (experience < 2) byExperience['0-2 ans']++;
        else if (experience < 5) byExperience['2-5 ans']++;
        else if (experience < 10) byExperience['5-10 ans']++;
        else byExperience['10+ ans']++;
        
        // Age stats
        if (emp.date_naissance) {
          const age = calculateAge(emp.date_naissance);
          if (age >= 18 && age <= 25) byAgeGroup['18-25']++;
          else if (age <= 35) byAgeGroup['26-35']++;
          else if (age <= 45) byAgeGroup['36-45']++;
          else if (age <= 55) byAgeGroup['46-55']++;
          else byAgeGroup['56+']++;
        }
        
        // Recent hires
        const empDate = new Date(emp.date_debut);
        if (empDate.getMonth() === currentMonth && empDate.getFullYear() === currentYear) {
          recentHires++;
          recentHiresList.push(emp);
        }
        
        // Monthly hires
        const hireMonth = empDate.toLocaleString('default', { month: 'short' }) + ' ' + empDate.getFullYear();
        const monthIndex = last12Months.findIndex(m => 
          m.month === empDate.toLocaleString('default', { month: 'short' }) && 
          m.year === empDate.getFullYear()
        );
        if (monthIndex !== -1) {
          last12Months[monthIndex].hires++;
        }
        
        // Salary distribution
        if (salary > maxSalary) maxSalary = salary;
      });

      // Calculate salary distribution
      const salaryRange = maxSalary / 10;
      employeesData.forEach(emp => {
        const salary = parseFloat(emp.salaire_brute || 0);
        const index = Math.min(Math.floor(salary / salaryRange), 9);
        salaryDistribution[index]++;
      });

      const averageSalary = employeesData.length > 0 ? totalSalary / employeesData.length : 0;

      const salaries = employeesData.map(emp => parseFloat(emp.salaire_brute || 0)).sort((a, b) => a - b);
      const salaryStats = {
        min: salaries[0] || 0,
        max: salaries[salaries.length - 1] || 0,
        median: salaries.length > 0 ? salaries[Math.floor(salaries.length / 2)] : 0,
        q1: salaries.length > 0 ? salaries[Math.floor(salaries.length / 4)] : 0,
        q3: salaries.length > 0 ? salaries[Math.floor(3 * salaries.length / 4)] : 0
      };

      // Prepare data for charts
      const departmentData = Object.entries(byDepartment).map(([name, value]) => ({
        name: name.length > 15 ? name.substring(0, 12) + '...' : name,
        value,
        fullName: name
      }));

      const contractData = Object.entries(byContract).map(([name, value]) => ({
        name,
        value,
        fill: COLORS[Object.keys(byContract).indexOf(name) % COLORS.length]
      }));

      const experienceData = Object.entries(byExperience).map(([name, value]) => ({
        name,
        value,
        fullName: name
      }));

      const ageData = Object.entries(byAgeGroup).map(([name, value]) => ({
        name,
        value,
        fill: COLORS[AGE_GROUPS.indexOf(name) % COLORS.length]
      }));

      const salaryDistributionData = salaryDistribution.map((count, index) => ({
        range: `${Math.round(index * salaryRange)}-${Math.round((index + 1) * salaryRange)} DT`,
        count
      }));

      setStats({
        totalEmployees: employeesData.length,
        byDepartment,
        byContract,
        salaryStats,
        recentHires,
        averageSalary,
        totalSalary,
        recentHiresList,
        byExperience,
        byAgeGroup,
        monthlyHires: last12Months,
        salaryDistribution,
        chartData: {
          departmentData,
          contractData,
          experienceData,
          ageData,
          salaryDistributionData,
          monthlyHiresData: last12Months
        }
      });

    } catch (error) {
      console.error(t('errorLoadingStats'), error);
    } finally {
      setLoading(false);
    }
  };

  const getPercentage = (value, total) => {
    return total > 0 ? ((value / total) * 100).toFixed(1) : 0;
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      await exportToPDF('statistics-content', `statistiques-rh-professionnelles-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error(t('exportError'), error);
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = () => {
    setExporting(true);
    try {
      exportToExcel(stats, `statistiques-rh-professionnelles-${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error(t('exportError'), error);
    } finally {
      setExporting(false);
    }
  };

  const handleExportEmployeesExcel = () => {
    setExporting(true);
    try {
      exportEmployeesToExcel(employees, `liste-employes-complete-${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error(t('exportError'), error);
    } finally {
      setExporting(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="tooltip-value" style={{ color: entry.color }}>
              {entry.name}: {entry.value} ({getPercentage(entry.value, stats.totalEmployees)}%)
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="statistics-container">
        <Sidebar />
        <div className="statistics-content">
          <div className="loading">
            <div className="loading-spinner"></div>
            <p>{t('loadingStatistics')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="statistics-container">
      <Sidebar />
      <div className="statistics-content" id="statistics-content">
        <header className="statistics-header">
          <div className="header-top">
            <h1>📊 {t('statisticsDashboard')}</h1>
            <div className="time-selector">
              <button 
                className={timeRange === 'monthly' ? 'active' : ''}
                onClick={() => setTimeRange('monthly')}
              >
                Mensuel
              </button>
              <button 
                className={timeRange === 'quarterly' ? 'active' : ''}
                onClick={() => setTimeRange('quarterly')}
              >
                Trimestriel
              </button>
              <button 
                className={timeRange === 'yearly' ? 'active' : ''}
                onClick={() => setTimeRange('yearly')}
              >
                Annuel
              </button>
            </div>
          </div>
          <p>{t('hrAnalysis')} - {new Date().toLocaleDateString('fr-FR', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</p>
          <div className="chart-selector">
            <button 
              className={selectedChart === 'department' ? 'active' : ''}
              onClick={() => setSelectedChart('department')}
            >
              Départements
            </button>
            <button 
              className={selectedChart === 'contract' ? 'active' : ''}
              onClick={() => setSelectedChart('contract')}
            >
              Contrats
            </button>
            <button 
              className={selectedChart === 'experience' ? 'active' : ''}
              onClick={() => setSelectedChart('experience')}
            >
              Expérience
            </button>
            <button 
              className={selectedChart === 'age' ? 'active' : ''}
              onClick={() => setSelectedChart('age')}
            >
              Tranches d'âge
            </button>
          </div>
        </header>

        <div className="stats-overview">
          <div className="stat-card primary">
            <div className="stat-icon">👥</div>
            <div className="stat-info">
              <h3>{t('totalEmployees')}</h3>
              <p className="stat-number">{stats.totalEmployees}</p>
              <p className="stat-detail">{stats.recentHires} {t('newThisMonth')}</p>
              <div className="stat-trend">
                <span className="trend-up">↑ 12%</span> vs mois dernier
              </div>
            </div>
          </div>

          <div className="stat-card success">
            <div className="stat-icon">💰</div>
            <div className="stat-info">
              <h3>{t('totalSalary')}</h3>
              <p className="stat-number">{stats.totalSalary.toLocaleString('fr-FR')} DT</p>
              <p className="stat-detail">{t('monthlyGross')}</p>
              <div className="stat-trend">
                <span className="trend-up">↑ 8%</span> vs mois dernier
              </div>
            </div>
          </div>

          <div className="stat-card warning">
            <div className="stat-icon">📈</div>
            <div className="stat-info">
              <h3>{t('averageSalary')}</h3>
              <p className="stat-number">{stats.averageSalary.toFixed(0)} DT</p>
              <p className="stat-detail">{t('perEmployee')}</p>
              <div className="stat-trend">
                <span className="trend-up">↑ 5%</span> vs trimestre dernier
              </div>
            </div>
          </div>

          <div className="stat-card info">
            <div className="stat-icon">🏢</div>
            <div className="stat-info">
              <h3>{t('departments')}</h3>
              <p className="stat-number">{Object.keys(stats.byDepartment).length}</p>
              <p className="stat-detail">{t('activeSites')}</p>
              <div className="stat-trend">
                <span className="trend-neutral">→</span> stable
              </div>
            </div>
          </div>
        </div>

        <div className="professional-charts">
          <div className="charts-row">
            <div className="chart-container large">
              <h3>📋 {t('departmentDistribution')}</h3>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart
                    data={stats.chartData?.departmentData || []}
                    margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      label={{ 
                        value: 'Nombre d\'employés', 
                        angle: -90, 
                        position: 'insideLeft',
                        offset: -10
                      }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar 
                      dataKey="value" 
                      name="Employés" 
                      fill="var(--primary-blue)"
                      radius={[4, 4, 0, 0]}
                    >
                      {stats.chartData?.departmentData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="chart-container medium">
              <h3>📄 {t('contractTypes')}</h3>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={stats.chartData?.contractData || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                    >
                      {stats.chartData?.contractData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} employés`, 'Nombre']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="charts-row">
            <div className="chart-container medium">
              <h3>📅 Embauches sur 12 mois</h3>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart
                    data={stats.chartData?.monthlyHiresData || []}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="hires" 
                      name="Embauches"
                      stroke="var(--primary-orange)" 
                      fill="var(--primary-orange)" 
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="chart-container medium">
              <h3>🎯 Distribution des salaires</h3>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={stats.chartData?.salaryDistributionData || []}
                    margin={{ top: 10, right: 30, left: 20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip />
                    <Bar 
                      dataKey="count" 
                      name="Nombre d'employés"
                      fill="var(--success-color)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="charts-row">
            <div className="chart-container medium">
              <h3>⏳ Niveaux d'expérience</h3>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart outerRadius={90} data={stats.chartData?.experienceData || []}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="name" />
                    <PolarRadiusAxis angle={30} domain={[0, 'auto']} />
                    <Radar
                      name="Expérience"
                      dataKey="value"
                      stroke="var(--primary-blue)"
                      fill="var(--primary-blue)"
                      fillOpacity={0.6}
                    />
                    <Legend />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="chart-container medium">
              <h3>👥 Tranches d'âge</h3>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={stats.chartData?.ageData || []}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="value"
                      name="Effectif"
                      stroke="var(--warning-color)"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        <div className="detailed-stats">
          <div className="stats-card">
            <h3>📊 Statistiques salariales détaillées</h3>
            <div className="salary-grid">
              <div className="salary-stat">
                <span className="salary-label">Minimum</span>
                <span className="salary-value">{stats.salaryStats.min.toLocaleString('fr-FR')} DT</span>
                <div className="salary-bar" style={{ width: '25%' }}></div>
              </div>
              <div className="salary-stat">
                <span className="salary-label">1er Quartile</span>
                <span className="salary-value">{stats.salaryStats.q1?.toLocaleString('fr-FR') || '0'} DT</span>
                <div className="salary-bar" style={{ width: '50%' }}></div>
              </div>
              <div className="salary-stat">
                <span className="salary-label">Médiane</span>
                <span className="salary-value">{stats.salaryStats.median.toLocaleString('fr-FR')} DT</span>
                <div className="salary-bar" style={{ width: '75%' }}></div>
              </div>
              <div className="salary-stat">
                <span className="salary-label">Moyenne</span>
                <span className="salary-value">{stats.averageSalary.toFixed(0)} DT</span>
                <div className="salary-bar" style={{ width: '80%' }}></div>
              </div>
              <div className="salary-stat">
                <span className="salary-label">3ème Quartile</span>
                <span className="salary-value">{stats.salaryStats.q3?.toLocaleString('fr-FR') || '0'} DT</span>
                <div className="salary-bar" style={{ width: '90%' }}></div>
              </div>
              <div className="salary-stat">
                <span className="salary-label">Maximum</span>
                <span className="salary-value">{stats.salaryStats.max.toLocaleString('fr-FR')} DT</span>
                <div className="salary-bar" style={{ width: '100%' }}></div>
              </div>
            </div>
          </div>

          <div className="stats-card">
            <h3>🆕 Dernières embauches</h3>
            <div className="recent-hires-table">
              <table>
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Poste</th>
                    <th>Département</th>
                    <th>Contrat</th>
                    <th>Salaire</th>
                    <th>Date d'embauche</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentHiresList
                    .sort((a, b) => new Date(b.date_debut) - new Date(a.date_debut))
                    .slice(0, 6)
                    .map(emp => (
                      <tr key={emp.id}>
                        <td>
                          <div className="employee-info">
                            <div className="employee-avatar">
                              {emp.prenom.charAt(0)}{emp.nom.charAt(0)}
                            </div>
                            <div className="employee-name">
                              <strong>{emp.prenom} {emp.nom}</strong>
                            </div>
                          </div>
                        </td>
                        <td>{emp.poste}</td>
                        <td>
                          <span className="department-badge">{emp.site_dep}</span>
                        </td>
                        <td>
                          <span className={`contract-badge ${emp.type_contrat?.toLowerCase()}`}>
                            {emp.type_contrat}
                          </span>
                        </td>
                        <td className="salary-cell">
                          {parseFloat(emp.salaire_brute || 0).toLocaleString('fr-FR')} DT
                        </td>
                        <td className="date-cell">
                          {new Date(emp.date_debut).toLocaleDateString('fr-FR')}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {stats.recentHiresList.length === 0 && (
                <p className="no-data">{t('noHiresThisMonth')}</p>
              )}
            </div>
          </div>
        </div>

        <div className="export-section">
          <h3>📤 Export des données professionnelles</h3>
          <div className="export-buttons">
            <button 
              className="export-btn pdf"
              onClick={handleExportPDF}
              disabled={exporting}
            >
              {exporting ? '⏳' : '📄'} Exporter en PDF complet
            </button>
            <button 
              className="export-btn excel"
              onClick={handleExportExcel}
              disabled={exporting}
            >
              {exporting ? '⏳' : '📊'} Statistiques Excel
            </button>
            <button 
              className="export-btn excel"
              onClick={handleExportEmployeesExcel}
              disabled={exporting}
            >
              {exporting ? '⏳' : '👥'} Liste complète Excel
            </button>
            <button 
              className="export-btn charts"
              onClick={() => window.print()}
              disabled={exporting}
            >
              {exporting ? '⏳' : '🖨️'} Imprimer les graphiques
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Statistics;
