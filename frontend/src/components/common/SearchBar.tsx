'use client';

import React, { useState, useCallback } from 'react';
import { TextField, InputAdornment, TextFieldProps } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { debounce } from '@/lib/utils';

interface SearchBarProps extends Omit<TextFieldProps, 'onChange'> {
  onSearch: (query: string) => void;
  debounceDelay?: number;
  placeholder?: string;
}

export default function SearchBar({
  onSearch,
  debounceDelay = 300,
  placeholder = 'Search...',
  ...props
}: SearchBarProps) {
  const [value, setValue] = useState('');

  const debouncedSearch = useCallback(
    debounce((query: string) => {
      onSearch(query);
    }, debounceDelay),
    [debounceDelay, onSearch]
  );

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setValue(newValue);
    debouncedSearch(newValue);
  };

  return (
    <TextField
      fullWidth
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      variant="outlined"
      size="small"
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon />
          </InputAdornment>
        ),
      }}
      {...props}
    />
  );
}
