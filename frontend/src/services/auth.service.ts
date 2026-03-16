import { apiClient } from './api';
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

class AuthService {
  public getLoginUrl(): string {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    return `${apiUrl}/auth/login`;
  }

  public async getCurrentUser(): Promise<ApiResponse<User>> {
    return apiClient.get<User>('/auth/me');
  }

  public async refreshToken(): Promise<ApiResponse<RefreshTokenResponse>> {
    return apiClient.post<RefreshTokenResponse>('/auth/refresh');
  }

  public async logout(): Promise<ApiResponse<void>> {
    const response = await apiClient.post<void>('/auth/logout');
    // Clear token from localStorage
    apiClient.clearToken();
    return response;
  }

  public setAuthToken(token: string): void {
    apiClient.setToken(token);
  }

  public getAuthToken(): string | null {
    return apiClient.getToken();
  }

  public clearAuthToken(): void {
    apiClient.clearToken();
  }

  public isAuthenticated(): boolean {
    return !!this.getAuthToken();
  }
}

export const authService = new AuthService();
