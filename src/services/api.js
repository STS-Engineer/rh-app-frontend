import axios from 'axios';

// URL de l'API - Configuration pour Azure
const API_URL = process.env.REACT_APP_API_URL || 'https://avo-hr-managment.azurewebsites.net';

console.log('🔧 API URL configurée:', API_URL);

// Configuration axios avec intercepteur pour le token
const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 secondes timeout
});

// Intercepteur pour ajouter le token à chaque requête
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('📤 Requête API:', config.method.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('❌ Erreur requête:', error);
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer les erreurs
api.interceptors.response.use(
  (response) => {
    console.log('✅ Réponse API:', response.config.url, response.status);
    return response;
  },
  (error) => {
    console.error('❌ Erreur réponse API:', error.response || error);
    
    if (error.response?.status === 401) {
      console.log('🚫 Non autorisé - Redirection vers login');
      localStorage.removeItem('token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// API Employés
export const employeesAPI = {
  getAll: () => api.get('/employees'),
  
  getById: (id) => api.get(`/employees/${id}`),
  
  create: (employeeData) => api.post('/employees', employeeData),
  
  update: (id, employeeData) => api.put(`/employees/${id}`, employeeData),
  
  search: (query) => api.get('/employees/search', { params: { q: query } }),
  
  archiveEmployee: (id, entretien_depart) => 
    api.put(`/employees/${id}/archive`, { entretien_depart }),
  
  // Méthode pour uploader le dossier RH
  uploadDossierRH: async (id, file) => {
    const formData = new FormData();
    formData.append('dossier', file);
    
    const token = localStorage.getItem('token');
    
    console.log('📤 Upload vers:', `${API_URL}/api/employees/${id}/upload-dossier`);
    
    return axios.post(`${API_URL}/api/employees/${id}/upload-dossier`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${token}`
      },
      timeout: 60000 // 60 secondes pour l'upload
    });
  }
};

// API Archives
export const getArchivedEmployees = () => api.get('/employees/archives');

// API Authentification - CORRECTION ICI
export const authAPI = {
  login: async (email, password) => {
    try {
      console.log('🔐 Tentative de login:', email);
      console.log('🔗 URL login:', `${API_URL}/api/auth/login`);
      
      const response = await axios.post(`${API_URL}/api/auth/login`, 
        { email, password },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000
        }
      );
      
      console.log('✅ Login réussi:', response.data);
      return response;
    } catch (error) {
      console.error('❌ Erreur login:', error.response?.data || error.message);
      throw error;
    }
  }
};

// API Demandes RH
export const demandesAPI = {
  getAll: (params) => api.get('/demandes', { params }),
  
  getById: (id) => api.get(`/demandes/${id}`),
  
  create: (demandeData) => api.post('/demandes', demandeData),
  
  update: (id, demandeData) => api.put(`/demandes/${id}`, demandeData),
  
  updateStatut: (id, statut, commentaire_refus) => 
    api.put(`/demandes/${id}/statut`, { statut, commentaire_refus }),
  
  delete: (id) => api.delete(`/demandes/${id}`),
};

export default api;
