# mini-cms

A minimal CMS that connects directly to your GitHub repositories. Edit MDX and Markdown files with ease.

![mini-cms Banner](https://img.shields.io/badge/built%20with-Astro-FF5D01?style=for-the-badge&logo=astro) ![built with Hono](https://img.shields.io/badge/built%20with-Hono-E34A23?style=for-the-badge&logo=hono) ![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)

## 🚀 Features

### 🔗 GitHub Integration
- **Direct Repository Connection**: Connect seamlessly to your GitHub repositories
- **Version Control Built-in**: All changes are tracked through GitHub's version control
- **GitHub App Installation**: Easy setup through GitHub App integration
- **Multi-Organization Support**: Manage multiple organizations and repositories

### ✍️ Rich Text Editor
- **MDX & Markdown Support**: Edit MDX and Markdown files with a powerful WYSIWYG editor
- **Live Preview**: See your changes in real-time as you edit
- **Syntax Highlighting**: Code blocks with proper syntax highlighting
- **Draft Management**: Auto-save drafts to prevent data loss

### 📁 Project Management
- **Organization System**: Create and manage multiple organizations
- **Project Workspace**: Organize content by projects
- **File Explorer**: Navigate through your repository files easily
- **Commit History**: Track all changes with detailed commit messages
- **Permission Management**: Control access with role-based permissions

### 🔐 Authentication & Security
- **Multiple OAuth Providers**: GitHub and Google OAuth integration
- **JWT-Based Authentication**: Secure token-based authentication
- **Token Rotation**: Automatic refresh token rotation for enhanced security
- **Redis Blacklisting**: Token revocation with Redis for logout and security
- **Automatic Token Refresh**: Seamless user experience with middleware-based token refresh

### 👥 Team Collaboration
- **Member Invitations**: Invite team members via email
- **Role Management**: Assign different roles to team members
- **Activity Tracking**: Monitor project activity and changes
- **Shared Workspaces**: Collaborate on content with your team

## 🛠️ Tech Stack

- **Frontend**: [Astro](https://astro.build/) + [Alpine.js](https://alpinejs.dev/) + [React](https://react.dev/)
- **Backend API**: [Hono](https://hono.dev/) (Node.js)
- **Database**: [Astro DB](https://astro.build/db/) (LibSQL/Turso)
- **Cache/Sessions**: [Upstash Redis](https://upstash.com/)
- **Authentication**: JWT (jsonwebtoken) + OAuth 2.0
- **GitHub Integration**: [@octokit/rest](https://octokit.github.io/rest.js/)
- **Editor**: [@mdxeditor/editor](https://mdxeditor.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Email**: [Nodemailer](https://nodemailer.com/)
- **Validation**: [Zod](https://zod.dev/)

## 📦 Installation

### Prerequisites

- Node.js 18+ and pnpm
- GitHub account
- Upstash Redis account
- Gmail account (for email notifications)

### Environment Variables

Create a `.env` file in the root directory:

```bash
# Database
ASTRO_DB_REMOTE_URL=your_turso_database_url
ASTRO_DB_APP_TOKEN=your_turso_app_token

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_APP_ID=your_github_app_id
GITHUB_APP_PRIVATE_KEY=your_github_app_private_key

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# JWT Secrets
JWT_SECRET_KEY=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret

# Redis (Upstash)
UPSTASH_URL=your_upstash_redis_url
UPSTASH_TOKEN=your_upstash_token

# Email (Gmail)
EMAIL_USER=your_gmail_address
EMAIL_PASS=your_gmail_app_password

# App Configuration
PUBLIC_BASE_URL=http://localhost:4321
```

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/mini-cms.git
   cd mini-cms
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env-sample .env
   # Edit .env with your credentials
   ```

4. **Set up database**
   ```bash
   pnpm astro db push --remote
   ```

5. **Run development server**
   ```bash
   pnpm dev
   ```

   The app will be available at `http://localhost:4321`

## 🧞 Commands

All commands are run from the root of the project:

| Command | Action |
| :------------------------ | :----------------------------------------------- |
| `pnpm install` | Install dependencies |
| `pnpm dev` | Start local dev server at `localhost:4321` |
| `pnpm build` | Build your production site to `./dist/` |
| `pnpm preview` | Preview your build locally before deploying |
| `pnpm astro db ...` | Run Astro DB CLI commands |
| `pnpm astro check` | Run TypeScript type checking |

## 📚 Project Structure

```
/
├── db/                         # Database schema definitions
│   ├── user.ts                 # User table schema
│   ├── orgs.ts                 # Organizations table
│   └── projects.ts             # Projects table
├── src/
│   ├── actions/                # Astro Actions (server functions)
│   ├── components/
│   │   ├── dashboard/          # Dashboard UI components
│   │   ├── landing/            # Landing page components
│   │   └── ui/                 # Reusable UI components
│   ├── layouts/                # Page layouts
│   ├── lib/
│   │   └── server/             # Server-side logic
│   │       ├── auth/           # Authentication service
│   │       ├── organizations/  # Organization management
│   │       ├── projects/       # Project management
│   │       └── repo/           # GitHub repository integration
│   ├── middleware.ts           # Auth middleware & token refresh
│   ├── pages/                  # Page routes
│   └── store/                  # Client-side state management
└── public/                     # Static assets
```

## 🔑 Key Features Implementation

### Authentication Flow

1. **Login**: User authenticates via GitHub or Google OAuth
2. **Token Generation**: JWT access token (15m) and refresh token (7d) are issued
3. **Middleware**: Checks and auto-refreshes expired tokens
4. **Logout**: Tokens are blacklisted in Redis

### GitHub Integration

1. **GitHub App**: Install the GitHub App on your repositories
2. **Repository Access**: Grant access to specific repositories
3. **File Management**: Edit files directly through the CMS
4. **Commit Changes**: All edits create commits in your repository

### Project Workflow

1. **Create Organization**: Set up an organization for your team
2. **Install GitHub App**: Connect your GitHub account
3. **Create Project**: Link a GitHub repository to a project
4. **Edit Content**: Use the MDX/Markdown editor to modify files
5. **Commit Changes**: Save changes directly to your repository

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🔗 Links

- [Documentation](#readme)
- [GitHub Repository](https://github.com/Lftobs/mini-cms)
- [Twitter](https://x.com/Lf_tobs)

## 💬 Support

For support, please open an issue on GitHub or contact us via email.

---

Built with ❤️ using [Astro](https://astro.build/)
