import { useQuery } from '@tanstack/react-query';
import { Building2, KeySquare, Users } from 'lucide-react';
import { clientsApi } from '@/api/clients';
import { departmentsApi } from '@/api/departments';
import { usersApi } from '@/api/users';
import { Card, CardContent } from '@/components/ui/card';

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

export function DashboardPage() {
  const users = useQuery({ queryKey: ['users', 1, 1], queryFn: () => usersApi.list(1, 1) });
  const departments = useQuery({ queryKey: ['departments'], queryFn: departmentsApi.list });
  const clients = useQuery({ queryKey: ['clients'], queryFn: clientsApi.list });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Users/Members" value={users.data?.total} icon={Users} />
        <StatCard label="Departments" value={departments.data?.length} icon={Building2} />
        <StatCard label="OAuth Clients" value={clients.data?.length} icon={KeySquare} />
      </div>
    </div>
  );
}
