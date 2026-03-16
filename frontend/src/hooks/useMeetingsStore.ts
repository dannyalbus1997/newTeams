import { create } from 'zustand';
import { Meeting, PaginatedResponse } from '@/types';
import { meetingsService } from '@/services/meetings.service';
import { PAGINATION } from '@/lib/constants';

interface MeetingsState {
  meetings: Meeting[];
  selectedMeeting: Meeting | null;
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };

  // Actions
  fetchMeetings: (page?: number, limit?: number, search?: string) => Promise<void>;
  selectMeeting: (meeting: Meeting | null) => void;
  syncMeetings: () => Promise<void>;
  removeMeeting: (id: string) => void;
  updateMeeting: (meeting: Meeting) => void;
  clearError: () => void;
  setError: (error: string) => void;
  reset: () => void;
}

export const useMeetingsStore = create<MeetingsState>((set, get) => ({
  meetings: [],
  selectedMeeting: null,
  isLoading: false,
  error: null,
  pagination: {
    page: PAGINATION.DEFAULT_PAGE,
    limit: PAGINATION.DEFAULT_LIMIT,
    total: 0,
    totalPages: 0,
  },

  fetchMeetings: async (
    page = PAGINATION.DEFAULT_PAGE,
    limit = PAGINATION.DEFAULT_LIMIT,
    search?: string
  ) => {
    set({ isLoading: true, error: null });
    try {
      const response = await meetingsService.getMeetings({
        page,
        limit,
        search,
      });

      if (response.success && response.data) {
        const paginatedData = response.data as PaginatedResponse<Meeting>;
        set({
          meetings: paginatedData.data,
          pagination: {
            page: paginatedData.page,
            limit: paginatedData.limit,
            total: paginatedData.total,
            totalPages: paginatedData.totalPages,
          },
          isLoading: false,
          error: null,
        });
      } else {
        set({
          isLoading: false,
          error: response.error || 'Failed to fetch meetings',
        });
      }
    } catch (error) {
      set({
        isLoading: false,
        error:
          error instanceof Error ? error.message : 'Failed to fetch meetings',
      });
    }
  },

  selectMeeting: (meeting: Meeting | null) => {
    set({ selectedMeeting: meeting });
  },

  syncMeetings: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await meetingsService.syncMeetings();

      if (response.success) {
        // Refresh meetings after sync
        const { page, limit } = get().pagination;
        await get().fetchMeetings(page, limit);
      } else {
        set({
          isLoading: false,
          error: response.error || 'Failed to sync meetings',
        });
      }
    } catch (error) {
      set({
        isLoading: false,
        error:
          error instanceof Error ? error.message : 'Failed to sync meetings',
      });
    }
  },

  removeMeeting: (id: string) => {
    const { meetings } = get();
    set({ meetings: meetings.filter((m) => m.id !== id) });
  },

  updateMeeting: (meeting: Meeting) => {
    const { meetings } = get();
    set({
      meetings: meetings.map((m) => (m.id === meeting.id ? meeting : m)),
    });
  },

  clearError: () => {
    set({ error: null });
  },

  setError: (error: string) => {
    set({ error });
  },

  reset: () => {
    set({
      meetings: [],
      selectedMeeting: null,
      isLoading: false,
      error: null,
      pagination: {
        page: PAGINATION.DEFAULT_PAGE,
        limit: PAGINATION.DEFAULT_LIMIT,
        total: 0,
        totalPages: 0,
      },
    });
  },
}));
