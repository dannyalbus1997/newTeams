'use client';

import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  Avatar,
  AvatarGroup,
  Button,
  Stack,
} from '@mui/material';
import { Meeting } from '@/types';
import {
  formatDateTime,
  formatDuration,
  calculateDuration,
  getInitials,
} from '@/lib/utils';
import StatusChip from '@/components/common/StatusChip';
import VideocamIcon from '@mui/icons-material/Videocam';

interface MeetingCardProps {
  meeting: Meeting;
  onViewDetails: () => void;
}

export default function MeetingCard({
  meeting,
  onViewDetails,
}: MeetingCardProps) {
  const duration = calculateDuration(
    meeting.startDateTime,
    meeting.endDateTime
  );

  // Limit participants shown to 3
  const displayParticipants = meeting.participants.slice(0, 3);
  const moreParticipants =
    meeting.participants.length > 3
      ? meeting.participants.length - 3
      : 0;

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          boxShadow: 3,
          transform: 'translateY(-2px)',
        },
      }}
      onClick={onViewDetails}
    >
      <CardContent sx={{ flex: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
          <Typography variant="h6" component="h3" sx={{ fontWeight: 600, flex: 1 }}>
            {meeting.subject}
          </Typography>
          {meeting.joinUrl && (
            <VideocamIcon
              sx={{ color: '#107C10', fontSize: '1.25rem', marginLeft: 1 }}
            />
          )}
        </Box>

        <Typography variant="caption" color="textSecondary" display="block" mb={2}>
          {formatDateTime(meeting.startDateTime)} • {formatDuration(duration)}
        </Typography>

        <Typography variant="body2" color="textSecondary" gutterBottom>
          Organizer: {meeting.organizer.name}
        </Typography>

        <Box display="flex" alignItems="center" gap={1} marginY={2}>
          <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 32, height: 32 } }}>
            {displayParticipants.map((participant) => (
              <Avatar
                key={participant.email}
                sx={{
                  backgroundColor: '#6264A7',
                  fontSize: '0.75rem',
                  width: 32,
                  height: 32,
                }}
              >
                {getInitials(participant.name)}
              </Avatar>
            ))}
            {moreParticipants > 0 && (
              <Avatar
                sx={{
                  backgroundColor: '#605E5C',
                  fontSize: '0.75rem',
                  width: 32,
                  height: 32,
                }}
              >
                +{moreParticipants}
              </Avatar>
            )}
          </AvatarGroup>
          <Typography variant="caption" color="textSecondary">
            {meeting.participants.length} participant{meeting.participants.length !== 1 ? 's' : ''}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
          <StatusChip status={meeting.transcriptStatus} variant="outlined" />
          <StatusChip status={meeting.summaryStatus} variant="outlined" />
        </Stack>
      </CardContent>

      <CardActions>
        <Button size="small" color="primary">
          View Details
        </Button>
      </CardActions>
    </Card>
  );
}
