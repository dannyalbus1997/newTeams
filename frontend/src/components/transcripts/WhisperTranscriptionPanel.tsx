'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Box,
  Button,
  Typography,
  LinearProgress,
  Alert,
  Stack,
  Chip,
  CircularProgress,
  Tooltip,
  IconButton,
} from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import RefreshIcon from '@mui/icons-material/Refresh';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { Meeting, TranscriptionJobStatus } from '@/types';

interface WhisperTranscriptionPanelProps {
  meeting: Meeting;
  onTranscribeWhisper: () => Promise<void>;
  onSmartFetch: () => Promise<void>;
  isTranscribing: boolean;
  transcriptionStatus: TranscriptionJobStatus | null;
  error?: string | null;
  onRetry?: () => void;
  onDismissError?: () => void;
}

const STAGE_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  pending: { label: 'Preparing...', icon: <CircularProgress size={16} /> },
  downloading: { label: 'Downloading recording', icon: <CloudDownloadIcon fontSize="small" color="info" /> },
  transcribing: { label: 'Transcribing with Whisper', icon: <GraphicEqIcon fontSize="small" color="primary" /> },
  processing: { label: 'Processing results', icon: <AutoFixHighIcon fontSize="small" color="secondary" /> },
  completed: { label: 'Completed', icon: <CheckCircleOutlineIcon fontSize="small" color="success" /> },
  error: { label: 'Failed', icon: <ErrorOutlineIcon fontSize="small" color="error" /> },
};

export default function WhisperTranscriptionPanel({
  meeting,
  onTranscribeWhisper,
  onSmartFetch,
  isTranscribing,
  transcriptionStatus,
  error = null,
  onRetry,
  onDismissError,
}: WhisperTranscriptionPanelProps) {
  const [elapsedTime, setElapsedTime] = useState(0);

  // Timer for elapsed time during transcription
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isTranscribing) {
      setElapsedTime(0);
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTranscribing]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentStage = transcriptionStatus?.status
    ? STAGE_LABELS[transcriptionStatus.status]
    : null;

  const showRecordingAvailable = meeting.hasRecording && !meeting.hasTranscript;
  const showWhisperOption =
    !isTranscribing &&
    (meeting.hasRecording ||
      meeting.transcriptStatus === 'error' ||
      meeting.transcriptStatus === 'none');

  return (
    <Card
      sx={{
        border: isTranscribing ? '1px solid' : 'none',
        borderColor: 'primary.light',
        background: isTranscribing
          ? 'linear-gradient(135deg, #f0f4ff 0%, #e8f0fe 100%)'
          : undefined,
      }}
    >
      <CardHeader
        avatar={<MicIcon color="primary" />}
        title="AI Transcription"
        subheader={
          isTranscribing
            ? 'Transcription in progress...'
            : showRecordingAvailable
              ? 'Recording available — transcribe with AI'
              : 'Transcribe meeting recording with OpenAI Whisper'
        }
        action={
          onRetry && error && !isTranscribing ? (
            <Tooltip title="Retry transcription">
              <IconButton onClick={onRetry} color="primary" size="small">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          ) : null
        }
      />

      <CardContent>
        <Stack spacing={2}>
          {/* Error alert */}
          {error && !isTranscribing && (
            <Alert
              severity="error"
              icon={<ErrorOutlineIcon />}
              onClose={onDismissError}
            >
              <Typography variant="body2" fontWeight={600}>
                Transcription failed
              </Typography>
              <Typography variant="caption">{error}</Typography>
            </Alert>
          )}

          {/* Progress section */}
          {isTranscribing && (
            <Box>
              {/* Stage indicator */}
              {currentStage && (
                <Box
                  display="flex"
                  alignItems="center"
                  gap={1}
                  mb={1.5}
                >
                  {currentStage.icon}
                  <Typography variant="body2" fontWeight={600}>
                    {currentStage.label}
                  </Typography>
                  {transcriptionStatus?.estimatedTimeRemaining && (
                    <Chip
                      label={`~${Math.ceil(transcriptionStatus.estimatedTimeRemaining / 60)} min remaining`}
                      size="small"
                      variant="outlined"
                      color="info"
                    />
                  )}
                </Box>
              )}

              {/* Progress bar */}
              <Box mb={1}>
                <Box display="flex" justifyContent="space-between" mb={0.5}>
                  <Typography variant="caption" color="textSecondary">
                    {transcriptionStatus?.message || 'Processing...'}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {transcriptionStatus?.progress || 0}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant={
                    transcriptionStatus?.progress
                      ? 'determinate'
                      : 'indeterminate'
                  }
                  value={transcriptionStatus?.progress || 0}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 4,
                      background:
                        'linear-gradient(90deg, #0078D4 0%, #6264A7 100%)',
                    },
                  }}
                />
              </Box>

              {/* Elapsed time */}
              <Typography variant="caption" color="textSecondary">
                Elapsed: {formatTime(elapsedTime)}
              </Typography>
            </Box>
          )}

          {/* Info message when no transcript and no recording */}
          {!meeting.hasRecording && !meeting.hasTranscript && !isTranscribing && (
            <Alert severity="info" variant="outlined">
              <Typography variant="body2">
                No recording or transcript found for this meeting. Ensure meeting
                recording was enabled in Teams, then sync your meetings.
              </Typography>
            </Alert>
          )}

          {/* Action buttons */}
          {showWhisperOption && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              {/* Smart fetch — tries Graph first, then Whisper */}
              <Button
                variant="contained"
                color="primary"
                startIcon={<SmartToyIcon />}
                onClick={onSmartFetch}
                disabled={isTranscribing}
                fullWidth
                sx={{
                  background:
                    'linear-gradient(90deg, #0078D4 0%, #6264A7 100%)',
                  '&:hover': {
                    background:
                      'linear-gradient(90deg, #006CBE 0%, #5558A0 100%)',
                  },
                }}
              >
                Smart Transcribe
              </Button>

              {/* Direct Whisper transcription */}
              {meeting.hasRecording && (
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<MicIcon />}
                  onClick={onTranscribeWhisper}
                  disabled={isTranscribing}
                  fullWidth
                >
                  Whisper Only
                </Button>
              )}
            </Stack>
          )}

          {/* Source badge for completed transcripts */}
          {!isTranscribing && !error && meeting.transcriptStatus === 'completed' && (
            <Box display="flex" alignItems="center" gap={1}>
              <Chip
                icon={<CheckCircleOutlineIcon />}
                label="Transcript available"
                color="success"
                size="small"
                variant="outlined"
              />
            </Box>
          )}

          {/* Description */}
          {!isTranscribing && showWhisperOption && (
            <Typography variant="caption" color="textSecondary">
              <strong>Smart Transcribe</strong> checks for a Teams transcript
              first. If none exists, it downloads the recording and transcribes it
              with OpenAI Whisper. <strong>Whisper Only</strong> goes directly to
              the recording.
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
