import React, { useState, useRef, useEffect } from 'react';
import './DossierRHModal.css';

const DossierRHModal = ({ employee, isOpen, onClose, onSuccess }) => {
  const [files, setFiles] = useState([]);
  const [dossierName, setDossierName] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [hasExistingDossier, setHasExistingDossier] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const API_BASE_URL = 'https://backend-rh.azurewebsites.net';

  useEffect(() => {
    if (employee && employee.dossier_rh) {
      setHasExistingDossier(true);
      if (!dossierName) {
        setDossierName(`Mise à jour ${new Date().toLocaleDateString('fr-FR')}`);
      }
    } else {
      setHasExistingDossier(false);
      if (!dossierName) {
        setDossierName(`Dossier RH ${new Date().getFullYear()}`);
      }
    }
  }, [employee, dossierName]);

  const startCamera = async () => {
    try {
      setIsCapturing(true);
      setErrorMessage('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Erreur caméra:', error);
      setErrorMessage("Impossible d'accéder à la caméra. Vérifiez les permissions.");
      setIsCapturing(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      blob => {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const file = new File([blob], `capture-${timestamp}.jpg`, {
          type: 'image/jpeg'
        });
        const newFile = {
          file: file,
          preview: URL.createObjectURL(blob),
          name: `Capture ${files.length + 1} - ${new Date().toLocaleTimeString('fr-FR')}`,
          filename: `capture-${timestamp}.jpg`,
          isImage: true,
          isPdf: false,
          fileType: 'image',
          size: blob.size,
          lastModified: Date.now()
        };
        setFiles(prev => [...prev, newFile]);
      },
      'image/jpeg',
      0.9
    );
  };

  const handleFileUpload = e => {
    const uploadedFiles = Array.from(e.target.files);
    const newFiles = uploadedFiles.map(file => {
      const isPdf = file.type === 'application/pdf' || 
                   file.name.toLowerCase().endsWith('.pdf');
      const isImage = file.type.startsWith('image/') && !isPdf;
      
      const fileObj = {
        file: file,
        preview: isImage ? URL.createObjectURL(file) : null,
        name: file.name,
        filename: file.name,
        isImage: isImage,
        isPdf: isPdf,
        fileType: isPdf ? 'pdf' : 'image',
        size: file.size,
        lastModified: file.lastModified,
        mimetype: file.type
      };

      // Vérifier la taille (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        setErrorMessage(`Le fichier "${file.name}" dépasse la taille maximale de 50MB`);
        return null;
      }

      return fileObj;
    }).filter(file => file !== null); // Filtrer les fichiers invalides

    if (newFiles.length > 0) {
      setFiles(prev => [...prev, ...newFiles]);
      setErrorMessage('');
    }

    // Réinitialiser l'input pour permettre la sélection des mêmes fichiers
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = index => {
    setFiles(prev => {
      const newFiles = [...prev];
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
    setErrorMessage('');
  };

  const uploadFiles = async () => {
    if (files.length === 0) {
      setErrorMessage('Veuillez ajouter au moins un fichier');
      return null;
    }

    setUploading(true);
    setErrorMessage('');
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Token d\'authentification manquant');
      }

      const formData = new FormData();
      
      // Ajouter tous les fichiers
      files.forEach(file => {
        formData.append('files', file.file);
      });

      console.log('📤 Début upload de', files.length, 'fichier(s)...');

      const response = await fetch(
        `${API_BASE_URL}/api/dossier-rh/upload-files`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
            // NE PAS ajouter 'Content-Type' - laissez FormData le gérer
          },
          body: formData
        }
      );

      const responseText = await response.text();
      console.log('📥 Réponse brute:', responseText);

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ Impossible de parser la réponse JSON:', parseError);
        throw new Error(`Réponse serveur invalide: ${responseText.substring(0, 100)}...`);
      }

      if (!response.ok) {
        console.error('❌ Erreur upload:', result);
        throw new Error(
          result?.error || 
          result?.details || 
          `Erreur serveur (${response.status})`
        );
      }

      if (!result.success) {
        throw new Error(result.error || 'Échec de l\'upload');
      }

      console.log('✅ Upload réussi:', result.files.length, 'fichier(s)');

      // Associer les informations du serveur avec nos fichiers locaux
      const enrichedFiles = files.map((localFile, index) => {
        const serverFile = result.files[index] || {};
        return {
          ...serverFile,
          file: localFile.file, // Conserver l'objet File original
          preview: localFile.preview, // Conserver la preview
          name: localFile.name,
          isImage: localFile.isImage,
          isPdf: localFile.isPdf
        };
      });

      return enrichedFiles;
    } catch (error) {
      console.error('❌ Erreur upload:', error);
      setErrorMessage(`Erreur lors de l'upload: ${error.message}`);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const processDossier = async () => {
    if (!dossierName.trim()) {
      setErrorMessage('Veuillez donner un nom au dossier');
      return;
    }

    if (files.length === 0) {
      setErrorMessage('Veuillez ajouter au moins un fichier');
      return;
    }

    setProcessing(true);
    setErrorMessage('');

    try {
      console.log('🔄 Début traitement dossier RH...');
      
      const uploadedFiles = await uploadFiles();
      if (!uploadedFiles) {
        console.error('❌ Upload des fichiers échoué');
        return;
      }

      console.log('📤 Fichiers prêts pour traitement:', uploadedFiles);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Token d\'authentification manquant');
      }

      // Utiliser la route de traitement
      const response = await fetch(
        `${API_BASE_URL}/api/dossier-rh/process/${employee.id}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            files: uploadedFiles,
            dossierName: dossierName.trim(),
            mode: hasExistingDossier ? 'merge' : 'create'
          })
        }
      );

      const responseText = await response.text();
      console.log('📥 Réponse traitement:', responseText);

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ Impossible de parser la réponse JSON:', parseError);
        throw new Error(`Réponse serveur invalide: ${responseText.substring(0, 100)}...`);
      }

      if (!response.ok) {
        console.error('❌ Erreur traitement dossier:', result);
        throw new Error(
          result?.error || 
          result?.details || 
          `Erreur ${response.status} lors du traitement`
        );
      }

      console.log('✅ Dossier traité avec succès:', result);
      
      const successMessage = hasExistingDossier 
        ? `✅ Dossier RH fusionné avec succès !\n${result.stats?.total || 0} fichier(s) ajouté(s) au dossier existant.`
        : `✅ Dossier RH créé avec succès !\n${result.stats?.total || 0} fichier(s) inclus.`;
      
      alert(successMessage);
      
      if (onSuccess && result.employee) {
        onSuccess(result.employee);
      }
      
      handleClose();
    } catch (error) {
      console.error('❌ Erreur traitement dossier:', error);
      setErrorMessage(`Erreur lors du traitement: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    stopCamera();
    files.forEach(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
    });
    setFiles([]);
    setDossierName('');
    setErrorMessage('');
    onClose();
  };

  const getFileIcon = (file) => {
    if (file.isPdf) return '📄';
    if (file.isImage) return '🖼️';
    return '📎';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      const fileInputEvent = { target: { files: e.dataTransfer.files } };
      handleFileUpload(fileInputEvent);
    }
  };

  if (!isOpen || !employee) return null;

  return (
    <div className="dossier-modal-overlay" onClick={handleClose}>
      <div
        className="dossier-modal-content"
        onClick={e => e.stopPropagation()}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="dossier-modal-header">
          <h2>
            {hasExistingDossier ? '🔄 Fusionner le Dossier RH' : '📁 Créer un Dossier RH'}
          </h2>
          <button className="close-btn" onClick={handleClose} disabled={processing || uploading}>
            ×
          </button>
        </div>

        <div className="dossier-modal-body">
          <div className="employee-info">
            <h3>
              {employee.prenom} {employee.nom.toUpperCase()}
            </h3>
            <div className="employee-details">
              <span><strong>Matricule:</strong> {employee.matricule || 'N/A'}</span>
              <span><strong>Poste:</strong> {employee.poste || 'N/A'}</span>
              <span><strong>Département:</strong> {employee.site_dep || 'N/A'}</span>
            </div>
            
            {hasExistingDossier && (
              <div className="info-message">
                <span>🔄</span>
                <div>
                  <strong>Mode Fusion Activé</strong>
                  <p>
                    Les nouveaux fichiers (images et PDF) seront ajoutés au dossier existant.
                    Le document final contiendra toutes les pages combinées.
                  </p>
                </div>
              </div>
            )}
          </div>

          {errorMessage && (
            <div className="error-message">
              ⚠️ {errorMessage}
            </div>
          )}

          <div className="form-section">
            <label>Nom du dossier *</label>
            <input
              type="text"
              value={dossierName}
              onChange={e => setDossierName(e.target.value)}
              placeholder={
                hasExistingDossier 
                  ? "Ex: Ajout documents novembre 2024..."
                  : "Ex: Dossier d'embauche 2024..."
              }
              className="dossier-name-input"
              disabled={processing || uploading}
            />
          </div>

          <div className="files-section">
            <h4>Fichiers à ajouter ({files.length})</h4>
            
            <div className="files-summary">
              <span>
                📊 {files.filter(f => f.isImage).length} image(s), 
                {' '}{files.filter(f => f.isPdf).length} PDF(s)
                {files.length > 0 && (
                  <span className="total-size">
                    {' '}({formatFileSize(files.reduce((sum, f) => sum + (f.size || 0), 0))})
                  </span>
                )}
              </span>
              {files.length > 0 && (
                <button 
                  className="clear-all-btn"
                  onClick={() => {
                    files.forEach(f => f.preview && URL.revokeObjectURL(f.preview));
                    setFiles([]);
                  }}
                  disabled={processing || uploading}
                >
                  🗑️ Tout supprimer
                </button>
              )}
            </div>

            <div className="capture-controls">
              {!isCapturing ? (
                <button
                  type="button"
                  className="camera-btn"
                  onClick={startCamera}
                  disabled={processing || uploading}
                >
                  📷 Ouvrir la caméra
                </button>
              ) : (
                <div className="camera-active">
                  <div className="video-container">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="camera-video"
                    />
                    <div className="camera-overlay">
                      <div className="camera-guide"></div>
                    </div>
                  </div>
                  <div className="camera-actions">
                    <button
                      type="button"
                      className="capture-btn"
                      onClick={capturePhoto}
                    >
                      📸 Capturer photo
                    </button>
                    <button
                      type="button"
                      className="stop-camera-btn"
                      onClick={stopCamera}
                    >
                      ❌ Fermer caméra
                    </button>
                  </div>
                </div>
              )}

              <div className="upload-zone">
                <button
                  type="button"
                  className="upload-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isCapturing || processing || uploading}
                >
                  📁 Ajouter des fichiers
                </button>
                <p className="upload-hint">
                  Glissez-déposez ou cliquez pour ajouter des images et PDFs
                  <br />
                  <small>Max 50MB par fichier, formats acceptés: JPG, PNG, PDF</small>
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,application/pdf"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                  disabled={processing || uploading}
                />
              </div>
            </div>

            {files.length > 0 && (
              <div className="files-list">
                <h5>Fichiers sélectionnés:</h5>
                <div className="files-grid">
                  {files.map((file, index) => (
                    <div key={index} className="file-item">
                      <div className="file-preview">
                        {file.isImage && file.preview ? (
                          <div className="image-preview">
                            <img 
                              src={file.preview} 
                              alt={`Preview ${index}`}
                              loading="lazy"
                            />
                          </div>
                        ) : (
                          <div className="pdf-preview">
                            <div className="file-icon-large">
                              {getFileIcon(file)}
                            </div>
                            <div className="file-extension">
                              {file.name.split('.').pop()?.toUpperCase() || 'PDF'}
                            </div>
                          </div>
                        )}
                        <button
                          className="remove-file-btn"
                          onClick={() => removeFile(index)}
                          title="Supprimer ce fichier"
                          disabled={processing || uploading}
                        >
                          ×
                        </button>
                      </div>
                      <div className="file-info">
                        <span className="file-name" title={file.name}>
                          {file.name.length > 30 
                            ? file.name.substring(0, 27) + '...' 
                            : file.name}
                        </span>
                        <div className="file-details">
                          <span className="file-type">
                            {file.isPdf ? '📄 PDF' : '🖼️ Image'}
                          </span>
                          <span className="file-size">
                            {formatFileSize(file.size || file.file?.size || 0)}
                          </span>
                        </div>
                        {file.lastModified && (
                          <span className="file-date">
                            {new Date(file.lastModified).toLocaleDateString('fr-FR')}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="dossier-modal-footer">
          <div className="footer-info">
            <span className="status-indicator">
              {uploading && '⏳ Upload en cours...'}
              {processing && '⏳ Traitement en cours...'}
              {!uploading && !processing && `${files.length} fichier(s) prêt(s)`}
            </span>
          </div>
          <div className="footer-actions">
            <button
              className="cancel-btn"
              onClick={handleClose}
              disabled={processing || uploading}
            >
              ❌ Annuler
            </button>
            <button
              className="generate-btn"
              onClick={processDossier}
              disabled={
                processing || 
                uploading || 
                files.length === 0 || 
                !dossierName.trim() ||
                isCapturing
              }
            >
              {processing
                ? '⏳ Traitement...'
                : uploading
                ? '⏳ Upload...'
                : hasExistingDossier
                ? `🔄 Fusionner (${files.length} fichier${files.length > 1 ? 's' : ''})`
                : `📁 Créer le dossier (${files.length} fichier${files.length > 1 ? 's' : ''})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DossierRHModal;
