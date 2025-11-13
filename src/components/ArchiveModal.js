import React, { useState } from 'react';
import './ArchiveModal.css';

const ArchiveModal = ({ employee, isOpen, onClose, onArchive }) => {
  const [pdfUrl, setPdfUrl] = useState('');
  const [isUrlValid, setIsUrlValid] = useState(true);

  const validateUrl = (url) => {
    if (!url) return false; // Le lien PDF est maintenant obligatoire
    
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

  const handleSubmit = () => {
    if (!pdfUrl.trim()) {
      alert('❌ Veuillez ajouter le lien vers le PDF de l\'entretien de départ');
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

          {/* Section Lien PDF - Maintenant obligatoire */}
          <div className="pdf-url-section">
            <h4>📎 Lien vers le PDF d'entretien *</h4>
            <div className="url-input-group">
              <input
                type="url"
                value={pdfUrl}
                onChange={handlePdfUrlChange}
                placeholder="https://exemple.com/entretien-depart.pdf"
                className={`url-input ${!isUrlValid && pdfUrl ? 'error' : ''}`}
                required
              />
              {pdfUrl && isUrlValid && (
                <button 
                  type="button"
                  className="test-link-btn"
                  onClick={handleTestPdfLink}
                >
                  🔗 Tester le lien
                </button>
              )}
            </div>
            {!isUrlValid && pdfUrl && (
              <p className="error-message">
                ❌ Veuillez entrer une URL valide vers un fichier PDF
              </p>
            )}
            <p className="url-hint">
              💡 Exemples: Google Drive, Dropbox, OneDrive, ou tout hébergeur de fichiers PDF
            </p>
          </div>

          {/* Aperçu du lien PDF */}
          {pdfUrl && isUrlValid && (
            <div className="pdf-preview">
              <h4>🔗 Aperçu du Lien PDF</h4>
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
            <p>⚠️ <strong>Attention:</strong> Après archivage, l'employé sera déplacé vers la liste des archives et ne sera plus visible dans la liste des employés actifs. Cette action est irréversible.</p>
          </div>
        </div>

        <div className="archive-modal-footer">
          <button 
            className="archive-confirm-btn"
            onClick={handleSubmit}
            disabled={!pdfUrl.trim() || !isUrlValid}
          >
            💾 Archiver l'Employé
          </button>
          <button 
            className="archive-cancel-btn"
            onClick={handleClose}
          >
            ❌ Annuler
          </button>
        </div>
      </div>
    </div>
  );
};

export default ArchiveModal;