import { useQuery } from '@tanstack/react-query';
import { Filter, ScrollText } from 'lucide-react';
import { useState } from 'react';
import { auditLogApi } from '@/api/audit-log';
import { SimpleSelect } from '@/components/SimpleSelect';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const PAGE_SIZE = 30;

const EVENT_OPTIONS = [
  { value: '', label: 'Tất cả sự kiện' },
  { value: 'profile.updated', label: 'Thông tin hồ sơ thay đổi' },
  { value: 'member.changed', label: 'Thành viên thay đổi' },
  { value: 'auth.login', label: 'Đăng nhập' },
  { value: 'webhook.created', label: 'Tạo webhook' },
  { value: 'webhook.updated', label: 'Sửa webhook' },
  { value: 'webhook.deleted', label: 'Xoá webhook' },
];

const EVENT_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  'profile.updated': 'default',
  'member.changed': 'secondary',
  'auth.login': 'outline',
};

export function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [event, setEvent] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['audit-log', page, event],
    queryFn: () => auditLogApi.list(page, PAGE_SIZE, event),
  });

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Nhật ký hoạt động</h1>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400 shrink-0" />
            <div className="w-64">
              <SimpleSelect
                value={event}
                onValueChange={(v) => {
                  setEvent(v);
                  setPage(1);
                }}
                options={EVENT_OPTIONS}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-3">
          <CardTitle className="text-sm font-semibold text-slate-700">
            {data?.total ?? 0} sự kiện
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/30">
              <TableRow>
                <TableHead>Thời gian</TableHead>
                <TableHead>Sự kiện</TableHead>
                <TableHead>Người thực hiện</TableHead>
                <TableHead>Đối tượng</TableHead>
                <TableHead>Trường thay đổi</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-400 py-8">
                    Đang tải...
                  </TableCell>
                </TableRow>
              )}
              {(data?.items ?? []).map((entry) => (
                <TableRow key={entry.id} className="hover:bg-slate-50/50">
                  <TableCell className="whitespace-nowrap text-xs text-slate-500">
                    {new Date(entry.createdAt).toLocaleString('vi-VN')}
                  </TableCell>
                  <TableCell>
                    <Badge variant={EVENT_VARIANT[entry.event] ?? 'outline'} className="gap-1">
                      <ScrollText className="h-3 w-3" />
                      {entry.event}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-slate-800">
                    {entry.actorLabel ?? <span className="text-slate-400">Hệ thống</span>}
                  </TableCell>
                  <TableCell className="text-sm text-slate-800">
                    {entry.targetLabel ?? <span className="text-slate-400">—</span>}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-xs text-slate-500">
                    {entry.changedFields.length > 0 ? entry.changedFields.join(', ') : '—'}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-500">
                    {entry.ip ?? '—'}
                  </TableCell>
                </TableRow>
              ))}
              {(data?.items ?? []).length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-400 py-8">
                    Chưa có hoạt động nào được ghi nhận.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Trước
        </Button>
        <span className="text-sm text-slate-500 font-medium">
          Trang {page}/{totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Sau
        </Button>
      </div>
    </div>
  );
}
