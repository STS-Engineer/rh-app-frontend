import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { formatEmployeeNom, formatEmployeePrenom } from '../utils/employeeAvatar';
import './ArchiveEmployeeModal.css';

const ArchiveEmployeeModal = ({ employee, isOpen, onClose }) => {
  const { t } = useLanguage();
  const [pdfLoading, setPdfLoading] = useState(false);
  
  if (!isOpen || !employee) return null;

  const formatDate = (dateString) => {
    if (!dateString) return t('notSpecified');
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString({
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
    if (!url) return t('documentPDF');
    
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = pathname.split('/').pop();
      
      if (filename && filename.includes('.pdf')) {
        let cleanName = filename
          .replace(/^archive-/, '')
          .replace(/-\d+-\d+\.pdf$/, '.pdf')
          .replace(/^dossier-/, '')
          .replace(/-\d+\.pdf$/, '.pdf');
        
        return decodeURIComponent(cleanName);
      }
      
      return `${t('document')} - ${urlObj.hostname}`;
    } catch {
      return t('documentPDF');
    }
  };

  const truncateUrl = (url, maxLength = 50) => {
    if (!url) return '';
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + '...';
  };

  const handleViewEntretien = async (e) => {
    e.preventDefault();
    
    const pdfUrl = employee.pdf_archive_url || employee.entretien_depart;
    
    if (!pdfUrl) {
      alert('❌ ' + t('noDocumentAvailable'));
      return;
    }

    if (!isValidUrl(pdfUrl)) {
      alert('❌ ' + t('invalidURL'));
      return;
    }

    setPdfLoading(true);
    
    try {
      const newWindow = window.open(pdfUrl, '_blank');
      
      if (!newWindow || newWindow.closed) {
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
    } catch (error) {
      console.error(t('pdfOpenError'), error);
      alert('❌ ' + t('cannotOpenDocument'));
    } finally {
      setPdfLoading(false);
    }
  };

  const handleViewDossierRH = (e) => {
    e.preventDefault();
    
    if (!employee.dossier_rh) {
      alert('❌ ' + t('noHRDossierAvailable'));
      return;
    }

    if (!isValidUrl(employee.dossier_rh)) {
      alert('❌ ' + t('invalidURL'));
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
    
    if (url.includes('/api/archive-pdfs/') || url.includes('/api/pdfs/')) {
      return '📄 ' + t('documentStoredOnServer');
    }
    
    try {
      const urlObj = new URL(url);
      return `🔗 ${t('externalLink')}: ${urlObj.hostname}`;
    } catch {
      return '📄 ' + t('documentPDF');
    }
  };

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
              {t('archiveDetails')}
            </h2>
            <div className="archive-badge">
              <span className="badge-icon">📋</span>
              <span className="badge-text">{t('archived').toUpperCase()}</span>
            </div>
          </div>
          <button className="close-btn" onClick={onClose} title={t('close')}>×</button>
        </div>

        <div className="archive-employee-modal-body">
          <div className="employee-header">
            <img 
              src={getPhotoUrl()} 
              alt={`${formatEmployeePrenom(employee.prenom)} ${formatEmployeeNom(employee.nom)}`}
              className="employee-photo"
              onError={(e) => {
                e.target.src = getDefaultAvatar();
              }}
            />
            <div className="employee-basic-info">
              <h3>{formatEmployeePrenom(employee.prenom)} {formatEmployeeNom(employee.nom)}</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">{t('employee_ID')}</span>
                  <span className="info-value">{employee.matricule}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">{t('position')}</span>
                  <span className="info-value">{employee.poste}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">{t('department')}</span>
                  <span className="info-value">{employee.site_dep}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">{t('contractType')}</span>
                  <span className="info-value">{employee.type_contrat}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="employee-details-grid">
            <div className="detail-section">
              <h4>
                <span className="section-icon">📝</span>
                {t('personalInfo')}
              </h4>
              <DetailRow label={t('idNumber')} value={employee.cin} />
              <DetailRow label={t('passport')} value={employee.passeport || t('notSpecified')} />
              <DetailRow label={t('birthDate')} value={formatDate(employee.date_naissance)} />
            </div>

            <div className="detail-section">
              <h4>
                <span className="section-icon">💼</span>
                {t('career')}
              </h4>
              <DetailRow label={t('hireDate')} value={formatDate(employee.date_debut)} />
              <DetailRow label={t('grossSalary')} value={`${employee.salaire_brute || 0} DT`} />
              <DetailRow 
                label={t('departureDate')} 
                value={
                  <span className="departure-date">
                    {formatDate(employee.date_depart)}
                    {employee.date_depart && (
                      <span className="departure-days">
                        ({Math.floor((new Date() - new Date(employee.date_depart)) / (1000 * 60 * 60 * 24))} {t('days')})
                      </span>
                    )}
                  </span>
                } 
              />
            </div>

            <div className="detail-section documents-section">
              <h4>
                <span className="section-icon">📎</span>
                {t('archiveDocuments')}
              </h4>
              
              {hasArchivePdf && (
                <div className="document-card main-document">
                  <div className="document-header">
                    <span className="document-icon">📁</span>
                    <div className="document-info">
                      <h5 className="document-title">{t('departureInterview')}</h5>
                      <p className="document-subtitle">{t('mainArchiveDocument')}</p>
                    </div>
                  </div>
                  <div className="document-details">
                    <div className="document-url">
                      <span className="url-label">{t('url')}:</span>
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
                        {t('opening')}...
                      </>
                    ) : (
                      <>
                        <span className="btn-icon">👁️</span>
                        {t('openPDF')}
                      </>
                    )}
                  </button>
                </div>
              )}

              {!hasArchivePdf && hasEntretienDep && (
                <div className="document-card legacy-document">
                  <div className="document-header">
                    <span className="document-icon">📄</span>
                    <div className="document-info">
                      <h5 className="document-title">{t('departureInterview')} ({t('legacy')})</h5>
                      <p className="document-subtitle">{t('legacyFormat')}</p>
                    </div>
                  </div>
                  <div className="document-details">
                    <div className="document-url">
                      <span className="url-label">{t('link')}:</span>
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
                    {t('openLink')}
                  </button>
                </div>
              )}

              {hasDossierRH && (
                <div className="document-card dossier-card">
                  <div className="document-header">
                    <span className="document-icon">📋</span>
                    <div className="document-info">
                      <h5 className="document-title">{t('completeHRFile')}</h5>
                      <p className="document-subtitle">{t('hrDossier')}</p>
                    </div>
                  </div>
                  <button
                    className="view-document-btn tertiary"
                    onClick={handleViewDossierRH}
                  >
                    <span className="btn-icon">📋</span>
                    {t('consultDossier')}
                  </button>
                </div>
              )}

              {!hasArchivePdf && !hasEntretienDep && !hasDossierRH && (
                <div className="no-documents">
                  <div className="no-docs-icon">📭</div>
                  <p className="no-docs-text">{t('noDocumentsAvailable')}</p>
                  <p className="no-docs-subtext">
                    {t('archivedWithoutDocument')}
                  </p>
                </div>
              )}
            </div>

            <div className="detail-section archive-info">
              <h4>
                <span className="section-icon">⏱️</span>
                {t('archiveInfo')}
              </h4>
              <DetailRow 
                label={t('status')} 
                value={
                  <span className={`status-badge ${employee.statut || 'archive'}`}>
                    {employee.statut === 'archive' ? t('archived').toUpperCase() : employee.statut?.toUpperCase() || t('archived').toUpperCase()}
                  </span>
                } 
              />
              {employee.updated_at && (
                <DetailRow 
                  label={t('lastUpdate')} 
                  value={formatDateTime(employee.updated_at)} 
                />
              )}
              {employee.created_at && (
                <DetailRow 
                  label={t('creationDate')} 
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
              title={t('printDetails')}
            >
              <span className="btn-icon">🖨️</span>
              {t('print')}
            </button>
            <button 
              className="close-modal-btn"
              onClick={onClose}
            >
              <span className="btn-icon">←</span>
              {t('backToList')}
            </button>
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
