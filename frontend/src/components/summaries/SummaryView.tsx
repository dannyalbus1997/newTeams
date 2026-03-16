'use client';

import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardActions,
  Typography,
  Box,
  Divider,
  Chip,
  Button,
  Stack,
  AccordionDetails,
  Accordion,
  AccordionSummary,
  LinearProgress,
  Alert,
} from '@mui/material';
import { Summary, ActionItem } from '@/types';
import SentimentIndicator from './SentimentIndicator';
import ActionItemList from './ActionItemList';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';

interface SummaryViewProps {
  summary: Summary;
  isLoading?: boolean;
  isGenerating?: boolean;
  onRegenerate?: () => Promise<void>;
  onUpdateActionItem?: (index: number, data: Partial<ActionItem>) => Promise<void>;
  onExportPdf?: () => Promise<void>;
}

export default function SummaryView({
  summary,
  isLoading = false,
  isGenerating = false,
  onRegenerate,
  onUpdateActionItem,
  onExportPdf,
}: SummaryViewProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <LinearProgress />
          <Typography sx={{ mt: 2 }} color="textSecondary">
            Loading summary...
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Stack spacing={2}>
      {/* Header Card */}
      <Card>
        <CardHeader
          title="Meeting Summary"
          action={
            <Stack direction="row" spacing={1}>
              {onExportPdf && (
                <Button
                  size="small"
                  startIcon={<DownloadIcon />}
                  onClick={onExportPdf}
                >
                  Export PDF
                </Button>
              )}
              {onRegenerate && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={onRegenerate}
                  disabled={isGenerating}
                >
                  {isGenerating ? 'Regenerating...' : 'Regenerate'}
                </Button>
              )}
            </Stack>
          }
        />
        <CardContent>
          {isGenerating && <LinearProgress sx={{ mb: 2 }} />}
          <Typography variant="body1" sx={{ lineHeight: 1.8 }}>
            {summary.overview}
          </Typography>

          <Box display="flex" gap={1} flexWrap="wrap" mt={2}>
            {summary.topics.map((topic) => (
              <Chip key={topic} label={topic} variant="outlined" />
            ))}
          </Box>

          <Box mt={2}>
            <Typography variant="caption" color="textSecondary">
              Generated: {summary.model} • Version: {summary.version}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Meeting Sentiment */}
      <SentimentIndicator sentiment={summary.sentiment} />

      {/* Key Discussion Points */}
      {summary.keyDiscussionPoints.length > 0 && (
        <Card>
          <CardHeader title={`Key Discussion Points (${summary.keyDiscussionPoints.length})`} />
          <CardContent>
            <Stack spacing={2}>
              {summary.keyDiscussionPoints.map((point, index) => (
                <Accordion key={`${index}-${point.topic}`}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography sx={{ fontWeight: 600 }}>{point.topic}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack spacing={1}>
                      <Typography variant="body2">{point.details}</Typography>
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
                          Speakers:
                        </Typography>
                        <Box display="flex" gap={1} flexWrap="wrap">
                          {point.speakers.map((speaker) => (
                            <Chip key={speaker} label={speaker} size="small" variant="outlined" />
                          ))}
                        </Box>
                      </Box>
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Action Items */}
      {summary.actionItems.length > 0 && (
        <ActionItemList
          items={summary.actionItems}
          onUpdateItem={onUpdateActionItem}
        />
      )}

      {/* Decisions */}
      {summary.decisions.length > 0 && (
        <Card>
          <CardHeader title={`Decisions Made (${summary.decisions.length})`} />
          <CardContent>
            <Stack spacing={2}>
              {summary.decisions.map((decision, index) => (
                <Box key={index}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    {decision.decision}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                    {decision.context}
                  </Typography>
                  {decision.madeBy && (
                    <Typography variant="caption" color="textSecondary">
                      Made by: {decision.madeBy}
                    </Typography>
                  )}
                  {index < summary.decisions.length - 1 && <Divider sx={{ mt: 2 }} />}
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Follow-ups */}
      {summary.followUps.length > 0 && (
        <Card>
          <CardHeader title={`Follow-ups (${summary.followUps.length})`} />
          <CardContent>
            <Stack spacing={2}>
              {summary.followUps.map((followUp, index) => (
                <Box key={index}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    {followUp.item}
                  </Typography>
                  {followUp.responsible && (
                    <Typography variant="caption" color="textSecondary" display="block">
                      Responsible: {followUp.responsible}
                    </Typography>
                  )}
                  {followUp.deadline && (
                    <Typography variant="caption" color="textSecondary" display="block">
                      Deadline: {followUp.deadline}
                    </Typography>
                  )}
                  {index < summary.followUps.length - 1 && <Divider sx={{ mt: 2 }} />}
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}
