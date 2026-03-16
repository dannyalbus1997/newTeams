# Teams Meeting Summary - Architecture Documentation

## Table of Contents
1. [System Architecture](#system-architecture)
2. [API Flow Diagrams](#api-flow-diagrams)
3. [Azure AD Configuration](#azure-ad-configuration)
4. [Microsoft Graph API Endpoints](#microsoft-graph-api-endpoints)
5. [MongoDB Schema Design](#mongodb-schema-design)
6. [Security Best Practices](#security-best-practices)
7. [Deployment Guide](#deployment-guide)

---

## System Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                                 │
│                    (Web Application Client)                          │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              │ HTTP/HTTPS
                              │
                ┌─────────────▼──────────────────┐
                │    NEXT.JS FRONTEND (3000)     │
                │  ✓ React Components            │
                │  ✓ OAuth 2.0 Flow              │
                │  ✓ Meeting List/Details        │
                │  ✓ Transcript Display          │
                │  ✓ Summary Viewer              │
                │  ✓ PDF Export UI               │
                └─────────────┬──────────────────┘
                              │
                              │ REST API
                              │
                ┌─────────────▼──────────────────────────────┐
                │     NESTJS BACKEND (3001)                  │
                │  ✓ Authentication Module                   │
                │  ✓ Meeting Sync Service                    │
                │  ✓ Transcript Fetch Service                │
                │  ✓ AI Summary Service                      │
                │  ✓ PDF Export Service                      │
                │  ✓ User Management                         │
                └──┬────────┬──────────┬────────┬────────────┘
                   │        │          │        │
        ┌──────────┘        │          │        └─────────────┐
        │                   │          │                      │
        │            ┌──────▼──────┐   │   ┌─────────────────▼───┐
        │            │  MONGODB    │   │   │  MICROSOFT GRAPH API│
        │            │  (Database) │   │   │  (Cloud Services)   │
        │            │  ✓ Users    │   │   │  ✓ Authentication   │
        │            │  ✓ Meetings │   │   │  ✓ Calendar Events  │
        │            │  ✓ Summaries│   │   │  ✓ Transcripts      │
        │            │  ✓ Exports  │   │   │  ✓ Recordings       │
        │            └─────────────┘   │   └─────────────────────┘
        │                              │
        └──────────────────┬───────────┘
                          │
                ┌─────────▼──────────────┐
                │  OPENAI API            │
                │  ✓ GPT-4 Model         │
                │  ✓ Summarization       │
                │  ✓ Key Points Extract  │
                │  ✓ Q&A Generation      │
                └────────────────────────┘
```

### Component Descriptions

#### Frontend (Next.js)
- **Purpose**: Provide user interface for meeting management and summary viewing
- **Key Features**:
  - OAuth 2.0 authentication with Azure AD
  - Display list of Teams meetings
  - Show meeting transcripts
  - Display AI-generated summaries
  - Generate and download PDF reports
  - User profile management
- **Port**: 3000
- **Technology**: React, Next.js, TypeScript, TailwindCSS

#### Backend (NestJS)
- **Purpose**: Handle API requests, authentication, data synchronization, and AI processing
- **Key Modules**:
  - **Auth Module**: OAuth 2.0 flow, JWT token management
  - **Meeting Module**: Fetch and store meetings from Microsoft Graph
  - **Transcript Module**: Retrieve meeting transcripts
  - **Summary Module**: Generate AI summaries using OpenAI
  - **Export Module**: Create PDF reports
  - **User Module**: Manage user profiles and preferences
- **Port**: 3001
- **Technology**: NestJS, TypeScript, Mongoose

#### Database (MongoDB)
- **Purpose**: Persistent storage for users, meetings, transcripts, and summaries
- **Collections**:
  - `users`: User profiles and authentication tokens
  - `meetings`: Meeting metadata and sync status
  - `transcripts`: Full meeting transcripts
  - `summaries`: AI-generated summaries
  - `exports`: PDF export records
- **Port**: 27017
- **Volume**: `mongo-data` for persistence

#### Microsoft Graph API
- **Purpose**: Access Teams meetings, transcripts, and recordings
- **Responsibilities**:
  - User authentication and profile information
  - Listing user's calendar events (Teams meetings)
  - Fetching meeting transcripts
  - Retrieving recording URLs
  - Providing meeting metadata
- **Authentication**: OAuth 2.0 with Azure AD

#### OpenAI API
- **Purpose**: Generate intelligent summaries and extract key information
- **Capabilities**:
  - Summarize meeting transcripts
  - Extract action items
  - Generate key points
  - Create Q&A sections
  - Identify decision items
- **Model**: GPT-4 (configurable)

---

## API Flow Diagrams

### 1. Authentication Flow (OAuth 2.0 Code Grant)

```
┌─────────────┐                    ┌──────────────┐                    ┌─────────────────┐
│             │                    │              │                    │                 │
│   Browser   │                    │   Backend    │                    │    Azure AD     │
│  (Frontend) │                    │   (NestJS)   │                    │    (OAuth)      │
│             │                    │              │                    │                 │
└──────┬──────┘                    └──────┬───────┘                    └────────┬────────┘
       │                                   │                                    │
       │ 1. Click "Login with Teams"      │                                    │
       ├──────────────────────────────────────────────────────────────────────►│
       │                                   │                                    │
       │                                   │ 2. Redirect to Azure AD login      │
       │◄──────────────────────────────────┴────────────────────────────────────┤
       │                                   │                                    │
       │ 3. User enters credentials      │                                    │
       │─────────────────────────────────────────────────────────────────────► │
       │                                   │                                    │
       │                     4. Generate auth code                             │
       │◄──────────────────────────────────┬────────────────────────────────────┤
       │                                   │                                    │
       │ 5. Redirect to /api/auth/callback with code                          │
       ├──────────────────────────────────►│                                    │
       │                                   │                                    │
       │                                   │ 6. Exchange code for token         │
       │                                   ├───────────────────────────────────►│
       │                                   │                                    │
       │                                   │ 7. Return access & refresh tokens  │
       │                                   │◄────────────────────────────────────┤
       │                                   │                                    │
       │                                   │ 8. Store tokens in MongoDB         │
       │                                   │ Generate JWT token                 │
       │                                   │                                    │
       │ 9. Redirect to dashboard with JWT                                    │
       │◄──────────────────────────────────┤                                    │
       │                                   │                                    │
       │ 10. Store JWT in secure cookie   │                                    │
       ├──────────────────────────────────────────────────────────────────────→│
       │                                   │                                    │

User logged in successfully - JWT stored, can make authenticated requests
```

### 2. Meeting Sync Flow

```
┌──────────┐        ┌──────────────┐        ┌──────────────────┐        ┌──────────┐
│          │        │              │        │                  │        │          │
│ Frontend │        │   Backend    │        │  Microsoft Graph │        │ MongoDB  │
│          │        │   (NestJS)   │        │      API         │        │          │
│          │        │              │        │                  │        │          │
└────┬─────┘        └──────┬───────┘        └────────┬─────────┘        └────┬─────┘
     │                     │                         │                       │
     │ 1. GET /meetings   │                         │                       │
     ├────────────────────►│                         │                       │
     │                     │                         │                       │
     │                     │ 2. Validate JWT        │                       │
     │                     │ Get user's access token│                       │
     │                     │                         │                       │
     │                     │ 3. GET /me/calendar... │                       │
     │                     ├────────────────────────►│                       │
     │                     │                         │                       │
     │                     │ 4. Return meetings list│                       │
     │                     │◄────────────────────────┤                       │
     │                     │                         │                       │
     │                     │ 5. Check if meetings  │                       │
     │                     │    already in DB      │                       │
     │                     │ Transform & filter    │                       │
     │                     │                         │                       │
     │                     │ 6. Insert/Update      │                       │
     │                     │    meetings in DB     │                       │
     │                     ├────────────────────────────────────────────────►│
     │                     │                         │                       │
     │                     │ 7. Return meetings    │                       │
     │◄────────────────────┤                         │                       │
     │                     │                         │                       │
     │ 8. Display meetings list                      │                       │
     │                     │                         │                       │

New meetings synced to database, ready for transcript fetching
```

### 3. Transcript Fetch Flow

```
┌──────────┐        ┌──────────────┐        ┌──────────────────┐        ┌──────────┐
│          │        │              │        │                  │        │          │
│ Frontend │        │   Backend    │        │  Microsoft Graph │        │ MongoDB  │
│          │        │   (NestJS)   │        │      API         │        │          │
│          │        │              │        │                  │        │          │
└────┬─────┘        └──────┬───────┘        └────────┬─────────┘        └────┬─────┘
     │                     │                         │                       │
     │ 1. GET /meetings/:id/transcript                 │                       │
     ├────────────────────►│                         │                       │
     │                     │                         │                       │
     │                     │ 2. Validate JWT        │                       │
     │                     │ Check meeting exists   │                       │
     │                     │                         │                       │
     │                     │ 3. Check cache in DB   │                       │
     │                     ├────────────────────────────────────────────────►│
     │                     │◄────────────────────────────────────────────────┤
     │                     │                         │                       │
     │                     │ If not cached:         │                       │
     │                     │ GET /me/onlineMeetings/:meetingId/transcripts   │
     │                     ├────────────────────────►│                       │
     │                     │                         │                       │
     │                     │ 4. Return transcript   │                       │
     │                     │◄────────────────────────┤                       │
     │                     │                         │                       │
     │                     │ 5. Parse & store      │                       │
     │                     │    transcript in DB   │                       │
     │                     ├────────────────────────────────────────────────►│
     │                     │                         │                       │
     │                     │ 6. Return transcript  │                       │
     │◄────────────────────┤                         │                       │
     │                     │                         │                       │
     │ 7. Display transcript content                 │                       │
     │                     │                         │                       │

Transcript retrieved and cached for summary generation
```

### 4. AI Summary Generation Flow

```
┌──────────┐        ┌──────────────┐        ┌──────────────┐        ┌──────────┐        ┌─────────┐
│          │        │              │        │   MongoDB    │        │ OpenAI  │        │ MongoDB │
│ Frontend │        │   Backend    │        │   (Cache)    │        │   API   │        │(Store) │
│          │        │   (NestJS)   │        │              │        │         │        │        │
│          │        │              │        │              │        │         │        │        │
└────┬─────┘        └──────┬───────┘        └──────┬───────┘        └────┬────┘        └───┬────┘
     │                     │                       │                      │                 │
     │ 1. POST /summaries (meetingId)              │                      │                 │
     ├────────────────────►│                       │                      │                 │
     │                     │                       │                      │                 │
     │                     │ 2. Validate JWT      │                      │                 │
     │                     │    Fetch transcript  │                      │                 │
     │                     ├──────────────────────►│                      │                 │
     │                     │◄──────────────────────┤                      │                 │
     │                     │                       │                      │                 │
     │                     │ 3. Check if summary │                      │                 │
     │                     │    already exists   │                      │                 │
     │                     ├──────────────────────►│                      │                 │
     │                     │◄──────────────────────┤                      │                 │
     │                     │                       │                      │                 │
     │                     │ If not: Prepare    │                      │                 │
     │                     │ transcript for AI  │                      │                 │
     │                     │ (chunk if needed)  │                      │                 │
     │                     │                     │                      │                 │
     │                     │ 4. POST /chat/completions                  │                 │
     │                     │    (with transcript & prompts)              │                 │
     │                     ├────────────────────────────────────────────►│                 │
     │                     │                     │                      │                 │
     │                     │ 5. Return summary  │                      │                 │
     │                     │    (streaming or   │                      │                 │
     │                     │     complete)      │                      │                 │
     │                     │◄────────────────────────────────────────────┤                 │
     │                     │                     │                      │                 │
     │                     │ 6. Parse & format│                      │                 │
     │                     │    summary       │                      │                 │
     │                     │    (JSON)        │                      │                 │
     │                     │                     │                      │                 │
     │                     │ 7. Store summary with metadata            │                 │
     │                     ├──────────────────────────────────────────────────────────────►│
     │                     │                     │                      │                 │
     │                     │ 8. Return summary  │                      │                 │
     │◄────────────────────┤                     │                      │                 │
     │                     │                     │                      │                 │
     │ 9. Display summary   │                     │                      │                 │
     │    with formatting  │                     │                      │                 │
     │                     │                     │                      │                 │

AI-generated summary ready for viewing or export
```

### 5. PDF Export Flow

```
┌──────────┐        ┌──────────────┐        ┌──────────────┐        ┌──────────┐
│          │        │              │        │   MongoDB    │        │   File  │
│ Frontend │        │   Backend    │        │   (Fetch)    │        │ System  │
│          │        │   (NestJS)   │        │              │        │ (Store) │
│          │        │              │        │              │        │         │
└────┬─────┘        └──────┬───────┘        └──────┬───────┘        └────┬────┘
     │                     │                       │                     │
     │ 1. POST /exports (meetingId)                │                     │
     ├────────────────────►│                       │                     │
     │                     │                       │                     │
     │                     │ 2. Validate JWT      │                     │
     │                     │ Fetch meeting data   │                     │
     │                     ├──────────────────────►│                     │
     │                     │◄──────────────────────┤                     │
     │                     │                       │                     │
     │                     │ 3. Fetch transcript │                     │
     │                     ├──────────────────────►│                     │
     │                     │◄──────────────────────┤                     │
     │                     │                       │                     │
     │                     │ 4. Fetch summary   │                     │
     │                     ├──────────────────────►│                     │
     │                     │◄──────────────────────┤                     │
     │                     │                       │                     │
     │                     │ 5. Generate PDF     │                     │
     │                     │ (header, metadata,  │                     │
     │                     │  summary, sections) │                     │
     │                     │                     │                     │
     │                     │ 6. Store PDF file  │                     │
     │                     ├────────────────────────────────────────────►│
     │                     │                     │                     │
     │                     │ 7. Record export   │                     │
     │                     │    in metadata     │                     │
     │                     ├──────────────────────►│                     │
     │                     │◄──────────────────────┤                     │
     │                     │                       │                     │
     │                     │ 8. Return download  │                     │
     │                     │    link/stream PDF  │                     │
     │◄────────────────────┤                       │                     │
     │                     │                       │                     │
     │ 9. Download PDF    │                       │                     │
     │ to user's computer  │                       │                     │
     │                     │                       │                     │

PDF report generated and downloaded for offline viewing
```

---

## Azure AD Configuration

### Prerequisites
- Microsoft 365 business account
- Access to Azure Portal (portal.azure.com)
- NestJS backend running on localhost:3001 (or deployed URL)

### Step-by-Step Configuration Guide

#### 1. Create Application Registration

1. Navigate to [Azure Portal](https://portal.azure.com)
2. Go to **Azure Active Directory** → **App Registrations**
3. Click **+ New registration**
4. Fill in the form:
   - **Name**: `Teams Meeting Summary`
   - **Supported account types**: `Accounts in any organizational directory (Any Azure AD directory - Multitenant)`
   - Click **Register**

#### 2. Configure Redirect URIs

1. In the App Registration, go to **Authentication**
2. Under **Platform configurations**, click **+ Add a platform**
3. Select **Web**
4. Add Redirect URI:
   - **Redirect URI**: `http://localhost:3001/api/auth/callback`
   - For production: `https://yourdomain.com/api/auth/callback`
5. Check **Access tokens** and **ID tokens** under **Implicit grant and hybrid flows**
6. Click **Configure**

#### 3. Add API Permissions

1. In the App Registration, go to **API permissions**
2. Click **+ Add a permission**
3. Select **Microsoft Graph**
4. Select **Delegated permissions**
5. Add the following permissions:
   - `User.Read` - Read user profile
   - `Calendars.Read` - Read user calendar events
   - `OnlineMeetings.Read` - Read Teams meetings
   - `OnlineMeetingTranscript.Read.All` - Read meeting transcripts
   - `OnlineMeetingRecording.Read.All` - Read recording URLs
   - `offline_access` - Access when user is offline
6. Click **Add permissions**

#### 4. Grant Admin Consent

1. Still in **API permissions**, click **Grant admin consent for [Organization Name]**
2. Confirm the action
3. All permissions should now show with a green checkmark

#### 5. Create Client Secret

1. In the App Registration, go to **Certificates & secrets**
2. Click **+ New client secret**
3. Fill in:
   - **Description**: `Backend API Key`
   - **Expires**: `24 months` (or your preferred duration)
4. Click **Add**
5. **Copy the Value immediately** - it will not be shown again
   - This is your `AZURE_CLIENT_SECRET`

#### 6. Collect Configuration Values

In the App Registration overview, collect:
- **Application (client) ID** → `AZURE_CLIENT_ID`
- **Directory (tenant) ID** → `AZURE_TENANT_ID`
- **Client Secret Value** (from step 5) → `AZURE_CLIENT_SECRET`

### Environment Variables Configuration

Update your `.env` file with the collected values:

```env
# Azure AD Configuration
AZURE_CLIENT_ID=<Application ID from step 6>
AZURE_CLIENT_SECRET=<Secret Value from step 5>
AZURE_TENANT_ID=<Directory ID from step 6>
REDIRECT_URI=http://localhost:3001/api/auth/callback
```

### Troubleshooting Azure AD Configuration

| Issue | Solution |
|-------|----------|
| Invalid redirect URI error | Ensure exact match in Azure portal and .env file |
| Permission consent error | Check that admin has granted consent in step 4 |
| Token generation fails | Verify Client Secret is copied correctly and not expired |
| Meeting data not loading | Confirm `Calendars.Read` and `OnlineMeetings.Read` permissions |
| Transcript access denied | Check `OnlineMeetingTranscript.Read.All` permission granted |

---

## Microsoft Graph API Endpoints

| Method | Endpoint | Description | Required Permission |
|--------|----------|-------------|---------------------|
| GET | `/me` | Get current user profile | `User.Read` |
| GET | `/me/calendar/events` | List user's calendar events | `Calendars.Read` |
| GET | `/me/calendar/events?$filter=categories/any(c:c eq 'Online Meeting')` | List Teams meetings | `Calendars.Read` |
| GET | `/me/onlineMeetings` | List user's online meetings | `OnlineMeetings.Read` |
| GET | `/me/onlineMeetings/{meetingId}` | Get specific online meeting | `OnlineMeetings.Read` |
| GET | `/me/onlineMeetings/{meetingId}/transcripts` | List meeting transcripts | `OnlineMeetingTranscript.Read.All` |
| GET | `/me/onlineMeetings/{meetingId}/transcripts/{transcriptId}/content` | Get transcript content | `OnlineMeetingTranscript.Read.All` |
| GET | `/me/onlineMeetings/{meetingId}/recordings` | List recording URLs | `OnlineMeetingRecording.Read.All` |
| POST | `/oauth2/v2.0/token` | Exchange auth code for token | (Azure AD Token Endpoint) |
| POST | `/oauth2/v2.0/token` (with refresh_token) | Refresh access token | (Azure AD Token Endpoint) |

### Example Request: Get Calendar Events

```bash
GET https://graph.microsoft.com/v1.0/me/calendar/events
Authorization: Bearer {access_token}
Content-Type: application/json

Query Parameters:
  $filter=start/dateTime ge '2024-01-01'
  $orderby=start/dateTime desc
  $select=id,subject,start,end,isOnlineMeeting,onlineMeetingUrl
```

### Example Request: Get Transcript

```bash
GET https://graph.microsoft.com/v1.0/me/onlineMeetings/{meetingId}/transcripts/{transcriptId}/content
Authorization: Bearer {access_token}
```

---

## MongoDB Schema Design

### Collections and Relationships

```
┌─────────────────────────────────────────────────────────────────────┐
│                           MONGODB DATABASE                           │
│                     teams-meeting-summary                            │
└─────────────────────────────────────────────────────────────────────┘
  │
  ├─ users
  │  ├─ _id: ObjectId
  │  ├─ email: String (unique)
  │  ├─ firstName: String
  │  ├─ lastName: String
  │  ├─ displayName: String
  │  ├─ azureId: String (unique)
  │  ├─ accessToken: String (encrypted)
  │  ├─ refreshToken: String (encrypted)
  │  ├─ tokenExpiry: Date
  │  ├─ createdAt: Date
  │  └─ updatedAt: Date
  │
  ├─ meetings
  │  ├─ _id: ObjectId
  │  ├─ userId: ObjectId → users._id
  │  ├─ graphId: String (Teams meeting ID)
  │  ├─ title: String
  │  ├─ description: String
  │  ├─ startTime: Date
  │  ├─ endTime: Date
  │  ├─ organizer: String
  │  ├─ participants: [String]
  │  ├─ isOnlineMeeting: Boolean
  │  ├─ joinUrl: String
  │  ├─ recordingUrl: String
  │  ├─ transcriptAvailable: Boolean
  │  ├─ lastSyncedAt: Date
  │  ├─ createdAt: Date
  │  └─ updatedAt: Date
  │
  ├─ transcripts
  │  ├─ _id: ObjectId
  │  ├─ meetingId: ObjectId → meetings._id
  │  ├─ userId: ObjectId → users._id
  │  ├─ graphTranscriptId: String
  │  ├─ content: String (full transcript text)
  │  ├─ speakers: [{
  │  │  ├─ id: String
  │  │  ├─ name: String
  │  │  └─ role: String
  │  │}]
  │  ├─ duration: Number (seconds)
  │  ├─ language: String
  │  ├─ fetchedAt: Date
  │  ├─ createdAt: Date
  │  └─ updatedAt: Date
  │
  ├─ summaries
  │  ├─ _id: ObjectId
  │  ├─ meetingId: ObjectId → meetings._id
  │  ├─ userId: ObjectId → users._id
  │  ├─ transcriptId: ObjectId → transcripts._id
  │  ├─ summary: String (executive summary)
  │  ├─ keyPoints: [String]
  │  ├─ actionItems: [{
  │  │  ├─ item: String
  │  │  ├─ assignee: String
  │  │  └─ dueDate: Date
  │  │}]
  │  ├─ decisions: [String]
  │  ├─ sentiment: String (positive/neutral/negative)
  │  ├─ confidence: Number (0-1)
  │  ├─ generatedAt: Date
  │  ├─ generatedBy: String (gpt-4, etc.)
  │  ├─ tokens_used: Number
  │  ├─ createdAt: Date
  │  └─ updatedAt: Date
  │
  └─ exports
     ├─ _id: ObjectId
     ├─ meetingId: ObjectId → meetings._id
     ├─ summaryId: ObjectId → summaries._id
     ├─ userId: ObjectId → users._id
     ├─ format: String (pdf, docx, txt)
     ├─ filename: String
     ├─ filePath: String
     ├─ fileSize: Number (bytes)
     ├─ downloadUrl: String
     ├─ expiresAt: Date
     ├─ exportedAt: Date
     ├─ createdAt: Date
     └─ updatedAt: Date
```

### MongoDB Indexes

```javascript
// users collection
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ azureId: 1 }, { unique: true })

// meetings collection
db.meetings.createIndex({ userId: 1, startTime: -1 })
db.meetings.createIndex({ userId: 1, graphId: 1 }, { unique: true })
db.meetings.createIndex({ startTime: -1 })

// transcripts collection
db.transcripts.createIndex({ meetingId: 1 }, { unique: true })
db.transcripts.createIndex({ userId: 1 })

// summaries collection
db.summaries.createIndex({ meetingId: 1 }, { unique: true })
db.summaries.createIndex({ userId: 1 })
db.summaries.createIndex({ generatedAt: -1 })

// exports collection
db.exports.createIndex({ userId: 1, createdAt: -1 })
db.exports.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
```

---

## Security Best Practices

### 1. Token Management

**Access Tokens (JWT)**
- Short expiration (1-2 hours)
- Issued by backend after OAuth callback
- Stored in httpOnly cookies (not localStorage)
- Refresh token used to obtain new access tokens

**Refresh Tokens**
- Encrypted in MongoDB
- 30-day expiration
- Rotated on each refresh
- Revoked on logout

```typescript
// Example JWT payload
{
  sub: "user-id",
  email: "user@example.com",
  iat: 1234567890,
  exp: 1234571490, // 1 hour
  permissions: ["read:meetings", "read:transcripts"]
}
```

### 2. Data Encryption

**At Rest**
- Azure AD client secret encrypted with process.env.ENCRYPTION_KEY
- Refresh tokens encrypted before storage
- PII masked in logs

**In Transit**
- HTTPS/TLS for all API endpoints
- No sensitive data in URL parameters
- Encrypted environment variables

### 3. Authentication & Authorization

**OAuth 2.0 with Azure AD**
- No direct password storage
- Code grant flow (most secure for web apps)
- PKCE consideration for mobile apps
- Admin consent required for API permissions

**Role-Based Access Control (RBAC)**
```typescript
// Decorator example
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'user')
@Get('meetings')
async getMeetings() {
  // Only authenticated users with admin or user role
}
```

### 4. Input Validation

```typescript
// Example using class-validator
import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  firstName: string;

  @IsString()
  @MinLength(2)
  lastName: string;
}

// Validation in controller
@Post('users')
async createUser(@Body(new ValidationPipe()) createUserDto: CreateUserDto) {
  // Validated input
}
```

### 5. Security Headers (Helmet.js)

```typescript
import helmet from 'helmet';

app.use(helmet());
// Sets:
// - Content-Security-Policy
// - X-Frame-Options: DENY
// - X-Content-Type-Options: nosniff
// - X-XSS-Protection: 1; mode=block
// - Strict-Transport-Security
```

### 6. CORS Configuration

```typescript
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

const corsOptions: CorsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.enableCors(corsOptions);
```

### 7. Rate Limiting

```typescript
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
```

### 8. Logging & Monitoring

**What to Log**
- Authentication attempts (success and failure)
- API endpoint access
- Data modifications
- Error conditions with stack traces

**What NOT to Log**
- Passwords or tokens
- Credit card numbers
- SSN or other PII
- Full request/response bodies with sensitive data

```typescript
// Safe logging example
logger.log(`User ${userId} accessed meeting ${meetingId}`, 'MeetingService');
logger.error(`Failed to fetch transcript: ${error.message}`, 'TranscriptService');
```

### 9. Environment Variable Management

```bash
# .env (DO NOT commit)
JWT_SECRET=your-secret-key-here-min-32-chars
AZURE_CLIENT_SECRET=from-azure-portal
OPENAI_API_KEY=from-openai-dashboard
ENCRYPTION_KEY=32-character-encryption-key

# .env.example (CAN commit - safe template)
JWT_SECRET=change_me_in_production
AZURE_CLIENT_SECRET=change_me_in_production
OPENAI_API_KEY=change_me_in_production
ENCRYPTION_KEY=change_me_in_production
```

### 10. API Security Best Practices

- **No sensitive data in URLs**: Use POST body with https
- **Validate request size**: Limit request body to 10MB
- **Implement request signing**: For critical operations
- **API versioning**: `/api/v1/` prefix to manage changes
- **Deprecation headers**: Notify clients of endpoint changes

```typescript
@Post('api/v1/summaries')
@Header('API-Version', '1.0')
@Header('Deprecation-Date', '2025-12-31')
async generateSummary(@Body() data: any) {
  // v1 implementation
}
```

---

## Deployment Guide

### Docker Deployment (Recommended)

#### Prerequisites
- Docker installed (version 20.10+)
- Docker Compose installed (version 2.0+)
- All environment variables configured in `.env`

#### Step 1: Prepare Environment

Create `.env` file at project root:

```bash
# Application
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com
REDIRECT_URI=https://yourdomain.com/api/auth/callback

# MongoDB
MONGO_ROOT_USER=admin
MONGO_ROOT_PASSWORD=<strong-password>
MONGO_DATABASE=teams-meeting-summary
MONGO_URI=mongodb://admin:<password>@mongo:27017/teams-meeting-summary?authSource=admin

# JWT
JWT_SECRET=<32-character-random-string>
JWT_EXPIRATION=3600

# Azure AD
AZURE_CLIENT_ID=<from-azure-portal>
AZURE_CLIENT_SECRET=<from-azure-portal>
AZURE_TENANT_ID=<from-azure-portal>

# OpenAI
OPENAI_API_KEY=<from-openai-dashboard>
OPENAI_MODEL=gpt-4

# Logging
LOG_LEVEL=info
```

#### Step 2: Build Docker Images

```bash
# Build all services
npm run docker:build

# Or build specific services
docker-compose build backend
docker-compose build frontend
docker-compose build mongo
```

#### Step 3: Start Services

```bash
# Start all services
npm run docker:up

# Start in background
docker-compose up -d

# View logs
npm run docker:logs

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mongo
```

#### Step 4: Verify Deployment

```bash
# Check running containers
docker-compose ps

# Test backend health
curl http://localhost:3001/health

# Test frontend
curl http://localhost:3000

# Check MongoDB connection
docker-compose exec mongo mongosh -u admin -p password --authenticationDatabase admin --eval "db.adminCommand('ping')"
```

#### Step 5: Stop Services

```bash
# Stop all services
npm run docker:down

# Remove volumes (WARNING: deletes data)
docker-compose down -v
```

### Azure App Service Deployment

#### Prerequisites
- Azure subscription
- Azure CLI installed
- Docker images pushed to Azure Container Registry (ACR)

#### Step 1: Create Container Registry

```bash
# Create resource group
az group create --name tms-rg --location eastus

# Create container registry
az acr create --resource-group tms-rg \
  --name tmsregistry \
  --sku Basic

# Enable admin user
az acr update --name tmsregistry --admin-enabled true
```

#### Step 2: Push Images to ACR

```bash
# Login to ACR
az acr login --name tmsregistry

# Tag images
docker tag teams-meeting-summary:backend \
  tmsregistry.azurecr.io/teams-meeting-summary:backend-latest

docker tag teams-meeting-summary:frontend \
  tmsregistry.azurecr.io/teams-meeting-summary:frontend-latest

# Push images
docker push tmsregistry.azurecr.io/teams-meeting-summary:backend-latest
docker push tmsregistry.azurecr.io/teams-meeting-summary:frontend-latest
```

#### Step 3: Create App Service Plan

```bash
# Create App Service Plan
az appservice plan create \
  --name tms-plan \
  --resource-group tms-rg \
  --sku B2 \
  --is-linux
```

#### Step 4: Create Web Apps

```bash
# Create backend app
az webapp create \
  --resource-group tms-rg \
  --plan tms-plan \
  --name tms-backend \
  --deployment-container-image-name \
  tmsregistry.azurecr.io/teams-meeting-summary:backend-latest

# Create frontend app
az webapp create \
  --resource-group tms-rg \
  --plan tms-plan \
  --name tms-frontend \
  --deployment-container-image-name \
  tmsregistry.azurecr.io/teams-meeting-summary:frontend-latest
```

#### Step 5: Configure App Settings

```bash
# Backend app configuration
az webapp config appsettings set \
  --resource-group tms-rg \
  --name tms-backend \
  --settings \
  JWT_SECRET="<value>" \
  AZURE_CLIENT_ID="<value>" \
  AZURE_CLIENT_SECRET="<value>" \
  OPENAI_API_KEY="<value>" \
  MONGO_URI="<value>"

# Frontend app configuration
az webapp config appsettings set \
  --resource-group tms-rg \
  --name tms-frontend \
  --settings \
  NEXT_PUBLIC_API_URL="https://tms-backend.azurewebsites.net/api"
```

#### Step 6: Configure SSL/TLS

```bash
# Add custom domain
az webapp config hostname add \
  --resource-group tms-rg \
  --webapp-name tms-backend \
  --hostname yourdomain.com

# Create SSL certificate (using Let's Encrypt or purchase)
az webapp config ssl bind \
  --resource-group tms-rg \
  --name tms-backend \
  --certificate-thumbprint "<thumbprint>" \
  --ssl-type SNI
```

### Production Environment Configuration

#### Security Checklist

- [ ] Enable HTTPS/TLS on all endpoints
- [ ] Configure WAF (Web Application Firewall)
- [ ] Enable Azure DDoS Protection
- [ ] Set up Azure Key Vault for secrets
- [ ] Configure network isolation (VNets)
- [ ] Enable audit logging for all API calls
- [ ] Set up alerts for authentication failures
- [ ] Configure backup strategy (daily backups)
- [ ] Enable database encryption (MongoDB Enterprise)
- [ ] Configure application monitoring/APM

#### Monitoring Setup

```bash
# Enable Application Insights
az webapp config appsettings set \
  --resource-group tms-rg \
  --name tms-backend \
  --settings APPINSIGHTS_INSTRUMENTATIONKEY="<key>"

# Create alerts
az monitor metrics alert create \
  --name "High Error Rate" \
  --resource-group tms-rg \
  --scopes /subscriptions/{subscriptionId}/resourceGroups/tms-rg/providers/Microsoft.Web/sites/tms-backend \
  --condition "avg http5xx > 10" \
  --window-size 5m \
  --evaluation-frequency 1m
```

#### Scaling Configuration

```bash
# Auto-scale rules
az monitor autoscale create \
  --resource-group tms-rg \
  --resource-name tms-plan \
  --resource-type "Microsoft.Web/serverfarms" \
  --min-count 2 \
  --max-count 10 \
  --count 3
```

### Maintenance

#### Database Backups

```bash
# Export MongoDB backup
docker-compose exec mongo mongodump \
  --username admin \
  --password password \
  --authenticationDatabase admin \
  --out /backup

# Restore from backup
docker-compose exec mongo mongorestore \
  --username admin \
  --password password \
  --authenticationDatabase admin \
  /backup
```

#### Update Procedures

1. Backup database
2. Update code and rebuild Docker images
3. Test in staging environment
4. Deploy to production during maintenance window
5. Monitor error logs and metrics
6. Have rollback plan ready

#### Health Monitoring

Monitor these metrics in production:
- API response times (target: <500ms)
- Error rates (target: <1%)
- Database connection pool usage
- Memory/CPU utilization
- OpenAI API quota usage
- MongoDB disk usage

---

## References

- [Microsoft Graph API Documentation](https://docs.microsoft.com/en-us/graph/overview)
- [Azure Active Directory Documentation](https://docs.microsoft.com/en-us/azure/active-directory/)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [NestJS Documentation](https://docs.nestjs.com)
- [Next.js Documentation](https://nextjs.org/docs)
- [MongoDB Documentation](https://docs.mongodb.com)
- [Docker Documentation](https://docs.docker.com)
