const LOCAL_BACKEND_URL = 'http://localhost:5000';
const PRODUCTION_BACKEND_URL = 'https://backend-rh.azurewebsites.net';

const normalizeUrl = (value) => String(value || '').trim().replace(/\/+$/, '');

export const getBackendBaseUrl = () => {
  const envUrl = normalizeUrl(process.env.REACT_APP_API_URL);
  if (envUrl) {
    return envUrl;
  }

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]') {
      return LOCAL_BACKEND_URL;
    }
  }

  return PRODUCTION_BACKEND_URL;
};

export const getApiBaseUrl = () => `${getBackendBaseUrl()}/api`;
