'use client';

import React, { useState, useRef } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Box,
  Button,
  Typography,
  LinearProgress,
  Alert,
  Stack,
  Chip,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { FILE_UPLOAD } from '@/lib/constants';

interface TranscriptUploadProps {
  onUpload: (file: File) => Promise<void>;
  isLoading?: boolean;
  uploadProgress?: number;
  error?: string | null;
  success?: boolean;
}

export default function TranscriptUpload({
  onUpload,
  isLoading = false,
  uploadProgress = 0,
  error = null,
  success = false,
}: TranscriptUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const isValidFile = (file: File): boolean => {
    const isValidType = FILE_UPLOAD.ALLOWED_MIME_TYPES.includes(file.type);
    const isValidSize = file.size <= FILE_UPLOAD.MAX_FILE_SIZE;
    return isValidType && isValidSize;
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (isValidFile(file)) {
        setSelectedFile(file);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (isValidFile(file)) {
        setSelectedFile(file);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    await onUpload(selectedFile);
    if (!error) {
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <Card>
      <CardHeader title="Upload Transcript" />
      <CardContent>
        <Stack spacing={2}>
          {success && (
            <Alert severity="success" icon={<CheckCircleIcon />}>
              Transcript uploaded successfully!
            </Alert>
          )}

          {error && <Alert severity="error">{error}</Alert>}

          <Box
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            sx={{
              border: '2px dashed',
              borderColor: dragActive ? 'primary.main' : 'divider',
              borderRadius: 2,
              padding: 3,
              textAlign: 'center',
              backgroundColor: dragActive ? 'action.hover' : 'background.default',
              transition: 'all 0.2s ease-in-out',
              cursor: 'pointer',
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
            <Typography variant="h6" gutterBottom>
              Drag and drop your transcript
            </Typography>
            <Typography variant="body2" color="textSecondary">
              or click to select a file
            </Typography>
            <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 1 }}>
              Supported formats: .txt, .vtt, .srt, .json
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Maximum file size: 50MB
            </Typography>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              accept=".txt,.vtt,.srt,.json"
              style={{ display: 'none' }}
              disabled={isLoading}
            />
          </Box>

          {selectedFile && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Selected File
              </Typography>
              <Chip
                label={selectedFile.name}
                onDelete={() => setSelectedFile(null)}
                sx={{ mb: 2 }}
              />
              <Typography variant="caption" color="textSecondary" display="block">
                Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </Typography>
            </Box>
          )}

          {isLoading && (
            <>
              <Box>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="caption">Uploading...</Typography>
                  <Typography variant="caption">{uploadProgress}%</Typography>
                </Box>
                <LinearProgress variant="determinate" value={uploadProgress} />
              </Box>
            </>
          )}

          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleUpload}
              disabled={!selectedFile || isLoading}
              fullWidth
            >
              {isLoading ? 'Uploading...' : 'Upload Transcript'}
            </Button>
            {selectedFile && (
              <Button
                variant="outlined"
                onClick={() => setSelectedFile(null)}
                disabled={isLoading}
              >
                Cancel
              </Button>
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
