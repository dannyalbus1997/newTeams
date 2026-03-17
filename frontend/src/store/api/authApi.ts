import { baseApi } from './baseApi';
import { User, ApiResponse } from '@/types';

export interface LoginResponse {
  user: User;
  token: string;
  expiresIn: number;
}

export interface RefreshTokenResponse {
  token: string;
  expiresIn: number;
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCurrentUser: builder.query<User, void>({
      query: () => '/auth/me',
      transformResponse: (response: ApiResponse<User>) => response.data!,
      providesTags: ['Auth'],
    }),

    refreshToken: builder.mutation<RefreshTokenResponse, void>({
      query: () => ({
        url: '/auth/refresh',
        method: 'POST',
      }),
      transformResponse: (response: ApiResponse<RefreshTokenResponse>) => response.data!,
    }),

    logoutUser: builder.mutation<void, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      invalidatesTags: ['Auth'],
    }),
  }),
});

export const {
  useGetCurrentUserQuery,
  useLazyGetCurrentUserQuery,
  useRefreshTokenMutation,
  useLogoutUserMutation,
} = authApi;
