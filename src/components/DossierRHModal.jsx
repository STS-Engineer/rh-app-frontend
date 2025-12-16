import React, { useState, useRef } from 'react';
import { dossierRhAPI } from '../services/api';
import './DossierRHModal.css';

const DossierRHModal = ({ employee, isOpen, onClose, onSuccess }) => {
  const [photos, setPhotos] = useState([]);
  const [dossierName, setDossierName] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [actionType, setActionType] = useState('new'); // 'new' ou 'add'
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Détecter si l'employé a déjà un dossier RH
  React.useEffect(() => {
    if (employee?.dossier_rh) {
      setActionType('add');
      setDossierName(`Ajout au dossier existant - ${new Date().toLocaleDateString('fr-FR')}`);
    } else {
      setActionType('new');
      setDossierName('');
    }
  }, [employee]);

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
      const formData = new FormData();
      photos.forEach(photo => {
        formData.append('photos', photo.file);
      });

      console.log('📤 Début upload des photos...');
      const response = await dossierRhAPI.uploadPhotos(formData);

      console.log('✅ Upload réussi:', response.data);
      return response.data.photos;
    } catch (error) {
      console.error('❌ Erreur upload:', error);
      alert(`Erreur lors de l'upload des photos: ${error.response?.data?.error || error.message}`);
      return null;
    } finally {
      setUploading(false);
    }
  };

  // Générer le PDF final
  const generatePDF = async () => {
    if (actionType === 'new' && !dossierName.trim()) {
      alert('Veuillez donner un nom au dossier');
      return;
    }

    if (photos.length === 0) {
      alert('Veuillez ajouter au moins une photo');
      return;
    }

    setGenerating(true);
    try {
      console.log('🔄 Début génération PDF...');
      
      const uploadedPhotos = await uploadPhotos();
      if (!uploadedPhotos) {
        console.error('❌ Upload des photos échoué');
        return;
      }

      console.log('📸 Photos uploadées:', uploadedPhotos);
      
      const response = await dossierRhAPI.generatePDF(employee.id, {
        photos: uploadedPhotos,
        dossierName: dossierName || `Dossier RH - ${new Date().toLocaleDateString('fr-FR')}`,
        actionType: actionType
      });

      console.log('✅ PDF généré avec succès:', response.data);
      alert(`✅ ${response.data.message || 'Dossier RH traité avec succès!'}`);
      
      if (onSuccess) {
        onSuccess(response.data.employee);
      }
      
      handleClose();
    } catch (error) {
      console.error('❌ Erreur génération PDF:', error);
      alert(`Erreur lors de la génération du PDF: ${error.response?.data?.error || error.message}`);
    } finally {
      setGenerating(false);
    }
  };

  // Supprimer le dossier RH
  const deleteDossierRH = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer le dossier RH de cet employé ? Cette action est irréversible.')) {
      return;
    }

    try {
      setGenerating(true);
      const response = await dossierRhAPI.deleteDossier(employee.id);
      
      if (response.data.success) {
        alert('✅ Dossier RH supprimé avec succès');
        if (onSuccess) {
          onSuccess(response.data.employee);
        }
        handleClose();
      }
    } catch (error) {
      console.error('❌ Erreur suppression dossier RH:', error);
      alert(`Erreur lors de la suppression: ${error.response?.data?.error || error.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleClose = () => {
    stopCamera();
    photos.forEach(photo => URL.revokeObjectURL(photo.preview));
    setPhotos([]);
    setDossierName('');
    setActionType('new');
    onClose();
  };

  if (!isOpen || !employee) return null;

  const hasExistingDossier = !!employee.dossier_rh;

  return (
    <div className="dossier-modal-overlay" onClick={handleClose}>
      <div
        className="dossier-modal-content"
        onClick={e => e.stopPropagation()}
      >
        <div className="dossier-modal-header">
          <h2>
            {hasExistingDossier ? '📁 Ajouter au Dossier RH' : '📁 Créer un Dossier RH'}
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
              <div className="existing-dossier-alert">
                <p>⚠️ Un dossier RH existe déjà pour cet employé.</p>
                <p>Les nouveaux documents seront ajoutés à la suite du dossier existant.</p>
              </div>
            )}
          </div>

          {actionType === 'new' && (
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
          )}

          <div className="photos-section">
            <h4>Documents à ajouter ({photos.length})</h4>

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
                📁 Uploader des documents
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
                <h5>Documents ajoutés:</h5>
                <div className="photos-grid">
                  {photos.map((photo, index) => (
                    <div key={index} className="photo-item">
                      <div className="photo-preview">
                        <img src={photo.preview} alt={`Preview ${index}`} />
                        <button
                          className="remove-photo-btn"
                          onClick={() => removePhoto(index)}
                          title="Supprimer ce document"
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
          <div className="footer-left">
            {hasExistingDossier && (
              <button
                className="delete-btn"
                onClick={deleteDossierRH}
                disabled={generating || uploading}
              >
                🗑️ Supprimer le dossier RH
              </button>
            )}
          </div>
          
          <div className="footer-right">
            <button
              className="cancel-btn"
              onClick={handleClose}
              disabled={generating || uploading}
            >
              ❌ Annuler
            </button>
            <button
              className="generate-btn"
              onClick={generatePDF}
              disabled={
                generating || 
                uploading || 
                photos.length === 0 || 
                (actionType === 'new' && !dossierName.trim())
              }
            >
              {generating
                ? '⏳ Traitement en cours...'
                : uploading
                ? '⏳ Upload des documents...'
                : hasExistingDossier
                ? `📄 Ajouter au dossier (${photos.length} doc${photos.length > 1 ? 's' : ''})`
                : `📄 Créer le dossier (${photos.length} doc${photos.length > 1 ? 's' : ''})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DossierRHModal;
