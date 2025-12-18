import React, { useState, useEffect, useCallback, memo } from 'react';
import { employeesAPI } from '../services/api';
import { photoService } from '../services/photoService';
import ArchiveModal from './ArchiveModal';
import DossierRHModal from './DossierRHModal';
import { useLanguage } from '../contexts/LanguageContext';
import './EmployeeModal.css';

/* =========================
   ✅ Composants externes (ne pas définir dans EmployeeModal)
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
   ✅ EmployeeModal
   ========================= */

const EmployeeModal = ({ employee, isOpen, onClose, onUpdate, onArchive }) => {
  const { t } = useLanguage();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showDossierModal, setShowDossierModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');

  /* ✅ Sync formData: seulement quand on ouvre / change d’employé,
     et surtout PAS pendant la saisie (sinon reset + focus issues) */
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
      return date.toLocaleDateString();
    },
    [t]
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
      onUpdate(response.data);

      setIsEditing(false);
      setSelectedFile(null);
      setPhotoPreview('');

      alert('✅ ' + t('changesSaved'));
    } catch (error) {
      console.error('Save error:', error);
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message;
      alert('❌ ' + t('saveError') + ': ' + errorMessage);
    } finally {
      setSaving(false);
    }
  }, [saving, formData, isValidEmail, t, selectedFile, employee?.id, onUpdate]);

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

        onArchive(data.employee || { id: employee.id, statut: 'archive' });

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
    [employee?.id, formData.date_depart, t, onArchive]
  );

  const handleClose = useCallback(() => {
    setIsEditing(false);
    setFormData(employee || {});
    setSelectedFile(null);
    setPhotoPreview('');
    onClose();
  }, [employee, onClose]);

  if (!isOpen || !employee) return null;

  const documentUrl = getDocumentUrl(formData.dossier_rh);
  const hasDepartureDate = !!(formData.date_depart && String(formData.date_depart).trim() !== '');
  const currentPhotoUrl = photoPreview || getPhotoUrl();

  return (
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

               // Dans EmployeeModal.jsx, cherchez la section du bouton d'ajout de dossier
// Remplacer cette partie:

{/* Ancien code à remplacer */}
<div className="dossier-action">
  <button className="add-dossier-btn" onClick={() => setShowDossierModal(true)}>
    📁 {t('addUpdateDossier')}
  </button>
</div>

{/* Nouveau code avec badge informatif */}
<div className="dossier-action">
  <div className="dossier-header">
    <strong>{t('hrFile')}:</strong>
    {documentUrl && (
      <span className="dossier-status-badge">
        📄 Dossier existant
      </span>
    )}
  </div>
  
  <button 
    className="add-dossier-btn"
    onClick={() => setShowDossierModal(true)}
    title={documentUrl ? "Ajouter des documents au dossier existant" : "Créer un nouveau dossier"}
  >
    {documentUrl ? (
      <>
        🔄 {t('addToDossier')}
        <span className="btn-subtext">Ajouter des documents</span>
      </>
    ) : (
      <>
        📁 {t('createDossier')}
        <span className="btn-subtext">Créer un nouveau dossier</span>
      </>
    )}
  </button>
  
  {documentUrl && (
    <div className="dossier-actions">
      <a
        href={documentUrl}
        onClick={(e) => handleDocumentClick(e, documentUrl)}
        className="view-dossier-link"
        title="Voir le dossier complet"
      >
        👁️ Voir le dossier
      </a>
    </div>
  )}
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
          onUpdate(updatedEmployee);
        }}
      />
    </div>
  );
};

export default EmployeeModal;
