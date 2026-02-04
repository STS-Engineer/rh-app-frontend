import React, { useState, useEffect, useRef } from 'react';
import { employeesAPI } from '../services/api';
import * as d3 from 'd3';
import { ZoomIn, ZoomOut, RotateCcw, User, Briefcase, Mail, Phone, MapPin, Users } from 'lucide-react';
import './Organigramme.css';

const Organigramme = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedNode, setSelectedNode] = useState(null);
  const svgRef = useRef();
  const containerRef = useRef();

  // Couleurs par département
  const departmentColors = {
    'CEO': '#2563eb',
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
      const email = emp.adresse_mail?.toLowerCase();
      if (email) {
        employeeMap[email] = {
          ...emp,
          children: []
        };
      }
    });

    // Trouver Fethi comme CEO (racine principale)
    const fethi = employees.find(e => 
      e.prenom?.toLowerCase().includes('fethi') && 
      e.nom?.toLowerCase().includes('chaouachi')
    );

    if (!fethi || !fethi.adresse_mail) {
      console.error('CEO Fethi Chaouachi non trouvé');
      return { name: 'Organigramme', children: [] };
    }

    const fethiEmail = fethi.adresse_mail.toLowerCase();
    const fethiNode = employeeMap[fethiEmail];
    fethiNode.isCEO = true;
    fethiNode.site_dep = 'CEO';

    const processed = new Set([fethiEmail]);

    // Fonction pour construire l'arbre récursivement
    const buildTree = (managerEmail) => {
      const manager = employeeMap[managerEmail];
      if (!manager) return;

      // Trouver tous les employés qui ont ce manager comme responsable 1 ou 2
      const subordinates = employees.filter(e => {
        const email = e.adresse_mail?.toLowerCase();
        if (!email || processed.has(email)) return false;
        
        const resp1 = e.mail_responsable1?.toLowerCase();
        const resp2 = e.mail_responsable2?.toLowerCase();
        
        return resp1 === managerEmail || resp2 === managerEmail;
      });

      // Trier les subordonnés : responsables/managers d'abord
      subordinates.sort((a, b) => {
        const aIsManager = a.poste?.toLowerCase().includes('responsable') || 
                         a.poste?.toLowerCase().includes('manager') ||
                         a.poste?.toLowerCase().includes('chef');
        const bIsManager = b.poste?.toLowerCase().includes('responsable') || 
                         b.poste?.toLowerCase().includes('manager') ||
                         b.poste?.toLowerCase().includes('chef');
        
        if (aIsManager && !bIsManager) return -1;
        if (!aIsManager && bIsManager) return 1;
        return 0;
      });

      // Ajouter chaque subordonné et construire son sous-arbre
      subordinates.forEach(sub => {
        const subEmail = sub.adresse_mail?.toLowerCase();
        if (subEmail && !processed.has(subEmail)) {
          const childNode = employeeMap[subEmail];
          if (childNode) {
            manager.children.push(childNode);
            processed.add(subEmail);
            // Construire récursivement l'arbre pour ce subordonné
            buildTree(subEmail);
          }
        }
      });
    };

    // Construire l'arbre à partir de Fethi
    buildTree(fethiEmail);

    // Ajouter les employés non connectés directement sous Fethi
    employees.forEach(emp => {
      const email = emp.adresse_mail?.toLowerCase();
      if (email && !processed.has(email)) {
        const empNode = employeeMap[email];
        if (empNode) {
          fethiNode.children.push(empNode);
          processed.add(email);
        }
      }
    });

    return fethiNode;
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

  // Dessiner l'organigramme VERTICAL
  useEffect(() => {
    if (loading || !svgRef.current || filteredEmployees.length === 0) return;

    // Nettoyer le SVG précédent
    d3.select(svgRef.current).selectAll('*').remove();

    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;
    
    // Dimensions adaptées pour l'affichage vertical
    const nodeWidth = 180;
    const nodeHeight = 100;
    const levelHeight = 200;

    // Construire la hiérarchie
    const hierarchyData = buildHierarchy();
    
    // Créer la structure tree avec orientation verticale
    const root = d3.hierarchy(hierarchyData);
    
    // Calculer les dimensions nécessaires
    const maxDepth = root.height;
    const width = Math.max(containerWidth, root.descendants().length * 100);
    const height = (maxDepth + 1) * levelHeight + 200;

    const svg = d3.select(svgRef.current)
      .attr('width', containerWidth)
      .attr('height', containerHeight);

    // Groupe principal avec zoom et pan
    const g = svg.append('g')
      .attr('class', 'main-group');

    // Créer le layout tree vertical (top to bottom)
    const treeLayout = d3.tree()
      .size([width - 200, height - 200])
      .separation((a, b) => {
        return a.parent === b.parent ? 1 : 1.5;
      });

    treeLayout(root);

    // Ajuster la position initiale pour centrer horizontalement
    const initialX = containerWidth / 2 - width / 4;
    const initialY = 50;

    g.attr('transform', `translate(${initialX},${initialY}) scale(${zoomLevel})`);

    // Définir les gradients pour les liens
    const defs = svg.append('defs');
    
    const gradient = defs.append('linearGradient')
      .attr('id', 'link-gradient')
      .attr('gradientUnits', 'userSpaceOnUse');
    
    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#3b82f6');
    
    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#8b5cf6');

    // Dessiner les liens avec courbes verticales (top to bottom)
    const link = g.selectAll('.link')
      .data(root.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', d => {
        // Lien vertical de haut en bas
        return `M${d.source.x},${d.source.y}
                C${d.source.x},${(d.source.y + d.target.y) / 2}
                 ${d.target.x},${(d.source.y + d.target.y) / 2}
                 ${d.target.x},${d.target.y}`;
      })
      .attr('fill', 'none')
      .attr('stroke', d => d.target.data.isCEO ? '#2563eb' : '#94a3b8')
      .attr('stroke-width', d => d.source.data.isCEO ? 3 : 2)
      .attr('opacity', 0.6);

    // Dessiner les nœuds
    const node = g.selectAll('.node')
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('class', d => `node ${d.data.isCEO ? 'node-ceo' : ''} node-depth-${d.depth}`)
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        setSelectedNode(d.data);
      })
      .on('mouseover', function(event, d) {
        d3.select(this).select('.node-rect').style('filter', 'brightness(1.1)');
        d3.select(this).select('.node-circle').style('filter', 'brightness(1.1)');
        
        // Highlight les liens connectés
        g.selectAll('.link')
          .style('opacity', l => 
            l.source === d || l.target === d ? 1 : 0.2
          );
      })
      .on('mouseout', function(event, d) {
        d3.select(this).select('.node-rect').style('filter', null);
        d3.select(this).select('.node-circle').style('filter', null);
        
        g.selectAll('.link').style('opacity', 0.6);
      });

    // Cercle pour le CEO
    node.filter(d => d.data.isCEO)
      .append('circle')
      .attr('class', 'node-circle')
      .attr('r', 55)
      .attr('fill', 'url(#ceo-gradient)')
      .attr('stroke', '#1e40af')
      .attr('stroke-width', 4);

    // Gradient pour le CEO
    const ceoGradient = defs.append('radialGradient')
      .attr('id', 'ceo-gradient');
    
    ceoGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#3b82f6');
    
    ceoGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#1e40af');

    // Rectangle pour les autres nœuds
    node.filter(d => !d.data.isCEO)
      .append('rect')
      .attr('class', 'node-rect')
      .attr('x', -nodeWidth / 2)
      .attr('y', -nodeHeight / 2)
      .attr('width', nodeWidth)
      .attr('height', nodeHeight)
      .attr('rx', 12)
      .attr('fill', d => {
        const isManager = d.data.poste?.toLowerCase().includes('responsable') || 
                         d.data.poste?.toLowerCase().includes('manager') ||
                         d.data.poste?.toLowerCase().includes('chef');
        return isManager ? '#4f46e5' : (departmentColors[d.data.site_dep] || '#6b7280');
      })
      .attr('stroke', d => {
        const isManager = d.data.poste?.toLowerCase().includes('responsable') || 
                         d.data.poste?.toLowerCase().includes('manager') ||
                         d.data.poste?.toLowerCase().includes('chef');
        return isManager ? '#3730a3' : '#374151';
      })
      .attr('stroke-width', 2)
      .attr('filter', 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))');

    // Badge pour le nombre d'enfants (ajusté pour vertical)
    node.filter(d => d.children && d.children.length > 0)
      .append('circle')
      .attr('cx', d => d.data.isCEO ? 0 : nodeWidth / 2 - 15)
      .attr('cy', d => d.data.isCEO ? 60 : nodeHeight / 2 - 15)
      .attr('r', 16)
      .attr('fill', '#ef4444')
      .attr('stroke', 'white')
      .attr('stroke-width', 2);

    node.filter(d => d.children && d.children.length > 0)
      .append('text')
      .attr('x', d => d.data.isCEO ? 0 : nodeWidth / 2 - 15)
      .attr('y', d => d.data.isCEO ? 60 : nodeHeight / 2 - 15)
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .style('fill', 'white')
      .style('font-size', '11px')
      .style('font-weight', 'bold')
      .text(d => d.children.length);

    // Initiales ou icône
    node.append('text')
      .attr('class', 'node-initials')
      .attr('text-anchor', 'middle')
      .attr('dy', d => d.data.isCEO ? '0.35em' : '-25')
      .style('font-weight', 'bold')
      .style('fill', 'white')
      .style('font-size', d => d.data.isCEO ? '28px' : '20px')
      .text(d => {
        if (d.data.prenom && d.data.nom) {
          return `${d.data.prenom.charAt(0).toUpperCase()}${d.data.nom.charAt(0).toUpperCase()}`;
        }
        return '?';
      });

    // Nom complet
    node.append('text')
      .attr('class', 'node-name')
      .attr('text-anchor', 'middle')
      .attr('dy', d => d.data.isCEO ? '25' : '0')
      .style('font-weight', '700')
      .style('fill', d => d.data.isCEO ? 'white' : 'white')
      .style('font-size', d => d.data.isCEO ? '14px' : '13px')
      .text(d => {
        if (d.data.prenom && d.data.nom) {
          const fullName = `${d.data.prenom} ${d.data.nom}`;
          const maxLength = d.data.isCEO ? 20 : 18;
          return fullName.length > maxLength 
            ? fullName.substring(0, maxLength) + '...'
            : fullName;
        }
        return 'Inconnu';
      });

    // Poste
    node.append('text')
      .attr('class', 'node-position')
      .attr('text-anchor', 'middle')
      .attr('dy', d => d.data.isCEO ? '42' : '18')
      .style('fill', d => d.data.isCEO ? '#dbeafe' : 'rgba(255,255,255,0.9)')
      .style('font-size', d => d.data.isCEO ? '12px' : '11px')
      .style('font-weight', '500')
      .text(d => {
        if (d.data.poste) {
          const maxLength = 22;
          return d.data.poste.length > maxLength 
            ? d.data.poste.substring(0, maxLength) + '...'
            : d.data.poste;
        }
        return '';
      });

    // Département (seulement pour non-CEO)
    node.filter(d => !d.data.isCEO)
      .append('text')
      .attr('class', 'node-department')
      .attr('text-anchor', 'middle')
      .attr('dy', '35')
      .style('fill', 'rgba(255,255,255,0.8)')
      .style('font-size', '10px')
      .style('font-style', 'italic')
      .text(d => d.data.site_dep || '');

    // Fonction de zoom
    const zoom = d3.zoom()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setZoomLevel(event.transform.k);
      });

    svg.call(zoom);

    // Centrer sur le CEO au chargement
    const ceoNode = root.descendants().find(d => d.data.isCEO);
    if (ceoNode) {
      const scale = 0.9;
      const x = containerWidth / 2 - ceoNode.x * scale;
      const y = 80;
      
      svg.transition()
        .duration(750)
        .call(zoom.transform, d3.zoomIdentity.translate(x, y).scale(scale));
    }

  }, [filteredEmployees, loading]);

  // Fonctions de contrôle du zoom
  const handleZoomIn = () => {
    const svg = d3.select(svgRef.current);
    svg.transition().call(d3.zoom().scaleBy, 1.3);
  };

  const handleZoomOut = () => {
    const svg = d3.select(svgRef.current);
    svg.transition().call(d3.zoom().scaleBy, 0.7);
  };

  const handleResetZoom = () => {
    const svg = d3.select(svgRef.current);
    svg.transition().call(d3.zoom().transform, d3.zoomIdentity);
  };

  // Statistiques
  const stats = {
    total: filteredEmployees.length,
    departments: [...new Set(filteredEmployees.map(e => e.site_dep).filter(Boolean))].length,
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
          <User size={24} />
          <div>
            <h3>{stats.total}</h3>
            <p>Employés</p>
          </div>
        </div>
        <div className="stat-card">
          <Briefcase size={24} />
          <div>
            <h3>{stats.departments}</h3>
            <p>Départements</p>
          </div>
        </div>
        <div className="stat-card">
          <Users size={24} />
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
          <button onClick={handleZoomOut} className="zoom-btn" title="Zoom arrière">
            <ZoomOut size={20} />
          </button>
          <span className="zoom-level">{Math.round(zoomLevel * 100)}%</span>
          <button onClick={handleZoomIn} className="zoom-btn" title="Zoom avant">
            <ZoomIn size={20} />
          </button>
          <button onClick={handleResetZoom} className="zoom-btn reset-btn" title="Réinitialiser">
            <RotateCcw size={20} />
          </button>
        </div>
      </div>

      <div className="organigramme-content">
        <div className="chart-wrapper">
          <div className="chart-container" ref={containerRef}>
            <svg ref={svgRef} className="organigramme-svg"></svg>
          </div>

          {selectedNode && (
            <div className="employee-details-panel">
              <div className="panel-header">
                <h3>Détails de l'employé</h3>
                <button onClick={() => setSelectedNode(null)} className="close-btn">×</button>
              </div>
              <div className="panel-content">
                <div className="detail-avatar">
                  {selectedNode.photo ? (
                    <img src={selectedNode.photo} alt={`${selectedNode.prenom} ${selectedNode.nom}`} />
                  ) : (
                    <div className="avatar-placeholder">
                      {selectedNode.prenom?.charAt(0)}{selectedNode.nom?.charAt(0)}
                    </div>
                  )}
                </div>
                <h4>{selectedNode.prenom} {selectedNode.nom}</h4>
                <p className="detail-position">{selectedNode.poste}</p>
                <div className="detail-info">
                  {selectedNode.site_dep && (
                    <div className="detail-row">
                      <Briefcase size={16} />
                      <span>{selectedNode.site_dep}</span>
                    </div>
                  )}
                  {selectedNode.adresse_mail && (
                    <div className="detail-row">
                      <Mail size={16} />
                      <span>{selectedNode.adresse_mail}</span>
                    </div>
                  )}
                  {selectedNode.telephone && (
                    <div className="detail-row">
                      <Phone size={16} />
                      <span>{selectedNode.telephone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="sidebar-info">
          <div className="legend">
            <h4>Légende</h4>
            <div className="legend-items">
              <div className="legend-item">
                <div className="legend-circle" style={{ background: 'linear-gradient(135deg, #3b82f6, #1e40af)' }}></div>
                <span>CEO / Direction</span>
              </div>
              <div className="legend-item">
                <div className="legend-box" style={{ backgroundColor: '#4f46e5' }}></div>
                <span>Responsables</span>
              </div>
              {Object.entries(departmentColors)
                .filter(([dept]) => dept !== 'CEO')
                .slice(0, 8)
                .map(([dept, color]) => (
                  <div key={dept} className="legend-item">
                    <div className="legend-box" style={{ backgroundColor: color }}></div>
                    <span>{dept}</span>
                  </div>
                ))}
            </div>
          </div>

          <div className="employee-list">
            <h4>Employés récents ({filteredEmployees.length})</h4>
            <div className="list-container">
              {filteredEmployees.slice(0, 8).map(employee => (
                <div key={employee.id} className="employee-card-mini">
                  <div className="employee-avatar-mini">
                    {employee.photo ? (
                      <img src={employee.photo} alt={`${employee.prenom} ${employee.nom}`} />
                    ) : (
                      <div className="avatar-fallback-mini">
                        {employee.prenom?.charAt(0)}{employee.nom?.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="employee-info-mini">
                    <h5>{employee.prenom} {employee.nom}</h5>
                    <p>{employee.poste}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="organigramme-footer">
        <p className="update-info">
          Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')} • 
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
