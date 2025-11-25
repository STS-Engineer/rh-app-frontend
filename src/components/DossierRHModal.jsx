import React, { useState, useRef } from 'react';
import './DossierRHModal.css';

const DossierRHModal = ({ employee, isOpen, onClose, onSuccess }) => {
  const [photos, setPhotos] = useState([]);
  const [dossierName, setDossierName] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const API_BASE_URL = 'https://backend-rh.azurewebsites.net/api';

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
            name: `Capture ${prev.length + 1}`
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
      name: file.name
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

      if (!response.ok) throw new Error('Erreur upload');

      const result = await response.json();
      return result.photos;
    } catch (error) {
      console.error('Erreur upload:', error);
      alert("Erreur lors de l'upload des photos");
      return null;
    } finally {
      setUploading(false);
    }
  };

  // Générer le PDF final
  const generatePDF = async () => {
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
      const uploadedPhotos = await uploadPhotos();
      if (!uploadedPhotos) return;

      const token = localStorage.getItem('token');
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
            dossierName: dossierName
          })
        }
      );

      let result;
      try {
        result = await response.json();
      } catch (e) {
        console.error('Réponse non JSON de generate-pdf:', e);
      }

      if (!response.ok) {
        console.error('Réponse erreur generate-pdf:', result);
        alert(
          `Erreur lors de la génération du PDF${
            result?.details ? ' : ' + result.details : ''
          }`
        );
        return;
      }

      alert('✅ Dossier RH généré avec succès!');
      onSuccess(result.employee);
      handleClose();
    } catch (error) {
      console.error('Erreur génération PDF:', error);
      alert('Erreur lors de la génération du PDF');
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
          <h2>📁 Ajouter un Dossier RH</h2>
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
          </div>

          <div className="form-section">
            <label>Nom du dossier *</label>
            <input
              type="text"
              value={dossierName}
              onChange={e => setDossierName(e.target.value)}
              placeholder="Ex: Dossier d'embauche, Évaluation trimestrielle..."
              className="dossier-name-input"
            />
          </div>

          <div className="photos-section">
            <h4>Photos ({photos.length})</h4>

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
                {photos.map((photo, index) => (
                  <div key={index} className="photo-item">
                    <img src={photo.preview} alt={`Preview ${index}`} />
                    <button
                      className="remove-photo-btn"
                      onClick={() => removePhoto(index)}
                    >
                      ×
                    </button>
                    <span className="photo-name">{photo.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="dossier-modal-footer">
          <button
            className="cancel-btn"
            onClick={handleClose}
            disabled={generating}
          >
            ❌ Annuler
          </button>
          <button
            className="generate-btn"
            onClick={generatePDF}
            disabled={
              generating || uploading || photos.length === 0 || !dossierName.trim()
            }
          >
            {generating
              ? '⏳ Génération...'
              : uploading
              ? '⏳ Upload...'
              : '📄 Générer le PDF'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DossierRHModal;
