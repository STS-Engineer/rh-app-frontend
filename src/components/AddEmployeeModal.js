import React, { useState } from 'react';
import { employeesAPI } from '../services/api';
import './AddEmployeeModal.css';

const AddEmployeeModal = ({ isOpen, onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    matricule: '',
    nom: '',
    prenom: '',
    cin: '',
    passeport: '',
    date_naissance: '',
    poste: '',
    site_dep: 'Siège Central',
    type_contrat: 'CDI',
    date_debut: '',
    salaire_brute: '',
    photo: '',
    dossier_rh: ''
  });
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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

  const handleRemovePhoto = () => {
    setSelectedPhoto(null);
    setPhotoPreview(null);
    setFormData(prev => ({
      ...prev,
      photo: ''
    }));
  };

  const uploadEmployeePhoto = async (employeeId) => {
    if (!selectedPhoto) return null;

    setUploadingPhoto(true);
    try {
      const response = await employeesAPI.uploadPhoto(employeeId, selectedPhoto);
      return response.data.photoUrl;
    } catch (error) {
      console.error('❌ Erreur upload photo:', error);
      return null;
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    setSaving(true);
    try {
      console.log('💾 Création nouvel employé:', formData);
      
      // Validation des champs requis
      if (!formData.matricule || !formData.nom || !formData.prenom || !formData.cin) {
        alert('❌ Veuillez remplir tous les champs obligatoires');
        return;
      }

      // Créer l'employé d'abord
      const response = await employeesAPI.create(formData);
      const newEmployee = response.data;
      console.log('✅ Nouvel employé créé:', newEmployee);

      // Uploader la photo si elle existe
      if (selectedPhoto) {
        console.log('📸 Upload photo pour nouvel employé...');
        const photoUrl = await uploadEmployeePhoto(newEmployee.id);
        if (photoUrl) {
          newEmployee.photo = photoUrl;
        }
      }

      onAdd(newEmployee);
      alert('✅ Employé créé avec succès!');
      
      // Reset du formulaire
      setFormData({
        matricule: '',
        nom: '',
        prenom: '',
        cin: '',
        passeport: '',
        date_naissance: '',
        poste: '',
        site_dep: 'Siège Central',
        type_contrat: 'CDI',
        date_debut: '',
        salaire_brute: '',
        photo: '',
        dossier_rh: ''
      });
      setSelectedPhoto(null);
      setPhotoPreview(null);
      
    } catch (error) {
      console.error('❌ Erreur lors de la création:', error);
      alert('❌ Erreur lors de la création: ' + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setFormData({
      matricule: '',
      nom: '',
      prenom: '',
      cin: '',
      passeport: '',
      date_naissance: '',
      poste: '',
      site_dep: 'Siège Central',
      type_contrat: 'CDI',
      date_debut: '',
      salaire_brute: '',
      photo: '',
      dossier_rh: ''
    });
    setSelectedPhoto(null);
    setPhotoPreview(null);
    onClose();
  };

  const getDefaultAvatar = () => {
    const initiales = (formData.prenom.charAt(0) + formData.nom.charAt(0)).toUpperCase();
    return `https://ui-avatars.com/api/?name=${initiales}&background=3498db&color=fff&size=150`;
  };

  const getPhotoUrl = () => {
    if (photoPreview) return photoPreview;
    if (formData.photo) return formData.photo;
    return getDefaultAvatar();
  };

  if (!isOpen) return null;

  return (
    <div className="add-modal-overlay" onClick={handleClose}>
      <div className="add-modal-content" onClick={e => e.stopPropagation()}>
        <div className="add-modal-header">
          <h2>➕ Ajouter un Nouvel Employé</h2>
          <button className="close-btn" onClick={handleClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="add-employee-form">
          {/* Section Photo */}
          <div className="photo-section">
            <div className="photo-upload-container">
              <img 
                src={getPhotoUrl()} 
                alt="Preview" 
                className="employee-photo-preview"
              />
              <div className="photo-upload-controls">
                <label className="photo-upload-btn">
                  📸 Choisir une photo
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif"
                    onChange={handlePhotoChange}
                    style={{ display: 'none' }}
                  />
                </label>
                {selectedPhoto && (
                  <button 
                    type="button" 
                    className="remove-photo-btn"
                    onClick={handleRemovePhoto}
                  >
                    🗑️ Supprimer
                  </button>
                )}
                {selectedPhoto && (
                  <div className="photo-info">
                    <small>Fichier: {selectedPhoto.name}</small>
                    <small>Taille: {(selectedPhoto.size / 1024 / 1024).toFixed(2)} MB</small>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-column">
              <FormInput 
                label="Matricule *" 
                name="matricule" 
                value={formData.matricule} 
                onChange={handleInputChange} 
                required 
              />
              <FormInput 
                label="Nom *" 
                name="nom" 
                value={formData.nom} 
                onChange={handleInputChange} 
                required 
              />
              <FormInput 
                label="Prénom *" 
                name="prenom" 
                value={formData.prenom} 
                onChange={handleInputChange} 
                required 
              />
              <FormInput 
                label="CIN *" 
                name="cin" 
                value={formData.cin} 
                onChange={handleInputChange} 
                required 
              />
              <FormInput 
                label="Passeport" 
                name="passeport" 
                value={formData.passeport} 
                onChange={handleInputChange} 
                placeholder="Optionnel" 
              />
              <FormInput 
                label="Date de Naissance *" 
                name="date_naissance" 
                type="date" 
                value={formData.date_naissance} 
                onChange={handleInputChange} 
                required 
              />
            </div>

            <div className="form-column">
              <FormInput 
                label="Poste *" 
                name="poste" 
                value={formData.poste} 
                onChange={handleInputChange} 
                required 
              />
              
              <FormSelect 
                label="Site/Département *" 
                name="site_dep" 
                value={formData.site_dep} 
                onChange={handleInputChange}
                options={[
                  'Siège Central',
                  'Site Nord', 
                  'Site Sud',
                  'Site Est',
                  'Site Ouest',
                  'Direction RH',
                  'IT Department'
                ]}
                required 
              />
              
              <FormSelect 
                label="Type de Contrat *" 
                name="type_contrat" 
                value={formData.type_contrat} 
                onChange={handleInputChange}
                options={['CDI', 'CDD', 'Stage', 'Freelance']}
                required 
              />
              
              <FormInput 
                label="Date Début *" 
                name="date_debut" 
                type="date" 
                value={formData.date_debut} 
                onChange={handleInputChange} 
                required 
              />
              <FormInput 
                label="Salaire Brut *" 
                name="salaire_brute" 
                type="number" 
                step="0.01" 
                value={formData.salaire_brute} 
                onChange={handleInputChange} 
                required 
              />
              <FormInput 
                label="Photo URL (alternative)" 
                name="photo" 
                value={formData.photo} 
                onChange={handleInputChange} 
                placeholder="https://exemple.com/photo.jpg" 
              />
            </div>
          </div>

          <FormInput 
            label="Dossier RH (URL PDF)" 
            name="dossier_rh" 
            value={formData.dossier_rh} 
            onChange={handleInputChange} 
            placeholder="https://exemple.com/document.pdf" 
            fullWidth 
          />

          <div className="form-actions">
            <button 
              type="submit" 
              className="save-btn"
              disabled={saving || uploadingPhoto}
            >
              {saving ? '⏳ Création...' : 
               uploadingPhoto ? '📸 Upload photo...' : '💾 Créer Employé'}
            </button>
            <button 
              type="button" 
              className="cancel-btn"
              onClick={handleClose}
              disabled={saving || uploadingPhoto}
            >
              ❌ Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const FormInput = ({ label, name, type = 'text', value, onChange, placeholder, required, fullWidth }) => (
  <div className={`form-row ${fullWidth ? 'full-width' : ''}`}>
    <label>{label}</label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      className="form-input"
      placeholder={placeholder}
      required={required}
    />
  </div>
);

const FormSelect = ({ label, name, value, onChange, options, required }) => (
  <div className="form-row">
    <label>{label}</label>
    <select
      name={name}
      value={value}
      onChange={onChange}
      className="form-select"
      required={required}
    >
      {options.map(option => (
        <option key={option} value={option}>{option}</option>
      ))}
    </select>
  </div>
);

export default AddEmployeeModal;
