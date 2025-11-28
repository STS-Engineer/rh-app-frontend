import React, { useState, useEffect } from 'react';
import { employeesAPI } from '../services/api';
import ArchiveModal from './ArchiveModal';
import DossierRHModal from './DossierRHModal';
import './EmployeeModal.css';

const EmployeeModal = ({ employee, isOpen, onClose, onUpdate, onArchive }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showDossierModal, setShowDossierModal] = useState(false);

  useEffect(() => {
    if (employee) {
      setFormData(employee);
      setPhotoPreview(null);
      setSelectedPhoto(null);
    }
  }, [employee]);

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

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedPhoto(file);
      
      // Créer une preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = async () => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette photo ?')) {
      try {
        setUploadingPhoto(true);
        await employeesAPI.deletePhoto(employee.id);
        
        // Mettre à jour l'état local
        setFormData(prev => ({
          ...prev,
          photo: getDefaultAvatar()
        }));
        setSelectedPhoto(null);
        setPhotoPreview(null);
        
        // Rafraîchir les données
        const updatedEmployee = { ...employee, photo: getDefaultAvatar() };
        onUpdate(updatedEmployee);
        
        alert('✅ Photo supprimée avec succès!');
      } catch (error) {
        console.error('❌ Erreur suppression photo:', error);
        alert('❌ Erreur lors de la suppression: ' + (error.response?.data?.message || error.message));
      } finally {
        setUploadingPhoto(false);
      }
    }
  };

  const uploadEmployeePhoto = async () => {
    if (!selectedPhoto) return;

    setUploadingPhoto(true);
    try {
      const response = await employeesAPI.uploadPhoto(employee.id, selectedPhoto);
      const photoUrl = response.data.photoUrl;
      
      // Mettre à jour l'état local
      setFormData(prev => ({
        ...prev,
        photo: photoUrl
      }));
      setSelectedPhoto(null);
      setPhotoPreview(null);
      
      // Rafraîchir les données
      const updatedEmployee = { ...employee, photo: photoUrl };
      onUpdate(updatedEmployee);
      
      alert('✅ Photo uploadée avec succès!');
      return photoUrl;
    } catch (error) {
      console.error('❌ Erreur upload photo:', error);
      alert('❌ Erreur lors de l\'upload: ' + (error.response?.data?.message || error.message));
      return null;
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    if (saving) return;
    
    setSaving(true);
    try {
      console.log('💾 Sauvegarde des modifications:', formData);
      
      // Uploader la photo d'abord si elle existe
      if (selectedPhoto) {
        await uploadEmployeePhoto();
      }
      
      // Ensuite sauvegarder les autres données
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
    if (photoPreview) return photoPreview;
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
    setSelectedPhoto(null);
    setPhotoPreview(null);
    onClose();
  };

  const truncateUrl = (url, maxLength) => {
    if (!url) return '';
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + '...';
  };

  if (!isOpen || !employee) return null;

  const documentUrl = getDocumentUrl(formData.dossier_rh);
  const hasDepartureDate = formData.date_depart && formData.date_depart.trim() !== '';
  const isUploadedPhoto = formData.photo && formData.photo.includes('/api/photo/');

  return (
    <div className="employee-modal-overlay" onClick={handleClose}>
      <div className="employee-modal-content" onClick={e => e.stopPropagation()}>
        <div className="employee-modal-header">
          <h2>👤 Détails de l'Employé</h2>
          <button className="close-btn" onClick={handleClose}>×</button>
        </div>

        <div className="employee-modal-body">
          {/* En-tête avec photo et informations basiques */}
          <div className="employee-header">
            <div className="photo-section">
              <img 
                src={getPhotoUrl()} 
                alt={`${formData.prenom} ${formData.nom}`}
                className="employee-photo"
                onError={(e) => {
                  e.target.src = getDefaultAvatar();
                }}
              />
              
              {isEditing && (
                <div className="photo-upload-controls">
                  <label className="photo-upload-btn">
                    📸 Changer la photo
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif"
                      onChange={handlePhotoChange}
                      style={{ display: 'none' }}
                    />
                  </label>
                  
                  {(isUploadedPhoto || selectedPhoto) && (
                    <button 
                      type="button" 
                      className="remove-photo-btn"
                      onClick={handleRemovePhoto}
                      disabled={uploadingPhoto}
                    >
                      {uploadingPhoto ? '⏳...' : '🗑️ Supprimer'}
                    </button>
                  )}
                  
                  {selectedPhoto && (
                    <div className="photo-info">
                      <small>Nouveau fichier: {selectedPhoto.name}</small>
                      <small>Taille: {(selectedPhoto.size / 1024 / 1024).toFixed(2)} MB</small>
                    </div>
                  )}
                </div>
              )}
            </div>
            
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
                
                {/* Bouton pour ajouter/mettre à jour le dossier RH */}
                <div className="dossier-action">
                  <button 
                    className="add-dossier-btn"
                    onClick={() => setShowDossierModal(true)}
                  >
                    📁 Ajouter/Mettre à jour le dossier RH
                  </button>
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
                  <FormInput 
                    label="Photo URL (alternative)" 
                    name="photo" 
                    value={formData.photo || ''} 
                    onChange={handleInputChange} 
                    placeholder="https://exemple.com/photo.jpg" 
                  />
                  <FormInput 
                    label="Dossier RH (URL PDF)" 
                    name="dossier_rh" 
                    value={formData.dossier_rh || ''} 
                    onChange={handleInputChange} 
                    placeholder="https://exemple.com/document.pdf" 
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
                disabled={saving || uploadingPhoto}
              >
                {saving ? '⏳ Sauvegarde...' : 
                 uploadingPhoto ? '📸 Upload photo...' : '💾 Sauvegarder'}
              </button>
              <button 
                className="cancel-btn" 
                onClick={() => {
                  setIsEditing(false);
                  setFormData(employee);
                  setSelectedPhoto(null);
                  setPhotoPreview(null);
                }}
                disabled={saving || uploadingPhoto}
              >
                ❌ Annuler
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal d'archivage */}
      <ArchiveModal
        employee={employee}
        isOpen={showArchiveModal}
        onClose={() => setShowArchiveModal(false)}
        onArchive={handleArchive}
      />

      {/* Modal dossier RH */}
      <DossierRHModal
        employee={employee}
        isOpen={showDossierModal}
        onClose={() => setShowDossierModal(false)}
        onSuccess={(updatedEmployee) => {
          setFormData(updatedEmployee);
          onUpdate(updatedEmployee);
        }}
      />
    </div>
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
