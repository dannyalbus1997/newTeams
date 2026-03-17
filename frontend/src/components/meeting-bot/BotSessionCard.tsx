'use client';

import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  LinearProgress,
  Chip,
  Button,
  Stack,
  Tooltip,
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import StopIcon from '@mui/icons-material/Stop';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { BotSession, BotSessionStatus } from '@/types';
import { format } from 'date-fns';

interface BotSessionCardProps {
  session: BotSession;
  onStop?: (sessionId: string) => void;
  onCancel?: (sessionId: string) => void;
  onViewDetails?: (sessionId: string) => void;
  isStopLoading?: boolean;
  isCancelLoading?: boolean;
}

const statusConfig: Record<
  BotSessionStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  [BotSessionStatus.INITIALIZING]: {
    label: 'Connecting...',
    color: '#0078D4',
    icon: <SmartToyIcon fontSize="small" />,
  },
  [BotSessionStatus.JOINED]: {
    label: 'In Meeting',
    color: '#107C10',
    icon: <SmartToyIcon fontSize="small" />,
  },
  [BotSessionStatus.RECORDING]: {
    label: 'Recording',
    color: '#D83B01',
    icon: <FiberManualRecordIcon fontSize="small" />,
  },
  [BotSessionStatus.RECORDING_COMPLETE]: {
    label: 'Processing...',
    color: '#0078D4',
    icon: <SmartToyIcon fontSize="small" />,
  },
  [BotSessionStatus.TRANSCRIBING]: {
    label: 'Transcribing',
    color: '#6264A7',
    icon: <SmartToyIcon fontSize="small" />,
  },
  [BotSessionStatus.SUMMARIZING]: {
    label: 'Summarizing',
    color: '#6264A7',
    icon: <SmartToyIcon fontSize="small" />,
  },
  [BotSessionStatus.COMPLETED]: {
    label: 'Completed',
    color: '#107C10',
    icon: <CheckCircleIcon fontSize="small" />,
  },
  [BotSessionStatus.ERROR]: {
    label: 'Error',
    color: '#D83B01',
    icon: <ErrorIcon fontSize="small" />,
  },
  [BotSessionStatus.CANCELLED]: {
    label: 'Cancelled',
    color: '#605E5C',
    icon: <CancelIcon fontSize="small" />,
  },
};

const isActiveStatus = (status: BotSessionStatus) =>
  [
    BotSessionStatus.INITIALIZING,
    BotSessionStatus.JOINED,
    BotSessionStatus.RECORDING,
    BotSessionStatus.RECORDING_COMPLETE,
    BotSessionStatus.TRANSCRIBING,
    BotSessionStatus.SUMMARIZING,
  ].includes(status);

export default function BotSessionCard({
  session,
  onStop,
  onCancel,
  onViewDetails,
  isStopLoading = false,
  isCancelLoading = false,
}: BotSessionCardProps) {
  const config = statusConfig[session.status];
  const active = isActiveStatus(session.status);
  const isRecording = session.status === BotSessionStatus.RECORDING;

  return (
    <Card
      sx={{
        border: active ? `2px solid ${config.color}` : '1px solid #E1DFDD',
        position: 'relative',
        overflow: 'visible',
      }}
    >
      {/* Recording pulse indicator */}
      {isRecording && (
        <Box
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 12,
            height: 12,
            borderRadius: '50%',
            backgroundColor: '#D83B01',
            animation: 'pulse 1.5s ease-in-out infinite',
            '@keyframes pulse': {
              '0%': { opacity: 1, transform: 'scale(1)' },
              '50%': { opacity: 0.5, transform: 'scale(1.3)' },
              '100%': { opacity: 1, transform: 'scale(1)' },
            },
          }}
        />
      )}

      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
          <Box flex={1} minWidth={0}>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {session.botDisplayName}
            </Typography>
            <Tooltip title={session.joinUrl}>
              <Typography
                variant="caption"
                color="textSecondary"
                sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}
              >
                {session.joinUrl.length > 60
                  ? session.joinUrl.substring(0, 60) + '...'
                  : session.joinUrl}
              </Typography>
            </Tooltip>
          </Box>
          <Chip
            icon={config.icon as React.ReactElement}
            label={config.label}
            size="small"
            sx={{
              backgroundColor: `${config.color}15`,
              color: config.color,
              fontWeight: 600,
              ml: 1,
              flexShrink: 0,
            }}
          />
        </Box>

        {/* Progress bar */}
        {active && (
          <Box mt={2}>
            <Box display="flex" justifyContent="space-between" mb={0.5}>
              <Typography variant="caption" color="textSecondary">
                {session.progressMessage}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {session.progressPercent}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={session.progressPercent}
              sx={{
                height: 6,
                borderRadius: 3,
                backgroundColor: '#E1DFDD',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: config.color,
                  borderRadius: 3,
                },
              }}
            />
          </Box>
        )}

        {/* Error message */}
        {session.status === BotSessionStatus.ERROR && session.errorMessage && (
          <Box
            mt={1.5}
            p={1.5}
            sx={{ backgroundColor: '#FDE7E0', borderRadius: 1 }}
          >
            <Typography variant="caption" color="error">
              {session.errorMessage}
            </Typography>
          </Box>
        )}

        {/* Completed info */}
        {session.status === BotSessionStatus.COMPLETED && (
          <Box mt={1.5}>
            <Typography variant="caption" color="textSecondary">
              {session.progressMessage}
            </Typography>
            {session.recordingSize && (
              <Typography variant="caption" color="textSecondary" display="block">
                Recording: {(session.recordingSize / 1024 / 1024).toFixed(1)} MB
              </Typography>
            )}
          </Box>
        )}

        {/* Timestamps */}
        <Box mt={1.5}>
          <Typography variant="caption" color="textSecondary">
            Started: {format(new Date(session.createdAt), 'MMM d, h:mm a')}
          </Typography>
          {session.completedAt && (
            <Typography variant="caption" color="textSecondary" display="block">
              Completed: {format(new Date(session.completedAt), 'MMM d, h:mm a')}
            </Typography>
          )}
        </Box>
      </CardContent>

      <CardActions sx={{ padding: 2, pt: 0 }}>
        <Stack direction="row" spacing={1} width="100%">
          {active && onStop && (
            <Button
              variant="contained"
              size="small"
              color="warning"
              startIcon={<StopIcon />}
              onClick={() => onStop(session._id)}
              disabled={isStopLoading}
              sx={{ flex: 1 }}
            >
              {isStopLoading ? 'Stopping...' : 'Stop & Process'}
            </Button>
          )}
          {active && onCancel && (
            <Button
              variant="outlined"
              size="small"
              color="error"
              startIcon={<CancelIcon />}
              onClick={() => onCancel(session._id)}
              disabled={isCancelLoading}
              sx={{ flex: 1 }}
            >
              Cancel
            </Button>
          )}
          {!active && onViewDetails && (
            <Button
              variant="outlined"
              size="small"
              onClick={() => onViewDetails(session._id)}
              sx={{ flex: 1 }}
            >
              View Details
            </Button>
          )}
        </Stack>
      </CardActions>
    </Card>
  );
}
