import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ArrowUpDown, ArrowUp, ArrowDown, Edit, Trash2, Search, Filter } from 'lucide-react';
import { ApiError } from '@/api/client';
import { departmentsApi } from '@/api/departments';
import type { Department } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SimpleDialog as Dialog } from '@/components/SimpleDialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SimpleSelect } from '@/components/SimpleSelect';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const schema = z.object({
  name: z.string().min(1, 'Bắt buộc'),
  code: z.string().min(1, 'Bắt buộc'),
});
type FormValues = z.infer<typeof schema>;

function DepartmentDialog({
  open,
  onClose,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  editing: Department | null;
}) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    reset(editing ? { name: editing.name, code: editing.code } : { name: '', code: '' });
  }, [editing, reset, open]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      editing ? departmentsApi.update(editing.id, values) : departmentsApi.create(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['departments'] });
      onClose();
    },
  });

  return (
    <Dialog open={open} onClose={onClose} title={editing ? 'Sửa ban' : 'Tạo ban mới'}>
      {mutation.isError && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {mutation.error instanceof ApiError ? mutation.error.message : 'Lưu thất bại'}
        </div>
      )}
      <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="space-y-4">
        <div>
          <Label htmlFor="name">Tên ban</Label>
          <Input id="name" placeholder="Ban Lập trình" {...register('name')} />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>
        <div>
          <Label htmlFor="code">Mã ban</Label>
          <Input id="code" placeholder="PROG" {...register('code')} />
          {errors.code && <p className="mt-1 text-xs text-red-600">{errors.code.message}</p>}
        </div>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Đang lưu...' : 'Lưu'}
        </Button>
      </form>
    </Dialog>
  );
}

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

export function DepartmentsPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const { data, isLoading } = useQuery({ queryKey: ['departments'], queryFn: departmentsApi.list });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => departmentsApi.remove(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['departments'] }),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => departmentsApi.bulkRemove(ids),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['departments'] });
      setSelectedIds([]);
    },
  });

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && data) {
      setSelectedIds(data.map((d) => d.id));
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

  const handleBulkDelete = () => {
    if (confirm(`Bạn có chắc chắn muốn xoá vĩnh viễn ${selectedIds.length} ban đã chọn?`)) {
      bulkDeleteMutation.mutate(selectedIds);
    }
  };

  const filteredData = data
    ? data.filter((dept) => {
        const matchesSearch =
          dept.name.toLowerCase().includes(search.toLowerCase()) ||
          dept.code.toLowerCase().includes(search.toLowerCase());
        const matchesStatus =
          status === ''
            ? true
            : status === 'active'
            ? dept.isActive
            : !dept.isActive;
        return matchesSearch && matchesStatus;
      })
    : [];

  const sortedData = [...filteredData].sort((a, b) => {
    const aVal = a[sortBy as keyof Department];
    const bVal = b[sortBy as keyof Department];

    if (aVal == null) return sortOrder === 'asc' ? -1 : 1;
    if (bVal == null) return sortOrder === 'asc' ? 1 : -1;

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortOrder === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
  });

  const isAllSelected = sortedData.length > 0 && selectedIds.length === sortedData.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Departments</h1>
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
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            Tạo ban mới
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="relative md:col-span-2">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Tìm tên ban hoặc mã ban..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 w-full bg-slate-50 border-slate-200 hover:bg-slate-100/50 transition-colors"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400 shrink-0" />
              <SimpleSelect
                value={status}
                onValueChange={setStatus}
                options={[
                  { value: '', label: 'Tất cả trạng thái' },
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-3">
          <CardTitle className="text-sm font-semibold text-slate-700">
            Danh sách ({data?.length ?? 0})
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
                    label="Tên ban"
                    column="name"
                    currentSortBy={sortBy}
                    currentSortOrder={sortOrder}
                    onSort={handleSort}
                  />
                </TableHead>
                <TableHead>
                  <SortableHeader
                    label="Mã"
                    column="code"
                    currentSortBy={sortBy}
                    currentSortOrder={sortOrder}
                    onSort={handleSort}
                  />
                </TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-400 py-8">
                    Đang tải...
                  </TableCell>
                </TableRow>
              )}
              {sortedData.map((dept) => {
                const isSelected = selectedIds.includes(dept.id);
                return (
                  <TableRow key={dept.id} className={`transition-colors hover:bg-slate-50/50 ${isSelected ? 'bg-slate-50' : ''}`}>
                    <TableCell className="text-center pl-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleSelectOne(dept.id, e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 focus:ring-brand-500"
                      />
                    </TableCell>
                    <TableCell className="font-semibold text-slate-900">{dept.name}</TableCell>
                    <TableCell className="font-mono text-sm text-slate-700">{dept.code}</TableCell>
                    <TableCell>
                      {dept.isActive ? (
                        <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-green-600/20 ring-inset">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-500/10 ring-inset">
                          Inactive
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-4 space-x-2">
                      <button
                        className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-950 transition-colors cursor-pointer"
                        onClick={() => {
                          setEditing(dept);
                          setDialogOpen(true);
                        }}
                        title="Chỉnh sửa"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-slate-200 bg-white text-red-600 hover:bg-red-50 hover:text-red-750 transition-colors cursor-pointer"
                        onClick={() => {
                          if (confirm(`Bạn chắc chắn muốn xoá ban "${dept.name}"?`)) {
                            deleteMutation.mutate(dept.id);
                          }
                        }}
                        title="Xoá ban"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {sortedData.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-400 py-8">
                    Không có phòng ban nào khớp điều kiện tìm kiếm.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <DepartmentDialog open={dialogOpen} onClose={() => setDialogOpen(false)} editing={editing} />
    </div>
  );
}
