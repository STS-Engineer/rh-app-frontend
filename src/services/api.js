import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

export const employeesAPI = {
  getAll: () => api.get('/api/employees'),
  
  getById: (id) => api.get(`/api/employees/${id}`),
  
  search: (query) => api.get(`/api/employees/search?q=${query}`),
  
  create: (employeeData) => api.post('/api/employees', employeeData),
  
  update: (id, employeeData) => api.put(`/api/employees/${id}`, employeeData),
  
  archiveEmployee: (id, entretien_depart) => 
    api.put(`/api/employees/${id}/archive`, { entretien_depart }),
  
  uploadDossierRh: async (formData) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/api/employees/upload-dossier-rh`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Erreur d\'upload' }));
      throw new Error(errorData.message || 'Erreur lors de l\'upload');
    }
    
    return response.json();
  },
};

export const getArchivedEmployees = () => api.get('/api/employees/archives');

export const authAPI = {
  login: (credentials) => api.post('/api/auth/login', credentials),
};

export const demandesAPI = {
  getAll: (params = {}) => api.get('/api/demandes', { params }),
  getById: (id) => api.get(`/api/demandes/${id}`),
  create: (demandeData) => api.post('/api/demandes', demandeData),
  update: (id, demandeData) => api.put(`/api/demandes/${id}`, demandeData),
  updateStatut: (id, statutData) => api.put(`/api/demandes/${id}/statut`, statutData),
  delete: (id) => api.delete(`/api/demandes/${id}`),
};

export default api;
