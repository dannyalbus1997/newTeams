'use client';

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Box,
  TextField,
  Typography,
  Paper,
  Stack,
  Button,
  Chip,
  LinearProgress,
} from '@mui/material';
import { Transcript, TranscriptEntry } from '@/types';
import {
  formatTimestamp,
  truncateText,
  copyToClipboard,
  formatNumber,
} from '@/lib/utils';
import SearchIcon from '@mui/icons-material/Search';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';

interface TranscriptViewerProps {
  transcript: Transcript;
  isLoading?: boolean;
}

export default function TranscriptViewer({
  transcript,
  isLoading = false,
}: TranscriptViewerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightIndex, setHighlightIndex] = useState<number | null>(null);

  // Filter entries based on search query
  const filteredEntries = transcript.structuredContent.filter((entry) =>
    entry.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.speaker.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getUniqueSpeakers = (): string[] => {
    return [...new Set(transcript.structuredContent.map((e) => e.speaker))];
  };

  const getSpeakerColor = (speaker: string): string => {
    const speakers = getUniqueSpeakers();
    const colors = [
      '#0078D4',
      '#6264A7',
      '#107C10',
      '#FFB900',
      '#F7630C',
      '#D83B01',
    ];
    const index = speakers.indexOf(speaker);
    return colors[index % colors.length];
  };

  const handleCopyTranscript = async () => {
    const fullText = transcript.structuredContent
      .map((entry) => `${entry.speaker} (${formatTimestamp(entry.timestamp)}): ${entry.text}`)
      .join('\n\n');
    await copyToClipboard(fullText);
  };

  const handleDownloadTranscript = () => {
    const fullText = transcript.structuredContent
      .map((entry) => `${entry.speaker} (${formatTimestamp(entry.timestamp)}): ${entry.text}`)
      .join('\n\n');
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(fullText));
    element.setAttribute('download', 'transcript.txt');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <LinearProgress />
          <Typography sx={{ mt: 2 }} color="textSecondary">
            Loading transcript...
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card sx={{ mb: 2 }}>
        <CardHeader
          title="Transcript"
          subheader={`${formatNumber(transcript.wordCount)} words • ${transcript.language}`}
          action={
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                startIcon={<ContentCopyIcon />}
                onClick={handleCopyTranscript}
              >
                Copy
              </Button>
              <Button
                size="small"
                startIcon={<DownloadIcon />}
                onClick={handleDownloadTranscript}
              >
                Download
              </Button>
            </Stack>
          }
        />
      </Card>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <TextField
            fullWidth
            placeholder="Search transcript..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setHighlightIndex(null);
            }}
            startAdornment={<SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />}
            size="small"
            sx={{ mb: 2 }}
          />

          {searchQuery && (
            <Typography variant="caption" color="textSecondary">
              Found {filteredEntries.length} of {transcript.structuredContent.length} entries
            </Typography>
          )}
        </CardContent>
      </Card>

      <Stack spacing={2}>
        {filteredEntries.map((entry, index) => (
          <Paper
            key={`${entry.timestamp}-${index}`}
            sx={{
              padding: 2,
              borderLeft: `4px solid ${getSpeakerColor(entry.speaker)}`,
              '&:hover': {
                backgroundColor: '#f5f5f5',
              },
            }}
          >
            <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
              <Stack spacing={0.5}>
                <Chip
                  label={entry.speaker}
                  size="small"
                  sx={{
                    backgroundColor: getSpeakerColor(entry.speaker),
                    color: '#fff',
                    fontWeight: 600,
                    width: 'fit-content',
                  }}
                />
                <Typography variant="caption" color="textSecondary">
                  {formatTimestamp(entry.timestamp)}
                </Typography>
              </Stack>
              <Button
                size="small"
                onClick={() => copyToClipboard(entry.text)}
                startIcon={<ContentCopyIcon />}
              >
                Copy
              </Button>
            </Box>
            <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
              {entry.text}
            </Typography>
          </Paper>
        ))}

        {filteredEntries.length === 0 && searchQuery && (
          <Typography variant="body2" color="textSecondary" align="center" py={4}>
            No results found for "{searchQuery}"
          </Typography>
        )}
      </Stack>
    </>
  );
}
