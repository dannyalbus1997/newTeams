'use client';

import React, { useState } from 'react';
import {
  Box,
  Card,
  TextField,
  Button,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
} from '@mui/material';
import { GetMeetingsParams } from '@/types';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';

interface MeetingFiltersProps {
  onFilter: (params: GetMeetingsParams) => void;
  isLoading?: boolean;
}

export default function MeetingFilters({
  onFilter,
  isLoading = false,
}: MeetingFiltersProps) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleFilter = () => {
    onFilter({
      search: search || undefined,
      status: (status as any) || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
  };

  const handleClear = () => {
    setSearch('');
    setStatus('');
    setStartDate('');
    setEndDate('');
    onFilter({});
  };

  return (
    <Paper sx={{ padding: 2, marginBottom: 3 }}>
      <Stack spacing={2}>
        <TextField
          label="Search meetings"
          placeholder="Enter meeting subject..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          fullWidth
          size="small"
          disabled={isLoading}
        />

        <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={2}>
          <TextField
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
            disabled={isLoading}
          />
          <TextField
            label="End Date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
            disabled={isLoading}
          />
        </Box>

        <FormControl fullWidth size="small" disabled={isLoading}>
          <InputLabel>Status Filter</InputLabel>
          <Select
            value={status}
            label="Status Filter"
            onChange={(e) => setStatus(e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="has_transcript">Has Transcript</MenuItem>
            <MenuItem value="has_summary">Has Summary</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
          </Select>
        </FormControl>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<FilterListIcon />}
            onClick={handleFilter}
            disabled={isLoading}
            fullWidth
          >
            Apply Filters
          </Button>
          <Button
            variant="outlined"
            startIcon={<ClearIcon />}
            onClick={handleClear}
            disabled={isLoading}
            fullWidth
          >
            Clear
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
