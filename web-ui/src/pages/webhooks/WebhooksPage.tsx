import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, HelpCircle, Pencil, Trash2, Webhook as WebhookIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { ApiError } from '@/api/client';
import { webhooksApi } from '@/api/webhooks';
import type { Webhook, WebhookEvent, WebhookWithSecret } from '@/api/types';
import { SimpleDialog as Dialog } from '@/components/SimpleDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

const EVENT_LABELS: Record<WebhookEvent, string> = {
  'member.changed': 'Thành viên được thêm / sửa / xoá',
  'auth.login': 'Có người đăng nhập',
};

const EVENT_OPTIONS = Object.keys(EVENT_LABELS) as WebhookEvent[];

function TipsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Hướng dẫn dùng webhook" className="sm:max-w-lg">
      <div className="space-y-4 text-sm text-slate-600">
        <div className="rounded-lg border border-[#5865F2]/20 bg-[#5865F2]/5 p-3">
          <p className="font-semibold text-slate-800">Dán thẳng Discord Webhook URL?</p>
          <p className="mt-1">
            Nếu URL có dạng{' '}
            <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">
              https://discord.com/api/webhooks/...
            </code>{' '}
            (lấy từ Cài đặt kênh → Tích hợp → Webhooks trên Discord), hệ thống sẽ <strong>tự động</strong> gửi tin
            nhắn dạng embed đẹp mắt thẳng vào kênh đó — không cần bot, không cần server riêng. Nếu người dùng liên
            quan đã liên kết Discord (qua trang hồ sơ), tên của họ sẽ hiện thành mention{' '}
            <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">@user</code> trong tin nhắn.
          </p>
        </div>

        <p>
          Với URL khác (server bot của riêng bạn), hệ thống gửi{' '}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">POST</code> với nội dung JSON dạng:
        </p>
        <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
{`{
  "event": "member.changed",
  "timestamp": "2026-09-03T02:30:00.000Z",
  "actor": {
    "id": "...", "username": "admin", "fullName": "...",
    "avatar": "...", "discordId": null, "discordUsername": null
  },
  "target": {
    "id": "...", "username": "holedev", "fullName": "...",
    "avatar": "...", "discordId": "111222333", "discordUsername": "hole"
  },
  "changedFields": [],
  "ip": "1.2.3.4",
  "data": { "action": "role-updated", "position": "VICE_PRESIDENT" }
}`}
        </pre>
        <p>
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">actor</code>/
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">target</code> là <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">null</code> nếu không xác định được (vd: hành động hệ thống). Có sẵn tên, avatar và Discord ID (nếu đã liên
          kết) nên không cần tự tra cứu lại — dùng <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">discordId</code> để bot thao tác trực tiếp (đổi role,
          nickname, v.v.). <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">data</code> chứa chi tiết riêng của từng loại sự kiện (action, method, số lượng...).
        </p>
        <p>
          Mỗi request kèm header{' '}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">X-MPC-Signature</code> dạng{' '}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">sha256=&lt;hex&gt;</code> — chữ ký HMAC-SHA256
          của phần thân request (raw JSON), dùng secret được cấp khi tạo webhook. Hãy tự tính lại chữ ký này ở phía
          bạn và so sánh để xác minh request thực sự đến từ MPC SSO trước khi xử lý. (Discord tự bỏ qua header lạ
          nên header này vẫn được gửi kèm dù bạn dùng Discord Webhook URL trực tiếp.)
        </p>
        <p>
          Mỗi request có thời hạn chờ 5 giây, <strong>không tự động thử lại</strong> nếu thất bại — bạn có thể xem
          trạng thái lần gửi gần nhất ở bảng bên dưới. URL phải dùng <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">https</code> và không được trỏ tới địa chỉ nội bộ/riêng tư.
        </p>
      </div>
    </Dialog>
  );
}

const webhookSchema = z.object({
  events: z.array(z.enum(['member.changed', 'auth.login'])).min(1, 'Chọn ít nhất một sự kiện'),
  url: z.string().url('URL không hợp lệ').startsWith('https://', 'URL phải bắt đầu bằng https://'),
});
type WebhookFormValues = z.infer<typeof webhookSchema>;
type CreateFormValues = WebhookFormValues;

function EventCheckboxGroup({
  value,
  onChange,
}: {
  value: WebhookEvent[];
  onChange: (next: WebhookEvent[]) => void;
}) {
  return (
    <div className="mt-1 space-y-2">
      {EVENT_OPTIONS.map((option) => (
        <label
          key={option}
          className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer"
        >
          <input
            type="checkbox"
            checked={value?.includes(option) ?? false}
            onChange={(e) => {
              const current = value ?? [];
              onChange(
                e.target.checked ? [...current, option] : current.filter((v) => v !== option),
              );
            }}
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          {EVENT_LABELS[option]}
        </label>
      ))}
    </div>
  );
}

function CreateWebhookDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (webhook: WebhookWithSecret) => void;
}) {
  const queryClient = useQueryClient();
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateFormValues>({ resolver: zodResolver(webhookSchema) });

  useEffect(() => {
    if (open) reset({ events: ['member.changed'], url: '' });
  }, [open, reset]);

  const mutation = useMutation({
    mutationFn: (values: CreateFormValues) => webhooksApi.create(values),
    onSuccess: (webhook) => {
      void queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      onCreated(webhook);
    },
  });

  return (
    <Dialog open={open} onClose={onClose} title="Thêm webhook">
      {mutation.isError && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {mutation.error instanceof ApiError ? mutation.error.message : 'Tạo webhook thất bại'}
        </div>
      )}
      <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="space-y-4">
        <div>
          <Label>Sự kiện</Label>
          <Controller
            control={control}
            name="events"
            render={({ field }) => <EventCheckboxGroup value={field.value} onChange={field.onChange} />}
          />
          {errors.events && <p className="mt-1 text-xs text-red-600">{errors.events.message}</p>}
        </div>
        <div>
          <Label htmlFor="url">URL nhận webhook</Label>
          <Input id="url" placeholder="https://example.com/webhooks/mpc" {...register('url')} />
          {errors.url && <p className="mt-1 text-xs text-red-600">{errors.url.message}</p>}
        </div>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Đang tạo...' : 'Tạo webhook'}
        </Button>
      </form>
    </Dialog>
  );
}

function EditWebhookDialog({
  webhook,
  onClose,
}: {
  webhook: Webhook | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<WebhookFormValues>({ resolver: zodResolver(webhookSchema) });

  useEffect(() => {
    if (webhook) reset({ events: webhook.events as WebhookEvent[], url: webhook.url });
  }, [webhook, reset]);

  const mutation = useMutation({
    mutationFn: (values: WebhookFormValues) => {
      if (!webhook) throw new Error('No webhook selected');
      return webhooksApi.update(webhook.id, values);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      onClose();
    },
  });

  return (
    <Dialog open={Boolean(webhook)} onClose={onClose} title="Sửa webhook">
      {mutation.isError && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {mutation.error instanceof ApiError ? mutation.error.message : 'Cập nhật webhook thất bại'}
        </div>
      )}
      <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="space-y-4">
        <div>
          <Label>Sự kiện</Label>
          <Controller
            control={control}
            name="events"
            render={({ field }) => <EventCheckboxGroup value={field.value} onChange={field.onChange} />}
          />
          {errors.events && <p className="mt-1 text-xs text-red-600">{errors.events.message}</p>}
        </div>
        <div>
          <Label htmlFor="edit-url">URL nhận webhook</Label>
          <Input id="edit-url" placeholder="https://example.com/webhooks/mpc" {...register('url')} />
          {errors.url && <p className="mt-1 text-xs text-red-600">{errors.url.message}</p>}
        </div>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
        </Button>
      </form>
    </Dialog>
  );
}

function SecretRevealDialog({
  webhook,
  onClose,
}: {
  webhook: WebhookWithSecret | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={Boolean(webhook)} onClose={onClose} title="Webhook đã được tạo">
      {webhook && (
        <div className="space-y-4">
          <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Lưu lại <strong>secret</strong> ngay — nó sẽ không hiển thị lại lần nào nữa. Dùng secret này để xác minh
            header <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">X-MPC-Signature</code>.
          </div>
          <div>
            <Label>Secret</Label>
            <div className="flex gap-2">
              <Input readOnly value={webhook.secret} className="font-mono text-xs" />
              <button
                className="rounded-md border border-slate-300 p-2 text-slate-500 hover:bg-slate-50 cursor-pointer"
                onClick={() => void navigator.clipboard.writeText(webhook.secret)}
                aria-label="Copy secret"
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

function DeliveryBadge({ webhook }: { webhook: Webhook }) {
  if (!webhook.lastDelivery) {
    return <Badge variant="outline">Chưa gửi lần nào</Badge>;
  }
  return webhook.lastDelivery.ok ? (
    <Badge variant="success">
      Thành công · {new Date(webhook.lastDelivery.createdAt).toLocaleString('vi-VN')}
    </Badge>
  ) : (
    <Badge variant="destructive">
      Thất bại · {new Date(webhook.lastDelivery.createdAt).toLocaleString('vi-VN')}
    </Badge>
  );
}

export function WebhooksPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(false);
  const [revealWebhook, setRevealWebhook] = useState<WebhookWithSecret | null>(null);
  const [editWebhook, setEditWebhook] = useState<Webhook | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['webhooks'], queryFn: webhooksApi.list });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      webhooksApi.update(id, { isActive }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['webhooks'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => webhooksApi.remove(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['webhooks'] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold text-slate-900">Webhooks</h1>
          <button
            type="button"
            onClick={() => setTipsOpen(true)}
            className="flex h-6 w-6 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            title="Hướng dẫn dùng webhook"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>
        <Button onClick={() => setCreateOpen(true)}>Thêm webhook</Button>
      </div>

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
                <TableHead>Sự kiện</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Lần gửi gần nhất</TableHead>
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
              {(data ?? []).map((webhook) => (
                <TableRow key={webhook.id} className="hover:bg-slate-50/50">
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <WebhookIcon className="h-3.5 w-3.5 shrink-0 text-brand-600" />
                      {webhook.events.map((event) => (
                        <Badge key={event} variant="outline" className="font-normal">
                          {EVENT_LABELS[event as WebhookEvent] ?? event}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate font-mono text-xs text-slate-600">
                    {webhook.url}
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() =>
                        toggleActiveMutation.mutate({ id: webhook.id, isActive: !webhook.isActive })
                      }
                      disabled={toggleActiveMutation.isPending}
                    >
                      {webhook.isActive ? (
                        <Badge variant="success">Đang bật</Badge>
                      ) : (
                        <Badge variant="outline">Đã tắt</Badge>
                      )}
                    </button>
                  </TableCell>
                  <TableCell>
                    <DeliveryBadge webhook={webhook} />
                  </TableCell>
                  <TableCell className="text-right pr-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() => setEditWebhook(webhook)}
                        title="Sửa webhook"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-slate-200 bg-white text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        onClick={() => {
                          if (confirm('Bạn chắc chắn muốn xoá webhook này?')) {
                            deleteMutation.mutate(webhook.id);
                          }
                        }}
                        title="Xoá webhook"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(data ?? []).length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-400 py-8">
                    Chưa có webhook nào. Thêm webhook để nhận thông báo khi có sự kiện xảy ra.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <TipsDialog open={tipsOpen} onClose={() => setTipsOpen(false)} />
      <CreateWebhookDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(webhook) => {
          setCreateOpen(false);
          setRevealWebhook(webhook);
        }}
      />
      <SecretRevealDialog webhook={revealWebhook} onClose={() => setRevealWebhook(null)} />
      <EditWebhookDialog webhook={editWebhook} onClose={() => setEditWebhook(null)} />
    </div>
  );
}
