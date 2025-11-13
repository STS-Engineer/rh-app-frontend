import React from 'react';
import './ArchiveEmployeeModal.css';

const ArchiveEmployeeModal = ({ employee, isOpen, onClose }) => {
  if (!isOpen || !employee) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'Non renseignée';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const getDefaultAvatar = () => {
    return `https://ui-avatars.com/api/?name=${employee.prenom}+${employee.nom}&background=95a5a6&color=fff&size=150`;
  };

  const getPhotoUrl = () => {
    if (employee.photo && isValidUrl(employee.photo)) {
      return employee.photo;
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

  const handleViewEntretien = (e) => {
    e.preventDefault();
    
    if (!employee.entretien_depart) {
      alert('❌ Aucun entretien de départ disponible');
      return;
    }

    // Vérifier si c'est une URL valide
    if (!isValidUrl(employee.entretien_depart)) {
      alert('❌ Le lien vers l\'entretien n\'est pas une URL valide');
      return;
    }

    // Créer un lien temporaire pour l'ouverture
    const link = document.createElement('a');
    link.href = employee.entretien_depart;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    
    // Ajouter un gestionnaire d'erreurs
    link.onerror = () => {
      alert('❌ Impossible d\'ouvrir le document. Vérifiez que le lien est accessible.');
    };
    
    // Déclencher le clic
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Fonction pour tester si le lien est accessible
  const testLinkAccessibility = async (url) => {
    try {
      const response = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
      return true;
    } catch (error) {
      // En mode no-cors, on ne peut pas lire la réponse mais la requête est envoyée
      return true;
    }
  };

  const handleViewEntretienWithCheck = async (e) => {
    e.preventDefault();
    
    if (!employee.entretien_depart) {
      alert('❌ Aucun entretien de départ disponible');
      return;
    }

    if (!isValidUrl(employee.entretien_depart)) {
      alert('❌ Le lien vers l\'entretien n\'est pas une URL valide');
      return;
    }

    // Afficher un message de chargement
    const originalText = e.target.textContent;
    e.target.textContent = '⏳ Ouverture...';
    e.target.disabled = true;

    try {
      // Ouvrir dans un nouvel onglet
      const newWindow = window.open(employee.entretien_depart, '_blank');
      
      // Vérifier si la fenêtre a été bloquée
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        // Le popup a été bloqué, utiliser une méthode alternative
        const link = document.createElement('a');
        link.href = employee.entretien_depart;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      // Réactiver le bouton après un délai
      setTimeout(() => {
        e.target.textContent = originalText;
        e.target.disabled = false;
      }, 2000);

    } catch (error) {
      console.error('Erreur lors de l\'ouverture du PDF:', error);
      alert('❌ Impossible d\'ouvrir le document. Le lien peut être invalide ou bloqué par le navigateur.');
      
      // Réactiver le bouton en cas d'erreur
      e.target.textContent = originalText;
      e.target.disabled = false;
    }
  };

  // Version simple et directe
  const handleViewEntretienSimple = (e) => {
    e.preventDefault();
    
    if (!employee.entretien_depart) {
      alert('❌ Aucun entretien de départ disponible');
      return;
    }

    // Méthode la plus directe
    try {
      window.open(employee.entretien_depart, '_blank', 'noopener,noreferrer');
    } catch (error) {
      // Méthode de secours
      const link = document.createElement('a');
      link.href = employee.entretien_depart;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="archive-employee-modal-overlay" onClick={onClose}>
      <div className="archive-employee-modal-content" onClick={e => e.stopPropagation()}>
        <div className="archive-employee-modal-header">
          <h2>📋 Détails de l'Employé Archivé</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="archive-employee-modal-body">
          <div className="employee-header">
            <img 
              src={getPhotoUrl()} 
              alt={`${employee.prenom} ${employee.nom}`}
              className="employee-photo"
              onError={(e) => {
                e.target.src = getDefaultAvatar();
              }}
            />
            <div className="employee-basic-info">
              <h3>{employee.prenom} {employee.nom}</h3>
              <p className="employee-matricule">Matricule: {employee.matricule}</p>
              <p className="employee-poste">{employee.poste}</p>
              <p className="employee-departement">{employee.site_dep}</p>
            </div>
          </div>

          <div className="employee-details-grid">
            <div className="detail-section">
              <h4>📝 Informations Personnelles</h4>
              <DetailRow label="CIN" value={employee.cin} />
              <DetailRow label="Passeport" value={employee.passeport || 'Non renseigné'} />
              <DetailRow label="Date de naissance" value={formatDate(employee.date_naissance)} />
            </div>

            <div className="detail-section">
              <h4>💼 Informations Professionnelles</h4>
              <DetailRow label="Type de contrat" value={employee.type_contrat} />
              <DetailRow label="Date d'embauche" value={formatDate(employee.date_debut)} />
              <DetailRow label="Salaire brut" value={`${employee.salaire_brute} €`} />
            </div>

              <div className="detail-section depart-section">
                <h4>📅 Informations de Départ</h4>

                <DetailRow
                  label="Date de départ"
                  value={formatDate(employee.date_depart)}
                />

                {employee.entretien_depart ? (
                  <div className="entretien-btn-container">
                    <button
                      className="view-entretien-modal-btn"
                      onClick={handleViewEntretienSimple}
                    >
                      📄 Consulter l'entretien
                    </button>
                  </div>
                  ) : (
                    'Non disponible'
                  )
                } 
              
            </div>
          </div>
        </div>

        <div className="archive-employee-modal-footer">
          <button className="close-modal-btn" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

const DetailRow = ({ label, value }) => (
  <div className="detail-row">
    <strong>{label}:</strong>
    <span>{value}</span>
  </div>
);

export default ArchiveEmployeeModal;