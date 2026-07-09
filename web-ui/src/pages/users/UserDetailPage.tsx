import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { ArrowLeft, UserCircle2, Award, UserCheck } from 'lucide-react';
import { clubRolesApi } from '@/api/club-roles';
import { ApiError } from '@/api/client';
import { departmentsApi } from '@/api/departments';
import { usersApi } from '@/api/users';
import type { ClubPosition, ClubRole } from '@/api/types';
import { SimpleDialog as Dialog } from '@/components/SimpleDialog';
import { SimpleSelect } from '@/components/SimpleSelect';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const NO_DEPARTMENT = '__none__';

const positions: ClubPosition[] = [
  'PRESIDENT',
  'VICE_PRESIDENT',
  'DEPARTMENT_LEADER',
  'DEPARTMENT_VICE_LEADER',
  'DEPARTMENT_MEMBER',
  'COLLABORATOR',
  'ADVISOR',
];

const POSITION_OPTIONS = [
  { value: 'PRESIDENT', label: 'Chủ nhiệm (President)' },
  { value: 'VICE_PRESIDENT', label: 'Phó chủ nhiệm (Vice President)' },
  { value: 'DEPARTMENT_LEADER', label: 'Trưởng ban (Leader)' },
  { value: 'DEPARTMENT_VICE_LEADER', label: 'Phó ban (Vice Leader)' },
  { value: 'DEPARTMENT_MEMBER', label: 'Thành viên ban (Member)' },
  { value: 'COLLABORATOR', label: 'Cộng tác viên (Collaborator)' },
  { value: 'ADVISOR', label: 'Cố vấn (Advisor)' },
];

const roleSchema = z.object({
  departmentId: z.string().optional(),
  position: z.enum(positions as [ClubPosition, ...ClubPosition[]]),
  term: z.union([z.literal(''), z.string().regex(/^\d+$/, 'Phải là số')]),
  note: z.string().optional(),
  startAt: z.string().min(1, 'Bắt buộc'),
  endAt: z.string().optional(),
});
type RoleFormValues = z.infer<typeof roleSchema>;

function RoleDialog({
  open,
  onClose,
  userId,
  editingRole,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
  editingRole: ClubRole | null;
}) {
  const queryClient = useQueryClient();
  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: departmentsApi.list,
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RoleFormValues>({ resolver: zodResolver(roleSchema) });

  useEffect(() => {
    if (editingRole) {
      reset({
        departmentId: editingRole.departmentId ?? '',
        position: editingRole.position,
        term: editingRole.term != null ? String(editingRole.term) : '',
        note: editingRole.note ?? '',
        startAt: editingRole.startAt.slice(0, 10),
        endAt: editingRole.endAt ? editingRole.endAt.slice(0, 10) : '',
      });
    } else {
      reset({
        departmentId: '',
        position: 'DEPARTMENT_MEMBER',
        term: '',
        note: '',
        startAt: '',
        endAt: '',
      });
    }
  }, [editingRole, reset, open]);

  const mutation = useMutation({
    mutationFn: (values: RoleFormValues) => {
      const startAt = new Date(values.startAt).toISOString();
      const endAt = values.endAt ? new Date(values.endAt).toISOString() : null;
      const term = values.term === '' ? null : Number(values.term);

      if (editingRole) {
        return clubRolesApi.update(editingRole.id, {
          departmentId: values.departmentId || null,
          position: values.position,
          term,
          note: values.note || null,
          startAt,
          endAt,
        });
      }
      return clubRolesApi.create({
        userId,
        departmentId: values.departmentId || undefined,
        position: values.position,
        term: term ?? undefined,
        note: values.note || undefined,
        startAt,
        endAt: endAt ?? undefined,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users', userId] });
      void queryClient.invalidateQueries({ queryKey: ['club-roles'] });
      onClose();
    },
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editingRole ? 'Sửa chức vụ' : 'Thêm chức vụ'}
      className="sm:max-w-lg"
    >
      {mutation.isError && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {mutation.error instanceof ApiError
            ? mutation.error.message
            : 'Lưu thất bại'}
        </div>
      )}
      <form
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        className="space-y-4"
      >
        <div>
          <Label htmlFor="position">Chức vụ</Label>
          <Controller
            control={control}
            name="position"
            render={({ field }) => (
              <SimpleSelect
                value={field.value}
                onValueChange={field.onChange}
                options={POSITION_OPTIONS}
              />
            )}
          />
        </div>
        <div>
          <Label htmlFor="departmentId">Ban (tuỳ chọn)</Label>
          <Controller
            control={control}
            name="departmentId"
            render={({ field }) => (
              <SimpleSelect
                value={field.value || NO_DEPARTMENT}
                onValueChange={(v) => field.onChange(v === NO_DEPARTMENT ? '' : v)}
                options={[
                  { value: NO_DEPARTMENT, label: '— Không thuộc ban nào —' },
                  ...(departments?.map((d) => ({ value: d.id, label: d.name })) ?? []),
                ]}
              />
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="term">Khoá (năm)</Label>
            <Input id="term" type="number" {...register('term')} />
          </div>
          <div>
            <Label htmlFor="note">Ghi chú</Label>
            <Input id="note" {...register('note')} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="startAt">Bắt đầu</Label>
            <Input id="startAt" type="date" {...register('startAt')} />
            {errors.startAt && (
              <p className="mt-1 text-xs text-red-600">
                {errors.startAt.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="endAt">
              Kết thúc (bỏ trống nếu đang đảm nhiệm)
            </Label>
            <Input id="endAt" type="date" {...register('endAt')} />
          </div>
        </div>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Đang lưu...' : 'Lưu'}
        </Button>
      </form>
    </Dialog>
  );
}

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<ClubRole | null>(null);

  const { data: user, isLoading } = useQuery({
    queryKey: ['users', id],
    queryFn: () => usersApi.get(id!),
    enabled: Boolean(id),
  });

  const toggleDisableMutation = useMutation({
    mutationFn: (isDisabled: boolean) => usersApi.update(id!, { isDisabled }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      void queryClient.invalidateQueries({ queryKey: ['users', id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => usersApi.remove(id!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      navigate('/users');
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: (roleId: string) => clubRolesApi.remove(roleId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users', id] });
    },
  });

  if (isLoading) return <p className="text-slate-400">Đang tải...</p>;
  if (!user) return <p className="text-slate-400">Không tìm thấy user.</p>;

  const fullName = [user.firstName, user.middleName, user.lastName]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/users"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-xl font-bold text-slate-900">
            {fullName || user.username}
          </h1>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/users/${user.id}/edit`)}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Sửa thông tin
          </button>
          {user.isDisabled ? (
            <Button
              variant="outline"
              size="sm"
              className="border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800"
              onClick={() => {
                if (confirm('Bạn có chắc chắn muốn kích hoạt lại tài khoản này?')) {
                  toggleDisableMutation.mutate(false);
                }
              }}
              disabled={toggleDisableMutation.isPending}
            >
              Kích hoạt tài khoản
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
              onClick={() => {
                if (confirm('Bạn có chắc chắn muốn vô hiệu hoá tài khoản này? Người dùng sẽ không thể đăng nhập.')) {
                  toggleDisableMutation.mutate(true);
                }
              }}
              disabled={toggleDisableMutation.isPending}
            >
              Vô hiệu hoá tài khoản
            </Button>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (confirm(`CẢNH BÁO: Bạn có chắc chắn muốn XÓA VĨNH VIỄN tài khoản "${user.username}"? Hành động này không thể hoàn tác và sẽ xóa tất cả thông tin liên quan.`)) {
                deleteMutation.mutate();
              }
            }}
            disabled={deleteMutation.isPending}
          >
            Xoá tài khoản
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Account Credentials */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center gap-2 border-b border-slate-100 pb-3">
            <UserCheck className="h-4 w-4 text-brand-600" />
            <CardTitle className="text-base font-semibold">Tài khoản xác thực</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4 text-sm">
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500 font-medium">Username</span>
              <span className="font-semibold text-slate-900">{user.username}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500 font-medium">Email</span>
              <span className="text-slate-900">{user.email ?? '—'}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500 font-medium">Web Role</span>
              <Badge>{user.webRole}</Badge>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500 font-medium">Trạng thái</span>
              {user.isDisabled ? (
                <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-red-600/10 ring-inset">
                  Disabled
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-green-600/20 ring-inset">
                  Active
                </span>
              )}
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500 font-medium">Google Linked</span>
              <span className="font-medium text-slate-700">{user.googleId ? 'Có' : 'Không'}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500 font-medium">Ngày tạo</span>
              <span className="text-slate-700">{new Date(user.createdAt).toLocaleString('vi-VN')}</span>
            </div>
          </CardContent>
        </Card>

        {/* Member Profile Info */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center gap-2 border-b border-slate-100 pb-3">
            <UserCircle2 className="h-4 w-4 text-brand-600" />
            <CardTitle className="text-base font-semibold">Hồ sơ cá nhân</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4 text-sm">
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500 font-medium">Họ & Tên</span>
              <span className="font-semibold text-slate-900">{fullName || '—'}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500 font-medium">MSSV</span>
              <span className="font-mono text-slate-900">{user.mssv ?? '—'}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500 font-medium">Lớp</span>
              <span className="text-slate-900">{user.className ?? '—'}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500 font-medium">Khoa</span>
              <span className="text-slate-900">{user.faculty ?? '—'}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500 font-medium">Điện thoại</span>
              <span className="text-slate-900">{user.phone ?? '—'}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500 font-medium">Ngày sinh</span>
              <span className="text-slate-900">
                {user.dob ? new Date(user.dob).toLocaleDateString('vi-VN') : '—'}
              </span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500 font-medium">Địa chỉ</span>
              <span className="text-slate-900 truncate max-w-[200px]" title={user.address ?? ''}>
                {user.address ?? '—'}
              </span>
            </div>
            {user.bio && (
              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-500 font-medium block mb-1">Tiểu sử (Bio)</span>
                <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg text-xs leading-relaxed italic">
                  "{user.bio}"
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Club Roles History */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-brand-600" />
            <CardTitle className="text-base font-semibold">Lịch sử chức vụ trong CLB</CardTitle>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setEditingRole(null);
              setRoleDialogOpen(true);
            }}
          >
            Thêm chức vụ
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Chức vụ</TableHead>
                <TableHead>Ban</TableHead>
                <TableHead>Khoá/Term</TableHead>
                <TableHead>Thời gian</TableHead>
                <TableHead>Ghi chú</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(user.clubRoles ?? []).map((role) => (
                <TableRow key={role.id}>
                  <TableCell>
                    <Badge variant="outline" className="border-brand-300 text-brand-700 bg-brand-50">
                      {role.position}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold text-slate-800">
                    {role.department?.name ?? '—'}
                  </TableCell>
                  <TableCell>{role.term ?? '—'}</TableCell>
                  <TableCell className="text-slate-600">
                    {new Date(role.startAt).toLocaleDateString('vi-VN')} —{' '}
                    {role.endAt
                      ? new Date(role.endAt).toLocaleDateString('vi-VN')
                      : 'nay'}
                  </TableCell>
                  <TableCell className="text-slate-500 italic max-w-[150px] truncate" title={role.note ?? ''}>
                    {role.note ?? '—'}
                  </TableCell>
                  <TableCell className="text-right space-x-3">
                    <button
                      className="text-brand-600 hover:underline font-medium text-sm"
                      onClick={() => {
                        setEditingRole(role);
                        setRoleDialogOpen(true);
                      }}
                    >
                      Sửa
                    </button>
                    <button
                      className="text-red-600 hover:underline font-medium text-sm"
                      onClick={() => {
                        if (confirm('Bạn chắc chắn muốn xoá chức vụ này?')) {
                          deleteRoleMutation.mutate(role.id);
                        }
                      }}
                    >
                      Xoá
                    </button>
                  </TableCell>
                </TableRow>
              ))}
              {(user.clubRoles ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-400 py-8">
                    Chưa có chức vụ nào trong CLB.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <RoleDialog
        open={roleDialogOpen}
        onClose={() => setRoleDialogOpen(false)}
        userId={user.id}
        editingRole={editingRole}
      />
    </div>
  );
}
