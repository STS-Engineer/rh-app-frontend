import React, { useState, useRef } from 'react';
import './ArchiveModal.css';

const ArchiveModal = ({ employee, isOpen, onClose, onArchive }) => {
  const [pdfUrl, setPdfUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const fileInputRef = useRef(null);

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

    if (file.size > 50 * 1024 * 1024) { // 50MB max
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

      // URL absolue pour l'API
      const apiUrl = process.env.REACT_APP_API_URL || window.location.origin;
      const uploadUrl = `${apiUrl}/api/archive/upload-pdf`;
      
      console.log('📤 Upload vers:', uploadUrl, 'Fichier:', file.name, 'Taille:', file.size);

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

      // Configuration de la requête
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes timeout

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      clearInterval(progressInterval);
      setUploadProgress(100);

      // Vérifier le statut de la réponse
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erreur serveur:', response.status, errorText);
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      // Parser la réponse JSON
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Échec de l\'upload');
      }

      // Mettre à jour l'URL avec le PDF uploadé
      setPdfUrl(data.pdfUrl);
      
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 500);

      console.log('✅ Upload réussi:', data);

    } catch (error) {
      console.error('❌ Erreur upload:', error);
      
      let message = error.message;
      
      if (error.name === 'AbortError') {
        message = 'Upload annulé (délai dépassé)';
      } else if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
        message = 'Erreur réseau. Vérifiez votre connexion et réessayez.';
      }
      
      setErrorMessage(`❌ ${message}`);
      setIsUploading(false);
      setUploadProgress(0);
      
      // Réinitialiser le champ fichier
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = () => {
    if (!pdfUrl.trim()) {
      setErrorMessage('❌ Veuillez d\'abord télécharger le PDF d\'entretien');
      return;
    }

    setErrorMessage('');
    // Envoyer le lien PDF au parent
    onArchive(pdfUrl);
  };

  const handleClose = () => {
    // Réinitialiser tout
    setPdfUrl('');
    setIsUploading(false);
    setUploadProgress(0);
    setErrorMessage('');
    setUploadedFileName('');
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
          <h2>📁 Archiver l'Employé</h2>
          <button className="close-btn" onClick={handleClose} disabled={isUploading}>×</button>
        </div>

        <div className="archive-modal-body">
          <div className="employee-info">
            <img 
              src={employee.photo || `https://ui-avatars.com/api/?name=${employee.prenom}+${employee.nom}&background=3498db&color=fff&size=150`}
              alt={`${employee.prenom} ${employee.nom}`}
              className="employee-photo"
            />
            <div className="employee-details">
              <h3>{employee.prenom} {employee.nom}</h3>
              <p><strong>Matricule:</strong> {employee.matricule}</p>
              <p><strong>Poste:</strong> {employee.poste}</p>
              <p className="departure-date">
                Date de départ: {new Date().toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>

          {/* Message d'erreur */}
          {errorMessage && (
            <div className="error-alert">
              <div className="error-content">
                <span className="error-icon">⚠️</span>
                <p>{errorMessage}</p>
              </div>
              <button className="close-error-btn" onClick={() => setErrorMessage('')}>×</button>
            </div>
          )}

          {/* Section Upload PDF */}
          <div className="pdf-upload-section">
            <h4>
              <span className="upload-icon-title">📤</span>
              Télécharger le PDF d'entretien de départ
              <span className="required-star">*</span>
            </h4>
            
            <div 
              className={`upload-area ${isUploading ? 'uploading' : ''} ${pdfUrl ? 'success' : ''}`}
              onClick={handleFileSelect}
            >
              {isUploading ? (
                <div className="upload-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <p className="progress-text">
                    <span className="loading-spinner"></span>
                    Envoi en cours... {uploadProgress}%
                  </p>
                  {uploadedFileName && (
                    <p className="file-name">Fichier: {uploadedFileName}</p>
                  )}
                </div>
              ) : pdfUrl ? (
                <div className="upload-success">
                  <div className="success-icon">✅</div>
                  <p className="success-text">PDF téléchargé avec succès !</p>
                  {uploadedFileName && (
                    <p className="file-name">{uploadedFileName}</p>
                  )}
                  <button 
                    className="view-pdf-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTestPdfLink();
                    }}
                  >
                    📄 Voir le PDF
                  </button>
                </div>
              ) : (
                <>
                  <div className="upload-icon">📄</div>
                  <p className="upload-text">Cliquez pour sélectionner un fichier PDF</p>
                  <p className="upload-hint">Format: PDF • Maximum: 50MB</p>
                  <div className="upload-instructions">
                    <p>📝 <strong>Instructions:</strong></p>
                    <ul>
                      <li>Sélectionnez le rapport d'entretien de départ</li>
                      <li>Assurez-vous que c'est un fichier PDF</li>
                      <li>Le fichier sera stocké sur notre serveur</li>
                    </ul>
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
            
            <div className="upload-note">
              <p>💡 <strong>Note:</strong> Ce document sera joint au dossier de l'employé dans les archives.</p>
            </div>
          </div>

          <div className="warning-message">
            <div className="warning-icon">⚠️</div>
            <div className="warning-content">
              <p><strong>Attention:</strong> Après archivage :</p>
              <ul>
                <li>L'employé sera déplacé vers la liste des archives</li>
                <li>Il ne sera plus visible dans les employés actifs</li>
                <li>Cette action est <strong>irréversible</strong></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="archive-modal-footer">
          <button 
            className="archive-confirm-btn"
            onClick={handleSubmit}
            disabled={!pdfUrl || isUploading}
          >
            {isUploading ? (
              <>
                <span className="loading-spinner-small"></span>
                Traitement en cours...
              </>
            ) : (
              <>
                <span className="confirm-icon">💾</span>
                Archiver l'Employé
              </>
            )}
          </button>
          <button 
            className="archive-cancel-btn"
            onClick={handleClose}
            disabled={isUploading}
          >
            <span className="cancel-icon">❌</span>
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
};

export default ArchiveModal;
