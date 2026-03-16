import { create } from 'zustand';
import { Summary, ActionItem } from '@/types';
import { summariesService } from '@/services/summaries.service';

interface SummaryState {
  summary: Summary | null;
  isLoading: boolean;
  isGenerating: boolean;
  error: string | null;

  // Actions
  fetchSummary: (meetingId: string) => Promise<void>;
  generateSummary: (meetingId: string) => Promise<void>;
  regenerateSummary: (meetingId: string) => Promise<void>;
  updateActionItem: (
    meetingId: string,
    itemIndex: number,
    data: Partial<ActionItem>
  ) => Promise<void>;
  exportPdf: (meetingId: string) => Promise<void>;
  clearError: () => void;
  setError: (error: string) => void;
  reset: () => void;
}

export const useSummaryStore = create<SummaryState>((set) => ({
  summary: null,
  isLoading: false,
  isGenerating: false,
  error: null,

  fetchSummary: async (meetingId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await summariesService.getSummary(meetingId);

      if (response.success && response.data) {
        set({
          summary: response.data,
          isLoading: false,
          error: null,
        });
      } else {
        set({
          isLoading: false,
          error: response.error || 'Failed to fetch summary',
        });
      }
    } catch (error) {
      set({
        isLoading: false,
        error:
          error instanceof Error ? error.message : 'Failed to fetch summary',
      });
    }
  },

  generateSummary: async (meetingId: string) => {
    set({ isGenerating: true, error: null });
    try {
      const response = await summariesService.generateSummary(meetingId);

      if (response.success && response.data) {
        set({
          summary: response.data,
          isGenerating: false,
          error: null,
        });
      } else {
        set({
          isGenerating: false,
          error: response.error || 'Failed to generate summary',
        });
      }
    } catch (error) {
      set({
        isGenerating: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to generate summary',
      });
    }
  },

  regenerateSummary: async (meetingId: string) => {
    set({ isGenerating: true, error: null });
    try {
      const response = await summariesService.regenerateSummary(meetingId);

      if (response.success && response.data) {
        set({
          summary: response.data,
          isGenerating: false,
          error: null,
        });
      } else {
        set({
          isGenerating: false,
          error: response.error || 'Failed to regenerate summary',
        });
      }
    } catch (error) {
      set({
        isGenerating: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to regenerate summary',
      });
    }
  },

  updateActionItem: async (
    meetingId: string,
    itemIndex: number,
    data: Partial<ActionItem>
  ) => {
    try {
      const response = await summariesService.updateActionItem(
        meetingId,
        itemIndex,
        data as any
      );

      if (response.success && response.data) {
        set({
          summary: response.data,
          error: null,
        });
      } else {
        set({
          error: response.error || 'Failed to update action item',
        });
      }
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update action item',
      });
    }
  },

  exportPdf: async (meetingId: string) => {
    try {
      const blob = await summariesService.exportPdf(meetingId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `summary-${meetingId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : 'Failed to export PDF',
      });
    }
  },

  clearError: () => {
    set({ error: null });
  },

  setError: (error: string) => {
    set({ error });
  },

  reset: () => {
    set({
      summary: null,
      isLoading: false,
      isGenerating: false,
      error: null,
    });
  },
}));
