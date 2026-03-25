'use client';

import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Stack,
  Chip,
} from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import { format } from 'date-fns';
import { useGetRecordingsQuery, RecordingInfo } from '@/store/api/recordingsApi';
import { API_CONFIG } from '@/lib/constants';

interface RecordingPlayerProps {
  meetingId: string;
  hasRecording: boolean;
}

export default function RecordingPlayer({ meetingId, hasRecording }: RecordingPlayerProps) {
  const {
    data: recordings,
    isLoading,
    error,
  } = useGetRecordingsQuery(meetingId);

  const streamUrl = useMemo(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!token) return null;
    return `${API_CONFIG.BASE_URL}/recordings/${meetingId}/stream?token=${encodeURIComponent(token)}`;
  }, [meetingId]);

  if (isLoading) {
    return (
      <Box textAlign="center" py={4}>
        <CircularProgress />
        <Typography color="text.secondary" mt={2}>
          Checking recording availability...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Failed to load recording information. Please try again.
      </Alert>
    );
  }

  if (!recordings?.length) {
    return (
      <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
        <VideocamOffIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
        <Typography color="text.secondary">
          Recording metadata not found. The recording may have expired or been deleted.
        </Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={2}>
      {/* Recording metadata */}
      <Stack direction="row" alignItems="center" spacing={1}>
        <VideocamIcon color="primary" />
        <Typography variant="subtitle1" fontWeight={600}>
          Meeting Recording
        </Typography>
        <Chip
          label={`${recordings.length} recording${recordings.length > 1 ? 's' : ''}`}
          size="small"
          color="primary"
          variant="outlined"
        />
        {recordings[0]?.createdDateTime && (
          <Typography variant="body2" color="text.secondary">
            Recorded {format(new Date(recordings[0].createdDateTime), 'MMM d, yyyy h:mm a')}
          </Typography>
        )}
      </Stack>

      {/* Video player */}
      <Paper
        variant="outlined"
        sx={{
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: '#000',
        }}
      >
        <Box
          component="video"
          controls
          preload="metadata"
          sx={{
            width: '100%',
            maxHeight: 500,
            display: 'block',
          }}
          src={streamUrl || undefined}
        >
          Your browser does not support the video element.
        </Box>
      </Paper>

      <Typography variant="caption" color="text.disabled">
        Recording is streamed from Microsoft Teams. Playback quality depends on
        your network connection.
      </Typography>
    </Stack>
  );
}
