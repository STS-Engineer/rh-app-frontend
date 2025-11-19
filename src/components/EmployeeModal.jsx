import React, { useState, useEffect, useRef } from 'react';
import { employeesAPI } from '../services/api';
import ArchiveModal from './ArchiveModal';
import './EmployeeModal.css';

// URL de l'API - Configuration pour Azure
const API_URL = process.env.REACT_APP_API_URL || 'https://avo-hr-managment.azurewebsites.net';

const EmployeeModal = ({ employee, isOpen, onClose, onUpdate, onArchive }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (employee) {
      setFormData(employee);
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

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    console.log('📎 Fichier sélectionné:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    // Vérifier le type de fichier
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      alert('❌ Type de fichier non autorisé. Veuillez choisir un PDF ou une image (JPG, PNG, GIF).');
      return;
    }

    // Vérifier la taille (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      alert('❌ Le fichier est trop volumineux. Taille maximale : 10MB');
      return;
    }

    setUploading(true);

    try {
      console.log('📤 Upload du dossier RH pour employé ID:', employee.id);
      
      // Utiliser la méthode uploadDossierRH de l'API
      const response = await employeesAPI.uploadDossierRH(employee.id, file);
      
      console.log('✅ Dossier uploadé avec succès:', response.data);

      // Mettre à jour l'état local
      setFormData(prev => ({
        ...prev,
        dossier_rh: response.data.filePath
      }));

      // Mettre à jour la liste des employés
      onUpdate(response.data.employee);

      alert('✅ Dossier RH uploadé avec succès!');
      
    } catch (error) {
      console.error('❌ Erreur upload:', error);
      alert('❌ Erreur lors de l\'upload du dossier: ' + (error.response?.data?.error || error.message));
    } finally {
      setUploading(false);
      // Réinitialiser l'input file
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
    
    // Si c'est un chemin local (/public/...)
    if (dossierRh.startsWith('/public/')) {
      return `${API_URL}${dossierRh}`;
    }
    
    // Si c'est déjà une URL complète
    if (dossierRh.startsWith('http')) {
      return dossierRh;
    }
    
    return null;
  };

  const getDocumentDisplayName = (url) => {
    if (!url) return 'Document';
    
    try {
      // Si c'est un chemin local
      if (url.startsWith('/public/')) {
        const filename = url.split('/').pop();
        return decodeURIComponent(filename);
      }
      
      // Si c'est une URL
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = pathname.split('/').pop();
      
      if (filename) {
        return decodeURIComponent(filename);
      }
      
      return `Document - ${urlObj.hostname}`;
    } catch {
      const filename = url.split('/').pop();
      return decodeURIComponent(filename) || 'Document';
    }
  };

  const handleDocumentClick = (e, url) => {
    e.preventDefault();
    
    if (!url) {
      alert('❌ Aucun document disponible');
      return;
    }

    console.log('📄 Ouverture document:', url);
    window.open(url, '_blank', 'noopener,noreferrer');
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

  if (!isOpen || !employee) return null;

  const documentUrl = getDocumentUrl(formData.dossier_rh);
  const hasDepartureDate = formData.date_depart && formData.date_depart.trim() !== '';

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
                
                {/* Bouton pour ajouter/modifier le dossier RH */}
                <div className="upload-section" style={{ marginTop: '15px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.gif,image/*"
                    capture="environment"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                  <button
                    className="upload-dossier-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    style={{
                      padding: '12px 24px',
                      backgroundColor: uploading ? '#95a5a6' : '#3498db',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: uploading ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      transition: 'all 0.3s ease',
                      width: '100%',
                      boxShadow: uploading ? 'none' : '0 2px 4px rgba(52, 152, 219, 0.3)'
                    }}
                    onMouseOver={(e) => {
                      if (!uploading) {
                        e.target.style.backgroundColor = '#2980b9';
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 4px 8px rgba(52, 152, 219, 0.4)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!uploading) {
                        e.target.style.backgroundColor = '#3498db';
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 2px 4px rgba(52, 152, 219, 0.3)';
                      }
                    }}
                  >
                    {uploading ? '⏳ Upload en cours...' : '📤 Ajouter/Modifier Dossier RH'}
                  </button>
                  <p style={{ 
                    fontSize: '12px', 
                    color: '#7f8c8d', 
                    marginTop: '10px', 
                    marginBottom: '0',
                    textAlign: 'center',
                    lineHeight: '1.5'
                  }}>
                    📱 Formats acceptés: PDF, JPG, PNG, GIF (max 10MB)<br/>
                    📸 Vous pouvez prendre une photo directement depuis votre appareil
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
                    placeholder="https://exemple.com/document.pdf ou /public/..." 
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

      {/* Modal d'archivage */}
      <ArchiveModal
        employee={employee}
        isOpen={showArchiveModal}
        onClose={() => setShowArchiveModal(false)}
        onArchive={handleArchive}
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
