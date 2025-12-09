import React, { useState, useRef, useEffect } from 'react';
import './ArchiveModal.css';

const ArchiveModal = ({ 
  employee, 
  isOpen, 
  onClose, 
  onArchive, 
  departureDate: initialDepartureDate 
}) => {
  const [pdfUrl, setPdfUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [customDate, setCustomDate] = useState('');
  
  const fileInputRef = useRef(null);
  const dateInputRef = useRef(null);

  // Initialiser la date de départ
  useEffect(() => {
    if (initialDepartureDate) {
      const date = new Date(initialDepartureDate);
      if (!isNaN(date.getTime())) {
        const formattedDate = date.toISOString().split('T')[0];
        setDepartureDate(formattedDate);
        setCustomDate(formattedDate);
      }
    } else if (employee?.date_depart) {
      const date = new Date(employee.date_depart);
      if (!isNaN(date.getTime())) {
        const formattedDate = date.toISOString().split('T')[0];
        setDepartureDate(formattedDate);
        setCustomDate(formattedDate);
      }
    } else {
      // Date par défaut : aujourd'hui
      const today = new Date().toISOString().split('T')[0];
      setDepartureDate(today);
      setCustomDate(today);
    }
  }, [initialDepartureDate, employee]);

  const handleFileSelect = () => {
    if (isUploading) return;
    fileInputRef.current.click();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Vérifier que c'est un PDF
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

    const formData = new FormData();
    formData.append('pdfFile', file);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Non authentifié. Veuillez vous reconnecter.');
      }

      const backendUrl = 'https://backend-rh.azurewebsites.net';
      const uploadUrl = `${backendUrl}/api/archive/upload-pdf`;
      
      console.log('📤 Upload vers BACKEND:', uploadUrl);
      console.log('📄 Fichier:', file.name, 'Taille:', file.size);

      // Simuler la progression
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
        console.error('❌ Réponse non-JSON reçue:', text.substring(0, 500));
        
        if (response.ok) {
          try {
            const data = JSON.parse(text);
            if (data.pdfUrl) {
              setPdfUrl(data.pdfUrl);
              console.log('✅ Upload réussi:', data.pdfUrl);
            } else {
              throw new Error('Réponse JSON invalide');
            }
          } catch (parseError) {
            throw new Error(`Le serveur a retourné une réponse non-JSON. Statut: ${response.status}`);
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
        console.log('✅ Upload réussi:', data.pdfUrl);
      }

      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 500);

    } catch (error) {
      console.error('❌ Erreur upload complète:', error);
      
      let message = error.message;
      
      if (error.message.includes('Unexpected token') || error.message.includes('non-JSON')) {
        message = 'Problème de configuration serveur. Contactez l\'administrateur système.';
      } else if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
        message = 'Erreur de connexion au serveur. Vérifiez votre réseau.';
      } else if (error.message.includes('CORS')) {
        message = 'Erreur de sécurité CORS. L\'administrateur doit configurer le serveur.';
      }
      
      setErrorMessage(`❌ ${message}`);
      setIsUploading(false);
      setUploadProgress(0);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDateChange = (e) => {
    const newDate = e.target.value;
    setCustomDate(newDate);
    setDepartureDate(newDate);
  };

  const handleTodayClick = () => {
    const today = new Date().toISOString().split('T')[0];
    setCustomDate(today);
    setDepartureDate(today);
  };

  const handleOriginalDateClick = () => {
    if (initialDepartureDate) {
      const date = new Date(initialDepartureDate);
      const formattedDate = date.toISOString().split('T')[0];
      setCustomDate(formattedDate);
      setDepartureDate(formattedDate);
    } else if (employee?.date_depart) {
      const date = new Date(employee.date_depart);
      const formattedDate = date.toISOString().split('T')[0];
      setCustomDate(formattedDate);
      setDepartureDate(formattedDate);
    }
  };

  const handleSubmit = () => {
    if (!pdfUrl.trim()) {
      setErrorMessage('❌ Veuillez d\'abord télécharger le PDF d\'entretien');
      return;
    }

    if (!departureDate) {
      setErrorMessage('❌ Veuillez sélectionner une date de départ');
      return;
    }

    setErrorMessage('');
    
    // Envoyer le lien PDF et la date de départ au parent
    onArchive(pdfUrl, departureDate);
  };

  const handleClose = () => {
    setPdfUrl('');
    setIsUploading(false);
    setUploadProgress(0);
    setErrorMessage('');
    setUploadedFileName('');
    setDepartureDate('');
    setCustomDate('');
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    if (dateInputRef.current) {
      dateInputRef.current.value = '';
    }
    
    onClose();
  };

  const handleTestPdfLink = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  };

  const formatDisplayDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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
                <div className="info-item">
                  <span className="info-label">Département:</span>
                  <span className="info-value">{employee.site_dep || 'Non spécifié'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section Date de Départ */}
          <div className="date-section">
            <div className="section-header">
              <h4>
                <span className="section-icon">📅</span>
                Date de Départ
                <span className="required-indicator">* Obligatoire</span>
              </h4>
              <p className="section-description">
                Sélectionnez la date effective de départ de l'employé
              </p>
            </div>
            
            <div className="date-selection-container">
              <div className="date-input-group">
                <label htmlFor="departureDate">Date de départ:</label>
                <input
                  type="date"
                  id="departureDate"
                  ref={dateInputRef}
                  value={customDate}
                  onChange={handleDateChange}
                  className="date-input"
                  required
                />
              </div>
              
              <div className="date-quick-actions">
                <button 
                  type="button"
                  className="date-action-btn today-btn"
                  onClick={handleTodayClick}
                >
                  <span className="btn-icon">📅</span>
                  Aujourd'hui
                </button>
                
                {(initialDepartureDate || employee?.date_depart) && (
                  <button 
                    type="button"
                    className="date-action-btn original-btn"
                    onClick={handleOriginalDateClick}
                  >
                    <span className="btn-icon">↩️</span>
                    Date originale
                  </button>
                )}
              </div>
              
              {departureDate && (
                <div className="date-preview">
                  <span className="preview-label">Date sélectionnée:</span>
                  <span className="preview-value">{formatDisplayDate(departureDate)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Message d'erreur */}
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

          {/* Section Upload PDF */}
          <div className="pdf-upload-section">
            <div className="section-header">
              <h4>
                <span className="section-icon">📤</span>
                Télécharger le PDF d'entretien de départ
                <span className="required-indicator">* Obligatoire</span>
              </h4>
              <p className="section-description">
                Joignez le rapport d'entretien de départ au format PDF
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
                  <p className="progress-hint">
                    Ne fermez pas cette fenêtre pendant l'upload...
                  </p>
                </div>
              ) : pdfUrl ? (
                <div className="upload-success-container">
                  <div className="success-header">
                    <span className="success-icon">✅</span>
                    <span className="success-title">PDF téléchargé avec succès !</span>
                  </div>
                  <div className="success-file">
                    <span className="file-icon">📄</span>
                    <span className="file-name">{uploadedFileName}</span>
                  </div>
                  <div className="success-actions">
                    <button 
                      className="view-pdf-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTestPdfLink();
                      }}
                      type="button"
                    >
                      <span className="btn-icon">👁️</span>
                      Aperçu du PDF
                    </button>
                    <button 
                      className="change-file-btn"
                      onClick={(e) => {
                        e.stopPropagation();
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
              ) : (
                <>
                  <div className="upload-icon-container">
                    <span className="upload-main-icon">📄</span>
                    <div className="upload-icon-shadow"></div>
                  </div>
                  <div className="upload-text-container">
                    <p className="upload-main-text">Cliquez pour sélectionner un fichier</p>
                    <p className="upload-subtext">ou glissez-déposez votre fichier PDF ici</p>
                  </div>
                  <div className="upload-requirements">
                    <div className="requirement">
                      <span className="requirement-icon">✓</span>
                      <span className="requirement-text">Format PDF uniquement</span>
                    </div>
                    <div className="requirement">
                      <span className="requirement-icon">✓</span>
                      <span className="requirement-text">Max 50MB</span>
                    </div>
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
        </div>

        <div className="archive-modal-footer">
          <div className="footer-actions">
            <button 
              className="archive-confirm-btn"
              onClick={handleSubmit}
              disabled={!pdfUrl || !departureDate || isUploading}
              title={!pdfUrl ? "Téléchargez d'abord le PDF" : !departureDate ? "Sélectionnez une date de départ" : "Archiver l'employé"}
            >
              {isUploading ? (
                <>
                  <span className="loading-spinner"></span>
                  <span className="btn-text">Traitement en cours...</span>
                </>
              ) : (
                <>
                  <span className="btn-icon">💾</span>
                  <span className="btn-text">
                    Archiver {employee.prenom} {employee.nom}
                  </span>
                </>
              )}
            </button>
            <button 
              className="archive-cancel-btn"
              onClick={handleClose}
              disabled={isUploading}
              title="Annuler l'archivage"
            >
              <span className="btn-icon">❌</span>
              <span className="btn-text">Annuler</span>
            </button>
          </div>
          <div className="footer-note">
            <span className="note-icon">ℹ️</span>
            <span className="note-text">
              L'employé sera archivé avec la date sélectionnée et deviendra inaccessible depuis la liste active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArchiveModal;
