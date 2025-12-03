import React, { useState } from 'react';
import { employeesAPI } from '../services/api';
import { photoService } from '../services/photoService';
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
    salaire_brute: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Vérifier le type de fichier
      if (!file.type.startsWith('image/')) {
        alert('❌ Veuillez sélectionner une image (jpg, png, gif)');
        return;
      }
      
      // Vérifier la taille (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('❌ La taille de l\'image ne doit pas dépasser 5MB');
        return;
      }
      
      setSelectedFile(file);
      
      // Créer un preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving || uploading) return;

    setSaving(true);
    try {
      console.log('💾 Création nouvel employé');
      
      // Validation des champs requis
      if (!formData.matricule || !formData.nom || !formData.prenom || !formData.cin) {
        alert('❌ Veuillez remplir tous les champs obligatoires');
        setSaving(false);
        return;
      }

      let photoUrl = '';
      
      // 1. Upload de la photo si sélectionnée
      if (selectedFile) {
        setUploading(true);
        try {
          const uploadResult = await photoService.uploadEmployeePhoto(selectedFile);
          photoUrl = uploadResult.photoUrl;
          console.log('✅ Photo uploadée:', photoUrl);
        } catch (uploadError) {
          console.error('❌ Erreur upload photo:', uploadError);
          alert('⚠️ Erreur lors de l\'upload de la photo. Utilisation d\'un avatar par défaut.');
          // En cas d'erreur d'upload, utiliser avatar par défaut
          photoUrl = photoService.generateDefaultAvatar(formData.nom, formData.prenom);
        } finally {
          setUploading(false);
        }
      } else {
        // Pas de photo, utiliser avatar par défaut
        photoUrl = photoService.generateDefaultAvatar(formData.nom, formData.prenom);
      }

      // 2. Créer l'employé avec l'URL de la photo
      const employeeData = {
        ...formData,
        photo: photoUrl
      };

      const response = await employeesAPI.create(employeeData);
      console.log('✅ Nouvel employé créé:', response.data);
      
      onAdd(response.data);
      alert('✅ Employé créé avec succès!');
      
      // Reset du formulaire
      handleClose();
      
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
      salaire_brute: ''
    });
    setSelectedFile(null);
    setPhotoPreview('');
    onClose();
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
          <div className="form-grid">
            <div className="form-column">
              {/* Section photo */}
              <div className="photo-upload-section">
                <label>📷 Photo de l'employé</label>
                <div className="photo-upload-area">
                  {photoPreview ? (
                    <div className="photo-preview">
                      <img src={photoPreview} alt="Preview" />
                      <button 
                        type="button" 
                        className="remove-photo-btn"
                        onClick={() => {
                          setSelectedFile(null);
                          setPhotoPreview('');
                        }}
                      >
                        ✕ Supprimer
                      </button>
                    </div>
                  ) : (
                    <div className="photo-placeholder">
                      <div className="upload-instructions">
                        <span className="upload-icon">📷</span>
                        <p>Cliquez pour sélectionner une photo</p>
                        <small>JPG, PNG, GIF (max 5MB)</small>
                      </div>
                      <input
                        type="file"
                        id="photo-upload"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="file-input"
                      />
                      <label htmlFor="photo-upload" className="upload-label">
                        📤 Choisir une photo
                      </label>
                    </div>
                  )}
                </div>
              </div>

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
            </div>

            <div className="form-column">
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
              <FormInput 
                label="Poste *" 
                name="poste" 
                value={formData.poste} 
                onChange={handleInputChange} 
                required 
              />
            </div>

            <div className="form-column">
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
                options={['CDI', 'CDD', 'Stage', 'CVP']}
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
            </div>
          </div>

          <div className="form-actions">
            <button 
              type="submit" 
              className="save-btn"
              disabled={saving || uploading}
            >
              {uploading ? '📤 Upload photo...' : 
               saving ? '⏳ Création...' : 
               '💾 Créer Employé'}
            </button>
            <button 
              type="button" 
              className="cancel-btn"
              onClick={handleClose}
              disabled={saving || uploading}
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
