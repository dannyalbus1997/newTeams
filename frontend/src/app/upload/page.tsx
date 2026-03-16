'use client';

import React, { useState } from 'react';
import { Box, Stack, Typography, FormControl, InputLabel, Select, MenuItem, Card, CardContent } from '@mui/material';
import MainLayout from '@/components/layout/MainLayout';
import TranscriptUpload from '@/components/transcripts/TranscriptUpload';
import ErrorAlert from '@/components/common/ErrorAlert';
import { transcriptsService } from '@/services/transcripts.service';
import { ROUTES } from '@/lib/constants';
import { useRouter } from 'next/navigation';

export default function UploadPage() {
  const router = useRouter();
  const [selectedMeetingId, setSelectedMeetingId] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleUpload = async (file: File) => {
    if (!selectedMeetingId) {
      setUploadError('Please select a meeting first');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(0);
    setUploadSuccess(false);

    try {
      const response = await transcriptsService.uploadTranscript(
        selectedMeetingId,
        file,
        (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(progress);
          }
        }
      );

      if (response.success) {
        setUploadSuccess(true);
        setUploadProgress(100);
        setSelectedMeetingId('');
        // Redirect after 2 seconds
        setTimeout(() => {
          router.push(ROUTES.MEETING_DETAIL(selectedMeetingId));
        }, 2000);
      } else {
        setUploadError(response.error || 'Failed to upload transcript');
      }
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : 'Failed to upload transcript'
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <MainLayout>
      <Stack spacing={3}>
        {/* Header */}
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Upload Transcript
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Upload a transcript file for a meeting to enable AI-powered summaries
          </Typography>
        </Box>

        {uploadError && (
          <ErrorAlert error={uploadError} onDismiss={() => setUploadError(null)} showDismiss />
        )}

        {/* Meeting Selector */}
        <Card>
          <CardContent>
            <FormControl fullWidth>
              <InputLabel>Select a meeting</InputLabel>
              <Select
                value={selectedMeetingId}
                label="Select a meeting"
                onChange={(e) => setSelectedMeetingId(e.target.value)}
              >
                <MenuItem value="">Choose a meeting...</MenuItem>
                <MenuItem value="meeting-1">Sample Meeting 1</MenuItem>
                <MenuItem value="meeting-2">Sample Meeting 2</MenuItem>
              </Select>
            </FormControl>
            <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1 }}>
              Don't see your meeting? Try syncing your meetings from the dashboard first.
            </Typography>
          </CardContent>
        </Card>

        {/* Upload Component */}
        <TranscriptUpload
          onUpload={handleUpload}
          isLoading={isUploading}
          uploadProgress={uploadProgress}
          error={uploadError}
          success={uploadSuccess}
        />
      </Stack>
    </MainLayout>
  );
}
