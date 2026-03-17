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

interface MeetingDetailProps {
  meeting: Meeting;
  onViewTranscript: () => void;
  onViewSummary: () => void;
  onFetchTranscript?: () => void;
  onGenerateSummary?: () => void;
}

export default function MeetingDetail({
  meeting,
  onViewTranscript,
  onViewSummary,
  onFetchTranscript,
  onGenerateSummary,
}: MeetingDetailProps) {
  const [joinUrlOpen, setJoinUrlOpen] = useState(false);
  const duration = calculateDuration(
    meeting.startDateTime,
    meeting.endDateTime
  );

  const canGenerateSummary =
    meeting.transcriptStatus === 'completed' &&
    (meeting.summaryStatus === 'not_generated' || meeting.summaryStatus === 'failed');

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
              <StatusChip status={meeting.summaryStatus} size="small" />
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
              disabled={meeting.transcriptStatus === 'pending' || meeting.transcriptStatus === 'processing'}
            >
              {meeting.transcriptStatus === 'completed' || meeting.transcriptStatus === 'fetched'
                ? 'Re-fetch Transcript'
                : 'Fetch Transcript'}
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
