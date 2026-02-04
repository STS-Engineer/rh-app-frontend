import React, { useState, useEffect, useRef } from 'react';
import { employeesAPI } from '../services/api';
import * as d3 from 'd3';
import { ZoomIn, ZoomOut, RotateCcw, User, Briefcase, Mail, MapPin } from 'lucide-react';
import './Organigramme.css';

const Organigramme = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [zoomLevel, setZoomLevel] = useState(1);
  const svgRef = useRef();
  const containerRef = useRef();

  // Couleurs par département
  const departmentColors = {
    'Général': '#4ECDC4',
    'Digitale': '#FF6B6B',
    'Commerce': '#45B7D1',
    'Chiffrage': '#96CEB4',
    'Achat': '#FFEAA7',
    'Qualité': '#DDA0DD',
    'Logistique Germany': '#98D8C8',
    'Logistique Groupe': '#F7DC6F',
    'Finance': '#BB8FCE',
    'Siège': '#85C1E9',
  };

  // Fonction pour construire la hiérarchie
  const buildHierarchy = () => {
    // Créer un map des employés par email
    const employeeMap = {};
    employees.forEach(emp => {
      employeeMap[emp.adresse_mail?.toLowerCase()] = {
        ...emp,
        children: []
      };
    });

    // Trouver les racines (sans responsable ou responsable non dans la liste)
    const roots = [];
    const processed = new Set();

    employees.forEach(emp => {
      const email = emp.adresse_mail?.toLowerCase();
      if (!email || processed.has(email)) return;

      // Vérifier si c'est un responsable
      const isResponsible = employees.some(e => 
        e.mail_responsable1?.toLowerCase() === email || 
        e.mail_responsable2?.toLowerCase() === email
      );

      // Si pas de responsable ET personne ne le mentionne comme responsable => racine potentielle
      if (!emp.mail_responsable1 && !emp.mail_responsable2) {
        // Vérifier si quelqu'un le mentionne comme responsable
        const isMentionedAsManager = employees.some(e => 
          e.mail_responsable1?.toLowerCase() === email || 
          e.mail_responsable2?.toLowerCase() === email
        );
        
        if (!isMentionedAsManager) {
          // C'est probablement une direction/CEO
          roots.push(employeeMap[email]);
          processed.add(email);
        }
      }
    });

    // Si pas de racines trouvées, prendre Fethi Chaouachi comme racine (STS MANAGER)
    if (roots.length === 0) {
      const fethi = employees.find(e => 
        e.prenom?.toLowerCase().includes('fethi') && 
        e.nom?.toLowerCase().includes('chaouachi')
      );
      if (fethi && fethi.adresse_mail) {
        roots.push(employeeMap[fethi.adresse_mail.toLowerCase()]);
        processed.add(fethi.adresse_mail.toLowerCase());
      }
    }

    // Construire la hiérarchie
    const buildTree = (email) => {
      const emp = employeeMap[email];
      if (!emp) return null;

      // Trouver les subordonnés directs
      const subordinates = employees.filter(e => {
        const resp1 = e.mail_responsable1?.toLowerCase();
        const resp2 = e.mail_responsable2?.toLowerCase();
        return (resp1 === email || resp2 === email) && 
               e.adresse_mail?.toLowerCase() !== email;
      });

      // Ajouter les enfants
      subordinates.forEach(sub => {
        const subEmail = sub.adresse_mail?.toLowerCase();
        if (subEmail && !processed.has(subEmail)) {
          const childNode = employeeMap[subEmail];
          if (childNode) {
            emp.children.push(childNode);
            processed.add(subEmail);
            // Construire récursivement
            buildTree(subEmail);
          }
        }
      });

      return emp;
    };

    // Construire à partir des racines
    roots.forEach(root => {
      if (root && root.email) {
        buildTree(root.adresse_mail?.toLowerCase());
      }
    });

    // Ajouter les employés non connectés
    employees.forEach(emp => {
      const email = emp.adresse_mail?.toLowerCase();
      if (email && !processed.has(email)) {
        // Essayer de trouver un responsable
        let parent = null;
        if (emp.mail_responsable1) {
          parent = employeeMap[emp.mail_responsable1.toLowerCase()];
        } else if (emp.mail_responsable2) {
          parent = employeeMap[emp.mail_responsable2.toLowerCase()];
        }

        if (parent) {
          parent.children.push(employeeMap[email]);
        } else {
          // Ajouter à une racine par défaut
          if (roots[0]) {
            roots[0].children.push(employeeMap[email]);
          }
        }
        processed.add(email);
      }
    });

    return {
      name: 'Organigramme',
      children: roots
    };
  };

  // Charger les employés
  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await employeesAPI.getAll();
      const activeEmployees = response.data.filter(emp => 
        emp.statut === 'actif' || !emp.statut
      );
      setEmployees(activeEmployees);
      setFilteredEmployees(activeEmployees);
    } catch (error) {
      console.error('Erreur chargement employés:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrer les employés
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredEmployees(employees);
    } else {
      const filtered = employees.filter(emp =>
        `${emp.prenom} ${emp.nom}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.poste?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.site_dep?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredEmployees(filtered);
    }
  }, [searchTerm, employees]);

  // Dessiner l'organigramme - VERSION CORRIGÉE
  useEffect(() => {
    if (loading || !svgRef.current || filteredEmployees.length === 0) return;

    // Nettoyer le SVG précédent
    d3.select(svgRef.current).selectAll('*').remove();

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    const margin = { top: 50, right: 20, bottom: 50, left: 20 };

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .style('background', '#f8fafc')
      .style('border-radius', '8px');

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top}) scale(${zoomLevel})`);

    // Construire la hiérarchie
    const hierarchyData = buildHierarchy();
    
    // Créer la structure tree - VERSION CORRIGÉE
    const treeLayout = d3.tree()
      .size([height - margin.top - margin.bottom, width - margin.left - margin.right]);

    const root = d3.hierarchy(hierarchyData);
    treeLayout(root);

    // CORRECTION ICI : Utiliser d3.linkHorizontal() correctement
    const linkGenerator = d3.linkHorizontal()
      .x(d => d.y)
      .y(d => d.x);

    // Dessiner les liens
    const link = g.selectAll('.link')
      .data(root.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', linkGenerator)
      .attr('fill', 'none')
      .attr('stroke', '#94a3b8')
      .attr('stroke-width', 2);

    // Dessiner les nœuds
    const node = g.selectAll('.node')
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.y},${d.x})`)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        // Highlight le nœud et ses liens
        d3.select(this).select('rect').style('stroke', '#3b82f6').style('stroke-width', '3px');
        d3.select(this).select('circle').style('stroke', '#3b82f6').style('stroke-width', '3px');
      })
      .on('mouseout', function(event, d) {
        d3.select(this).select('rect').style('stroke', null).style('stroke-width', null);
        d3.select(this).select('circle').style('stroke', null).style('stroke-width', null);
      });

    // Cercle pour les racines
    node.filter(d => d.depth === 0)
      .append('circle')
      .attr('r', 40)
      .attr('fill', '#3b82f6')
      .attr('stroke', '#1d4ed8')
      .attr('stroke-width', 2);

    // Rectangle pour les autres nœuds
    node.filter(d => d.depth > 0)
      .append('rect')
      .attr('x', -60)
      .attr('y', -40)
      .attr('width', 120)
      .attr('height', 80)
      .attr('rx', 8)
      .attr('fill', d => departmentColors[d.data.site_dep] || '#6b7280')
      .attr('stroke', '#374151')
      .attr('stroke-width', 2);

    // Image ou initiales
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', d => d.depth === 0 ? '0.3em' : '-20')
      .style('font-weight', 'bold')
      .style('fill', d => d.depth === 0 ? 'white' : '#1f2937')
      .text(d => {
        if (d.data.prenom && d.data.nom) {
          return `${d.data.prenom.charAt(0)}${d.data.nom.charAt(0)}`;
        }
        return '?';
      })
      .style('font-size', d => d.depth === 0 ? '20px' : '16px');

    // Nom
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', d => d.depth === 0 ? '1.5em' : '-5')
      .style('font-weight', '600')
      .style('fill', d => d.depth === 0 ? 'white' : '#1f2937')
      .text(d => {
        if (d.data.prenom && d.data.nom) {
          const maxLength = 15;
          const fullName = `${d.data.prenom} ${d.data.nom}`;
          return fullName.length > maxLength 
            ? fullName.substring(0, maxLength) + '...'
            : fullName;
        }
        return '?';
      })
      .style('font-size', '12px');

    // Poste
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', d => d.depth === 0 ? '2.8em' : '15')
      .style('fill', d => d.depth === 0 ? '#d1d5db' : '#4b5563')
      .text(d => {
        if (d.data.poste) {
          const maxLength = 20;
          return d.data.poste.length > maxLength 
            ? d.data.poste.substring(0, maxLength) + '...'
            : d.data.poste;
        }
        return 'Poste non défini';
      })
      .style('font-size', '10px');

    // Département (pour les nœuds non-racine)
    node.filter(d => d.depth > 0)
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '35')
      .style('fill', '#6b7280')
      .style('font-style', 'italic')
      .text(d => d.data.site_dep || 'Département')
      .style('font-size', '9px');

  }, [filteredEmployees, loading, zoomLevel]);

  // Fonctions de contrôle du zoom
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.2, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.2, 0.5));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
  };

  // Statistiques
  const stats = {
    total: filteredEmployees.length,
    departments: [...new Set(filteredEmployees.map(e => e.site_dep))].length,
    managers: filteredEmployees.filter(e => 
      e.poste?.toLowerCase().includes('manager') || 
      e.poste?.toLowerCase().includes('responsable') ||
      e.poste?.toLowerCase().includes('chef')
    ).length
  };

  if (loading) {
    return (
      <div className="organigramme-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Chargement de l'organigramme...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="organigramme-container">
      <div className="organigramme-header">
        <h1>Organigramme Hiérarchique</h1>
        <p className="subtitle">Structure organisationnelle de l'entreprise</p>
      </div>

      <div className="organigramme-stats">
        <div className="stat-card">
          <User size={20} />
          <div>
            <h3>{stats.total}</h3>
            <p>Employés</p>
          </div>
        </div>
        <div className="stat-card">
          <Briefcase size={20} />
          <div>
            <h3>{stats.departments}</h3>
            <p>Départements</p>
          </div>
        </div>
        <div className="stat-card">
          <MapPin size={20} />
          <div>
            <h3>{stats.managers}</h3>
            <p>Responsables</p>
          </div>
        </div>
      </div>

      <div className="organigramme-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Rechercher un employé, poste ou département..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="zoom-controls">
          <button onClick={handleZoomOut} className="zoom-btn" title="Zoom out">
            <ZoomOut size={18} />
          </button>
          <span className="zoom-level">{Math.round(zoomLevel * 100)}%</span>
          <button onClick={handleZoomIn} className="zoom-btn" title="Zoom in">
            <ZoomIn size={18} />
          </button>
          <button onClick={handleResetZoom} className="zoom-btn" title="Réinitialiser">
            <RotateCcw size={18} />
          </button>
        </div>
      </div>

      <div className="organigramme-content">
        <div className="legend">
          <h4>Légende des départements</h4>
          <div className="legend-items">
            {Object.entries(departmentColors).map(([dept, color]) => (
              <div key={dept} className="legend-item">
                <span className="color-dot" style={{ backgroundColor: color }}></span>
                <span>{dept}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-container" ref={containerRef}>
          <svg ref={svgRef} className="organigramme-svg"></svg>
        </div>

        <div className="employee-list">
          <h4>Liste des employés ({filteredEmployees.length})</h4>
          <div className="list-container">
            {filteredEmployees.slice(0, 10).map(employee => (
              <div key={employee.id} className="employee-card">
                <div className="employee-avatar">
                  {employee.photo ? (
                    <img src={employee.photo} alt={`${employee.prenom} ${employee.nom}`} />
                  ) : (
                    <div className="avatar-fallback">
                      {employee.prenom?.charAt(0)}{employee.nom?.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="employee-info">
                  <h5>{employee.prenom} {employee.nom}</h5>
                  <p className="employee-poste">{employee.poste}</p>
                  <p className="employee-department">
                    <Briefcase size={12} /> {employee.site_dep}
                  </p>
                  {employee.adresse_mail && (
                    <p className="employee-email">
                      <Mail size={12} /> {employee.adresse_mail}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="organigramme-footer">
        <p className="update-info">
          Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')} | 
          {filteredEmployees.length} employés actifs
        </p>
        <button onClick={fetchEmployees} className="refresh-btn">
          <RotateCcw size={16} /> Actualiser
        </button>
      </div>
    </div>
  );
};

export default Organigramme;
