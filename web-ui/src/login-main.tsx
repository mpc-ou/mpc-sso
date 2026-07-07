import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { LoginPage } from './pages/LoginPage';
import './i18n';
import './styles/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={null}>
      <LoginPage />
    </Suspense>
  </StrictMode>,
);
