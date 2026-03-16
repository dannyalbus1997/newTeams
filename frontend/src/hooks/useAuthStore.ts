import { create } from 'zustand';
import { User } from '@/types';
import { authService } from '@/services/auth.service';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setAuth: (user: User, token: string) => void;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
  clearError: () => void;
  setError: (error: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: authService.getAuthToken(),
  isAuthenticated: !!authService.getAuthToken(),
  isLoading: false,
  error: null,

  setAuth: (user: User, token: string) => {
    authService.setAuthToken(token);
    set({
      user,
      token,
      isAuthenticated: true,
      error: null,
    });
  },

  setUser: (user: User) => {
    set({ user });
  },

  setToken: (token: string) => {
    authService.setAuthToken(token);
    set({
      token,
      isAuthenticated: true,
    });
  },

  logout: () => {
    authService.clearAuthToken();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
    });
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const response = await authService.getCurrentUser();

      if (response.success && response.data) {
        set({
          user: response.data,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      } else {
        authService.clearAuthToken();
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          error: response.error || 'Failed to fetch user',
        });
      }
    } catch (error) {
      authService.clearAuthToken();
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : 'An error occurred while checking authentication',
      });
    }
  },

  clearError: () => {
    set({ error: null });
  },

  setError: (error: string) => {
    set({ error });
  },
}));
