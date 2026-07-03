import axios from 'axios';
import { getApiBaseUrl } from '../utils/backendUrl';

// =========================
// Configuration de l'API
// =========================
const API_BASE_URL = getApiBaseUrl();

// ✅ Token helper (localStorage OR sessionStorage)
export const getToken = () =>
  localStorage.getItem('token') || sessionStorage.getItem('token');

export const getCurrentUser = () => {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch {
    return null;
  }
};

const GLOBAL_HR_ROLES = new Set([
  'group_hr',
  'hr_group',
  'hr_manager_group',
  'global_hr',
  'super_admin'
]);

export const isGlobalHrManager = (user = getCurrentUser()) =>
  GLOBAL_HR_ROLES.has(String(user?.role || '').trim().toLowerCase());

const HIDDEN_HR_MODULE_ROLES = new Set([
  'group_hr',
  'hr_group',
  'hr_manager_group',
  'global_hr'
]);

export const shouldHideHrGroupModules = (user = getCurrentUser()) =>
  HIDDEN_HR_MODULE_ROLES.has(String(user?.role || '').trim().toLowerCase());

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
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Gestion globale des erreurs d'authentification
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// =========================
// API Authentification
// =========================

export const authAPI = {
  // ✅ Login with rememberMe
  login: (email, password, rememberMe) =>
    api.post('/auth/login', { email, password, rememberMe }),

  // Mot de passe oublié - envoi direct d'un nouveau mot de passe
  sendNewPassword: (email) => api.post('/auth/send-new-password', { email }),

  logout: () => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    window.location.href = '/';
  },

  // Vérifier si l'utilisateur est connecté
  isAuthenticated: () => {
    const token = getToken();
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
  archiveEmployee: (employeeId, data) => api.put(`/employees/${employeeId}/archive`, data),
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
    photos.forEach((photo) => {
      formData.append('photos', photo);
    });
    return api.post('/dossier-rh/upload-photos', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  generatePDF: (employeeId, data) => api.post(`/dossier-rh/generate-pdf/${employeeId}`, data),

  getPDFUrl: (filename) => {
    const baseUrl = API_BASE_URL.replace('/api', '');
    return `${baseUrl}/pdfs/${filename}`;
  }
};

// Fonction pour supprimer le dossier RH
export const deleteDossierRH = async (employeeId, tenantSchema = null) => {
  try {
    const token = getToken();
    if (!token) {
      throw new Error('Non authentifié');
    }

    const query = tenantSchema ? `?tenant_schema=${encodeURIComponent(tenantSchema)}` : '';

    const response = await fetch(`${API_BASE_URL}/employees/${employeeId}/dossier-rh${query}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erreur lors de la suppression du dossier RH');
    }

    return await response.json();
  } catch (error) {
    console.error('Erreur API deleteDossierRH:', error);
    throw error;
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

export const getArchivedEmployees = () => api.get('/employees/archives');

export const searchEmployeesWithStatus = (searchTerm, statut = 'actif') =>
  api.get(`/employees/search?q=${encodeURIComponent(searchTerm)}&statut=${encodeURIComponent(statut)}`);

// =========================
// API Utilitaires
// =========================

export const utilsAPI = {
  healthCheck: () => api.get('/health'),

  checkConnection: async () => {
    try {
      const response = await api.get('/health');
      return response.data;
    } catch (error) {
      throw new Error('Impossible de se connecter au serveur');
    }
  }
};

export const tenantV2API = {
  getEmployees: () => api.get('/v2/employees'),
  getFranceEmergencyContact: (employeeId) => api.get(`/v2/france/emergency-contacts/${employeeId}`),
  saveFranceEmergencyContact: (employeeId, data) => api.put(`/v2/france/emergency-contacts/${employeeId}`, data),
  getFranceOnboarding: (employeeId, tenantSchema) =>
    api.get(`/v2/france/onboarding/${employeeId}`, {
      params: tenantSchema ? { tenant_schema: tenantSchema } : {}
    }),
  saveFranceOnboarding: (employeeId, data, tenantSchema) =>
    api.put(`/v2/france/onboarding/${employeeId}`, { ...data, tenant_schema: tenantSchema || data?.tenant_schema }),
  addFranceOnboardingTask: (employeeId, data, tenantSchema) =>
    api.post(`/v2/france/onboarding/${employeeId}/tasks`, { ...data, tenant_schema: tenantSchema || data?.tenant_schema }),
  updateFranceOnboardingTask: (taskId, data) => api.patch(`/v2/france/onboarding/tasks/${taskId}`, data),
  getFranceCareerEvents: (employeeId, tenantSchema) =>
    api.get(`/v2/france/career/${employeeId}/events`, {
      params: tenantSchema ? { tenant_schema: tenantSchema } : {}
    }),
  addFranceCareerEvent: (employeeId, data, tenantSchema) =>
    api.post(`/v2/france/career/${employeeId}/events`, { ...data, tenant_schema: tenantSchema || data?.tenant_schema }),
  getFranceOffboarding: (employeeId, tenantSchema) =>
    api.get(`/v2/france/offboarding/${employeeId}`, {
      params: tenantSchema ? { tenant_schema: tenantSchema } : {}
    }),
  createFranceOffboarding: (employeeId, data, tenantSchema) =>
    api.post(`/v2/france/offboarding/${employeeId}`, { ...data, tenant_schema: tenantSchema || data?.tenant_schema }),
  addFranceOffboardingTask: (employeeId, data, tenantSchema) =>
    api.post(`/v2/france/offboarding/${employeeId}/tasks`, { ...data, tenant_schema: tenantSchema || data?.tenant_schema }),
  updateFranceOffboardingTask: (taskId, data) => api.patch(`/v2/france/offboarding/tasks/${taskId}`, data)
};

// Export par défaut
export default api;
