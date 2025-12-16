import axios from 'axios';

// =========================
// Configuration de l'API
// =========================
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://backend-rh.azurewebsites.net/api';

// Création d'une instance axios
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000 // 30 secondes timeout
});

// =========================
// Intercepteurs
// =========================

// Ajout automatique du token JWT aux requêtes
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Gestion globale des erreurs d'authentification
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// =========================
// API Authentification
// =========================

export const authAPI = {
  // Login avec email et password
  login: (email, password) => api.post('/auth/login', { email, password }),
  
  // Mot de passe oublié - envoi direct d'un nouveau mot de passe
  sendNewPassword: (email) => api.post('/auth/send-new-password', { email }),
  
  logout: () => {
    localStorage.removeItem('token');
    window.location.href = '/';
  },
  
  // Vérifier si l'utilisateur est connecté
  isAuthenticated: () => {
    const token = localStorage.getItem('token');
    return !!token;
  }
};

// =========================
// API Employés
// =========================

export const employeesAPI = {
  // Récupérer tous les employés actifs
  getAll: () => api.get('/employees'),
  
  // Récupérer un employé par ID
  getById: (id) => api.get(`/employees/${id}`),
  
  // Créer un nouvel employé
  create: (employeeData) => api.post('/employees', employeeData),
  
  // Mettre à jour un employé
  update: (id, employeeData) => api.put(`/employees/${id}`, employeeData),
  
  // Archiver un employé
  archiveEmployee: (employeeId, data) =>
    api.put(`/employees/${employeeId}/archive`, data),
  
  // Rechercher des employés
  search: (searchTerm, statut = 'actif') =>
    api.get(`/employees/search?q=${encodeURIComponent(searchTerm)}&statut=${encodeURIComponent(statut)}`),
  
  // Récupérer les employés archivés
  getArchives: () => api.get('/employees/archives'),
  
  // Upload photo employé
  uploadPhoto: (photoFile) => {
    const formData = new FormData();
    formData.append('photo', photoFile);
    return api.post('/employees/upload-photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  // Générer URL photo
  getPhotoUrl: (filename) => {
    const baseUrl = API_BASE_URL.replace('/api', '');
    return `${baseUrl}/employee-photos/${filename}`;
  },
  
  // Supprimer le dossier RH d'un employé
  deleteDossierRh: (employeeId) => api.delete(`/employees/${employeeId}/dossier-rh`)
};

// =========================
// API Demandes RH
// =========================

export const demandesAPI = {
  getAll: (params = {}) => api.get('/demandes', { params }),
  getById: (id) => api.get(`/demandes/${id}`),
  create: (data) => api.post('/demandes', data),
  update: (id, data) => api.put(`/demandes/${id}`, data),
  updateStatus: (id, statut, commentaire_refus = null) => 
    api.put(`/demandes/${id}/statut`, { statut, commentaire_refus }),
  delete: (id) => api.delete(`/demandes/${id}`)
};

// =========================
// API Dossier RH
// =========================

export const dossierRhAPI = {
  // Uploader des photos pour le dossier RH
  uploadPhotos: (photos) => {
    const formData = new FormData();
    photos.forEach(photo => {
      formData.append('photos', photo);
    });
    return api.post('/dossier-rh/upload-photos', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  // Générer ou ajouter au PDF du dossier RH
  generatePDF: (employeeId, data) => 
    api.post(`/dossier-rh/generate-pdf/${employeeId}`, data),
  
  // Supprimer le dossier RH d'un employé
  deleteDossier: (employeeId) => 
    api.delete(`/employees/${employeeId}/dossier-rh`),
  
  // Obtenir l'URL d'un PDF
  getPDFUrl: (filename) => {
    const baseUrl = API_BASE_URL.replace('/api', '');
    return `${baseUrl}/pdfs/${filename}`;
  },
  
  // Obtenir l'URL d'un PDF d'archive
  getArchivePDFUrl: (filename) => {
    const baseUrl = API_BASE_URL.replace('/api', '');
    return `${baseUrl}/archive-pdfs/${filename}`;
  }
};

// =========================
// API Fiche de Paie
// =========================

export const fichePaieAPI = {
  processPDF: (pdfFile) => {
    const formData = new FormData();
    formData.append('pdfFile', pdfFile);
    return api.post('/fiche-paie/process', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
};

// =========================
// API Archives
// =========================

export const archiveAPI = {
  uploadPDF: (pdfFile) => {
    const formData = new FormData();
    formData.append('pdfFile', pdfFile);
    return api.post('/archive/upload-pdf', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  getPDFUrl: (filename) => {
    const baseUrl = API_BASE_URL.replace('/api', '');
    return `${baseUrl}/archive-pdfs/${filename}`;
  }
};

// =========================
// Fonctions utilitaires (exportées individuellement)
// =========================

// Récupérer les employés archivés
export const getArchivedEmployees = () => api.get('/employees/archives');

// Rechercher des employés avec statut
export const searchEmployeesWithStatus = (searchTerm, statut = 'actif') =>
  api.get(
    `/employees/search?q=${encodeURIComponent(searchTerm)}&statut=${encodeURIComponent(
      statut
    )}`
  );

// =========================
// API Utilitaires
// =========================

export const utilsAPI = {
  healthCheck: () => api.get('/health'),
  
  // Vérifier la connexion
  checkConnection: async () => {
    try {
      const response = await api.get('/health');
      return response.data;
    } catch (error) {
      throw new Error('Impossible de se connecter au serveur');
    }
  }
};

// =========================
// Service pour les photos d'employés
// =========================

export const photoService = {
  // Upload photo employé
  uploadEmployeePhoto: async (photoFile) => {
    try {
      const response = await employeesAPI.uploadPhoto(photoFile);
      return {
        success: true,
        photoUrl: response.data.photoUrl,
        fileName: response.data.fileName
      };
    } catch (error) {
      console.error('Erreur upload photo:', error);
      throw error;
    }
  },
  
  // Obtenir l'URL d'une photo
  getEmployeePhotoUrl: (filename) => employeesAPI.getPhotoUrl(filename),
  
  // Obtenir l'URL d'un avatar par défaut
  getDefaultAvatar: (nom, prenom) => {
    const initiales = (prenom?.charAt(0) || '') + (nom?.charAt(0) || '');
    const colors = [
      'FF6B6B',
      '4ECDC4',
      '45B7D1',
      '96CEB4',
      'FFEAA7',
      'DDA0DD',
      '98D8C8',
      'F7DC6F',
      'BB8FCE',
      '85C1E9'
    ];
    const color = colors[Math.floor(Math.random() * colors.length)];
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initiales.toUpperCase())}&background=${color}&color=fff&size=150`;
  }
};

// =========================
// Service pour les dossiers RH
// =========================

export const dossierService = {
  // Uploader des photos temporaires
  uploadDossierPhotos: async (photos) => {
    try {
      const response = await dossierRhAPI.uploadPhotos(photos);
      return {
        success: true,
        photos: response.data.photos,
        message: response.data.message
      };
    } catch (error) {
      console.error('Erreur upload photos dossier:', error);
      throw error;
    }
  },
  
  // Générer le dossier RH
  generateDossier: async (employeeId, photos, dossierName, actionType = 'new') => {
    try {
      const response = await dossierRhAPI.generatePDF(employeeId, {
        photos,
        dossierName,
        actionType
      });
      return {
        success: true,
        pdfUrl: response.data.pdfUrl,
        message: response.data.message,
        employee: response.data.employee,
        actionType: response.data.actionType,
        isMerged: response.data.isMerged
      };
    } catch (error) {
      console.error('Erreur génération dossier:', error);
      throw error;
    }
  },
  
  // Supprimer le dossier RH
  deleteDossier: async (employeeId) => {
    try {
      const response = await dossierRhAPI.deleteDossier(employeeId);
      return {
        success: true,
        message: response.data.message,
        employee: response.data.employee
      };
    } catch (error) {
      console.error('Erreur suppression dossier:', error);
      throw error;
    }
  },
  
  // Obtenir l'URL d'un dossier
  getDossierUrl: (filename) => dossierRhAPI.getPDFUrl(filename)
};

// =========================
// Service pour l'archivage
// =========================

export const archiveService = {
  // Uploader un PDF d'archive
  uploadArchivePDF: async (pdfFile) => {
    try {
      const response = await archiveAPI.uploadPDF(pdfFile);
      return {
        success: true,
        pdfUrl: response.data.pdfUrl,
        fileName: response.data.fileName,
        message: response.data.message
      };
    } catch (error) {
      console.error('Erreur upload PDF archive:', error);
      throw error;
    }
  },
  
  // Archiver un employé
  archiveEmployee: async (employeeId, pdfUrl, dateDepart, entretienDepart = '') => {
    try {
      const response = await employeesAPI.archiveEmployee(employeeId, {
        pdf_url: pdfUrl,
        date_depart: dateDepart,
        entretien_depart: entretienDepart
      });
      return {
        success: true,
        employee: response.data.employee,
        message: response.data.message
      };
    } catch (error) {
      console.error('Erreur archivage employé:', error);
      throw error;
    }
  },
  
  // Obtenir l'URL d'un PDF d'archive
  getArchivePDFUrl: (filename) => archiveAPI.getPDFUrl(filename)
};

// =========================
// Service pour les fiches de paie
// =========================

export const paieService = {
  // Traiter un PDF de fiches de paie
  processFichesPaie: async (pdfFile) => {
    try {
      const response = await fichePaieAPI.processPDF(pdfFile);
      return {
        success: true,
        results: response.data.results,
        message: response.data.message
      };
    } catch (error) {
      console.error('Erreur traitement fiches de paie:', error);
      throw error;
    }
  }
};

// =========================
// Fonctions d'aide
// =========================

// Valider une adresse email
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Valider une URL
export const isValidUrl = (string) => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
};

// Formater une date pour l'input date
export const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
};

// Formater une date pour l'affichage
export const formatDateForDisplay = (dateString, locale = 'fr-FR') => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(locale);
};

// Tronquer une URL pour l'affichage
export const truncateUrl = (url, maxLength = 40) => {
  if (!url) return '';
  if (url.length <= maxLength) return url;
  return url.substring(0, maxLength) + '...';
};

// Générer un mot de passe aléatoire
export const generateRandomPassword = (length = 10) => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const specials = '!@#$%^&*';
  
  let password = '';
  
  // Assurer au moins un caractère de chaque type
  password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
  password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
  password += numbers.charAt(Math.floor(Math.random() * numbers.length));
  password += specials.charAt(Math.floor(Math.random() * specials.length));
  
  // Remplir le reste
  const allChars = uppercase + lowercase + numbers + specials;
  for (let i = 4; i < length; i++) {
    password += allChars.charAt(Math.floor(Math.random() * allChars.length));
  }
  
  // Mélanger le mot de passe
  return password.split('').sort(() => 0.5 - Math.random()).join('');
};

// Vérifier si l'URL est un PDF
export const isPdfUrl = (url) => {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  return (
    lowerUrl.endsWith('.pdf') ||
    lowerUrl.includes('.pdf?') ||
    lowerUrl.includes('/pdf') ||
    lowerUrl.includes('application/pdf')
  );
};

// =========================
// Configuration globale
// =========================

// Définir le token JWT manuellement si nécessaire
export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('token', token);
  } else {
    delete api.defaults.headers.common['Authorization'];
    localStorage.removeItem('token');
  }
};

// Obtenir le token JWT actuel
export const getAuthToken = () => {
  return localStorage.getItem('token');
};

// Vérifier si l'utilisateur est authentifié
export const checkAuth = () => {
  const token = getAuthToken();
  return !!token;
};

// =========================
// Export par défaut
// =========================

export default {
  api,
  authAPI,
  employeesAPI,
  demandesAPI,
  dossierRhAPI,
  fichePaieAPI,
  archiveAPI,
  utilsAPI,
  photoService,
  dossierService,
  archiveService,
  paieService,
  isValidEmail,
  isValidUrl,
  formatDateForInput,
  formatDateForDisplay,
  truncateUrl,
  generateRandomPassword,
  isPdfUrl,
  setAuthToken,
  getAuthToken,
  checkAuth
};
