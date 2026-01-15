import React, { useState, useRef, useEffect } from 'react';
import './DossierRHModal.css';

const DossierRHModal = ({ employee, isOpen, onClose, onSuccess }) => {
  const [files, setFiles] = useState([]);
  const [dossierName, setDossierName] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [hasExistingDossier, setHasExistingDossier] = useState(false);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const API_BASE_URL = 'https://backend-rh.azurewebsites.net';

  useEffect(() => {
    if (employee && employee.dossier_rh) {
      setHasExistingDossier(true);
      if (!dossierName) {
        setDossierName('Mise à jour du dossier RH');
      }
    } else {
      setHasExistingDossier(false);
    }
  }, [employee, dossierName]);

  const startCamera = async () => {
    try {
      setIsCapturing(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Erreur caméra:', error);
      alert("Impossible d'accéder à la caméra");
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
    context.drawImage(videoRef.current, 0, 0);

    canvas.toBlob(
      blob => {
        const file = new File([blob], `capture-${Date.now()}.jpg`, {
          type: 'image/jpeg'
        });
        setFiles(prev => [
          ...prev,
          {
            file: file,
            preview: URL.createObjectURL(blob),
            name: `Capture ${prev.length + 1}`,
            filename: `capture-${Date.now()}.jpg`,
            isImage: true,
            isPdf: false
          }
        ]);
      },
      'image/jpeg',
      0.8
    );
  };

  const handleFileUpload = e => {
    const uploadedFiles = Array.from(e.target.files);
    const newFiles = uploadedFiles.map(file => {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const isImage = file.type.startsWith('image/') && !isPdf;
      
      return {
        file: file,
        preview: isImage ? URL.createObjectURL(file) : null,
        name: file.name,
        filename: file.name,
        isImage: isImage,
        isPdf: isPdf,
        fileType: isPdf ? 'pdf' : 'image'
      };
    });
    setFiles(prev => [...prev, ...newFiles]);
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
  };

  const uploadFiles = async () => {
    if (files.length === 0) {
      alert('Veuillez ajouter au moins un fichier');
      return null;
    }

    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();

      files.forEach(file => {
        formData.append('files', file.file);
      });

      console.log('📤 Début upload des fichiers...');
      const response = await fetch(
        `${API_BASE_URL}/api/dossier-rh/upload-files`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: formData
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erreur upload:', errorText);
        throw new Error(`Erreur upload: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Upload réussi:', result);
      return result.files;
    } catch (error) {
      console.error('❌ Erreur upload:', error);
      alert(`Erreur lors de l'upload des fichiers: ${error.message}`);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const processDossier = async () => {
    if (!dossierName.trim()) {
      alert('Veuillez donner un nom au dossier');
      return;
    }

    if (files.length === 0) {
      alert('Veuillez ajouter au moins un fichier');
      return;
    }

    setProcessing(true);
    try {
      console.log('🔄 Début traitement dossier RH...');
      
      const uploadedFiles = await uploadFiles();
      if (!uploadedFiles) {
        console.error('❌ Upload des fichiers échoué');
        return;
      }

      console.log('📤 Fichiers uploadés:', uploadedFiles);
      
      const token = localStorage.getItem('token');
      
      // Utiliser la nouvelle route de traitement
      const response = await fetch(
        `${API_BASE_URL}/api/dossier-rh/process/${employee.id}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            files: uploadedFiles,
            dossierName: dossierName,
            mode: hasExistingDossier ? 'merge' : 'create'
          })
        }
      );

      let result;
      try {
        result = await response.json();
      } catch (e) {
        console.error('❌ Réponse non JSON:', e);
        throw new Error('Réponse invalide du serveur');
      }

      if (!response.ok) {
        console.error('❌ Erreur traitement dossier:', result);
        throw new Error(
          result?.error || result?.details || `Erreur ${response.status}`
        );
      }

      console.log('✅ Dossier traité avec succès:', result);
      
      const successMessage = hasExistingDossier 
        ? '✅ Dossier RH fusionné avec succès! Les nouveaux fichiers ont été ajoutés au dossier existant.'
        : '✅ Dossier RH créé avec succès!';
      
      alert(successMessage);
      
      if (onSuccess) {
        onSuccess(result.employee);
      }
      
      handleClose();
    } catch (error) {
      console.error('❌ Erreur traitement dossier:', error);
      alert(`Erreur lors du traitement du dossier: ${error.message}`);
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
    onClose();
  };

  const getFileIcon = (file) => {
    if (file.isPdf) return '📄';
    if (file.isImage) return '🖼️';
    return '📎';
  };

  if (!isOpen || !employee) return null;

  return (
    <div className="dossier-modal-overlay" onClick={handleClose}>
      <div
        className="dossier-modal-content"
        onClick={e => e.stopPropagation()}
      >
        <div className="dossier-modal-header">
          <h2>
            {hasExistingDossier ? '🔄 Fusionner le Dossier RH' : '📁 Créer un Dossier RH'}
          </h2>
          <button className="close-btn" onClick={handleClose}>
            ×
          </button>
        </div>

        <div className="dossier-modal-body">
          <div className="employee-info">
            <h3>
              Pour: {employee.prenom} {employee.nom}
            </h3>
            <p>
              Matricule: {employee.matricule} | Poste: {employee.poste}
            </p>
            
            {hasExistingDossier && (
              <div className="info-message">
                <span>🔄</span>
                <div>
                  <strong>Mode Fusion Activé</strong>
                  <p>
                    Les nouveaux fichiers (images et PDFs) seront ajoutés aux documents existants.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="form-section">
            <label>Nom du dossier *</label>
            <input
              type="text"
              value={dossierName}
              onChange={e => setDossierName(e.target.value)}
              placeholder={
                hasExistingDossier 
                  ? "Ex: Ajout documents 2024..."
                  : "Ex: Dossier d'embauche..."
              }
              className="dossier-name-input"
            />
          </div>

          <div className="files-section">
            <h4>Fichiers à ajouter ({files.length})</h4>
            
            <div className="files-summary">
              <span>
                📊 {files.filter(f => f.isImage).length} image(s), 
                {files.filter(f => f.isPdf).length} PDF(s)
              </span>
            </div>

            <div className="capture-controls">
              {!isCapturing ? (
                <button
                  type="button"
                  className="camera-btn"
                  onClick={startCamera}
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
                      className="camera-video"
                    />
                  </div>
                  <div className="camera-actions">
                    <button
                      type="button"
                      className="capture-btn"
                      onClick={capturePhoto}
                    >
                      📸 Capturer
                    </button>
                    <button
                      type="button"
                      className="stop-camera-btn"
                      onClick={stopCamera}
                    >
                      ❌ Fermer
                    </button>
                  </div>
                </div>
              )}

              <button
                type="button"
                className="upload-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={isCapturing}
              >
                📁 Uploader des fichiers
              </button>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,application/pdf"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
            </div>

            {files.length > 0 && (
              <div className="files-list">
                <h5>Fichiers ajoutés:</h5>
                <div className="files-grid">
                  {files.map((file, index) => (
                    <div key={index} className="file-item">
                      <div className="file-preview">
                        {file.isImage && file.preview ? (
                          <img src={file.preview} alt={`Preview ${index}`} />
                        ) : (
                          <div className="file-icon">
                            {getFileIcon(file)}
                          </div>
                        )}
                        <button
                          className="remove-file-btn"
                          onClick={() => removeFile(index)}
                          title="Supprimer ce fichier"
                        >
                          ×
                        </button>
                      </div>
                      <div className="file-info">
                        <span className="file-name">{file.name}</span>
                        <span className="file-type">
                          {file.isPdf ? 'PDF' : 'Image'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="dossier-modal-footer">
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
              !dossierName.trim()
            }
          >
            {processing
              ? '⏳ Traitement en cours...'
              : uploading
              ? '⏳ Upload des fichiers...'
              : hasExistingDossier
              ? `🔄 Fusionner (${files.length} fichier${files.length > 1 ? 's' : ''})`
              : `📁 Créer le dossier (${files.length} fichier${files.length > 1 ? 's' : ''})`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DossierRHModal;
