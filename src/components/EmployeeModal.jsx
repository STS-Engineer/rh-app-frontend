import React, { useState, useEffect, useCallback, memo } from 'react';
import { employeesAPI, deleteDossierRH } from '../services/api';
import { photoService } from '../services/photoService';
import ArchiveModal from './ArchiveModal';
import DossierRHModal from './DossierRHModal';
import { useLanguage } from '../contexts/LanguageContext';
import './EmployeeModal.css';

/* =========================
   ✅ Composants externes
   ========================= */

const DetailRow = memo(function DetailRow({ label, value }) {
  return (
    <div className="detail-row">
      <strong>{label}:</strong>
      <span>{value}</span>
    </div>
  );
});

const FormInput = memo(function FormInput({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  required,
  step
}) {
  return (
    <div className="form-input-group">
      <label>
        {label}:{required && ' *'}
      </label>
      <input
        type={type}
        name={name}
        value={value ?? ''}
        onChange={onChange}
        className="form-input"
        placeholder={placeholder}
        required={required}
        step={step}
      />
    </div>
  );
});

const FormSelect = memo(function FormSelect({
  label,
  name,
  value,
  onChange,
  options = [],
  required,
  t
}) {
  return (
    <div className="form-input-group">
      <label>
        {label}:{required && ' *'}
      </label>
      <select
        name={name}
        value={value ?? ''}
        onChange={onChange}
        className="form-input"
        required={required}
      >
        <option value="">-- {t('select')} --</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
});

/* =========================
   ✅ Modal de confirmation pour suppression
   ========================= */
const DeleteConfirmationModal = memo(function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  employeeName,
  employeeId,
  deleting,
  t
}) {
  if (!isOpen) return null;

  return (
    <div className="confirmation-modal-overlay" onClick={onClose}>
      <div className="confirmation-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="confirmation-modal-header">
          <h3>⚠️ {t('confirmDeleteDossier')}</h3>
          <button className="close-btn" onClick={onClose} disabled={deleting}>
            ×
          </button>
        </div>
        
        <div className="confirmation-modal-body">
          <div className="warning-icon">
            <span>🗑️</span>
          </div>
          
          <div className="confirmation-details">
            <p><strong>{t('employee')}:</strong> {employeeName}</p>
            <p><strong>{t('employeeID')}:</strong> {employeeId}</p>
          </div>
          
          <div className="confirmation-checkbox">
            <label>
              <input type="checkbox" id="confirm-delete" />
              {t('confirmDeleteCheckbox')}
            </label>
          </div>
        </div>
        
        <div className="confirmation-modal-footer">
          <button
            className="cancel-delete-btn"
            onClick={onClose}
            disabled={deleting}
          >
            {t('cancel')}
          </button>
          <button
            className="confirm-delete-btn"
            onClick={onConfirm}
            disabled={deleting}
          >
            {deleting ? t('deleting') : t('confirmDelete')}
          </button>
        </div>
      </div>
    </div>
  );
});

/* =========================
   ✅ EmployeeModal Principal
   ========================= */

const EmployeeModal = ({ employee, isOpen, onClose, onUpdate, onArchive, refreshParent }) => {
  const { t, language } = useLanguage(); // AJOUT: Récupérer language

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showDossierModal, setShowDossierModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingDossier, setDeletingDossier] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');

  /* ✅ Sync formData */
  useEffect(() => {
    if (!employee) return;
    if (!isOpen) return;
    if (isEditing) return;

    setFormData(employee);
    setSelectedFile(null);
    setPhotoPreview('');
  }, [employee?.id, isOpen, isEditing, employee]);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  }, []);

  const handlePhotoChange = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

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
      reader.onloadend = () => setPhotoPreview(reader.result);
      reader.readAsDataURL(file);
    },
    [t]
  );

  const isValidEmail = useCallback((email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }, []);

  const isValidUrl = useCallback((string) => {
    try {
      new URL(string);
      return true;
    } catch {
      return false;
    }
  }, []);

  const formatDateForInput = useCallback((dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  }, []);

  const formatDateForDisplay = useCallback(
    (dateString) => {
      if (!dateString) return t('notSpecified');
      const date = new Date(dateString);
      if (Number.isNaN(date.getTime())) return t('notSpecified');
      
      // Utiliser la locale basée sur la langue actuelle
      const localeMap = {
        'fr': 'fr-FR',
        'en': 'en-US',
        'zh': 'zh-CN'
      };
      
      return date.toLocaleDateString(localeMap[language] || 'fr-FR');
    },
    [t, language]  // MODIFICATION: Ajouter language
  );

  const getDefaultAvatar = useCallback(() => {
    const prenom = employee?.prenom || '';
    const nom = employee?.nom || '';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      `${prenom} ${nom}`.trim()
    )}&background=3498db&color=fff&size=150`;
  }, [employee?.prenom, employee?.nom]);

  const getPhotoUrl = useCallback(() => {
    if (formData?.photo && isValidUrl(formData.photo)) return formData.photo;
    return getDefaultAvatar();
  }, [formData?.photo, isValidUrl, getDefaultAvatar]);

  const getDocumentUrl = useCallback((dossierRh) => {
    if (!dossierRh) return null;
    if (typeof dossierRh === 'string' && dossierRh.startsWith('http')) return dossierRh;
    return null;
  }, []);

  const isPdfUrl = useCallback((url) => {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    return (
      lowerUrl.endsWith('.pdf') ||
      lowerUrl.includes('.pdf?') ||
      lowerUrl.includes('/pdf') ||
      lowerUrl.includes('application/pdf')
    );
  }, []);

  const truncateUrl = useCallback((url, maxLength) => {
    if (!url) return '';
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + '...';
  }, []);

  const getDocumentDisplayName = useCallback(
    (url) => {
      if (!url) return t('documentPDF');

      try {
        const urlObj = new URL(url);
        const filename = urlObj.pathname.split('/').pop();

        if (filename && filename.includes('.pdf')) return decodeURIComponent(filename);
        return `${t('document')} - ${urlObj.hostname}`;
      } catch {
        return t('documentPDF');
      }
    },
    [t]
  );

  const handleDocumentClick = useCallback(
    (e, url) => {
      e.preventDefault();

      if (!url) {
        alert('❌ ' + t('noDocumentAvailable'));
        return;
      }

      if (!isPdfUrl(url)) {
        if (confirm('⚠️ ' + t('notPDFConfirm'))) {
          window.open(url, '_blank');
        }
        return;
      }

      window.open(url, '_blank');
    },
    [t, isPdfUrl]
  );

  // Fonction pour vérifier si le contrat se termine bientôt
  const isContractEndingSoon = useCallback(() => {
    if (!formData.date_fin_contrat) return false;
    
    const endDate = new Date(formData.date_fin_contrat);
    const today = new Date();
    const thirtyDaysLater = new Date(today);
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
    
    return endDate >= today && endDate <= thirtyDaysLater;
  }, [formData.date_fin_contrat]);

  // Fonction pour calculer les jours restants
  const getDaysRemaining = useCallback(() => {
    if (!formData.date_fin_contrat) return null;
    
    const endDate = new Date(formData.date_fin_contrat);
    const today = new Date();
    const diffTime = endDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }, [formData.date_fin_contrat]);

  const handleSave = useCallback(async () => {
    if (saving) return;

    // Validation emails
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
      let updatedData = { ...formData };

      // Debug: afficher les données envoyées
      console.log('📤 Données envoyées au backend:', JSON.stringify(updatedData, null, 2));

      // upload photo si sélectionnée
      if (selectedFile) {
        try {
          const uploadResult = await photoService.uploadEmployeePhoto(selectedFile);
          updatedData.photo = uploadResult.photoUrl;
        } catch (uploadError) {
          console.error('Photo upload error:', uploadError);
          alert('⚠️ ' + t('photoUploadErrorAlert'));
        }
      }

      const response = await employeesAPI.update(employee.id, updatedData);
      
      // Mettre à jour les données locales
      const updatedEmployee = response.data || response;
      setFormData(updatedEmployee);

      // Fermer le mode édition
      setIsEditing(false);
      setSelectedFile(null);
      setPhotoPreview('');

      // 🔄 Rafraîchir les données dans le composant parent
      if (onUpdate) {
        onUpdate(updatedEmployee);
      }

      // 🔄 Rafraîchir le parent si une fonction est fournie
      if (refreshParent) {
        setTimeout(() => {
          refreshParent();
        }, 100);
      }

      // 🔄 Déclencher un événement global pour informer d'autres composants
      window.dispatchEvent(new CustomEvent('employeeUpdated', {
        detail: { employeeId: employee.id, updatedEmployee }
      }));

      alert('✅ ' + t('changesSaved'));

    } catch (error) {
      console.error('Save error:', error);
      console.error('Response data:', error.response?.data);
      console.error('Response status:', error.response?.status);
      
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.response?.data?.details ||
        error.message;
      alert('❌ ' + t('saveError') + ': ' + errorMessage);
    } finally {
      setSaving(false);
    }
  }, [saving, formData, isValidEmail, t, selectedFile, employee?.id, onUpdate, refreshParent]);

  const handleDeleteDossier = useCallback(async () => {
    if (!employee?.id) return;
    
    try {
      setDeletingDossier(true);
      
      const response = await deleteDossierRH(employee.id);
      
      // Mettre à jour les données locales
      setFormData(prev => ({ ...prev, dossier_rh: null }));
      
      // Informer le parent du changement
      if (onUpdate) {
        onUpdate(response.employee);
      }

      // 🔄 Rafraîchir le parent
      if (refreshParent) {
        refreshParent();
      }

      alert(`✅ ${t('dossierDeletedSuccess')}`);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Erreur suppression dossier RH:', error);
      alert(`❌ ${t('errorDeletingDossier')}: ${error.message}`);
    } finally {
      setDeletingDossier(false);
    }
  }, [employee?.id, t, onUpdate, refreshParent]);

  const confirmDeleteDossier = useCallback(() => {
    const confirmCheckbox = document.getElementById('confirm-delete');
    if (!confirmCheckbox || !confirmCheckbox.checked) {
      alert('❌ ' + t('confirmCheckboxRequired'));
      return;
    }
    
    handleDeleteDossier();
  }, [handleDeleteDossier, t]);

  const handleArchive = useCallback(
    async (pdfUrl, archiveData) => {
      try {
        setSaving(true);

        const token = localStorage.getItem('token');
        if (!token) throw new Error(t('notAuthenticated'));

        const backendUrl = 'https://backend-rh.azurewebsites.net';
        const archiveUrl = `${backendUrl}/api/employees/${employee.id}/archive`;

        let dateDepart = archiveData?.date_depart || formData.date_depart;

        if (dateDepart) {
          const dateObj = new Date(dateDepart);
          if (!Number.isNaN(dateObj.getTime())) {
            dateDepart = dateObj.toISOString().split('T')[0];
          }
        }

        const requestData = {
          pdf_url: pdfUrl,
          entretien_depart: t('archivedDepartureInterview'),
          date_depart: dateDepart
        };

        const response = await fetch(archiveUrl, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          body: JSON.stringify(requestData)
        });

        const responseText = await response.text();

        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          throw new Error(`Réponse serveur invalide: ${responseText.substring(0, 200)}`);
        }

        if (!response.ok) {
          throw new Error(
            data.error ||
              data.details ||
              data.message ||
              `Erreur ${response.status}: ${JSON.stringify(data || {})}`
          );
        }

        if (data.employee) setFormData(data.employee);

        if (onArchive) {
          onArchive(data.employee || { id: employee.id, statut: 'archive' });
        }

        // 🔄 Rafraîchir le parent après archivage
        if (refreshParent) {
          refreshParent();
        }

        setShowArchiveModal(false);
        handleClose();

        alert('✅ ' + t('employeeArchived'));
      } catch (error) {
        console.error('Archive error:', error);

        let errorMessage = error.message;
        if (errorMessage.includes('NetworkError') || errorMessage.includes('Failed to fetch')) {
          errorMessage = t('networkError');
        } else if (errorMessage.includes('Unexpected token')) {
          errorMessage = t('serverErrorContactAdmin');
        } else if (errorMessage.toLowerCase().includes('date')) {
          errorMessage = t('dateFormatError');
        }

        alert(`❌ ${t('archiveError')}: ${errorMessage}`);
      } finally {
        setSaving(false);
      }
    },
    [employee?.id, formData.date_depart, t, onArchive, refreshParent]
  );

  const handleClose = useCallback(() => {
    setIsEditing(false);
    setFormData(employee || {});
    setSelectedFile(null);
    setPhotoPreview('');
    setShowDeleteConfirm(false);
    onClose();
  }, [employee, onClose]);

  // Écouter les événements de mise à jour d'employé
  useEffect(() => {
    const handleEmployeeUpdated = (event) => {
      if (event.detail?.employeeId === employee?.id) {
        console.log('📢 EmployeeModal: Employé mis à jour depuis un autre composant');
        // Vous pourriez rafraîchir les données ici si nécessaire
      }
    };

    window.addEventListener('employeeUpdated', handleEmployeeUpdated);

    return () => {
      window.removeEventListener('employeeUpdated', handleEmployeeUpdated);
    };
  }, [employee?.id]);

  if (!isOpen || !employee) return null;

  const documentUrl = getDocumentUrl(formData.dossier_rh);
  const hasDepartureDate = !!(formData.date_depart && String(formData.date_depart).trim() !== '');
  const currentPhotoUrl = photoPreview || getPhotoUrl();
  const contractEndingSoon = isContractEndingSoon();
  const daysRemaining = getDaysRemaining();

  return (
    <>
      <div className="employee-modal-overlay" onClick={handleClose}>
        <div className="employee-modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="employee-modal-header">
            <h2>👤 {t('employeeDetails')}</h2>
            <button className="close-btn" onClick={handleClose}>
              ×
            </button>
          </div>

          <div className="employee-modal-body">
            {/* En-tête */}
            <div className="employee-header">
              <img
                src={currentPhotoUrl}
                alt={`${formData.prenom} ${formData.nom}`}
                className="employee-photo"
                onError={(e) => {
                  e.currentTarget.src = getDefaultAvatar();
                }}
              />

              <div className="employee-basic-info">
                <h3>
                  {formData.prenom} {formData.nom}
                </h3>
                <p className="employee-matricule">
                  {t('employeeID')}: {formData.matricule}
                </p>
                <p className="employee-poste">{formData.poste}</p>
                <p className="employee-departement">{formData.site_dep}</p>
                <p className="employee-contrat">{formData.type_contrat}</p>
                <p className="employee-email">📧 {formData.adresse_mail || t('emailNotSpecified')}</p>

                {/* Badge alerte fin de contrat */}
                {contractEndingSoon && (
                  <div className="contract-alert-badge">
                    <span className="badge-icon">⚠️</span>
                    <span className="badge-text">{t('contractEndingSoon')}</span>
                    <span className="alert-date">
                      {t('endsOn')}: {formatDateForDisplay(formData.date_fin_contrat)}
                      {daysRemaining > 0 && ` (${daysRemaining} ${t('daysRemaining')})`}
                    </span>
                  </div>
                )}

                {/* Indicateur d'archivage */}
                {formData.statut === 'archive' && (
                  <div className="archive-badge">
                    <span className="badge-icon">📁</span>
                    <span className="badge-text">{t('archived')}</span>
                    {formData.date_depart && (
                      <span className="archive-date">
                        {t('since')}: {formatDateForDisplay(formData.date_depart)}
                      </span>
                    )}
                  </div>
                )}

                {/* Changer photo en mode édition */}
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
                      📷 {t('changePhoto')}
                    </label>

                    {selectedFile && <span className="photo-change-notice">{t('newPhotoSelected')}</span>}
                  </div>
                )}
              </div>
            </div>

            {!isEditing ? (
              /* =========================
                 Mode visualisation
                 ========================= */
              <div className="employee-details-grid">
                <div className="detail-section">
                  <h4>📝 {t('personalInfo')}</h4>
                  <DetailRow label={t('idNumber')} value={formData.cin} />
                  <DetailRow label={t('passport')} value={formData.passeport || t('notSpecified')} />
                  <DetailRow label={t('passportIssueDate')} value={formatDateForDisplay(formData.date_emission_passport)} />
                  <DetailRow label={t('passportExpiryDate')} value={formatDateForDisplay(formData.date_expiration_passport)} />
                  <DetailRow label={t('birthDate')} value={formatDateForDisplay(formData.date_naissance)} />
                </div>

                <div className="detail-section">
                  <h4>💼 {t('professionalInfo')}</h4>
                  <DetailRow label={t('hireDate')} value={formatDateForDisplay(formData.date_debut)} />
                  <DetailRow label={t('contractEndDate')} value={formatDateForDisplay(formData.date_fin_contrat)} />
                  {formData.date_fin_contrat && daysRemaining > 0 && (
                    <DetailRow 
                      label={t('daysRemaining')} 
                      value={
                        <span className={contractEndingSoon ? 'contract-ending-soon' : ''}>
                          {daysRemaining} {t('days')}
                        </span>
                      } 
                    />
                  )}
                  <DetailRow label={t('grossSalary')} value={`${formData.salaire_brute ?? ''} DT`} />
                  <DetailRow label={t('departureDate')} value={formatDateForDisplay(formData.date_depart)} />
                </div>

                <div className="detail-section">
                  <h4>📧 {t('emailContacts')}</h4>
                  <DetailRow label={t('employeeEmail')} value={formData.adresse_mail || t('notSpecified')} />
                  <DetailRow label={t('supervisor1Email')} value={formData.mail_responsable1 || t('notSpecified')} />
                  <DetailRow label={t('supervisor2Email')} value={formData.mail_responsable2 || t('notSpecified')} />
                </div>

                <div className="detail-section">
                  <h4>📎 {t('documents')}</h4>

                  <div className="document-row">
                    <strong>{t('hrFile')}:</strong>
                    <span>
                      {documentUrl ? (
                        <div className="document-container">
                          <div className="document-actions">
                            <a
                              href={documentUrl}
                              onClick={(e) => handleDocumentClick(e, documentUrl)}
                              className="document-link"
                              title={formData.dossier_rh}
                            >
                              📄 {getDocumentDisplayName(formData.dossier_rh)}
                            </a>
                            
                            <button
                              className="delete-dossier-btn"
                              onClick={() => setShowDeleteConfirm(true)}
                              title={t('deleteDossier')}
                            >
                              🗑️
                            </button>
                          </div>
                          
                          <div className="document-preview">
                            <small>🔗 {truncateUrl(formData.dossier_rh, 40)}</small>
                          </div>
                        </div>
                      ) : (
                        <span className="no-document">{t('noDocument')}</span>
                      )}
                    </span>
                  </div>

                  {formData.pdf_archive_url && (
                    <div className="document-row">
                      <strong>{t('departureInterview')}:</strong>
                      <span>
                        <div className="document-container">
                          <a
                            href={formData.pdf_archive_url}
                            onClick={(e) => handleDocumentClick(e, formData.pdf_archive_url)}
                            className="document-link archive-link"
                            title={formData.pdf_archive_url}
                          >
                            📁 {t('interviewPDF')}
                          </a>
                          <div className="document-preview">
                            <small>🔗 {truncateUrl(formData.pdf_archive_url, 40)}</small>
                          </div>
                        </div>
                      </span>
                    </div>
                  )}

                  <div className="dossier-action">
                    <button className="add-dossier-btn" onClick={() => setShowDossierModal(true)}>
                      📁 {t('addUpdateDossier')}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* =========================
                 Mode édition
                 ========================= */
              <div className="edit-form">
                <div className="form-section">
                  <h4>📝 {t('personalInfo')}</h4>
                  <div className="form-grid">
                    <FormInput label={t('employeeID')} name="matricule" value={formData.matricule} onChange={handleInputChange} required />
                    <FormInput label={t('lastName')} name="nom" value={formData.nom} onChange={handleInputChange} required />
                    <FormInput label={t('firstName')} name="prenom" value={formData.prenom} onChange={handleInputChange} required />
                    <FormInput label={t('idNumber')} name="cin" value={formData.cin} onChange={handleInputChange} required />
                    <FormInput label={t('passport')} name="passeport" value={formData.passeport} onChange={handleInputChange} placeholder={t('optional')} />

                    <FormInput
                      label={t('passportIssueDate')}
                      name="date_emission_passport"
                      type="date"
                      value={formatDateForInput(formData.date_emission_passport)}
                      onChange={handleInputChange}
                      placeholder={t('optional')}
                    />
                    <FormInput
                      label={t('passportExpiryDate')}
                      name="date_expiration_passport"
                      type="date"
                      value={formatDateForInput(formData.date_expiration_passport)}
                      onChange={handleInputChange}
                      placeholder={t('optional')}
                    />
                    <FormInput
                      label={t('birthDate')}
                      name="date_naissance"
                      type="date"
                      value={formatDateForInput(formData.date_naissance)}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-section">
                  <h4>💼 {t('professionalInfo')}</h4>
                  <div className="form-grid">
                    <FormInput label={t('position')} name="poste" value={formData.poste} onChange={handleInputChange} required />

                    <FormSelect
                      t={t}
                      label={t('department')}
                      name="site_dep"
                      value={formData.site_dep}
                      onChange={handleInputChange}
                      options={[
                        t('Commerce'),
                        t('Finance'),
                        t('Chiffrage'),
                        t('Digitale'),
                        t('Général'),
                        t('Logistique Germany'),
                        t('Logistique Groupe'),
                        t('Achat'),
                        t('Qualité')
                      ]}
                      required
                    />

                    <FormSelect
                      t={t}
                      label={t('contractType')}
                      name="type_contrat"
                      value={formData.type_contrat}
                      onChange={handleInputChange}
                      options={['CDI', 'CDD', 'CIVP']}
                      required
                    />

                    <FormInput
                      label={t('hireDate')}
                      name="date_debut"
                      type="date"
                      value={formatDateForInput(formData.date_debut)}
                      onChange={handleInputChange}
                      required
                    />

                    {/* NOUVEAU CHAMP - Date fin de contrat */}
                    <FormInput
                      label={t('contractEndDate')}
                      name="date_fin_contrat"
                      type="date"
                      value={formatDateForInput(formData.date_fin_contrat)}
                      onChange={handleInputChange}
                      placeholder={t('optionalForPermanent')}
                    />

                    <FormInput
                      label={t('grossSalary')}
                      name="salaire_brute"
                      type="number"
                      step="0.01"
                      value={formData.salaire_brute}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-section">
                  <h4>📧 {t('emailContacts')}</h4>
                  <div className="form-grid">
                    <FormInput
                      label={t('employeeEmail')}
                      name="adresse_mail"
                      type="email"
                      value={formData.adresse_mail}
                      onChange={handleInputChange}
                      required
                      placeholder="exemple@entreprise.com"
                    />
                    <FormInput
                      label={t('supervisor1Email')}
                      name="mail_responsable1"
                      type="email"
                      value={formData.mail_responsable1}
                      onChange={handleInputChange}
                      placeholder="responsable1@entreprise.com"
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

                {/* Date départ + bouton archiver */}
                <div className="archive-section">
                  <div className="form-grid">
                    <FormInput
                      label={t('departureDate')}
                      name="date_depart"
                      type="date"
                      value={formatDateForInput(formData.date_depart)}
                      onChange={handleInputChange}
                      placeholder={t('optional')}
                    />

                    <div className="archive-row">
                      <button
                        type="button"
                        className={`archive-btn ${!hasDepartureDate ? 'archive-btn-disabled' : ''}`}
                        onClick={() => hasDepartureDate && setShowArchiveModal(true)}
                        disabled={!hasDepartureDate}
                        title={!hasDepartureDate ? t('addDepartureDateFirst') : t('archiveEmployee')}
                      >
                        📁 {t('archiveEmployee')}
                      </button>
                    </div>
                  </div>

                  <p className="archive-hint">{t('archiveHint')}</p>
                </div>
              </div>
            )}
          </div>

          <div className="employee-modal-footer">
            {!isEditing ? (
              <div className="view-actions">
                <button className="edit-btn" onClick={() => setIsEditing(true)}>
                  ✏️ {t('editInfo')}
                </button>
              </div>
            ) : (
              <div className="edit-actions">
                <button className="save-btn" onClick={handleSave} disabled={saving}>
                  {saving ? `⏳ ${t('saving')}` : `💾 ${t('save')}`}
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
                  ❌ {t('cancel')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal archivage */}
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
          if (onUpdate) onUpdate(updatedEmployee);
          if (refreshParent) {
            setTimeout(() => {
              refreshParent();
            }, 100);
          }
        }}
      />

      {/* Modal de confirmation de suppression */}
      <DeleteConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDeleteDossier}
        employeeName={`${employee.prenom} ${employee.nom}`}
        employeeId={employee.matricule}
        deleting={deletingDossier}
        t={t}
      />
    </>
  );
};

export default EmployeeModal;
