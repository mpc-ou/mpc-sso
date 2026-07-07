import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { z } from 'zod';
import { ArrowLeft, User, KeyRound, GraduationCap, Loader2, Upload } from 'lucide-react';
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
  username: z.string().min(1, 'Username là bắt buộc'),
  email: z.union([z.literal(''), z.string().email('Email không hợp lệ')]),
  password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự'),
  webRole: z.enum(['ADMIN', 'COLLABORATOR', 'MEMBER', 'GUEST']),
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

export function UserCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [uploading, setUploading] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { webRole: 'GUEST', email: '', middleName: '', dob: '', address: '', className: '', mssv: '', faculty: '', phone: '', avatar: '', bio: '' },
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

  const createMutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: (user) => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      navigate(`/users/${user.id}`);
    },
  });

  const onSubmit = (values: FormValues) => {
    createMutation.mutate({
      username: values.username,
      email: values.email || undefined,
      password: values.password,
      webRole: values.webRole,
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
    });
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/users"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-bold text-slate-900">Tạo người dùng mới</h1>
      </div>

      {createMutation.isError && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {createMutation.error instanceof ApiError
            ? createMutation.error.message
            : 'Tạo user thất bại'}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Section 1: Account Credentials */}
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center gap-2 border-b border-slate-100 pb-3">
              <KeyRound className="h-4 w-4 text-brand-600" />
              <CardTitle className="text-base font-semibold">Tài khoản xác thực</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-1">
                <Label htmlFor="username" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Username</Label>
                <Input id="username" {...register('username')} placeholder="vd: trieukon" />
                {errors.username && (
                  <p className="mt-1 text-xs text-red-600">{errors.username.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Email (tuỳ chọn)</Label>
                <Input id="email" type="email" {...register('email')} placeholder="trieukon1011@gmail.com" />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Mật khẩu</Label>
                <Input id="password" type="password" {...register('password')} placeholder="••••••••" />
                {errors.password && (
                  <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
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
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center gap-2 border-b border-slate-100 pb-3">
              <User className="h-4 w-4 text-brand-600" />
              <CardTitle className="text-base font-semibold">Thông tin cá nhân</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1 col-span-1">
                  <Label htmlFor="lastName" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Họ</Label>
                  <Input id="lastName" {...register('lastName')} placeholder="Nguyễn" />
                  {errors.lastName && (
                    <p className="mt-1 text-xs text-red-600">{errors.lastName.message}</p>
                  )}
                </div>
                <div className="space-y-1 col-span-1">
                  <Label htmlFor="middleName" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tên đệm</Label>
                  <Input id="middleName" {...register('middleName')} placeholder="Thanh" />
                </div>
                <div className="space-y-1 col-span-1">
                  <Label htmlFor="firstName" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tên</Label>
                  <Input id="firstName" {...register('firstName')} placeholder="Triều" />
                  {errors.firstName && (
                    <p className="mt-1 text-xs text-red-600">{errors.firstName.message}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="phone" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Số điện thoại</Label>
                  <Input id="phone" {...register('phone')} placeholder="09xxxxxxxx" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="dob" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Ngày sinh</Label>
                  <Input id="dob" type="date" {...register('dob')} />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="address" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Địa chỉ</Label>
                <Input id="address" {...register('address')} placeholder="123 Nguyễn Văn Cừ, Quận 5..." />
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
                <Input id="mssv" {...register('mssv')} placeholder="2251050000" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="className" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Lớp</Label>
                <Input id="className" {...register('className')} placeholder="IT22A" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="faculty" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Khoa</Label>
                <Input id="faculty" {...register('faculty')} placeholder="Công nghệ thông tin" />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="bio" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tiểu sử ngắn (Bio)</Label>
              <Input id="bio" {...register('bio')} placeholder="Đam mê lập trình web..." />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pt-2">
          <Link
            to="/users"
            className={buttonVariants({ variant: 'outline' })}
          >
            Hủy
          </Link>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Đang tạo...' : 'Tạo người dùng'}
          </Button>
        </div>
      </form>
    </div>
  );
}
