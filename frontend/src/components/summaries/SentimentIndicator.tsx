'use client';

import React from 'react';
import { Box, Typography, LinearProgress, Card, CardContent } from '@mui/material';
import { Sentiment } from '@/types';
import { getSentimentColor, getSentimentLabel } from '@/lib/utils';

interface SentimentIndicatorProps {
  sentiment: Sentiment;
}

export default function SentimentIndicator({ sentiment }: SentimentIndicatorProps) {
  const color = getSentimentColor(sentiment.score);
  const label = getSentimentLabel(sentiment.score);

  // Map sentiment score to numeric value (0-100)
  const scoreMap: Record<string, number> = {
    very_positive: 100,
    positive: 75,
    neutral: 50,
    negative: 25,
    very_negative: 0,
  };

  const numericScore = scoreMap[sentiment.score] || 50;

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Meeting Sentiment
          </Typography>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              color: color,
            }}
          >
            {label}
          </Typography>
        </Box>

        <Box>
          <Box display="flex" justifyContent="space-between" mb={1}>
            <Typography variant="caption" color="textSecondary">
              Negative
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Neutral
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Positive
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={numericScore}
            sx={{
              height: 12,
              borderRadius: 6,
              backgroundColor: '#E1DFDD',
              '& .MuiLinearProgress-bar': {
                backgroundColor: color,
                borderRadius: 6,
              },
            }}
          />
        </Box>

        {sentiment.overall && (
          <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 2 }}>
            {sentiment.overall}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
