import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Cake,
  Camera,
  CircleAlert,
  GraduationCap,
  Hash,
  Link2,
  Loader2,
  Lock,
  LogOut,
  Mail,
  MapPin,
  NotebookText,
  Pencil,
  Phone,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { authApi } from '@/api/auth';
import { ApiError } from '@/api/client';
import { discordApi, profileApi } from '@/api/profile';
import type { User } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import './profile.css';

function fullName(user: User): string {
  const parts = [user.lastName, user.middleName, user.firstName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : user.username;
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

function DiscordGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
    </svg>
  );
}

// ── Shared building blocks ────────────────────────────────────────

function InfoRow({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon?: typeof UserRound;
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="flex shrink-0 items-center gap-1.5 text-[0.8rem] text-slate-500">
        {Icon && <Icon className="h-3.5 w-3.5 text-slate-400" />}
        {label}
      </span>
      <span
        className={cn(
          'truncate text-right text-sm font-medium text-slate-800',
          mono && 'mpc-font-mono font-normal tracking-tight',
        )}
      >
        {value || <span className="font-normal text-slate-300">Chưa cập nhật</span>}
      </span>
    </div>
  );
}

function SectionPanel({
  id,
  icon: Icon,
  title,
  description,
  onEdit,
  editDisabled,
  children,
}: {
  id: string;
  icon: typeof UserRound;
  title: string;
  description: string;
  onEdit: () => void;
  editDisabled: boolean;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-32">
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/60">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Icon className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="mpc-font-display text-[0.95rem] font-semibold tracking-tight text-slate-900">
                {title}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">{description}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onEdit}
            disabled={editDisabled}
            title={editDisabled ? 'Hồ sơ đã bị quản trị viên khoá' : undefined}
          >
            <Pencil className="h-3.5 w-3.5" /> Sửa
          </Button>
        </div>
        <div className="divide-y divide-slate-100 px-5">{children}</div>
      </div>
    </section>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="flex items-center gap-1 text-xs text-red-600">
      <CircleAlert className="h-3 w-3 shrink-0" /> {message}
    </p>
  );
}

function EditDialog({
  open,
  onOpenChange,
  icon: Icon,
  title,
  formError,
  onSubmit,
  submitting,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  icon: typeof UserRound;
  title: string;
  formError: string | null;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
  submitting: boolean;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-brand-600" /> {title}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          {formError && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
              <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {formError}
            </div>
          )}
          {children}
          <DialogFooter>
            <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang lưu...
                </>
              ) : (
                'Lưu thay đổi'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const LOCKED_HINT = 'Trường này đã có dữ liệu — có thể sửa nhưng không thể để trống.';

// ── Personal section (always editable) ────────────────────────────

const personalSchema = z.object({
  lastName: z.string().trim().min(1, 'Vui lòng nhập họ'),
  middleName: z.string().trim().optional(),
  firstName: z.string().trim().min(1, 'Vui lòng nhập tên'),
});
type PersonalValues = z.infer<typeof personalSchema>;

function PersonalSection({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PersonalValues>({
    resolver: zodResolver(personalSchema),
    values: {
      lastName: user.lastName ?? '',
      middleName: user.middleName ?? '',
      firstName: user.firstName ?? '',
    },
  });

  const mutation = useMutation({
    mutationFn: (values: PersonalValues) => profileApi.update(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
      setOpen(false);
    },
  });

  return (
    <SectionPanel
      id="personal"
      icon={UserRound}
      title="Cá nhân"
      description="Họ tên hiển thị trong hồ sơ MPC của bạn"
      editDisabled={Boolean(user.isProfileLocked)}
      onEdit={() => {
        reset();
        setOpen(true);
      }}
    >
      <InfoRow label="Họ" value={user.lastName} />
      <InfoRow label="Tên đệm" value={user.middleName} />
      <InfoRow label="Tên" value={user.firstName} />

      <EditDialog
        open={open}
        onOpenChange={setOpen}
        icon={UserRound}
        title="Sửa thông tin cá nhân"
        formError={mutation.isError ? errorMessage(mutation.error, 'Cập nhật thất bại') : null}
        submitting={mutation.isPending}
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
      >
        <div className="grid grid-cols-3 gap-2.5">
          <div className="space-y-1.5">
            <Label htmlFor="lastName" className="text-xs font-semibold text-slate-600">
              Họ
            </Label>
            <Input id="lastName" autoFocus {...register('lastName')} />
            <FieldError message={errors.lastName?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="middleName" className="text-xs font-semibold text-slate-600">
              Tên đệm
            </Label>
            <Input id="middleName" {...register('middleName')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="firstName" className="text-xs font-semibold text-slate-600">
              Tên
            </Label>
            <Input id="firstName" {...register('firstName')} />
            <FieldError message={errors.firstName?.message} />
          </div>
        </div>
      </EditDialog>
    </SectionPanel>
  );
}

// ── Student section (lock-once-set) ───────────────────────────────

function makeStudentSchema(user: User) {
  return z.object({
    mssv: z
      .string()
      .trim()
      .optional()
      .refine((v) => !(user.mssv && !v), { message: LOCKED_HINT }),
    className: z
      .string()
      .trim()
      .max(10, 'Tối đa 10 ký tự')
      .optional()
      .refine((v) => !(user.className && !v), { message: LOCKED_HINT }),
    faculty: z
      .string()
      .trim()
      .optional()
      .refine((v) => !(user.faculty && !v), { message: LOCKED_HINT }),
  });
}
type StudentValues = z.infer<ReturnType<typeof makeStudentSchema>>;

function StudentSection({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const schema = useMemo(() => makeStudentSchema(user), [user]);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StudentValues>({
    resolver: zodResolver(schema),
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

  const anyLocked = Boolean(user.mssv || user.className || user.faculty);

  return (
    <SectionPanel
      id="student"
      icon={GraduationCap}
      title="Sinh viên"
      description="Thông tin học vụ — khoá lại từng phần sau khi điền"
      editDisabled={Boolean(user.isProfileLocked)}
      onEdit={() => {
        reset();
        setOpen(true);
      }}
    >
      <InfoRow icon={Hash} label="MSSV" value={user.mssv} mono />
      <InfoRow icon={Users} label="Lớp" value={user.className} mono />
      <InfoRow icon={Building2} label="Khoa" value={user.faculty} />

      <EditDialog
        open={open}
        onOpenChange={setOpen}
        icon={GraduationCap}
        title="Sửa thông tin sinh viên"
        formError={mutation.isError ? errorMessage(mutation.error, 'Cập nhật thất bại') : null}
        submitting={mutation.isPending}
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
      >
        {anyLocked && (
          <p className="flex items-start gap-1.5 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            <Lock className="mt-0.5 h-3 w-3 shrink-0" /> {LOCKED_HINT}
          </p>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="mssv" className="text-xs font-semibold text-slate-600">
            MSSV
          </Label>
          <Input id="mssv" className="mpc-font-mono" {...register('mssv')} />
          <FieldError message={errors.mssv?.message} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="className" className="text-xs font-semibold text-slate-600">
            Lớp
          </Label>
          <Input id="className" className="mpc-font-mono" maxLength={10} {...register('className')} />
          <FieldError message={errors.className?.message} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="faculty" className="text-xs font-semibold text-slate-600">
            Khoa
          </Label>
          <Input id="faculty" {...register('faculty')} />
          <FieldError message={errors.faculty?.message} />
        </div>
      </EditDialog>
    </SectionPanel>
  );
}

// ── Contact section (lock-once-set) ───────────────────────────────

const PHONE_RE = /^(0|\+84)(3|5|7|8|9)\d{8}$/;

function makeContactSchema(user: User) {
  return z.object({
    phone: z
      .string()
      .trim()
      .optional()
      .refine((v) => !(user.phone && !v), { message: LOCKED_HINT })
      .refine((v) => !v || PHONE_RE.test(v), { message: 'Số điện thoại không hợp lệ' }),
    address: z
      .string()
      .trim()
      .optional()
      .refine((v) => !(user.address && !v), { message: LOCKED_HINT }),
    dob: z
      .string()
      .optional()
      .refine((v) => !(user.dob && !v), { message: LOCKED_HINT })
      .refine((v) => !v || new Date(v) <= new Date(), { message: 'Ngày sinh không hợp lệ' }),
  });
}
type ContactValues = z.infer<ReturnType<typeof makeContactSchema>>;

function ContactSection({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const schema = useMemo(() => makeContactSchema(user), [user]);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactValues>({
    resolver: zodResolver(schema),
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

  const anyLocked = Boolean(user.phone || user.address || user.dob);

  return (
    <SectionPanel
      id="contact"
      icon={Phone}
      title="Liên hệ"
      description="Số điện thoại, địa chỉ và ngày sinh của bạn"
      editDisabled={Boolean(user.isProfileLocked)}
      onEdit={() => {
        reset();
        setOpen(true);
      }}
    >
      <InfoRow icon={Phone} label="Số điện thoại" value={user.phone} mono />
      <InfoRow icon={MapPin} label="Địa chỉ" value={user.address} />
      <InfoRow
        icon={Cake}
        label="Ngày sinh"
        value={user.dob ? new Date(user.dob).toLocaleDateString('vi-VN') : null}
      />

      <EditDialog
        open={open}
        onOpenChange={setOpen}
        icon={Phone}
        title="Sửa thông tin liên hệ"
        formError={mutation.isError ? errorMessage(mutation.error, 'Cập nhật thất bại') : null}
        submitting={mutation.isPending}
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
      >
        {anyLocked && (
          <p className="flex items-start gap-1.5 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            <Lock className="mt-0.5 h-3 w-3 shrink-0" /> {LOCKED_HINT}
          </p>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="phone" className="text-xs font-semibold text-slate-600">
            Số điện thoại
          </Label>
          <Input id="phone" placeholder="09xxxxxxxx" {...register('phone')} />
          <FieldError message={errors.phone?.message} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="address" className="text-xs font-semibold text-slate-600">
            Địa chỉ
          </Label>
          <Input id="address" {...register('address')} />
          <FieldError message={errors.address?.message} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dob" className="text-xs font-semibold text-slate-600">
            Ngày sinh
          </Label>
          <Input id="dob" type="date" {...register('dob')} />
          <FieldError message={errors.dob?.message} />
        </div>
      </EditDialog>
    </SectionPanel>
  );
}

// ── Bio section (always editable) ─────────────────────────────────

const bioSchema = z.object({
  bio: z.string().trim().max(280, 'Tối đa 280 ký tự').optional(),
});
type BioValues = z.infer<typeof bioSchema>;

function BioSection({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<BioValues>({
    resolver: zodResolver(bioSchema),
    values: { bio: user.bio ?? '' },
  });
  const bioLength = watch('bio')?.length ?? 0;

  const mutation = useMutation({
    mutationFn: (values: BioValues) => profileApi.update(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
      setOpen(false);
    },
  });

  return (
    <SectionPanel
      id="bio"
      icon={NotebookText}
      title="Tiểu sử"
      description="Một dòng giới thiệu ngắn về bạn"
      editDisabled={Boolean(user.isProfileLocked)}
      onEdit={() => {
        reset();
        setOpen(true);
      }}
    >
      <p className="py-2.5 text-sm leading-relaxed text-slate-700">
        {user.bio || <span className="text-slate-300">Chưa có tiểu sử — hãy giới thiệu đôi nét về bạn.</span>}
      </p>

      <EditDialog
        open={open}
        onOpenChange={setOpen}
        icon={NotebookText}
        title="Sửa tiểu sử"
        formError={mutation.isError ? errorMessage(mutation.error, 'Cập nhật thất bại') : null}
        submitting={mutation.isPending}
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
      >
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="bio" className="text-xs font-semibold text-slate-600">
              Tiểu sử ngắn
            </Label>
            <span
              className={cn(
                'text-xs tabular-nums text-slate-400',
                bioLength > 280 && 'text-red-500',
              )}
            >
              {bioLength}/280
            </span>
          </div>
          <Textarea
            id="bio"
            rows={4}
            placeholder="Vd: Lập trình viên Android, thích cà phê và bug-free code."
            {...register('bio')}
          />
          <FieldError message={errors.bio?.message} />
        </div>
      </EditDialog>
    </SectionPanel>
  );
}

// ── Linked accounts section ───────────────────────────────────────

function LinkedAccountsSection({ user }: { user: User }) {
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
    <section id="linked" className="scroll-mt-32">
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/60">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Link2 className="h-4.5 w-4.5" />
          </div>
          <div>
            <h2 className="mpc-font-display text-[0.95rem] font-semibold tracking-tight text-slate-900">
              Tài khoản liên kết
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">Đăng nhập nhanh và kết nối bot của CLB</p>
          </div>
        </div>
        <div className="divide-y divide-slate-100 px-5">
          <div className="flex items-center justify-between gap-4 py-3">
            <span className="flex items-center gap-2.5 text-sm text-slate-700">
              <img src={`${import.meta.env.BASE_URL}google-icon.svg`} alt="" className="h-4 w-4" />
              Google
            </span>
            {user.googleId ? (
              <Badge variant="success">Đã liên kết</Badge>
            ) : (
              <Badge variant="outline">Chưa liên kết</Badge>
            )}
          </div>
          {discordStatus?.enabled && (
            <div className="flex items-center justify-between gap-4 py-3">
              <span className="flex items-center gap-2.5 text-sm text-slate-700">
                <DiscordGlyph className="h-4 w-4 text-[#5865F2]" />
                Discord
                {user.discordUsername && (
                  <span className="mpc-font-mono text-xs text-slate-400">@{user.discordUsername}</span>
                )}
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
                  size="sm"
                  onClick={() => {
                    window.location.href = '/connect/discord';
                  }}
                >
                  Liên kết
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ── Security section ───────────────────────────────────────────────

function SecuritySection({ user }: { user: User }) {
  const [sent, setSent] = useState(false);
  const mutation = useMutation({
    mutationFn: () => authApi.forgotPassword(user.email!),
    onSuccess: () => setSent(true),
  });

  return (
    <section id="security" className="scroll-mt-32">
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/60">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <ShieldCheck className="h-4.5 w-4.5" />
          </div>
          <div>
            <h2 className="mpc-font-display text-[0.95rem] font-semibold tracking-tight text-slate-900">
              Bảo mật
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">Đổi mật khẩu đăng nhập</p>
          </div>
        </div>
        <div className="px-5 py-4">
          {user.email ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-600">
                Gửi liên kết đổi mật khẩu tới{' '}
                <span className="mpc-font-mono text-slate-800">{user.email}</span>
              </p>
              {sent ? (
                <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                  <ShieldCheck className="h-4 w-4" /> Đã gửi, kiểm tra hòm thư
                </span>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => mutation.mutate()}
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Mail className="h-3.5 w-3.5" />
                  )}
                  Gửi liên kết đổi mật khẩu
                </Button>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Tài khoản chưa có email — liên hệ quản trị viên để đổi mật khẩu.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

// ── Identity banner + top nav ─────────────────────────────────────

function IdentityBanner({ user }: { user: User }) {
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

  return (
    <div className="flex flex-wrap items-center gap-5 px-1 py-8 sm:px-0">
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="group relative block h-20 w-20 overflow-hidden rounded-full border-2 border-white bg-slate-100 shadow-md ring-1 ring-slate-200"
          title="Đổi ảnh đại diện"
        >
          {user.avatar ? (
            <img src={user.avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            <UserRound className="m-auto mt-5 h-9 w-9 text-slate-300" />
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-slate-900/50 opacity-0 transition-opacity group-hover:opacity-100">
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            ) : (
              <Camera className="h-5 w-5 text-white" />
            )}
          </span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
      <div className="min-w-0">
        <h1 className="mpc-font-display truncate text-2xl font-bold tracking-tight text-slate-900">
          {fullName(user)}
        </h1>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <span className="mpc-font-mono rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
            @{user.username}
          </span>
          <Badge variant={user.webRole === 'ADMIN' ? 'default' : 'outline'}>{user.webRole}</Badge>
          <span className="text-xs text-slate-400">
            Thành viên từ {new Date(user.createdAt).toLocaleDateString('vi-VN')}
          </span>
        </div>
      </div>
    </div>
  );
}

function TopBar({ user }: { user: User }) {
  const handleLogout = async () => {
    await profileApi.logout();
    window.location.href = '/login';
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="mpc-font-display flex items-baseline gap-1.5 text-sm font-bold tracking-wide text-slate-900">
          MPC
          <span className="text-[0.65rem] font-semibold tracking-widest text-slate-400">
            HỒ SƠ
          </span>
        </div>
        <div className="flex items-center gap-2">
          {user.webRole === 'ADMIN' && (
            <a
              href="/admin/ui"
              className="inline-flex h-8 items-center rounded-lg px-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              Trang quản trị
            </a>
          )}
          <Button type="button" variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="h-3.5 w-3.5" /> Đăng xuất
          </Button>
        </div>
      </div>
    </header>
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
    <div className="min-h-screen bg-slate-50">
      <TopBar user={user} />

      <div className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
        <IdentityBanner user={user} />

        {user.isProfileLocked && (
          <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            Quản trị viên đã khoá chỉnh sửa hồ sơ của bạn.
          </div>
        )}

        <div className="space-y-5">
          <PersonalSection user={user} />
          <StudentSection user={user} />
          <ContactSection user={user} />
          <BioSection user={user} />
          <LinkedAccountsSection user={user} />
          <SecuritySection user={user} />
        </div>
      </div>
    </div>
  );
}
