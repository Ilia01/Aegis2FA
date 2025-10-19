# 2FA Authentication Service

[![Backend CI](https://github.com/your-org/2fa/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/your-org/2fa/actions/workflows/backend-ci.yml)
[![Frontend CI](https://github.com/your-org/2fa/actions/workflows/frontend-ci.yml/badge.svg)](https://github.com/your-org/2fa/actions/workflows/frontend-ci.yml)
[![Security Scanning](https://github.com/your-org/2fa/actions/workflows/security.yml/badge.svg)](https://github.com/your-org/2fa/actions/workflows/security.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A production-ready Two-Factor Authentication service that you can integrate into your application. Provides enterprise-grade 2FA capabilities via REST API with a showcase frontend for testing and demonstration.

**Deploy with $0/month** using TOTP 2FA (Google Authenticator) - no external services required!

## Table of Contents

- [Overview](#overview)
- [Documentation](#documentation)
- [Project Structure](#project-structure)
- [Integration Approaches](#integration-approaches)
- [Quick Start](#quick-start)
- [Features](#features)
- [API Documentation](#api-documentation)
- [Tech Stack](#tech-stack)
- [CI/CD Pipeline](#cicd-pipeline)
- [Development Roadmap](#development-roadmap)
- [Contributing](#contributing)
- [Security](#security)
- [License](#license)

## Overview

This is a **standalone 2FA service** designed to be integrated into your existing applications. It provides a complete authentication backend with multiple verification methods:

- **TOTP** (Time-based One-Time Password) - Google Authenticator, Authy
- **SMS** - Via Twilio
- **Email** - Via Nodemailer
- **Backup Codes** - Recovery codes
- **Trusted Devices** - Skip 2FA on trusted devices for 30 days

The included frontend is a **showcase/testing interface** - you'll integrate the backend API directly into your own application.

## Documentation

- **[Deployment Guide](./DEPLOYMENT.md)** - Complete deployment instructions for production, zero-budget options, cloud platforms
- **[Contributing Guide](./CONTRIBUTING.md)** - Development setup, coding standards, testing guidelines, PR process
- **[Backend API Documentation](./backend/README.md)** - API endpoints, authentication flow, integration examples
- **[Frontend Documentation](./frontend/README.md)** - UI setup, development workflow, component library

## Project Structure

```
2fa/
├── backend/          # 2FA Service API (Production-Ready)
└── frontend/         # Showcase UI (Testing & Demo)
```

## Integration Approaches

### Option 1: Direct API Integration (Recommended)

Integrate the 2FA service into your existing application by calling the REST API endpoints:

1. Run the 2FA backend service (separate process/container)
2. Call API endpoints from your application
3. Handle responses and manage user sessions in your app

**Best for**: Microservices architecture, existing applications, multi-language environments

### Option 2: SDK Integration (Coming Soon)

Use our SDK to simplify integration (roadmap Phase 8):

```javascript
import { TwoFactorAuth } from '@your-org/2fa-sdk';

const tfa = new TwoFactorAuth({ apiUrl: 'http://localhost:3001/api' });
await tfa.setupTOTP(userId);
```

**Best for**: JavaScript/TypeScript applications, rapid integration

### Option 3: Embed Mode (Future)

Embed 2FA UI components directly into your application (roadmap).

**Best for**: Unified user experience, white-label solutions

## Quick Start

### Zero-Budget Deployment ($0/month)

Deploy with **TOTP 2FA only** (Google Authenticator/Authy) - no external services needed!

```bash
# 1. Clone and setup
git clone https://github.com/your-org/2fa.git
cd 2fa

# 2. Generate JWT secrets
for i in {1..4}; do node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"; done

# 3. Configure for TOTP-only (copy secrets from step 2)
cp backend/.env.production.example backend/.env
nano backend/.env  # Add your generated secrets

# 4. Deploy with Docker
docker-compose up -d
docker-compose exec backend npx prisma migrate deploy

# 5. Access services
# Backend: http://localhost:3001
# Frontend: http://localhost:3000
```

**Free hosting options**: Railway (500hrs/month), Render (750hrs/month), Fly.io (3 VMs free)

See [DEPLOYMENT.md](./DEPLOYMENT.md#quick-deploy-zero-budget) for detailed zero-budget deployment guide.

### Option 1: Docker (Recommended for Production)

The fastest way to get started:

```bash
# 1. Clone the repository
git clone https://github.com/your-org/2fa-service.git
cd 2fa-service

# 2. Create environment file
cp .env.example .env

# 3. Generate secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 4. Update .env with your secrets (required):
#    - JWT_ACCESS_SECRET
#    - JWT_REFRESH_SECRET
#    - DEVICE_TOKEN_SECRET
#    - POSTGRES_PASSWORD

# 5. Start all services (backend, frontend, PostgreSQL, Redis, workers)
docker-compose up -d

# 6. Run database migrations
docker-compose exec backend npx prisma migrate deploy

# 7. View logs
docker-compose logs -f
```

Services will be available at:
- **Backend API**: http://localhost:3001
- **Frontend UI**: http://localhost:3000
- **Health Check**: http://localhost:3001/api/health

### Option 2: Local Development

For development with hot-reload:

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up

# Backend runs on http://localhost:3001 with hot-reload
# Frontend runs on http://localhost:3000 with hot-reload
```

### Option 3: Manual Setup

#### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database and API credentials
npm run prisma:migrate
npm run dev
```

Backend runs on `http://localhost:3001`

See [backend/README.md](./backend/README.md) for detailed setup.

#### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local with your API URL (default: http://localhost:3001/api)
npm run dev
```

Frontend runs on `http://localhost:3000`

See [frontend/README.md](./frontend/README.md) for detailed setup.

## Features

### Core Authentication
- User registration with strong password validation
- JWT-based authentication (access + refresh tokens)
- Session management and revocation
- HTTP-only cookie for refresh tokens

### 2FA Methods
- **TOTP**: QR code generation, compatible with Google Authenticator
- **SMS**: Send verification codes via Twilio
- **Email**: Send verification codes via SMTP
- **Backup Codes**: 10 one-time recovery codes
- **Trusted Devices**: Remember device for 30 days

### Third-Party Integration (Phase 6)
- **API Keys**: Authenticate applications with scoped API keys
- **Webhooks**: Real-time event notifications (2FA enabled/verified/failed)
- **Health Checks**: Comprehensive health monitoring endpoints
- **Docker Deployment**: Production-ready Docker Compose setup

### Security
- Argon2 password hashing
- Rate limiting on all sensitive endpoints (configurable per API key)
- Audit logging for security events
- Redis-based OTP storage with expiry
- CSRF protection
- Helmet security headers
- HMAC webhook signatures

## API Documentation

### Authentication Flow

1. **Register**: `POST /api/auth/register`
2. **Login**: `POST /api/auth/login`
   - If 2FA enabled → returns `tempToken`
   - If no 2FA → returns `accessToken`
3. **Verify 2FA**: `POST /api/2fa/verify` (with tempToken + code)
   - Returns final `accessToken`

### 2FA Setup Flow

1. **Setup Method**: `POST /api/2fa/totp/setup` (or sms/email)
2. **Verify Setup**: `POST /api/2fa/totp/verify-setup`
   - Enables 2FA and returns backup codes

### API Key Management

```
POST   /api/api-keys              Create API key
GET    /api/api-keys              List all API keys
GET    /api/api-keys/:id          Get specific API key
PATCH  /api/api-keys/:id          Update API key
POST   /api/api-keys/:id/rotate   Rotate API key
POST   /api/api-keys/:id/revoke   Revoke API key
DELETE /api/api-keys/:id          Delete API key
```

### Webhook Management

```
GET    /api/webhooks/events       List supported events
POST   /api/webhooks              Create webhook
GET    /api/webhooks              List all webhooks
GET    /api/webhooks/:id          Get specific webhook
PATCH  /api/webhooks/:id          Update webhook
POST   /api/webhooks/:id/test     Test webhook delivery
DELETE /api/webhooks/:id          Delete webhook
```

### Health Monitoring

```
GET    /api/health                Comprehensive health check
GET    /api/health/live           Liveness probe (Kubernetes)
GET    /api/health/ready          Readiness probe (load balancers)
```

See [backend/README.md](./backend/README.md) for full API reference.

See [docs/INTEGRATION.md](./docs/INTEGRATION.md) for complete integration guide.

## Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL 14+ (via Prisma ORM)
- **Cache**: Redis 6+
- **Authentication**: JWT
- **Password**: Argon2
- **TOTP**: Speakeasy
- **SMS**: Twilio
- **Email**: Nodemailer

### Frontend
- **Framework**: Next.js 15 (App Router with Turbopack)
- **Language**: TypeScript
- **UI**: Tailwind CSS + shadcn/ui Components
- **State**: React Context API
- **HTTP Client**: Axios with interceptors
- **Icons**: Lucide React
- **QR Codes**: qrcode.react
- **Theme**: Dark mode optimized

## Environment Setup

### Required Services

1. **PostgreSQL**: Database
2. **Redis**: OTP and rate limit storage

### Optional Services (for full functionality)

3. **Twilio**: SMS verification
4. **SMTP Server**: Email verification (Gmail, SendGrid, etc.)

## Performance & Scalability

### Current Architecture

- **Worker Threads**: Piscina pool for CPU-intensive operations (Argon2 hashing)
- **Job Queues**: BullMQ for async operations (audit logs)
- **Caching**: Redis for OTP storage and rate limiting
- **Database**: PostgreSQL with Prisma ORM

### Stress Testing

Run performance tests to validate your deployment:

```bash
cd backend
npm run test:stress
```

Default test: 500 concurrent users, 15 requests each (~7,500 total requests)

**Known Performance Considerations:**
- Worker pool is optimized for Argon2 hashing (CPU-intensive)
- Rate limiting intentionally blocks excessive requests (security vs throughput trade-off)
- Session storage uses database writes (consider caching for ultra-high throughput)

See [Performance Optimization Guide](./docs/PERFORMANCE.md) for tuning recommendations.

## CI/CD Pipeline

This project includes comprehensive GitHub Actions workflows for automated testing, security scanning, and deployment:

### Backend CI (`backend-ci.yml`)
- **Triggers**: Push/PR to main or develop branches
- **Jobs**:
  - TypeScript compilation and linting
  - Unit + E2E tests with PostgreSQL and Redis services
  - Docker image build test
- **Coverage**: 80%+ test coverage required

### Frontend CI (`frontend-ci.yml`)
- **Triggers**: Push/PR to main or develop branches
- **Jobs**:
  - ESLint and TypeScript type checking
  - Next.js production build
  - Docker image build test

### Security Scanning (`security.yml`)
- **Schedule**: Daily at midnight UTC
- **Scans**:
  - Dependency audit (npm audit)
  - CodeQL static analysis
  - Secret scanning (TruffleHog)
  - Docker vulnerability scanning (Trivy)
  - License compliance checking

### Production Deployment (`deploy.yml`)
- **Triggers**: Release published or manual dispatch
- **Process**:
  - Build and push Docker images to GitHub Container Registry
  - Deploy to production server via SSH
  - Run database migrations
  - Rolling restart with health checks
  - Automated rollback on failure

### Setup Requirements

To enable automated deployments, configure these GitHub repository secrets:

```
DEPLOY_HOST           # Production server hostname
DEPLOY_USER           # SSH username
DEPLOY_SSH_KEY        # SSH private key
DEPLOY_PORT           # SSH port (default: 22)
DEPLOY_PATH           # Deployment directory (default: /opt/2fa)
```

See [.github/workflows/](./.github/workflows/) for workflow configurations.

## Development Roadmap

- [x] **Phase 1-4**: Backend API Service
  - [x] User authentication
  - [x] TOTP, SMS, Email 2FA
  - [x] Backup codes & trusted devices
  - [x] Worker pool optimization
  - [x] Stress testing suite
- [x] **Phase 5**: Showcase Frontend
  - [x] Next.js with dark theme
  - [x] TOTP setup wizard with QR codes
  - [x] 2FA verification flow
  - [x] User dashboard
- [x] **Phase 6**: Service Enhancements
  - [x] API key management for third-party integration
  - [x] Webhook/callback support
  - [x] Enhanced monitoring & metrics (health checks)
  - [x] Docker deployment templates
  - [ ] Multi-tenancy support
- [ ] **Phase 7**: Admin Dashboard
  - [ ] User management API
  - [ ] Audit logs viewer
  - [ ] Analytics & usage metrics
  - [ ] Health monitoring UI
- [ ] **Phase 8**: Client SDK
  - [ ] NPM package (@your-org/2fa-sdk)
  - [ ] React hooks library
  - [ ] Python client
  - [ ] Integration examples
  - [ ] Comprehensive API documentation

## Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for:

- Development environment setup
- Coding standards and style guidelines
- Testing requirements (80%+ coverage)
- Commit message conventions
- Pull request process
- Code review checklist

Quick start for contributors:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Follow our coding standards
4. Write tests (unit + E2E)
5. Submit a pull request

## Security

Found a security issue? Please email security@example.com instead of opening a public issue.

## License

MIT