import React, { useState } from 'react';
import { employeesAPI, tenantV2API, getCurrentUser } from '../services/api';
import { photoService } from '../services/photoService';
import { useLanguage } from '../contexts/LanguageContext';
import './AddEmployeeModal.css';

const GROUP_ROLES = new Set(['group_hr', 'hr_group', 'hr_manager_group', 'global_hr', 'super_admin']);

const COUNTRY_SCHEMA_OPTIONS = [
  { label: 'Tunisia', value: 'public' },
  { label: 'France', value: 'schema_fr' },
  { label: 'China', value: 'schema_cn' },
  { label: 'Germany', value: 'schema_de' },
  { label: 'India', value: 'schema_in' },
  { label: 'Luxembourg', value: 'schema_lu' },
  { label: 'Mexico', value: 'schema_mx' },
  { label: 'South Korea', value: 'schema_kr' }
];

const AddEmployeeModal = ({ isOpen, onClose, onAdd }) => {
  const { t } = useLanguage();
  const user = getCurrentUser();
  const isFranceTenant = (user?.plant || '').toLowerCase().includes('france');
  const isGroupHr = GROUP_ROLES.has((user?.role || '').toLowerCase());
  const defaultTenantSchema = user?.tenant_schema || 'public';

  const [formData, setFormData] = useState({
    matricule: '',
    nom: '',
    prenom: '',
    cin: '',
    passeport: '',
    date_emission_passport: '',
    date_expiration_passport: '',
    date_naissance: '',
    poste: '',
    site_dep: t('headquarters'),
    type_contrat: 'CDI',
    date_debut: '',
    date_fin_contrat: '',
    salaire_brute: '',
    adresse_mail: '',
    mail_responsable1: '',
    mail_responsable2: '',
    tenant_schema: defaultTenantSchema
  });

  const [emergencyContact, setEmergencyContact] = useState({
    nom: '',
    prenom: '',
    relation: '',
    telephone: '',
    email: ''
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return alert('Image invalide');
    if (file.size > 5 * 1024 * 1024) return alert('Image trop volumineuse (max 5MB)');
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving || uploading) return;

    if (!formData.adresse_mail || !isValidEmail(formData.adresse_mail)) return alert('Email employe invalide');
    if (formData.mail_responsable1 && !isValidEmail(formData.mail_responsable1)) return alert('Email responsable 1 invalide');
    if (formData.mail_responsable2 && !isValidEmail(formData.mail_responsable2)) return alert('Email responsable 2 invalide');

    setSaving(true);
    try {
      let photoUrl = photoService.generateDefaultAvatar(formData.nom, formData.prenom);
      if (selectedFile) {
        setUploading(true);
        try {
          const uploadResult = await photoService.uploadEmployeePhoto(selectedFile);
          photoUrl = uploadResult.photoUrl;
        } finally {
          setUploading(false);
        }
      }

      const employeeData = {
        ...formData,
        tenant_schema: formData.tenant_schema || defaultTenantSchema,
        photo: photoUrl,
        mail_responsable1: formData.mail_responsable1 || null,
        mail_responsable2: formData.mail_responsable2 || null
      };

      const response = await employeesAPI.create(employeeData);
      const created = response.data?.data || response.data;

      if (isFranceTenant && emergencyContact.telephone && created?.id) {
        await tenantV2API.saveFranceEmergencyContact(created.id, emergencyContact);
      }

      onAdd(created);
      handleClose();
      alert('Employe cree avec succes');
    } catch (error) {
      const message = error.response?.data?.error || error.message;
      alert(`Erreur creation: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setFormData({
      matricule: '', nom: '', prenom: '', cin: '', passeport: '',
      date_emission_passport: '', date_expiration_passport: '', date_naissance: '',
      poste: '', site_dep: t('headquarters'), type_contrat: 'CDI',
      date_debut: '', date_fin_contrat: '', salaire_brute: '',
      adresse_mail: '', mail_responsable1: '', mail_responsable2: '',
      tenant_schema: defaultTenantSchema
    });
    setEmergencyContact({ nom: '', prenom: '', relation: '', telephone: '', email: '' });
    setSelectedFile(null);
    setPhotoPreview('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="add-modal-overlay" onClick={handleClose}>
      <div className="add-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="add-modal-header">
          <h2>Ajouter un employe</h2>
          <button className="close-btn" onClick={handleClose}>x</button>
        </div>

        <form onSubmit={handleSubmit} className="add-employee-form">
          <div className="form-layout">
            <div className="photo-column">
              <input type="file" accept="image/*" onChange={handleFileSelect} />
              {photoPreview && <img src={photoPreview} alt="preview" className="preview-image" />}
            </div>

            <div className="fields-column">
              <div className="form-group">
                <input name="matricule" value={formData.matricule} onChange={handleInputChange} placeholder="Matricule" required />
                <input name="nom" value={formData.nom} onChange={handleInputChange} placeholder="Nom" required />
                <input name="prenom" value={formData.prenom} onChange={handleInputChange} placeholder="Prenom" required />
                <input name="cin" value={formData.cin} onChange={handleInputChange} placeholder="CIN" required />
                <input name="poste" value={formData.poste} onChange={handleInputChange} placeholder="Poste" required />
                <input name="adresse_mail" value={formData.adresse_mail} onChange={handleInputChange} placeholder="Email employe" required />
                <input name="mail_responsable1" value={formData.mail_responsable1} onChange={handleInputChange} placeholder="Email responsable 1" />
                <input name="mail_responsable2" value={formData.mail_responsable2} onChange={handleInputChange} placeholder="Email responsable 2" />
                {isGroupHr && (
                  <select
                    name="tenant_schema"
                    value={formData.tenant_schema}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Choisir un pays</option>
                    {COUNTRY_SCHEMA_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {isFranceTenant && (
                <div className="form-section">
                  <h3>Contact d'urgence (France)</h3>
                  <div className="form-group">
                    <input value={emergencyContact.nom} onChange={(e) => setEmergencyContact((p) => ({ ...p, nom: e.target.value }))} placeholder="Nom" />
                    <input value={emergencyContact.prenom} onChange={(e) => setEmergencyContact((p) => ({ ...p, prenom: e.target.value }))} placeholder="Prenom" />
                    <input value={emergencyContact.relation} onChange={(e) => setEmergencyContact((p) => ({ ...p, relation: e.target.value }))} placeholder="Relation" />
                    <input value={emergencyContact.telephone} onChange={(e) => setEmergencyContact((p) => ({ ...p, telephone: e.target.value }))} placeholder="Telephone" />
                    <input type="email" value={emergencyContact.email} onChange={(e) => setEmergencyContact((p) => ({ ...p, email: e.target.value }))} placeholder="Email" />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="save-btn" disabled={saving || uploading}>{saving ? 'Creation...' : 'Creer'}</button>
            <button type="button" className="cancel-btn" onClick={handleClose} disabled={saving || uploading}>Annuler</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEmployeeModal;
