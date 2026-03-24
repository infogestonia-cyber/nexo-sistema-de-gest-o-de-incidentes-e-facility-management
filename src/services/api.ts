/**
 * Centralized API Service
 * Handles all network requests with professional error handling and auto-logout.
 */

const API_BASE_URL = ''; // Relative paths since we're proxied by Vite

interface RequestOptions extends RequestInit {
  data?: any;
}

async function apiRequest(endpoint: string, options: RequestOptions = {}) {
  const isClientPortal = window.location.pathname.startsWith('/cliente');
  const tokenKey = isClientPortal ? 'cliente_token' : 'token';
  
  // Try sessionStorage first, then localStorage
  const token = sessionStorage.getItem(tokenKey) || localStorage.getItem(tokenKey);
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const config: RequestInit = {
    ...options,
    headers,
  };

  if (options.data) {
    config.body = JSON.stringify(options.data);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    // Global Interceptor for auth errors
    if (response.status === 401 || response.status === 403) {
      // Don't auto-logout/reload on login or auth endpoints (let the UI handle it)
      const isAuthEndpoint = endpoint.includes('/login') || endpoint.includes('/auth/cliente');
      
      if (!isAuthEndpoint) {
        console.warn(`[API] Auth error (${response.status}) on ${endpoint}. Force log out...`);
        handleGlobalLogout();
      }
      
      const errorData = await response.json().catch(() => ({}));
      throw { status: response.status, ...errorData };
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw { status: response.status, ...errorData };
    }

    return await response.json();
  } catch (error: any) {
    console.error(`[API Logger] Error on ${endpoint}:`, error);
    throw error;
  }
}

function handleGlobalLogout() {
  const keys = ['token', 'user', 'cliente_token', 'cliente_user'];
  keys.forEach(k => {
    localStorage.removeItem(k);
    sessionStorage.removeItem(k);
  });

  // Trigger a window event or reload to catch state in App.tsx
  window.dispatchEvent(new Event('auth-invalidation'));
  window.location.reload(); // Hard reload to ensure clean state
}

export const api = {
  get: (endpoint: string, options?: RequestOptions) => 
    apiRequest(endpoint, { ...options, method: 'GET' }),
    
  post: (endpoint: string, data?: any, options?: RequestOptions) => 
    apiRequest(endpoint, { ...options, method: 'POST', data }),
    
  put: (endpoint: string, data?: any, options?: RequestOptions) => 
    apiRequest(endpoint, { ...options, method: 'PUT', data }),
    
  patch: (endpoint: string, data?: any, options?: RequestOptions) => 
    apiRequest(endpoint, { ...options, method: 'PATCH', data }),
    
  delete: (endpoint: string, options?: RequestOptions) => 
    apiRequest(endpoint, { ...options, method: 'DELETE' }),
};
