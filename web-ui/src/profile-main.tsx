import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { ProfilePage } from './pages/ProfilePage';
import './i18n';
import './styles/index.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={null}>
      <QueryClientProvider client={queryClient}>
        <ProfilePage />
      </QueryClientProvider>
    </Suspense>
  </StrictMode>,
);
