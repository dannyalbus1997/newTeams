# Teams Meeting Summary

AI-powered Microsoft Teams meeting transcript analysis and summary generation platform.

## Overview

**Teams Meeting Summary** is a comprehensive application that automatically fetches Microsoft Teams meeting transcripts, analyzes them using OpenAI's GPT-4, and generates intelligent summaries with key points, action items, and decisions. Users can view summaries in the web application and export them as professional PDF reports.

## Features

### Core Functionality
- **Seamless Teams Integration**: Connects directly to Microsoft Teams via Azure AD OAuth
- **Automatic Meeting Sync**: Fetches your Teams meetings from calendar
- **Transcript Retrieval**: Automatically obtains meeting transcripts from Teams
- **AI-Powered Summaries**: Generates executive summaries using GPT-4
- **Smart Analysis**: Extracts:
  - Key discussion points
  - Action items with assignees
  - Decisions made
  - Sentiment analysis
  - Q&A generation
- **PDF Export**: Download professional meeting summaries as PDF documents
- **Meeting Search**: Full-text search across all meetings and summaries
- **User Dashboard**: Personalized view of meetings and summaries
- **Secure Authentication**: OAuth 2.0 with Azure AD

### Advanced Features
- **Multi-user Support**: Each user sees only their own meetings
- **Token Management**: Automatic token refresh and secure storage
- **Caching**: Efficient caching of transcripts and summaries
- **Rate Limiting**: API rate limiting to prevent abuse
- **Audit Logging**: Comprehensive logging of all API activities
- **Responsive Design**: Works on desktop, tablet, and mobile

## Tech Stack

### Frontend
- **Framework**: Next.js 14+ (React)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **State Management**: React Context / TanStack Query
- **HTTP Client**: Axios / Fetch API
- **UI Components**: Custom components + Headless UI

### Backend
- **Framework**: NestJS
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT + Azure AD OAuth 2.0
- **External APIs**:
  - Microsoft Graph API (Teams meetings)
  - OpenAI API (GPT-4 summarization)
- **PDF Generation**: PDFKit or similar
- **Validation**: class-validator, class-transformer

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Database**: MongoDB 7.x
- **Package Manager**: npm
- **Node Version**: 20.x LTS

### Deployment
- **Docker**: Multi-stage builds for optimization
- **Cloud Platforms**: Azure App Service, AWS ECS, Kubernetes-ready
- **Databases**: Managed MongoDB Atlas or self-hosted
- **API Keys**: Azure Key Vault integration

## Prerequisites

### Local Development
- Node.js 20.x LTS or higher
- npm 10.x or higher
- Docker 20.10+ and Docker Compose 2.0+
- Git

### Azure Requirements
- Microsoft 365 business account
- Azure subscription
- Access to create App Registrations in Azure AD

### API Keys Required
- **Azure AD**: Application ID, Tenant ID, Client Secret
- **OpenAI**: API key with GPT-4 access
- **Optional**: MongoDB Atlas URI or local MongoDB

## Quick Start Guide

### Local Development Setup

#### 1. Clone Repository

```bash
git clone https://github.com/your-org/teams-meeting-summary.git
cd teams-meeting-summary
```

#### 2. Install Dependencies

```bash
npm run install:all
```

#### 3. Configure Environment Variables

Create `.env` file at project root:

```bash
# Copy from template
cp .env.example .env

# Edit with your credentials
nano .env
```

See [Environment Variables](#environment-variables) section for details.

#### 4. Configure Azure AD

Follow the steps in [ARCHITECTURE.md - Azure AD Configuration](./ARCHITECTURE.md#azure-ad-configuration) to create an App Registration and collect required credentials.

#### 5. Start Development Servers

```bash
# Start both frontend and backend in development mode
npm run dev

# Or run separately:
npm run dev:backend  # Runs on http://localhost:3001
npm run dev:frontend # Runs on http://localhost:3000
```

#### 6. Access Application

Open [http://localhost:3000](http://localhost:3000) in your browser.

Click "Sign in with Teams" and follow OAuth flow.

### Docker Deployment

#### 1. Build Images

```bash
npm run docker:build
```

#### 2. Start Services

```bash
npm run docker:up
```

#### 3. View Logs

```bash
npm run docker:logs
```

#### 4. Access Application

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend API: [http://localhost:3001/api](http://localhost:3001/api)
- MongoDB: `localhost:27017`

#### 5. Stop Services

```bash
npm run docker:down
```

## Environment Variables

### Root Level (.env)

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `NODE_ENV` | Environment (development/production) | Yes | `development` |
| `FRONTEND_URL` | Frontend application URL | Yes | `http://localhost:3000` |
| `REDIRECT_URI` | OAuth redirect URI for Azure | Yes | `http://localhost:3001/api/auth/callback` |

### MongoDB Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `MONGO_ROOT_USER` | MongoDB root username | Yes | `admin` |
| `MONGO_ROOT_PASSWORD` | MongoDB root password | Yes | `your-strong-password` |
| `MONGO_DATABASE` | Database name | Yes | `teams-meeting-summary` |
| `MONGO_URI` | Full MongoDB connection string | Yes | `mongodb://admin:pass@mongo:27017/db?authSource=admin` |

### JWT/Authentication Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `JWT_SECRET` | Secret key for JWT signing | Yes | `your-32-character-random-string-here` |
| `JWT_EXPIRATION` | JWT expiration in seconds | No | `3600` |

### Azure AD Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `AZURE_CLIENT_ID` | Azure App Registration client ID | Yes | `12345678-1234-1234-1234-123456789012` |
| `AZURE_CLIENT_SECRET` | Azure App Registration client secret | Yes | `client-secret-from-azure` |
| `AZURE_TENANT_ID` | Azure AD tenant ID | Yes | `12345678-1234-1234-1234-123456789012` |

### OpenAI Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `OPENAI_API_KEY` | OpenAI API key | Yes | `sk-...` |
| `OPENAI_MODEL` | OpenAI model to use | No | `gpt-4` |

### Logging Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `LOG_LEVEL` | Logging level | No | `info` |

### Frontend-Specific Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL (exposed to client) | Yes | `http://localhost:3001/api` |
| `NEXT_PUBLIC_APP_NAME` | Application display name | No | `Teams Meeting Summary` |
| `NEXT_PUBLIC_APP_DESCRIPTION` | Application description | No | `AI-powered summary tool` |

## Project Structure

```
teams-meeting-summary/
├── backend/                          # NestJS backend application
│   ├── src/
│   │   ├── main.ts                  # Application entry point
│   │   ├── app.module.ts            # Root module
│   │   ├── auth/                    # Authentication module
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── jwt.strategy.ts
│   │   │   ├── azure.strategy.ts
│   │   │   └── decorators/
│   │   ├── meetings/                # Meeting module
│   │   │   ├── meetings.controller.ts
│   │   │   ├── meetings.service.ts
│   │   │   ├── schemas/meeting.schema.ts
│   │   │   └── dto/
│   │   ├── transcripts/             # Transcript module
│   │   │   ├── transcripts.controller.ts
│   │   │   ├── transcripts.service.ts
│   │   │   ├── schemas/transcript.schema.ts
│   │   │   └── dto/
│   │   ├── summaries/               # Summary module
│   │   │   ├── summaries.controller.ts
│   │   │   ├── summaries.service.ts
│   │   │   ├── schemas/summary.schema.ts
│   │   │   └── dto/
│   │   ├── exports/                 # Export/PDF module
│   │   │   ├── exports.controller.ts
│   │   │   ├── exports.service.ts
│   │   │   ├── schemas/export.schema.ts
│   │   │   └── templates/
│   │   ├── users/                   # User module
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   └── schemas/user.schema.ts
│   │   ├── common/                  # Shared utilities
│   │   │   ├── decorators/
│   │   │   ├── guards/
│   │   │   ├── interceptors/
│   │   │   ├── pipes/
│   │   │   ├── exceptions/
│   │   │   └── utils/
│   │   ├── config/                  # Configuration
│   │   │   ├── database.config.ts
│   │   │   ├── auth.config.ts
│   │   │   ├── openai.config.ts
│   │   │   └── microsoft-graph.config.ts
│   │   └── health/                  # Health check endpoint
│   ├── test/                        # Integration tests
│   ├── Dockerfile
│   ├── tsconfig.json
│   ├── package.json
│   └── nest-cli.json
│
├── frontend/                         # Next.js frontend application
│   ├── src/
│   │   ├── app/                     # Next.js app directory
│   │   │   ├── layout.tsx           # Root layout
│   │   │   ├── page.tsx             # Home page
│   │   │   ├── dashboard/           # Dashboard pages
│   │   │   │   ├── page.tsx
│   │   │   │   ├── meetings/
│   │   │   │   ├── summaries/
│   │   │   │   └── settings/
│   │   │   ├── api/                 # Route handlers
│   │   │   │   └── auth/
│   │   │   └── auth/                # Auth pages
│   │   │       ├── login/
│   │   │       └── callback/
│   │   ├── components/              # React components
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── MeetingList.tsx
│   │   │   ├── MeetingDetail.tsx
│   │   │   ├── SummaryView.tsx
│   │   │   ├── ExportButton.tsx
│   │   │   └── common/
│   │   ├── lib/                     # Client utilities
│   │   │   ├── api.ts
│   │   │   ├── auth.ts
│   │   │   ├── hooks.ts
│   │   │   └── types.ts
│   │   ├── context/                 # React context
│   │   │   ├── AuthContext.tsx
│   │   │   └── AppContext.tsx
│   │   ├── styles/                  # Global styles
│   │   └── types/                   # TypeScript types
│   ├── public/                      # Static assets
│   │   ├── icons/
│   │   ├── images/
│   │   └── logo.svg
│   ├── Dockerfile
│   ├── next.config.js
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── package.json
│
├── docker-compose.yml               # Docker compose configuration
├── .dockerignore                    # Docker ignore file
├── .gitignore                       # Git ignore file
├── .env.example                     # Environment variables template
├── ARCHITECTURE.md                  # Architecture documentation
├── README.md                        # This file
├── package.json                     # Root package.json (monorepo)
└── LICENSE                          # MIT License

```

## API Endpoints Summary

### Authentication
- `POST /api/auth/login` - Initiate OAuth login
- `GET /api/auth/callback` - OAuth callback handler
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/refresh` - Refresh JWT token

### Meetings
- `GET /api/meetings` - Get user's meetings
- `GET /api/meetings/:id` - Get specific meeting
- `POST /api/meetings/sync` - Manually sync meetings
- `GET /api/meetings/:id/status` - Get meeting sync status

### Transcripts
- `GET /api/transcripts` - Get all transcripts
- `GET /api/transcripts/:id` - Get specific transcript
- `GET /api/meetings/:meetingId/transcript` - Get meeting's transcript

### Summaries
- `GET /api/summaries` - Get all summaries
- `GET /api/summaries/:id` - Get specific summary
- `POST /api/summaries` - Generate new summary
- `DELETE /api/summaries/:id` - Delete summary

### Exports
- `POST /api/exports` - Create PDF export
- `GET /api/exports/:id` - Get export details
- `GET /api/exports/:id/download` - Download PDF file
- `DELETE /api/exports/:id` - Delete export

### Users
- `GET /api/users/me` - Get current user profile
- `PUT /api/users/me` - Update user profile
- `DELETE /api/users/me` - Delete user account

### Health
- `GET /health` - Health check endpoint
- `GET /health/db` - Database health check

## Usage Guide

### For End Users

#### 1. Sign In
- Click "Sign in with Teams"
- Authenticate with your Microsoft 365 account
- Grant application permissions when prompted

#### 2. View Meetings
- Dashboard shows all your Teams meetings
- Filter by date, organizer, or search by topic
- Click on a meeting to view details

#### 3. Generate Summaries
- Click "Generate Summary" on a meeting
- Wait for AI processing (typically 30-60 seconds)
- View the generated summary with key points and action items

#### 4. Export as PDF
- Click "Download PDF" to generate report
- PDF includes meeting details, transcript, and summary
- File downloads to your computer

#### 5. Manage Preferences
- Go to Settings to customize summary preferences
- Choose which information to include in summaries
- Manage email notifications

### For Developers

#### Running Tests

```bash
# Backend tests
cd backend && npm run test

# Backend e2e tests
cd backend && npm run test:e2e

# Frontend tests
cd frontend && npm run test

# All tests
npm run test
```

#### Building for Production

```bash
# Build all packages
npm run build

# Build individual packages
npm run build:backend
npm run build:frontend

# Build Docker images
npm run docker:build
```

#### Code Quality

```bash
# Linting
cd backend && npm run lint
cd frontend && npm run lint

# Type checking
cd backend && npm run type-check
cd frontend && npm run type-check

# Code formatting
cd backend && npm run format
cd frontend && npm run format
```

## Screenshots

### Authentication Flow
[Screenshot: Microsoft Teams login screen]

### Dashboard
[Screenshot: Meeting list with summaries]

### Summary View
[Screenshot: Generated summary with key points and action items]

### PDF Export
[Screenshot: Professional PDF report]

## Security Considerations

- All authentication handled via OAuth 2.0 with Azure AD
- Tokens encrypted at rest in MongoDB
- HTTPS/TLS required for all API calls
- CORS configured to allow only frontend origin
- Input validation on all API endpoints
- Rate limiting to prevent abuse
- Comprehensive audit logging
- No sensitive data logged or exposed in errors

See [ARCHITECTURE.md - Security Best Practices](./ARCHITECTURE.md#security-best-practices) for detailed security information.

## Performance

### Optimization Strategies
- **Frontend**: Code splitting, lazy loading, image optimization
- **Backend**: Connection pooling, caching, request batching
- **Database**: Indexing, query optimization, pagination
- **API**: Response compression, CDN for static assets

### Expected Performance
- Meeting list load: <500ms
- Transcript fetch: <2 seconds
- Summary generation: 30-60 seconds (depends on meeting length)
- PDF export: <10 seconds

## Troubleshooting

### Common Issues

#### "Invalid redirect URI" error
- Verify Azure App Registration redirect URI matches .env file
- Ensure trailing slashes match exactly

#### "Permission denied" for transcript access
- Check Azure AD permissions in App Registration
- Ensure admin consent has been granted
- Verify user has access to the Teams meeting

#### OpenAI API errors
- Check API key is valid and not expired
- Verify sufficient API quota/credits
- Monitor rate limits

#### MongoDB connection issues
- Ensure MongoDB is running
- Verify connection string in .env
- Check network connectivity for MongoDB Atlas

For more troubleshooting, see ARCHITECTURE.md or create an issue on GitHub.

## Contributing

### Code Style
- Use TypeScript for all new code
- Follow ESLint configuration
- Format code with Prettier
- Add tests for new features

### Pull Request Process
1. Create feature branch: `git checkout -b feature/my-feature`
2. Commit changes: `git commit -m "Add my feature"`
3. Push to GitHub: `git push origin feature/my-feature`
4. Create Pull Request with description
5. Ensure all tests pass
6. Wait for code review

### Testing Requirements
- Unit tests for services and utilities
- Integration tests for API endpoints
- E2E tests for critical user flows
- Maintain >80% code coverage

## Deployment

### Development Deployment
```bash
npm run dev
```

### Docker Deployment
```bash
npm run docker:build
npm run docker:up
```

### Azure App Service Deployment
See [ARCHITECTURE.md - Azure App Service Deployment](./ARCHITECTURE.md#azure-app-service-deployment)

### Kubernetes Deployment
```bash
# Create deployment manifests
kubectl apply -f k8s/mongo-deployment.yaml
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml
```

## License

This project is licensed under the MIT License - see LICENSE file for details.

## Support

For issues and questions:
- GitHub Issues: [Create an issue](https://github.com/your-org/teams-meeting-summary/issues)
- Email Support: [support@example.com](mailto:support@example.com)
- Documentation: [ARCHITECTURE.md](./ARCHITECTURE.md)

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history and updates.

## Acknowledgments

- Microsoft Teams and Microsoft Graph API
- OpenAI for GPT-4 API
- NestJS community
- Next.js team

## Roadmap

### Upcoming Features
- [ ] Multi-language support
- [ ] Slack integration
- [ ] Custom summary templates
- [ ] Analytics dashboard
- [ ] Scheduled summary emails
- [ ] Meeting recording transcription
- [ ] Sentiment analysis dashboard
- [ ] Team collaboration features

## Contact

For more information or partnership inquiries:
- Website: https://example.com
- Email: info@example.com
- Twitter: @example

---

**Last Updated**: March 2026
**Version**: 1.0.0
