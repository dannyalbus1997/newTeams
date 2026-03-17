import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { API_CONFIG } from '@/lib/constants';

const TOKEN_KEY = 'auth_token';

const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
};

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.REQUEST_TIMEOUT,
  prepareHeaders: (headers) => {
    const token = getToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401) {
    // Clear token and redirect to login
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = '/login';
    }
    // Dispatch the logout action directly by type to avoid circular imports
    api.dispatch({ type: 'auth/logout' });
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Auth', 'Meeting', 'Meetings', 'Transcript', 'Summary', 'Summaries'],
  endpoints: () => ({}),
});
