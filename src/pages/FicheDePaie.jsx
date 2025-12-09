import React, { useState } from 'react';
import './FicheDePaie.css';
import Sidebar from '../components/Sidebar';
import { useLanguage } from '../contexts/LanguageContext';

const FicheDePaie = () => {
  const { t } = useLanguage();
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
      setError(t('invalidPDF'));
      setSelectedFile(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError(t('selectPDF'));
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
        throw new Error(errorData.error || t('processingError'));
      }

      const data = await response.json();
      setResults(data.results);
      setSelectedFile(null);
      
      const fileInput = document.getElementById('pdf-upload');
      if (fileInput) fileInput.value = '';

    } catch (err) {
      console.error(t('uploadError'), err);
      setError(err.message || t('fileProcessingError'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fiche-paie-container">
      <Sidebar />
      <div className="fiche-paie-header">
        <h1>📄 {t('payslip')}</h1>
        <p className="subtitle">
          {t('autoSendPayslips')}
        </p>
      </div>

      <div className="upload-section">
        <div className="upload-card">
          <div className="upload-icon">📤</div>
          
          <h3>{t('importPDF')}</h3>
          <p className="upload-description">
            {t('pdfDescription')}
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
                  <span>{t('choosePDF')}</span>
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
                {t('processingInProgress')}
              </>
            ) : (
              <>
                <span>🚀</span>
                {t('processAndSend')}
              </>
            )}
          </button>

          {uploading && (
            <div className="progress-info">
              <p>⏳ {t('extractingMatricules')}</p>
              <p className="progress-note">
                {t('mayTakeSeveralMinutes')}
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="alert alert-error">
            <span className="alert-icon">❌</span>
            <div>
              <strong>{t('error')}</strong>
              <p>{error}</p>
            </div>
          </div>
        )}

        {results && (
          <div className="results-section">
            <div className="alert alert-success">
              <span className="alert-icon">✅</span>
              <div>
                <strong>{t('processingComplete')}</strong>
                <p>
                  {results.success} {t('sheetsSent')} {results.total} {t('pages')}
                </p>
              </div>
            </div>

            {results.errors && results.errors.length > 0 && (
              <div className="errors-list">
                <h4>⚠️ {t('errorDetails')} ({results.errors.length})</h4>
                <div className="errors-table">
                  {results.errors.map((err, index) => (
                    <div key={index} className="error-item">
                      <div className="error-page">{t('page')} {err.page}</div>
                      <div className="error-details">
                        {err.matricule && (
                          <div><strong>{t('employeeMatricule')}:</strong> {err.matricule}</div>
                        )}
                        {err.employe && (
                          <div><strong>{t('employee')}:</strong> {err.employe}</div>
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
