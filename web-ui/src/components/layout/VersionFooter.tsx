import { APP_VERSION, formatBuildDate } from '@/lib/version';
import { cn } from '@/lib/utils';

export function VersionFooter({ className }: { className?: string }) {
  return (
    <div className={cn('py-3 text-center text-xs text-slate-400', className)}>
      v{APP_VERSION} · Cập nhật {formatBuildDate()}
    </div>
  );
}
