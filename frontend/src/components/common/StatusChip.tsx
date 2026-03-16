'use client';

import React from 'react';
import { Chip, ChipProps } from '@mui/material';
import { getStatusColor, getStatusLabel } from '@/lib/utils';

interface StatusChipProps extends Omit<ChipProps, 'label'> {
  status: string;
  variant?: 'filled' | 'outlined';
}

export default function StatusChip({
  status,
  variant = 'filled',
  ...props
}: StatusChipProps) {
  const color = getStatusColor(status);
  const label = getStatusLabel(status);

  return (
    <Chip
      label={label}
      variant={variant}
      size="small"
      sx={{
        backgroundColor: variant === 'filled' ? color : 'transparent',
        color: variant === 'filled' ? '#fff' : color,
        borderColor: color,
        borderWidth: variant === 'outlined' ? 1 : 0,
        fontWeight: 600,
      }}
      {...props}
    />
  );
}
