# Teams Meeting Summary - Frontend

A production-ready Next.js frontend for automatically summarizing Microsoft Teams meetings using AI.

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **UI Library**: Material-UI (MUI) v5
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Date Handling**: date-fns
- **Styling**: Emotion (CSS-in-JS)

## Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── dashboard/          # Dashboard page
│   │   ├── login/              # Login page
│   │   ├── meetings/           # Meetings list and detail pages
│   │   ├── search/             # Search page
│   │   ├── upload/             # Transcript upload page
│   │   └── layout.tsx          # Root layout
│   ├── components/             # Reusable React components
│   │   ├── common/             # Common UI components
│   │   ├── layout/             # Layout components
│   │   ├── meetings/           # Meeting-specific components
│   │   ├── summaries/          # Summary-specific components
│   │   └── transcripts/        # Transcript-specific components
│   ├── hooks/                  # Zustand stores and custom hooks
│   ├── services/               # API service layer
│   ├── lib/                    # Utility functions and constants
│   ├── theme/                  # MUI theme configuration
│   └── types/                  # TypeScript type definitions
├── public/                     # Static assets
├── package.json
├── tsconfig.json
├── next.config.js
└── .env.example
```

## Features

### Authentication
- Microsoft OAuth integration
- JWT token management
- Automatic token refresh
- Protected routes with middleware

### Meeting Management
- View all Teams meetings synced from calendar
- Filter and search meetings
- View meeting details (organizer, participants, duration)
- Real-time sync status tracking

### Transcripts
- Automatic transcript fetching from Teams recordings
- Manual transcript upload (TXT, VTT, SRT, JSON formats)
- Full-text search within transcripts
- Speaker identification with color coding
- Copy and download transcript functionality

### Summaries
- AI-powered meeting summaries
- Key discussion points extraction
- Action items with priority and assignee
- Decisions and follow-ups tracking
- Meeting sentiment analysis
- Topic extraction
- Regenerate summaries on demand
- PDF export

### Dashboard
- Overview statistics (total meetings, summaries generated, pending actions)
- Recent meetings widget
- Quick action buttons
- One-click meeting sync

## Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn
- Backend API running on `http://localhost:3001`

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env.local
```

3. Update `.env.local` with your API URL:
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Development

Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

Create a production build:
```bash
npm run build
npm start
```

## API Integration

The frontend communicates with the backend API at `/api` endpoints:

### Authentication
- `POST /api/auth/login` - Get Microsoft login URL
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Refresh token

### Meetings
- `GET /api/meetings` - List meetings with pagination
- `GET /api/meetings/:id` - Get meeting details
- `POST /api/meetings/sync` - Sync Teams meetings
- `GET /api/meetings/:id/status` - Check meeting status

### Transcripts
- `GET /api/transcripts/:meetingId` - Get transcript
- `POST /api/transcripts/:meetingId/fetch` - Fetch from Teams
- `POST /api/transcripts/:meetingId/upload` - Upload file
- `GET /api/transcripts/:meetingId/search` - Search transcript

### Summaries
- `GET /api/summaries/:meetingId` - Get summary
- `POST /api/summaries/:meetingId/generate` - Generate summary
- `POST /api/summaries/:meetingId/regenerate` - Regenerate
- `GET /api/summaries/search?q=query` - Search summaries
- `GET /api/summaries/:meetingId/export/pdf` - Export to PDF
- `PATCH /api/summaries/:meetingId/action-items/:index` - Update action item

## State Management

Uses Zustand stores for global state:

- `useAuthStore` - User authentication state
- `useMeetingsStore` - Meetings list and pagination
- `useTranscriptStore` - Transcript data and operations
- `useSummaryStore` - Summary data and operations

## Component Architecture

### Layout Components
- `Navbar` - Top navigation with user menu
- `MainLayout` - Protected layout wrapper with auth check
- `Footer` - Application footer

### Common Components
- `LoadingSpinner` - Loading state indicator
- `ErrorAlert` - Error message display with retry
- `EmptyState` - Empty state with icon and action
- `StatusChip` - Color-coded status badges
- `SearchBar` - Debounced search input
- `ConfirmDialog` - Reusable confirmation dialog

### Feature Components
- `MeetingCard` - Individual meeting display card
- `MeetingList` - Table view of meetings with pagination
- `MeetingDetail` - Full meeting information
- `MeetingFilters` - Advanced meeting filters
- `TranscriptViewer` - Full transcript with search and copy
- `TranscriptUpload` - Drag-drop file upload
- `SummaryView` - Complete summary display
- `ActionItemList` - Editable action items
- `SentimentIndicator` - Visual sentiment analysis

## Theming

Custom Material-UI theme inspired by Microsoft Teams:
- Primary color: #0078D4 (Microsoft Blue)
- Secondary color: #6264A7 (Teams Purple)
- Segoe UI typography
- Custom shadows and component overrides
- Light mode with professional palette

## Error Handling

Comprehensive error handling throughout:
- API error interception and user-friendly messages
- Loading states for all async operations
- Error boundaries for component failures
- Retry functionality for failed requests
- Toast notifications for user feedback

## Type Safety

Full TypeScript coverage with:
- Strict mode enabled
- Complete API response types
- Component prop interfaces
- Store type definitions
- No use of `any` type

## Performance Optimizations

- Code splitting with Next.js App Router
- Image optimization
- Lazy loading of heavy components
- Debounced search input
- Memoized components where needed
- Efficient state management

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

Follow these guidelines:
1. Create feature branches from `main`
2. Use TypeScript for all new code
3. Keep components focused and reusable
4. Add proper error handling
5. Test responsive design (mobile, tablet, desktop)

## License

Proprietary - Teams Meeting Summary
