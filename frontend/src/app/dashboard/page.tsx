'use client';

import React, { useEffect, useState } from 'react';
import {
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  Button,
  CircularProgress,
  Stack,
} from '@mui/material';
import MainLayout from '@/components/layout/MainLayout';
import { useMeetingsStore } from '@/hooks/useMeetingsStore';
import { useRouter } from 'next/navigation';
import { ROUTES, PAGINATION } from '@/lib/constants';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorAlert from '@/components/common/ErrorAlert';
import EventIcon from '@mui/icons-material/Event';
import SummarizeIcon from '@mui/icons-material/Summarize';
import AssignmentIcon from '@mui/icons-material/Assignment';
import RefreshIcon from '@mui/icons-material/Refresh';
import { formatDateTime, formatDuration, calculateDuration } from '@/lib/utils';

export default function DashboardPage() {
  const router = useRouter();
  const {
    meetings,
    isLoading,
    error,
    clearError,
    fetchMeetings,
    syncMeetings,
  } = useMeetingsStore();
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    fetchMeetings(1, 5);
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    await syncMeetings();
    setIsSyncing(false);
  };

  const handleViewMeeting = (id: string) => {
    router.push(ROUTES.MEETING_DETAIL(id));
  };

  const totalMeetings = meetings.length;
  const summariesGenerated = meetings.filter(
    (m) => m.summaryStatus === 'completed'
  ).length;
  const pendingActionItems = 0; // Would come from summaries

  const recentMeetings = meetings.slice(0, 5);

  return (
    <MainLayout>
      <Stack spacing={3}>
        {/* Header */}
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Dashboard
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Welcome back! Here's an overview of your Teams meetings and summaries.
          </Typography>
        </Box>

        {error && <ErrorAlert error={error} onDismiss={clearError} showDismiss />}

        {/* Stats Cards */}
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography color="textSecondary" variant="caption">
                      Total Meetings
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {totalMeetings}
                    </Typography>
                  </Box>
                  <EventIcon sx={{ fontSize: 40, color: 'primary.main', opacity: 0.5 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography color="textSecondary" variant="caption">
                      Summaries Generated
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {summariesGenerated}
                    </Typography>
                  </Box>
                  <SummarizeIcon sx={{ fontSize: 40, color: 'primary.main', opacity: 0.5 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography color="textSecondary" variant="caption">
                      Action Items Pending
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {pendingActionItems}
                    </Typography>
                  </Box>
                  <AssignmentIcon sx={{ fontSize: 40, color: 'primary.main', opacity: 0.5 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Quick Actions */}
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Quick Actions
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSync}
                disabled={isSyncing}
                startIcon={isSyncing ? <CircularProgress size={20} /> : <RefreshIcon />}
              >
                {isSyncing ? 'Syncing...' : 'Sync Meetings'}
              </Button>
              <Button
                variant="outlined"
                color="primary"
                onClick={() => router.push(ROUTES.UPLOAD)}
              >
                Upload Transcript
              </Button>
              <Button
                variant="outlined"
                color="primary"
                onClick={() => router.push(ROUTES.MEETINGS)}
              >
                View All Meetings
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {/* Recent Meetings */}
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Recent Meetings
              </Typography>
              <Button size="small" onClick={() => router.push(ROUTES.MEETINGS)}>
                View All
              </Button>
            </Box>

            {isLoading ? (
              <Box display="flex" justifyContent="center" py={3}>
                <CircularProgress />
              </Box>
            ) : recentMeetings.length === 0 ? (
              <Typography variant="body2" color="textSecondary" py={3}>
                No meetings yet. Sync your Teams calendar to get started.
              </Typography>
            ) : (
              <Stack spacing={2}>
                {recentMeetings.map((meeting) => {
                  const duration = calculateDuration(
                    meeting.startDateTime,
                    meeting.endDateTime
                  );
                  return (
                    <Card
                      key={meeting.id}
                      variant="outlined"
                      sx={{
                        cursor: 'pointer',
                        '&:hover': { boxShadow: 1 },
                      }}
                      onClick={() => handleViewMeeting(meeting.id)}
                    >
                      <CardContent sx={{ pb: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {meeting.subject}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {formatDateTime(meeting.startDateTime)} • {formatDuration(duration)}
                        </Typography>
                        <Box mt={1}>
                          <Typography variant="caption" color="textSecondary">
                            Organizer: {meeting.organizer.name} • {meeting.participants.length}{' '}
                            participants
                          </Typography>
                        </Box>
                      </CardContent>
                      <CardActions sx={{ pt: 0 }}>
                        <Button size="small" color="primary">
                          View Details
                        </Button>
                      </CardActions>
                    </Card>
                  );
                })}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Stack>
    </MainLayout>
  );
}
