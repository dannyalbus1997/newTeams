# Quick Start Guide - Teams Meeting Summary Backend

## Prerequisites

- Node.js 18+
- MongoDB 4.4+
- Microsoft Azure AD application configured
- OpenAI API key

## Setup Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

**Required values:**
```
AZURE_CLIENT_ID=your-azure-client-id
AZURE_CLIENT_SECRET=your-azure-client-secret
AZURE_TENANT_ID=your-azure-tenant-id
AZURE_REDIRECT_URI=http://localhost:3001/api/auth/callback
MONGODB_URI=mongodb://localhost:27017/teams-meeting-summary
JWT_SECRET=your-secret-key-minimum-32-characters
OPENAI_API_KEY=your-openai-api-key
ENCRYPTION_KEY=your-encryption-key-32-chars
ENCRYPTION_IV=your-iv-16-chars
FRONTEND_URL=http://localhost:3000
```

### 3. Start MongoDB

```bash
# If using local MongoDB
mongod

# Or use Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### 4. Run Development Server

```bash
npm run start:dev
```

Server starts at `http://localhost:3001`
Swagger docs at `http://localhost:3001/api/docs`

## API Workflow Example

### 1. User Login
```bash
# Get login URL
curl http://localhost:3001/api/auth/login

# User visits the returned URL and authorizes
# Microsoft redirects to callback with authorization code
```

### 2. Handle Callback
```bash
# The callback returns JWT token
# Frontend should store this token
{
  "appToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user-mongodb-id",
    "email": "user@example.com",
    "displayName": "User Name"
  }
}
```

### 3. Sync Meetings
```bash
curl -X POST http://localhost:3001/api/meetings/sync \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Response
{
  "count": 5,
  "message": "5 meetings synchronized"
}
```

### 4. Get Meetings
```bash
curl http://localhost:3001/api/meetings?page=1&limit=20 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Response includes meetings with pagination
```

### 5. Fetch Transcript
```bash
curl -X POST http://localhost:3001/api/transcripts/:meetingId/fetch \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Returns transcript with structured content
```

### 6. Generate Summary
```bash
curl -X POST http://localhost:3001/api/summaries/:meetingId/generate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Returns AI-generated summary with:
# - Overview
# - Key discussion points
# - Action items
# - Decisions
# - Follow-ups
# - Sentiment analysis
# - Topics
```

### 7. Export Summary as PDF
```bash
curl http://localhost:3001/api/summaries/:meetingId/export/pdf \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -o summary.pdf
```

## Important Endpoints

### Health
- `GET /health` - Check service health

### Authentication
- `GET /api/auth/login` - Start OAuth flow
- `GET /api/auth/callback?code=xxx` - Handle OAuth callback
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Users
- `GET /api/users/profile` - Get user profile
- `PATCH /api/users/profile` - Update profile
- `DELETE /api/users/profile` - Delete account

### Meetings
- `GET /api/meetings` - List meetings
- `GET /api/meetings/:id` - Get meeting details
- `POST /api/meetings/sync` - Sync from Microsoft
- `GET /api/meetings/:id/status` - Check transcript status

### Transcripts
- `GET /api/transcripts/:meetingId` - Get transcript
- `POST /api/transcripts/:meetingId/fetch` - Fetch from Microsoft
- `POST /api/transcripts/:meetingId/upload` - Upload transcript

### Summaries
- `GET /api/summaries/:meetingId` - Get summary
- `POST /api/summaries/:meetingId/generate` - Generate summary
- `POST /api/summaries/:meetingId/regenerate` - Regenerate
- `GET /api/summaries/search/results?q=query` - Search summaries
- `PATCH /api/summaries/:meetingId/action-items/:index` - Update action item
- `GET /api/summaries/:meetingId/export/pdf` - Export as PDF

## Development Commands

```bash
# Start dev server with hot reload
npm run start:dev

# Build for production
npm run build

# Start production server
npm run start:prod

# Run tests
npm run test

# Watch tests
npm run test:watch

# Coverage
npm run test:cov

# Lint
npm run lint

# Format code
npm run format
```

## Database Models

All models use MongoDB with Mongoose. Check the schema files:

- `src/users/schemas/user.schema.ts` - User profile and tokens
- `src/meetings/schemas/meeting.schema.ts` - Meeting information
- `src/transcripts/schemas/transcript.schema.ts` - Transcript content
- `src/summaries/schemas/summary.schema.ts` - Summary data

## Security Notes

1. **Token Encryption**: Microsoft tokens are encrypted at rest
2. **CORS**: Configured for frontend origin only
3. **Rate Limiting**: 100 requests per 15 minutes
4. **Input Validation**: All DTOs validated with class-validator
5. **JWT**: All protected endpoints require valid JWT

## Troubleshooting

### MongoDB Connection Error
```bash
# Check MongoDB is running
mongosh

# Or check connection string in .env
```

### Authentication Fails
- Ensure Azure AD credentials in .env
- Check redirect URI matches in Azure Portal
- Verify refresh token in database is valid

### Summary Generation Fails
- Check OpenAI API key is valid
- Ensure transcript exists before generating
- Check rate limits on OpenAI API

### Transcript Fetch Fails
- Verify user has access to meeting
- Check Microsoft tokens aren't expired
- Ensure meeting has transcript available

## Production Deployment

1. Build the project:
   ```bash
   npm run build
   ```

2. Set production environment variables

3. Start the server:
   ```bash
   npm run start:prod
   ```

4. Use a process manager like PM2:
   ```bash
   npm install -g pm2
   pm2 start dist/main.js --name "teams-summary-api"
   ```

5. Monitor with PM2:
   ```bash
   pm2 logs teams-summary-api
   ```

## API Documentation

Full Swagger documentation available at `/api/docs` when running the server.

All endpoints are fully documented with:
- Request/response schemas
- Required authentication
- Example values
- Status codes
