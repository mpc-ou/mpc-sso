import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { z } from 'zod';
import { ArrowLeft, User, KeyRound, GraduationCap, Eye, Loader2, Upload } from 'lucide-react';
import { ApiError } from '@/api/client';
import { usersApi } from '@/api/users';
import { SimpleSelect } from '@/components/SimpleSelect';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const WEB_ROLE_OPTIONS = [
  { value: 'GUEST', label: 'GUEST (Khách)' },
  { value: 'MEMBER', label: 'MEMBER (Thành viên)' },
  { value: 'COLLABORATOR', label: 'Cộng tác viên' },
  { value: 'ADMIN', label: 'ADMIN (Quản trị viên)' },
];

const schema = z.object({
  email: z.union([z.literal(''), z.string().email('Email không hợp lệ')]),
  webRole: z.enum(['ADMIN', 'COLLABORATOR', 'MEMBER', 'GUEST']),
  isDisabled: z.boolean(),
  password: z.union([z.literal(''), z.string().min(8, 'Tối thiểu 8 ký tự')]),
  firstName: z.string().min(1, 'Tên là bắt buộc'),
  middleName: z.string().optional(),
  lastName: z.string().min(1, 'Họ là bắt buộc'),
  dob: z.string().optional(),
  address: z.string().optional(),
  className: z.string().optional(),
  mssv: z.string().optional(),
  faculty: z.string().optional(),
  phone: z.string().optional(),
  avatar: z.string().optional(),
  bio: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function UserEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['users', id],
    queryFn: () => usersApi.get(id!),
    enabled: Boolean(id),
  });

  const [uploading, setUploading] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      webRole: 'GUEST',
      isDisabled: false,
      password: '',
      firstName: '',
      middleName: '',
      lastName: '',
      dob: '',
      address: '',
      className: '',
      mssv: '',
      faculty: '',
      phone: '',
      avatar: '',
      bio: '',
    },
  });

  const avatarValue = watch('avatar');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const res = await usersApi.uploadAvatar(file, avatarValue || undefined);
      setValue('avatar', res.url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Tải ảnh lên thất bại');
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (user) {
      reset({
        email: user.email ?? '',
        webRole: user.webRole,
        isDisabled: user.isDisabled,
        password: '',
        firstName: user.firstName ?? '',
        middleName: user.middleName ?? '',
        lastName: user.lastName ?? '',
        dob: user.dob ? user.dob.slice(0, 10) : '',
        address: user.address ?? '',
        className: user.className ?? '',
        mssv: user.mssv ?? '',
        faculty: user.faculty ?? '',
        phone: user.phone ?? '',
        avatar: user.avatar ?? '',
        bio: user.bio ?? '',
      });
    }
  }, [user, reset]);

  const updateMutation = useMutation({
    mutationFn: (values: FormValues) =>
      usersApi.update(id!, {
        email: values.email || undefined,
        webRole: values.webRole,
        isDisabled: values.isDisabled,
        password: values.password || undefined,
        firstName: values.firstName,
        middleName: values.middleName || undefined,
        lastName: values.lastName,
        dob: values.dob ? new Date(values.dob).toISOString() : undefined,
        address: values.address || undefined,
        className: values.className || undefined,
        mssv: values.mssv || undefined,
        faculty: values.faculty || undefined,
        phone: values.phone || undefined,
        avatar: values.avatar || undefined,
        bio: values.bio || undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      void queryClient.invalidateQueries({ queryKey: ['users', id] });
      navigate(`/users/${id}`);
    },
  });

  if (!user) return <p className="text-slate-400">Đang tải...</p>;

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to={`/users/${id}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-xl font-bold text-slate-900">Sửa user: {user.username}</h1>
        </div>
        <Link
          to={`/users/${id}`}
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          <Eye className="h-4 w-4 mr-1" /> Xem Chi Tiết
        </Link>
      </div>

      {updateMutation.isError && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {updateMutation.error instanceof ApiError
            ? updateMutation.error.message
            : 'Cập nhật thất bại'}
        </div>
      )}

      <form onSubmit={handleSubmit((values) => updateMutation.mutate(values))} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Section 1: Account Credentials */}
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center gap-2 border-b border-slate-100 pb-3">
              <KeyRound className="h-4 w-4 text-brand-600" />
              <CardTitle className="text-base font-semibold">Tài khoản xác thực</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-1">
                <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Email</Label>
                <Input id="email" type="email" {...register('email')} />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="webRole" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Web Role</Label>
                <Controller
                  control={control}
                  name="webRole"
                  render={({ field }) => (
                    <SimpleSelect
                      value={field.value}
                      onValueChange={field.onChange}
                      options={WEB_ROLE_OPTIONS}
                    />
                  )}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Đặt lại mật khẩu (bỏ trống nếu không đổi)</Label>
                <Input id="password" type="password" {...register('password')} placeholder="••••••••" />
                {errors.password && (
                  <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
                )}
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input
                  id="isDisabled"
                  type="checkbox"
                  {...register('isDisabled')}
                  className="h-4 w-4 rounded border-slate-300 focus:ring-brand-500"
                />
                <Label htmlFor="isDisabled" className="mb-0 text-sm font-medium text-slate-700">
                  Vô hiệu hoá tài khoản
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Personal Profile */}
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center gap-2 border-b border-slate-100 pb-3">
              <User className="h-4 w-4 text-brand-600" />
              <CardTitle className="text-base font-semibold">Thông tin cá nhân</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1 col-span-1">
                  <Label htmlFor="lastName" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Họ</Label>
                  <Input id="lastName" {...register('lastName')} />
                  {errors.lastName && (
                    <p className="mt-1 text-xs text-red-600">{errors.lastName.message}</p>
                  )}
                </div>
                <div className="space-y-1 col-span-1">
                  <Label htmlFor="middleName" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tên đệm</Label>
                  <Input id="middleName" {...register('middleName')} />
                </div>
                <div className="space-y-1 col-span-1">
                  <Label htmlFor="firstName" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tên</Label>
                  <Input id="firstName" {...register('firstName')} />
                  {errors.firstName && (
                    <p className="mt-1 text-xs text-red-600">{errors.firstName.message}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="phone" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Số điện thoại</Label>
                  <Input id="phone" {...register('phone')} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="dob" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Ngày sinh</Label>
                  <Input id="dob" type="date" {...register('dob')} />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="address" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Địa chỉ</Label>
                <Input id="address" {...register('address')} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">Ảnh đại diện (Avatar)</Label>
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center border border-slate-200 relative shrink-0">
                    {avatarValue ? (
                      <img src={avatarValue} alt="Avatar Preview" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-8 w-8 text-slate-400" />
                    )}
                    {uploading && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Loader2 className="h-5 w-5 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900">
                        <Upload className="h-3.5 w-3.5" />
                        Tải ảnh lên
                        <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={uploading} />
                      </label>
                      {avatarValue && (
                        <button
                          type="button"
                          onClick={() => setValue('avatar', '')}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-600 shadow-sm transition-colors hover:bg-red-50"
                        >
                          Xoá
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">Chấp nhận JPG, PNG (tự động lưu lên Cloudinary)</p>
                  </div>
                </div>
                <div className="mt-2">
                  <Input
                    {...register('avatar')}
                    placeholder="Hoặc nhập liên kết ảnh trực tiếp..."
                    className="text-xs h-8 bg-slate-50/50"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Section 3: Academic & Bio */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center gap-2 border-b border-slate-100 pb-3">
            <GraduationCap className="h-4 w-4 text-brand-600" />
            <CardTitle className="text-base font-semibold">Thông tin học tập & Tiểu sử</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label htmlFor="mssv" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Mã số sinh viên (MSSV)</Label>
                <Input id="mssv" {...register('mssv')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="className" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Lớp</Label>
                <Input id="className" {...register('className')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="faculty" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Khoa</Label>
                <Input id="faculty" {...register('faculty')} />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="bio" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tiểu sử ngắn (Bio)</Label>
              <Input id="bio" {...register('bio')} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pt-2">
          <Link
            to={`/users/${id}`}
            className={buttonVariants({ variant: 'outline' })}
          >
            Hủy
          </Link>
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
          </Button>
        </div>
      </form>
    </div>
  );
}
