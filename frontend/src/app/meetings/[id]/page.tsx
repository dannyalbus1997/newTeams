'use client';

import React, { useState } from 'react';
import { Box, Stack, Typography, Tabs, Tab, CircularProgress } from '@mui/material';
import { useRouter, useParams } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import MeetingDetail from '@/components/meetings/MeetingDetail';
import TranscriptViewer from '@/components/transcripts/TranscriptViewer';
import TranscriptUpload from '@/components/transcripts/TranscriptUpload';
import SummaryView from '@/components/summaries/SummaryView';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorAlert from '@/components/common/ErrorAlert';
import { useGetMeetingByIdQuery } from '@/store/api/meetingsApi';
import {
  useGetTranscriptQuery,
  useFetchTranscriptFromMeetingMutation,
} from '@/store/api/transcriptsApi';
import {
  useGetSummaryQuery,
  useGenerateSummaryMutation,
  useRegenerateSummaryMutation,
  useUpdateActionItemMutation,
} from '@/store/api/summariesApi';
import { transcriptsService } from '@/services/transcripts.service';
import { summariesService } from '@/services/summaries.service';
import { ActionItem } from '@/types';
import { ROUTES } from '@/lib/constants';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

export default function MeetingDetailPage() {
  const params = useParams();
  const meetingId = (params?.id as string) ?? '';
  const router = useRouter();
  const [tabValue, setTabValue] = useState(0);

  const isInvalidId = !meetingId || meetingId === 'undefined';
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploadingTranscript, setIsUploadingTranscript] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // RTK Query hooks (skip request when id is invalid)
  const {
    data: meeting,
    isLoading: isLoadingMeeting,
  } = useGetMeetingByIdQuery(meetingId, { skip: isInvalidId });

  const {
    data: transcript,
    isLoading: isLoadingTranscript,
    error: transcriptError,
    refetch: refetchTranscript,
  } = useGetTranscriptQuery(meetingId, { skip: !meeting });

  const {
    data: summary,
    isLoading: isLoadingSummary,
    error: summaryError,
  } = useGetSummaryQuery(meetingId, { skip: !meeting });

  const [fetchTranscriptFromMeeting, { isLoading: isFetchingTranscript }] =
    useFetchTranscriptFromMeetingMutation();
  const [generateSummary, { isLoading: isGeneratingSummary }] =
    useGenerateSummaryMutation();
  const [regenerateSummary, { isLoading: isRegenerating }] =
    useRegenerateSummaryMutation();
  const [updateActionItem] = useUpdateActionItemMutation();

  const handleFetchTranscript = async () => {
    try {
      await fetchTranscriptFromMeeting(meetingId).unwrap();
    } catch (error) {
      console.error('Failed to fetch transcript:', error);
    }
  };

  const handleUploadTranscript = async (file: File) => {
    setIsUploadingTranscript(true);
    setUploadError(null);
    setUploadProgress(0);
    try {
      const response = await transcriptsService.uploadTranscript(
        meetingId,
        file,
        (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(progress);
          }
        }
      );
      if (response.success) {
        setUploadProgress(100);
        refetchTranscript();
      } else {
        setUploadError(response.error || 'Failed to upload transcript');
      }
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : 'Failed to upload transcript'
      );
    } finally {
      setIsUploadingTranscript(false);
      setUploadProgress(0);
    }
  };

  const handleGenerateSummary = async () => {
    try {
      await generateSummary(meetingId).unwrap();
    } catch (error) {
      console.error('Failed to generate summary:', error);
    }
  };

  const handleRegenerateSummary = async () => {
    try {
      await regenerateSummary({ meetingId }).unwrap();
    } catch (error) {
      console.error('Failed to regenerate summary:', error);
    }
  };

  const handleUpdateActionItem = async (
    itemIndex: number,
    data: Partial<ActionItem>
  ) => {
    try {
      await updateActionItem({ meetingId, itemIndex, data }).unwrap();
    } catch (error) {
      console.error('Failed to update action item:', error);
    }
  };

  const handleExportPdf = async () => {
    try {
      const blob = await summariesService.exportPdf(meetingId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `summary-${meetingId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export PDF:', error);
    }
  };

  if (isInvalidId) {
    return (
      <MainLayout>
        <ErrorAlert error="Invalid meeting link. Please open a meeting from the list." />
      </MainLayout>
    );
  }

  if (isLoadingMeeting) {
    return <LoadingSpinner />;
  }

  if (!meeting) {
    return (
      <MainLayout>
        <ErrorAlert error="Meeting not found" />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Stack spacing={3}>
        {/* Header */}
        <Box>
          <Typography
            variant="h4"
            sx={{ cursor: 'pointer', color: 'primary.main', '&:hover': { textDecoration: 'underline' }, fontWeight: 700, mb: 1 }}
            onClick={() => router.push(ROUTES.MEETINGS)}
          >
            ← Meetings
          </Typography>
        </Box>

        {/* Meeting Details */}
        <MeetingDetail
          meeting={meeting}
          onViewTranscript={() => setTabValue(1)}
          onViewSummary={() => setTabValue(2)}
          onFetchTranscript={handleFetchTranscript}
          onGenerateSummary={handleGenerateSummary}
        />

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
            <Tab label="Details" id="tab-0" aria-controls="tabpanel-0" />
            <Tab label="Transcript" id="tab-1" aria-controls="tabpanel-1" />
            <Tab label="Summary" id="tab-2" aria-controls="tabpanel-2" />
          </Tabs>
        </Box>

        {/* Tab Panels */}
        <TabPanel value={tabValue} index={1}>
          {(uploadError || transcriptError) && (
            <ErrorAlert
              error={uploadError || 'Failed to load transcript'}
              onDismiss={() => setUploadError(null)}
              showDismiss
            />
          )}

          {!transcript && !isLoadingTranscript && meeting.transcriptStatus === 'pending' && (
            <Box textAlign="center" py={4}>
              <CircularProgress />
              <Typography color="textSecondary" mt={2}>
                Fetching transcript...
              </Typography>
            </Box>
          )}

          {!transcript && !isLoadingTranscript && meeting.transcriptStatus === 'unavailable' && (
            <TranscriptUpload
              onUpload={handleUploadTranscript}
              isLoading={isUploadingTranscript}
              uploadProgress={uploadProgress}
              error={uploadError}
            />
          )}

          {transcript && (
            <TranscriptViewer transcript={transcript} isLoading={isLoadingTranscript} />
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          {summaryError && (
            <ErrorAlert error="Failed to load summary" />
          )}

          {!summary && !isLoadingSummary && meeting.summaryStatus === 'not_generated' && (
            <Box textAlign="center" py={4}>
              <Typography color="textSecondary" mb={2}>
                No summary yet. Generate one now to get started.
              </Typography>
            </Box>
          )}

          {!summary && !isLoadingSummary && meeting.summaryStatus === 'pending' && (
            <Box textAlign="center" py={4}>
              <CircularProgress />
              <Typography color="textSecondary" mt={2}>
                Generating summary...
              </Typography>
            </Box>
          )}

          {summary && (
            <SummaryView
              summary={summary}
              isLoading={isLoadingSummary}
              isGenerating={isGeneratingSummary || isRegenerating}
              onRegenerate={handleRegenerateSummary}
              onUpdateActionItem={handleUpdateActionItem}
              onExportPdf={handleExportPdf}
            />
          )}
        </TabPanel>
      </Stack>
    </MainLayout>
  );
}
