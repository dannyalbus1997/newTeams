'use client';

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Button,
  Stack,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import { Meeting } from '@/types';
import {
  formatDateTime,
  formatDuration,
  calculateDuration,
  getInitials,
} from '@/lib/utils';
import StatusChip from '@/components/common/StatusChip';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LinkIcon from '@mui/icons-material/Link';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import VideocamIcon from '@mui/icons-material/Videocam';

interface MeetingDetailProps {
  meeting: Meeting;
  onViewRecording?: () => void;
  onViewTranscript: () => void;
  onViewSummary: () => void;
  onFetchTranscript?: () => void;
  onGenerateSummary?: () => void;
  onTranscribeWhisper?: () => void;
  onSmartFetch?: () => void;
  onSendBot?: () => void;
  isTranscribing?: boolean;
  isBotJoining?: boolean;
}

export default function MeetingDetail({
  meeting,
  onViewRecording,
  onViewTranscript,
  onViewSummary,
  onFetchTranscript,
  onGenerateSummary,
  onTranscribeWhisper,
  onSmartFetch,
  onSendBot,
  isTranscribing = false,
  isBotJoining = false,
}: MeetingDetailProps) {
  const [joinUrlOpen, setJoinUrlOpen] = useState(false);
  const duration = calculateDuration(
    meeting.startDateTime,
    meeting.endDateTime
  );

  const canGenerateSummary =
    meeting.transcriptStatus === 'completed' &&
    (meeting.summaryStatus === 'not_generated' || meeting.summaryStatus === 'failed');

  const showWhisperButton =
    meeting.hasRecording &&
    meeting.transcriptStatus !== 'completed' &&
    meeting.transcriptStatus !== 'processing';

  return (
    <>
      <Card>
        <CardContent>
          {/* Header */}
          <Box mb={3}>
            <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
              <Typography variant="h4" sx={{ fontWeight: 700, flex: 1 }}>
                {meeting.subject}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                {meeting.hasRecording && (
                  <Chip
                    icon={<VideocamIcon />}
                    label="Recording"
                    size="small"
                    color="info"
                    variant="outlined"
                  />
                )}
                <StatusChip status={meeting.summaryStatus} size="small" />
              </Stack>
            </Box>
            <Typography variant="body2" color="textSecondary">
              {formatDateTime(meeting.startDateTime)} • {formatDuration(duration)}
            </Typography>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Meeting Info */}
          <Box mb={3}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Meeting Details
            </Typography>

            <Stack spacing={2}>
              <Box display="flex" alignItems="center" gap={2}>
                <AccessTimeIcon color="primary" />
                <Box flex={1}>
                  <Typography variant="caption" color="textSecondary">
                    Duration
                  </Typography>
                  <Typography variant="body2">
                    {formatDuration(duration)} ({meeting.startDateTime} to {meeting.endDateTime})
                  </Typography>
                </Box>
              </Box>

              {meeting.joinUrl && (
                <Box display="flex" alignItems="center" gap={2}>
                  <LinkIcon color="primary" />
                  <Box flex={1}>
                    <Typography variant="caption" color="textSecondary">
                      Join URL
                    </Typography>
                    <Button
                      size="small"
                      onClick={() => setJoinUrlOpen(true)}
                      sx={{ display: 'block' }}
                    >
                      View Meeting Link
                    </Button>
                  </Box>
                </Box>
              )}
            </Stack>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Organizer */}
          <Box mb={3}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Organizer
            </Typography>
            <Box display="flex" alignItems="center" gap={2}>
              <Avatar sx={{ backgroundColor: '#0078D4' }}>
                {getInitials(meeting.organizer.name)}
              </Avatar>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {meeting.organizer.name}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {meeting.organizer.email}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Participants */}
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Participants ({meeting.participants.length})
            </Typography>
            <List dense>
              {meeting.participants.map((participant) => (
                <ListItem key={participant.email}>
                  <ListItemIcon>
                    <Avatar
                      sx={{
                        width: 32,
                        height: 32,
                        backgroundColor: '#6264A7',
                        fontSize: '0.75rem',
                      }}
                    >
                      {getInitials(participant.name)}
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={participant.name}
                    secondary={participant.email}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                  {participant.role && (
                    <Chip label={participant.role} size="small" variant="outlined" />
                  )}
                </ListItem>
              ))}
            </List>
          </Box>
        </CardContent>

        <CardActions sx={{ flexDirection: 'column', gap: 1, padding: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} width="100%">
            {meeting.hasRecording && onViewRecording && (
              <Button
                variant="contained"
                fullWidth
                onClick={onViewRecording}
                startIcon={<VideocamIcon />}
                sx={{
                  bgcolor: '#6264A7',
                  '&:hover': { bgcolor: '#5558A0' },
                }}
              >
                View Recording
              </Button>
            )}
            <Button
              variant="contained"
              color="primary"
              fullWidth
              onClick={onViewTranscript}
              disabled={meeting.transcriptStatus === 'pending'}
            >
              View Transcript
            </Button>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              onClick={onViewSummary}
              disabled={meeting.summaryStatus === 'pending'}
            >
              View Summary
            </Button>
          </Stack>

          {onFetchTranscript && (
            <Button
              variant="outlined"
              color="primary"
              fullWidth
              onClick={onFetchTranscript}
              disabled={meeting.transcriptStatus === 'pending' || meeting.transcriptStatus === 'processing' || isTranscribing}
            >
              {meeting.transcriptStatus === 'completed' || meeting.transcriptStatus === 'fetched'
                ? 'Re-fetch Transcript'
                : 'Fetch Transcript'}
            </Button>
          )}

          {/* Whisper transcription button */}
          {showWhisperButton && onSmartFetch && (
            <Button
              variant="outlined"
              fullWidth
              onClick={onSmartFetch}
              disabled={isTranscribing}
              startIcon={
                isTranscribing ? (
                  <CircularProgress size={16} />
                ) : (
                  <SmartToyIcon />
                )
              }
              sx={{
                borderColor: '#6264A7',
                color: '#6264A7',
                '&:hover': {
                  borderColor: '#5558A0',
                  backgroundColor: 'rgba(98, 100, 167, 0.04)',
                },
              }}
            >
              {isTranscribing
                ? 'Transcribing...'
                : 'Smart Transcribe (AI)'}
            </Button>
          )}

          {/* Send Bot to record meeting */}
          {meeting.joinUrl && onSendBot && (
            <Button
              variant="outlined"
              fullWidth
              onClick={onSendBot}
              disabled={isBotJoining}
              startIcon={
                isBotJoining ? (
                  <CircularProgress size={16} />
                ) : (
                  <SmartToyIcon />
                )
              }
              sx={{
                borderColor: '#0078D4',
                color: '#0078D4',
                '&:hover': {
                  borderColor: '#106EBE',
                  backgroundColor: 'rgba(0, 120, 212, 0.04)',
                },
              }}
            >
              {isBotJoining ? 'Sending Bot...' : 'Send Bot to Record'}
            </Button>
          )}

          {canGenerateSummary && onGenerateSummary && (
            <Button
              variant="outlined"
              color="primary"
              fullWidth
              onClick={onGenerateSummary}
            >
              Generate Summary
            </Button>
          )}
        </CardActions>
      </Card>

      {/* Join URL Dialog */}
      <Dialog open={joinUrlOpen} onClose={() => setJoinUrlOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Meeting Join URL</DialogTitle>
        <DialogContent>
          <Typography
            variant="body2"
            sx={{
              padding: 2,
              backgroundColor: '#F5F5F5',
              borderRadius: 1,
              wordBreak: 'break-all',
              marginTop: 1,
            }}
          >
            {meeting.joinUrl}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              navigator.clipboard.writeText(meeting.joinUrl || '');
              setJoinUrlOpen(false);
            }}
          >
            Copy Link
          </Button>
          <Button onClick={() => setJoinUrlOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
