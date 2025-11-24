import React, { useState, useEffect, useRef } from 'react';
import { employeesAPI } from '../services/api';
import ArchiveModal from './ArchiveModal';
import './EmployeeModal.css';
import jsPDF from 'jspdf';

const EmployeeModal = ({ employee, isOpen, onClose, onUpdate, onArchive }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [capturedImages, setCapturedImages] = useState([]);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (employee) {
      setFormData(employee);
    }
  }, [employee]);

  // Fonction pour démarrer la caméra
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Erreur caméra:', error);
      alert('Impossible d\'accéder à la caméra. Vérifiez les permissions.');
    }
  };

  // Fonction pour arrêter la caméra
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  // Fonction pour capturer une photo
  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const context = canvas.getContext('2d');
      context.drawImage(videoRef.current, 0, 0);
      
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedImages(prev => [...prev, {
        id: Date.now(),
        data: imageData,
        timestamp: new Date().toLocaleString('fr-FR')
      }]);
    }
  };

  // Fonction pour importer des photos
  const handleFileImport = (event) => {
    const files = Array.from(event.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCapturedImages(prev => [...prev, {
          id: Date.now(),
          data: e.target.result,
          timestamp: new Date().toLocaleString('fr-FR'),
          filename: file.name
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Fonction pour supprimer une image
  const removeImage = (id) => {
    setCapturedImages(prev => prev.filter(img => img.id !== id));
  };

  // Fonction pour générer le PDF
  const generatePDF = async () => {
    if (capturedImages.length === 0) {
      alert('Aucune image à ajouter au PDF');
      return;
    }

    try {
      setSaving(true);
      
      const pdf = new jsPDF();
      let yPosition = 20;
      let pageNumber = 1;
      
      // En-tête du PDF
      pdf.setFontSize(18);
      pdf.setTextColor(40, 40, 40);
      pdf.text(`DOSSIER RH - ${employee.prenom} ${employee.nom.toUpperCase()}`, 20, yPosition);
      yPosition += 10;
      
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Matricule: ${employee.matricule}`, 20, yPosition);
      yPosition += 5;
      pdf.text(`Poste: ${employee.poste}`, 20, yPosition);
      yPosition += 5;
      pdf.text(`Département: ${employee.site_dep}`, 20, yPosition);
      yPosition += 5;
      pdf.text(`Généré le: ${new Date().toLocaleString('fr-FR')}`, 20, yPosition);
      yPosition += 15;

      // Ligne de séparation
      pdf.setDrawColor(200, 200, 200);
      pdf.line(20, yPosition, 190, yPosition);
      yPosition += 20;

      // Ajouter les images au PDF
      for (let i = 0; i < capturedImages.length; i++) {
        // Vérifier si on besoin d'une nouvelle page
        if (yPosition > 250) {
          pdf.addPage();
          pageNumber++;
          yPosition = 20;
          
          // En-tête de page
          pdf.setFontSize(10);
          pdf.setTextColor(100, 100, 100);
          pdf.text(`Dossier RH - ${employee.matricule} - Page ${pageNumber}`, 20, 10);
        }

        const img = capturedImages[i];
        
        // Ajouter la légende
        pdf.setFontSize(12);
        pdf.setTextColor(40, 40, 40);
        pdf.text(`Document ${i + 1}/${capturedImages.length}`, 20, yPosition);
        yPosition += 5;
        
        pdf.setFontSize(9);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`Date: ${img.timestamp}`, 20, yPosition);
        if (img.filename) {
          pdf.text(`Fichier: ${img.filename}`, 100, yPosition);
        }
        yPosition += 8;

        // Ajouter l'image (taille optimisée)
        const imgProps = pdf.getImageProperties(img.data);
        const maxWidth = 170;
        const maxHeight = 120;
        let width = maxWidth;
        let height = (imgProps.height * width) / imgProps.width;
        
        if (height > maxHeight) {
          const ratio = maxHeight / height;
          width = width * ratio;
          height = maxHeight;
        }
        
        pdf.addImage(img.data, 'JPEG', 20, yPosition, width, height);
        yPosition += height + 15;
        
        // Ligne de séparation entre les images
        if (i < capturedImages.length - 1) {
          pdf.setDrawColor(230, 230, 230);
          pdf.line(20, yPosition, 190, yPosition);
          yPosition += 10;
        }
      }

      // Pied de page sur la dernière page
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text(`Document généré automatiquement par RH Manager - ${new Date().getFullYear()}`, 20, 290);

      // Convertir le PDF en Blob
      const pdfBlob = pdf.output('blob');
      
      // Upload vers GitHub
      await uploadToGitHub(pdfBlob);
      
    } catch (error) {
      console.error('Erreur génération PDF:', error);
      alert('Erreur lors de la génération du PDF: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Fonction pour uploader vers GitHub
  const uploadToGitHub = async (pdfBlob) => {
    try {
      setSaving(true);
      
      const formData = new FormData();
      const filename = `dossier_rh_${employee.matricule}_${Date.now()}.pdf`;
      
      formData.append('file', pdfBlob, filename);
      formData.append('employeeId', employee.id);
      formData.append('matricule', employee.matricule);

      console.log('📤 Début upload vers GitHub...');
      
      const response = await employeesAPI.uploadDossierRH(formData);
      
      if (response.data.success) {
        console.log('✅ Upload réussi:', response.data);
        
        // Mettre à jour l'employé avec le nouveau lien
        const updatedEmployee = await employeesAPI.update(employee.id, {
          ...employee,
          dossier_rh: response.data.pdfUrl
        });
        
        onUpdate(updatedEmployee.data);
        setCapturedImages([]);
        setShowCameraModal(false);
        stopCamera();
        
        // Afficher les informations de succès
        alert(`✅ Dossier RH uploadé avec succès!\n\n📁 Repository: GitHub\n📄 Fichier: ${filename}\n🔗 URL: ${response.data.pdfUrl}`);
      } else {
        throw new Error('Upload échoué');
      }
    } catch (error) {
      console.error('❌ Erreur upload GitHub:', error);
      
      let errorMessage = 'Erreur lors de l\'upload du PDF vers GitHub';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage += `: ${error.message}`;
      }
      
      alert(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    
    if (type === 'date') {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSave = async () => {
    if (saving) return;
    
    setSaving(true);
    try {
      console.log('💾 Sauvegarde des modifications:', formData);
      
      const updatedEmployee = await employeesAPI.update(employee.id, formData);
      console.log('✅ Employé mis à jour:', updatedEmployee.data);
      
      onUpdate(updatedEmployee.data);
      setIsEditing(false);
      alert('✅ Modifications sauvegardées avec succès!');
      
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde:', error);
      alert('❌ Erreur lors de la sauvegarde: ' + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (entretien_depart) => {
    try {
      setSaving(true);
      const response = await employeesAPI.archiveEmployee(employee.id, entretien_depart);
      console.log('✅ Employé archivé:', response.data);
      
      onArchive(response.data);
      setShowArchiveModal(false);
      onClose();
      alert('✅ Employé archivé avec succès!');
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'archivage:', error);
      alert('❌ Erreur lors de l\'archivage: ' + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
    }
  };

  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return 'Non renseignée';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const getDefaultAvatar = () => {
    return `https://ui-avatars.com/api/?name=${employee.prenom}+${employee.nom}&background=3498db&color=fff&size=150`;
  };

  const getPhotoUrl = () => {
    if (formData.photo && isValidUrl(formData.photo)) {
      return formData.photo;
    }
    return getDefaultAvatar();
  };

  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const getDocumentUrl = (dossierRh) => {
    if (!dossierRh) return null;
    
    if (dossierRh.startsWith('http')) {
      return dossierRh;
    }
    
    return null;
  };

  const isPdfUrl = (url) => {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    return lowerUrl.endsWith('.pdf') || lowerUrl.includes('.pdf?') || 
           lowerUrl.includes('/pdf') || lowerUrl.includes('application/pdf');
  };

  const getDocumentDisplayName = (url) => {
    if (!url) return 'Document PDF';
    
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = pathname.split('/').pop();
      
      if (filename && filename.includes('.pdf')) {
        return decodeURIComponent(filename);
      }
      
      return `Document - ${urlObj.hostname}`;
    } catch {
      return 'Document PDF';
    }
  };

  const handleDocumentClick = (e, url) => {
    e.preventDefault();
    
    if (!url) {
      alert('❌ Aucun document disponible');
      return;
    }

    if (!isPdfUrl(url)) {
      if (confirm('⚠️ Ce lien ne semble pas être un PDF. Voulez-vous quand même l\'ouvrir?')) {
        window.open(url, '_blank');
      }
      return;
    }

    window.open(url, '_blank');
  };

  const handleClose = () => {
    setIsEditing(false);
    setFormData(employee);
    onClose();
  };

  const truncateUrl = (url, maxLength) => {
    if (!url) return '';
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + '...';
  };

  // Ouvrir le modal caméra
  const openCameraModal = () => {
    setShowCameraModal(true);
    setCapturedImages([]);
    setTimeout(startCamera, 100);
  };

  // Fermer le modal caméra
  const closeCameraModal = () => {
    setShowCameraModal(false);
    setCapturedImages([]);
    stopCamera();
  };

  if (!isOpen || !employee) return null;

  const documentUrl = getDocumentUrl(formData.dossier_rh);
  const hasDepartureDate = formData.date_depart && formData.date_depart.trim() !== '';

  return (
    <>
      <div className="employee-modal-overlay" onClick={handleClose}>
        <div className="employee-modal-content" onClick={e => e.stopPropagation()}>
          <div className="employee-modal-header">
            <h2>👤 Détails de l'Employé</h2>
            <button className="close-btn" onClick={handleClose}>×</button>
          </div>

          <div className="employee-modal-body">
            {/* En-tête avec photo et informations basiques */}
            <div className="employee-header">
              <img 
                src={getPhotoUrl()} 
                alt={`${formData.prenom} ${formData.nom}`}
                className="employee-photo"
                onError={(e) => {
                  e.target.src = getDefaultAvatar();
                }}
              />
              <div className="employee-basic-info">
                <h3>{formData.prenom} {formData.nom}</h3>
                <p className="employee-matricule">Matricule: {formData.matricule}</p>
                <p className="employee-poste">{formData.poste}</p>
                <p className="employee-departement">{formData.site_dep}</p>
                <p className="employee-contrat">{formData.type_contrat}</p>
              </div>
            </div>

            {!isEditing ? (
              // Mode visualisation
              <div className="employee-details-grid">
                <div className="detail-section">
                  <h4>📝 Informations Personnelles</h4>
                  <DetailRow label="CIN" value={formData.cin} />
                  <DetailRow label="Passeport" value={formData.passeport || 'Non renseigné'} />
                  <DetailRow label="Date de naissance" value={formatDateForDisplay(formData.date_naissance)} />
                </div>

                <div className="detail-section">
                  <h4>💼 Informations Professionnelles</h4>
                  <DetailRow label="Date d'embauche" value={formatDateForDisplay(formData.date_debut)} />
                  <DetailRow label="Salaire brut" value={`${formData.salaire_brute} €`} />
                  <DetailRow label="Date de départ" value={formatDateForDisplay(formData.date_depart)} />
                </div>

                <div className="detail-section">
                  <h4>📎 Documents</h4>
                  <div className="document-row">
                    <strong>Dossier RH:</strong>
                    <span>
                      {documentUrl ? (
                        <div className="document-container">
                          <a 
                            href={documentUrl} 
                            onClick={(e) => handleDocumentClick(e, documentUrl)}
                            className="document-link"
                            title={formData.dossier_rh}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            📄 {getDocumentDisplayName(formData.dossier_rh)}
                          </a>
                          <div className="document-preview">
                            <small>🔗 {truncateUrl(formData.dossier_rh, 40)}</small>
                          </div>
                        </div>
                      ) : (
                        <span className="no-document">Aucun document</span>
                      )}
                    </span>
                  </div>
                  
                  {/* Nouveau bouton Ajouter Dossier RH */}
                  <div className="add-dossier-section">
                    <button 
                      className="add-dossier-btn"
                      onClick={openCameraModal}
                    >
                      📸 Ajouter Dossier RH
                    </button>
                    <p className="add-dossier-hint">
                      Prendre des photos ou importer des images pour créer un PDF
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              // Mode édition
              <div className="edit-form">
                <div className="form-section">
                  <h4>📝 Informations Personnelles</h4>
                  <div className="form-grid">
                    <FormInput label="Matricule" name="matricule" value={formData.matricule} onChange={handleInputChange} required />
                    <FormInput label="Nom" name="nom" value={formData.nom} onChange={handleInputChange} required />
                    <FormInput label="Prénom" name="prenom" value={formData.prenom} onChange={handleInputChange} required />
                    <FormInput label="CIN" name="cin" value={formData.cin} onChange={handleInputChange} required />
                    <FormInput label="Passeport" name="passeport" value={formData.passeport} onChange={handleInputChange} placeholder="Optionnel" />
                    <FormInput label="Date de naissance" name="date_naissance" type="date" value={formatDateForInput(formData.date_naissance)} onChange={handleInputChange} required />
                  </div>
                </div>

                <div className="form-section">
                  <h4>💼 Informations Professionnelles</h4>
                  <div className="form-grid">
                    <FormInput label="Poste" name="poste" value={formData.poste} onChange={handleInputChange} required />
                    <FormInput label="Site/Département" name="site_dep" value={formData.site_dep} onChange={handleInputChange} required />
                    <FormInput label="Type de contrat" name="type_contrat" value={formData.type_contrat} onChange={handleInputChange} required />
                    <FormInput label="Date d'embauche" name="date_debut" type="date" value={formatDateForInput(formData.date_debut)} onChange={handleInputChange} required />
                    <FormInput label="Salaire brut" name="salaire_brute" type="number" step="0.01" value={formData.salaire_brute} onChange={handleInputChange} required />
                    <FormInput label="Date de départ" name="date_depart" type="date" value={formatDateForInput(formData.date_depart)} onChange={handleInputChange} placeholder="Optionnel" />
                  </div>
                </div>

                <div className="form-section">
                  <h4>🖼️ Photo & Documents</h4>
                  <div className="form-grid">
                    <FormInput label="Photo URL" name="photo" value={formData.photo} onChange={handleInputChange} placeholder="https://exemple.com/photo.jpg" />
                    <FormInput 
                      label="Dossier RH (URL PDF)" 
                      name="dossier_rh" 
                      value={formData.dossier_rh || ''} 
                      onChange={handleInputChange} 
                      placeholder="https://github.com/.../dossier_rh_XXX.pdf" 
                    />
                  </div>
                </div>

                {/* Bouton d'archivage conditionnel */}
                {hasDepartureDate && (
                  <div className="archive-section">
                    <button 
                      type="button"
                      className="archive-btn"
                      onClick={() => setShowArchiveModal(true)}
                    >
                      📁 Insérer entretien de départ
                    </button>
                    <p className="archive-hint">
                      Cliquez pour ajouter l'entretien de départ et archiver l'employé
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="employee-modal-footer">
            {!isEditing ? (
              <button className="edit-btn" onClick={() => setIsEditing(true)}>
                ✏️ Modifier les informations
              </button>
            ) : (
              <div className="edit-actions">
                <button 
                  className="save-btn" 
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? '⏳ Sauvegarde...' : '💾 Sauvegarder'}
                </button>
                <button 
                  className="cancel-btn" 
                  onClick={() => {
                    setIsEditing(false);
                    setFormData(employee);
                  }}
                  disabled={saving}
                >
                  ❌ Annuler
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal d'archivage */}
      <ArchiveModal
        employee={employee}
        isOpen={showArchiveModal}
        onClose={() => setShowArchiveModal(false)}
        onArchive={handleArchive}
      />

      {/* Modal pour ajouter le dossier RH */}
      {showCameraModal && (
        <div className="camera-modal-overlay">
          <div className="camera-modal-content">
            <div className="camera-modal-header">
              <h3>📸 Ajouter Dossier RH - {employee.prenom} {employee.nom}</h3>
              <button className="close-btn" onClick={closeCameraModal}>×</button>
            </div>

            <div className="camera-modal-body">
              {/* Zone caméra */}
              <div className="camera-section">
                <h4>Caméra</h4>
                <div className="camera-preview">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline
                    className="camera-video"
                  />
                </div>
                <div className="camera-controls">
                  <button 
                    className="capture-btn"
                    onClick={capturePhoto}
                  >
                    📷 Prendre une photo
                  </button>
                </div>
              </div>

              {/* Import de fichiers */}
              <div className="import-section">
                <h4>Importer des images</h4>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  multiple
                  onChange={handleFileImport}
                  style={{ display: 'none' }}
                />
                <button 
                  className="import-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  📁 Choisir des images
                </button>
                <p className="import-hint">Formats supportés: JPG, PNG, WebP</p>
              </div>

              {/* Images capturées */}
              {capturedImages.length > 0 && (
                <div className="captured-images">
                  <h4>Images capturées ({capturedImages.length})</h4>
                  <div className="images-grid">
                    {capturedImages.map(img => (
                      <div key={img.id} className="image-item">
                        <img src={img.data} alt="Captured" />
                        <button 
                          className="remove-image-btn"
                          onClick={() => removeImage(img.id)}
                        >
                          ❌
                        </button>
                        <span className="image-timestamp">{img.timestamp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="camera-modal-footer">
              <button 
                className="generate-pdf-btn"
                onClick={generatePDF}
                disabled={capturedImages.length === 0 || saving}
              >
                {saving ? '⏳ Génération PDF...' : '📄 Générer PDF et Uploader vers GitHub'}
              </button>
              <button 
                className="cancel-camera-btn"
                onClick={closeCameraModal}
                disabled={saving}
              >
                ❌ Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const DetailRow = ({ label, value }) => (
  <div className="detail-row">
    <strong>{label}:</strong>
    <span>{value}</span>
  </div>
);

const FormInput = ({ label, name, type = 'text', value, onChange, placeholder, required }) => (
  <div className="form-input-group">
    <label>{label}:{required && ' *'}</label>
    <input
      type={type}
      name={name}
      value={value || ''}
      onChange={onChange}
      className="form-input"
      placeholder={placeholder}
      required={required}
    />
  </div>
);

export default EmployeeModal;
