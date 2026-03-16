'use client';

import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

interface LoadingSpinnerProps {
  message?: string;
  fullHeight?: boolean;
  size?: number;
}

export default function LoadingSpinner({
  message = 'Loading...',
  fullHeight = true,
  size = 40,
}: LoadingSpinnerProps) {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      height={fullHeight ? '100vh' : '100%'}
      minHeight={fullHeight ? undefined : '400px'}
      gap={2}
    >
      <CircularProgress size={size} />
      {message && <Typography variant="body2">{message}</Typography>}
    </Box>
  );
}
