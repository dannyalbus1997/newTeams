/**
 * API and App Configuration
 */
export const APP_CONFIG = {
  APP_NAME: 'Teams Meeting Summary',
  APP_DESCRIPTION: 'Automatically summarize your Teams meetings',
  LOGO_PATH: '/logo.svg',
  FAVICON_PATH: '/favicon.ico',
};

/**
 * API Configuration
 */
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  REQUEST_TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
};

/**
 * Pagination
 */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

/**
 * File Upload
 */
export const FILE_UPLOAD = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_TRANSCRIPT_FORMATS: ['.txt', '.vtt', '.srt', '.json'],
  ALLOWED_MIME_TYPES: [
    'text/plain',
    'text/vtt',
    'application/json',
    'text/srt',
  ],
};

/**
 * Search
 */
export const SEARCH = {
  DEBOUNCE_DELAY: 300, // 300ms
  DEFAULT_LIMIT: 10,
  MIN_QUERY_LENGTH: 2,
};

/**
 * UI
 */
export const UI = {
  TOAST_DURATION: 3000, // 3 seconds
  DIALOG_MAX_WIDTH: 'sm' as const,
  DRAWER_WIDTH: 280,
  NAVBAR_HEIGHT: 64,
};

/**
 * Routes
 */
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  MEETINGS: '/meetings',
  MEETING_DETAIL: (id: string) => `/meetings/${id}`,
  MEETING_TRANSCRIPT: (id: string) => `/meetings/${id}/transcript`,
  MEETING_SUMMARY: (id: string) => `/meetings/${id}/summary`,
  UPLOAD: '/upload',
  SEARCH: '/search',
  MEETING_BOT: '/meeting-bot',
  PROFILE: '/profile',
  SETTINGS: '/settings',
};

/**
 * Feature Flags
 */
export const FEATURES = {
  ENABLE_AUTO_SYNC: true,
  ENABLE_PDF_EXPORT: true,
  ENABLE_SEARCH: true,
  ENABLE_ACTION_ITEMS: true,
  ENABLE_SENTIMENT_ANALYSIS: true,
};

/**
 * Error Messages
 */
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'Unauthorized. Please log in again.',
  FORBIDDEN: 'Access denied.',
  NOT_FOUND: 'Resource not found.',
  SERVER_ERROR: 'Server error. Please try again later.',
  VALIDATION_ERROR: 'Invalid input. Please check your data.',
  UPLOAD_FAILED: 'File upload failed. Please try again.',
  TRANSCRIPT_NOT_FOUND: 'Transcript not found.',
  SUMMARY_NOT_FOUND: 'Summary not found.',
  MEETING_NOT_FOUND: 'Meeting not found.',
};

/**
 * Success Messages
 */
export const SUCCESS_MESSAGES = {
  LOGGED_IN: 'Logged in successfully',
  LOGGED_OUT: 'Logged out successfully',
  PROFILE_UPDATED: 'Profile updated successfully',
  SETTINGS_SAVED: 'Settings saved successfully',
  TRANSCRIPT_UPLOADED: 'Transcript uploaded successfully',
  TRANSCRIPT_FETCHED: 'Transcript fetched successfully',
  SUMMARY_GENERATED: 'Summary generated successfully',
  SUMMARY_REGENERATED: 'Summary regenerated successfully',
  ACTION_ITEM_UPDATED: 'Action item updated successfully',
  MEETINGS_SYNCED: 'Meetings synced successfully',
  FILE_DOWNLOADED: 'File downloaded successfully',
};

/**
 * Date Format Templates
 */
export const DATE_FORMATS = {
  DATE: 'MMM d, yyyy',
  DATE_TIME: 'MMM d, yyyy h:mm a',
  DATE_TIME_SECONDS: 'MMM d, yyyy h:mm:ss a',
  TIME: 'h:mm a',
  FULL_DATE: 'EEEE, MMMM d, yyyy',
  ISO: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
};

/**
 * Status Colors (hex codes)
 */
export const STATUS_COLORS = {
  PENDING: '#605E5C',
  IN_PROGRESS: '#0078D4',
  COMPLETED: '#107C10',
  PROCESSING: '#0078D4',
  FAILED: '#D83B01',
  UNAVAILABLE: '#A19F9D',
};

/**
 * Priority Colors (hex codes)
 */
export const PRIORITY_COLORS = {
  HIGH: '#D83B01',
  MEDIUM: '#FFB900',
  LOW: '#107C10',
};

/**
 * Sentiment Colors (hex codes)
 */
export const SENTIMENT_COLORS = {
  VERY_POSITIVE: '#107C10',
  POSITIVE: '#4AA84C',
  NEUTRAL: '#605E5C',
  NEGATIVE: '#F7630C',
  VERY_NEGATIVE: '#D83B01',
};

/**
 * Action Item Statuses
 */
export const ACTION_ITEM_STATUSES = [
  { value: 'pending', label: 'Pending', color: '#605E5C' },
  { value: 'in_progress', label: 'In Progress', color: '#0078D4' },
  { value: 'completed', label: 'Completed', color: '#107C10' },
];

/**
 * Action Item Priorities
 */
export const ACTION_ITEM_PRIORITIES = [
  { value: 'low', label: 'Low', color: '#107C10' },
  { value: 'medium', label: 'Medium', color: '#FFB900' },
  { value: 'high', label: 'High', color: '#D83B01' },
];
