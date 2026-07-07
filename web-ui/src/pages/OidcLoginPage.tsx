import { zodResolver } from '@hookform/resolvers/zod';
import { Lock, Mail } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation, Trans } from 'react-i18next';
import { z } from 'zod';
import { ApiError } from '@/api/client';
import { authApi } from '@/api/auth';
import { oidcAuthApi, type LoginInfo } from '@/api/oidc-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { type StoredError, renderError } from '@/lib/errors';

type FormValues = z.infer<ReturnType<typeof makeSchema>>;

function makeSchema(t: (key: string) => string) {
  return z.object({
    login: z.string().min(1, t('validation.loginRequired')),
    password: z.string().min(1, t('validation.passwordRequired')),
  });
}

function useParallaxHero() {
  const heroRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const hero = heroRef.current;
    const bg = bgRef.current;
    if (!hero || !bg) return;

    const onMouseMove = (e: MouseEvent) => {
      const rect = hero.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      bg.style.transform = `translate(${x * -18}px, ${y * -18}px) scale(1.05)`;
    };
    const onMouseLeave = () => {
      bg.style.transform = 'translate(0, 0) scale(1.05)';
    };

    hero.addEventListener('mousemove', onMouseMove);
    hero.addEventListener('mouseleave', onMouseLeave);
    return () => {
      hero.removeEventListener('mousemove', onMouseMove);
      hero.removeEventListener('mouseleave', onMouseLeave);
    };
  }, []);

  return { heroRef, bgRef };
}

export function OidcLoginPage() {
  const { t, i18n } = useTranslation();
  const schema = useMemo(() => makeSchema(t), [t]);
  const { heroRef, bgRef } = useParallaxHero();
  const [requestId] = useState(
    () => new URLSearchParams(window.location.search).get('request_id') ?? '',
  );
  const [info, setInfo] = useState<LoginInfo | null>(null);
  const [fetchError, setFetchError] = useState<StoredError>(null);
  const [submitError, setSubmitError] = useState<StoredError>(null);
  const [isPending, setIsPending] = useState(false);

  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotPending, setForgotPending] = useState(false);

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      setForgotError(t('common.emailRequired'));
      return;
    }
    setForgotPending(true);
    setForgotError('');
    setForgotSuccess(false);
    try {
      await authApi.forgotPassword(forgotEmail);
      setForgotSuccess(true);
    } catch (err) {
      setForgotError(err instanceof Error ? err.message : t('common.forgotError'));
    } finally {
      setForgotPending(false);
    }
  };

  const loadError = !requestId
    ? t('oidcLogin.missingRequestId')
    : renderError(fetchError, t, i18n.language);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!requestId) return;
    oidcAuthApi
      .getInfo(requestId)
      .then(setInfo)
      .catch((err: unknown) => {
        setFetchError(
          err instanceof ApiError
            ? { kind: 'api', message: err.message, i18n: err.errorI18n }
            : { kind: 'key', key: 'oidcLogin.sessionExpired' },
        );
      });
  }, [requestId]);

  const onSubmit = async (values: FormValues) => {
    setIsPending(true);
    setSubmitError(null);
    try {
      const { redirectUrl } = await oidcAuthApi.login({
        ...values,
        request_id: requestId,
      });
      window.location.assign(redirectUrl);
    } catch (err) {
      setSubmitError(
        err instanceof ApiError
          ? { kind: 'api', message: err.message, i18n: err.errorI18n }
          : { kind: 'key', key: 'common.loginFailed' },
      );
      setIsPending(false);
    }
  };

  const heading = info?.clientName ? (
    <Trans
      i18nKey="oidcLogin.headingWithClient"
      values={{ clientName: info.clientName }}
    >
      Đăng nhập vào <strong>{info.clientName}</strong>
    </Trans>
  ) : (
    t('oidcLogin.headingFallback')
  );

  return (
    <div className="flex min-h-screen bg-slate-950">
      <div
        ref={heroRef}
        className="relative hidden flex-[1.4] flex-col justify-between overflow-hidden p-12 text-white md:flex"
      >
        <img
          ref={bgRef}
          src={`${import.meta.env.BASE_URL}about.jpg`}
          alt=""
          className="absolute -inset-6 h-[calc(100%+3rem)] w-[calc(100%+3rem)] scale-105 object-cover transition-transform duration-150 ease-out"
        />
        <div className="absolute inset-0 bg-linear-to-t from-slate-950/90 via-slate-950/40 to-slate-950/70" />
        <div className="relative font-extrabold tracking-wide">
          MPC
          <small className="block text-[0.62rem] font-bold tracking-widest text-brand-500">
            MOBILE PROGRAMING CLUB
          </small>
        </div>
        <div className="relative">
          <p className="mb-2 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-brand-500">
            {t('oidcLogin.sideLabel')}
          </p>
          <h1 className="mb-2 text-3xl font-extrabold leading-tight">
            <Trans i18nKey="oidcLogin.sideTitle">
              Where there&apos;s a bug,
              <br />
              there&apos;s <span className="text-brand-500">MPC</span>!
            </Trans>
          </h1>
          <p className="text-sm text-slate-300">
            {t('oidcLogin.sideSubtitle')}
          </p>
        </div>
      </div>

      <div className="relative flex flex-1 items-center justify-center px-4 py-12">
        <LanguageSwitcher />
        <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-slate-800 p-2">
              <img
                src={`${import.meta.env.BASE_URL}logo.png`}
                alt="Google"
                className="h-full w-full rounded-full object-cover"
              />
            </div>
            <h2 className="mt-1 text-lg font-semibold text-white">{heading}</h2>
            <p className="mt-1 text-sm text-slate-400">
              {t('oidcLogin.subtitle')}
            </p>
          </div>

          {(loadError ?? renderError(submitError, t, i18n.language)) && (
            <div className="mb-4 rounded-md border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">
              {loadError ?? renderError(submitError, t, i18n.language)}
            </div>
          )}

          {mode === 'login' && (
            <>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="login" className="text-slate-300 mb-2">
                    {t('common.usernameOrEmail')}
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <Input
                      id="login"
                      autoComplete="username"
                      placeholder={t('oidcLogin.placeholderEmail')}
                      className="border-slate-700 bg-slate-950 pl-8 text-white placeholder:text-slate-600"
                      disabled={!requestId || Boolean(loadError)}
                      {...register('login')}
                    />
                  </div>
                  {errors.login && (
                    <p className="mt-1 text-xs text-red-400">
                      {errors.login.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label
                    htmlFor="password"
                    className="text-slate-300 mb-2"
                  >
                    {t('common.password')}
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <Input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      className="border-slate-700 bg-slate-950 pl-8 text-white"
                      disabled={!requestId || Boolean(loadError)}
                      {...register('password')}
                    />
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-xs text-red-400">
                      {errors.password.message}
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full bg-linear-to-r from-brand-500 to-orange-500 text-slate-950 hover:brightness-105"
                  disabled={isPending || !requestId || Boolean(loadError)}
                >
                  {isPending ? t('common.loggingIn') : t('oidcLogin.submitLabel')}
                </Button>
              </form>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    setForgotSuccess(false);
                    setForgotError('');
                  }}
                  className="text-xs font-semibold text-brand-500 hover:text-brand-400 hover:underline cursor-pointer"
                >
                  {t('common.forgotPassword')}
                </button>
              </div>
            </>
          )}

          {mode === 'forgot' && (
            <>
              {forgotSuccess && (
                <div className="mb-4 rounded-md border border-green-900 bg-green-950 px-3 py-2 text-sm text-green-300">
                  {t('common.forgotSuccess')}
                </div>
              )}

              {forgotError && (
                <div className="mb-4 rounded-md border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">
                  {forgotError}
                </div>
              )}

              {!forgotSuccess && (
                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="forgot-email" className="text-slate-300 mb-2">
                      {t('common.email')}
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <Input
                        id="forgot-email"
                        type="email"
                        placeholder="name@example.com"
                        className="border-slate-700 bg-slate-950 pl-8 text-white placeholder:text-slate-600"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-linear-to-r from-brand-500 to-orange-500 text-slate-950 hover:brightness-105"
                    disabled={forgotPending}
                  >
                    {forgotPending ? t('common.sending') : t('common.sendResetLink')}
                  </Button>
                </form>
              )}

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setForgotSuccess(false);
                    setForgotError('');
                  }}
                  className="text-xs font-semibold text-slate-400 hover:text-slate-200 hover:underline cursor-pointer"
                >
                  {t('common.backToLogin')}
                </button>
              </div>
            </>
          )}

          {info?.googleEnabled && mode === 'login' && (
            <>
              <div className="my-5 flex items-center gap-3 text-[0.68rem] uppercase tracking-widest text-slate-500">
                <span className="h-px flex-1 bg-slate-800" />
                {t('oidcLogin.googleDivider')}
                <span className="h-px flex-1 bg-slate-800" />
              </div>
              <a
                href={`/login/google?request_id=${encodeURIComponent(requestId)}`}
                className="flex items-center justify-center gap-2 rounded-md border border-slate-700 bg-slate-950 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
              >
                <img
                  src={`${import.meta.env.BASE_URL}google-icon.svg`}
                  alt="Google"
                  className="h-4 w-4"
                />
                {t('oidcLogin.googleLabel')}
              </a>
            </>
          )}

          <div className="mt-6 text-center text-xs text-slate-500">
            © {new Date().getFullYear()} Mobile Programing Club. All rights
            reserved.
          </div>
        </div>
      </div>
    </div>
  );
}
