import React, { useState, useRef, useEffect } from 'react';
import './DossierRHModal.css';

const DossierRHModal = ({ employee, isOpen, onClose, onSuccess }) => {
  const [photos, setPhotos] = useState([]);
  const [dossierName, setDossierName] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [hasExistingDossier, setHasExistingDossier] = useState(false);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const API_BASE_URL = 'https://backend-rh.azurewebsites.net';

  // ✅ Détecter si un dossier existe déjà
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

  // Ouvrir la caméra
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

  // Arrêter la caméra
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
  };

  // Capturer une photo
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
        setPhotos(prev => [
          ...prev,
          {
            file: file,
            preview: URL.createObjectURL(blob),
            name: `Capture ${prev.length + 1}`,
            filename: `capture-${Date.now()}.jpg`
          }
        ]);
      },
      'image/jpeg',
      0.8
    );
  };

  // Upload de photos depuis l'appareil
  const handleFileUpload = e => {
    const files = Array.from(e.target.files);
    const newPhotos = files.map(file => ({
      file: file,
      preview: URL.createObjectURL(file),
      name: file.name,
      filename: file.name
    }));
    setPhotos(prev => [...prev, ...newPhotos]);
  };

  // Supprimer une photo
  const removePhoto = index => {
    setPhotos(prev => {
      const newPhotos = [...prev];
      URL.revokeObjectURL(newPhotos[index].preview);
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
      const formData = new FormData();

      photos.forEach(photo => {
        formData.append('photos', photo.file);
      });

      console.log('📤 Début upload des photos...');
      const response = await fetch(
        `${API_BASE_URL}/api/dossier-rh/upload-photos`,
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
      return result.photos;
    } catch (error) {
      console.error('❌ Erreur upload:', error);
      alert(`Erreur lors de l'upload des photos: ${error.message}`);
      return null;
    } finally {
      setUploading(false);
    }
  };

  // ✅ MODIFICATION PRINCIPALE : Utiliser merge-pdf pour dossiers existants
  const generateOrMergePDF = async () => {
    if (!dossierName.trim()) {
      alert('Veuillez donner un nom au dossier');
      return;
    }

    if (photos.length === 0) {
      alert('Veuillez ajouter au moins une photo');
      return;
    }

    setGenerating(true);
    try {
      console.log('🔄 Début génération/fusion PDF...');
      
      const uploadedPhotos = await uploadPhotos();
      if (!uploadedPhotos) {
        console.error('❌ Upload des photos échoué');
        return;
      }

      console.log('📸 Photos uploadées:', uploadedPhotos);
      
      const token = localStorage.getItem('token');
      
      // ✅ CHANGEMENT CLÉ : Utiliser merge-pdf pour dossiers existants
      const endpoint = hasExistingDossier 
        ? `${API_BASE_URL}/api/dossier-rh/merge-pdf/${employee.id}`
        : `${API_BASE_URL}/api/dossier-rh/generate-pdf/${employee.id}`;
      
      console.log(`📍 Endpoint: ${hasExistingDossier ? 'MERGE (anciennes + nouvelles photos)' : 'CREATE (nouvelles photos)'}`);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          photos: uploadedPhotos,
          dossierName: dossierName
        })
      });

      let result;
      try {
        result = await response.json();
      } catch (e) {
        console.error('❌ Réponse non JSON:', e);
        throw new Error('Réponse invalide du serveur');
      }

      if (!response.ok) {
        console.error('❌ Erreur génération/fusion PDF:', result);
        throw new Error(
          result?.error || result?.details || `Erreur ${response.status}`
        );
      }

      console.log('✅ PDF généré/fusionné avec succès:', result);
      
      const successMessage = hasExistingDossier 
        ? '✅ Dossier RH fusionné avec succès! Les anciennes et nouvelles photos ont été combinées.'
        : '✅ Dossier RH créé avec succès!';
      
      alert(successMessage);
      
      if (onSuccess) {
        onSuccess(result.employee);
      }
      
      handleClose();
    } catch (error) {
      console.error('❌ Erreur génération/fusion PDF:', error);
      alert(`Erreur lors de la génération du PDF: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleClose = () => {
    stopCamera();
    photos.forEach(photo => URL.revokeObjectURL(photo.preview));
    setPhotos([]);
    setDossierName('');
    onClose();
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
            📁 {hasExistingDossier ? 'Fusionner le Dossier RH' : 'Créer un Dossier RH'}
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
            
            {/* ✅ Message explicatif amélioré */}
            {hasExistingDossier && (
              <div style={{
                background: '#fff3cd',
                border: '2px solid #ffc107',
                borderRadius: '8px',
                padding: '12px',
                marginTop: '12px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px'
              }}>
                <span style={{ fontSize: '20px' }}>🔄</span>
                <div>
                  <strong>Mode Fusion Activé</strong>
                  <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#555' }}>
                    Les nouvelles photos seront <strong>ajoutées</strong> aux anciennes photos existantes dans le PDF. 
                    L'ancien dossier sera conservé puis fusionné avec les nouvelles images.
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
                  : "Ex: Dossier d'embauche, Évaluation trimestrielle..."
              }
              className="dossier-name-input"
            />
          </div>

          <div className="photos-section">
            <h4>Photos à ajouter ({photos.length})</h4>

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
                📁 Uploader des photos
              </button>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
            </div>

            {photos.length > 0 && (
              <div className="photos-gallery">
                <h5>Photos ajoutées:</h5>
                <div className="photos-grid">
                  {photos.map((photo, index) => (
                    <div key={index} className="photo-item">
                      <div className="photo-preview">
                        <img src={photo.preview} alt={`Preview ${index}`} />
                        <button
                          className="remove-photo-btn"
                          onClick={() => removePhoto(index)}
                          title="Supprimer cette photo"
                        >
                          ×
                        </button>
                      </div>
                      <span className="photo-name">{photo.name}</span>
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
            disabled={generating || uploading}
          >
            ❌ Annuler
          </button>
          <button
            className="generate-btn"
            onClick={generateOrMergePDF}
            disabled={
              generating || 
              uploading || 
              photos.length === 0 || 
              !dossierName.trim()
            }
          >
            {generating
              ? '⏳ Traitement en cours...'
              : uploading
              ? '⏳ Upload des photos...'
              : hasExistingDossier
              ? `🔄 Fusionner (${photos.length} nouvelle${photos.length > 1 ? 's' : ''} photo${photos.length > 1 ? 's' : ''})`
              : `📄 Créer le PDF (${photos.length} photo${photos.length > 1 ? 's' : ''})`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DossierRHModal;
