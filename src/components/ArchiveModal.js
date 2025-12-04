import React, { useState, useRef } from 'react';
import './ArchiveModal.css';

const ArchiveModal = ({ employee, isOpen, onClose, onArchive }) => {
  const [pdfUrl, setPdfUrl] = useState('');
  const [isUrlValid, setIsUrlValid] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef(null);

  const validateUrl = (url) => {
    if (!url) return false;
    
    try {
      new URL(url);
      // Vérifier si c'est un PDF
      const lowerUrl = url.toLowerCase();
      const isPdf = lowerUrl.endsWith('.pdf') || 
                   lowerUrl.includes('.pdf?') || 
                   lowerUrl.includes('/pdf') ||
                   lowerUrl.includes('application/pdf');
      return isPdf;
    } catch {
      return false;
    }
  };

  const handlePdfUrlChange = (e) => {
    const url = e.target.value;
    setPdfUrl(url);
    setIsUrlValid(validateUrl(url));
    setErrorMessage('');
  };

  const handleTestPdfLink = () => {
    if (pdfUrl && isUrlValid) {
      window.open(pdfUrl, '_blank');
    }
  };

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

    const formData = new FormData();
    formData.append('pdfFile', file);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Non authentifié. Veuillez vous reconnecter.');
      }

      // URL absolue pour l'API
      const apiUrl = process.env.REACT_APP_API_URL || '';
      const uploadUrl = `${apiUrl}/api/archive/upload-pdf`;
      
      console.log('📤 Upload vers:', uploadUrl);

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
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 secondes timeout

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // NE PAS mettre Content-Type pour FormData, le navigateur le fera automatiquement
        },
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      clearInterval(progressInterval);
      setUploadProgress(100);

      // Vérifier le type de contenu
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        // Essayer de lire le texte de la réponse pour déboguer
        const text = await response.text();
        console.error('❌ Réponse non-JSON reçue:', text.substring(0, 500));
        
        if (text.includes('<!doctype') || text.includes('<html')) {
          throw new Error('Le serveur a retourné une page HTML. Vérifiez l\'URL de l\'API.');
        }
        
        throw new Error(`Réponse invalide du serveur (${response.status}): ${text.substring(0, 100)}`);
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || `Erreur ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Échec de l\'upload');
      }

      // Mettre à jour l'URL avec le PDF uploadé
      setPdfUrl(data.pdfUrl);
      setIsUrlValid(true);
      
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 500);

      console.log('✅ Upload réussi:', data.pdfUrl);

    } catch (error) {
      console.error('❌ Erreur upload:', error);
      
      let message = error.message;
      
      if (error.name === 'AbortError') {
        message = 'Upload annulé (timeout)';
      } else if (error.message.includes('NetworkError')) {
        message = 'Erreur réseau. Vérifiez votre connexion.';
      } else if (error.message.includes('HTML')) {
        message = 'Configuration serveur incorrecte. Contactez l\'administrateur.';
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
      setErrorMessage('❌ Veuillez ajouter le PDF de l\'entretien de départ');
      return;
    }

    if (!isUrlValid) {
      setErrorMessage('❌ Veuillez entrer une URL valide vers un fichier PDF');
      return;
    }

    setErrorMessage('');
    // Envoyer seulement le lien PDF
    onArchive(pdfUrl);
    setPdfUrl('');
  };

  const handleClose = () => {
    setPdfUrl('');
    setIsUrlValid(true);
    setIsUploading(false);
    setUploadProgress(0);
    setErrorMessage('');
    onClose();
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
              <p>{employee.poste} - {employee.matricule}</p>
              <p className="departure-date">
                Date de départ: {new Date().toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>

          {/* Message d'erreur */}
          {errorMessage && (
            <div className="error-alert">
              <p>{errorMessage}</p>
              <button className="close-error-btn" onClick={() => setErrorMessage('')}>×</button>
            </div>
          )}

          {/* Section Upload PDF */}
          <div className="pdf-upload-section">
            <h4>📤 Télécharger le PDF d'entretien *</h4>
            <div className={`upload-area ${isUploading ? 'uploading' : ''}`} onClick={handleFileSelect}>
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
                    Upload en cours... {uploadProgress}%
                  </p>
                </div>
              ) : (
                <>
                  <div className="upload-icon">📄</div>
                  <p className="upload-text">Cliquez pour sélectionner un fichier PDF</p>
                  <p className="upload-hint">Format: PDF • Max: 50MB</p>
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

          {/* Séparateur OU */}
          <div className="or-separator">
            <span>OU</span>
          </div>

          {/* Section Lien PDF */}
          <div className="pdf-url-section">
            <h4>🔗 Entrer un lien existant</h4>
            <div className="url-input-group">
              <input
                type="url"
                value={pdfUrl}
                onChange={handlePdfUrlChange}
                placeholder="https://exemple.com/entretien-depart.pdf"
                className={`url-input ${!isUrlValid && pdfUrl ? 'error' : ''}`}
                disabled={isUploading}
              />
              {pdfUrl && isUrlValid && (
                <button 
                  type="button"
                  className="test-link-btn"
                  onClick={handleTestPdfLink}
                  disabled={isUploading}
                >
                  🔗 Tester
                </button>
              )}
            </div>
            {!isUrlValid && pdfUrl && (
              <p className="error-message">
                ❌ Veuillez entrer une URL valide vers un fichier PDF
              </p>
            )}
          </div>

          {/* Aperçu du lien PDF */}
          {pdfUrl && isUrlValid && (
            <div className="pdf-preview">
              <h4>✅ PDF Prêt</h4>
              <div className="pdf-link-preview">
                <a 
                  href={pdfUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="pdf-preview-link"
                >
                  <span className="pdf-icon">📄</span>
                  <span className="pdf-url-text">
                    {pdfUrl.length > 50 ? pdfUrl.substring(0, 50) + '...' : pdfUrl}
                  </span>
                </a>
                <button 
                  className="preview-test-btn"
                  onClick={handleTestPdfLink}
                  disabled={isUploading}
                >
                  Ouvrir
                </button>
              </div>
            </div>
          )}

          <div className="warning-message">
            <p><strong>⚠️ Attention:</strong> Après archivage, l'employé sera déplacé vers la liste des archives. Cette action est irréversible.</p>
          </div>
        </div>

        <div className="archive-modal-footer">
          <button 
            className="archive-confirm-btn"
            onClick={handleSubmit}
            disabled={!pdfUrl.trim() || !isUrlValid || isUploading}
          >
            {isUploading ? (
              <>
                <span className="loading-spinner-small"></span>
                Upload en cours...
              </>
            ) : (
              '💾 Archiver l\'Employé'
            )}
          </button>
          <button 
            className="archive-cancel-btn"
            onClick={handleClose}
            disabled={isUploading}
          >
            ❌ Annuler
          </button>
        </div>
      </div>
    </div>
  );
};

export default ArchiveModal;
