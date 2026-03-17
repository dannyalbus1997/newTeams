'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/store/hooks';
import { ROUTES } from '@/lib/constants';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.push(ROUTES.DASHBOARD);
      } else {
        router.push(ROUTES.LOGIN);
      }
    }
  }, [isLoading, isAuthenticated, router]);

  return <LoadingSpinner fullHeight message="Redirecting..." />;
}
