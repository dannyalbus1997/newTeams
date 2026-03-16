export interface PaginationQuery {
  page?: number;
  limit?: number;
  skip?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface StandardResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}
