'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Container,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setAuth } from '@/store/slices/authSlice';
import { ROUTES, APP_CONFIG, API_CONFIG } from '@/lib/constants';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);

  // Handle OAuth callback
  useEffect(() => {
    const token = searchParams.get('token');
    const user = searchParams.get('user');

    if (token && user) {
      try {
        const userData = JSON.parse(decodeURIComponent(user));
        dispatch(setAuth({ user: userData, token }));
        router.push(ROUTES.DASHBOARD);
      } catch (error) {
        console.error('Failed to parse user data:', error);
      }
    }
  }, [searchParams, dispatch, router]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push(ROUTES.DASHBOARD);
    }
  }, [isAuthenticated, isLoading, router]);

  const handleMicrosoftLogin = () => {
    const loginUrl = `${API_CONFIG.BASE_URL}/auth/login`;
    window.location.href = loginUrl;
  };

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F5F5F5',
      }}
    >
      <Container maxWidth="sm">
        <Card sx={{ borderRadius: 2 }}>
          <CardContent sx={{ padding: 4, textAlign: 'center' }}>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 700,
                color: '#0078D4',
                marginBottom: 1,
              }}
            >
              {APP_CONFIG.APP_NAME}
            </Typography>

            <Typography
              variant="body1"
              color="textSecondary"
              sx={{ marginBottom: 3 }}
            >
              {APP_CONFIG.APP_DESCRIPTION}
            </Typography>

            <Alert severity="info" sx={{ marginBottom: 2 }}>
              Sign in with your Microsoft account to get started
            </Alert>

            <Button
              fullWidth
              variant="contained"
              color="primary"
              size="large"
              onClick={handleMicrosoftLogin}
              sx={{
                padding: '12px',
                fontWeight: 600,
                fontSize: '1rem',
                marginBottom: 2,
              }}
            >
              Sign in with Microsoft
            </Button>

            <Typography variant="caption" color="textSecondary">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </Typography>
          </CardContent>
        </Card>

        <Typography
          variant="caption"
          color="textSecondary"
          sx={{
            display: 'block',
            textAlign: 'center',
            marginTop: 3,
          }}
        >
          © 2024 Teams Meeting Summary. All rights reserved.
        </Typography>
      </Container>
    </Box>
  );
}
