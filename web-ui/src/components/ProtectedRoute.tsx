import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { authApi } from '@/api/auth';

export function ProtectedRoute() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['me'],
    queryFn: authApi.me,
    retry: false,
  });

  const unauthenticated = !isLoading && (isError || !data);

  useEffect(() => {
    if (unauthenticated) {
      window.location.href = '/admin/ui/login';
    }
  }, [unauthenticated]);

  if (isLoading || unauthenticated) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-400">
        Đang tải...
      </div>
    );
  }

  return <Outlet />;
}
