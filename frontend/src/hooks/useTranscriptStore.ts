import { create } from 'zustand';
import { Transcript } from '@/types';
import { transcriptsService } from '@/services/transcripts.service';

interface TranscriptState {
  transcript: Transcript | null;
  isLoading: boolean;
  error: string | null;
  uploadProgress: number;
  searchQuery: string;
  searchResults: string[];

  // Actions
  fetchTranscript: (meetingId: string) => Promise<void>;
  fetchTranscriptFromMeeting: (meetingId: string) => Promise<void>;
  uploadTranscript: (
    meetingId: string,
    file: File
  ) => Promise<void>;
  searchTranscript: (meetingId: string, query: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  clearSearchResults: () => void;
  clearError: () => void;
  setError: (error: string) => void;
  reset: () => void;
}

export const useTranscriptStore = create<TranscriptState>((set) => ({
  transcript: null,
  isLoading: false,
  error: null,
  uploadProgress: 0,
  searchQuery: '',
  searchResults: [],

  fetchTranscript: async (meetingId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await transcriptsService.getTranscript(meetingId);

      if (response.success && response.data) {
        set({
          transcript: response.data,
          isLoading: false,
          error: null,
        });
      } else {
        set({
          isLoading: false,
          error: response.error || 'Failed to fetch transcript',
        });
      }
    } catch (error) {
      set({
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch transcript',
      });
    }
  },

  fetchTranscriptFromMeeting: async (meetingId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await transcriptsService.fetchTranscript(meetingId);

      if (response.success && response.data) {
        set({
          transcript: response.data,
          isLoading: false,
          error: null,
        });
      } else {
        set({
          isLoading: false,
          error: response.error || 'Failed to fetch transcript from meeting',
        });
      }
    } catch (error) {
      set({
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch transcript from meeting',
      });
    }
  },

  uploadTranscript: async (meetingId: string, file: File) => {
    set({ isLoading: true, error: null, uploadProgress: 0 });
    try {
      const response = await transcriptsService.uploadTranscript(
        meetingId,
        file,
        (progressEvent) => {
          if (progressEvent.lengthComputable) {
            const progress = Math.round(
              (progressEvent.loaded / progressEvent.total) * 100
            );
            set({ uploadProgress: progress });
          }
        }
      );

      if (response.success && response.data) {
        // Fetch the full transcript after upload
        await transcriptsService.getTranscript(meetingId);
        set({
          isLoading: false,
          uploadProgress: 100,
          error: null,
        });
      } else {
        set({
          isLoading: false,
          uploadProgress: 0,
          error: response.error || 'Failed to upload transcript',
        });
      }
    } catch (error) {
      set({
        isLoading: false,
        uploadProgress: 0,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to upload transcript',
      });
    }
  },

  searchTranscript: async (meetingId: string, query: string) => {
    if (!query.trim()) {
      set({ searchResults: [], searchQuery: '' });
      return;
    }

    try {
      const response = await transcriptsService.searchTranscript(
        meetingId,
        query
      );

      if (response.success && response.data) {
        set({
          searchResults: response.data.results || [],
          searchQuery: query,
        });
      } else {
        set({ searchResults: [] });
      }
    } catch (error) {
      console.error('Search failed:', error);
      set({ searchResults: [] });
    }
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  clearSearchResults: () => {
    set({ searchResults: [], searchQuery: '' });
  },

  clearError: () => {
    set({ error: null });
  },

  setError: (error: string) => {
    set({ error });
  },

  reset: () => {
    set({
      transcript: null,
      isLoading: false,
      error: null,
      uploadProgress: 0,
      searchQuery: '',
      searchResults: [],
    });
  },
}));
