'use client';

import React, { useState } from 'react';
import {
  Box,
  Stack,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  CircularProgress,
  Chip,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import SearchBar from '@/components/common/SearchBar';
import EmptyState from '@/components/common/EmptyState';
import ErrorAlert from '@/components/common/ErrorAlert';
import SearchIcon from '@mui/icons-material/Search';
import { summariesService } from '@/services/summaries.service';
import { ROUTES } from '@/lib/constants';

interface SearchResult {
  meetingId: string;
  meetingSubject: string;
  matches: string[];
}

export default function SearchPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      setHasSearched(false);
      setError(null);
      return;
    }

    setSearchQuery(query);
    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const response = await summariesService.searchSummaries(query, 1, 20);
      if (response.success && response.data) {
        setResults(response.data.results || []);
      } else {
        setError(response.error || 'Search failed');
        setResults([]);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An error occurred during search'
      );
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewMeeting = (meetingId: string) => {
    router.push(ROUTES.MEETING_DETAIL(meetingId));
  };

  return (
    <MainLayout>
      <Stack spacing={3}>
        {/* Header */}
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Search Meetings & Summaries
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Find meetings and summaries by keywords, topics, or discussion points
          </Typography>
        </Box>

        {/* Search Bar */}
        <Card>
          <CardContent sx={{ pt: 2 }}>
            <SearchBar
              onSearch={handleSearch}
              placeholder="Search meetings, summaries, action items, decisions..."
              debounceDelay={300}
              fullWidth
            />
          </CardContent>
        </Card>

        {error && <ErrorAlert error={error} onDismiss={() => setError(null)} showDismiss />}

        {/* Results */}
        {isLoading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
            <Stack alignItems="center">
              <CircularProgress />
              <Typography color="textSecondary" mt={2}>
                Searching...
              </Typography>
            </Stack>
          </Box>
        ) : !hasSearched ? (
          <EmptyState
            icon={SearchIcon}
            title="Start searching"
            description="Enter a keyword or phrase to search through your meetings and summaries"
          />
        ) : results.length === 0 ? (
          <EmptyState
            icon={SearchIcon}
            title="No results found"
            description={`No meetings or summaries found matching "${searchQuery}"`}
          />
        ) : (
          <Stack spacing={2}>
            <Typography variant="body2" color="textSecondary">
              Found {results.length} result{results.length !== 1 ? 's' : ''}
            </Typography>

            {results.map((result, index) => (
              <Card key={`${result.meetingId}-${index}`}>
                <CardContent>
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="start"
                    mb={1}
                  >
                    <Typography variant="h6" sx={{ fontWeight: 600, flex: 1 }}>
                      {result.meetingSubject}
                    </Typography>
                  </Box>

                  {result.matches.length > 0 && (
                    <Box>
                      <Typography variant="caption" color="textSecondary" display="block" mb={1}>
                        Matching content:
                      </Typography>
                      <Stack spacing={1}>
                        {result.matches.slice(0, 3).map((match, idx) => (
                          <Box
                            key={idx}
                            sx={{
                              padding: 1,
                              backgroundColor: '#F5F5F5',
                              borderRadius: 1,
                              borderLeft: '3px solid #0078D4',
                            }}
                          >
                            <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                              {match}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>

                      {result.matches.length > 3 && (
                        <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1 }}>
                          +{result.matches.length - 3} more matches
                        </Typography>
                      )}
                    </Box>
                  )}
                </CardContent>

                <CardActions>
                  <Button
                    size="small"
                    color="primary"
                    onClick={() => handleViewMeeting(result.meetingId)}
                  >
                    View Meeting
                  </Button>
                </CardActions>
              </Card>
            ))}
          </Stack>
        )}
      </Stack>
    </MainLayout>
  );
}
