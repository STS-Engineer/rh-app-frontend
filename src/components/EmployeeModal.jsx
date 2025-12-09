import React, { useState, useEffect } from 'react';
import { employeesAPI } from '../services/api';
import { photoService } from '../services/photoService';
import ArchiveModal from './ArchiveModal';
import DossierRHModal from './DossierRHModal';
import './EmployeeModal.css';

const EmployeeModal = ({ employee, isOpen, onClose, onUpdate, onArchive }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showDossierModal, setShowDossierModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');

  useEffect(() => {
    if (employee) {
      setFormData(employee);
      setSelectedFile(null);
      setPhotoPreview('');
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
      if (!file.type.startsWith('image/')) {
        alert('❌ Veuillez sélectionner une image');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        alert('❌ La taille ne doit pas dépasser 5MB');
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

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSave = async () => {
    if (saving) return;
    
    // Validation des emails
    if (!formData.adresse_mail || !isValidEmail(formData.adresse_mail)) {
      alert('❌ Veuillez entrer une adresse email valide pour l\'employé');
      return;
    }
    
    if (formData.mail_responsable1 && !isValidEmail(formData.mail_responsable1)) {
      alert('❌ Veuillez entrer une adresse email valide pour le responsable 1');
      return;
    }
    
    if (formData.mail_responsable2 && !isValidEmail(formData.mail_responsable2)) {
      alert('❌ Veuillez entrer une adresse email valide pour le responsable 2');
      return;
    }
    
    setSaving(true);
    try {
      console.log('💾 Sauvegarde des modifications');
      
      let updatedData = { ...formData };
      
      // Si nouvelle photo sélectionnée
      if (selectedFile) {
        try {
          console.log('📤 Upload nouvelle photo...');
          const uploadResult = await photoService.uploadEmployeePhoto(selectedFile);
          updatedData.photo = uploadResult.photoUrl;
          console.log('✅ Nouvelle photo uploadée:', updatedData.photo);
        } catch (uploadError) {
          console.error('❌ Erreur upload photo:', uploadError);
          alert('⚠️ Erreur upload photo. Ancienne photo conservée.');
        }
      }
      
      const response = await employeesAPI.update(employee.id, updatedData);
      console.log('✅ Employé mis à jour:', response.data);
      
      onUpdate(response.data);
      setIsEditing(false);
      setSelectedFile(null);
      setPhotoPreview('');
      
      alert('✅ Modifications sauvegardées avec succès!');
      
    } catch (error) {
      console.error('❌ Erreur sauvegarde:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message;
      alert('❌ Erreur sauvegarde: ' + errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (pdfUrl) => {
    try {
      setSaving(true);
      
      console.log('📁 Archivage employé avec PDF URL:', pdfUrl);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Non authentifié. Veuillez vous reconnecter.');
      }
      
      const backendUrl = 'https://backend-rh.azurewebsites.net';
      const archiveUrl = `${backendUrl}/api/employees/${employee.id}/archive`;
      
      console.log('📤 Requête vers:', archiveUrl);
      
      const response = await fetch(archiveUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pdf_url: pdfUrl,
          entretien_depart: 'Entretien de départ archivé'
        })
      });

      const contentType = response.headers.get('content-type');
      let data;

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.error('❌ Réponse non-JSON:', text.substring(0, 200));
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(`Erreur serveur (${response.status}): ${text.substring(0, 100)}`);
        }
      }

      if (!response.ok) {
        console.error('❌ Erreur réponse:', data);
        throw new Error(data.error || data.message || `Erreur ${response.status}`);
      }

      console.log('✅ Archivage réussi:', data);
      
      if (data.employee) {
        setFormData(data.employee);
      }
      
      onArchive(data.employee || { id: employee.id, statut: 'archive' });
      
      setShowArchiveModal(false);
      onClose();
      
      alert('✅ Employé archivé avec succès! Le PDF a été joint au dossier.');
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'archivage:', error);
      
      let errorMessage = error.message;
      
      if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
        errorMessage = 'Erreur réseau. Vérifiez votre connexion.';
      } else if (error.message.includes('Unexpected token')) {
        errorMessage = 'Erreur serveur. Contactez l\'administrateur.';
      }
      
      alert(`❌ Erreur lors de l'archivage: ${errorMessage}`);
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
    setSelectedFile(null);
    setPhotoPreview('');
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
  const currentPhotoUrl = photoPreview || getPhotoUrl();

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
              src={currentPhotoUrl} 
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
              <p className="employee-email">📧 {formData.adresse_mail || 'Email non renseigné'}</p>
              
              {/* Indicateur d'archivage */}
              {formData.statut === 'archive' && (
                <div className="archive-badge">
                  <span className="badge-icon">📁</span>
                  <span className="badge-text">Archivé</span>
                  {formData.date_depart && (
                    <span className="archive-date">
                      Depuis: {formatDateForDisplay(formData.date_depart)}
                    </span>
                  )}
                </div>
              )}
              
              {/* Bouton pour changer la photo en mode édition */}
              {isEditing && (
                <div className="photo-change-section">
                  <input
                    type="file"
                    id="change-photo"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="file-input"
                  />
                  <label htmlFor="change-photo" className="change-photo-btn">
                    📷 Changer la photo
                  </label>
                  {selectedFile && (
                    <span className="photo-change-notice">
                      Nouvelle photo sélectionnée
                    </span>
                  )}
                </div>
              )}
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
                <DetailRow label="Salaire brut" value={`${formData.salaire_brute} DT`} />
                <DetailRow label="Date de départ" value={formatDateForDisplay(formData.date_depart)} />
              </div>

              <div className="detail-section">
                <h4>📧 Coordonnées Email</h4>
                <DetailRow label="Email employé" value={formData.adresse_mail || 'Non renseigné'} />
                <DetailRow label="Email Responsable 1" value={formData.mail_responsable1 || 'Non renseigné'} />
                <DetailRow label="Email Responsable 2" value={formData.mail_responsable2 || 'Non renseigné'} />
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
                
                {/* Document d'archive PDF */}
                {formData.pdf_archive_url && (
                  <div className="document-row">
                    <strong>Entretien de départ:</strong>
                    <span>
                      <div className="document-container">
                        <a 
                          href={formData.pdf_archive_url} 
                          onClick={(e) => handleDocumentClick(e, formData.pdf_archive_url)}
                          className="document-link archive-link"
                          title={formData.pdf_archive_url}
                        >
                          📁 PDF d'entretien
                        </a>
                        <div className="document-preview">
                          <small>🔗 {truncateUrl(formData.pdf_archive_url, 40)}</small>
                        </div>
                      </div>
                    </span>
                  </div>
                )}
                
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
                  <FormInput 
                    label="Date de naissance" 
                    name="date_naissance" 
                    type="date" 
                    value={formatDateForInput(formData.date_naissance)} 
                    onChange={handleInputChange} 
                    required 
                  />
                </div>
              </div>

              <div className="form-section">
                <h4>💼 Informations Professionnelles</h4>
                <div className="form-grid">
                  <FormInput label="Poste" name="poste" value={formData.poste} onChange={handleInputChange} required />
                  <FormSelect 
                    label="Site/Département" 
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
                    label="Type de Contrat" 
                    name="type_contrat" 
                    value={formData.type_contrat} 
                    onChange={handleInputChange}
                    options={['CDI', 'CDD', 'Stage', 'CIVP']}
                    required 
                  />
                  <FormInput 
                    label="Date d'embauche" 
                    name="date_debut" 
                    type="date" 
                    value={formatDateForInput(formData.date_debut)} 
                    onChange={handleInputChange} 
                    required 
                  />
                  <FormInput 
                    label="Salaire brut" 
                    name="salaire_brute" 
                    type="number" 
                    step="0.01" 
                    value={formData.salaire_brute} 
                    onChange={handleInputChange} 
                    required 
                  />
                  {/* ⚠️ On enlève la date de départ d'ici */}
                </div>
              </div>

              <div className="form-section">
                <h4>📧 Coordonnées Email</h4>
                <div className="form-grid">
                  <FormInput 
                    label="Email employé *" 
                    name="adresse_mail" 
                    type="email"
                    value={formData.adresse_mail} 
                    onChange={handleInputChange} 
                    required 
                    placeholder="exemple@entreprise.com"
                  />
                  <FormInput 
                    label="Email Responsable 1" 
                    name="mail_responsable1" 
                    type="email"
                    value={formData.mail_responsable1} 
                    onChange={handleInputChange} 
                    placeholder="responsable1@entreprise.com"
                  />
                  <FormInput 
                    label="Email Responsable 2" 
                    name="mail_responsable2" 
                    type="email"
                    value={formData.mail_responsable2} 
                    onChange={handleInputChange} 
                    placeholder="responsable2@entreprise.com"
                  />
                </div>
              </div>

              {/* Section Date de départ + Archiver côte à côte */}
            <div className="archive-section">
              <div className="form-grid">
                <FormInput
                  label="Date de départ"
                  name="date_depart"
                  type="date"
                  value={formatDateForInput(formData.date_depart)}
                  onChange={handleInputChange}
                  placeholder="Optionnel"
                />

                <div className="archive-row">
                  <button 
                    type="button"
                    className={`archive-btn ${!hasDepartureDate ? 'archive-btn-disabled' : ''}`}
                    onClick={() => hasDepartureDate && setShowArchiveModal(true)}
                    disabled={!hasDepartureDate}
                  >
                    📁 Archiver l'employé
                  </button>
                </div>
              </div>

              <p className="archive-hint">
                Ajouter une date de départ pour pouvoir archiver l'employé avec son entretien de départ.
              </p>
            </div>
            </div>
          )}
        </div>

        <div className="employee-modal-footer">
          {!isEditing ? (
            <div className="view-actions">
              <button className="edit-btn" onClick={() => setIsEditing(true)}>
                ✏️ Modifier les informations
              </button>
            </div>
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
                  setSelectedFile(null);
                  setPhotoPreview('');
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
        departureDate={formData.date_depart}
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

const FormSelect = ({ label, name, value, onChange, options = [], required }) => (
  <div className="form-input-group">
    <label>{label}:{required && ' *'}</label>
    <select 
      name={name}
      value={value || ''}
      onChange={onChange}
      className="form-input"
      required={required}
    >
      <option value="">-- Sélectionner --</option>
      {options.map((opt, index) => (
        <option key={index} value={opt}>{opt}</option>
      ))}
    </select>
  </div>
);

export default EmployeeModal;
