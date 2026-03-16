import { format, formatDistance, parseISO, differenceInMinutes } from 'date-fns';
import { SentimentScore } from '@/types';

/**
 * Format date to readable string
 */
export function formatDate(
  date: string | Date,
  formatString: string = 'MMM d, yyyy'
): string {
  try {
    const parsedDate = typeof date === 'string' ? parseISO(date) : date;
    return format(parsedDate, formatString);
  } catch (error) {
    return 'Invalid date';
  }
}

/**
 * Format date with time
 */
export function formatDateTime(
  date: string | Date,
  formatString: string = 'MMM d, yyyy h:mm a'
): string {
  try {
    const parsedDate = typeof date === 'string' ? parseISO(date) : date;
    return format(parsedDate, formatString);
  } catch (error) {
    return 'Invalid date';
  }
}

/**
 * Format relative time (e.g., "2 days ago")
 */
export function formatRelativeTime(date: string | Date): string {
  try {
    const parsedDate = typeof date === 'string' ? parseISO(date) : date;
    return formatDistance(parsedDate, new Date(), { addSuffix: true });
  } catch (error) {
    return 'Unknown time';
  }
}

/**
 * Format duration in minutes to readable format
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  }
  return `${hours}h ${mins}m`;
}

/**
 * Format time from timestamps
 */
export function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);

  return parts.join(' ');
}

/**
 * Calculate duration between two dates
 */
export function calculateDuration(startDate: string | Date, endDate: string | Date): number {
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;
  return differenceInMinutes(end, start);
}

/**
 * Truncate text to max length
 */
export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Get initials from name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2);
}

/**
 * Get color for sentiment
 */
export function getSentimentColor(sentiment: SentimentScore): string {
  const colors: Record<SentimentScore, string> = {
    [SentimentScore.VERY_POSITIVE]: '#107C10', // Green
    [SentimentScore.POSITIVE]: '#4AA84C', // Light green
    [SentimentScore.NEUTRAL]: '#605E5C', // Gray
    [SentimentScore.NEGATIVE]: '#F7630C', // Orange
    [SentimentScore.VERY_NEGATIVE]: '#D83B01', // Red
  };
  return colors[sentiment] || '#605E5C';
}

/**
 * Get label for sentiment
 */
export function getSentimentLabel(sentiment: SentimentScore): string {
  const labels: Record<SentimentScore, string> = {
    [SentimentScore.VERY_POSITIVE]: 'Very Positive',
    [SentimentScore.POSITIVE]: 'Positive',
    [SentimentScore.NEUTRAL]: 'Neutral',
    [SentimentScore.NEGATIVE]: 'Negative',
    [SentimentScore.VERY_NEGATIVE]: 'Very Negative',
  };
  return labels[sentiment] || 'Unknown';
}

/**
 * Get color for priority
 */
export function getPriorityColor(priority: 'high' | 'medium' | 'low'): string {
  const colors: Record<string, string> = {
    high: '#D83B01', // Red
    medium: '#FFB900', // Amber
    low: '#107C10', // Green
  };
  return colors[priority] || '#605E5C';
}

/**
 * Get color for status
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: '#605E5C', // Gray
    in_progress: '#0078D4', // Blue
    completed: '#107C10', // Green
    processing: '#0078D4', // Blue
    failed: '#D83B01', // Red
    unavailable: '#A19F9D', // Light gray
  };
  return colors[status] || '#605E5C';
}

/**
 * Get readable status label
 */
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Pending',
    in_progress: 'In Progress',
    completed: 'Completed',
    processing: 'Processing',
    failed: 'Failed',
    unavailable: 'Unavailable',
    not_generated: 'Not Generated',
  };
  return labels[status] || status;
}

/**
 * Download file from blob
 */
export function downloadFile(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Validate email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Format number with commas
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Calculate percentage
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return function (...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}
