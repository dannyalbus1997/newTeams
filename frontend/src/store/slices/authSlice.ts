import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '@/types';
import { authApi } from '@/store/api/authApi';

const TOKEN_KEY = 'auth_token';

const getStoredToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
};

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: getStoredToken(),
  isAuthenticated: !!getStoredToken(),
  isLoading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuth(state, action: PayloadAction<{ user: User; token: string }>) {
      const { user, token } = action.payload;
      state.user = user;
      state.token = token;
      state.isAuthenticated = true;
      state.error = null;
      if (typeof window !== 'undefined') {
        localStorage.setItem(TOKEN_KEY, token);
      }
    },
    setUser(state, action: PayloadAction<User>) {
      state.user = action.payload;
    },
    setToken(state, action: PayloadAction<string>) {
      state.token = action.payload;
      state.isAuthenticated = true;
      if (typeof window !== 'undefined') {
        localStorage.setItem(TOKEN_KEY, action.payload);
      }
    },
    logout(state) {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
      if (typeof window !== 'undefined') {
        localStorage.removeItem(TOKEN_KEY);
      }
    },
    setAuthLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setAuthError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    clearAuthError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // When getCurrentUser query succeeds, update the auth state
    builder.addMatcher(
      authApi.endpoints.getCurrentUser.matchFulfilled,
      (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
        state.isLoading = false;
        state.error = null;
      },
    );
    builder.addMatcher(
      authApi.endpoints.getCurrentUser.matchPending,
      (state) => {
        state.isLoading = true;
      },
    );
    builder.addMatcher(
      authApi.endpoints.getCurrentUser.matchRejected,
      (state, action) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.isLoading = false;
        state.error = action.error?.message || 'Failed to fetch user';
        if (typeof window !== 'undefined') {
          localStorage.removeItem(TOKEN_KEY);
        }
      },
    );
    // When logout mutation succeeds, clear state
    builder.addMatcher(
      authApi.endpoints.logoutUser.matchFulfilled,
      (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = null;
        if (typeof window !== 'undefined') {
          localStorage.removeItem(TOKEN_KEY);
        }
      },
    );
  },
});

export const {
  setAuth,
  setUser,
  setToken,
  logout,
  setAuthLoading,
  setAuthError,
  clearAuthError,
} = authSlice.actions;

export default authSlice.reducer;
