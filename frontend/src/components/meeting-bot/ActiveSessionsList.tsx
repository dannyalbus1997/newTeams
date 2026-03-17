'use client';

import React from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Grid,
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import BotSessionCard from './BotSessionCard';
import { BotSession } from '@/types';
import {
  useGetActiveBotSessionsQuery,
  useStopBotSessionMutation,
  useCancelBotSessionMutation,
} from '@/store/api/meetingBotApi';

interface ActiveSessionsListProps {
  onViewDetails?: (sessionId: string) => void;
}

export default function ActiveSessionsList({ onViewDetails }: ActiveSessionsListProps) {
  const {
    data,
    isLoading,
    error,
  } = useGetActiveBotSessionsQuery(undefined, {
    pollingInterval: 5000, // Poll every 5s for live updates
  });

  const [stopSession, { isLoading: isStopLoading }] = useStopBotSessionMutation();
  const [cancelSession, { isLoading: isCancelLoading }] = useCancelBotSessionMutation();

  const handleStop = async (sessionId: string) => {
    try {
      await stopSession({ sessionId }).unwrap();
    } catch (err) {
      console.error('Failed to stop session:', err);
    }
  };

  const handleCancel = async (sessionId: string) => {
    try {
      await cancelSession(sessionId).unwrap();
    } catch (err) {
      console.error('Failed to cancel session:', err);
    }
  };

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
        Failed to load active sessions. Please try refreshing.
      </Alert>
    );
  }

  const sessions = data?.sessions || [];

  if (sessions.length === 0) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        py={4}
        sx={{ color: '#A19F9D' }}
      >
        <SmartToyIcon sx={{ fontSize: 40, mb: 1 }} />
        <Typography variant="body2" color="textSecondary">
          No active bot sessions. Send a bot to a meeting to get started.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: '#0078D4' }}>
        Active Sessions ({sessions.length})
      </Typography>
      <Grid container spacing={2}>
        {sessions.map((session: BotSession) => (
          <Grid item xs={12} md={6} key={session._id}>
            <BotSessionCard
              session={session}
              onStop={handleStop}
              onCancel={handleCancel}
              onViewDetails={onViewDetails}
              isStopLoading={isStopLoading}
              isCancelLoading={isCancelLoading}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
