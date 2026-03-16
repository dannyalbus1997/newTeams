'use client';

import React from 'react';
import { Alert, Box, Button } from '@mui/material';

interface ErrorAlertProps {
  error: string | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  showDismiss?: boolean;
  variant?: 'standard' | 'filled' | 'outlined';
}

export default function ErrorAlert({
  error,
  onRetry,
  onDismiss,
  showDismiss = false,
  variant = 'outlined',
}: ErrorAlertProps) {
  if (!error) return null;

  return (
    <Alert
      severity="error"
      variant={variant}
      sx={{
        marginBottom: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Box flex={1}>{error}</Box>
      <Box display="flex" gap={1}>
        {onRetry && (
          <Button color="inherit" size="small" onClick={onRetry}>
            Retry
          </Button>
        )}
        {showDismiss && onDismiss && (
          <Button color="inherit" size="small" onClick={onDismiss}>
            Dismiss
          </Button>
        )}
      </Box>
    </Alert>
  );
}
