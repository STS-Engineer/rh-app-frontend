import axios from 'axios';

// =========================
// Configuration de l'API
// =========================
//
// En local : utilise http://localhost:5000/api
// En production (Azure) : définir REACT_APP_API_URL
//    ex : https://ton-backend.azurewebsites.net/api
//
const API_BASE_URL ='https://backend-rh.azurewebsites.net/api';

// Création d'une instance axios
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
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
  archiveEmployee: (employeeId, entretien_depart) =>
    api.put(`/employees/${employeeId}/archive`, { entretien_depart }),
  
  // Rechercher des employés (actifs par défaut côté backend)
  search: (searchTerm) =>
    api.get(`/employees/search?q=${encodeURIComponent(searchTerm)}`)

    // Nouvelle fonction pour uploader le dossier RH
  uploadDossierRH: (formData) => {
    return axios.post('/api/employees/upload-dossier-rh', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 60000 // 60 secondes timeout pour les gros fichiers
    });
  }
};

// =========================
// API Authentification
// =========================

export const authAPI = {
  // Login avec email et password
  login: (email, password) => api.post('/auth/login', { email, password }),
  
  // Login avec un objet credentials
  loginWithCredentials: (credentials) => api.post('/auth/login', credentials),
  
  logout: () => {
    localStorage.removeItem('token');
  }
};

// =========================
// Archives & Recherche avancée
// =========================
export const demandesRHAPI = {
  getAll: (params = {}) => axios.get('/api/demandes', { params }),
  
  getById: (id) => axios.get(`/api/demandes/${id}`),
  
  create: (demandeData) => axios.post('/api/demandes', demandeData),
  
  update: (id, demandeData) => axios.put(`/api/demandes/${id}`, demandeData),
  
  updateStatut: (id, statut, commentaire_refus = null) => 
    axios.put(`/api/demandes/${id}/statut`, { statut, commentaire_refus }),
  
  delete: (id) => axios.delete(`/api/demandes/${id}`)
};
export const getArchivedEmployees = () => api.get('/employees/archives');

export const searchEmployeesWithStatus = (searchTerm, statut = 'actif') =>
  api.get(
    `/employees/search?q=${encodeURIComponent(searchTerm)}&statut=${encodeURIComponent(
      statut
    )}`
  );

export default api;
