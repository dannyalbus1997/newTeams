'use client';

import React, { useEffect, ReactNode } from 'react';
import { Box, Container } from '@mui/material';
import { useRouter } from 'next/navigation';
import Navbar from './Navbar';
import { useAuthStore } from '@/hooks/useAuthStore';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { ROUTES } from '@/lib/constants';

interface MainLayoutProps {
  children: ReactNode;
  containerMaxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
}

export default function MainLayout({
  children,
  containerMaxWidth = 'lg',
}: MainLayoutProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    const initAuth = async () => {
      if (!isAuthenticated && !isLoading) {
        await checkAuth();
      }
    };

    initAuth();
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(ROUTES.LOGIN);
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return <LoadingSpinner fullHeight />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: '#F5F5F5',
      }}
    >
      <Navbar />
      <Container
        maxWidth={containerMaxWidth}
        sx={{
          flex: 1,
          paddingY: 3,
          paddingX: { xs: 1, sm: 2, md: 3 },
        }}
      >
        {children}
      </Container>
    </Box>
  );
}
