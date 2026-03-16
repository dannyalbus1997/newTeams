'use client';

import React, { useEffect, useState } from 'react';
import { Box, Stack, Typography, Tabs, Tab, CircularProgress } from '@mui/material';
import { useRouter, useParams } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import MeetingDetail from '@/components/meetings/MeetingDetail';
import TranscriptViewer from '@/components/transcripts/TranscriptViewer';
import TranscriptUpload from '@/components/transcripts/TranscriptUpload';
import SummaryView from '@/components/summaries/SummaryView';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorAlert from '@/components/common/ErrorAlert';
import { meetingsService } from '@/services/meetings.service';
import { transcriptsService } from '@/services/transcripts.service';
import { summariesService } from '@/services/summaries.service';
import { Meeting, Transcript, Summary, ActionItem } from '@/types';
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
  const meetingId = params.id as string;
  const router = useRouter();
  const [tabValue, setTabValue] = useState(0);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isLoadingMeeting, setIsLoadingMeeting] = useState(true);
  const [isLoadingTranscript, setIsLoadingTranscript] = useState(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [isUploadingTranscript, setIsUploadingTranscript] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  useEffect(() => {
    loadMeeting();
  }, [meetingId]);

  const loadMeeting = async () => {
    setIsLoadingMeeting(true);
    try {
      const response = await meetingsService.getMeetingById(meetingId);
      if (response.success && response.data) {
        setMeeting(response.data);
      }
    } catch (error) {
      console.error('Failed to load meeting:', error);
    } finally {
      setIsLoadingMeeting(false);
    }
  };

  const loadTranscript = async () => {
    setIsLoadingTranscript(true);
    setTranscriptError(null);
    try {
      const response = await transcriptsService.getTranscript(meetingId);
      if (response.success && response.data) {
        setTranscript(response.data);
      } else {
        setTranscriptError(response.error || 'Failed to load transcript');
      }
    } catch (error) {
      setTranscriptError(
        error instanceof Error ? error.message : 'Failed to load transcript'
      );
    } finally {
      setIsLoadingTranscript(false);
    }
  };

  const loadSummary = async () => {
    setIsLoadingSummary(true);
    setSummaryError(null);
    try {
      const response = await summariesService.getSummary(meetingId);
      if (response.success && response.data) {
        setSummary(response.data);
      } else {
        setSummaryError(response.error || 'Failed to load summary');
      }
    } catch (error) {
      setSummaryError(
        error instanceof Error ? error.message : 'Failed to load summary'
      );
    } finally {
      setIsLoadingSummary(false);
    }
  };

  const handleFetchTranscript = async () => {
    setIsLoadingTranscript(true);
    setTranscriptError(null);
    try {
      const response = await transcriptsService.fetchTranscript(meetingId);
      if (response.success && response.data) {
        setTranscript(response.data);
      } else {
        setTranscriptError(response.error || 'Failed to fetch transcript');
      }
    } catch (error) {
      setTranscriptError(
        error instanceof Error ? error.message : 'Failed to fetch transcript'
      );
    } finally {
      setIsLoadingTranscript(false);
    }
  };

  const handleUploadTranscript = async (file: File) => {
    setIsUploadingTranscript(true);
    setTranscriptError(null);
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
        await loadTranscript();
      } else {
        setTranscriptError(response.error || 'Failed to upload transcript');
      }
    } catch (error) {
      setTranscriptError(
        error instanceof Error ? error.message : 'Failed to upload transcript'
      );
    } finally {
      setIsUploadingTranscript(false);
      setUploadProgress(0);
    }
  };

  const handleGenerateSummary = async () => {
    setIsGeneratingSummary(true);
    setSummaryError(null);
    try {
      const response = await summariesService.generateSummary(meetingId);
      if (response.success && response.data) {
        setSummary(response.data);
      } else {
        setSummaryError(response.error || 'Failed to generate summary');
      }
    } catch (error) {
      setSummaryError(
        error instanceof Error ? error.message : 'Failed to generate summary'
      );
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleRegenerateSummary = async () => {
    setIsGeneratingSummary(true);
    setSummaryError(null);
    try {
      const response = await summariesService.regenerateSummary(meetingId);
      if (response.success && response.data) {
        setSummary(response.data);
      } else {
        setSummaryError(response.error || 'Failed to regenerate summary');
      }
    } catch (error) {
      setSummaryError(
        error instanceof Error ? error.message : 'Failed to regenerate summary'
      );
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleUpdateActionItem = async (
    itemIndex: number,
    data: Partial<ActionItem>
  ) => {
    try {
      const response = await summariesService.updateActionItem(
        meetingId,
        itemIndex,
        data
      );
      if (response.success && response.data) {
        setSummary(response.data);
      }
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
            sx={{ fontWeight: 700, mb: 1 }}
            onClick={() => router.push(ROUTES.MEETINGS)}
            sx={{ cursor: 'pointer', color: 'primary.main', '&:hover': { textDecoration: 'underline' } }}
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
          {transcriptError && (
            <ErrorAlert error={transcriptError} onDismiss={() => setTranscriptError(null)} showDismiss />
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
              error={transcriptError}
            />
          )}

          {transcript && (
            <TranscriptViewer transcript={transcript} isLoading={isLoadingTranscript} />
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          {summaryError && (
            <ErrorAlert error={summaryError} onDismiss={() => setSummaryError(null)} showDismiss />
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
              isGenerating={isGeneratingSummary}
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
