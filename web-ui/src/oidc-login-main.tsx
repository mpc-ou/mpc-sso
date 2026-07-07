import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { OidcLoginPage } from './pages/OidcLoginPage';
import './i18n';
import './styles/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={null}>
      <OidcLoginPage />
    </Suspense>
  </StrictMode>,
);
