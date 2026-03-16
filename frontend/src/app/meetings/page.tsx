'use client';

import React, { useEffect, useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import MeetingFilters from '@/components/meetings/MeetingFilters';
import MeetingList from '@/components/meetings/MeetingList';
import { useMeetingsStore } from '@/hooks/useMeetingsStore';
import { ROUTES, PAGINATION } from '@/lib/constants';
import ErrorAlert from '@/components/common/ErrorAlert';
import { GetMeetingsParams } from '@/types';

export default function MeetingsPage() {
  const router = useRouter();
  const {
    meetings,
    isLoading,
    error,
    pagination,
    clearError,
    fetchMeetings,
    syncMeetings,
  } = useMeetingsStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const [filters, setFilters] = useState<GetMeetingsParams>({});

  useEffect(() => {
    fetchMeetings(PAGINATION.DEFAULT_PAGE, PAGINATION.DEFAULT_LIMIT);
  }, []);

  const handleFilter = (newFilters: GetMeetingsParams) => {
    setFilters(newFilters);
    fetchMeetings(1, PAGINATION.DEFAULT_LIMIT, newFilters.search);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    await syncMeetings();
    setIsSyncing(false);
  };

  const handlePageChange = (page: number) => {
    fetchMeetings(page, PAGINATION.DEFAULT_LIMIT, filters.search);
  };

  const handleViewDetails = (id: string) => {
    router.push(ROUTES.MEETING_DETAIL(id));
  };

  return (
    <MainLayout>
      <Stack spacing={3}>
        {/* Header */}
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Meetings
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Manage and view summaries for all your Teams meetings
          </Typography>
        </Box>

        {error && <ErrorAlert error={error} onDismiss={clearError} showDismiss />}

        {/* Filters */}
        <MeetingFilters onFilter={handleFilter} isLoading={isLoading} />

        {/* Meeting List */}
        <MeetingList
          meetings={meetings}
          isLoading={isLoading}
          onViewDetails={handleViewDetails}
          onSync={handleSync}
          isSyncing={isSyncing}
          pagination={{
            page: pagination.page,
            totalPages: pagination.totalPages,
            onPageChange: handlePageChange,
          }}
        />
      </Stack>
    </MainLayout>
  );
}
