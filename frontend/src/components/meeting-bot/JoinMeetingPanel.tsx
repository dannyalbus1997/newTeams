'use client';

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Box,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  Collapse,
  IconButton,
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useJoinMeetingMutation } from '@/store/api/meetingBotApi';

interface JoinMeetingPanelProps {
  /** Pre-fill the join URL (e.g. from a meeting detail page) */
  defaultJoinUrl?: string;
  /** Pre-fill the linked meeting ID */
  defaultMeetingId?: string;
  /** Called after the bot successfully starts joining */
  onJoinStarted?: (sessionId: string) => void;
}

export default function JoinMeetingPanel({
  defaultJoinUrl = '',
  defaultMeetingId,
  onJoinStarted,
}: JoinMeetingPanelProps) {
  const [joinUrl, setJoinUrl] = useState(defaultJoinUrl);
  const [botName, setBotName] = useState('Meeting Assistant Bot');
  const [autoTranscribe, setAutoTranscribe] = useState(true);
  const [autoSummarize, setAutoSummarize] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [joinMeeting, { isLoading }] = useJoinMeetingMutation();

  const isValidTeamsUrl = (url: string) => {
    return (
      url.includes('teams.microsoft.com') ||
      url.includes('teams.live.com') ||
      url.startsWith('https://')
    );
  };

  const handleJoin = async () => {
    setError(null);
    setSuccess(null);

    if (!joinUrl.trim()) {
      setError('Please enter a Teams meeting join URL.');
      return;
    }

    if (!isValidTeamsUrl(joinUrl.trim())) {
      setError('Please enter a valid Microsoft Teams meeting URL.');
      return;
    }

    try {
      const result = await joinMeeting({
        joinUrl: joinUrl.trim(),
        botDisplayName: botName || 'Meeting Assistant Bot',
        meetingId: defaultMeetingId,
        autoTranscribe,
        autoSummarize,
      }).unwrap();

      setSuccess(result.message);
      onJoinStarted?.(result.sessionId);

      // Don't clear URL if it was pre-filled
      if (!defaultJoinUrl) {
        setJoinUrl('');
      }
    } catch (err: any) {
      const errorMsg =
        err?.data?.message ||
        err?.data?.error ||
        'Failed to send bot to meeting. Please try again.';
      setError(errorMsg);
    }
  };

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1.5} mb={2}>
          <SmartToyIcon sx={{ color: '#0078D4', fontSize: 28 }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Send Bot to Meeting
            </Typography>
            <Typography variant="caption" color="textSecondary">
              The bot joins your Teams meeting, records audio, then auto-transcribes and summarizes.
            </Typography>
          </Box>
        </Box>

        <TextField
          fullWidth
          label="Teams Meeting Join URL"
          placeholder="https://teams.microsoft.com/l/meetup-join/..."
          value={joinUrl}
          onChange={(e) => setJoinUrl(e.target.value)}
          variant="outlined"
          size="small"
          sx={{ mb: 2 }}
          disabled={isLoading}
        />

        {/* Advanced options toggle */}
        <Box display="flex" alignItems="center" mb={1}>
          <IconButton
            size="small"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
          <Typography
            variant="body2"
            color="textSecondary"
            sx={{ cursor: 'pointer' }}
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            Advanced Options
          </Typography>
        </Box>

        <Collapse in={showAdvanced}>
          <Box sx={{ pl: 1, mb: 2 }}>
            <TextField
              fullWidth
              label="Bot Display Name"
              value={botName}
              onChange={(e) => setBotName(e.target.value)}
              variant="outlined"
              size="small"
              sx={{ mb: 1.5 }}
              disabled={isLoading}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={autoTranscribe}
                  onChange={(e) => setAutoTranscribe(e.target.checked)}
                  size="small"
                  disabled={isLoading}
                />
              }
              label={
                <Typography variant="body2">
                  Auto-transcribe with Whisper after meeting
                </Typography>
              }
            />
            <FormControlLabel
              control={
                <Switch
                  checked={autoSummarize}
                  onChange={(e) => setAutoSummarize(e.target.checked)}
                  size="small"
                  disabled={isLoading || !autoTranscribe}
                />
              }
              label={
                <Typography variant="body2">
                  Auto-summarize with GPT-4o after transcription
                </Typography>
              }
            />
          </Box>
        </Collapse>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        <Button
          variant="contained"
          fullWidth
          onClick={handleJoin}
          disabled={isLoading || !joinUrl.trim()}
          startIcon={
            isLoading ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              <SmartToyIcon />
            )
          }
          sx={{
            backgroundColor: '#0078D4',
            '&:hover': { backgroundColor: '#106EBE' },
            textTransform: 'none',
            fontWeight: 600,
            py: 1.2,
          }}
        >
          {isLoading ? 'Sending Bot...' : 'Join Meeting & Record'}
        </Button>
      </CardContent>
    </Card>
  );
}
