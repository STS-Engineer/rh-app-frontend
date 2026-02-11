import React, { useState, useEffect, useRef } from 'react';
import { employeesAPI } from '../services/api';
import * as d3 from 'd3';
import { ZoomIn, ZoomOut, RotateCcw, User, Briefcase, Mail, Phone, Users, Download } from 'lucide-react';
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

  // Palette de couleurs par département
  const departmentColors = {
    'CEO': '#0a0c10',
    'Général': '#0f766e',
    'Digitale': '#991b1b',
    'Commerce': '#0c4a6e',
    'Chiffrage': '#0b5e42',
    'Achat': '#9a3412',
    'Qualité': '#5b21b6',
    'Logistique Germany': '#0e7c86',
    'Logistique Groupe': '#854d0e',
    'Finance': '#581c87',
    'Siège': '#075985',
    'Management': '#1e293b',
    'Default': '#4b5563'
  };

  // NETTOYAGE COMPLET DU NOM - Supprime TOUTES les abréviations (FC, MM, RC, etc.)
  const cleanName = (prenom, nom) => {
    if (!prenom && !nom) return 'Sans nom';
    
    // Fonction pour nettoyer une chaîne de TOUTES les abréviations
    const removeAbbreviations = (str) => {
      if (!str) return '';
      
      let cleaned = str;
      
      // Supprime les abréviations en fin de chaîne (ex: "Jean Dupont FC" -> "Jean Dupont")
      cleaned = cleaned.replace(/\s+[A-ZÀ-Ÿ]{2,}$/g, '');
      
      // Supprime les abréviations après un tiret (ex: "Jean-Paul FC" -> "Jean-Paul")
      cleaned = cleaned.replace(/[-–—]\s*[A-ZÀ-Ÿ]{2,}$/g, '');
      
      // Supprime les abréviations au milieu (ex: "Jean FC Dupont" -> "Jean Dupont")
      cleaned = cleaned.replace(/\s+[A-ZÀ-Ÿ]{2,}\s+/g, ' ');
      
      // Supprime les abréviations au début (ex: "FC Jean Dupont" -> "Jean Dupont")
      cleaned = cleaned.replace(/^[A-ZÀ-Ÿ]{2,}\s+/g, '');
      
      // Supprime les abréviations entre parenthèses (ex: "Jean Dupont (FC)")
      cleaned = cleaned.replace(/\s*\([A-ZÀ-Ÿ]{2,}\)\s*/g, ' ');
      
      // Supprime les abréviations entre crochets (ex: "Jean Dupont [FC]")
      cleaned = cleaned.replace(/\s*\[[A-ZÀ-Ÿ]{2,}\]\s*/g, ' ');
      
      // Supprime les espaces multiples
      cleaned = cleaned.replace(/\s+/g, ' ').trim();
      
      return cleaned;
    };

    let cleanPrenom = removeAbbreviations(prenom || '');
    let cleanNom = removeAbbreviations(nom || '');
    
    if (!cleanPrenom && !cleanNom) return 'Sans nom';
    if (!cleanPrenom) return cleanNom;
    if (!cleanNom) return cleanPrenom;
    
    return `${cleanPrenom} ${cleanNom}`.trim();
  };

  // Nettoyer le poste
  const cleanPosition = (poste) => {
    if (!poste) return 'Non spécifié';
    return poste.replace(/\s+[A-Z]{2,}$/g, '').replace(/[-–—][A-Z]{2,}$/g, '').trim();
  };

  // Construction de la hiérarchie
  const buildHierarchy = () => {
    const employeeMap = new Map();
    
    // Créer le map des employés avec noms nettoyés
    employees.forEach(emp => {
      const email = emp.adresse_mail?.toLowerCase();
      if (email) {
        employeeMap.set(email, {
          ...emp,
          id: email,
          prenom: emp.prenom?.trim() || '',
          nom: emp.nom?.trim() || '',
          poste: cleanPosition(emp.poste),
          children: [],
          depth: 0,
          isManager: false,
          parentId: null
        });
      }
    });

    // Trouver Fethi (CEO)
    let fethiNode = null;
    let fethiEmail = '';
    
    for (const [email, emp] of employeeMap.entries()) {
      if (emp.prenom?.toLowerCase().includes('fethi') && emp.nom?.toLowerCase().includes('chaouachi')) {
        fethiNode = emp;
        fethiEmail = email;
        break;
      }
    }

    if (!fethiNode) {
      fethiNode = {
        id: 'ceo',
        prenom: 'Fethi',
        nom: 'Chaouachi',
        poste: 'Plant Manager',
        matricule: '',
        site_dep: 'CEO',
        adresse_mail: 'fethi.chaouachi@exemple.com',
        children: [],
        depth: 0,
        isCEO: true,
        isManager: true
      };
      fethiEmail = 'fethi.chaouachi@exemple.com';
      employeeMap.set(fethiEmail, fethiNode);
    } else {
      fethiNode.isCEO = true;
      fethiNode.isManager = true;
      fethiNode.poste = 'Plant Manager';
      fethiNode.site_dep = 'CEO';
    }

    // Identifier les managers
    employees.forEach(emp => {
      const resp1 = emp.mail_responsable1?.toLowerCase();
      if (resp1 && employeeMap.has(resp1)) {
        employeeMap.get(resp1).isManager = true;
      }
      const resp2 = emp.mail_responsable2?.toLowerCase();
      if (resp2 && employeeMap.has(resp2) && resp2 !== resp1) {
        employeeMap.get(resp2).isManager = true;
      }
    });

    const processed = new Set([fethiEmail]);

    // NIVEAU 1: Rapports directs de Fethi
    const directReports = employees.filter(e => {
      const email = e.adresse_mail?.toLowerCase();
      return email !== fethiEmail && e.mail_responsable1?.toLowerCase() === fethiEmail;
    });

    // Ajouter les rapports directs
    directReports.forEach(emp => {
      const email = emp.adresse_mail?.toLowerCase();
      if (email && employeeMap.has(email) && !processed.has(email)) {
        const node = employeeMap.get(email);
        node.depth = 1;
        node.parentId = fethiEmail;
        fethiNode.children.push(node);
        processed.add(email);
      }
    });

    // NIVEAUX SUIVANTS: Équipes
    const processManager = (managerEmail) => {
      const manager = employeeMap.get(managerEmail);
      if (!manager || !manager.isManager) return;

      const subordinates = employees.filter(e => {
        const email = e.adresse_mail?.toLowerCase();
        const resp1 = e.mail_responsable1?.toLowerCase();
        const resp2 = e.mail_responsable2?.toLowerCase();
        return email !== managerEmail && 
               !processed.has(email) && 
               (resp1 === managerEmail || resp2 === managerEmail);
      });

      if (subordinates.length > 0) {
        subordinates.forEach(sub => {
          const email = sub.adresse_mail?.toLowerCase();
          if (email && employeeMap.has(email) && !processed.has(email)) {
            const subNode = employeeMap.get(email);
            subNode.depth = manager.depth + 1;
            subNode.parentId = managerEmail;
            
            if (!manager.children) manager.children = [];
            manager.children.push(subNode);
            processed.add(email);
            
            if (subNode.isManager) {
              processManager(email);
            }
          }
        });
      }
    };

    // Traiter tous les managers
    const managers = Array.from(employeeMap.values())
      .filter(emp => emp.isManager && emp.id !== fethiEmail && processed.has(emp.id));
    
    managers.forEach(manager => {
      processManager(manager.id);
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
        const position = cleanPosition(emp.poste).toLowerCase();
        return fullName.includes(searchTerm.toLowerCase()) ||
               position.includes(searchTerm.toLowerCase()) ||
               emp.site_dep?.toLowerCase().includes(searchTerm.toLowerCase()) ||
               emp.matricule?.toLowerCase().includes(searchTerm.toLowerCase());
      });
      setFilteredEmployees(filtered);
    }
  }, [searchTerm, employees]);

  // DESSINER L'ORGANIGRAMME - VERSION CORRIGÉE
  useEffect(() => {
    if (loading || !svgRef.current || filteredEmployees.length === 0) return;

    d3.select(svgRef.current).selectAll('*').remove();

    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;
    
    // Dimensions des cartes
    const nodeWidth = 340;
    const nodeHeight = 150;
    
    // ESPACEMENTS
    const horizontalSpacing = 350; // ESPACEMENT UNIFORME pour tous les nœuds niveau 1
    const verticalSpacing = 180;    // Espacement vertical

    const hierarchyData = buildHierarchy();
    const root = d3.hierarchy(hierarchyData);

    // Calcul de base avec D3
    const tree = d3.tree()
      .nodeSize([horizontalSpacing, verticalSpacing * 2])
      .separation(() => 1);
    
    tree(root);
    
    const nodes = root.descendants();

    // ===== CORRECTION DES POSITIONS =====
    // BUT: Espacement PARFAITEMENT UNIFORME entre TOUS les nœuds de niveau 1
    nodes.forEach(node => {
      if (node.depth === 0) {
        // CEO - centré
        node.x = 0;
        node.y = 0;
      }
      else if (node.depth === 1) {
        // NIVEAU 1 - ESPACEMENT HORIZONTAL UNIFORME
        const siblings = node.parent.children;
        const index = siblings.indexOf(node);
        const count = siblings.length;
        
        // Distribution linéaire parfaite
        // Chaque nœud est espacé de EXACTEMENT horizontalSpacing
        const totalWidth = (count - 1) * horizontalSpacing;
        const startX = -totalWidth / 2;
        
        node.x = startX + (index * horizontalSpacing);
        node.y = verticalSpacing;
      }
      else if (node.depth >= 2) {
        // NIVEAUX 2+ - Alignement vertical PARFAIT sous le parent
        const parent = node.parent;
        if (parent && parent.children) {
          const index = parent.children.indexOf(node);
          node.x = parent.x; // MÊME X que le parent
          node.y = parent.y + verticalSpacing * (index + 1);
        }
      }
    });

    const svg = d3.select(svgRef.current)
      .attr('width', containerWidth)
      .attr('height', containerHeight);

    const g = svg.append('g')
      .attr('class', 'main-group');

    // Centrage
    const minX = d3.min(nodes, d => d.x) || 0;
    const maxX = d3.max(nodes, d => d.x) || 0;
    const treeWidth = maxX - minX;
    
    const initialX = (containerWidth / 2) - (minX + treeWidth / 2);
    const initialY = 120;
    const scale = 0.321;

    g.attr('transform', `translate(${initialX},${initialY}) scale(${scale})`);

    // Gradients
    const defs = svg.append('defs');
    
    const ceoGradient = defs.append('linearGradient')
      .attr('id', 'ceo-gradient')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '100%').attr('y2', '100%');
    ceoGradient.append('stop').attr('offset', '0%').attr('stop-color', '#0a0c10');
    ceoGradient.append('stop').attr('offset', '100%').attr('stop-color', '#1e293b');

    const managerGradient = defs.append('linearGradient')
      .attr('id', 'manager-gradient')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '100%').attr('y2', '100%');
    managerGradient.append('stop').attr('offset', '0%').attr('stop-color', '#1e40af');
    managerGradient.append('stop').attr('offset', '100%').attr('stop-color', '#3b82f6');

    // ===== DESSINER LES LIENS - TOUS DROITS À 90° =====
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
        
        // TOUS LES LIENS SONT DES LIGNES DROITES À ANGLE DROIT
        if (sourceX === targetX) {
          // Ligne verticale parfaitement droite
          return `M ${sourceX},${sourceY}
                  L ${targetX},${targetY}`;
        } else {
          // Ligne avec angles droits (en forme de Z)
          const midY = sourceY + (targetY - sourceY) * 0.5;
          return `M ${sourceX},${sourceY}
                  L ${sourceX},${midY}
                  L ${targetX},${midY}
                  L ${targetX},${targetY}`;
        }
      })
      .attr('stroke', '#94a3b8')
      .attr('stroke-width', 1.8)
      .attr('fill', 'none')
      .attr('opacity', 0.6);

    // ===== DESSINER LES NOEUDS =====
    const node = g.selectAll('.node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', d => {
        let classes = ['node'];
        if (d.data.isCEO) classes.push('node-ceo');
        if (d.data.isManager && !d.data.isCEO) classes.push('node-manager');
        return classes.join(' ');
      })
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
          .attr('stroke-width', d.data.isCEO ? 4 : 3)
          .attr('stroke', d.data.isCEO ? '#fbbf24' : '#60a5fa');
        
        svg.selectAll('.link')
          .style('opacity', l => 
            l.source.data.id === d.data.id || l.target.data.id === d.data.id ? 1 : 0.2
          );
      })
      .on('mouseout', function(event, d) {
        d3.select(this).select('.node-container')
          .transition()
          .duration(200)
          .attr('stroke-width', d.data.isCEO ? 3 : (d.data.isManager ? 2 : 1))
          .attr('stroke', d.data.isCEO ? '#fbbf24' : '#e2e8f0');
        
        svg.selectAll('.link').style('opacity', 0.6);
      });

    // Carte principale
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
        if (d.data.isManager) return 'url(#manager-gradient)';
        return departmentColors[d.data.site_dep] || departmentColors.Default;
      })
      .attr('stroke', d => {
        if (d.data.isCEO) return '#fbbf24';
        if (d.data.isManager) return '#93c5fd';
        return '#e2e8f0';
      })
      .attr('stroke-width', d => {
        if (d.data.isCEO) return 3;
        if (d.data.isManager) return 2;
        return 1;
      })
      .style('filter', 'drop-shadow(0 8px 12px rgba(0,0,0,0.15))');

    // Matricule
    node.append('text')
      .attr('class', 'node-matricule')
      .attr('x', -nodeWidth / 2 + 12)
      .attr('y', -nodeHeight / 2 + 18)
      .attr('fill', 'rgba(255,255,255,0.9)')
      .style('font-size', '11px')
      .style('font-weight', '600')
      .style('font-family', 'monospace')
      .text(d => d.data.matricule || '');

    // Initiales
    node.append('text')
      .attr('class', 'node-initials')
      .attr('text-anchor', 'middle')
      .attr('y', -20)
      .style('fill', 'white')
      .style('font-size', '32px')
      .style('font-weight', '700')
      .style('letter-spacing', '2px')
      .style('text-shadow', '0 4px 6px rgba(0,0,0,0.2)')
      .text(d => {
        const prenom = d.data.prenom || '';
        const nom = d.data.nom || '';
        return `${prenom.charAt(0) || ''}${nom.charAt(0) || ''}`.toUpperCase();
      });

    // NOM COMPLET - SANS AUCUNE ABRÉVIATION
    node.append('text')
      .attr('class', 'node-name')
      .attr('text-anchor', 'middle')
      .attr('y', 10)
      .style('fill', 'white')
      .style('font-size', '15px')
      .style('font-weight', '600')
      .style('text-shadow', '0 2px 4px rgba(0,0,0,0.1)')
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

    // Département
    node.append('text')
      .attr('class', 'node-department')
      .attr('text-anchor', 'middle')
      .attr('y', 55)
      .style('fill', 'rgba(255,255,255,0.7)')
      .style('font-size', '10px')
      .style('font-weight', '400')
      .text(d => d.data.site_dep || '');

    // Badge Manager
    node.filter(d => d.data.isManager && !d.data.isCEO)
      .append('rect')
      .attr('class', 'manager-badge')
      .attr('x', nodeWidth / 2 - 40)
      .attr('y', -nodeHeight / 2)
      .attr('width', 40)
      .attr('height', 24)
      .attr('rx', 8)
      .attr('fill', '#f59e0b')
      .attr('stroke', 'white')
      .attr('stroke-width', 1.5);

    node.filter(d => d.data.isManager && !d.data.isCEO)
      .append('text')
      .attr('x', nodeWidth / 2 - 20)
      .attr('y', -nodeHeight / 2 + 16)
      .attr('text-anchor', 'middle')
      .attr('fill', 'white')
      .style('font-size', '11px')
      .style('font-weight', 'bold')
      .text('MGR');

    // Indicateur d'équipe
    node.filter(d => d.children && d.children.length > 0)
      .append('circle')
      .attr('class', 'team-indicator')
      .attr('cx', nodeWidth / 2 - 18)
      .attr('cy', nodeHeight / 2 - 18)
      .attr('r', 16)
      .attr('fill', '#10b981')
      .attr('stroke', 'white')
      .attr('stroke-width', 2.5);

    node.filter(d => d.children && d.children.length > 0)
      .append('text')
      .attr('x', nodeWidth / 2 - 18)
      .attr('y', nodeHeight / 2 - 14)
      .attr('text-anchor', 'middle')
      .attr('fill', 'white')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .text(d => d.children.length);

    // Zoom
    const zoom = d3.zoom()
      .scaleExtent([0.15, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setZoomLevel(event.transform.k);
      });

    svg.call(zoom);

    // Centrer sur le CEO
    const ceoNode = nodes.find(d => d.data.isCEO);
    if (ceoNode) {
      const finalX = containerWidth / 2 - ceoNode.x * scale;
      const finalY = 120;
      svg.transition().duration(800).call(zoom.transform, d3.zoomIdentity.translate(finalX, finalY).scale(scale));
    }

  }, [filteredEmployees, loading]);

  // Export PDF
  const exportToPDF = async () => {
    if (!chartWrapperRef.current) return;
    setExporting(true);
    try {
      const element = chartWrapperRef.current;
      const canvas = await html2canvas(element, { scale: 2.5, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width, canvas.height] });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`Organigramme_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Erreur export PDF:', error);
    } finally {
      setExporting(false);
    }
  };

  // Statistiques
  const stats = {
    total: filteredEmployees.length,
    departments: [...new Set(filteredEmployees.map(e => e.site_dep).filter(Boolean))].length,
    managers: filteredEmployees.filter(e => {
      const email = e.adresse_mail?.toLowerCase();
      return filteredEmployees.some(emp => emp.mail_responsable1?.toLowerCase() === email);
    }).length
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
        <p className="subtitle">
          <span className="ceo-badge">Plant Manager: Fethi Chaouachi</span>
          <span className="disposition-badge-horizontal">Niveau 1: Espacement uniforme</span>
          <span className="disposition-badge-vertical">Équipes: Disposition verticale</span>
        </p>
      </div>

      <div className="organigramme-stats">
        <div className="stat-card">
          <div className="stat-icon"><User size={24} /></div>
          <div className="stat-info"><h3>{stats.total}</h3><p>Employés actifs</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Briefcase size={24} /></div>
          <div className="stat-info"><h3>{stats.departments}</h3><p>Départements</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Users size={24} /></div>
          <div className="stat-info"><h3>{stats.managers}</h3><p>Managers</p></div>
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
            <button onClick={() => d3.select(svgRef.current).transition().duration(300).call(d3.zoom().scaleBy, 0.8)} className="zoom-btn">
              <ZoomOut size={20} />
            </button>
            <span className="zoom-level">{Math.round(zoomLevel * 100)}%</span>
            <button onClick={() => d3.select(svgRef.current).transition().duration(300).call(d3.zoom().scaleBy, 1.2)} className="zoom-btn">
              <ZoomIn size={20} />
            </button>
            <button onClick={() => {
              const containerWidth = containerRef.current.clientWidth;
              d3.select(svgRef.current).transition()
                .duration(500)
                .call(d3.zoom().transform, d3.zoomIdentity.translate(containerWidth / 2, 120).scale(0.22));
            }} className="zoom-btn reset-btn">
              <RotateCcw size={20} />
            </button>
          </div>
          
          <div className="export-controls">
            <button onClick={exportToPDF} className="export-btn" disabled={exporting}>
              <Download size={18} /> {exporting ? 'Export...' : 'Export PDF'}
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
                    <p className="detail-position">{cleanPosition(selectedNode.poste)}</p>
                    <span className="detail-department">{selectedNode.site_dep || 'Non spécifié'}</span>
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
                <span className="legend-desc">Fethi Chaouachi</span>
              </div>
            </div>
            <div className="legend-item">
              <div className="legend-color manager-color"></div>
              <div className="legend-text">
                <span className="legend-title">Manager</span>
                <span className="legend-desc">Responsable d'équipe</span>
              </div>
            </div>
            <div className="legend-item disposition-horizontal-item">
              <div className="disposition-sample-horizontal">
                <svg width="100" height="30">
                  <rect x="0" y="5" width="25" height="20" rx="4" fill="#3b82f6" opacity="0.7" />
                  <rect x="35" y="5" width="25" height="20" rx="4" fill="#64748b" opacity="0.7" />
                  <rect x="70" y="5" width="25" height="20" rx="4" fill="#64748b" opacity="0.7" />
                  <path d="M 12.5,15 L 35,15" stroke="#94a3b8" stroke-width="1.5" />
                  <path d="M 47.5,15 L 70,15" stroke="#94a3b8" stroke-width="1.5" />
                </svg>
              </div>
              <div className="legend-text">
                <span className="legend-title">Niveau 1 - Espacement uniforme</span>
                <span className="legend-desc">Tous les rapports directs espacés également</span>
              </div>
            </div>
            <div className="legend-item disposition-vertical-item">
              <div className="disposition-sample-vertical">
                <svg width="40" height="70">
                  <rect x="10" y="0" width="20" height="20" rx="4" fill="#3b82f6" opacity="0.7" />
                  <rect x="10" y="30" width="20" height="20" rx="4" fill="#64748b" opacity="0.7" />
                  <rect x="10" y="60" width="20" height="20" rx="4" fill="#64748b" opacity="0.7" />
                  <path d="M 20,20 L 20,30" stroke="#94a3b8" stroke-width="1.5" />
                  <path d="M 20,50 L 20,60" stroke="#94a3b8" stroke-width="1.5" />
                </svg>
              </div>
              <div className="legend-text">
                <span className="legend-title">Équipes - Vertical</span>
                <span className="legend-desc">Collaborateurs sous leur manager</span>
              </div>
            </div>
            {Object.entries(departmentColors)
              .filter(([dept]) => dept !== 'CEO' && dept !== 'Default')
              .map(([dept, color]) => {
                const count = filteredEmployees.filter(e => e.site_dep === dept).length;
                return count > 0 ? (
                  <div key={dept} className="legend-item">
                    <div className="legend-color" style={{ backgroundColor: color }}></div>
                    <div className="legend-text">
                      <span className="legend-title">{dept}</span>
                      <span className="legend-count">{count} employé{count > 1 ? 's' : ''}</span>
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
            <span className="stat-item"><User size={14} /> {stats.total} employés</span>
            <span className="stat-item"><Briefcase size={14} /> {stats.departments} départements</span>
            <span className="stat-item"><Users size={14} /> {stats.managers} managers</span>
            <span className="stat-item disposition-horizontal-badge">→ Niveau 1: Espacement uniforme</span>
            <span className="stat-item disposition-vertical-badge">↓ Équipes: Vertical</span>
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
