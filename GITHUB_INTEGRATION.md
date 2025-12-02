# GitHub App Integration Flow

## Overview

The application now supports dynamic GitHub App integration with organizations instead of hardcoded authentication. Each organization can have its own GitHub App installation.

## Database Schema

The `Orgs` table already contains an `installationId` field that stores the GitHub App installation ID for each organization.

## User Registration Flow

1. **User logs in via GitHub OAuth** → `auth/functions.ts:callback()`
2. **User gets created in database** → `auth/functions.ts:createUser()`
3. **Default org is automatically created** → Named `{githubName}-default` with `installationId: null`

## GitHub App Installation Flow

### For Personal Repositories (User Installation)
1. User installs GitHub App to their personal account
2. GitHub sends webhook to `/api/webhook/github`
3. Webhook handler updates the user's default org with the installation ID
4. User can now access their personal repositories

### For Organization Repositories (Org Installation)
1. User installs GitHub App to a GitHub organization they belong to
2. GitHub sends webhook to `/api/webhook/github`
3. Webhook handler creates a new org in the database with the installation ID
4. User can now access repositories from that GitHub organization

## API Endpoints

### Repository Operations (All require projectId now)
- `GET /api/projects/{projectId}/repo/{owner}/{repo}/contents` - List directory contents
- `GET /api/projects/{projectId}/repo/{owner}/{repo}/file` - Get file content
- `POST /api/projects/{projectId}/repo/{owner}/{repo}/create-file` - Create new file

### Organization Management
- `POST /api/orgs/` - Create regular org (no GitHub integration)
- `POST /api/orgs/github` - Create GitHub-integrated org (requires installationId)
- `GET /api/orgs/?userId={userId}` - List user's organizations

### Webhooks
- `POST /api/webhook/github` - GitHub App installation webhook handler

## Dynamic Authentication Flow

Each repository operation now:
1. Extracts `projectId` from URL parameters
2. Looks up the project in the database
3. Gets the organization associated with the project
4. Retrieves the `installationId` from the organization
5. Creates an authenticated Octokit instance for that specific installation
6. Performs the GitHub API operation

## Error Handling

The system gracefully handles:
- Organizations without GitHub integration (returns helpful error message)
- Missing projects or organizations
- Invalid installation IDs
- GitHub API errors

## Setup Instructions

1. **Configure GitHub App**:
   - Set webhook URL to: `https://yourdomain.com/api/webhook/github`
   - Enable installation events: `installation.created`, `installation.deleted`

2. **Environment Variables**:
   ```bash
   APP_ID=your_github_app_id
   PRIVATE_KEY=your_github_app_private_key
   GITHUB_ID=your_oauth_app_id
   GITHUB_SECRET=your_oauth_app_secret
   ```

3. **Database Migration**:
   The `Orgs.installationId` field is already present and handles `null` values for non-GitHub orgs.

## Benefits

- ✅ No more hardcoded installation IDs
- ✅ Support for multiple GitHub organizations per user
- ✅ Proper separation between personal and organization repositories
- ✅ Automatic webhook handling for app installations/uninstallations
- ✅ Graceful fallback for organizations without GitHub integration
- ✅ Secure, per-organization authentication

## Migration from Hardcoded System

Existing users with the hardcoded system will need to:
1. Install the GitHub App to their account/organization
2. The webhook will automatically update their default org with the correct installation ID
3. No manual database changes required