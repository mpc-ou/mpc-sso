import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorPage } from './pages/ErrorPage';
import './i18n';
import './styles/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={null}>
      <ErrorPage />
    </Suspense>
  </StrictMode>,
);
