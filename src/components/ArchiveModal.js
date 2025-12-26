import React, { useState, useRef } from 'react';
import './ArchiveModal.css';

const ArchiveModal = ({ employee, isOpen, onClose, onArchive, departureDate }) => {
  const [pdfUrl, setPdfUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [archiveWithoutPdf, setArchiveWithoutPdf] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const fileInputRef = useRef(null);

  const rawDate = departureDate || employee?.date_depart || null;
  let finalDepartureDate = null;
  if (rawDate) {
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      finalDepartureDate = d;
    }
  }

  const handleFileSelect = () => {
    if (isUploading) return;
    fileInputRef.current.click();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setErrorMessage('❌ Veuillez sélectionner un fichier PDF');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setErrorMessage('❌ Le fichier est trop volumineux (max 50MB)');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setErrorMessage('');
    setUploadedFileName(file.name);
    setArchiveWithoutPdf(false); // Désactiver l'option sans PDF si on upload

    const formData = new FormData();
    formData.append('pdfFile', file);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Non authentifié. Veuillez vous reconnecter.');
      }

      const backendUrl = 'https://backend-rh.azurewebsites.net';
      const uploadUrl = `${backendUrl}/api/archive/upload-pdf`;
      
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const contentType = response.headers.get('content-type');
      
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('❌ Réponse non-JSON:', text.substring(0, 500));
        
        if (response.ok) {
          try {
            const data = JSON.parse(text);
            if (data.pdfUrl) {
              setPdfUrl(data.pdfUrl);
            } else {
              throw new Error('Réponse JSON invalide');
            }
          } catch (parseError) {
            throw new Error(`Erreur serveur: ${response.status}`);
          }
        } else {
          throw new Error(`Erreur serveur (${response.status}): ${text.substring(0, 200)}`);
        }
      } else {
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || data.message || `Erreur ${response.status}`);
        }
        
        if (!data.success) {
          throw new Error(data.error || 'Échec de l\'upload');
        }

        setPdfUrl(data.pdfUrl);
      }

      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 500);

    } catch (error) {
      console.error('❌ Erreur upload:', error);
      
      let message = error.message;
      
      if (error.message.includes('Unexpected token') || error.message.includes('non-JSON')) {
        message = 'Problème de configuration serveur';
      } else if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
        message = 'Erreur de connexion au serveur';
      }
      
      setErrorMessage(`❌ ${message}`);
      setIsUploading(false);
      setUploadProgress(0);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleArchiveWithoutPdf = () => {
    setArchiveWithoutPdf(true);
    setPdfUrl(''); // Réinitialiser le PDF
    setUploadedFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCancelWithoutPdf = () => {
    setArchiveWithoutPdf(false);
    setConfirmationText('');
  };

  const handleSubmit = () => {
    if (archiveWithoutPdf) {
      // Validation pour archivage sans PDF
      if (confirmationText !== employee.matricule) {
        setErrorMessage(`❌ Veuillez saisir le matricule "${employee.matricule}" pour confirmer`);
        return;
      }
      
      const archiveData = {
        pdf_url: null, // Pas de PDF
        entretien_depart: 'Archivé sans entretien PDF',
        date_depart: departureDate
      };
      
      onArchive(null, archiveData);
    } else {
      // Archivage avec PDF
      if (!pdfUrl.trim()) {
        setErrorMessage('❌ Veuillez d\'abord télécharger le PDF d\'entretien');
        return;
      }

      const archiveData = {
        pdf_url: pdfUrl,
        entretien_depart: 'Entretien de départ archivé',
        date_depart: departureDate
      };

      onArchive(pdfUrl, archiveData);
    }
  };

  const handleClose = () => {
    setPdfUrl('');
    setIsUploading(false);
    setUploadProgress(0);
    setErrorMessage('');
    setUploadedFileName('');
    setArchiveWithoutPdf(false);
    setConfirmationText('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  const handleTestPdfLink = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  };

  if (!isOpen || !employee) return null;

  return (
    <div className="archive-modal-overlay" onClick={handleClose}>
      <div className="archive-modal-content" onClick={e => e.stopPropagation()}>
        <div className="archive-modal-header">
          <h2>
            <span className="header-icon">📁</span>
            Archiver l'Employé
          </h2>
          <button 
            className="close-btn" 
            onClick={handleClose} 
            disabled={isUploading}
            title="Fermer"
          >
            ×
          </button>
        </div>

        <div className="archive-modal-body">
          <div className="employee-info">
            <img 
              src={employee.photo || `https://ui-avatars.com/api/?name=${employee.prenom}+${employee.nom}&background=3b82f6&color=fff&size=150`}
              alt={`${employee.prenom} ${employee.nom}`}
              className="employee-photo"
              onError={(e) => {
                e.target.src = `https://ui-avatars.com/api/?name=${employee.prenom}+${employee.nom}&background=3b82f6&color=fff&size=150`;
              }}
            />
            <div className="employee-details">
              <h3>{employee.prenom} {employee.nom}</h3>
              <div className="employee-info-grid">
                <div className="info-item">
                  <span className="info-label">Matricule:</span>
                  <span className="info-value">{employee.matricule}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Poste:</span>
                  <span className="info-value">{employee.poste || 'Non spécifié'}</span>
                </div>
              </div>
              <div className="departure-date">
                <span className="date-icon">📅</span>
                Date de départ:&nbsp;
                {finalDepartureDate
                  ? finalDepartureDate.toLocaleDateString("fr-FR", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric"
                    })
                  : "Non définie"}
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="error-alert">
              <div className="error-content">
                <span className="error-icon">⚠️</span>
                <div className="error-text">
                  <p className="error-title">Erreur</p>
                  <p className="error-message-text">{errorMessage}</p>
                </div>
              </div>
              <button 
                className="close-error-btn" 
                onClick={() => setErrorMessage('')}
                title="Fermer"
              >
                ×
              </button>
            </div>
          )}

          {/* Section Archivage sans PDF */}
          {!pdfUrl && !isUploading && (
            <div className="archive-options">
              <div className="option-card without-pdf-option">
                <div className="option-header">
                  <h4>
                    <span className="option-icon">📄</span>
                    Option 1 : Archiver avec un PDF
                  </h4>
                  <p className="option-description">
                    Téléchargez le rapport d'entretien de départ (recommandé)
                  </p>
                </div>
                
                <div 
                  className={`upload-area ${isUploading ? 'uploading' : ''} ${pdfUrl ? 'success' : ''}`}
                  onClick={handleFileSelect}
                >
                  {isUploading ? (
                    <div className="upload-progress-container">
                      <div className="progress-header">
                        <span className="progress-icon">⏳</span>
                        <span className="progress-title">Envoi en cours</span>
                      </div>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill" 
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                      <div className="progress-info">
                        <span className="progress-percentage">{uploadProgress}%</span>
                        <span className="progress-file">
                          <span className="file-icon">📄</span>
                          {uploadedFileName}
                        </span>
                      </div>
                    </div>
                  ) : pdfUrl ? (
                    <div className="upload-success-container">
                      <div className="success-header">
                        <span className="success-icon">✅</span>
                        <span className="success-title">PDF téléchargé !</span>
                      </div>
                      <div className="success-file">
                        <span className="file-icon">📄</span>
                        <span className="file-name">{uploadedFileName}</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="upload-icon-container">
                        <span className="upload-main-icon">📄</span>
                      </div>
                      <div className="upload-text-container">
                        <p className="upload-main-text">Cliquez pour sélectionner un PDF</p>
                        <p className="upload-subtext">Glissez-déposez ou cliquez</p>
                      </div>
                    </>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".pdf,application/pdf"
                    style={{ display: 'none' }}
                    disabled={isUploading}
                  />
                </div>
              </div>

              <div className="option-divider">
                <span className="divider-text">OU</span>
              </div>

              <div className="option-card without-pdf-option">
                <div className="option-header">
                  <h4>
                    <span className="option-icon">⚡</span>
                    Option 2 : Archiver sans PDF
                  </h4>
                  <p className="option-description warning-text">
                    ⚠️ Attention : Aucun document ne sera associé à cet archivage
                  </p>
                </div>
                
                {!archiveWithoutPdf ? (
                  <button 
                    className="archive-without-pdf-btn"
                    onClick={handleArchiveWithoutPdf}
                    disabled={isUploading}
                  >
                    <span className="btn-icon">⚡</span>
                    Archiver sans document PDF
                  </button>
                ) : (
                  <div className="confirmation-section">
                    <div className="warning-alert">
                      <span className="warning-icon">⚠️</span>
                      <div className="warning-text">
                        <h5>Confirmation requise</h5>
                        <p>Vous êtes sur le point d'archiver sans document. Cette action est irréversible.</p>
                      </div>
                    </div>
                    
                    <div className="confirmation-input">
                      <label>
                        Tapez le matricule "<strong>{employee.matricule}</strong>" pour confirmer :
                      </label>
                      <input
                        type="text"
                        value={confirmationText}
                        onChange={(e) => setConfirmationText(e.target.value)}
                        placeholder={`Saisir "${employee.matricule}"`}
                        className="confirmation-field"
                      />
                    </div>
                    
                    <div className="confirmation-actions">
                      <button 
                        className="confirm-without-pdf-btn"
                        onClick={handleSubmit}
                        disabled={confirmationText !== employee.matricule}
                      >
                        <span className="btn-icon">✅</span>
                        Confirmer l'archivage sans PDF
                      </button>
                      <button 
                        className="cancel-without-pdf-btn"
                        onClick={handleCancelWithoutPdf}
                      >
                        <span className="btn-icon">↩️</span>
                        Retour
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Afficher si PDF uploadé */}
          {pdfUrl && (
            <div className="pdf-success-section">
              <div className="success-card">
                <div className="success-header">
                  <span className="success-icon">✅</span>
                  <h4>PDF prêt pour l'archivage</h4>
                </div>
                <div className="success-details">
                  <div className="file-info">
                    <span className="file-icon">📄</span>
                    <span className="file-name">{uploadedFileName}</span>
                  </div>
                  <button 
                    className="view-pdf-btn"
                    onClick={handleTestPdfLink}
                    type="button"
                  >
                    <span className="btn-icon">👁️</span>
                    Vérifier le PDF
                  </button>
                  <button 
                    className="change-file-btn"
                    onClick={() => {
                      setPdfUrl('');
                      setUploadedFileName('');
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    type="button"
                  >
                    <span className="btn-icon">🔄</span>
                    Changer le fichier
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="archive-modal-footer">
          <div className="footer-actions">
            {(pdfUrl || archiveWithoutPdf) && (
              <button 
                className="archive-confirm-btn"
                onClick={handleSubmit}
                disabled={archiveWithoutPdf && confirmationText !== employee.matricule}
                title={pdfUrl ? "Archiver avec PDF" : "Archiver sans PDF"}
              >
                {isUploading ? (
                  <>
                    <span className="loading-spinner"></span>
                    <span className="btn-text">Traitement...</span>
                  </>
                ) : (
                  <>
                    <span className="btn-icon">💾</span>
                    <span className="btn-text">
                      {pdfUrl ? 'Archiver avec PDF' : 'Archiver sans PDF'}
                    </span>
                  </>
                )}
              </button>
            )}
            <button 
              className="archive-cancel-btn"
              onClick={handleClose}
              disabled={isUploading}
              title="Annuler"
            >
              <span className="btn-icon">❌</span>
              <span className="btn-text">Annuler</span>
            </button>
          </div>
          <div className="footer-note">
            <span className="note-icon">ℹ️</span>
            <span className="note-text">
              {pdfUrl 
                ? 'L\'archivage avec PDF est recommandé pour garder une trace.'
                : 'L\'archivage sans PDF ne conserve aucun document.'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArchiveModal;
