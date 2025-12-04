import React, { useState, useRef } from 'react';
import './ArchiveModal.css';

const ArchiveModal = ({ employee, isOpen, onClose, onArchive }) => {
  const [pdfUrl, setPdfUrl] = useState('');
  const [isUrlValid, setIsUrlValid] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
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
  };

  const handleTestPdfLink = () => {
    if (pdfUrl && isUrlValid) {
      window.open(pdfUrl, '_blank');
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current.click();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Vérifier que c'est un PDF
    if (file.type !== 'application/pdf') {
      alert('❌ Veuillez sélectionner un fichier PDF');
      return;
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB max
      alert('❌ Le fichier est trop volumineux (max 50MB)');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('pdfFile', file);

    try {
      const token = localStorage.getItem('token');
      
      // Simuler la progression
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      const response = await fetch('/api/archive/upload-pdf', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      clearInterval(interval);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de l\'upload');
      }

      const data = await response.json();
      setUploadProgress(100);
      
      // Mettre à jour l'URL avec le PDF uploadé
      setPdfUrl(data.pdfUrl);
      setIsUrlValid(true);
      
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 500);

    } catch (error) {
      console.error('❌ Erreur upload:', error);
      alert(`❌ Erreur: ${error.message}`);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSubmit = () => {
    if (!pdfUrl.trim()) {
      alert('❌ Veuillez ajouter le PDF de l\'entretien de départ');
      return;
    }

    if (!isUrlValid) {
      alert('❌ Veuillez entrer une URL valide vers un fichier PDF');
      return;
    }

    // Envoyer seulement le lien PDF
    onArchive(pdfUrl);
    setPdfUrl('');
  };

  const handleClose = () => {
    setPdfUrl('');
    setIsUrlValid(true);
    setIsUploading(false);
    setUploadProgress(0);
    onClose();
  };

  if (!isOpen || !employee) return null;

  return (
    <div className="archive-modal-overlay" onClick={handleClose}>
      <div className="archive-modal-content" onClick={e => e.stopPropagation()}>
        <div className="archive-modal-header">
          <h2>📁 Archiver l'Employé</h2>
          <button className="close-btn" onClick={handleClose}>×</button>
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

          {/* Section Upload PDF - Alternative moderne */}
          <div className="pdf-upload-section">
            <h4>📤 Télécharger le PDF d'entretien *</h4>
            <div className="upload-area" onClick={handleFileSelect}>
              {isUploading ? (
                <div className="upload-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <p>Upload en cours... {uploadProgress}%</p>
                </div>
              ) : (
                <>
                  <div className="upload-icon">📄</div>
                  <p>Cliquez pour sélectionner un fichier PDF</p>
                  <p className="upload-hint">Format: PDF • Max: 50MB</p>
                </>
              )}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".pdf,application/pdf"
                style={{ display: 'none' }}
              />
            </div>
          </div>

          {/* OU Section Lien PDF */}
          <div className="pdf-url-section">
            <h4>🔗 OU entrer un lien existant</h4>
            <div className="url-input-group">
              <input
                type="url"
                value={pdfUrl}
                onChange={handlePdfUrlChange}
                placeholder="https://exemple.com/entretien-depart.pdf"
                className={`url-input ${!isUrlValid && pdfUrl ? 'error' : ''}`}
              />
              {pdfUrl && isUrlValid && (
                <button 
                  type="button"
                  className="test-link-btn"
                  onClick={handleTestPdfLink}
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
                  📄 {pdfUrl.length > 50 ? pdfUrl.substring(0, 50) + '...' : pdfUrl}
                </a>
                <button 
                  className="preview-test-btn"
                  onClick={handleTestPdfLink}
                >
                  Ouvrir
                </button>
              </div>
            </div>
          )}

          <div className="warning-message">
            <p><strong>Attention:</strong> Après archivage, l'employé sera déplacé vers la liste des archives. Cette action est irréversible.</p>
          </div>
        </div>

        <div className="archive-modal-footer">
          <button 
            className="archive-confirm-btn"
            onClick={handleSubmit}
            disabled={!pdfUrl.trim() || !isUrlValid || isUploading}
          >
            {isUploading ? '📤 Upload en cours...' : '💾 Archiver l\'Employé'}
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
