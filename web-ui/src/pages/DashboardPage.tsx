import { useQuery } from '@tanstack/react-query';
import { Building2, KeySquare, LogIn, Radio, Users } from 'lucide-react';
import { clientsApi } from '@/api/clients';
import { dashboardApi } from '@/api/dashboard';
import { departmentsApi } from '@/api/departments';
import { usersApi } from '@/api/users';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | undefined;
  icon: typeof Users;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-semibold text-slate-900">{value ?? '—'}</p>
          <p className="text-sm text-slate-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

const METHOD_LABELS: Record<string, string> = {
  password: 'Mật khẩu',
  google: 'Google',
  admin: 'Admin',
};

export function DashboardPage() {
  const users = useQuery({ queryKey: ['users', 1, 1], queryFn: () => usersApi.list(1, 1) });
  const departments = useQuery({ queryKey: ['departments'], queryFn: departmentsApi.list });
  const clients = useQuery({ queryKey: ['clients'], queryFn: clientsApi.list });
  const stats = useQuery({ queryKey: ['dashboard'], queryFn: dashboardApi.getStats });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Users/Members" value={users.data?.total} icon={Users} />
        <StatCard label="Departments" value={departments.data?.length} icon={Building2} />
        <StatCard label="OAuth Clients" value={clients.data?.length} icon={KeySquare} />
        <StatCard label="Lượt đăng nhập hôm nay" value={stats.data?.loginsToday} icon={LogIn} />
        <StatCard label="Đang hoạt động" value={stats.data?.activeNow} icon={Radio} />
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-3">
          <CardTitle className="text-sm font-semibold text-slate-700">Đăng nhập gần đây</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/30">
              <TableRow>
                <TableHead>Người dùng</TableHead>
                <TableHead>Phương thức</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Thời gian</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(stats.data?.recentLogins ?? []).map((login) => (
                <TableRow key={login.id} className="hover:bg-slate-50/50">
                  <TableCell className="flex items-center gap-2 font-medium text-slate-900">
                    <div className="h-6 w-6 overflow-hidden rounded-full bg-slate-100">
                      {login.avatar && (
                        <img src={login.avatar} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                    {login.username}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{METHOD_LABELS[login.method] ?? login.method}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-500">{login.ip ?? '—'}</TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {new Date(login.createdAt).toLocaleString('vi-VN')}
                  </TableCell>
                </TableRow>
              ))}
              {(stats.data?.recentLogins ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-slate-400 py-8">
                    Chưa có lượt đăng nhập nào.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
