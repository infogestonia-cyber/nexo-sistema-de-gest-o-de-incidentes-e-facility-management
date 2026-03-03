import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Validar token JWT antes de inicializar a app
// Se o token estiver expirado, limpar localStorage para forçar novo login
function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    // exp está em segundos; Date.now() em milissegundos
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return true;
    }
    return false;
  } catch {
    return true; // Token malformado
  }
}

const storedToken = localStorage.getItem('token');
if (isTokenExpired(storedToken)) {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

