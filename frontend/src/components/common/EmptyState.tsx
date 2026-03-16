'use client';

import React, { ReactNode } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { SvgIconProps } from '@mui/material';

interface EmptyStateProps {
  icon?: React.ComponentType<SvgIconProps>;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  children?: ReactNode;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  children,
}: EmptyStateProps) {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="400px"
      padding={3}
      textAlign="center"
    >
      {Icon && (
        <Icon
          sx={{
            fontSize: 80,
            color: 'action.disabled',
            marginBottom: 2,
          }}
        />
      )}
      <Typography variant="h5" gutterBottom fontWeight={600}>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="textSecondary" sx={{ marginBottom: 2 }}>
          {description}
        </Typography>
      )}
      {children}
      {action && (
        <Button
          variant="contained"
          color="primary"
          onClick={action.onClick}
          sx={{ marginTop: 2 }}
        >
          {action.label}
        </Button>
      )}
    </Box>
  );
}
