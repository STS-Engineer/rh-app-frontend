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



// Intercepteur pour ajouter le token automatiquement
axios.interceptors.request.use(
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

// Intercepteur pour gérer les erreurs globales
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (email, password) => {
    return axios.post('/api/auth/login', { email, password });
  }
};

export const employeesAPI = {
  getAll: () => axios.get('/api/employees'),
  
  getArchived: () => axios.get('/api/employees/archives'),
  
  search: (query, statut = 'actif') => 
    axios.get('/api/employees/search', { params: { q: query, statut } }),
  
  getById: (id) => axios.get(`/api/employees/${id}`),
  
  create: (employeeData) => axios.post('/api/employees', employeeData),
  
  update: (id, employeeData) => axios.put(`/api/employees/${id}`, employeeData),
  
  archiveEmployee: (id, entretien_depart) => 
    axios.put(`/api/employees/${id}/archive`, { entretien_depart }),
  
  // Nouvelle fonction pour uploader le dossier RH
  uploadDossierRH: (formData) => {
    return axios.post('/api/employees/upload-dossier-rh', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 60000
    });
  }
};

export const demandesRHAPI = {
  getAll: (params = {}) => axios.get('/api/demandes', { params }),
  
  getById: (id) => axios.get(`/api/demandes/${id}`),
  
  create: (demandeData) => axios.post('/api/demandes', demandeData),
  
  update: (id, demandeData) => axios.put(`/api/demandes/${id}`, demandeData),
  
  updateStatut: (id, statut, commentaire_refus = null) => 
    axios.put(`/api/demandes/${id}/statut`, { statut, commentaire_refus }),
  
  delete: (id) => axios.delete(`/api/demandes/${id}`)
};

export default {
  auth: authAPI,
  employees: employeesAPI,
  demandes: demandesRHAPI
};
