'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Pagination,
  Box,
  Button,
  CircularProgress,
} from '@mui/material';
import { Meeting } from '@/types';
import { formatDateTime, formatDuration, calculateDuration } from '@/lib/utils';
import StatusChip from '@/components/common/StatusChip';
import EmptyState from '@/components/common/EmptyState';
import EventIcon from '@mui/icons-material/Event';
import RefreshIcon from '@mui/icons-material/Refresh';

interface MeetingListProps {
  meetings: Meeting[];
  isLoading: boolean;
  onViewDetails: (id: string) => void;
  onSync?: () => void;
  isSyncing?: boolean;
  pagination?: {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
}

export default function MeetingList({
  meetings,
  isLoading,
  onViewDetails,
  onSync,
  isSyncing = false,
  pagination,
}: MeetingListProps) {
  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (meetings.length === 0) {
    return (
      <EmptyState
        icon={EventIcon}
        title="No meetings found"
        description="Get started by syncing your Teams meetings"
        action={
          onSync
            ? {
                label: 'Sync Meetings',
                onClick: onSync,
              }
            : undefined
        }
      />
    );
  }

  return (
    <>
      <Box display="flex" justifyContent="flex-end" mb={2}>
        {onSync && (
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={onSync}
            disabled={isSyncing}
          >
            {isSyncing ? 'Syncing...' : 'Sync Meetings'}
          </Button>
        )}
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#F5F5F5' }}>
              <TableCell sx={{ fontWeight: 600 }}>Subject</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Date & Time</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Organizer</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Participants</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Transcript</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Summary</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {meetings.map((meeting) => {
              const duration = calculateDuration(
                meeting.startDateTime,
                meeting.endDateTime
              );

              return (
                <TableRow
                  key={meeting.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => onViewDetails(meeting.id)}
                >
                  <TableCell>
                    <span style={{ fontWeight: 600 }}>{meeting.subject}</span>
                    <div style={{ fontSize: '0.75rem', color: '#605E5C' }}>
                      {formatDuration(duration)}
                    </div>
                  </TableCell>
                  <TableCell>{formatDateTime(meeting.startDateTime)}</TableCell>
                  <TableCell>{meeting.organizer.name}</TableCell>
                  <TableCell>{meeting.participants.length}</TableCell>
                  <TableCell>
                    <StatusChip status={meeting.transcriptStatus} size="small" />
                  </TableCell>
                  <TableCell>
                    <StatusChip status={meeting.summaryStatus} size="small" />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      color="primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewDetails(meeting.id);
                      }}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {pagination && pagination.totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={3}>
          <Pagination
            count={pagination.totalPages}
            page={pagination.page}
            onChange={(_, page) => pagination.onPageChange(page)}
            color="primary"
          />
        </Box>
      )}
    </>
  );
}
