import React, { useState } from 'react';
import './FicheDePaie.css';
import Sidebar from '../components/Sidebar';
const FicheDePaie = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setError(null);
      setResults(null);
    } else {
      setError('Veuillez sélectionner un fichier PDF valide');
      setSelectedFile(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Veuillez sélectionner un fichier PDF');
      return;
    }

    setUploading(true);
    setError(null);
    setResults(null);

    const formData = new FormData();
    formData.append('pdfFile', selectedFile);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://backend-rh.azurewebsites.net/api/fiche-paie/process', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors du traitement');
      }

      const data = await response.json();
      setResults(data.results);
      setSelectedFile(null);
      
      const fileInput = document.getElementById('pdf-upload');
      if (fileInput) fileInput.value = '';

    } catch (err) {
      console.error('Erreur upload:', err);
      setError(err.message || 'Erreur lors du traitement du fichier');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fiche-paie-container">
      <Sidebar />
      <div className="fiche-paie-header">
        <h1>📄 Fiche de Paie</h1>
        <p className="subtitle">
          Envoi automatique des fiches de paie aux employés
        </p>
      </div>

      <div className="upload-section">
        <div className="upload-card">
          <div className="upload-icon">📤</div>
          
          <h3>Importer un fichier PDF</h3>
          <p className="upload-description">
            Le PDF doit contenir une fiche de paie par page.<br/>
            Chaque fiche doit avoir le matricule de l'employé (MATR.).
          </p>

          <div className="file-input-wrapper">
            <input
              id="pdf-upload"
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              disabled={uploading}
              className="file-input"
            />
            <label htmlFor="pdf-upload" className="file-input-label">
              {selectedFile ? (
                <>
                  <span className="file-icon">📎</span>
                  <span className="file-name">{selectedFile.name}</span>
                  <span className="file-size">
                    ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </>
              ) : (
                <>
                  <span className="upload-icon-text">📁</span>
                  <span>Choisir un fichier PDF</span>
                </>
              )}
            </label>
          </div>

          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="upload-button"
          >
            {uploading ? (
              <>
                <span className="spinner"></span>
                Traitement en cours...
              </>
            ) : (
              <>
                <span>🚀</span>
                Traiter et envoyer
              </>
            )}
          </button>

          {uploading && (
            <div className="progress-info">
              <p>⏳ Extraction des matricules et envoi des emails...</p>
              <p className="progress-note">
                Cela peut prendre plusieurs minutes selon le nombre de pages
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="alert alert-error">
            <span className="alert-icon">❌</span>
            <div>
              <strong>Erreur</strong>
              <p>{error}</p>
            </div>
          </div>
        )}

        {results && (
          <div className="results-section">
            <div className="alert alert-success">
              <span className="alert-icon">✅</span>
              <div>
                <strong>Traitement terminé</strong>
                <p>
                  {results.success} fiche(s) envoyée(s) sur {results.total} page(s)
                </p>
              </div>
            </div>

            {results.errors && results.errors.length > 0 && (
              <div className="errors-list">
                <h4>⚠️ Détails des erreurs ({results.errors.length})</h4>
                <div className="errors-table">
                  {results.errors.map((err, index) => (
                    <div key={index} className="error-item">
                      <div className="error-page">Page {err.page}</div>
                      <div className="error-details">
                        {err.matricule && (
                          <div><strong>Matricule:</strong> {err.matricule}</div>
                        )}
                        {err.employe && (
                          <div><strong>Employé:</strong> {err.employe}</div>
                        )}
                        <div className="error-message">{err.error}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      
    </div>
  );
};

export default FicheDePaie;
