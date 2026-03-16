/**
 * User and Authentication Types
 */
export interface UserPreferences {
  autoSummarize: boolean;
  summaryLanguage: string;
  emailNotifications: boolean;
}

export interface User {
  id: string;
  microsoftId: string;
  email: string;
  displayName: string;
  jobTitle?: string;
  avatar?: string;
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

/**
 * Meeting Types
 */
export interface Participant {
  name: string;
  email: string;
  role?: string;
}

export enum TranscriptStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  UNAVAILABLE = 'unavailable',
}

export enum SummaryStatus {
  NOT_GENERATED = 'not_generated',
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface Meeting {
  id: string;
  microsoftMeetingId: string;
  subject: string;
  organizer: Participant;
  participants: Participant[];
  startDateTime: string;
  endDateTime: string;
  joinUrl?: string;
  hasTranscript: boolean;
  hasRecording: boolean;
  transcriptStatus: TranscriptStatus;
  summaryStatus: SummaryStatus;
  lastSyncedAt: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Transcript Types
 */
export interface TranscriptEntry {
  speaker: string;
  timestamp: number;
  text: string;
}

export interface Transcript {
  id: string;
  meetingId: string;
  content: string;
  structuredContent: TranscriptEntry[];
  language: string;
  source: string;
  duration?: number;
  wordCount: number;
  fetchedAt: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Summary Types
 */
export interface DiscussionPoint {
  topic: string;
  details: string;
  speakers: string[];
}

export enum ActionItemPriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum ActionItemStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

export interface ActionItem {
  description: string;
  assignee?: string;
  dueDate?: string;
  priority: ActionItemPriority;
  status: ActionItemStatus;
}

export interface Decision {
  decision: string;
  context: string;
  madeBy?: string;
}

export interface FollowUp {
  item: string;
  responsible?: string;
  deadline?: string;
}

export enum SentimentScore {
  VERY_POSITIVE = 'very_positive',
  POSITIVE = 'positive',
  NEUTRAL = 'neutral',
  NEGATIVE = 'negative',
  VERY_NEGATIVE = 'very_negative',
}

export interface Sentiment {
  overall: string;
  score: SentimentScore;
}

export interface Summary {
  id: string;
  meetingId: string;
  overview: string;
  keyDiscussionPoints: DiscussionPoint[];
  actionItems: ActionItem[];
  decisions: Decision[];
  followUps: FollowUp[];
  sentiment: Sentiment;
  topics: string[];
  model: string;
  version: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * API Response Types
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiError {
  success: false;
  error: string;
  message?: string;
  statusCode?: number;
}

/**
 * Request Parameters
 */
export interface GetMeetingsParams {
  page?: number;
  limit?: number;
  search?: string;
  startDate?: string;
  endDate?: string;
  status?: 'has_transcript' | 'has_summary' | 'pending';
}

export interface SearchParams {
  q: string;
  type?: 'transcript' | 'summary' | 'all';
  page?: number;
  limit?: number;
}

/**
 * UI State Types
 */
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

export interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
