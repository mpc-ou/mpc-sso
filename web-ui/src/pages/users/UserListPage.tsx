import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Search, Filter, ArrowUpDown, ArrowUp, ArrowDown, Eye, Edit } from 'lucide-react';
import { usersApi } from '@/api/users';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SimpleSelect } from '@/components/SimpleSelect';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const PAGE_SIZE = 20;

const WEB_ROLE_OPTIONS = [
  { value: 'GUEST', label: 'GUEST (Khách)' },
  { value: 'MEMBER', label: 'MEMBER (Thành viên)' },
  { value: 'COLLABORATOR', label: 'Cộng tác viên' },
  { value: 'ADMIN', label: 'ADMIN (Quản trị viên)' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'disabled', label: 'Disabled' },
];

function SortableHeader({
  label,
  column,
  currentSortBy,
  currentSortOrder,
  onSort,
}: {
  label: string;
  column: string;
  currentSortBy: string;
  currentSortOrder: 'asc' | 'desc';
  onSort: (col: string) => void;
}) {
  const isSorted = currentSortBy === column;
  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className="flex items-center gap-1 hover:text-slate-900 transition-colors font-semibold text-slate-700 cursor-pointer"
    >
      {label}
      {isSorted ? (
        currentSortOrder === 'asc' ? (
          <ArrowUp className="h-3.5 w-3.5 text-slate-800" />
        ) : (
          <ArrowDown className="h-3.5 w-3.5 text-slate-800" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-60" />
      )}
    </button>
  );
}

export function UserListPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, PAGE_SIZE, search, role, status, sortBy, sortOrder],
    queryFn: () => usersApi.list(page, PAGE_SIZE, search, role, status, sortBy, sortOrder),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => usersApi.bulkRemove(ids),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      setSelectedIds([]);
    },
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleRoleChange = (val: string) => {
    setRole(val);
    setPage(1);
  };

  const handleStatusChange = (val: string) => {
    setStatus(val);
    setPage(1);
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortOrder(column === 'createdAt' ? 'desc' : 'asc');
    }
    setPage(1);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && data) {
      setSelectedIds(data.items.map((u) => u.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((x) => x !== id));
    }
  };

  const handleDeleteOne = (id: string, username: string) => {
    if (confirm(`Bạn có chắc chắn muốn xoá vĩnh viễn user "${username}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleBulkDelete = () => {
    if (confirm(`Bạn có chắc chắn muốn xoá vĩnh viễn ${selectedIds.length} người dùng đã chọn?`)) {
      bulkDeleteMutation.mutate(selectedIds);
    }
  };

  const isAllSelected = data && data.items.length > 0 && selectedIds.length === data.items.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Users & Members</h1>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={bulkDeleteMutation.isPending}
              className="flex items-center gap-1.5"
            >
              <Trash2 className="h-4 w-4" />
              Xoá đã chọn ({selectedIds.length})
            </Button>
          )}
          <Link to="/users/new" className={buttonVariants()}>
            Tạo user mới
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Tìm username, họ tên, email, mssv..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9 h-9 w-full bg-slate-50 border-slate-200 hover:bg-slate-100/50 transition-colors"
              />
            </div>

            {/* Role Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400 shrink-0" />
              <SimpleSelect
                value={role}
                onValueChange={handleRoleChange}
                options={[
                  { value: '', label: 'Tất cả vai trò' },
                  ...WEB_ROLE_OPTIONS,
                ]}
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400 shrink-0" />
              <SimpleSelect
                value={status}
                onValueChange={handleStatusChange}
                options={[
                  { value: '', label: 'Tất cả trạng thái' },
                  ...STATUS_OPTIONS,
                ]}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table List */}
      <Card className="shadow-sm border-slate-200 overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-3">
          <CardTitle className="text-sm font-semibold text-slate-700">
            Danh sách ({data?.total ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/30">
              <TableRow>
                <TableHead className="w-12 text-center pl-4">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 focus:ring-brand-500"
                  />
                </TableHead>
                <TableHead>
                  <SortableHeader
                    label="Username"
                    column="username"
                    currentSortBy={sortBy}
                    currentSortOrder={sortOrder}
                    onSort={handleSort}
                  />
                </TableHead>
                <TableHead>
                  <SortableHeader
                    label="Họ và Tên"
                    column="name"
                    currentSortBy={sortBy}
                    currentSortOrder={sortOrder}
                    onSort={handleSort}
                  />
                </TableHead>
                <TableHead>Email</TableHead>
                <TableHead>MSSV</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>
                  <SortableHeader
                    label="Ngày tạo"
                    column="createdAt"
                    currentSortBy={sortBy}
                    currentSortOrder={sortOrder}
                    onSort={handleSort}
                  />
                </TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-slate-400 py-8">
                    Đang tải...
                  </TableCell>
                </TableRow>
              )}
              {data?.items.map((user) => {
                const fullName = [user.firstName, user.middleName, user.lastName]
                  .filter(Boolean)
                  .join(' ') || '—';
                const isSelected = selectedIds.includes(user.id);
                return (
                  <TableRow
                    key={user.id}
                    className={`transition-colors hover:bg-slate-50/50 ${
                      isSelected ? 'bg-slate-50' : ''
                    }`}
                  >
                    <TableCell className="text-center pl-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleSelectOne(user.id, e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 focus:ring-brand-500"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.username} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-xs font-semibold text-slate-500 uppercase">
                              {user.username.slice(0, 2)}
                            </span>
                          )}
                        </div>
                        <Link to={`/users/${user.id}`} className="font-semibold text-slate-900 hover:text-brand-600 hover:underline">
                          {user.username}
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-slate-800">{fullName}</TableCell>
                    <TableCell className="text-slate-600">{user.email ?? '—'}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-700">{user.mssv ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-slate-200 text-slate-800 bg-slate-50">
                        {user.webRole}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.isDisabled ? (
                        <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-red-600/10 ring-inset">
                          Disabled
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-green-600/20 ring-inset">
                          Active
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-600 text-xs">
                      {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                    </TableCell>
                    <TableCell className="text-right pr-4 space-x-2">
                      <Link
                        to={`/users/${user.id}`}
                        className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-950 transition-colors"
                        title="Xem chi tiết"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <Link
                        to={`/users/${user.id}/edit`}
                        className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-950 transition-colors"
                        title="Chỉnh sửa"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleDeleteOne(user.id, user.username)}
                        className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-slate-200 bg-white text-red-600 hover:bg-red-50 hover:text-red-750 transition-colors cursor-pointer"
                        title="Xoá vĩnh viễn"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {data?.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-slate-400 py-8">
                    Không tìm thấy kết quả nào trùng khớp.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination controls */}
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
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
