import React, { useState, useEffect, useRef } from 'react';
import { employeesAPI } from '../services/api';
import * as d3 from 'd3';
import { ZoomIn, ZoomOut, RotateCcw, User, Briefcase, Mail, Phone, Users } from 'lucide-react';
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
    'CEO': '#1e40af',
    'Général': '#0d9488',
    'Digitale': '#dc2626',
    'Commerce': '#0c4a6e',
    'Chiffrage': '#16a34a',
    'Achat': '#ea580c',
    'Qualité': '#9333ea',
    'Logistique Germany': '#0891b2',
    'Logistique Groupe': '#ca8a04',
    'Finance': '#7c3aed',
    'Siège': '#0284c7',
    'Management': '#374151'
  };

  // Nouvelle fonction de hiérarchie améliorée
  const buildHierarchy = () => {
    const employeeMap = new Map();
    
    // Créer un map des employés par email
    employees.forEach(emp => {
      const email = emp.adresse_mail?.toLowerCase();
      if (email) {
        employeeMap.set(email, {
          ...emp,
          id: email,
          children: [],
          depth: 0
        });
      }
    });

    // Trouver Fethi comme CEO
    const fethi = employees.find(e => 
      e.prenom?.toLowerCase().includes('fethi') && 
      e.nom?.toLowerCase().includes('chaouachi')
    );

    if (!fethi || !fethi.adresse_mail) {
      console.error('CEO Fethi Chaouachi non trouvé');
      return { name: 'Organigramme', children: [] };
    }

    const fethiEmail = fethi.adresse_mail.toLowerCase();
    const fethiNode = employeeMap.get(fethiEmail);
    
    // Marquer le CEO
    fethiNode.isCEO = true;
    fethiNode.site_dep = 'Plant Manager';
    fethiNode.depth = 0;

    const processed = new Set([fethiEmail]);

    // Niveau 1: Responsables directs sous Fethi
    const directReports = employees.filter(e => {
      const email = e.adresse_mail?.toLowerCase();
      if (!email || processed.has(email) || email === fethiEmail) return false;
      
      const resp1 = e.mail_responsable1?.toLowerCase();
      const resp2 = e.mail_responsable2?.toLowerCase();
      
      // Sous Fethi si un seul responsable OU si Fethi est responsable1
      if (!resp1 && !resp2) return true; // Pas de manager -> sous Fethi
      if (resp1 === fethiEmail) return true; // Fethi est responsable1
      if (!resp2 && resp1 !== fethiEmail) return true; // Un seul manager mais pas Fethi -> sous son manager
      
      return false;
    });

    // Trier par poste (managers d'abord)
    directReports.sort((a, b) => {
      const aIsManager = a.poste?.toLowerCase().includes('responsable') || 
                        a.poste?.toLowerCase().includes('manager') ||
                        a.poste?.toLowerCase().includes('directeur') ||
                        a.poste?.toLowerCase().includes('chef');
      const bIsManager = b.poste?.toLowerCase().includes('responsable') || 
                        b.poste?.toLowerCase().includes('manager') ||
                        b.poste?.toLowerCase().includes('directeur') ||
                        b.poste?.toLowerCase().includes('chef');
      
      if (aIsManager && !bIsManager) return -1;
      if (!aIsManager && bIsManager) return 1;
      return a.prenom?.localeCompare(b.prenom);
    });

    // Ajouter les reports directs
    directReports.forEach(emp => {
      const email = emp.adresse_mail?.toLowerCase();
      if (email && employeeMap.has(email)) {
        const node = employeeMap.get(email);
        node.depth = 1;
        fethiNode.children.push(node);
        processed.add(email);
      }
    });

    // Construire la hiérarchie pour chaque niveau
    const buildTreeForManager = (managerEmail, currentDepth) => {
      const managerNode = employeeMap.get(managerEmail);
      if (!managerNode) return;

      const teamMembers = employees.filter(e => {
        const email = e.adresse_mail?.toLowerCase();
        if (!email || processed.has(email) || email === managerEmail) return false;
        
        const resp1 = e.mail_responsable1?.toLowerCase();
        const resp2 = e.mail_responsable2?.toLowerCase();
        
        // Membre de l'équipe si managerEmail est responsable1
        return resp1 === managerEmail;
      });

      // Trier les membres
      teamMembers.sort((a, b) => {
        const aIsSubManager = a.poste?.toLowerCase().includes('responsable') || 
                             a.poste?.toLowerCase().includes('manager') ||
                             a.poste?.toLowerCase().includes('chef');
        const bIsSubManager = b.poste?.toLowerCase().includes('responsable') || 
                             b.poste?.toLowerCase().includes('manager') ||
                             b.poste?.toLowerCase().includes('chef');
        
        if (aIsSubManager && !bIsSubManager) return -1;
        if (!aIsSubManager && bIsSubManager) return 1;
        return a.prenom?.localeCompare(b.prenom);
      });

      // Ajouter les membres à l'équipe
      teamMembers.forEach(member => {
        const email = member.adresse_mail?.toLowerCase();
        if (email && employeeMap.has(email)) {
          const node = employeeMap.get(email);
          node.depth = currentDepth + 1;
          managerNode.children.push(node);
          processed.add(email);
          
          // Construire récursivement pour les sous-managers
          if (node.poste?.toLowerCase().includes('responsable') || 
              node.poste?.toLowerCase().includes('manager') ||
              node.poste?.toLowerCase().includes('chef')) {
            buildTreeForManager(email, currentDepth + 1);
          }
        }
      });
    };

    // Construire l'arbre pour chaque manager direct
    fethiNode.children.forEach(child => {
      if (child.poste?.toLowerCase().includes('responsable') || 
          child.poste?.toLowerCase().includes('manager') ||
          child.poste?.toLowerCase().includes('directeur') ||
          child.poste?.toLowerCase().includes('chef')) {
        buildTreeForManager(child.id, 1);
      }
    });

    // Ajouter les employés restants non connectés
    employees.forEach(emp => {
      const email = emp.adresse_mail?.toLowerCase();
      if (email && !processed.has(email)) {
        const node = employeeMap.get(email);
        if (node) {
          node.depth = 1;
          fethiNode.children.push(node);
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

  // Dessiner l'organigramme VERTICAL amélioré
  useEffect(() => {
    if (loading || !svgRef.current || filteredEmployees.length === 0) return;

    d3.select(svgRef.current).selectAll('*').remove();

    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;
    
    // Dimensions largement augmentées pour une excellente lisibilité
    const nodeWidth = 400;
    const nodeHeight = 220;
    const levelSpacing = 350; // Espacement vertical entre niveaux
    const siblingSpacing = 450; // Espacement horizontal entre frères

    const hierarchyData = buildHierarchy();
    const root = d3.hierarchy(hierarchyData);

    // Créer un arbre VERTICAL (top to bottom)
    const tree = d3.tree()
      .nodeSize([siblingSpacing, levelSpacing])
      .separation((a, b) => {
        // Plus d'espace entre nœuds non-frères
        if (a.parent === b.parent) {
          return 1.5; // Frères: 1.5x l'espacement
        }
        return 2.5; // Non-frères: 2.5x l'espacement
      });

    tree(root);

    // Calculer les dimensions
    const nodes = root.descendants();
    const links = root.links();

    // Ajuster les positions pour centrer
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    nodes.forEach(d => {
      if (d.x < minX) minX = d.x;
      if (d.x > maxX) maxX = d.x;
      if (d.y < minY) minY = d.y;
      if (d.y > maxY) maxY = d.y;
    });

    const width = maxX - minX + nodeWidth * 2;
    const height = maxY - minY + nodeHeight * 3;

    const svg = d3.select(svgRef.current)
      .attr('width', containerWidth)
      .attr('height', containerHeight);

    const g = svg.append('g')
      .attr('class', 'main-group');

    // Ajuster l'échelle pour un affichage optimal
    const scale = Math.min(
      (containerWidth - 200) / width,
      (containerHeight - 200) / height,
      0.6 // Échelle initiale plus petite pour voir l'ensemble
    );

    const initialX = (containerWidth / 2) - (minX + (maxX - minX) / 2) * scale;
    const initialY = 80;

    g.attr('transform', `translate(${initialX},${initialY}) scale(${scale})`);

    // Définir les gradients
    const defs = svg.append('defs');
    
    // Gradient pour le CEO
    const ceoGradient = defs.append('linearGradient')
      .attr('id', 'ceo-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '100%');
    
    ceoGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#1e40af');
    
    ceoGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#3b82f6');

    // Gradient pour les managers
    const managerGradient = defs.append('linearGradient')
      .attr('id', 'manager-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '100%');
    
    managerGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#4f46e5');
    
    managerGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#6366f1');

    // Dessiner les liens VERTICAUX avec lignes courbes en escalier (pas d'intersections)
    g.selectAll('.link')
      .data(links)
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', d => {
        // Lignes en escalier (step): vertical puis horizontal puis vertical
        const sourceX = d.source.x;
        const sourceY = d.source.y + nodeHeight / 2; // Bas de la carte source
        const targetX = d.target.x;
        const targetY = d.target.y - nodeHeight / 2; // Haut de la carte cible
        
        const midY = (sourceY + targetY) / 2;
        
        // Créer un chemin en escalier
        return `M ${sourceX},${sourceY} 
                L ${sourceX},${midY}
                L ${targetX},${midY}
                L ${targetX},${targetY}`;
      })
      .attr('stroke', d => {
        const isCEOLink = d.source.data.isCEO || d.target.data.isCEO;
        return isCEOLink ? '#1e40af' : '#64748b';
      })
      .attr('stroke-width', d => d.source.data.isCEO ? 4 : 3)
      .attr('fill', 'none')
      .attr('opacity', 0.8);

    // Dessiner les nœuds
    const node = g.selectAll('.node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', d => `node ${d.data.isCEO ? 'node-ceo' : 'node-regular'} node-depth-${d.depth}`)
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        setSelectedNode(d.data);
      })
      .on('mouseover', function(event, d) {
        d3.select(this).select('.node-container')
          .transition()
          .duration(200)
          .style('transform', 'scale(1.05)');
        
        // Highlight les liens
        svg.selectAll('.link')
          .style('opacity', l => 
            l.source === d || l.target === d ? 1 : 0.3
          );
        
        // Highlight les nœuds parents/enfants
        svg.selectAll('.node')
          .style('opacity', n => {
            if (n === d || 
                n.parent === d || 
                n.children?.includes(d) ||
                (n.parent && n.parent === d.parent)) {
              return 1;
            }
            return 0.5;
          });
      })
      .on('mouseout', function(event, d) {
        d3.select(this).select('.node-container')
          .transition()
          .duration(200)
          .style('transform', 'scale(1)');
        
        svg.selectAll('.link').style('opacity', 0.8);
        svg.selectAll('.node').style('opacity', 1);
      });

    // Conteneur pour le nœud
    node.append('rect')
      .attr('class', 'node-container')
      .attr('x', -nodeWidth / 2)
      .attr('y', -nodeHeight / 2)
      .attr('width', nodeWidth)
      .attr('height', nodeHeight)
      .attr('rx', 12)
      .attr('ry', 12)
      .attr('fill', d => {
        if (d.data.isCEO) return 'url(#ceo-gradient)';
        const isManager = d.data.poste?.toLowerCase().includes('responsable') || 
                         d.data.poste?.toLowerCase().includes('manager') ||
                         d.data.poste?.toLowerCase().includes('directeur') ||
                         d.data.poste?.toLowerCase().includes('chef');
        return isManager ? 'url(#manager-gradient)' : (departmentColors[d.data.site_dep] || '#475569');
      })
      .attr('stroke', d => {
        if (d.data.isCEO) return '#1e3a8a';
        const isManager = d.data.poste?.toLowerCase().includes('responsable') || 
                         d.data.poste?.toLowerCase().includes('manager') ||
                         d.data.poste?.toLowerCase().includes('directeur') ||
                         d.data.poste?.toLowerCase().includes('chef');
        return isManager ? '#3730a3' : '#334155';
      })
      .attr('stroke-width', d => d.data.isCEO ? 4 : 2);

    // Badge de statut (CEO/Manager)
    node.filter(d => d.data.isCEO || d.data.poste?.toLowerCase().includes('responsable') || 
                    d.data.poste?.toLowerCase().includes('manager') || 
                    d.data.poste?.toLowerCase().includes('directeur'))
      .append('rect')
      .attr('class', 'status-badge')
      .attr('x', nodeWidth / 2 - 45)
      .attr('y', -nodeHeight / 2)
      .attr('width', 50)
      .attr('height', 30)
      .attr('rx', 12)
      .attr('ry', 12)
      .attr('fill', d => d.data.isCEO ? '#1e40af' : '#4f46e5');

    node.filter(d => d.data.isCEO || d.data.poste?.toLowerCase().includes('responsable') || 
                    d.data.poste?.toLowerCase().includes('manager') || 
                    d.data.poste?.toLowerCase().includes('directeur'))
      .append('text')
      .attr('x', nodeWidth / 2 - 20)
      .attr('y', -nodeHeight / 2 + 17)
      .attr('text-anchor', 'middle')
      .attr('fill', 'white')
      .style('font-size', '15px')
      .style('font-weight', 'bold')
      .text(d => d.data.isCEO ? 'CEO' : 'MGR');

    // Initiales
    node.append('text')
      .attr('class', 'node-initials')
      .attr('text-anchor', 'middle')
      .attr('dy', '-30')
      .style('font-weight', '900')
      .style('fill', 'white')
      .style('font-size', '36px')
      .style('letter-spacing', '2px')
      .text(d => {
        if (d.data.prenom && d.data.nom) {
          return `${d.data.prenom.charAt(0).toUpperCase()}${d.data.nom.charAt(0).toUpperCase()}`;
        }
        return '??';
      });

    // Nom complet
    node.append('text')
      .attr('class', 'node-name')
      .attr('text-anchor', 'middle')
      .attr('dy', '5')
      .style('font-weight', '700')
      .style('fill', 'white')
      .style('font-size', '22px')
      .style('letter-spacing', '0.5px')
      .text(d => {
        if (d.data.prenom && d.data.nom) {
          const fullName = `${d.data.prenom} ${d.data.nom}`;
          return fullName.length > 25 ? fullName.substring(0, 23) + '...' : fullName;
        }
        return 'Nom inconnu';
      });

    // Poste
    node.append('text')
      .attr('class', 'node-position')
      .attr('text-anchor', 'middle')
      .attr('dy', '30')
      .style('fill', 'rgba(255,255,255,0.95)')
      .style('font-size', '18px')
      .style('font-weight', '500')
      .text(d => {
        const position = d.data.poste || '';
        if (position.length > 35) {
          return position.substring(0, 33) + '...';
        }
        return position;
      });

    // Département
    node.append('text')
      .attr('class', 'node-department')
      .attr('text-anchor', 'middle')
      .attr('dy', '50')
      .style('fill', 'rgba(255,255,255,0.85)')
      .style('font-size', '16px')
      .style('font-weight', '400')
      .text(d => {
        const dept = d.data.site_dep || 'Non spécifié';
        return dept.length > 28 ? dept.substring(0, 26) + '...' : dept;
      });

    // Indicateur d'équipe pour les managers
    node.filter(d => d.children && d.children.length > 0)
      .append('g')
      .attr('class', 'team-indicator')
      .attr('transform', `translate(${nodeWidth / 2 - 24}, ${nodeHeight / 2 - 24})`)
      .append('circle')
      .attr('r', 22)
      .attr('fill', '#ef4444')
      .attr('stroke', 'white')
      .attr('stroke-width', 3);

    node.filter(d => d.children && d.children.length > 0)
      .select('.team-indicator')
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .style('fill', 'white')
      .style('font-size', '18px')
      .style('font-weight', 'bold')
      .text(d => d.children.length);

    // Fonction de zoom
    const zoom = d3.zoom()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setZoomLevel(event.transform.k);
      });

    svg.call(zoom);

    // Centrer sur le CEO avec animation
    const ceoNode = nodes.find(d => d.data.isCEO);
    if (ceoNode) {
      const finalX = containerWidth / 2 - ceoNode.x * scale;
      const finalY = 120;
      
      svg.transition()
        .duration(1200)
        .call(zoom.transform, d3.zoomIdentity.translate(finalX, finalY).scale(scale));
    }

  }, [filteredEmployees, loading]);

  // Contrôles de zoom
  const handleZoomIn = () => {
    const svg = d3.select(svgRef.current);
    svg.transition().duration(300).call(d3.zoom().scaleBy, 1.2);
  };

  const handleZoomOut = () => {
    const svg = d3.select(svgRef.current);
    svg.transition().duration(300).call(d3.zoom().scaleBy, 0.8);
  };

  const handleResetZoom = () => {
    const svg = d3.select(svgRef.current);
    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;
    
    svg.transition()
      .duration(500)
      .call(d3.zoom().transform, d3.zoomIdentity
        .translate(containerWidth / 2, 100)
        .scale(0.8)
        .translate(-containerWidth / 2, -100));
  };

  // Statistiques
  const stats = {
    total: filteredEmployees.length,
    departments: [...new Set(filteredEmployees.map(e => e.site_dep).filter(Boolean))].length,
    managers: filteredEmployees.filter(e => 
      e.poste?.toLowerCase().includes('manager') || 
      e.poste?.toLowerCase().includes('responsable') ||
      e.poste?.toLowerCase().includes('directeur') ||
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
            <p>Employés actifs</p>
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

        <div className="controls-group">
          <div className="zoom-controls">
            <button onClick={handleZoomOut} className="zoom-btn" title="Zoom arrière">
              <ZoomOut size={20} />
            </button>
            <span className="zoom-level">{Math.round(zoomLevel * 100)}%</span>
            <button onClick={handleZoomIn} className="zoom-btn" title="Zoom avant">
              <ZoomIn size={20} />
            </button>
            <button onClick={handleResetZoom} className="zoom-btn reset-btn" title="Réinitialiser la vue">
              <RotateCcw size={20} />
            </button>
          </div>
          
          <div className="hierarchy-info">
            <span className="hierarchy-label">Hiérarchie: </span>
            <span className="hierarchy-value">Fethi Chaouachi (CEO)</span>
          </div>
        </div>
      </div>

      <div className="organigramme-main">
        <div className="chart-container-wrapper">
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
                <div className="detail-header">
                  <div className="detail-avatar">
                    {selectedNode.photo ? (
                      <img src={selectedNode.photo} alt={`${selectedNode.prenom} ${selectedNode.nom}`} />
                    ) : (
                      <div className="avatar-placeholder">
                        {selectedNode.prenom?.charAt(0)}{selectedNode.nom?.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="detail-titles">
                    <h4>{selectedNode.prenom} {selectedNode.nom}</h4>
                    <p className="detail-position">{selectedNode.poste}</p>
                    <span className="detail-department">{selectedNode.site_dep}</span>
                  </div>
                </div>
                
                <div className="detail-info">
                  {selectedNode.adresse_mail && (
                    <div className="detail-row">
                      <Mail size={18} />
                      <div>
                        <span className="detail-label">Email</span>
                        <span className="detail-value">{selectedNode.adresse_mail}</span>
                      </div>
                    </div>
                  )}
                  
                  {selectedNode.telephone && (
                    <div className="detail-row">
                      <Phone size={18} />
                      <div>
                        <span className="detail-label">Téléphone</span>
                        <span className="detail-value">{selectedNode.telephone}</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="detail-row">
                    <Users size={18} />
                    <div>
                      <span className="detail-label">Statut</span>
                      <span className="detail-value">{selectedNode.statut || 'Actif'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="legend-section">
        <div className="legend-card">
          <div className="legend-header">
            <Briefcase size={20} />
            <h4>Légende des départements</h4>
          </div>
          <div className="legend-grid">
            <div className="legend-item ceo-item">
              <div className="legend-color ceo-color"></div>
              <div className="legend-text">
                <span className="legend-title">CEO / Direction</span>
                <span className="legend-count">
                  ({filteredEmployees.filter(e => e.site_dep === 'CEO').length})
                </span>
              </div>
            </div>
            <div className="legend-item manager-item">
              <div className="legend-color manager-color"></div>
              <div className="legend-text">
                <span className="legend-title">Responsables / Managers</span>
                <span className="legend-count">({stats.managers})</span>
              </div>
            </div>
            {Object.entries(departmentColors)
              .filter(([dept]) => dept !== 'CEO')
              .map(([dept, color]) => {
                const count = filteredEmployees.filter(e => e.site_dep === dept).length;
                return count > 0 ? (
                  <div key={dept} className="legend-item">
                    <div className="legend-color" style={{ backgroundColor: color }}></div>
                    <div className="legend-text">
                      <span className="legend-title">{dept}</span>
                      <span className="legend-count">({count})</span>
                    </div>
                  </div>
                ) : null;
              })}
          </div>
        </div>
      </div>

      <div className="organigramme-footer">
        <div className="footer-content">
          <p className="update-info">
            <span className="info-label">Dernière mise à jour :</span>
            <span className="info-value">{new Date().toLocaleDateString('fr-FR', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</span>
          </p>
          <div className="footer-stats">
            <span className="stat-item">
              <User size={14} />
              {stats.total} employés
            </span>
            <span className="stat-item">
              <Briefcase size={14} />
              {stats.departments} départements
            </span>
          </div>
        </div>
        <button onClick={fetchEmployees} className="refresh-btn">
          <RotateCcw size={16} /> Actualiser les données
        </button>
      </div>
    </div>
  );
};

export default Organigramme;
