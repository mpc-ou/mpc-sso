import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Lock,
  LogOut,
  Pencil,
  Shield,
  ShieldAlert,
  Upload,
  User as UserIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { authApi } from '@/api/auth';
import { ApiError } from '@/api/client';
import { discordApi, profileApi } from '@/api/profile';
import type { User } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function fullName(user: User): string {
  const parts = [user.lastName, user.middleName, user.firstName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : user.username;
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

// ── Zone edit modal shell ────────────────────────────────────────

function ZoneCard({
  icon: Icon,
  title,
  locked,
  onEdit,
  children,
}: {
  icon: typeof UserIcon;
  title: string;
  locked: boolean;
  onEdit: () => void;
  children: ReactNode;
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-brand-600" />
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onEdit}
          disabled={locked}
          title={locked ? 'Hồ sơ đã bị quản trị viên khoá' : 'Sửa'}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-2 pt-4 text-sm">{children}</CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <span className="text-right text-slate-800">{value || '—'}</span>
    </div>
  );
}

// ── Personal info zone (always editable) ─────────────────────────

interface PersonalValues {
  lastName: string;
  middleName: string;
  firstName: string;
}

function PersonalZone({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset } = useForm<PersonalValues>({
    values: {
      lastName: user.lastName ?? '',
      middleName: user.middleName ?? '',
      firstName: user.firstName ?? '',
    },
  });

  const mutation = useMutation({
    mutationFn: (values: PersonalValues) =>
      profileApi.update({
        lastName: values.lastName,
        middleName: values.middleName,
        firstName: values.firstName,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
      setOpen(false);
    },
  });

  return (
    <ZoneCard
      icon={UserIcon}
      title="Cá nhân"
      locked={Boolean(user.isProfileLocked)}
      onEdit={() => {
        reset();
        setOpen(true);
      }}
    >
      <Field label="Họ" value={user.lastName} />
      <Field label="Tên đệm" value={user.middleName} />
      <Field label="Tên" value={user.firstName} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sửa thông tin cá nhân</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmit((values) => mutation.mutate(values))}
            className="space-y-3"
          >
            {mutation.isError && (
              <p className="text-xs text-red-600">
                {errorMessage(mutation.error, 'Cập nhật thất bại')}
              </p>
            )}
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label htmlFor="lastName">Họ</Label>
                <Input id="lastName" {...register('lastName')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="middleName">Tên đệm</Label>
                <Input id="middleName" {...register('middleName')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="firstName">Tên</Label>
                <Input id="firstName" {...register('firstName')} />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Đang lưu...' : 'Lưu'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </ZoneCard>
  );
}

// ── Shared: lockable-field zones (student, contact) ──────────────

/** Fields that, once set on the server, can never be cleared back to empty via self-service edits. */
function assertNotClearing<T extends object>(
  user: User,
  values: T,
): string | null {
  for (const [field, value] of Object.entries(values) as [string, string][]) {
    const current = (user as unknown as Record<string, unknown>)[field];
    if (current && !value.trim()) {
      return 'Trường thông tin này đã được điền và không thể để trống.';
    }
  }
  return null;
}

interface StudentValues {
  mssv: string;
  className: string;
  faculty: string;
}

function StudentZone({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const [blockError, setBlockError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset } = useForm<StudentValues>({
    values: {
      mssv: user.mssv ?? '',
      className: user.className ?? '',
      faculty: user.faculty ?? '',
    },
  });

  const mutation = useMutation({
    mutationFn: (values: StudentValues) => profileApi.update(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
      setOpen(false);
    },
  });

  const onSubmit = (values: StudentValues) => {
    const blocked = assertNotClearing(user, values);
    if (blocked) {
      setBlockError(blocked);
      return;
    }
    setBlockError(null);
    mutation.mutate(values);
  };

  return (
    <ZoneCard
      icon={Shield}
      title="Sinh viên"
      locked={Boolean(user.isProfileLocked)}
      onEdit={() => {
        reset();
        setBlockError(null);
        setOpen(true);
      }}
    >
      <Field label="MSSV" value={user.mssv} />
      <Field label="Lớp" value={user.className} />
      <Field label="Khoa" value={user.faculty} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sửa thông tin sinh viên</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            {(blockError || mutation.isError) && (
              <p className="text-xs text-red-600">
                {blockError ?? errorMessage(mutation.error, 'Cập nhật thất bại')}
              </p>
            )}
            <div className="space-y-1">
              <Label htmlFor="mssv">
                MSSV {user.mssv && <Lock className="inline h-3 w-3 text-slate-400" />}
              </Label>
              <Input id="mssv" {...register('mssv')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="className">
                Lớp {user.className && <Lock className="inline h-3 w-3 text-slate-400" />}
              </Label>
              <Input id="className" maxLength={10} {...register('className')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="faculty">
                Khoa {user.faculty && <Lock className="inline h-3 w-3 text-slate-400" />}
              </Label>
              <Input id="faculty" {...register('faculty')} />
            </div>
            {(user.mssv || user.className || user.faculty) && (
              <p className="text-xs text-slate-400">
                Các trường đã điền có thể chỉnh sửa nhưng không thể để trống.
              </p>
            )}
            <DialogFooter>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Đang lưu...' : 'Lưu'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </ZoneCard>
  );
}

interface ContactValues {
  phone: string;
  address: string;
  dob: string;
}

function ContactZone({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const [blockError, setBlockError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset } = useForm<ContactValues>({
    values: {
      phone: user.phone ?? '',
      address: user.address ?? '',
      dob: user.dob ? user.dob.slice(0, 10) : '',
    },
  });

  const mutation = useMutation({
    mutationFn: (values: ContactValues) => profileApi.update(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
      setOpen(false);
    },
  });

  const onSubmit = (values: ContactValues) => {
    const blocked = assertNotClearing(user, values);
    if (blocked) {
      setBlockError(blocked);
      return;
    }
    setBlockError(null);
    mutation.mutate(values);
  };

  return (
    <ZoneCard
      icon={Shield}
      title="Liên hệ"
      locked={Boolean(user.isProfileLocked)}
      onEdit={() => {
        reset();
        setBlockError(null);
        setOpen(true);
      }}
    >
      <Field label="Số điện thoại" value={user.phone} />
      <Field label="Địa chỉ" value={user.address} />
      <Field label="Ngày sinh" value={user.dob?.slice(0, 10)} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sửa thông tin liên hệ</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            {(blockError || mutation.isError) && (
              <p className="text-xs text-red-600">
                {blockError ?? errorMessage(mutation.error, 'Cập nhật thất bại')}
              </p>
            )}
            <div className="space-y-1">
              <Label htmlFor="phone">
                Số điện thoại {user.phone && <Lock className="inline h-3 w-3 text-slate-400" />}
              </Label>
              <Input id="phone" {...register('phone')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="address">
                Địa chỉ {user.address && <Lock className="inline h-3 w-3 text-slate-400" />}
              </Label>
              <Input id="address" {...register('address')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="dob">
                Ngày sinh {user.dob && <Lock className="inline h-3 w-3 text-slate-400" />}
              </Label>
              <Input id="dob" type="date" {...register('dob')} />
            </div>
            {(user.phone || user.address || user.dob) && (
              <p className="text-xs text-slate-400">
                Các trường đã điền có thể chỉnh sửa nhưng không thể để trống.
              </p>
            )}
            <DialogFooter>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Đang lưu...' : 'Lưu'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </ZoneCard>
  );
}

// ── Bio zone (always editable) ────────────────────────────────────

function BioZone({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset } = useForm<{ bio: string }>({
    values: { bio: user.bio ?? '' },
  });

  const mutation = useMutation({
    mutationFn: (values: { bio: string }) => profileApi.update(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
      setOpen(false);
    },
  });

  return (
    <ZoneCard
      icon={UserIcon}
      title="Tiểu sử"
      locked={Boolean(user.isProfileLocked)}
      onEdit={() => {
        reset();
        setOpen(true);
      }}
    >
      <p className="text-slate-800">{user.bio || '—'}</p>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sửa tiểu sử</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmit((values) => mutation.mutate(values))}
            className="space-y-3"
          >
            {mutation.isError && (
              <p className="text-xs text-red-600">
                {errorMessage(mutation.error, 'Cập nhật thất bại')}
              </p>
            )}
            <div className="space-y-1">
              <Label htmlFor="bio">Tiểu sử ngắn</Label>
              <Input id="bio" {...register('bio')} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Đang lưu...' : 'Lưu'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </ZoneCard>
  );
}

// ── Linked accounts zone ──────────────────────────────────────────

function LinkedAccountsZone({ user }: { user: User }) {
  const queryClient = useQueryClient();
  const { data: discordStatus } = useQuery({
    queryKey: ['discord-enabled'],
    queryFn: discordApi.enabled,
  });

  const unlinkMutation = useMutation({
    mutationFn: discordApi.unlink,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  return (
    <Card className="shadow-sm">
      <CardHeader className="border-b border-slate-100 pb-3">
        <CardTitle className="text-base font-semibold">Tài khoản liên kết</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-700">Google</span>
          {user.googleId ? (
            <Badge variant="success">Đã liên kết</Badge>
          ) : (
            <Badge variant="outline">Chưa liên kết</Badge>
          )}
        </div>
        {discordStatus?.enabled && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-700">
              Discord {user.discordUsername && `(${user.discordUsername})`}
            </span>
            {user.discordId ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => unlinkMutation.mutate()}
                disabled={unlinkMutation.isPending}
              >
                Huỷ liên kết
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  window.location.href = '/connect/discord';
                }}
              >
                Liên kết Discord
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Security zone ─────────────────────────────────────────────────

function SecurityZone({ user }: { user: User }) {
  const [sent, setSent] = useState(false);
  const mutation = useMutation({
    mutationFn: () => authApi.forgotPassword(user.email!),
    onSuccess: () => setSent(true),
  });

  return (
    <Card className="shadow-sm">
      <CardHeader className="border-b border-slate-100 pb-3">
        <CardTitle className="text-base font-semibold">Bảo mật</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        {user.email ? (
          <>
            <p className="text-sm text-slate-600">
              Gửi liên kết đổi mật khẩu tới {user.email}.
            </p>
            {sent ? (
              <p className="text-sm text-emerald-600">
                Đã gửi liên kết, vui lòng kiểm tra hòm thư.
              </p>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending}
              >
                {mutation.isPending ? 'Đang gửi...' : 'Đổi mật khẩu'}
              </Button>
            )}
          </>
        ) : (
          <p className="text-sm text-slate-500">
            Tài khoản chưa có email, liên hệ quản trị viên để đổi mật khẩu.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Header ─────────────────────────────────────────────────────────

function ProfileHeader({ user }: { user: User }) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await profileApi.uploadAvatar(file);
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleLogout = async () => {
    await profileApi.logout();
    window.location.href = '/login';
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100"
          title="Đổi ảnh đại diện"
        >
          {user.avatar ? (
            <img src={user.avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            <UserIcon className="m-auto mt-4 h-8 w-8 text-slate-400" />
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100">
            <Upload className="h-4 w-4 text-white" />
          </span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <div>
          <h1 className="text-lg font-bold text-slate-900">{fullName(user)}</h1>
          <p className="text-sm text-slate-500">
            @{user.username} · <Badge variant="outline">{user.webRole}</Badge>
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {user.webRole === 'ADMIN' && (
          <a
            href="/admin/ui"
            className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Vào trang quản trị
          </a>
        )}
        <Button type="button" variant="outline" onClick={handleLogout}>
          <LogOut className="h-4 w-4" /> Đăng xuất
        </Button>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────

export function ProfilePage() {
  const { data: user, isLoading, isError } = useQuery({
    queryKey: ['profile'],
    queryFn: profileApi.me,
    retry: false,
  });

  useEffect(() => {
    if (isError) {
      window.location.href = '/login';
    }
  }, [isError]);

  if (isError) {
    return null;
  }

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400">
        Đang tải...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <ProfileHeader user={user} />

      {user.isProfileLocked && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          Quản trị viên đã khoá chỉnh sửa hồ sơ của bạn.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <PersonalZone user={user} />
        <StudentZone user={user} />
        <ContactZone user={user} />
        <BioZone user={user} />
        <LinkedAccountsZone user={user} />
        <SecurityZone user={user} />
      </div>
    </div>
  );
}
