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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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

      const response = await employeesAPI.create(formData);
      console.log('✅ Nouvel employé créé:', response.data);
      
      onAdd(response.data);
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
                label="Photo URL" 
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
              disabled={saving}
            >
              {saving ? '⏳ Création...' : '💾 Créer Employé'}
            </button>
            <button 
              type="button" 
              className="cancel-btn"
              onClick={handleClose}
              disabled={saving}
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