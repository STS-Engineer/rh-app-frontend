import React, { useState } from 'react';
import { employeesAPI } from '../services/api';
import { photoService } from '../services/photoService';
import { useLanguage } from '../contexts/LanguageContext';
import './AddEmployeeModal.css';

const AddEmployeeModal = ({ isOpen, onClose, onAdd }) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    matricule: '',
    nom: '',
    prenom: '',
    cin: '',
    passeport: '',
    date_naissance: '',
    poste: '',
    site_dep: t('headquarters'),
    type_contrat: 'CDI',
    date_debut: '',
    salaire_brute: '',
    adresse_mail: '',
    mail_responsable1: '',
    mail_responsable2: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('❌ ' + t('selectImage'));
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        alert('❌ ' + t('fileSizeExceeded'));
        return;
      }
      
      setSelectedFile(file);
      
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

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving || uploading) return;

    if (!formData.adresse_mail || !isValidEmail(formData.adresse_mail)) {
      alert('❌ ' + t('validEmployeeEmail'));
      return;
    }
    
    if (formData.mail_responsable1 && !isValidEmail(formData.mail_responsable1)) {
      alert('❌ ' + t('validSupervisor1Email'));
      return;
    }
    
    if (formData.mail_responsable2 && !isValidEmail(formData.mail_responsable2)) {
      alert('❌ ' + t('validSupervisor2Email'));
      return;
    }

    setSaving(true);
    try {
      if (!formData.matricule || !formData.nom || !formData.prenom || 
          !formData.cin || !formData.adresse_mail) {
        alert('❌ ' + t('fillRequiredFields'));
        setSaving(false);
        return;
      }

      let photoUrl = '';
      
      if (selectedFile) {
        setUploading(true);
        try {
          const uploadResult = await photoService.uploadEmployeePhoto(selectedFile);
          photoUrl = uploadResult.photoUrl;
        } catch (uploadError) {
          console.error('❌ ' + t('photoUploadError'), uploadError);
          alert('⚠️ ' + t('photoUploadErrorAlert'));
          photoUrl = photoService.generateDefaultAvatar(formData.nom, formData.prenom);
        } finally {
          setUploading(false);
        }
      } else {
        photoUrl = photoService.generateDefaultAvatar(formData.nom, formData.prenom);
      }

      const employeeData = {
        ...formData,
        photo: photoUrl,
        mail_responsable1: formData.mail_responsable1 || null,
        mail_responsable2: formData.mail_responsable2 || null
      };

      const response = await employeesAPI.create(employeeData);
      
      onAdd(response.data);
      alert('✅ ' + t('employeeCreated'));
      
      handleClose();
      
    } catch (error) {
      console.error('❌ ' + t('creationError'), error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message;
      alert('❌ ' + t('creationError') + ': ' + errorMessage);
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
      site_dep: t('headquarters'),
      type_contrat: 'CDI',
      date_debut: '',
      salaire_brute: '',
      adresse_mail: '',
      mail_responsable1: '',
      mail_responsable2: ''
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
          <h2>➕ {t('addNewEmployee')}</h2>
          <button className="close-btn" onClick={handleClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="add-employee-form">
          <div className="form-grid">
            <div className="form-column">
              <div className="photo-upload-section">
                <label>📷 {t('employeePhoto')}</label>
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
                        ✕ {t('removePhoto')}
                      </button>
                    </div>
                  ) : (
                    <div className="photo-placeholder">
                      <div className="upload-instructions">
                        <span className="upload-icon">📷</span>
                        <p>{t('clickToSelectPhoto')}</p>
                        <small>{t('photoRequirements')}</small>
                      </div>
                      <input
                        type="file"
                        id="photo-upload"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="file-input"
                      />
                      <label htmlFor="photo-upload" className="upload-label">
                        📤 {t('choosePhoto')}
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <FormInput 
                label={`${t('employeeID')} *`} 
                name="matricule" 
                value={formData.matricule} 
                onChange={handleInputChange} 
                required 
              />
              <FormInput 
                label={`${t('lastName')} *`} 
                name="nom" 
                value={formData.nom} 
                onChange={handleInputChange} 
                required 
              />
              <FormInput 
                label={`${t('firstName')} *`} 
                name="prenom" 
                value={formData.prenom} 
                onChange={handleInputChange} 
                required 
              />
              <FormInput 
                label={`${t('employeeEmail')} *`} 
                name="adresse_mail" 
                type="email"
                value={formData.adresse_mail} 
                onChange={handleInputChange} 
                required 
                placeholder="exemple@entreprise.com"
              />
            </div>

            <div className="form-column">
              <FormInput 
                label={`${t('idNumber')} *`} 
                name="cin" 
                value={formData.cin} 
                onChange={handleInputChange} 
                required 
              />
              <FormInput 
                label={t('passport')} 
                name="passeport" 
                value={formData.passeport} 
                onChange={handleInputChange} 
                placeholder={t('optional')} 
              />
              <FormInput 
                label={`${t('birthDate')} *`} 
                name="date_naissance" 
                type="date" 
                value={formData.date_naissance} 
                onChange={handleInputChange} 
                required 
              />
              <FormInput 
                label={`${t('position')} *`} 
                name="poste" 
                value={formData.poste} 
                onChange={handleInputChange} 
                required 
              />
              <FormInput 
                label={t('supervisor1Email')} 
                name="mail_responsable1" 
                type="email"
                value={formData.mail_responsable1} 
                onChange={handleInputChange} 
                placeholder="responsable1@entreprise.com"
              />
            </div>

            <div className="form-column">
              <FormSelect 
                label={`${t('department')} *`} 
                name="site_dep" 
                value={formData.site_dep} 
                onChange={handleInputChange}
                options={[
                  t('headquarters'),
                  t('northSite'), 
                  t('southSite'),
                  t('eastSite'),
                  t('westSite'),
                  t('hrDepartment'),
                  t('itDepartment')
                ]}
                required 
              />
              
              <FormSelect 
                label={`${t('contractType')} *`} 
                name="type_contrat" 
                value={formData.type_contrat} 
                onChange={handleInputChange}
                options={['CDI', 'CDD', t('internship'), 'CIVP']}
                required 
              />
              
              <FormInput 
                label={`${t('startDate')} *`} 
                name="date_debut" 
                type="date" 
                value={formData.date_debut} 
                onChange={handleInputChange} 
                required 
              />
              <FormInput 
                label={`${t('grossSalary')} *`} 
                name="salaire_brute" 
                type="number" 
                step="0.01" 
                value={formData.salaire_brute} 
                onChange={handleInputChange} 
                required 
              />
              <FormInput 
                label={t('supervisor2Email')} 
                name="mail_responsable2" 
                type="email"
                value={formData.mail_responsable2} 
                onChange={handleInputChange} 
                placeholder="responsable2@entreprise.com"
              />
            </div>
          </div>

          <div className="form-actions">
            <button 
              type="submit" 
              className="save-btn"
              disabled={saving || uploading}
            >
              {uploading ? `📤 ${t('uploadingPhoto')}` : 
               saving ? `⏳ ${t('creating')}` : 
               `💾 ${t('createEmployee')}`}
            </button>
            <button 
              type="button" 
              className="cancel-btn"
              onClick={handleClose}
              disabled={saving || uploading}
            >
              ❌ {t('cancel')}
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
