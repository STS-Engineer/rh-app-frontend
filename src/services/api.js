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
  
  // Changer le mot de passe (utilisateur connecté)
  changePassword: (currentPassword, newPassword) => 
    api.post('/auth/change-password', { currentPassword, newPassword }),
  
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
  getAll: () => api.get('/employees'),
  getById: (id) => api.get(`/employees/${id}`),
  create: (employeeData) => api.post('/employees', employeeData),
  update: (id, employeeData) => api.put(`/employees/${id}`, employeeData),
  archiveEmployee: (employeeId, data) =>
    api.put(`/employees/${employeeId}/archive`, data),
  search: (searchTerm, statut = 'actif') =>
    api.get(`/employees/search?q=${encodeURIComponent(searchTerm)}&statut=${encodeURIComponent(statut)}`),
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
  }
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
  uploadPhotos: (photos) => {
    const formData = new FormData();
    photos.forEach(photo => {
      formData.append('photos', photo);
    });
    return api.post('/dossier-rh/upload-photos', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  generatePDF: (employeeId, data) => 
    api.post(`/dossier-rh/generate-pdf/${employeeId}`, data),
  
  getPDFUrl: (filename) => {
    const baseUrl = API_BASE_URL.replace('/api', '');
    return `${baseUrl}/pdfs/${filename}`;
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

// Export par défaut
export default api;
