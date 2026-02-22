import React, { useState, useEffect, useRef } from 'react';
import { employeesAPI } from '../services/api';
import * as d3 from 'd3';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  User,
  Briefcase,
  Mail,
  Phone,
  Users,
  Download,
  Printer
} from 'lucide-react';
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

  const departmentColors = {
    CEO: '#0a0c10',
    Général: '#0f766e',
    Digitale: '#991b1b',
    Commerce: '#0c4a6e',
    Chiffrage: '#0b5e42',
    Achat: '#9a3412',
    Qualité: '#5b21b6',
    'Logistique Germany': '#0e7c86',
    'Logistique Groupe': '#854d0e',
    Finance: '#581c87',
    Siège: '#075985',
    Management: '#1e293b',
    Default: '#4b5563'
  };

  const cleanName = (prenom, nom) => {
    if (!prenom && !nom) return 'Sans nom';
    const removeAbbreviations = (str) => {
      if (!str) return '';
      let cleaned = str;
      cleaned = cleaned.replace(/\s+[A-ZÀ-Ÿ]{2,}$/g, '');
      cleaned = cleaned.replace(/[-–—]\s*[A-ZÀ-Ÿ]{2,}$/g, '');
      cleaned = cleaned.replace(/\s+[A-ZÀ-Ÿ]{2,}\s+/g, ' ');
      cleaned = cleaned.replace(/^[A-ZÀ-Ÿ]{2,}\s+/g, '');
      cleaned = cleaned.replace(/\s*\([A-ZÀ-Ÿ]{2,}\)\s*/g, ' ');
      cleaned = cleaned.replace(/\s*\[[A-ZÀ-Ÿ]{2,}\]\s*/g, ' ');
      cleaned = cleaned.replace(/\s+/g, ' ').trim();
      return cleaned;
    };
    const cleanPrenom = removeAbbreviations(prenom || '');
    const cleanNom = removeAbbreviations(nom || '');
    if (!cleanPrenom && !cleanNom) return 'Sans nom';
    if (!cleanPrenom) return cleanNom;
    if (!cleanNom) return cleanPrenom;
    return `${cleanPrenom} ${cleanNom}`.trim();
  };

  const cleanPosition = (poste) => {
    if (!poste) return 'Non spécifié';
    return poste.replace(/\s+[A-Z]{2,}$/g, '').replace(/[-–—][A-Z]{2,}$/g, '').trim();
  };

  const buildHierarchy = () => {
    const employeeMap = new Map();
    employees.forEach((emp) => {
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
        id: 'ceo', prenom: 'Fethi', nom: 'Chaouachi', poste: 'Plant Manager',
        matricule: '', site_dep: 'CEO', adresse_mail: 'fethi.chaouachi@exemple.com',
        children: [], depth: 0, isCEO: true, isManager: true
      };
      fethiEmail = 'fethi.chaouachi@exemple.com';
      employeeMap.set(fethiEmail, fethiNode);
    } else {
      fethiNode.isCEO = true;
      fethiNode.isManager = true;
      fethiNode.poste = 'Plant Manager';
      fethiNode.site_dep = 'CEO';
    }

    employees.forEach((emp) => {
      const resp1 = emp.mail_responsable1?.toLowerCase();
      if (resp1 && employeeMap.has(resp1)) employeeMap.get(resp1).isManager = true;
      const resp2 = emp.mail_responsable2?.toLowerCase();
      if (resp2 && employeeMap.has(resp2) && resp2 !== resp1) employeeMap.get(resp2).isManager = true;
    });

    const processed = new Set([fethiEmail]);

    const directReports = employees.filter((e) => {
      const email = e.adresse_mail?.toLowerCase();
      return email !== fethiEmail && e.mail_responsable1?.toLowerCase() === fethiEmail;
    });

    directReports.forEach((emp) => {
      const email = emp.adresse_mail?.toLowerCase();
      if (email && employeeMap.has(email) && !processed.has(email)) {
        const node = employeeMap.get(email);
        node.depth = 1;
        node.parentId = fethiEmail;
        fethiNode.children.push(node);
        processed.add(email);
      }
    });

    const processManager = (managerEmail) => {
      const manager = employeeMap.get(managerEmail);
      if (!manager || !manager.isManager) return;
      const subordinates = employees.filter((e) => {
        const email = e.adresse_mail?.toLowerCase();
        const resp1 = e.mail_responsable1?.toLowerCase();
        const resp2 = e.mail_responsable2?.toLowerCase();
        return email !== managerEmail && !processed.has(email) && (resp1 === managerEmail || resp2 === managerEmail);
      });
      subordinates.forEach((sub) => {
        const email = sub.adresse_mail?.toLowerCase();
        if (email && employeeMap.has(email) && !processed.has(email)) {
          const subNode = employeeMap.get(email);
          subNode.depth = manager.depth + 1;
          subNode.parentId = managerEmail;
          if (!manager.children) manager.children = [];
          manager.children.push(subNode);
          processed.add(email);
          if (subNode.isManager) processManager(email);
        }
      });
    };

    Array.from(employeeMap.values())
      .filter((emp) => emp.isManager && emp.id !== fethiEmail && processed.has(emp.id))
      .forEach((manager) => processManager(manager.id));

    return fethiNode;
  };

  useEffect(() => { fetchEmployees(); }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await employeesAPI.getAll();
      const activeEmployees = response.data.filter((emp) => emp.statut === 'actif' || !emp.statut);
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
      const q = searchTerm.toLowerCase();
      setFilteredEmployees(employees.filter((emp) => {
        const fullName = cleanName(emp.prenom, emp.nom).toLowerCase();
        const position = cleanPosition(emp.poste).toLowerCase();
        return fullName.includes(q) || position.includes(q) || emp.site_dep?.toLowerCase().includes(q) || emp.matricule?.toLowerCase().includes(q);
      }));
    }
  }, [searchTerm, employees]);

  useEffect(() => {
    if (loading || !svgRef.current || filteredEmployees.length === 0) return;

    d3.select(svgRef.current).selectAll('*').remove();

    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;
    const nodeWidth = 340;
    const nodeHeight = 150;
    const horizontalSpacing = 350;
    const verticalSpacing = 180;

    const hierarchyData = buildHierarchy();
    const root = d3.hierarchy(hierarchyData);
    const tree = d3.tree().nodeSize([horizontalSpacing, verticalSpacing * 2]).separation(() => 1);
    tree(root);

    const nodes = root.descendants();
    nodes.forEach((node) => {
      if (node.depth === 0) {
        node.x = 0; node.y = 0;
      } else if (node.depth === 1) {
        const siblings = node.parent.children;
        const index = siblings.indexOf(node);
        const count = siblings.length;
        node.x = -((count - 1) * horizontalSpacing) / 2 + index * horizontalSpacing;
        node.y = verticalSpacing;
      } else if (node.depth >= 2) {
        const parent = node.parent;
        if (parent && parent.children) {
          const index = parent.children.indexOf(node);
          node.x = parent.x;
          node.y = parent.y + verticalSpacing * (index + 1);
        }
      }
    });

    const svg = d3.select(svgRef.current).attr('width', containerWidth).attr('height', containerHeight);
    const g = svg.append('g').attr('class', 'main-group');

    const minX = d3.min(nodes, (d) => d.x) || 0;
    const maxX = d3.max(nodes, (d) => d.x) || 0;
    const treeWidth = maxX - minX;
    const initialX = containerWidth / 2 - (minX + treeWidth / 2);
    const initialY = 120;
    const scale = 0.321;
    g.attr('transform', `translate(${initialX},${initialY}) scale(${scale})`);

    const defs = svg.append('defs');
    const ceoGradient = defs.append('linearGradient').attr('id', 'ceo-gradient').attr('x1', '0%').attr('y1', '0%').attr('x2', '100%').attr('y2', '100%');
    ceoGradient.append('stop').attr('offset', '0%').attr('stop-color', '#0a0c10');
    ceoGradient.append('stop').attr('offset', '100%').attr('stop-color', '#1e293b');

    const managerGradient = defs.append('linearGradient').attr('id', 'manager-gradient').attr('x1', '0%').attr('y1', '0%').attr('x2', '100%').attr('y2', '100%');
    managerGradient.append('stop').attr('offset', '0%').attr('stop-color', '#1e40af');
    managerGradient.append('stop').attr('offset', '100%').attr('stop-color', '#3b82f6');

    g.selectAll('.link').data(root.links()).enter().append('path')
      .attr('class', 'link')
      .attr('d', (d) => {
        const sx = d.source.x, sy = d.source.y + nodeHeight / 2;
        const tx = d.target.x, ty = d.target.y - nodeHeight / 2;
        if (sx === tx) return `M ${sx},${sy} L ${tx},${ty}`;
        const midY = sy + (ty - sy) * 0.5;
        return `M ${sx},${sy} L ${sx},${midY} L ${tx},${midY} L ${tx},${ty}`;
      })
      .attr('stroke', '#94a3b8').attr('stroke-width', 1.8).attr('fill', 'none').attr('opacity', 0.6);

    const node = g.selectAll('.node').data(nodes).enter().append('g')
      .attr('class', (d) => ['node', d.data.isCEO ? 'node-ceo' : '', d.data.isManager && !d.data.isCEO ? 'node-manager' : ''].join(' ').trim())
      .attr('transform', (d) => `translate(${d.x},${d.y})`)
      .style('cursor', 'pointer')
      .on('click', (event, d) => { event.stopPropagation(); setSelectedNode(d.data); })
      .on('mouseover', function (event, d) {
        d3.select(this).select('.node-container').transition().duration(200)
          .attr('stroke-width', d.data.isCEO ? 4 : 3)
          .attr('stroke', d.data.isCEO ? '#fbbf24' : '#60a5fa');
        svg.selectAll('.link').style('opacity', (l) => l.source.data.id === d.data.id || l.target.data.id === d.data.id ? 1 : 0.2);
      })
      .on('mouseout', function (event, d) {
        d3.select(this).select('.node-container').transition().duration(200)
          .attr('stroke-width', d.data.isCEO ? 3 : d.data.isManager ? 2 : 1)
          .attr('stroke', d.data.isCEO ? '#fbbf24' : '#e2e8f0');
        svg.selectAll('.link').style('opacity', 0.6);
      });

    node.append('rect').attr('class', 'node-container')
      .attr('x', -nodeWidth / 2).attr('y', -nodeHeight / 2)
      .attr('width', nodeWidth).attr('height', nodeHeight)
      .attr('rx', 12).attr('ry', 12)
      .attr('fill', (d) => d.data.isCEO ? 'url(#ceo-gradient)' : d.data.isManager ? 'url(#manager-gradient)' : departmentColors[d.data.site_dep] || departmentColors.Default)
      .attr('stroke', (d) => d.data.isCEO ? '#fbbf24' : d.data.isManager ? '#93c5fd' : '#e2e8f0')
      .attr('stroke-width', (d) => d.data.isCEO ? 3 : d.data.isManager ? 2 : 1)
      .style('filter', 'drop-shadow(0 8px 12px rgba(0,0,0,0.15))');

    node.append('text').attr('x', -nodeWidth / 2 + 12).attr('y', -nodeHeight / 2 + 18)
      .attr('fill', 'rgba(255,255,255,0.9)').style('font-size', '11px').style('font-weight', '600').style('font-family', 'monospace')
      .text((d) => d.data.matricule || '');

    node.append('text').attr('text-anchor', 'middle').attr('y', -20)
      .style('fill', 'white').style('font-size', '32px').style('font-weight', '700').style('letter-spacing', '2px')
      .text((d) => `${(d.data.prenom || '').charAt(0)}${(d.data.nom || '').charAt(0)}`.toUpperCase());

    node.append('text').attr('text-anchor', 'middle').attr('y', 10)
      .style('fill', 'white').style('font-size', '15px').style('font-weight', '600')
      .text((d) => { const n = cleanName(d.data.prenom, d.data.nom); return n.length > 22 ? n.substring(0, 20) + '...' : n; });

    node.append('text').attr('text-anchor', 'middle').attr('y', 35)
      .style('fill', 'rgba(255,255,255,0.95)').style('font-size', '12px').style('font-weight', '500')
      .text((d) => { const p = d.data.poste || ''; return p.length > 28 ? p.substring(0, 26) + '...' : p; });

    node.append('text').attr('text-anchor', 'middle').attr('y', 55)
      .style('fill', 'rgba(255,255,255,0.7)').style('font-size', '10px')
      .text((d) => d.data.site_dep || '');

    node.filter((d) => d.data.isManager && !d.data.isCEO)
      .append('rect').attr('x', nodeWidth / 2 - 40).attr('y', -nodeHeight / 2)
      .attr('width', 40).attr('height', 24).attr('rx', 8)
      .attr('fill', '#f59e0b').attr('stroke', 'white').attr('stroke-width', 1.5);

    node.filter((d) => d.data.isManager && !d.data.isCEO)
      .append('text').attr('x', nodeWidth / 2 - 20).attr('y', -nodeHeight / 2 + 16)
      .attr('text-anchor', 'middle').attr('fill', 'white')
      .style('font-size', '11px').style('font-weight', 'bold').text('MGR');

    node.filter((d) => d.children && d.children.length > 0)
      .append('circle').attr('cx', nodeWidth / 2 - 18).attr('cy', nodeHeight / 2 - 18)
      .attr('r', 16).attr('fill', '#10b981').attr('stroke', 'white').attr('stroke-width', 2.5);

    node.filter((d) => d.children && d.children.length > 0)
      .append('text').attr('x', nodeWidth / 2 - 18).attr('y', nodeHeight / 2 - 14)
      .attr('text-anchor', 'middle').attr('fill', 'white')
      .style('font-size', '12px').style('font-weight', 'bold')
      .text((d) => d.children.length);

    const zoom = d3.zoom().scaleExtent([0.15, 3]).on('zoom', (event) => {
      g.attr('transform', event.transform);
      setZoomLevel(event.transform.k);
    });
    svg.call(zoom);

    const ceoNode = nodes.find((d) => d.data.isCEO);
    if (ceoNode) {
      svg.transition().duration(800).call(
        zoom.transform,
        d3.zoomIdentity.translate(containerWidth / 2 - ceoNode.x * scale, 120).scale(scale)
      );
    }
  }, [filteredEmployees, loading]);

  // ─── Core: build a standalone SVG string with the FULL chart ────────────────
  const buildFullSVGString = () => {
    const svg = svgRef.current;
    if (!svg) return null;

    const mainGroup = svg.querySelector('.main-group');
    if (!mainGroup) return null;

    // Get the real bounding box of all content
    const bbox = mainGroup.getBBox();
    const padding = 60;
    const fullWidth  = Math.ceil(bbox.width  + padding * 2);
    const fullHeight = Math.ceil(bbox.height + padding * 2);

    // Clone the SVG so we don't touch the live one
    const cloned = svg.cloneNode(true);
    cloned.setAttribute('width',  fullWidth);
    cloned.setAttribute('height', fullHeight);
    cloned.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    // Reset the transform on the cloned main-group so everything is visible
    const clonedGroup = cloned.querySelector('.main-group');
    if (clonedGroup) {
      clonedGroup.setAttribute('transform', `translate(${-bbox.x + padding}, ${-bbox.y + padding})`);
    }

    // Inline critical styles so they survive serialization
    cloned.setAttribute('style', 'background:#ffffff; font-family: Arial, sans-serif;');

    const serializer = new XMLSerializer();
    return { svgString: serializer.serializeToString(cloned), fullWidth, fullHeight };
  };

  // ─── Convert SVG string → canvas via Image ──────────────────────────────────
  const svgStringToCanvas = ({ svgString, fullWidth, fullHeight }) => {
    return new Promise((resolve, reject) => {
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url  = URL.createObjectURL(blob);
      const img  = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale  = 2; // retina
        canvas.width  = fullWidth  * scale;
        canvas.height = fullHeight * scale;
        const ctx = canvas.getContext('2d');
        ctx.scale(scale, scale);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, fullWidth, fullHeight);
        ctx.drawImage(img, 0, 0, fullWidth, fullHeight);
        URL.revokeObjectURL(url);
        resolve(canvas);
      };

      img.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(new Error('Impossible de charger le SVG comme image'));
      };

      img.src = url;
    });
  };

  // ─── Export PDF ─────────────────────────────────────────────────────────────
  const exportToPDF = async () => {
    if (!svgRef.current || exporting) return;
    setExporting(true);
    try {
      const svgData = buildFullSVGString();
      if (!svgData) throw new Error('SVG introuvable');

      const canvas  = await svgStringToCanvas(svgData);
      const imgData = canvas.toDataURL('image/png');

      // Dynamically import jsPDF only when needed
      const { default: jsPDF } = await import('jspdf');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`Organigramme_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('Erreur export PDF:', err);
      alert('Erreur lors de l\'export PDF : ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  // ─── Print ──────────────────────────────────────────────────────────────────
  const printOrganigramme = async () => {
    if (!svgRef.current || exporting) return;
    setExporting(true);
    setSelectedNode(null);

    try {
      const svgData = buildFullSVGString();
      if (!svgData) throw new Error('SVG introuvable');

      const canvas      = await svgStringToCanvas(svgData);
      const imgData     = canvas.toDataURL('image/png');
      const aspectRatio = canvas.width / canvas.height;

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert("Impossible d'ouvrir la fenêtre d'impression. Autorisez les popups puis réessayez.");
        return;
      }

      printWindow.document.open();
      printWindow.document.write(`
        <!doctype html>
        <html lang="fr">
          <head>
            <meta charset="utf-8" />
            <title>Organigramme</title>
            <style>
              @page { size: landscape; margin: 8mm; }
              html, body { margin: 0; padding: 0; background: #fff; width: 100%; height: 100%; }
              .page {
                width: 100%;
                height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                box-sizing: border-box;
              }
              img {
                max-width: 100%;
                max-height: 100%;
                width: auto;
                height: auto;
                aspect-ratio: ${aspectRatio};
                object-fit: contain;
                display: block;
              }
            </style>
          </head>
          <body>
            <div class="page">
              <img src="${imgData}" alt="Organigramme" />
            </div>
            <script>
              window.onload = function () {
                setTimeout(function () {
                  window.focus();
                  window.print();
                  window.onafterprint = function () { window.close(); };
                }, 600);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (err) {
      console.error('Erreur impression:', err);
      alert('Erreur lors de l\'impression : ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  const stats = {
    total: filteredEmployees.length,
    departments: [...new Set(filteredEmployees.map((e) => e.site_dep).filter(Boolean))].length,
    managers: filteredEmployees.filter((e) => {
      const email = e.adresse_mail?.toLowerCase();
      return filteredEmployees.some((emp) => emp.mail_responsable1?.toLowerCase() === email);
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
        <h1>Organigramme hiérarchique</h1>
        <p className="subtitle">
          <span className="ceo-badge">Plant Manager : Fethi Chaouachi</span>
          <span className="disposition-badge-horizontal">Niveau 1 : espacement uniforme</span>
          <span className="disposition-badge-vertical">Équipes : disposition verticale</span>
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
            <button onClick={() => d3.select(svgRef.current).transition().duration(300).call(d3.zoom().scaleBy, 0.8)} className="zoom-btn" title="Zoom -">
              <ZoomOut size={20} />
            </button>
            <span className="zoom-level">{Math.round(zoomLevel * 100)}%</span>
            <button onClick={() => d3.select(svgRef.current).transition().duration(300).call(d3.zoom().scaleBy, 1.2)} className="zoom-btn" title="Zoom +">
              <ZoomIn size={20} />
            </button>
            <button
              onClick={() => {
                const containerWidth = containerRef.current.clientWidth;
                d3.select(svgRef.current).transition().duration(500).call(
                  d3.zoom().transform,
                  d3.zoomIdentity.translate(containerWidth / 2, 120).scale(0.22)
                );
              }}
              className="zoom-btn reset-btn" title="Réinitialiser la vue"
            >
              <RotateCcw size={20} />
            </button>
          </div>

          <div className="export-controls">
            <button onClick={printOrganigramme} className="print-btn" disabled={exporting}>
              <Printer size={18} /> {exporting ? 'En cours...' : 'Imprimer'}
            </button>
            <button onClick={exportToPDF} className="export-btn" disabled={exporting}>
              <Download size={18} /> {exporting ? 'En cours...' : 'Exporter en PDF'}
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
                    <p className="detail-matricule">Matricule : {selectedNode.matricule || 'Non renseigné'}</p>
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
          <div className="legend-header"><Briefcase size={20} /><h4>Légende</h4></div>
          <div className="legend-grid">
            <div className="legend-item">
              <div className="legend-color ceo-color"></div>
              <div className="legend-text"><span className="legend-title">Plant Manager</span><span className="legend-desc">Fethi Chaouachi</span></div>
            </div>
            <div className="legend-item">
              <div className="legend-color manager-color"></div>
              <div className="legend-text"><span className="legend-title">Manager</span><span className="legend-desc">Responsable d'équipe</span></div>
            </div>
            <div className="legend-item disposition-horizontal-item">
              <div className="disposition-sample-horizontal">
                <svg width="100" height="30">
                  <rect x="0" y="5" width="25" height="20" rx="4" fill="#3b82f6" opacity="0.7" />
                  <rect x="35" y="5" width="25" height="20" rx="4" fill="#64748b" opacity="0.7" />
                  <rect x="70" y="5" width="25" height="20" rx="4" fill="#64748b" opacity="0.7" />
                  <path d="M 12.5,15 L 35,15" stroke="#94a3b8" strokeWidth="1.5" />
                  <path d="M 47.5,15 L 70,15" stroke="#94a3b8" strokeWidth="1.5" />
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
                  <path d="M 20,20 L 20,30" stroke="#94a3b8" strokeWidth="1.5" />
                  <path d="M 20,50 L 20,60" stroke="#94a3b8" strokeWidth="1.5" />
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
                const count = filteredEmployees.filter((e) => e.site_dep === dept).length;
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
            <span className="stat-item disposition-horizontal-badge">→ Niveau 1 : espacement uniforme</span>
            <span className="stat-item disposition-vertical-badge">↓ Équipes : vertical</span>
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