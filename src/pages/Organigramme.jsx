import React, { useState, useEffect, useRef, useMemo } from 'react';
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

  const svgRef = useRef(null);
  const containerRef = useRef(null);

  // IMPORTANT: garder le même zoom behavior
  const zoomBehaviorRef = useRef(null);

  // Pour reset/fit
  const initialTransformRef = useRef(d3.zoomIdentity);
  const ceoPosRef = useRef({ x: 0, y: 0, scale: 1 });

  // Couleurs par département
  const departmentColors = useMemo(() => ({
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
  }), []);

  // Nouvelle fonction de hiérarchie améliorée
  const buildHierarchy = () => {
    const employeeMap = new Map();

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

    if (!fethiNode) return { name: 'Organigramme', children: [] };

    fethiNode.isCEO = true;
    fethiNode.site_dep = fethiNode.site_dep || 'Plant Manager';
    fethiNode.depth = 0;

    const processed = new Set([fethiEmail]);

    const directReports = employees.filter(e => {
      const email = e.adresse_mail?.toLowerCase();
      if (!email || processed.has(email) || email === fethiEmail) return false;

      const resp1 = e.mail_responsable1?.toLowerCase();
      const resp2 = e.mail_responsable2?.toLowerCase();

      if (!resp1 && !resp2) return true;          // sans manager -> sous CEO
      if (resp1 === fethiEmail) return true;      // manager1 = CEO -> sous CEO
      if (!resp2 && resp1 !== fethiEmail) return true;

      return false;
    });

    const isManagerLike = (poste = '') => {
      const p = poste.toLowerCase();
      return p.includes('responsable') || p.includes('manager') || p.includes('directeur') || p.includes('chef');
    };

    directReports.sort((a, b) => {
      const aM = isManagerLike(a.poste);
      const bM = isManagerLike(b.poste);
      if (aM && !bM) return -1;
      if (!aM && bM) return 1;
      return (a.prenom || '').localeCompare(b.prenom || '');
    });

    directReports.forEach(emp => {
      const email = emp.adresse_mail?.toLowerCase();
      if (email && employeeMap.has(email)) {
        const node = employeeMap.get(email);
        node.depth = 1;
        fethiNode.children.push(node);
        processed.add(email);
      }
    });

    const buildTreeForManager = (managerEmail, currentDepth) => {
      const managerNode = employeeMap.get(managerEmail);
      if (!managerNode) return;

      const teamMembers = employees.filter(e => {
        const email = e.adresse_mail?.toLowerCase();
        if (!email || processed.has(email) || email === managerEmail) return false;

        const resp1 = e.mail_responsable1?.toLowerCase();
        return resp1 === managerEmail;
      });

      teamMembers.sort((a, b) => {
        const aSub = isManagerLike(a.poste);
        const bSub = isManagerLike(b.poste);
        if (aSub && !bSub) return -1;
        if (!aSub && bSub) return 1;
        return (a.prenom || '').localeCompare(b.prenom || '');
      });

      teamMembers.forEach(member => {
        const email = member.adresse_mail?.toLowerCase();
        if (email && employeeMap.has(email)) {
          const node = employeeMap.get(email);
          node.depth = currentDepth + 1;
          managerNode.children.push(node);
          processed.add(email);

          if (isManagerLike(node.poste)) {
            buildTreeForManager(email, currentDepth + 1);
          }
        }
      });
    };

    fethiNode.children.forEach(child => {
      if (isManagerLike(child.poste)) {
        buildTreeForManager(child.id, 1);
      }
    });

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

  useEffect(() => {
    fetchEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await employeesAPI.getAll();
      const activeEmployees = response.data.filter(emp => emp.statut === 'actif' || !emp.statut);
      setEmployees(activeEmployees);
      setFilteredEmployees(activeEmployees);
    } catch (error) {
      console.error('Erreur chargement employés:', error);
    } finally {
      setLoading(false);
    }
  };

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

  // Dessin d3
  useEffect(() => {
    if (loading || !svgRef.current || !containerRef.current || filteredEmployees.length === 0) return;

    const svgEl = svgRef.current;
    const containerEl = containerRef.current;

    d3.select(svgEl).selectAll('*').remove();

    const containerWidth = containerEl.clientWidth || 1200;
    const containerHeight = containerEl.clientHeight || 800;

    // Dimensions NODE (très lisible)
    const nodeWidth = 360;
    const nodeHeight = 210;

    // Espacements
    const levelSpacing = 300;
    const siblingSpacing = 270;

    const hierarchyData = buildHierarchy();
    const root = d3.hierarchy(hierarchyData);

    const tree = d3.tree()
      .nodeSize([siblingSpacing, levelSpacing])
      .separation((a, b) => (a.parent === b.parent ? 1 : 1.35));

    tree(root);

    const nodes = root.descendants();
    const links = root.links();

    // bounds
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    nodes.forEach(d => {
      if (d.x < minX) minX = d.x;
      if (d.x > maxX) maxX = d.x;
      if (d.y < minY) minY = d.y;
      if (d.y > maxY) maxY = d.y;
    });

    // dimensions réelles
    const width = (maxX - minX) + nodeWidth + 400;
    const height = (maxY - minY) + nodeHeight + 500;

    const svg = d3.select(svgEl)
      .attr('width', containerWidth)
      .attr('height', containerHeight);

    const defs = svg.append('defs');

    // Gradients
    const ceoGradient = defs.append('linearGradient')
      .attr('id', 'ceo-gradient')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '100%').attr('y2', '100%');

    ceoGradient.append('stop').attr('offset', '0%').attr('stop-color', '#1e40af');
    ceoGradient.append('stop').attr('offset', '100%').attr('stop-color', '#3b82f6');

    const managerGradient = defs.append('linearGradient')
      .attr('id', 'manager-gradient')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '100%').attr('y2', '100%');

    managerGradient.append('stop').attr('offset', '0%').attr('stop-color', '#4f46e5');
    managerGradient.append('stop').attr('offset', '100%').attr('stop-color', '#6366f1');

    const g = svg.append('g').attr('class', 'main-group');

    // scale initial lisible (CLAMP)
    const fitScale = Math.min(
      containerWidth / (width + 200),
      containerHeight / (height + 200)
    );
    const initialScale = Math.max(0.68, Math.min(1.12, fitScale));

    // centrer globalement
    const initialX = (containerWidth - width * initialScale) / 2 + (-minX * initialScale) + 80;
    const initialY = 70;

    const initialTransform = d3.zoomIdentity.translate(initialX, initialY).scale(initialScale);
    initialTransformRef.current = initialTransform;

    g.attr('transform', initialTransform);

    // Générateur de liens courbes (vertical)
    const linkGen = d3.linkVertical()
      .x(d => d.x)
      .y(d => d.y);

    // Liens
    g.selectAll('.link')
      .data(links)
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', d => linkGen({ source: d.source, target: d.target }))
      .attr('fill', 'none')
      .attr('stroke', d => (d.source.data.isCEO ? '#1e40af' : '#64748b'))
      .attr('stroke-width', d => (d.source.data.isCEO ? 3 : 2))
      .attr('opacity', 0.78);

    const isManagerLike = (poste = '') => {
      const p = poste.toLowerCase();
      return p.includes('responsable') || p.includes('manager') || p.includes('directeur') || p.includes('chef');
    };

    // Nodes
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
      .on('mouseover', function (event, d) {
        d3.select(this).select('.node-container')
          .transition().duration(180)
          .style('transform', 'scale(1.03)');

        // highlight links
        svg.selectAll('.link')
          .style('opacity', l => (l.source === d || l.target === d ? 1 : 0.18));

        // highlight neighborhood
        svg.selectAll('.node')
          .style('opacity', n => {
            if (n === d || n.parent === d || d.parent === n || (n.parent && d.parent && n.parent === d.parent)) return 1;
            return 0.4;
          });
      })
      .on('mouseout', function () {
        d3.select(this).select('.node-container')
          .transition().duration(180)
          .style('transform', 'scale(1)');

        svg.selectAll('.link').style('opacity', 0.78);
        svg.selectAll('.node').style('opacity', 1);
      });

    // Container rect
    node.append('rect')
      .attr('class', 'node-container')
      .attr('x', -nodeWidth / 2)
      .attr('y', -nodeHeight / 2)
      .attr('width', nodeWidth)
      .attr('height', nodeHeight)
      .attr('rx', 14)
      .attr('ry', 14)
      .attr('fill', d => {
        if (d.data.isCEO) return 'url(#ceo-gradient)';
        const isManager = isManagerLike(d.data.poste);
        return isManager ? 'url(#manager-gradient)' : (departmentColors[d.data.site_dep] || '#475569');
      })
      .attr('stroke', d => {
        if (d.data.isCEO) return '#1e3a8a';
        const isManager = isManagerLike(d.data.poste);
        return isManager ? '#3730a3' : '#334155';
      })
      .attr('stroke-width', d => (d.data.isCEO ? 4 : 2));

    // Badge CEO / MGR
    node.filter(d => d.data.isCEO || isManagerLike(d.data.poste))
      .append('rect')
      .attr('class', 'status-badge')
      .attr('x', nodeWidth / 2 - 52)
      .attr('y', -nodeHeight / 2 + 10)
      .attr('width', 54)
      .attr('height', 28)
      .attr('rx', 12)
      .attr('ry', 12)
      .attr('fill', d => (d.data.isCEO ? '#1e40af' : '#4f46e5'));

    node.filter(d => d.data.isCEO || isManagerLike(d.data.poste))
      .append('text')
      .attr('x', nodeWidth / 2 - 25)
      .attr('y', -nodeHeight / 2 + 30)
      .attr('text-anchor', 'middle')
      .attr('fill', 'white')
      .style('font-size', '14px')
      .style('font-weight', '800')
      .text(d => (d.data.isCEO ? 'CEO' : 'MGR'));

    // Initiales
    node.append('text')
      .attr('class', 'node-initials')
      .attr('text-anchor', 'middle')
      .attr('dy', '-26')
      .style('font-weight', '900')
      .style('fill', 'white')
      .style('font-size', '32px')
      .style('letter-spacing', '1px')
      .text(d => {
        if (d.data.prenom && d.data.nom) {
          return `${d.data.prenom.charAt(0).toUpperCase()}${d.data.nom.charAt(0).toUpperCase()}`;
        }
        return '??';
      });

    // Nom
    node.append('text')
      .attr('class', 'node-name')
      .attr('text-anchor', 'middle')
      .attr('dy', '10')
      .style('font-weight', '800')
      .style('fill', 'white')
      .style('font-size', '22px')
      .text(d => {
        if (d.data.prenom && d.data.nom) {
          const full = `${d.data.prenom} ${d.data.nom}`;
          return full.length > 22 ? full.substring(0, 21) + '…' : full;
        }
        return 'Nom inconnu';
      });

    // Poste
    node.append('text')
      .attr('class', 'node-position')
      .attr('text-anchor', 'middle')
      .attr('dy', '34')
      .style('fill', 'rgba(255,255,255,0.95)')
      .style('font-size', '18px')
      .style('font-weight', '600')
      .text(d => {
        const p = d.data.poste || '';
        return p.length > 30 ? p.substring(0, 29) + '…' : p;
      });

    // Département
    node.append('text')
      .attr('class', 'node-department')
      .attr('text-anchor', 'middle')
      .attr('dy', '54')
      .style('fill', 'rgba(255,255,255,0.85)')
      .style('font-size', '16px')
      .style('font-weight', '500')
      .text(d => {
        const dept = d.data.site_dep || 'Non spécifié';
        return dept.length > 24 ? dept.substring(0, 23) + '…' : dept;
      });

    // Indicateur d'équipe
    node.filter(d => d.children && d.children.length > 0)
      .append('g')
      .attr('class', 'team-indicator')
      .attr('transform', `translate(${nodeWidth / 2 - 26}, ${nodeHeight / 2 - 26})`)
      .call(g2 => {
        g2.append('circle')
          .attr('r', 18)
          .attr('fill', '#ef4444')
          .attr('stroke', 'white')
          .attr('stroke-width', 2);

        g2.append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', '0.35em')
          .style('fill', 'white')
          .style('font-size', '16px')
          .style('font-weight', '800')
          .text(d => d.children.length);
      });

    // Zoom behavior (unique)
    const zoom = d3.zoom()
      .scaleExtent([0.35, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setZoomLevel(event.transform.k);
      });

    zoomBehaviorRef.current = zoom;
    svg.call(zoom);

    // Center on CEO (optionnel mais propre)
    const ceoNode = nodes.find(d => d.data.isCEO);
    if (ceoNode) {
      const tx = containerWidth / 2 - ceoNode.x * initialScale;
      const ty = 130;
      const t = d3.zoomIdentity.translate(tx, ty).scale(initialScale);
      ceoPosRef.current = { x: ceoNode.x, y: ceoNode.y, scale: initialScale };

      svg.transition()
        .duration(650)
        .call(zoom.transform, t);
    }

    // Close panel on background click
    svg.on('click', () => setSelectedNode(null));

  }, [filteredEmployees, loading, departmentColors]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleZoomIn = () => {
    const svg = d3.select(svgRef.current);
    if (!zoomBehaviorRef.current) return;
    svg.transition().duration(220).call(zoomBehaviorRef.current.scaleBy, 1.18);
  };

  const handleZoomOut = () => {
    const svg = d3.select(svgRef.current);
    if (!zoomBehaviorRef.current) return;
    svg.transition().duration(220).call(zoomBehaviorRef.current.scaleBy, 0.85);
  };

  const handleResetZoom = () => {
    const svg = d3.select(svgRef.current);
    if (!zoomBehaviorRef.current) return;

    // Reset vers transform initial (fit lisible)
    svg.transition()
      .duration(420)
      .call(zoomBehaviorRef.current.transform, initialTransformRef.current);
  };

  const stats = useMemo(() => {
    const managers = filteredEmployees.filter(e => {
      const p = (e.poste || '').toLowerCase();
      return p.includes('manager') || p.includes('responsable') || p.includes('directeur') || p.includes('chef');
    }).length;

    return {
      total: filteredEmployees.length,
      departments: [...new Set(filteredEmployees.map(e => e.site_dep).filter(Boolean))].length,
      managers
    };
  }, [filteredEmployees]);

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
            <span className="info-value">
              {new Date().toLocaleDateString('fr-FR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
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
