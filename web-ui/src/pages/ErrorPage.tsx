import { CircleAlert, Home } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

export function ErrorPage() {
  const { t, i18n } = useTranslation();
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const code = params.get('code');
  const message = i18n.language.startsWith('en')
    ? params.get('en') || params.get('vi')
    : params.get('vi') || params.get('en');

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200/80 bg-white p-8 text-center shadow-sm shadow-slate-200/60">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
          <CircleAlert className="h-6 w-6" />
        </div>
        <h1 className="mpc-font-display mt-4 text-lg font-semibold tracking-tight text-slate-900">
          {t('errorPage.title')}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {message || t('errorPage.fallback')}
        </p>
        {code && (
          <p className="mt-3 font-mono text-xs text-slate-400">{code}</p>
        )}
        <Button className="mt-6 w-full" onClick={() => { window.location.href = '/login'; }}>
          <Home className="h-3.5 w-3.5" /> {t('errorPage.home')}
        </Button>
      </div>
    </div>
  );
}
