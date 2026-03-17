'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Grid,
  Button,
  Pagination,
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import BotSessionCard from './BotSessionCard';
import { BotSession } from '@/types';
import { useGetBotSessionHistoryQuery } from '@/store/api/meetingBotApi';

interface SessionHistoryProps {
  onViewDetails?: (sessionId: string) => void;
}

const PAGE_SIZE = 6;

export default function SessionHistory({ onViewDetails }: SessionHistoryProps) {
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useGetBotSessionHistoryQuery({
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Failed to load session history.
      </Alert>
    );
  }

  const sessions = data?.sessions || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (sessions.length === 0) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        py={4}
        sx={{ color: '#A19F9D' }}
      >
        <HistoryIcon sx={{ fontSize: 40, mb: 1 }} />
        <Typography variant="body2" color="textSecondary">
          No bot session history yet.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          Session History ({total})
        </Typography>
      </Box>

      <Grid container spacing={2}>
        {sessions.map((session: BotSession) => (
          <Grid item xs={12} md={6} key={session._id}>
            <BotSessionCard
              session={session}
              onViewDetails={onViewDetails}
            />
          </Grid>
        ))}
      </Grid>

      {totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={3}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
            size="small"
          />
        </Box>
      )}
    </Box>
  );
}
