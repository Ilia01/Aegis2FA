# 2FA Authentication System - Frontend

A modern, dark-themed Next.js 14 frontend application for a comprehensive two-factor authentication system.

## Features

- **User Authentication**
  - Login with email/username
  - User registration with password validation
  - JWT-based authentication with automatic token refresh
  - HTTP-only cookies for secure token storage

- **Two-Factor Authentication**
  - TOTP (Authenticator Apps) support
  - SMS verification (Twilio integration)
  - Email verification
  - Backup codes for account recovery
  - Trusted device management (30-day validity)

- **User Experience**
  - Dark theme optimized for reduced eye strain
  - Responsive design for all screen sizes
  - Real-time form validation with React Hook Form + Zod
  - Loading states and error handling
  - QR code generation for TOTP setup

- **Security Features**
  - Automatic token refresh
  - Protected routes with authentication guards
  - Secure API communication

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query (React Query)
- **Form Handling**: React Hook Form + Zod
- **HTTP Client**: Axios
- **UI Components**: Custom components with class-variance-authority
- **Icons**: Lucide React
- **QR Codes**: qrcode.react

## Prerequisites

- Node.js 18.x or higher
- npm or yarn
- Backend API running on `http://localhost:3001`

## Installation

1. **Install dependencies**

```bash
npm install
```

2. **Configure environment variables**

Create a `.env.local` file in the frontend directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

3. **Start the development server**

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Project Structure

```
frontend/
├── app/                          # Next.js app directory
│   ├── dashboard/               # Dashboard page
│   ├── login/                   # Login page
│   ├── register/                # Registration page
│   ├── setup-2fa/              # 2FA setup pages
│   │   └── totp/               # TOTP setup
│   ├── verify-2fa/             # 2FA verification
│   ├── globals.css             # Global styles and theme
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Home page (redirects)
├── components/
│   └── ui/                      # Reusable UI components
│       ├── alert.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       └── label.tsx
├── contexts/
│   ├── AuthContext.tsx         # Authentication context
│   └── Providers.tsx           # App-level providers
├── lib/
│   ├── api.ts                  # API client with interceptors
│   └── utils.ts                # Utility functions
├── types/
│   └── index.ts                # TypeScript type definitions
└── .env.local                   # Environment variables
```

## Key Components

### Authentication Context

The `AuthContext` provides global authentication state and methods:

```typescript
const { user, isLoading, isAuthenticated, login, register, logout, refetchUser } = useAuth()
```

### API Client

Axios-based client with automatic token refresh and error handling located in `lib/api.ts`. All API calls go through this client which handles:
- Automatic access token refresh on 401 errors
- Request/response interceptors
- Cookie-based token storage

### UI Components

All UI components use semantic color tokens for consistent dark theming:
- `Button` - Multiple variants (default, destructive, outline, secondary, ghost, link)
- `Input` - Form input with dark theme support
- `Card` - Container component with header, title, description, and content
- `Alert` - Alert/notification component with variants
- `Label` - Form label component

## Pages

### Home (`/`)
Redirects authenticated users to dashboard, unauthenticated users to login.

### Login (`/login`)
- Email or username login
- Password authentication
- Redirects to 2FA verification if enabled
- Link to registration page

### Register (`/register`)
- Email, username, and password fields
- Password strength validation:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character
- Automatic login after registration

### Dashboard (`/dashboard`)
- User information display
- 2FA status overview
- Backup codes count
- Links to enable different 2FA methods:
  - TOTP (Authenticator App)
  - Email verification
  - SMS verification
- Backup codes management
- Trusted devices management

### 2FA Verification (`/verify-2fa`)
- 6-digit code input
- Backup code alternative
- Trust device option (30 days)
- Device naming

### TOTP Setup (`/setup-2fa/totp`)
- QR code display for authenticator apps
- Manual secret key display
- Verification code input
- Backup codes generation and download

## Authentication Flow

1. **New User**
   ```
   Register → Auto Login → Dashboard
   ```

2. **Login without 2FA**
   ```
   Login → Dashboard
   ```

3. **Login with 2FA**
   ```
   Login → 2FA Verification → Dashboard
   ```

4. **TOTP Setup**
   ```
   Dashboard → Setup TOTP → Scan QR Code →
   Verify Code → Download Backup Codes → Dashboard
   ```

## Dark Theme

The application uses a comprehensive dark theme with the following color palette:

- **Background**: `#0a0a0a` (very dark)
- **Cards**: `#1a1a1a` (dark gray)
- **Primary**: `#3b82f6` (blue)
- **Destructive**: `#ef4444` (red)
- **Success**: `#4ade80` (green)
- **Borders**: `#333333` (dark gray)
- **Text**: `#ededed` (light gray)
- **Muted**: `#a3a3a3` (medium gray)

Theme configuration is in `app/globals.css` using CSS custom properties.

## API Integration

The frontend communicates with the backend API through the following endpoints:

- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `POST /auth/refresh` - Refresh access token
- `GET /auth/me` - Get current user
- `GET /2fa/methods` - Get user's 2FA methods
- `POST /2fa/totp/setup` - Initialize TOTP setup
- `POST /2fa/totp/verify` - Verify TOTP setup
- `POST /2fa/verify` - Verify 2FA during login
- `POST /2fa/verify-backup` - Verify backup code
- `GET /2fa/backup-codes/count` - Get backup codes count

## Form Validation

All forms use Zod schemas for validation:

```typescript
// Example: Login form validation
const loginSchema = z.object({
  emailOrUsername: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
})
```

## Error Handling

- API errors are caught and displayed in alert components
- Form validation errors are shown inline
- Network errors trigger user-friendly messages
- 401 errors automatically attempt token refresh

## Development Notes

- The app uses Next.js App Router (not Pages Router)
- All pages are client components (`'use client'`)
- Authentication state is managed globally via React Context
- TanStack Query handles server state caching
- All routes except `/login` and `/register` require authentication

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## License

This project is part of a 2FA authentication system demonstration.
