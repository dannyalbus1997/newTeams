'use client';

import React from 'react';
import {
  Container,
  Typography,
  Box,
  Divider,
  Paper,
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import MainLayout from '@/components/layout/MainLayout';
import JoinMeetingPanel from '@/components/meeting-bot/JoinMeetingPanel';
import ActiveSessionsList from '@/components/meeting-bot/ActiveSessionsList';
import SessionHistory from '@/components/meeting-bot/SessionHistory';

export default function MeetingBotPage() {
  return (
    <MainLayout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Page Header */}
        <Box display="flex" alignItems="center" gap={2} mb={4}>
          <SmartToyIcon sx={{ fontSize: 36, color: '#0078D4' }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Meeting Bot
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Send an AI bot to join your Teams meetings. It records, transcribes with Whisper, and summarizes with GPT.
            </Typography>
          </Box>
        </Box>

        {/* Join Panel */}
        <Box mb={4}>
          <JoinMeetingPanel />
        </Box>

        {/* Active Sessions */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <ActiveSessionsList />
        </Paper>

        <Divider sx={{ my: 3 }} />

        {/* Session History */}
        <Paper sx={{ p: 3 }}>
          <SessionHistory />
        </Paper>
      </Container>
    </MainLayout>
  );
}
