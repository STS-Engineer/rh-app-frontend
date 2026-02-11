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

  // Palette de couleurs moderne et élégante par département
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

  // Nettoyer le nom des abréviations parasites (FC, TK, MM, etc.)
  const cleanName = (prenom, nom) => {
    if (!prenom && !nom) return 'Sans nom';
    if (!prenom) return nom?.replace(/\s+[A-Z]{2,}$/g, '').trim() || 'Sans nom';
    if (!nom) return prenom?.replace(/\s+[A-Z]{2,}$/g, '').trim() || 'Sans nom';
    
    // Supprimer tous les suffixes composés de 2+ lettres majuscules en fin de chaîne
    let cleanPrenom = prenom.replace(/\s+[A-Z]{2,}$/g, '').trim();
    let cleanNom = nom.replace(/\s+[A-Z]{2,}$/g, '').trim();
    
    // Supprimer les suffixes comme -FC, -TK, -MM, etc.
    cleanPrenom = cleanPrenom.replace(/[-–—][A-Z]{2,}$/g, '').trim();
    cleanNom = cleanNom.replace(/[-–—][A-Z]{2,}$/g, '').trim();
    
    // Supprimer les parenthèses avec abréviations
    cleanPrenom = cleanPrenom.replace(/\s*\([^)]*\)\s*$/g, '').trim();
    cleanNom = cleanNom.replace(/\s*\([^)]*\)\s*$/g, '').trim();
    
    return `${cleanPrenom} ${cleanNom}`.trim();
  };

  // Nettoyer le poste des abréviations
  const cleanPosition = (poste) => {
    if (!poste) return 'Non spécifié';
    return poste.replace(/\s+[A-Z]{2,}$/g, '').replace(/[-–—][A-Z]{2,}$/g, '').trim();
  };

  // Construction de la hiérarchie avec disposition horizontale pour TOUS les managers
  const buildHierarchy = () => {
    const employeeMap = new Map();
    
    // Étape 1: Créer le map de tous les employés avec données nettoyées
    employees.forEach(emp => {
      const email = emp.adresse_mail?.toLowerCase();
      if (email) {
        employeeMap.set(email, {
          ...emp,
          id: email,
          prenom: emp.prenom?.replace(/\s+[A-Z]{2,}$/g, '').replace(/[-–—][A-Z]{2,}$/g, '').trim() || '',
          nom: emp.nom?.replace(/\s+[A-Z]{2,}$/g, '').replace(/[-–—][A-Z]{2,}$/g, '').trim() || '',
          poste: cleanPosition(emp.poste),
          children: [],
          horizontalChildren: [], // Pour la disposition horizontale
          depth: 0,
          isManager: false,
          directReports: []
        });
      }
    });

    // Étape 2: Trouver Fethi Chaouachi (CEO/Plant Manager)
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
      // Créer Fethi s'il n'existe pas
      fethiNode = {
        id: 'ceo',
        prenom: 'Fethi',
        nom: 'Chaouachi',
        poste: 'Plant Manager',
        matricule: '',
        site_dep: 'CEO',
        adresse_mail: 'fethi.chaouachi@exemple.com',
        children: [],
        horizontalChildren: [],
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

    // Étape 3: Identifier tous les managers (personnes qui ont des subordonnés)
    employees.forEach(emp => {
      const resp1 = emp.mail_responsable1?.toLowerCase();
      if (resp1 && employeeMap.has(resp1)) {
        const manager = employeeMap.get(resp1);
        manager.isManager = true;
        manager.directReports = manager.directReports || [];
      }
      
      const resp2 = emp.mail_responsable2?.toLowerCase();
      if (resp2 && employeeMap.has(resp2) && resp2 !== resp1) {
        const manager = employeeMap.get(resp2);
        manager.isManager = true;
        manager.directReports = manager.directReports || [];
      }
    });

    // Étape 4: Construire les relations hiérarchiques
    const processed = new Set([fethiEmail]);
    
    // 4.1: D'abord les rapports directs de Fethi (niveau 1)
    const directReports = employees.filter(e => {
      const email = e.adresse_mail?.toLowerCase();
      return email !== fethiEmail && e.mail_responsable1?.toLowerCase() === fethiEmail;
    });

    // Trier les rapports directs (managers en premier)
    directReports.sort((a, b) => {
      const aIsManager = employeeMap.get(a.adresse_mail?.toLowerCase())?.isManager ? 1 : 0;
      const bIsManager = employeeMap.get(b.adresse_mail?.toLowerCase())?.isManager ? 1 : 0;
      return bIsManager - aIsManager;
    });

    directReports.forEach(emp => {
      const email = emp.adresse_mail?.toLowerCase();
      if (email && employeeMap.has(email) && !processed.has(email)) {
        const node = employeeMap.get(email);
        node.depth = 1;
        fethiNode.children.push(node);
        fethiNode.horizontalChildren = fethiNode.children; // Tous les enfants de Fethi en horizontal
        processed.add(email);
      }
    });

    // 4.2: Ensuite, pour chaque manager, ajouter ses subordonnés en disposition horizontale
    const managers = Array.from(employeeMap.values()).filter(emp => 
      emp.isManager && emp.id !== fethiEmail && processed.has(emp.id)
    );

    managers.forEach(manager => {
      // Trouver tous les subordonnés de ce manager
      const subordinates = employees.filter(e => {
        const email = e.adresse_mail?.toLowerCase();
        const resp1 = e.mail_responsable1?.toLowerCase();
        const resp2 = e.mail_responsable2?.toLowerCase();
        return email !== manager.id && 
               !processed.has(email) && 
               (resp1 === manager.id || resp2 === manager.id);
      });

      if (subordinates.length > 0) {
        // Trier les subordonnés
        subordinates.sort((a, b) => {
          const aName = cleanName(a.prenom, a.nom);
          const bName = cleanName(b.prenom, b.nom);
          return aName.localeCompare(bName);
        });

        subordinates.forEach(sub => {
          const email = sub.adresse_mail?.toLowerCase();
          if (email && employeeMap.has(email) && !processed.has(email)) {
            const subNode = employeeMap.get(email);
            subNode.depth = manager.depth + 1;
            
            // Ajouter comme enfant horizontal
            if (!manager.horizontalChildren) manager.horizontalChildren = [];
            manager.horizontalChildren.push(subNode);
            
            // Ajouter aussi dans children pour la hiérarchie
            if (!manager.children) manager.children = [];
            manager.children.push(subNode);
            
            processed.add(email);
          }
        });
      }
    });

    // 4.3: Ajouter les employés restants (sans responsable ou responsable non trouvé)
    const remainingEmployees = employees.filter(e => {
      const email = e.adresse_mail?.toLowerCase();
      return email && !processed.has(email) && email !== fethiEmail;
    });

    remainingEmployees.forEach(emp => {
      const email = emp.adresse_mail?.toLowerCase();
      if (email && employeeMap.has(email)) {
        const node = employeeMap.get(email);
        node.depth = 1;
        fethiNode.children.push(node);
        fethiNode.horizontalChildren = fethiNode.children;
        processed.add(email);
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
        const position = cleanPosition(emp.poste).toLowerCase();
        return fullName.includes(searchTerm.toLowerCase()) ||
               position.includes(searchTerm.toLowerCase()) ||
               emp.site_dep?.toLowerCase().includes(searchTerm.toLowerCase()) ||
               emp.matricule?.toLowerCase().includes(searchTerm.toLowerCase());
      });
      setFilteredEmployees(filtered);
    }
  }, [searchTerm, employees]);

  // Dessiner l'organigramme avec disposition HORIZONTALE pour TOUS les managers
  useEffect(() => {
    if (loading || !svgRef.current || filteredEmployees.length === 0) return;

    // Nettoyer le SVG
    d3.select(svgRef.current).selectAll('*').remove();

    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;
    
    // Dimensions optimisées pour disposition horizontale
    const nodeWidth = 360;
    const nodeHeight = 150;
    const levelSpacing = 280; // Espacement vertical entre niveaux
    const horizontalSpacing = 420; // Espacement horizontal entre nœuds frères

    const hierarchyData = buildHierarchy();
    
    // Configuration spéciale pour disposition horizontale des équipes
    const root = d3.hierarchy(hierarchyData);
    
    // Calculer les positions avec D3
    const tree = d3.tree()
      .nodeSize([horizontalSpacing, levelSpacing])
      .separation((a, b) => {
        // Plus d'espace pour les managers avec grandes équipes
        const aChildren = a.data.horizontalChildren?.length || 0;
        const bChildren = b.data.horizontalChildren?.length || 0;
        return 1.2 + (Math.max(aChildren, bChildren) * 0.15);
      });

    tree(root);

    const nodes = root.descendants();
    
    // Ajuster les positions X pour la disposition horizontale
    nodes.forEach(node => {
      if (node.data.horizontalChildren && node.data.horizontalChildren.length > 0) {
        // Répartir les enfants horizontalement autour du parent
        const children = node.children || [];
        if (children.length > 1) {
          const totalWidth = (children.length - 1) * horizontalSpacing * 0.9;
          const startX = node.x - totalWidth / 2;
          
          children.forEach((child, index) => {
            child.x = startX + (index * horizontalSpacing * 0.9);
          });
        }
      }
    });

    const svg = d3.select(svgRef.current)
      .attr('width', containerWidth)
      .attr('height', containerHeight);

    const g = svg.append('g')
      .attr('class', 'main-group');

    // Calculer la position initiale pour centrer
    const minX = d3.min(nodes, d => d.x) || 0;
    const maxX = d3.max(nodes, d => d.x) || 0;
    const treeWidth = maxX - minX;
    
    const initialX = (containerWidth / 2) - (minX + treeWidth / 2);
    const initialY = 100;
    const scale = 0.22;

    g.attr('transform', `translate(${initialX},${initialY}) scale(${scale})`);

    // Définir les gradients élégants
    const defs = svg.append('defs');
    
    // Gradient CEO
    const ceoGradient = defs.append('linearGradient')
      .attr('id', 'ceo-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '100%');
    ceoGradient.append('stop').attr('offset', '0%').attr('stop-color', '#0a0c10');
    ceoGradient.append('stop').attr('offset', '100%').attr('stop-color', '#1e293b');

    // Gradient Manager
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
        const midY = sourceY + (targetY - sourceY) * 0.6;
        
        // Ligne élégante avec courbe douce
        return `M ${sourceX},${sourceY}
                C ${sourceX},${midY}
                  ${targetX},${midY}
                  ${targetX},${targetY}`;
      })
      .attr('stroke', d => d.source.data.isCEO ? '#94a3b8' : '#cbd5e1')
      .attr('stroke-width', d => d.source.data.isCEO ? 2 : 1.5)
      .attr('fill', 'none')
      .attr('opacity', 0.5)
      .attr('stroke-dasharray', d => d.source.data.isCEO ? 'none' : '5,3');

    // Dessiner les nœuds
    const node = g.selectAll('.node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', d => {
        let classes = ['node'];
        if (d.data.isCEO) classes.push('node-ceo');
        if (d.data.isManager && !d.data.isCEO) classes.push('node-manager');
        if (d.data.horizontalChildren?.length > 0) classes.push('node-has-team');
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
          .attr('stroke-width', 3)
          .attr('stroke', d.data.isCEO ? '#fbbf24' : '#60a5fa');
        
        // Mettre en évidence les liens
        svg.selectAll('.link')
          .style('opacity', l => 
            l.source.data.id === d.data.id || l.target.data.id === d.data.id ? 1 : 0.2
          )
          .attr('stroke-width', l => 
            l.source.data.id === d.data.id || l.target.data.id === d.data.id ? 3 : 1.5
          );
      })
      .on('mouseout', function(event, d) {
        d3.select(this).select('.node-container')
          .transition()
          .duration(200)
          .attr('stroke-width', d.data.isCEO ? 3 : 1)
          .attr('stroke', d.data.isCEO ? '#fbbf24' : '#e2e8f0');
        
        svg.selectAll('.link')
          .style('opacity', 0.5)
          .attr('stroke-width', d => d.source.data.isCEO ? 2 : 1.5);
      });

    // Rectangle principal de la carte
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

    // Matricule en haut à gauche
    node.append('text')
      .attr('class', 'node-matricule')
      .attr('x', -nodeWidth / 2 + 12)
      .attr('y', -nodeHeight / 2 + 18)
      .attr('fill', 'rgba(255,255,255,0.9)')
      .style('font-size', '11px')
      .style('font-weight', '600')
      .style('font-family', 'monospace')
      .text(d => d.data.matricule || '');

    // Initiales en grand
    node.append('text')
      .attr('class', 'node-initials')
      .attr('text-anchor', 'middle')
      .attr('y', -20)
      .style('fill', 'white')
      .style('font-size', '34px')
      .style('font-weight', '700')
      .style('letter-spacing', '2px')
      .style('text-shadow', '0 4px 6px rgba(0,0,0,0.2)')
      .text(d => {
        const prenom = d.data.prenom || '';
        const nom = d.data.nom || '';
        return `${prenom.charAt(0) || ''}${nom.charAt(0) || ''}`.toUpperCase();
      });

    // Nom complet (nettoyé)
    node.append('text')
      .attr('class', 'node-name')
      .attr('text-anchor', 'middle')
      .attr('y', 10)
      .style('fill', 'white')
      .style('font-size', '16px')
      .style('font-weight', '600')
      .style('text-shadow', '0 2px 4px rgba(0,0,0,0.1)')
      .text(d => {
        const fullName = cleanName(d.data.prenom, d.data.nom);
        return fullName.length > 22 ? fullName.substring(0, 20) + '...' : fullName;
      });

    // Position (nettoyée)
    node.append('text')
      .attr('class', 'node-position')
      .attr('text-anchor', 'middle')
      .attr('y', 35)
      .style('fill', 'rgba(255,255,255,0.95)')
      .style('font-size', '13px')
      .style('font-weight', '500')
      .text(d => {
        const position = d.data.poste || '';
        return position.length > 28 ? position.substring(0, 26) + '...' : position;
      });

    // Département (optionnel)
    node.append('text')
      .attr('class', 'node-department')
      .attr('text-anchor', 'middle')
      .attr('y', 55)
      .style('fill', 'rgba(255,255,255,0.7)')
      .style('font-size', '11px')
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

    // Indicateur d'équipe avec compteur
    node.filter(d => d.data.horizontalChildren?.length > 0)
      .append('circle')
      .attr('class', 'team-indicator')
      .attr('cx', nodeWidth / 2 - 18)
      .attr('cy', nodeHeight / 2 - 18)
      .attr('r', 16)
      .attr('fill', '#10b981')
      .attr('stroke', 'white')
      .attr('stroke-width', 2.5);

    node.filter(d => d.data.horizontalChildren?.length > 0)
      .append('text')
      .attr('x', nodeWidth / 2 - 18)
      .attr('y', nodeHeight / 2 - 14)
      .attr('text-anchor', 'middle')
      .attr('fill', 'white')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .text(d => d.data.horizontalChildren.length);

    // Configuration du zoom
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
      
      svg.transition()
        .duration(800)
        .call(zoom.transform, d3.zoomIdentity.translate(finalX, finalY).scale(scale));
    }

  }, [filteredEmployees, loading]);

  // Export PDF
  const exportToPDF = async () => {
    if (!chartWrapperRef.current) return;
    
    setExporting(true);
    
    try {
      const element = chartWrapperRef.current;
      
      const canvas = await html2canvas(element, {
        scale: 2.5,
        backgroundColor: '#ffffff',
        logging: false,
        allowTaint: true,
        useCORS: true
      });
      
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
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
    }).length,
    teams: filteredEmployees.filter(e => {
      const email = e.adresse_mail?.toLowerCase();
      return filteredEmployees.filter(emp => emp.mail_responsable1?.toLowerCase() === email).length >= 1;
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
          <span className="disposition-badge">Disposition horizontale pour toutes les équipes</span>
        </p>
      </div>

      <div className="organigramme-stats">
        <div className="stat-card">
          <div className="stat-icon">
            <User size={24} />
          </div>
          <div className="stat-info">
            <h3>{stats.total}</h3>
            <p>Employés actifs</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <Briefcase size={24} />
          </div>
          <div className="stat-info">
            <h3>{stats.departments}</h3>
            <p>Départements</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <Users size={24} />
          </div>
          <div className="stat-info">
            <h3>{stats.managers}</h3>
            <p>Managers</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon team-icon">
            <Users size={24} />
          </div>
          <div className="stat-info">
            <h3>{stats.teams}</h3>
            <p>Équipes</p>
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
            <button 
              onClick={() => d3.select(svgRef.current).transition().duration(300).call(d3.zoom().scaleBy, 0.8)} 
              className="zoom-btn"
              title="Zoom arrière"
            >
              <ZoomOut size={20} />
            </button>
            <span className="zoom-level">{Math.round(zoomLevel * 100)}%</span>
            <button 
              onClick={() => d3.select(svgRef.current).transition().duration(300).call(d3.zoom().scaleBy, 1.2)} 
              className="zoom-btn"
              title="Zoom avant"
            >
              <ZoomIn size={20} />
            </button>
            <button 
              onClick={() => {
                const containerWidth = containerRef.current.clientWidth;
                d3.select(svgRef.current).transition()
                  .duration(500)
                  .call(d3.zoom().transform, d3.zoomIdentity.translate(containerWidth / 2, 120).scale(0.22));
              }} 
              className="zoom-btn reset-btn"
              title="Réinitialiser"
            >
              <RotateCcw size={20} />
            </button>
          </div>
          
          <div className="export-controls">
            <button 
              onClick={exportToPDF} 
              className="export-btn"
              disabled={exporting}
            >
              <Download size={18} />
              {exporting ? 'Export...' : 'Export PDF'}
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
            <div className="legend-item">
              <div className="legend-color" style={{ background: '#10b981' }}></div>
              <div className="legend-text">
                <span className="legend-title">Équipe</span>
                <span className="legend-desc">Nombre de collaborateurs</span>
              </div>
            </div>
            <div className="legend-item disposition-item">
              <div className="disposition-sample">
                <svg width="100" height="40">
                  <circle cx="20" cy="20" r="6" fill="#3b82f6" />
                  <circle cx="50" cy="20" r="6" fill="#64748b" />
                  <circle cx="80" cy="20" r="6" fill="#64748b" />
                  <path d="M 26,20 L 44,20" stroke="#94a3b8" stroke-width="2" stroke-dasharray="4,2" />
                  <path d="M 56,20 L 74,20" stroke="#94a3b8" stroke-width="2" stroke-dasharray="4,2" />
                </svg>
              </div>
              <div className="legend-text">
                <span className="legend-title">Disposition horizontale</span>
                <span className="legend-desc">Tous les collaborateurs sous leur manager</span>
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
              {stats.managers} managers
            </span>
            <span className="stat-item disposition-hint">
              <span className="hint-dot"></span>
              Disposition horizontale
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
