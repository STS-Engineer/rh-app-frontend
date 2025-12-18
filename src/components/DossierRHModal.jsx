import React, { useState, useRef, useEffect } from 'react';
import './DossierRHModal.css';

const DossierRHModal = ({ employee, isOpen, onClose, onSuccess }) => {
  const [photos, setPhotos] = useState([]);
  const [dossierName, setDossierName] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [actionType, setActionType] = useState('new'); // 'new' ou 'merge'
  const [hasExistingDossier, setHasExistingDossier] = useState(false);
  const [existingDossierInfo, setExistingDossierInfo] = useState(null);
  
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const API_BASE_URL = 'https://backend-rh.azurewebsites.net';

  // Vérifier si un dossier existe déjà quand l'employé change
  useEffect(() => {
    if (employee && employee.dossier_rh) {
      setHasExistingDossier(true);
      setActionType('merge'); // Par défaut, on propose de fusionner
      
      // Extraire des infos du dossier existant
      try {
        const url = new URL(employee.dossier_rh);
        const filename = url.pathname.split('/').pop();
        setExistingDossierInfo({
          url: employee.dossier_rh,
          filename: filename,
          shortUrl: `${filename.substring(0, 20)}...${filename.substring(filename.length - 10)}`
        });
      } catch (e) {
        setExistingDossierInfo({
          url: employee.dossier_rh,
          filename: 'Dossier existant'
        });
      }
    } else {
      setHasExistingDossier(false);
      setActionType('new');
      setExistingDossierInfo(null);
    }
    
    // Suggérer un nom de dossier basé sur l'employé
    if (employee && !dossierName) {
      const today = new Date();
      const formattedDate = today.toLocaleDateString('fr-FR');
      setDossierName(`Dossier ${employee.prenom} ${employee.nom} - ${formattedDate}`);
    }
  }, [employee, dossierName]);

  // Ouvrir la caméra
  const startCamera = async () => {
    try {
      setIsCapturing(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (error) {
      console.error('Erreur caméra:', error);
      alert("Impossible d'accéder à la caméra. Vérifiez les permissions.");
      setIsCapturing(false);
    }
  };

  // Arrêter la caméra
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCapturing(false);
  };

  // Capturer une photo
  const capturePhoto = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    // Ajuster la taille de la capture
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    
    // Dessiner l'image de la vidéo sur le canvas
    context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    // Convertir en blob
    canvas.toBlob(
      blob => {
        if (!blob) {
          alert('Erreur lors de la capture');
          return;
        }
        
        const timestamp = new Date().toLocaleTimeString('fr-FR', { 
          hour: '2-digit', 
          minute: '2-digit',
          second: '2-digit'
        });
        
        const file = new File([blob], `capture-${timestamp}.jpg`, {
          type: 'image/jpeg'
        });
        
        setPhotos(prev => [
          ...prev,
          {
            file: file,
            preview: URL.createObjectURL(blob),
            name: `Capture ${prev.length + 1} - ${timestamp}`,
            filename: `capture-${Date.now()}.jpg`,
            size: blob.size,
            type: 'capture'
          }
        ]);
        
        // Petit feedback visuel
        const flash = document.createElement('div');
        flash.style.position = 'fixed';
        flash.style.top = '0';
        flash.style.left = '0';
        flash.style.width = '100%';
        flash.style.height = '100%';
        flash.style.backgroundColor = 'white';
        flash.style.opacity = '0.7';
        flash.style.zIndex = '9999';
        flash.style.pointerEvents = 'none';
        document.body.appendChild(flash);
        
        setTimeout(() => {
          document.body.removeChild(flash);
        }, 100);
      },
      'image/jpeg',
      0.85 // Qualité
    );
  };

  // Upload de photos depuis l'appareil
  const handleFileUpload = e => {
    const files = Array.from(e.target.files);
    const newPhotos = files.map(file => ({
      file: file,
      preview: URL.createObjectURL(file),
      name: file.name,
      filename: `${Date.now()}-${file.name}`,
      size: file.size,
      type: 'upload'
    }));
    setPhotos(prev => [...prev, ...newPhotos]);
    
    // Réinitialiser l'input pour pouvoir sélectionner les mêmes fichiers
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Supprimer une photo
  const removePhoto = index => {
    setPhotos(prev => {
      const newPhotos = [...prev];
      // Libérer l'URL de l'image pour éviter les fuites mémoire
      if (newPhotos[index].preview) {
        URL.revokeObjectURL(newPhotos[index].preview);
      }
      newPhotos.splice(index, 1);
      return newPhotos;
    });
  };

  // Upload des photos vers le backend
  const uploadPhotos = async () => {
    if (photos.length === 0) {
      alert('Veuillez ajouter au moins une photo');
      return null;
    }

    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Token d\'authentification manquant');
      }

      const formData = new FormData();

      photos.forEach((photo, index) => {
        formData.append('photos', photo.file, photo.filename || `photo-${index}.jpg`);
      });

      console.log('📤 Début upload des photos...', photos.length, 'photos');
      
      const response = await fetch(
        `${API_BASE_URL}/api/dossier-rh/upload-photos`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`
            // Note: ne pas mettre Content-Type pour FormData, le navigateur le fera automatiquement
          },
          body: formData
        }
      );

      if (!response.ok) {
        let errorText;
        try {
          const errorData = await response.json();
          errorText = errorData.error || errorData.details || `Erreur ${response.status}`;
        } catch {
          errorText = await response.text();
        }
        console.error('❌ Erreur upload:', errorText);
        throw new Error(`Erreur upload: ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Upload réussi:', result.photos?.length || 0, 'photos');
      return result.photos;
    } catch (error) {
      console.error('❌ Erreur upload:', error);
      alert(`Erreur lors de l'upload des photos: ${error.message}`);
      return null;
    } finally {
      setUploading(false);
    }
  };

  // Générer le PDF final avec fusion si nécessaire
  const generatePDF = async () => {
    if (!dossierName.trim()) {
      alert('Veuillez donner un nom au dossier');
      return;
    }

    if (photos.length === 0) {
      alert('Veuillez ajouter au moins une photo');
      return;
    }

    // Confirmation pour la fusion
    if (hasExistingDossier && actionType === 'merge') {
      const confirmMerge = window.confirm(
        `📎 Un dossier existe déjà pour cet employé.\n\n` +
        `Voulez-vous ajouter ${photos.length} document(s) au dossier existant ?\n\n` +
        `✓ Les nouveaux documents seront fusionnés\n` +
        `✓ Le dossier unique sera mis à jour\n` +
        `✓ L'ancien PDF sera conservé dans les nouvelles pages`
      );
      
      if (!confirmMerge) {
        // L'utilisateur veut créer un nouveau dossier séparé
        setActionType('new');
      }
    }

    setGenerating(true);
    try {
      console.log('🔄 Début génération PDF...');
      console.log(`   - Action: ${actionType}`);
      console.log(`   - Dossier existant: ${hasExistingDossier}`);
      console.log(`   - Photos: ${photos.length}`);
      console.log(`   - Nom dossier: ${dossierName}`);
      
      const uploadedPhotos = await uploadPhotos();
      if (!uploadedPhotos) {
        console.error('❌ Upload des photos échoué');
        return;
      }

      console.log('📸 Photos uploadées:', uploadedPhotos.length);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Non authentifié');
      }
      
      const response = await fetch(
        `${API_BASE_URL}/api/dossier-rh/generate-pdf/${employee.id}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            photos: uploadedPhotos,
            dossierName: dossierName,
            actionType: actionType
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
        console.error('❌ Erreur génération PDF:', result);
        throw new Error(
          result?.error || result?.details || `Erreur ${response.status}: ${JSON.stringify(result || {})}`
        );
      }

      console.log('✅ PDF généré avec succès:', result);
      
      // Message de succès adapté
      const successMessage = result.fusion 
        ? `✅ ${photos.length} document(s) ajouté(s) au dossier existant avec succès!\n\nLe dossier a été mis à jour avec les nouveaux documents.`
        : `✅ Nouveau dossier RH créé avec succès!\n\n${photos.length} document(s) ont été ajoutés.`;
      
      alert(successMessage);
      
      if (onSuccess && result.employee) {
        onSuccess(result.employee);
      }
      
      handleClose();
    } catch (error) {
      console.error('❌ Erreur génération PDF:', error);
      
      let errorMessage = error.message;
      if (errorMessage.includes('NetworkError') || errorMessage.includes('Failed to fetch')) {
        errorMessage = 'Erreur réseau. Vérifiez votre connexion.';
      } else if (errorMessage.includes('Unexpected token')) {
        errorMessage = 'Erreur serveur. Contactez l\'administrateur.';
      }
      
      alert(`❌ Erreur lors de la génération du PDF:\n\n${errorMessage}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleClose = () => {
    // Arrêter la caméra
    stopCamera();
    
    // Libérer toutes les URLs de prévisualisation
    photos.forEach(photo => {
      if (photo.preview) {
        URL.revokeObjectURL(photo.preview);
      }
    });
    
    // Réinitialiser l'état
    setPhotos([]);
    setDossierName('');
    setIsCapturing(false);
    setUploading(false);
    setGenerating(false);
    
    onClose();
  };

  // Calculer la taille totale des photos
  const calculateTotalSize = () => {
    const totalBytes = photos.reduce((sum, photo) => sum + (photo.size || 0), 0);
    if (totalBytes < 1024) return `${totalBytes} B`;
    if (totalBytes < 1024 * 1024) return `${(totalBytes / 1024).toFixed(1)} KB`;
    return `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`;
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
            {hasExistingDossier ? '📎 Ajouter au Dossier RH' : '📁 Créer un Dossier RH'}
          </h2>
          <button className="close-btn" onClick={handleClose} disabled={generating || uploading}>
            ×
          </button>
        </div>

        <div className="dossier-modal-body">
          <div className="employee-info">
            <h3>
              👤 {employee.prenom} {employee.nom}
            </h3>
            <p>
              Matricule: <strong>{employee.matricule}</strong> | Poste: <strong>{employee.poste}</strong>
            </p>
            
            {hasExistingDossier && existingDossierInfo && (
              <div className="existing-dossier-info">
                <p className="info-label">
                  📄 Dossier existant détecté:
                </p>
                <div className="dossier-link">
                  <a 
                    href={existingDossierInfo.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    title="Ouvrir le dossier existant"
                  >
                    🔗 {existingDossierInfo.filename}
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Sélection du type d'action */}
          {hasExistingDossier && (
            <div className="action-type-section">
              <h4>📋 Type d'action</h4>
              <div className="action-type-options">
                <label className="action-option">
                  <input
                    type="radio"
                    name="actionType"
                    value="merge"
                    checked={actionType === 'merge'}
                    onChange={() => setActionType('merge')}
                    disabled={generating || uploading}
                  />
                  <span className="action-icon">🔄</span>
                  <div className="action-details">
                    <strong>Ajouter aux documents existants</strong>
                    <small>Fusionne avec le dossier actuel</small>
                  </div>
                </label>
                
                <label className="action-option">
                  <input
                    type="radio"
                    name="actionType"
                    value="new"
                    checked={actionType === 'new'}
                    onChange={() => setActionType('new')}
                    disabled={generating || uploading}
                  />
                  <span className="action-icon">📁</span>
                  <div className="action-details">
                    <strong>Créer un nouveau dossier</strong>
                    <small>Remplace le dossier existant</small>
                  </div>
                </label>
              </div>
            </div>
          )}

          <div className="form-section">
            <label>
              Nom du dossier *
              {hasExistingDossier && actionType === 'merge' && (
                <span className="hint"> (sera ajouté aux métadonnées)</span>
              )}
            </label>
            <input
              type="text"
              value={dossierName}
              onChange={e => setDossierName(e.target.value)}
              placeholder="Ex: Dossier d'embauche, Évaluation trimestrielle, Documents administratifs..."
              className="dossier-name-input"
              disabled={generating || uploading}
            />
          </div>

          <div className="photos-section">
            <div className="photos-header">
              <h4>📷 Documents à ajouter ({photos.length})</h4>
              <div className="photos-stats">
                <span className="stat">📊 {calculateTotalSize()}</span>
                <span className="stat">🕐 {photos.length} document(s)</span>
              </div>
            </div>

            <div className="capture-controls">
              {!isCapturing ? (
                <div className="capture-buttons">
                  <button
                    type="button"
                    className="camera-btn"
                    onClick={startCamera}
                    disabled={generating || uploading}
                  >
                    📷 Ouvrir la caméra
                  </button>
                  
                  <button
                    type="button"
                    className="upload-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={generating || uploading || isCapturing}
                  >
                    📁 Uploader des documents
                  </button>
                </div>
              ) : (
                <div className="camera-active">
                  <div className="camera-header">
                    <span className="camera-status">🎥 Caméra active</span>
                    <button
                      type="button"
                      className="stop-camera-btn small"
                      onClick={stopCamera}
                    >
                      ❌ Fermer
                    </button>
                  </div>
                  
                  <div className="video-container">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
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
                  </div>
                  
                  <p className="camera-hint">
                    Positionnez le document dans le cadre et appuyez sur "Capturer"
                  </p>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                disabled={generating || uploading || isCapturing}
              />
            </div>

            {photos.length > 0 && (
              <div className="photos-gallery">
                <div className="gallery-header">
                  <h5>📄 Documents sélectionnés:</h5>
                  <button
                    type="button"
                    className="clear-all-btn"
                    onClick={() => {
                      if (window.confirm(`Voulez-vous supprimer tous les documents (${photos.length}) ?`)) {
                        photos.forEach(photo => {
                          if (photo.preview) URL.revokeObjectURL(photo.preview);
                        });
                        setPhotos([]);
                      }
                    }}
                    disabled={generating || uploading}
                  >
                    🗑️ Tout supprimer
                  </button>
                </div>
                
                <div className="photos-grid">
                  {photos.map((photo, index) => (
                    <div key={index} className="photo-item">
                      <div className="photo-preview">
                        <img 
                          src={photo.preview} 
                          alt={`Document ${index + 1}`}
                          onError={(e) => {
                            e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="#f0f0f0"/><text x="50" y="50" font-family="Arial" font-size="12" text-anchor="middle" dy=".3em">📄 Document</text></svg>';
                          }}
                        />
                        <button
                          className="remove-photo-btn"
                          onClick={() => removePhoto(index)}
                          title="Supprimer ce document"
                          disabled={generating || uploading}
                        >
                          ×
                        </button>
                        <div className="photo-type-badge">
                          {photo.type === 'capture' ? '📸 Capture' : '📁 Fichier'}
                        </div>
                      </div>
                      <div className="photo-info">
                        <span className="photo-name" title={photo.name}>
                          {photo.name.length > 20 
                            ? `${photo.name.substring(0, 20)}...` 
                            : photo.name}
                        </span>
                        <span className="photo-size">
                          {photo.size 
                            ? (photo.size < 1024 
                                ? `${photo.size} B`
                                : (photo.size < 1024 * 1024
                                    ? `${(photo.size / 1024).toFixed(1)} KB`
                                    : `${(photo.size / (1024 * 1024)).toFixed(2)} MB`
                                  )
                              )
                            : 'N/A'
                          }
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
          <div className="footer-info">
            {hasExistingDossier && actionType === 'merge' ? (
              <p className="merge-info">
                🔄 <strong>Mode Fusion:</strong> Les documents seront ajoutés au dossier existant
              </p>
            ) : (
              <p className="new-info">
                📁 <strong>Mode Nouveau Dossier:</strong> {hasExistingDossier 
                  ? 'Le dossier existant sera remplacé'
                  : 'Un nouveau dossier sera créé'}
              </p>
            )}
          </div>
          
          <div className="footer-actions">
            <button
              className="cancel-btn"
              onClick={handleClose}
              disabled={generating || uploading}
            >
              {generating || uploading ? '⏳ En cours...' : '❌ Annuler'}
            </button>
            
            <button
              className="generate-btn"
              onClick={generatePDF}
              disabled={
                generating || 
                uploading || 
                photos.length === 0 || 
                !dossierName.trim()
              }
            >
              {generating
                ? '⏳ Génération en cours...'
                : uploading
                ? '⏳ Upload des documents...'
                : hasExistingDossier && actionType === 'merge'
                ? `🔄 Ajouter ${photos.length} document(s) au dossier`
                : `📄 ${hasExistingDossier ? 'Remplacer' : 'Créer'} le dossier (${photos.length} doc.)`
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DossierRHModal;
