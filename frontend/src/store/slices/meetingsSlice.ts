import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Meeting, PaginationState } from '@/types';
import { PAGINATION } from '@/lib/constants';
import { meetingsApi } from '@/store/api/meetingsApi';

interface MeetingsState {
  selectedMeeting: Meeting | null;
  filters: {
    search: string;
    startDate: string;
    endDate: string;
    status: string;
  };
  pagination: PaginationState;
}

const initialState: MeetingsState = {
  selectedMeeting: null,
  filters: {
    search: '',
    startDate: '',
    endDate: '',
    status: '',
  },
  pagination: {
    page: PAGINATION.DEFAULT_PAGE,
    limit: PAGINATION.DEFAULT_LIMIT,
    total: 0,
    totalPages: 0,
  },
};

const meetingsSlice = createSlice({
  name: 'meetings',
  initialState,
  reducers: {
    selectMeeting(state, action: PayloadAction<Meeting | null>) {
      state.selectedMeeting = action.payload;
    },
    setFilters(state, action: PayloadAction<Partial<MeetingsState['filters']>>) {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters(state) {
      state.filters = initialState.filters;
    },
    setPage(state, action: PayloadAction<number>) {
      state.pagination.page = action.payload;
    },
    resetMeetings() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    // Update pagination when meetings are fetched
    builder.addMatcher(
      meetingsApi.endpoints.getMeetings.matchFulfilled,
      (state, action) => {
        state.pagination = {
          page: action.payload.page,
          limit: action.payload.limit,
          total: action.payload.total,
          totalPages: action.payload.totalPages,
        };
      },
    );
  },
});

export const {
  selectMeeting,
  setFilters,
  clearFilters,
  setPage,
  resetMeetings,
} = meetingsSlice.actions;

export default meetingsSlice.reducer;
