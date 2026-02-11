import React, { useState, useEffect, useRef } from 'react';
import { employeesAPI } from '../services/api';
import * as d3 from 'd3';
import { ZoomIn, ZoomOut, RotateCcw, User, Briefcase, Mail, Phone, Users, Download, Printer } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import './Organigramme.css';

const Organigramme = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedNode, setSelectedNode] = useState(null);
  const [exporting, setExporting] = useState(false);
  const svgRef = useRef();
  const containerRef = useRef();
  const chartWrapperRef = useRef();

  // Couleurs par département - palette plus moderne
  const departmentColors = {
    'CEO': '#0f172a',
    'Général': '#0e7a7a',
    'Digitale': '#b91c1c',
    'Commerce': '#0c4a6e',
    'Chiffrage': '#0f6e4a',
    'Achat': '#b45309',
    'Qualité': '#6d28d9',
    'Logistique Germany': '#0e7490',
    'Logistique Groupe': '#a16207',
    'Finance': '#6b21a8',
    'Siège': '#0369a1',
    'Management': '#1e293b'
  };

  // Nettoyer le nom - supprimer FC, MM, etc.
  const cleanName = (prenom, nom) => {
    if (!prenom || !nom) return 'Nom inconnu';
    
    let cleanPrenom = prenom.trim();
    let cleanNom = nom.trim();
    
    // Supprimer les suffixes comme FC, MM, etc.
    cleanNom = cleanNom.replace(/\s+[A-Z]{2,}$/, '').trim();
    cleanPrenom = cleanPrenom.replace(/\s+[A-Z]{2,}$/, '').trim();
    
    return `${cleanPrenom} ${cleanNom}`;
  };

  // Fonction de hiérarchie améliorée
  const buildHierarchy = () => {
    const employeeMap = new Map();
    const managerMap = new Map();
    
    // Créer un map des employés par email avec données nettoyées
    employees.forEach(emp => {
      const email = emp.adresse_mail?.toLowerCase();
      if (email) {
        // Nettoyer les informations
        const cleanPrenom = emp.prenom?.replace(/\s+[A-Z]{2,}$/, '').trim() || '';
        const cleanNom = emp.nom?.replace(/\s+[A-Z]{2,}$/, '').trim() || '';
        
        employeeMap.set(email, {
          ...emp,
          id: email,
          prenom: cleanPrenom,
          nom: cleanNom,
          children: [],
          depth: 0,
          isManager: false,
          directReportsCount: 0
        });
      }
    });

    // Trouver Fethi
    const fethi = employees.find(e => 
      e.prenom?.toLowerCase().includes('fethi') && 
      e.nom?.toLowerCase().includes('chaouachi')
    );

    if (!fethi || !fethi.adresse_mail) {
      console.error('Fethi Chaouachi non trouvé');
      return { 
        id: 'ceo', 
        prenom: 'Fethi', 
        nom: 'Chaouachi', 
        poste: 'Plant Manager',
        matricule: '',
        site_dep: 'CEO',
        children: [] 
      };
    }

    const fethiEmail = fethi.adresse_mail.toLowerCase();
    const fethiNode = employeeMap.get(fethiEmail);
    
    fethiNode.isCEO = true;
    fethiNode.poste = 'Plant Manager';
    fethiNode.site_dep = 'CEO';
    fethiNode.depth = 0;
    fethiNode.isManager = true;

    const processed = new Set([fethiEmail]);

    // Compter les rapports directs pour chaque manager
    employees.forEach(emp => {
      const resp1 = emp.mail_responsable1?.toLowerCase();
      if (resp1 && employeeMap.has(resp1)) {
        const manager = employeeMap.get(resp1);
        manager.directReportsCount = (manager.directReportsCount || 0) + 1;
        manager.isManager = true;
      }
    });

    // Récupérer tous les rapports directs de Fethi
    const directReports = employees.filter(e => {
      const email = e.adresse_mail?.toLowerCase();
      return email !== fethiEmail && e.mail_responsable1?.toLowerCase() === fethiEmail;
    });

    // Trier les rapports directs par importance
    directReports.sort((a, b) => {
      const aIsManager = (a.poste?.toLowerCase().includes('responsable') || 
                         a.poste?.toLowerCase().includes('manager') ||
                         a.poste?.toLowerCase().includes('directeur')) ? 1 : 0;
      const bIsManager = (b.poste?.toLowerCase().includes('responsable') || 
                         b.poste?.toLowerCase().includes('manager') ||
                         b.poste?.toLowerCase().includes('directeur')) ? 1 : 0;
      return bIsManager - aIsManager;
    });

    // Ajouter les rapports directs
    directReports.forEach(emp => {
      const email = emp.adresse_mail?.toLowerCase();
      if (email && employeeMap.has(email) && !processed.has(email)) {
        const node = employeeMap.get(email);
        node.depth = 1;
        fethiNode.children.push(node);
        processed.add(email);
      }
    });

    // Ajouter les autres employés sous leur manager respectif
    const remainingEmployees = employees.filter(e => {
      const email = e.adresse_mail?.toLowerCase();
      return email && !processed.has(email) && email !== fethiEmail;
    });

    remainingEmployees.forEach(emp => {
      const email = emp.adresse_mail?.toLowerCase();
      const resp1 = emp.mail_responsable1?.toLowerCase();
      const resp2 = emp.mail_responsable2?.toLowerCase();
      
      if (!resp1 && !resp2) {
        // Pas de responsable -> directement sous Fethi
        if (employeeMap.has(email)) {
          const node = employeeMap.get(email);
          node.depth = 1;
          fethiNode.children.push(node);
          processed.add(email);
        }
      } else {
        // Trouver le manager
        const managerEmail = resp1 || resp2;
        if (managerEmail && employeeMap.has(managerEmail)) {
          const manager = employeeMap.get(managerEmail);
          if (processed.has(managerEmail) || managerEmail === fethiEmail) {
            const node = employeeMap.get(email);
            node.depth = (manager.depth || 0) + 1;
            
            if (!manager.children) manager.children = [];
            manager.children.push(node);
            processed.add(email);
          }
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
      const filtered = employees.filter(emp => {
        const fullName = cleanName(emp.prenom, emp.nom).toLowerCase();
        return fullName.includes(searchTerm.toLowerCase()) ||
               emp.poste?.toLowerCase().includes(searchTerm.toLowerCase()) ||
               emp.site_dep?.toLowerCase().includes(searchTerm.toLowerCase()) ||
               emp.matricule?.toLowerCase().includes(searchTerm.toLowerCase());
      });
      setFilteredEmployees(filtered);
    }
  }, [searchTerm, employees]);

  // Dessiner l'organigramme
  useEffect(() => {
    if (loading || !svgRef.current || filteredEmployees.length === 0) return;

    d3.select(svgRef.current).selectAll('*').remove();

    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;
    
    // Dimensions optimisées
    const nodeWidth = 380;
    const nodeHeight = 160;
    const levelSpacing = 280;
    const siblingSpacing = 400;

    const hierarchyData = buildHierarchy();
    const root = d3.hierarchy(hierarchyData);

    const tree = d3.tree()
      .nodeSize([siblingSpacing, levelSpacing])
      .separation((a, b) => {
        if (a.parent === b.parent) {
          const aChildren = a.children?.length || 0;
          const bChildren = b.children?.length || 0;
          return 1.2 + (Math.max(aChildren, bChildren) * 0.1);
        }
        return 2;
      });

    tree(root);

    const nodes = root.descendants();
    
    const svg = d3.select(svgRef.current)
      .attr('width', containerWidth)
      .attr('height', containerHeight);

    const g = svg.append('g')
      .attr('class', 'main-group');

    // Ajuster la position initiale
    const minX = d3.min(nodes, d => d.x) || 0;
    const maxX = d3.max(nodes, d => d.x) || 0;
    const treeWidth = maxX - minX;
    
    const initialX = (containerWidth / 2) - (minX + treeWidth / 2);
    const initialY = 100;
    const scale = 0.2;

    g.attr('transform', `translate(${initialX},${initialY}) scale(${scale})`);

    // Définir les gradients
    const defs = svg.append('defs');
    
    const ceoGradient = defs.append('linearGradient')
      .attr('id', 'ceo-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '100%');
    ceoGradient.append('stop').attr('offset', '0%').attr('stop-color', '#0f172a');
    ceoGradient.append('stop').attr('offset', '100%').attr('stop-color', '#1e293b');

    const managerGradient = defs.append('linearGradient')
      .attr('id', 'manager-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '100%');
    managerGradient.append('stop').attr('offset', '0%').attr('stop-color', '#1e40af');
    managerGradient.append('stop').attr('offset', '100%').attr('stop-color', '#3b82f6');

    // Dessiner les liens
    const links = root.links();
    g.selectAll('.link')
      .data(links)
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', d => {
        const sourceX = d.source.x;
        const sourceY = d.source.y + nodeHeight / 2;
        const targetX = d.target.x;
        const targetY = d.target.y - nodeHeight / 2;
        const midY = sourceY + (targetY - sourceY) / 2;
        
        return `M ${sourceX},${sourceY}
                L ${sourceX},${midY}
                L ${targetX},${midY}
                L ${targetX},${targetY}`;
      })
      .attr('stroke', d => d.source.data.isCEO ? '#0f172a' : '#94a3b8')
      .attr('stroke-width', d => d.source.data.isCEO ? 2.5 : 1.5)
      .attr('fill', 'none')
      .attr('opacity', 0.6);

    // Dessiner les nœuds
    const node = g.selectAll('.node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', d => `node ${d.data.isCEO ? 'node-ceo' : ''} ${d.data.isManager ? 'node-manager' : ''}`)
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        setSelectedNode(d.data);
      });

    // Rectangle principal
    node.append('rect')
      .attr('class', 'node-container')
      .attr('x', -nodeWidth / 2)
      .attr('y', -nodeHeight / 2)
      .attr('width', nodeWidth)
      .attr('height', nodeHeight)
      .attr('rx', 10)
      .attr('ry', 10)
      .attr('fill', d => {
        if (d.data.isCEO) return 'url(#ceo-gradient)';
        if (d.data.isManager) return 'url(#manager-gradient)';
        return departmentColors[d.data.site_dep] || '#475569';
      })
      .attr('stroke', d => d.data.isCEO ? '#ffffff' : '#e2e8f0')
      .attr('stroke-width', d => d.data.isCEO ? 3 : 1)
      .style('filter', 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))');

    // Matricule en haut à gauche
    node.append('text')
      .attr('class', 'node-matricule')
      .attr('x', -nodeWidth / 2 + 10)
      .attr('y', -nodeHeight / 2 + 20)
      .attr('fill', 'rgba(255,255,255,0.9)')
      .style('font-size', '11px')
      .style('font-weight', '500')
      .text(d => d.data.matricule || '');

    // Initiales en grand
    node.append('text')
      .attr('class', 'node-initials')
      .attr('text-anchor', 'middle')
      .attr('y', -20)
      .style('fill', 'white')
      .style('font-size', '32px')
      .style('font-weight', '700')
      .style('text-shadow', '0 2px 4px rgba(0,0,0,0.2)')
      .text(d => {
        const prenom = d.data.prenom || '';
        const nom = d.data.nom || '';
        return `${prenom.charAt(0) || ''}${nom.charAt(0) || ''}`.toUpperCase();
      });

    // Nom complet
    node.append('text')
      .attr('class', 'node-name')
      .attr('text-anchor', 'middle')
      .attr('y', 10)
      .style('fill', 'white')
      .style('font-size', '15px')
      .style('font-weight', '600')
      .style('text-shadow', '0 1px 2px rgba(0,0,0,0.1)')
      .text(d => {
        const fullName = cleanName(d.data.prenom, d.data.nom);
        return fullName.length > 22 ? fullName.substring(0, 20) + '...' : fullName;
      });

    // Position
    node.append('text')
      .attr('class', 'node-position')
      .attr('text-anchor', 'middle')
      .attr('y', 35)
      .style('fill', 'rgba(255,255,255,0.95)')
      .style('font-size', '12px')
      .style('font-weight', '500')
      .text(d => {
        const position = d.data.poste || '';
        return position.length > 28 ? position.substring(0, 26) + '...' : position;
      });

    // Département (optionnel, en petit)
    node.append('text')
      .attr('class', 'node-department')
      .attr('text-anchor', 'middle')
      .attr('y', 55)
      .style('fill', 'rgba(255,255,255,0.7)')
      .style('font-size', '10px')
      .text(d => d.data.site_dep || '');

    // Badge manager
    node.filter(d => d.data.isManager && !d.data.isCEO)
      .append('rect')
      .attr('class', 'manager-badge')
      .attr('x', nodeWidth / 2 - 35)
      .attr('y', -nodeHeight / 2)
      .attr('width', 35)
      .attr('height', 22)
      .attr('rx', 6)
      .attr('fill', '#f59e0b');

    node.filter(d => d.data.isManager && !d.data.isCEO)
      .append('text')
      .attr('x', nodeWidth / 2 - 17.5)
      .attr('y', -nodeHeight / 2 + 15)
      .attr('text-anchor', 'middle')
      .attr('fill', 'white')
      .style('font-size', '11px')
      .style('font-weight', 'bold')
      .text('MGR');

    // Indicateur d'équipe
    node.filter(d => d.children && d.children.length > 0)
      .append('circle')
      .attr('class', 'team-indicator')
      .attr('cx', nodeWidth / 2 - 15)
      .attr('cy', nodeHeight / 2 - 15)
      .attr('r', 14)
      .attr('fill', '#10b981')
      .attr('stroke', 'white')
      .attr('stroke-width', 2);

    node.filter(d => d.children && d.children.length > 0)
      .append('text')
      .attr('x', nodeWidth / 2 - 15)
      .attr('y', nodeHeight / 2 - 11)
      .attr('text-anchor', 'middle')
      .attr('fill', 'white')
      .style('font-size', '11px')
      .style('font-weight', 'bold')
      .text(d => d.children.length);

    // Configuration du zoom
    const zoom = d3.zoom()
      .scaleExtent([0.2, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setZoomLevel(event.transform.k);
      });

    svg.call(zoom);

  }, [filteredEmployees, loading]);

  // Fonction d'export PDF
  const exportToPDF = async () => {
    if (!chartWrapperRef.current) return;
    
    setExporting(true);
    
    try {
      const element = chartWrapperRef.current;
      
      // Capturer le contenu
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#f8fafc',
        logging: false,
        allowTaint: true,
        useCORS: true
      });
      
      const imgData = canvas.toDataURL('image/png');
      
      // Créer le PDF
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`organigramme_${new Date().toISOString().split('T')[0]}.pdf`);
      
    } catch (error) {
      console.error('Erreur lors de l\'export PDF:', error);
    } finally {
      setExporting(false);
    }
  };

  // Statistiques
  const stats = {
    total: filteredEmployees.length,
    departments: [...new Set(filteredEmployees.map(e => e.site_dep).filter(Boolean))].length,
    managers: filteredEmployees.filter(e => 
      e.poste?.toLowerCase().includes('manager') || 
      e.poste?.toLowerCase().includes('responsable') ||
      e.poste?.toLowerCase().includes('directeur')
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
        <p className="subtitle">Plant Manager: Fethi Chaouachi</p>
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
            placeholder="Rechercher par nom, matricule, poste ou département..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="controls-group">
          <div className="zoom-controls">
            <button onClick={() => d3.select(svgRef.current).transition().duration(300).call(d3.zoom().scaleBy, 0.8)} className="zoom-btn" title="Zoom arrière">
              <ZoomOut size={20} />
            </button>
            <span className="zoom-level">{Math.round(zoomLevel * 100)}%</span>
            <button onClick={() => d3.select(svgRef.current).transition().duration(300).call(d3.zoom().scaleBy, 1.2)} className="zoom-btn" title="Zoom avant">
              <ZoomIn size={20} />
            </button>
            <button onClick={() => {
              const containerWidth = containerRef.current.clientWidth;
              d3.select(svgRef.current).transition()
                .duration(500)
                .call(d3.zoom().transform, d3.zoomIdentity.translate(containerWidth / 2, 120).scale(0.6));
            }} className="zoom-btn reset-btn" title="Réinitialiser">
              <RotateCcw size={20} />
            </button>
          </div>
          
          <div className="export-controls">
            <button 
              onClick={exportToPDF} 
              className="export-btn pdf-btn"
              disabled={exporting}
              title="Exporter en PDF"
            >
              <Download size={18} />
              {exporting ? 'Export en cours...' : 'Export PDF'}
            </button>
          </div>
        </div>
      </div>

      <div className="organigramme-main">
        <div className="chart-container-wrapper" ref={chartWrapperRef}>
          <div className="chart-container" ref={containerRef}>
            <svg ref={svgRef} className="organigramme-svg"></svg>
          </div>

          {selectedNode && (
            <div className="employee-details-panel">
              <div className="panel-header">
                <h3>Détails employé</h3>
                <button onClick={() => setSelectedNode(null)} className="close-btn">×</button>
              </div>
              <div className="panel-content">
                <div className="detail-header">
                  <div className="detail-avatar">
                    <div className="avatar-placeholder">
                      {selectedNode.prenom?.charAt(0)}{selectedNode.nom?.charAt(0)}
                    </div>
                  </div>
                  <div className="detail-titles">
                    <h4>{cleanName(selectedNode.prenom, selectedNode.nom)}</h4>
                    <p className="detail-matricule">Matricule: {selectedNode.matricule || 'Non renseigné'}</p>
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
            <h4>Légende</h4>
          </div>
          <div className="legend-grid">
            <div className="legend-item">
              <div className="legend-color ceo-color"></div>
              <div className="legend-text">
                <span className="legend-title">Plant Manager</span>
              </div>
            </div>
            <div className="legend-item">
              <div className="legend-color manager-color"></div>
              <div className="legend-text">
                <span className="legend-title">Manager / Responsable</span>
              </div>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ background: '#10b981' }}></div>
              <div className="legend-text">
                <span className="legend-title">Manager avec équipe</span>
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
          <div className="footer-stats">
            <span className="stat-item">
              <User size={14} />
              {stats.total} employés
            </span>
            <span className="stat-item">
              <Briefcase size={14} />
              {stats.departments} départements
            </span>
            <span className="stat-item">
              <Users size={14} />
              {stats.managers} responsables
            </span>
          </div>
        </div>
        <div className="footer-actions">
          <button onClick={fetchEmployees} className="refresh-btn">
            <RotateCcw size={16} /> Actualiser
          </button>
        </div>
      </div>
    </div>
  );
};

export default Organigramme;
