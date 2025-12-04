import React, { useState } from 'react';
import './ArchiveEmployeeModal.css';

const ArchiveEmployeeModal = ({ employee, isOpen, onClose }) => {
  const [pdfLoading, setPdfLoading] = useState(false);
  
  if (!isOpen || !employee) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'Non renseignée';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR') + ' ' + date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDefaultAvatar = () => {
    return `https://ui-avatars.com/api/?name=${employee.prenom}+${employee.nom}&background=95a5a6&color=fff&size=150`;
  };

  const getPhotoUrl = () => {
    if (employee.photo && isValidUrl(employee.photo)) {
      return employee.photo;
    }
    return getDefaultAvatar();
  };

  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const isPdfUrl = (url) => {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    return lowerUrl.endsWith('.pdf') || 
           lowerUrl.includes('.pdf?') || 
           lowerUrl.includes('/pdf') || 
           lowerUrl.includes('application/pdf');
  };

  const getDocumentName = (url) => {
    if (!url) return 'Document PDF';
    
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = pathname.split('/').pop();
      
      if (filename && filename.includes('.pdf')) {
        // Retirer le timestamp et les numéros de génération
        let cleanName = filename
          .replace(/^archive-/, '')
          .replace(/-\d+-\d+\.pdf$/, '.pdf')
          .replace(/^dossier-/, '')
          .replace(/-\d+\.pdf$/, '.pdf');
        
        return decodeURIComponent(cleanName);
      }
      
      return `Document - ${urlObj.hostname}`;
    } catch {
      return 'Document PDF';
    }
  };

  const truncateUrl = (url, maxLength = 50) => {
    if (!url) return '';
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + '...';
  };

  const handleViewEntretien = async (e) => {
    e.preventDefault();
    
    // Priorité : pdf_archive_url (nouveau système) puis entretien_depart (ancien système)
    const pdfUrl = employee.pdf_archive_url || employee.entretien_depart;
    
    if (!pdfUrl) {
      alert('❌ Aucun document d\'entretien de départ disponible');
      return;
    }

    if (!isValidUrl(pdfUrl)) {
      alert('❌ Le lien vers l\'entretien n\'est pas une URL valide');
      return;
    }

    setPdfLoading(true);
    
    try {
      // Ouvrir le PDF dans un nouvel onglet
      const newWindow = window.open(pdfUrl, '_blank');
      
      if (!newWindow || newWindow.closed) {
        // Fallback pour les bloqueurs de popup
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
    } catch (error) {
      console.error('Erreur ouverture PDF:', error);
      alert('❌ Impossible d\'ouvrir le document. Le lien peut être invalide.');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleViewDossierRH = (e) => {
    e.preventDefault();
    
    if (!employee.dossier_rh) {
      alert('❌ Aucun dossier RH disponible');
      return;
    }

    if (!isValidUrl(employee.dossier_rh)) {
      alert('❌ Le lien vers le dossier RH n\'est pas une URL valide');
      return;
    }

    try {
      window.open(employee.dossier_rh, '_blank', 'noopener,noreferrer');
    } catch (error) {
      const link = document.createElement('a');
      link.href = employee.dossier_rh;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const getDocumentPreview = (url) => {
    if (!url) return null;
    
    // Vérifier si c'est un PDF stocké sur notre serveur
    if (url.includes('/api/archive-pdfs/') || url.includes('/api/pdfs/')) {
      return '📄 Document stocké sur le serveur';
    }
    
    // Vérifier si c'est un lien externe
    try {
      const urlObj = new URL(url);
      return `🔗 Lien externe: ${urlObj.hostname}`;
    } catch {
      return '📄 Document PDF';
    }
  };

  // Vérifier si on a des documents
  const hasArchivePdf = !!employee.pdf_archive_url;
  const hasEntretienDep = !!employee.entretien_depart;
  const hasDossierRH = !!employee.dossier_rh;

  return (
    <div className="archive-employee-modal-overlay" onClick={onClose}>
      <div className="archive-employee-modal-content" onClick={e => e.stopPropagation()}>
        <div className="archive-employee-modal-header">
          <div className="header-content">
            <h2>
              <span className="header-icon">📁</span>
              Détails de l'Employé Archivé
            </h2>
            <div className="archive-badge">
              <span className="badge-icon">📋</span>
              <span className="badge-text">ARCHIVÉ</span>
            </div>
          </div>
          <button className="close-btn" onClick={onClose} title="Fermer">×</button>
        </div>

        <div className="archive-employee-modal-body">
          {/* En-tête employé */}
          <div className="employee-header">
            <img 
              src={getPhotoUrl()} 
              alt={`${employee.prenom} ${employee.nom}`}
              className="employee-photo"
              onError={(e) => {
                e.target.src = getDefaultAvatar();
              }}
            />
            <div className="employee-basic-info">
              <h3>{employee.prenom} {employee.nom}</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Matricule</span>
                  <span className="info-value">{employee.matricule}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Poste</span>
                  <span className="info-value">{employee.poste}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Département</span>
                  <span className="info-value">{employee.site_dep}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Contrat</span>
                  <span className="info-value">{employee.type_contrat}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Informations principales */}
          <div className="employee-details-grid">
            <div className="detail-section">
              <h4>
                <span className="section-icon">📝</span>
                Informations Personnelles
              </h4>
              <DetailRow label="CIN" value={employee.cin} />
              <DetailRow label="Passeport" value={employee.passeport || 'Non renseigné'} />
              <DetailRow label="Date de naissance" value={formatDate(employee.date_naissance)} />
            </div>

            <div className="detail-section">
              <h4>
                <span className="section-icon">💼</span>
                Carrière
              </h4>
              <DetailRow label="Date d'embauche" value={formatDate(employee.date_debut)} />
              <DetailRow label="Salaire brut" value={`${employee.salaire_brute || 0} DT`} />
              <DetailRow 
                label="Date de départ" 
                value={
                  <span className="departure-date">
                    {formatDate(employee.date_depart)}
                    {employee.date_depart && (
                      <span className="departure-days">
                        ({Math.floor((new Date() - new Date(employee.date_depart)) / (1000 * 60 * 60 * 24))} jours)
                      </span>
                    )}
                  </span>
                } 
              />
            </div>

            {/* Section Documents - MODIFIÉE */}
            <div className="detail-section documents-section">
              <h4>
                <span className="section-icon">📎</span>
                Documents d'Archive
              </h4>
              
              {/* Document d'archive principal (nouveau système) */}
              {hasArchivePdf && (
                <div className="document-card main-document">
                  <div className="document-header">
                    <span className="document-icon">📁</span>
                    <div className="document-info">
                      <h5 className="document-title">Entretien de départ</h5>
                      <p className="document-subtitle">Document principal d'archive</p>
                    </div>
                  </div>
                  <div className="document-details">
                    <div className="document-url">
                      <span className="url-label">URL:</span>
                      <span className="url-value" title={employee.pdf_archive_url}>
                        {truncateUrl(employee.pdf_archive_url, 60)}
                      </span>
                    </div>
                    <div className="document-preview">
                      {getDocumentPreview(employee.pdf_archive_url)}
                    </div>
                  </div>
                  <button
                    className="view-document-btn primary"
                    onClick={handleViewEntretien}
                    disabled={pdfLoading}
                  >
                    {pdfLoading ? (
                      <>
                        <span className="loading-spinner"></span>
                        Ouverture...
                      </>
                    ) : (
                      <>
                        <span className="btn-icon">👁️</span>
                        Ouvrir le PDF
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Ancien système entretien_depart */}
              {!hasArchivePdf && hasEntretienDep && (
                <div className="document-card legacy-document">
                  <div className="document-header">
                    <span className="document-icon">📄</span>
                    <div className="document-info">
                      <h5 className="document-title">Entretien de départ (ancien)</h5>
                      <p className="document-subtitle">Ancien format de document</p>
                    </div>
                  </div>
                  <div className="document-details">
                    <div className="document-url">
                      <span className="url-label">Lien:</span>
                      <span className="url-value" title={employee.entretien_depart}>
                        {truncateUrl(employee.entretien_depart, 60)}
                      </span>
                    </div>
                  </div>
                  <button
                    className="view-document-btn secondary"
                    onClick={handleViewEntretien}
                    disabled={pdfLoading}
                  >
                    <span className="btn-icon">🔗</span>
                    Ouvrir le lien
                  </button>
                </div>
              )}

              {/* Dossier RH */}
              {hasDossierRH && (
                <div className="document-card dossier-card">
                  <div className="document-header">
                    <span className="document-icon">📋</span>
                    <div className="document-info">
                      <h5 className="document-title">Dossier RH complet</h5>
                      <p className="document-subtitle">Dossier ressources humaines</p>
                    </div>
                  </div>
                  <button
                    className="view-document-btn tertiary"
                    onClick={handleViewDossierRH}
                  >
                    <span className="btn-icon">📋</span>
                    Consulter le dossier
                  </button>
                </div>
              )}

              {/* Aucun document */}
              {!hasArchivePdf && !hasEntretienDep && !hasDossierRH && (
                <div className="no-documents">
                  <div className="no-docs-icon">📭</div>
                  <p className="no-docs-text">Aucun document d'archive disponible</p>
                  <p className="no-docs-subtext">
                    L'employé a été archivé sans document d'entretien de départ
                  </p>
                </div>
              )}
            </div>

            {/* Informations d'archivage */}
            <div className="detail-section archive-info">
              <h4>
                <span className="section-icon">⏱️</span>
                Informations d'Archivage
              </h4>
              <DetailRow 
                label="Statut" 
                value={
                  <span className={`status-badge ${employee.statut || 'archive'}`}>
                    {employee.statut === 'archive' ? 'ARCHIVÉ' : employee.statut?.toUpperCase() || 'ARCHIVÉ'}
                  </span>
                } 
              />
              {employee.updated_at && (
                <DetailRow 
                  label="Dernière mise à jour" 
                  value={formatDateTime(employee.updated_at)} 
                />
              )}
              {employee.created_at && (
                <DetailRow 
                  label="Date de création" 
                  value={formatDate(employee.created_at)} 
                />
              )}
            </div>
          </div>
        </div>

        <div className="archive-employee-modal-footer">
          <div className="footer-actions">
            <button 
              className="print-btn"
              onClick={() => window.print()}
              title="Imprimer les détails"
            >
              <span className="btn-icon">🖨️</span>
              Imprimer
            </button>
            <button 
              className="close-modal-btn"
              onClick={onClose}
            >
              <span className="btn-icon">←</span>
              Retour à la liste
            </button>
          </div>
          <div className="footer-note">
            <span className="note-icon">ℹ️</span>
            <span className="note-text">
              Les documents d'archive sont conservés pour une durée de 5 ans minimum
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const DetailRow = ({ label, value }) => (
  <div className="detail-row">
    <div className="detail-label">
      <strong>{label}:</strong>
    </div>
    <div className="detail-value">
      {typeof value === 'string' ? value : value}
    </div>
  </div>
);

export default ArchiveEmployeeModal;
