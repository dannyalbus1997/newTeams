'use client';

import React, { useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import MeetingFilters from '@/components/meetings/MeetingFilters';
import MeetingList from '@/components/meetings/MeetingList';
import { useGetMeetingsQuery, useSyncMeetingsMutation } from '@/store/api/meetingsApi';
import { ROUTES, PAGINATION } from '@/lib/constants';
import ErrorAlert from '@/components/common/ErrorAlert';
import { GetMeetingsParams } from '@/types';

export default function MeetingsPage() {
  const router = useRouter();
  const [page, setPage] = useState(PAGINATION.DEFAULT_PAGE);
  const [filters, setFilters] = useState<GetMeetingsParams>({});

  const { data: meetingsData, isLoading, error } = useGetMeetingsQuery({
    page,
    limit: PAGINATION.DEFAULT_LIMIT,
    search: filters.search,
    startDate: filters.startDate,
    endDate: filters.endDate,
    status: filters.status,
  });
  const [syncMeetings, { isLoading: isSyncing }] = useSyncMeetingsMutation();

  const meetings = meetingsData?.data || [];
  const pagination = meetingsData
    ? { page: meetingsData.page, totalPages: meetingsData.totalPages }
    : { page: 1, totalPages: 0 };

  const handleFilter = (newFilters: GetMeetingsParams) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handleSync = async () => {
    try {
      await syncMeetings().unwrap();
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleViewDetails = (id: string) => {
    if (!id) return;
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

        {error && <ErrorAlert error="Failed to load meetings" />}

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
