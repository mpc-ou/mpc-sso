import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, ArrowUpDown, ArrowUp, ArrowDown, Edit, Trash2, Search, Filter } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { ApiError } from '@/api/client';
import { clientsApi } from '@/api/clients';
import type { Client, ClientWithSecret } from '@/api/types';
import { ScopeSelector } from '@/components/ScopeSelector';
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

function parseRedirectUris(raw: string): string[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

const createSchema = z.object({
  name: z.string().min(1, 'Bắt buộc'),
  redirectUris: z.string().min(1, 'Bắt buộc — mỗi URI 1 dòng'),
  allowedScopes: z.string().optional(),
});
type CreateFormValues = z.infer<typeof createSchema>;

function CreateClientDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (client: ClientWithSecret) => void;
}) {
  const queryClient = useQueryClient();
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateFormValues>({ resolver: zodResolver(createSchema) });

  useEffect(() => {
    if (open) reset({ name: '', redirectUris: '', allowedScopes: 'openid profile email' });
  }, [open, reset]);

  const mutation = useMutation({
    mutationFn: (values: CreateFormValues) =>
      clientsApi.create({
        name: values.name,
        redirectUris: parseRedirectUris(values.redirectUris),
        allowedScopes: values.allowedScopes || undefined,
      }),
    onSuccess: (client) => {
      void queryClient.invalidateQueries({ queryKey: ['clients'] });
      onCreated(client);
    },
  });

  return (
    <Dialog open={open} onClose={onClose} title="Đăng ký OAuth Client mới">
      {mutation.isError && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {mutation.error instanceof ApiError ? mutation.error.message : 'Tạo client thất bại'}
        </div>
      )}
      <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="space-y-4">
        <div>
          <Label htmlFor="name">Tên ứng dụng</Label>
          <Input id="name" {...register('name')} />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>
        <div>
          <Label htmlFor="redirectUris">Redirect URIs (mỗi dòng 1 URI)</Label>
          <textarea
            id="redirectUris"
            rows={3}
            placeholder={'https://app.example.com/callback'}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            {...register('redirectUris')}
          />
          {errors.redirectUris && (
            <p className="mt-1 text-xs text-red-600">{errors.redirectUris.message}</p>
          )}
        </div>
        <div>
          <Label>Allowed scopes</Label>
          <Controller
            control={control}
            name="allowedScopes"
            render={({ field }) => (
              <ScopeSelector value={field.value ?? ''} onChange={field.onChange} />
            )}
          />
        </div>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Đang tạo...' : 'Tạo client'}
        </Button>
      </form>
    </Dialog>
  );
}

function SecretRevealDialog({
  client,
  onClose,
}: {
  client: ClientWithSecret | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={Boolean(client)} onClose={onClose} title="Client đã được tạo">
      {client && (
        <div className="space-y-4">
          <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Lưu lại <strong>client_secret</strong> ngay — nó sẽ không hiển thị lại lần nào nữa.
          </div>
          <div>
            <Label>Client ID</Label>
            <div className="flex gap-2">
              <Input readOnly value={client.clientId} />
              <button
                className="rounded-md border border-slate-300 p-2 text-slate-500 hover:bg-slate-50 cursor-pointer"
                onClick={() => void navigator.clipboard.writeText(client.clientId)}
                aria-label="Copy client ID"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div>
            <Label>Client Secret</Label>
            <div className="flex gap-2">
              <Input readOnly value={client.clientSecret} />
              <button
                className="rounded-md border border-slate-300 p-2 text-slate-500 hover:bg-slate-50 cursor-pointer"
                onClick={() => void navigator.clipboard.writeText(client.clientSecret)}
                aria-label="Copy client secret"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>
          <Button onClick={onClose} className="w-full">
            Đã lưu, đóng lại
          </Button>
        </div>
      )}
    </Dialog>
  );
}

const editSchema = z.object({
  name: z.string().min(1, 'Bắt buộc'),
  redirectUris: z.string().min(1, 'Bắt buộc — mỗi URI 1 dòng'),
  allowedScopes: z.string().optional(),
  isActive: z.boolean(),
});
type EditFormValues = z.infer<typeof editSchema>;

function EditClientDialog({
  client,
  onClose,
}: {
  client: Client | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditFormValues>({ resolver: zodResolver(editSchema) });

  useEffect(() => {
    if (client) {
      reset({
        name: client.name,
        redirectUris: client.redirectUris.join('\n'),
        allowedScopes: client.allowedScopes,
        isActive: client.isActive,
      });
    }
  }, [client, reset]);

  const mutation = useMutation({
    mutationFn: (values: EditFormValues) =>
      clientsApi.update(client!.id, {
        name: values.name,
        redirectUris: parseRedirectUris(values.redirectUris),
        allowedScopes: values.allowedScopes,
        isActive: values.isActive,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['clients'] });
      onClose();
    },
  });

  return (
    <Dialog open={Boolean(client)} onClose={onClose} title="Sửa client">
      {mutation.isError && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {mutation.error instanceof ApiError ? mutation.error.message : 'Cập nhật thất bại'}
        </div>
      )}
      <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="space-y-4">
        <div>
          <Label htmlFor="edit-name">Tên ứng dụng</Label>
          <Input id="edit-name" {...register('name')} />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>
        <div>
          <Label htmlFor="edit-redirectUris">Redirect URIs (mỗi dòng 1 URI)</Label>
          <textarea
            id="edit-redirectUris"
            rows={3}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            {...register('redirectUris')}
          />
        </div>
        <div>
          <Label>Allowed scopes</Label>
          <Controller
            control={control}
            name="allowedScopes"
            render={({ field }) => (
              <ScopeSelector value={field.value ?? ''} onChange={field.onChange} />
            )}
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            id="edit-isActive"
            type="checkbox"
            {...register('isActive')}
            className="h-4 w-4 rounded border-slate-300"
          />
          <Label htmlFor="edit-isActive" className="mb-0">
            Đang hoạt động
          </Label>
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

export function ClientsPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [revealClient, setRevealClient] = useState<ClientWithSecret | null>(null);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const { data, isLoading } = useQuery({ queryKey: ['clients'], queryFn: clientsApi.list });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => clientsApi.remove(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['clients'] }),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => clientsApi.bulkRemove(ids),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['clients'] });
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
      setSelectedIds(data.map((c) => c.id));
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
    if (confirm(`Bạn có chắc chắn muốn xoá vĩnh viễn ${selectedIds.length} client đã chọn?`)) {
      bulkDeleteMutation.mutate(selectedIds);
    }
  };

  const filteredData = data
    ? data.filter((client) => {
        const matchesSearch =
          client.name.toLowerCase().includes(search.toLowerCase()) ||
          client.clientId.toLowerCase().includes(search.toLowerCase());
        const matchesStatus =
          status === ''
            ? true
            : status === 'active'
            ? client.isActive
            : !client.isActive;
        return matchesSearch && matchesStatus;
      })
    : [];

  const sortedData = [...filteredData].sort((a, b) => {
    const aVal = a[sortBy as keyof Client];
    const bVal = b[sortBy as keyof Client];

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
        <h1 className="text-xl font-semibold text-slate-900">OAuth Clients</h1>
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
          <Button onClick={() => setCreateOpen(true)}>Đăng ký client mới</Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="relative md:col-span-2">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Tìm tên ứng dụng hoặc Client ID..."
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
                    label="Tên"
                    column="name"
                    currentSortBy={sortBy}
                    currentSortOrder={sortOrder}
                    onSort={handleSort}
                  />
                </TableHead>
                <TableHead>
                  <SortableHeader
                    label="Client ID"
                    column="clientId"
                    currentSortBy={sortBy}
                    currentSortOrder={sortOrder}
                    onSort={handleSort}
                  />
                </TableHead>
                <TableHead>Redirect URIs</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead />
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
              {sortedData.map((client) => {
                const isSelected = selectedIds.includes(client.id);
                return (
                  <TableRow key={client.id} className={`transition-colors hover:bg-slate-50/50 ${isSelected ? 'bg-slate-50' : ''}`}>
                    <TableCell className="text-center pl-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleSelectOne(client.id, e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 focus:ring-brand-500"
                      />
                    </TableCell>
                    <TableCell className="font-semibold text-slate-900">{client.name}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-700">{client.clientId}</TableCell>
                    <TableCell className="max-w-xs truncate text-xs text-slate-500">
                      {client.redirectUris.join(', ')}
                    </TableCell>
                    <TableCell>
                      {client.isActive ? (
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
                        onClick={() => setEditClient(client)}
                        title="Sửa client"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-slate-200 bg-white text-red-600 hover:bg-red-50 hover:text-red-750 transition-colors cursor-pointer"
                        onClick={() => {
                          if (confirm(`Bạn chắc chắn muốn xoá OAuth Client "${client.name}"?`)) {
                            deleteMutation.mutate(client.id);
                          }
                        }}
                        title="Xoá client"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {sortedData.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-400 py-8">
                    Không có OAuth Client nào khớp điều kiện tìm kiếm.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CreateClientDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(client) => {
          setCreateOpen(false);
          setRevealClient(client);
        }}
      />
      <SecretRevealDialog client={revealClient} onClose={() => setRevealClient(null)} />
      <EditClientDialog client={editClient} onClose={() => setEditClient(null)} />
    </div>
  );
}
