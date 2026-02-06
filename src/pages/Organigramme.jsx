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

  // Nouvelle fonction de hiérarchie basée sur votre logique
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
          depth: 0,
          hasLargeTeam: false,
          teamSize: 0
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
      return { name: 'Organigramme', children: [] };
    }

    const fethiEmail = fethi.adresse_mail.toLowerCase();
    const fethiNode = employeeMap.get(fethiEmail);
    
    // Marquer Fethi comme Plant Manager
    fethiNode.isCEO = true;
    fethiNode.site_dep = 'Plant Manager';
    fethiNode.depth = 0;

    const processed = new Set([fethiEmail]);

    // LOGIQUE PRINCIPALE :
    // 1. Ceux qui ont Fethi comme responsable 1 -> DIRECTEMENT sous Fethi
    // 2. Ceux qui ont Fethi comme responsable 2 -> dans équipe avec leur premier responsable

    // Récupérer tous les employés (sauf Fethi)
    const allOtherEmployees = employees.filter(e => {
      const email = e.adresse_mail?.toLowerCase();
      return email && email !== fethiEmail;
    });

    // 1. Employés avec Fethi comme responsable 1 (DIRECTS)
    const directReports = allOtherEmployees.filter(e => {
      const resp1 = e.mail_responsable1?.toLowerCase();
      return resp1 === fethiEmail;
    });

    // 2. Employés avec d'autres responsables
    const otherEmployees = allOtherEmployees.filter(e => {
      const email = e.adresse_mail?.toLowerCase();
      const resp1 = e.mail_responsable1?.toLowerCase();
      const resp2 = e.mail_responsable2?.toLowerCase();
      
      // Si pas de responsable ou responsable inconnu, mettre sous Fethi
      if (!resp1 && !resp2) return true;
      
      // Exclure ceux qui sont déjà dans directReports
      return !directReports.some(dr => 
        dr.adresse_mail?.toLowerCase() === email
      );
    });

    // Fonction pour grouper les employés par leur premier responsable
    const groupByManager = (employeesList) => {
      const groups = new Map();
      
      employeesList.forEach(emp => {
        const email = emp.adresse_mail?.toLowerCase();
        const managerEmail = emp.mail_responsable1?.toLowerCase();
        
        if (!managerEmail || !employeeMap.has(managerEmail)) {
          // Si pas de manager ou manager non trouvé, mettre dans "non-groupé"
          const key = 'ungrouped';
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key).push(emp);
          return;
        }
        
        // Vérifier si le manager est dans la liste des managers directs de Fethi
        const isManagerUnderFethi = directReports.some(dr => 
          dr.adresse_mail?.toLowerCase() === managerEmail
        );
        
        if (isManagerUnderFethi) {
          if (!groups.has(managerEmail)) groups.set(managerEmail, []);
          groups.get(managerEmail).push(emp);
        } else {
          // Si le manager n'est pas sous Fethi, mettre dans "non-groupé"
          const key = 'ungrouped';
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key).push(emp);
        }
      });
      
      return groups;
    };

    // Grouper les employés sous chaque manager direct
    const groupedEmployees = groupByManager(otherEmployees);

    // Trier les rapports directs par poste (managers d'abord)
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

    // Ajouter les rapports directs sous Fethi
    directReports.forEach(emp => {
      const email = emp.adresse_mail?.toLowerCase();
      if (email && employeeMap.has(email)) {
        const node = employeeMap.get(email);
        node.depth = 1;
        fethiNode.children.push(node);
        processed.add(email);
        
        // Vérifier si ce manager a des employés dans son groupe
        if (groupedEmployees.has(email)) {
          const teamMembers = groupedEmployees.get(email);
          
          // Marquer le manager comme ayant une grande équipe si > 3
          if (teamMembers.length > 3) {
            node.hasLargeTeam = true;
            node.teamSize = teamMembers.length;
          }
          
          // Trier les membres d'équipe par prénom
          teamMembers.sort((a, b) => a.prenom?.localeCompare(b.prenom));
          
          // Ajouter les membres de l'équipe (toujours verticalement)
          teamMembers.forEach(member => {
            const memberEmail = member.adresse_mail?.toLowerCase();
            if (memberEmail && employeeMap.has(memberEmail)) {
              const memberNode = employeeMap.get(memberEmail);
              memberNode.depth = 2; // Directement sous le manager
              node.children.push(memberNode);
              processed.add(memberEmail);
            }
          });
        }
      }
    });

    // Ajouter les employés non-groupés directement sous Fethi
    if (groupedEmployees.has('ungrouped')) {
      const ungrouped = groupedEmployees.get('ungrouped');
      ungrouped.forEach(emp => {
        const email = emp.adresse_mail?.toLowerCase();
        if (email && employeeMap.has(email) && !processed.has(email)) {
          const node = employeeMap.get(email);
          node.depth = 1;
          fethiNode.children.push(node);
          processed.add(email);
        }
      });
    }

    // Ajouter les employés restants non traités
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

  // Dessiner l'organigramme VERTICAL avec lignes droites à 90°
  useEffect(() => {
    if (loading || !svgRef.current || filteredEmployees.length === 0) return;

    d3.select(svgRef.current).selectAll('*').remove();

    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;
    
    // Dimensions pour meilleure lisibilité
    const nodeWidth = 380;
    const nodeHeight = 160;
    const levelSpacing = 220; // Espacement vertical entre niveaux
    const siblingSpacing = 420; // Espacement horizontal entre frères
    const teamSpacing = 180; // Espacement réduit pour les membres d'équipe

    const hierarchyData = buildHierarchy();
    const root = d3.hierarchy(hierarchyData);

    // Fonction pour calculer les positions des nœuds avec traitement spécial pour les grandes équipes
    const customTree = (root) => {
      let x = 0;
      let y = 0;
      
      // Parcourir les nœuds et ajuster les positions
      root.eachBefore((node) => {
        node.x = x;
        node.y = y;
        
        // Si c'est un manager avec grande équipe, ajuster l'espacement vertical
        if (node.data.hasLargeTeam && node.children) {
          // Pour les grandes équipes, réduire l'espacement entre membres
          const spacing = teamSpacing;
          y += spacing;
        } else if (node.children) {
          // Espacement normal pour les autres
          y += levelSpacing;
        }
      });
      
      return root;
    };

    const rootWithPositions = customTree(root);
    const nodes = rootWithPositions.descendants();
    const links = rootWithPositions.links();

    // Ajuster les positions pour centrer
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    nodes.forEach(d => {
      if (d.x < minX) minX = d.x;
      if (d.x > maxX) maxX = d.x;
      if (d.y < minY) minY = d.y;
      if (d.y > maxY) maxY = d.y;
    });

    const svg = d3.select(svgRef.current)
      .attr('width', containerWidth)
      .attr('height', containerHeight);

    const g = svg.append('g')
      .attr('class', 'main-group');

    // Ajuster l'échelle pour un affichage optimal
    const scale = 0.65;

    const initialX = (containerWidth / 2) - (minX + (maxX - minX) / 2) * scale;
    const initialY = 100;

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

    // Gradient pour les membres de grande équipe
    const teamMemberGradient = defs.append('linearGradient')
      .attr('id', 'team-member-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '100%');
    
    teamMemberGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#0f766e');
    
    teamMemberGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#14b8a6');

    // Fonction pour dessiner des lignes avec angles à 90°
    const drawOrthogonalLine = (sourceX, sourceY, targetX, targetY) => {
      // Si les nœuds sont alignés verticalement (même x), ligne droite
      if (Math.abs(sourceX - targetX) < 10) {
        return `M ${sourceX},${sourceY} L ${targetX},${targetY}`;
      }
      
      // Sinon, ligne en escalier (vertical-horizontal-vertical)
      const midY = sourceY + (targetY - sourceY) / 2;
      return `M ${sourceX},${sourceY}
              L ${sourceX},${midY}
              L ${targetX},${midY}
              L ${targetX},${targetY}`;
    };

    // Dessiner les liens VERTICAUX avec angles à 90°
    g.selectAll('.link')
      .data(links)
      .enter()
      .append('path')
      .attr('class', d => {
        const classes = ['link'];
        if (d.source.data.hasLargeTeam) classes.push('large-team-link');
        if (d.source.data.isCEO) classes.push('ceo-link');
        return classes.join(' ');
      })
      .attr('d', d => {
        const sourceX = d.source.x;
        const sourceY = d.source.y + nodeHeight / 2;
        const targetX = d.target.x;
        const targetY = d.target.y - nodeHeight / 2;
        
        return drawOrthogonalLine(sourceX, sourceY, targetX, targetY);
      })
      .attr('stroke', d => {
        if (d.source.data.isCEO) return '#1e40af';
        if (d.source.data.hasLargeTeam) return '#dc2626';
        return '#64748b';
      })
      .attr('stroke-width', d => {
        if (d.source.data.isCEO) return 3;
        if (d.source.data.hasLargeTeam) return 2.5;
        return 2;
      })
      .attr('fill', 'none')
      .attr('opacity', 0.8);

    // Dessiner les nœuds
    const node = g.selectAll('.node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', d => {
        const classes = ['node'];
        if (d.data.isCEO) classes.push('node-ceo');
        if (d.data.hasLargeTeam) classes.push('node-large-team');
        if (d.parent && d.parent.data.hasLargeTeam) classes.push('team-member');
        classes.push(`node-depth-${d.depth}`);
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
          .style('filter', 'drop-shadow(0 8px 24px rgba(0, 0, 0, 0.3))');
        
        // Highlight les liens connectés
        svg.selectAll('.link')
          .style('opacity', l => 
            (l.source === d || l.target === d) ? 1 : 0.3
          );
      })
      .on('mouseout', function(event, d) {
        d3.select(this).select('.node-container')
          .transition()
          .duration(200)
          .style('filter', 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.15))');
        
        svg.selectAll('.link').style('opacity', 0.8);
      });

    // Conteneur pour le nœud
    node.append('rect')
      .attr('class', 'node-container')
      .attr('x', -nodeWidth / 2)
      .attr('y', -nodeHeight / 2)
      .attr('width', nodeWidth)
      .attr('height', nodeHeight)
      .attr('rx', 6)
      .attr('ry', 6)
      .attr('fill', d => {
        if (d.data.isCEO) return 'url(#ceo-gradient)';
        if (d.parent && d.parent.data.hasLargeTeam) return 'url(#team-member-gradient)';
        const isManager = d.data.poste?.toLowerCase().includes('responsable') || 
                         d.data.poste?.toLowerCase().includes('manager') ||
                         d.data.poste?.toLowerCase().includes('directeur') ||
                         d.data.poste?.toLowerCase().includes('chef');
        return isManager ? 'url(#manager-gradient)' : (departmentColors[d.data.site_dep] || '#475569');
      })
      .attr('stroke', d => {
        if (d.data.isCEO) return '#1e3a8a';
        if (d.parent && d.parent.data.hasLargeTeam) return '#0f766e';
        const isManager = d.data.poste?.toLowerCase().includes('responsable') || 
                         d.data.poste?.toLowerCase().includes('manager') ||
                         d.data.poste?.toLowerCase().includes('directeur') ||
                         d.data.poste?.toLowerCase().includes('chef');
        return isManager ? '#3730a3' : '#334155';
      })
      .attr('stroke-width', d => {
        if (d.data.isCEO) return 3;
        if (d.data.hasLargeTeam) return 2.5;
        return 1.5;
      })
      .style('filter', 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.15))');

    // Badge de statut (CEO/Manager)
    node.filter(d => d.data.isCEO || d.data.poste?.toLowerCase().includes('responsable') || 
                    d.data.poste?.toLowerCase().includes('manager') || 
                    d.data.poste?.toLowerCase().includes('directeur'))
      .append('rect')
      .attr('class', 'status-badge')
      .attr('x', nodeWidth / 2 - 35)
      .attr('y', -nodeHeight / 2)
      .attr('width', 35)
      .attr('height', 22)
      .attr('rx', 4)
      .attr('ry', 4)
      .attr('fill', d => d.data.isCEO ? '#1e40af' : '#4f46e5');

    node.filter(d => d.data.isCEO || d.data.poste?.toLowerCase().includes('responsable') || 
                    d.data.poste?.toLowerCase().includes('manager') || 
                    d.data.poste?.toLowerCase().includes('directeur'))
      .append('text')
      .attr('x', nodeWidth / 2 - 17.5)
      .attr('y', -nodeHeight / 2 + 13)
      .attr('text-anchor', 'middle')
      .attr('fill', 'white')
      .style('font-size', '11px')
      .style('font-weight', 'bold')
      .text(d => d.data.isCEO ? 'CEO' : 'MGR');

    // Badge pour les managers avec grande équipe
    node.filter(d => d.data.hasLargeTeam)
      .append('rect')
      .attr('class', 'large-team-indicator')
      .attr('x', -nodeWidth / 2)
      .attr('y', -nodeHeight / 2 - 22)
      .attr('width', nodeWidth)
      .attr('height', 18)
      .attr('rx', 3)
      .attr('ry', 3)
      .attr('fill', '#dc2626');

    node.filter(d => d.data.hasLargeTeam)
      .append('text')
      .attr('class', 'large-team-text')
      .attr('x', 0)
      .attr('y', -nodeHeight / 2 - 11)
      .attr('text-anchor', 'middle')
      .attr('fill', 'white')
      .style('font-size', '10px')
      .style('font-weight', 'bold')
      .text(d => `Grande équipe (${d.data.teamSize} membres)`);

    // Numéro d'ordre pour les membres de grande équipe
    node.filter(d => d.parent && d.parent.data.hasLargeTeam)
      .each(function(d, i) {
        d3.select(this)
          .append('rect')
          .attr('class', 'member-order-badge')
          .attr('x', -nodeWidth / 2 - 25)
          .attr('y', -nodeHeight / 2)
          .attr('width', 25)
          .attr('height', 25)
          .attr('rx', 4)
          .attr('ry', 4)
          .attr('fill', '#dc2626');
        
        d3.select(this)
          .append('text')
          .attr('x', -nodeWidth / 2 - 12.5)
          .attr('y', -nodeHeight / 2 + 14)
          .attr('text-anchor', 'middle')
          .attr('fill', 'white')
          .style('font-size', '12px')
          .style('font-weight', 'bold')
          .text(i + 1);
      });

    // Initiales
    node.append('text')
      .attr('class', 'node-initials')
      .attr('text-anchor', 'middle')
      .attr('dy', '-20')
      .style('font-weight', '700')
      .style('fill', 'white')
      .style('font-size', '24px')
      .style('letter-spacing', '1px')
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
      .style('font-weight', '600')
      .style('fill', 'white')
      .style('font-size', '14px')
      .text(d => {
        if (d.data.prenom && d.data.nom) {
          const fullName = `${d.data.prenom} ${d.data.nom}`;
          return fullName.length > 18 ? fullName.substring(0, 16) + '...' : fullName;
        }
        return 'Nom inconnu';
      });

    // Poste
    node.append('text')
      .attr('class', 'node-position')
      .attr('text-anchor', 'middle')
      .attr('dy', '22')
      .style('fill', 'rgba(255,255,255,0.95)')
      .style('font-size', '12px')
      .style('font-weight', '500')
      .text(d => {
        const position = d.data.poste || '';
        if (position.length > 25) {
          return position.substring(0, 23) + '...';
        }
        return position;
      });

    // Département
    node.append('text')
      .attr('class', 'node-department')
      .attr('text-anchor', 'middle')
      .attr('dy', '36')
      .style('fill', 'rgba(255,255,255,0.85)')
      .style('font-size', '11px')
      .style('font-weight', '400')
      .text(d => {
        const dept = d.data.site_dep || 'Non spécifié';
        return dept.length > 22 ? dept.substring(0, 20) + '...' : dept;
      });

    // Indicateur d'équipe pour les managers
    node.filter(d => d.children && d.children.length > 0 && !d.data.hasLargeTeam)
      .append('g')
      .attr('class', 'team-indicator')
      .attr('transform', `translate(${nodeWidth / 2 - 18}, ${nodeHeight / 2 - 18})`)
      .append('circle')
      .attr('r', 14)
      .attr('fill', '#10b981')
      .attr('stroke', 'white')
      .attr('stroke-width', 2);

    node.filter(d => d.children && d.children.length > 0 && !d.data.hasLargeTeam)
      .select('.team-indicator')
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .style('fill', 'white')
      .style('font-size', '11px')
      .style('font-weight', 'bold')
      .text(d => d.children?.length || 0);

    // Fonction de zoom
    const zoom = d3.zoom()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setZoomLevel(event.transform.k);
      });

    svg.call(zoom);

    // Centrer sur Fethi avec animation
    const ceoNode = nodes.find(d => d.data.isCEO);
    if (ceoNode) {
      const finalX = containerWidth / 2 - ceoNode.x * scale;
      const finalY = 100;
      
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
    
    svg.transition()
      .duration(500)
      .call(d3.zoom().transform, d3.zoomIdentity
        .translate(containerWidth / 2, 100)
        .scale(0.65));
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
    ).length,
    largeTeams: filteredEmployees.filter(e => {
      // Compter les managers avec plus de 3 rapports directs
      const email = e.adresse_mail?.toLowerCase();
      const directReportsCount = filteredEmployees.filter(emp => 
        emp.mail_responsable1?.toLowerCase() === email
      ).length;
      return directReportsCount > 3;
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
        <p className="subtitle">Structure organisationnelle - Plant Manager: Fethi Chaouachi</p>
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
        <div className="stat-card">
          <div style={{background: '#fef2f2', padding: '14px', borderRadius: '14px'}}>
            <Users size={24} color="#dc2626" />
          </div>
          <div>
            <h3>{stats.largeTeams}</h3>
            <p>Grandes équipes (>3)</p>
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
            <span className="hierarchy-label">Structure : </span>
            <span className="hierarchy-value">Fethi Chaouachi (Plant Manager)</span>
            <span className="hierarchy-note">
              • Grandes équipes (>3) → membres disposés verticalement sous le manager
            </span>
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
            <h4>Légende de l'organigramme</h4>
          </div>
          <div className="legend-grid">
            <div className="legend-item ceo-item">
              <div className="legend-color ceo-color"></div>
              <div className="legend-text">
                <span className="legend-title">Plant Manager (Fethi)</span>
              </div>
            </div>
            <div className="legend-item manager-item">
              <div className="legend-color manager-color"></div>
              <div className="legend-text">
                <span className="legend-title">Managers sous Fethi</span>
              </div>
            </div>
            <div className="legend-item large-team-item">
              <div className="legend-color" style={{ background: '#dc2626' }}></div>
              <div className="legend-text">
                <span className="legend-title">Managers avec grande équipe (>3)</span>
                <span className="legend-count">(Membres disposés verticalement)</span>
              </div>
            </div>
            <div className="legend-item team-member-item">
              <div className="legend-color" style={{ background: 'url(#team-member-gradient)' }}></div>
              <div className="legend-text">
                <span className="legend-title">Membres de grande équipe</span>
                <span className="legend-count">(Numérotés dans l'ordre)</span>
              </div>
            </div>
            <div className="legend-item line-style-item">
              <div className="legend-line-sample">
                <svg width="100" height="40">
                  <path d="M 10,20 L 10,30 L 90,30 L 90,20" 
                        stroke="#64748b" 
                        stroke-width="2" 
                        fill="none" 
                        stroke-linecap="round" />
                </svg>
              </div>
              <div className="legend-text">
                <span className="legend-title">Lignes de connexion</span>
                <span className="legend-count">(Angles droits à 90° - style professionnel)</span>
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
            <span className="stat-item">
              <Users size={14} />
              {stats.managers} responsables
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
