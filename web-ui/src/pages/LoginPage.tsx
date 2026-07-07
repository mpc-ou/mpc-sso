import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation, Trans } from 'react-i18next';
import { z } from 'zod';
import { ApiError } from '@/api/client';
import { authApi } from '@/api/auth';
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

export function LoginPage() {
  const { t, i18n } = useTranslation();
  const schema = useMemo(() => makeSchema(t), [t]);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const token = params.get('token');
  const isResetPath = useMemo(() => window.location.pathname.endsWith('/password/reset'), []);

  const [mode, setMode] = useState<'login' | 'forgot' | 'reset' | 'invalid-token'>(() => {
    if (isResetPath) {
      return token ? 'reset' : 'invalid-token';
    }
    return 'login';
  });
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<StoredError>(null);

  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotPending, setForgotPending] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetPending, setResetPending] = useState(false);

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      setForgotError('Vui lòng nhập email');
      return;
    }
    setForgotPending(true);
    setForgotError('');
    setForgotSuccess(false);
    try {
      await authApi.forgotPassword(forgotEmail);
      setForgotSuccess(true);
    } catch (err) {
      setForgotError(err instanceof Error ? err.message : 'Gửi yêu cầu khôi phục thất bại');
    } finally {
      setForgotPending(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      setResetError('Mật khẩu mới phải từ 8 ký tự trở lên');
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError('Mật khẩu xác nhận không khớp');
      return;
    }
    setResetPending(true);
    setResetError('');
    setResetSuccess(false);
    try {
      await authApi.resetPassword({ token: token!, newPassword });
      setResetSuccess(true);
    } catch (err) {
      setResetError(err instanceof Error ? err.message : 'Đặt lại mật khẩu thất bại');
    } finally {
      setResetPending(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    setIsPending(true);
    setError(null);
    try {
      await authApi.login(values);
      window.location.assign('/admin/ui/');
    } catch (err) {
      setError(
        err instanceof ApiError
          ? { kind: 'api', message: err.message, i18n: err.errorI18n }
          : { kind: 'key', key: 'common.loginFailed' },
      );
      setIsPending(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-100">
      <div
        className="relative hidden flex-[1.4] flex-col justify-between bg-cover bg-center p-12 text-white md:flex"
        style={{ backgroundImage: `url(${import.meta.env.BASE_URL}about.jpg)` }}
      >
        <div className="absolute inset-0 bg-linear-to-t from-slate-950/90 via-slate-950/40 to-slate-950/70" />
        <div className="relative font-extrabold tracking-wide">
          MPC
          <small className="block text-[0.62rem] font-bold tracking-widest text-brand-500">
            MOBILE PROGRAMING CLUB
          </small>
        </div>
        <div className="relative">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-brand-500">
            {t('adminLogin.sideLabel')}
          </p>
          <h1 className="mb-2 text-3xl font-extrabold leading-tight">
            <Trans i18nKey="adminLogin.sideTitle">
              Quản trị hệ thống <span className="text-brand-500">SSO</span>
            </Trans>
          </h1>
          <p className="text-sm text-slate-300">{t('adminLogin.sideSubtitle')}</p>
        </div>
      </div>

      <div className="relative flex flex-1 items-center justify-center px-4 py-12">
        <LanguageSwitcher />
        <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
          {mode === 'login' && (
            <>
              <h1 className="mb-6 text-lg font-semibold text-slate-900">{t('adminLogin.heading')}</h1>

              {renderError(error, t, i18n.language) && (
                <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                  {renderError(error, t, i18n.language)}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="login">{t('common.usernameOrEmail')}</Label>
                  <Input id="login" autoComplete="username" {...register('login')} />
                  {errors.login && (
                    <p className="mt-1 text-xs text-red-600">{errors.login.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="password">{t('common.password')}</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    {...register('password')}
                  />
                  {errors.password && (
                    <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? t('common.loggingIn') : t('common.login')}
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
                  className="text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline cursor-pointer"
                >
                  {t('common.forgotPassword')}
                </button>
              </div>
            </>
          )}

          {mode === 'forgot' && (
            <>
              <h1 className="mb-2 text-lg font-semibold text-slate-900">{t('common.forgotTitle')}</h1>
              <p className="mb-6 text-xs text-slate-500">
                {t('common.forgotSubtitle')}
              </p>

              {forgotSuccess && (
                <div className="mb-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
                  {t('common.forgotSuccess')}
                </div>
              )}

              {forgotError && (
                <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                  {forgotError}
                </div>
              )}

              {!forgotSuccess && (
                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="forgot-email">{t('common.email')}</Label>
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="name@example.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={forgotPending}>
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
                  className="text-xs font-semibold text-slate-500 hover:text-slate-700 hover:underline cursor-pointer"
                >
                  {t('common.backToLogin')}
                </button>
              </div>
            </>
          )}

          {mode === 'reset' && (
            <>
              <h1 className="mb-2 text-lg font-semibold text-slate-900">{t('common.resetTitle')}</h1>
              <p className="mb-6 text-xs text-slate-500 font-medium">
                {t('common.resetSubtitle')}
              </p>

              {resetSuccess && (
                <div className="mb-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
                  {t('common.resetSuccess')}
                </div>
              )}

              {resetError && (
                <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                  {resetError}
                </div>
              )}

              {!resetSuccess && (
                <form onSubmit={handleResetSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="new-password">{t('common.newPassword')}</Label>
                    <Input
                      id="new-password"
                      type="password"
                      placeholder={t('common.min8Chars')}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirm-password">{t('common.confirmPassword')}</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder={t('common.repeatPassword')}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={resetPending}>
                    {resetPending ? t('common.updating') : t('common.updatePassword')}
                  </Button>
                </form>
              )}

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => {
                    window.location.assign('/login');
                  }}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-700 hover:underline cursor-pointer"
                >
                  {t('common.backToLogin')}
                </button>
              </div>
            </>
          )}

          {mode === 'invalid-token' && (
            <>
              <h1 className="mb-2 text-lg font-semibold text-slate-900">{t('common.invalidLinkTitle')}</h1>
              <p className="mb-6 text-xs text-slate-500">
                {t('common.invalidLinkSubtitle')}
              </p>
              <Button onClick={() => window.location.assign('/login')} className="w-full">
                {t('common.backToLogin')}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
