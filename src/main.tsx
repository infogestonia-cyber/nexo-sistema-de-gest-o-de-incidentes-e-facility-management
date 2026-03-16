import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import ClientApp from './ClientApp.tsx';
import TecnicoApp from './TecnicoApp.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Validar token JWT antes de inicializar a app
function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) return true;
    return false;
  } catch { return true; }
}

const storedToken = localStorage.getItem('token');
if (isTokenExpired(storedToken)) {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

// -------------------------------------------------------
// ROUTING: /cliente → Cliente | /tecnico → Técnico | / → Admin
// -------------------------------------------------------
const isClientePath = window.location.pathname.startsWith('/cliente');
const isTecnicoPath = window.location.pathname.startsWith('/tecnico');

const RootComponent = isClientePath ? ClientApp : (isTecnicoPath ? TecnicoApp : App);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <RootComponent />
    </ErrorBoundary>
  </StrictMode>,
);
