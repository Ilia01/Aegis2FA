# Aegis2FA - Two-Factor Authentication Service

[![Backend CI](https://github.com/Ilia01/Aegis2FA/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/Ilia01/Aegis2FA/actions/workflows/backend-ci.yml)
[![Frontend CI](https://github.com/Ilia01/Aegis2FA/actions/workflows/frontend-ci.yml/badge.svg)](https://github.com/Ilia01/Aegis2FA/actions/workflows/frontend-ci.yml)
[![Security Scanning](https://github.com/Ilia01/Aegis2FA/actions/workflows/security.yml/badge.svg)](https://github.com/Ilia01/Aegis2FA/actions/workflows/security.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Documentation](https://img.shields.io/badge/docs-live-brightgreen)](https://Ilia01.github.io/Aegis2FA/)

> **Production-ready Two-Factor Authentication service** with enterprise-grade security, multiple 2FA methods, and comprehensive API.

**Deploy with $0/month** using TOTP 2FA (Google Authenticator) - no external services required!

## 📚 Documentation

**Complete documentation is available at: [https://Ilia01.github.io/Aegis2FA](https://Ilia01.github.io/Aegis2FA/)**

- [Quick Start Guide](https://Ilia01.github.io/Aegis2FA/getting-started/quick-start/) - Get up and running in 5 minutes
- [Installation](https://Ilia01.github.io/Aegis2FA/getting-started/installation/) - Docker and manual setup instructions
- [API Reference](https://Ilia01.github.io/Aegis2FA/api/) - Complete API documentation with Swagger UI
- [Integration Guide](https://Ilia01.github.io/Aegis2FA/guides/integration/) - How to integrate into your app
- [Deployment](https://Ilia01.github.io/Aegis2FA/deployment/docker/) - Production deployment guides
- [FAQ](https://Ilia01.github.io/Aegis2FA/faq/) - Frequently asked questions

## ✨ Features

- **Multiple 2FA Methods**
  - TOTP (Google Authenticator, Authy)
  - SMS verification (via Twilio)
  - Email verification (SMTP)
  - Backup recovery codes

- **Enterprise Security**
  - Argon2id password hashing
  - JWT authentication with refresh tokens
  - Rate limiting and CSRF protection
  - Audit logging and session management

- **Developer Friendly**
  - RESTful API with comprehensive docs
  - Trusted device management (30-day skip)
  - API key authentication for third-party apps
  - Webhook support for event notifications
  - Full test coverage (80%+)

- **Zero-Budget Deployment**
  - Free hosting options (Railway, Render, Fly.io)
  - TOTP-only mode requires no external services
  - Docker Compose for easy deployment

## 🚀 Quick Start

### Option 1: Docker (Recommended)

```bash
# Clone repository
git clone https://github.com/Ilia01/Aegis2FA.git
cd Aegis2FA

# Generate JWT secrets
for i in {1..4}; do node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"; done

# Configure environment
cp .env.example .env
# Edit .env with your generated secrets

# Start services
docker-compose up -d

# Run database migrations
docker-compose exec backend npx prisma migrate deploy

# Services are now running:
# - Backend API: http://localhost:3001
# - Frontend UI: http://localhost:3000
# - Health check: http://localhost:3001/api/health
```

### Option 2: Manual Setup

See the [Installation Guide](https://Ilia01.github.io/Aegis2FA/getting-started/installation/#manual-setup) for detailed manual installation instructions.

### Zero-Budget Deployment

Deploy for **$0/month** with free hosting providers:

- [Railway](https://railway.app/) - 500 hours/month free
- [Render](https://render.com/) - 750 hours/month free
- [Fly.io](https://fly.io/) - 3 shared VMs free

See [Zero-Budget Deployment Guide](https://Ilia01.github.io/Aegis2FA/getting-started/zero-budget/) for detailed instructions.

## 📦 Project Structure

```
Aegis2FA/
├── backend/          # 2FA Service API (Production-Ready)
│   ├── src/          # Source code
│   ├── tests/        # Unit and E2E tests
│   └── prisma/       # Database schema and migrations
├── frontend/         # Showcase UI (Testing & Demo)
│   ├── src/          # Next.js application
│   └── components/   # React components
├── docs/             # Documentation source (MkDocs)
└── .github/          # CI/CD workflows
```

## 🔧 Tech Stack

**Backend:** Node.js, Express.js, TypeScript, PostgreSQL, Redis, Prisma ORM

**Frontend:** Next.js 15, TypeScript, Tailwind CSS, shadcn/ui

**DevOps:** Docker, GitHub Actions, CodeQL security scanning

## 🔗 API Overview

```bash
# Authentication
POST   /api/auth/register          # User registration
POST   /api/auth/login             # Login with 2FA support
POST   /api/auth/refresh           # Refresh access token
POST   /api/auth/logout            # Logout and revoke tokens
GET    /api/auth/me                # Get current user

# 2FA Methods
POST   /api/2fa/totp/setup         # Setup TOTP (QR code)
POST   /api/2fa/sms/setup          # Setup SMS 2FA
POST   /api/2fa/email/setup        # Setup Email 2FA
POST   /api/2fa/verify             # Verify 2FA code
POST   /api/2fa/backup-codes/generate  # Generate backup codes

# Trusted Devices
GET    /api/2fa/devices            # List trusted devices
DELETE /api/2fa/devices/:id        # Remove trusted device

# Health & Monitoring
GET    /api/health                 # Comprehensive health check
GET    /api/health/live            # Liveness probe
GET    /api/health/ready           # Readiness probe
```

**Full API documentation:** [https://Ilia01.github.io/Aegis2FA/api/](https://Ilia01.github.io/Aegis2FA/api/)

## 📖 Integration Example

```javascript
// 1. Register a user
const response = await fetch('http://localhost:3001/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    username: 'johndoe',
    password: 'SecureP@ssw0rd123!'
  })
});

// 2. Setup TOTP 2FA
const setupResponse = await fetch('http://localhost:3001/api/2fa/totp/setup', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  }
});

const { qrCode, secret } = await setupResponse.json();
// Display qrCode to user for scanning with Google Authenticator

// 3. Verify setup with TOTP code
await fetch('http://localhost:3001/api/2fa/totp/verify-setup', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  },
  body: JSON.stringify({ code: '123456' })
});
```

See [Integration Guide](https://Ilia01.github.io/Aegis2FA/guides/integration/) for complete examples in JavaScript, Python, and cURL.

## 🛠️ Development

```bash
# Backend development
cd backend
npm install
cp .env.example .env
npm run dev

# Frontend development
cd frontend
npm install
cp .env.example .env.local
npm run dev

# Run tests
cd backend
npm test                    # Run all tests
npm run test:coverage       # With coverage report
npm run test:e2e           # E2E tests only

# Database management
npx prisma studio          # Open database GUI
npx prisma migrate dev     # Create new migration
```

See [Contributing Guide](https://Ilia01.github.io/Aegis2FA/development/contributing/) for detailed development setup.

## 📊 CI/CD Pipeline

This project includes comprehensive GitHub Actions workflows:

- **Backend CI:** TypeScript compilation, linting, unit + E2E tests (80%+ coverage)
- **Frontend CI:** ESLint, type checking, production build validation
- **Security Scanning:** Daily CodeQL, dependency audit, secret scanning, Docker vulnerability scanning
- **Documentation:** Auto-deploy to GitHub Pages on changes

All workflows run on push/PR to `main` branch. See [.github/workflows/](./.github/workflows/) for details.

## 🗺️ Roadmap

- [x] **Phase 1-4:** Backend API (User auth, TOTP, SMS, Email, Backup codes)
- [x] **Phase 5:** Showcase Frontend (Next.js with dark theme)
- [x] **Phase 6:** Service Enhancements (API keys, webhooks, health checks, Docker)
- [ ] **Phase 7:** Admin Dashboard (User management, audit logs, analytics)
- [ ] **Phase 8:** Client SDK (NPM package, React hooks, Python client)

See [Changelog](https://Ilia01.github.io/Aegis2FA/changelog/) for detailed version history.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](https://Ilia01.github.io/Aegis2FA/development/contributing/) for:

- Development environment setup
- Coding standards and style guidelines
- Testing requirements (80%+ coverage)
- Pull request process

Quick start:
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and write tests
4. Submit a pull request

## 🔒 Security

Found a security vulnerability? Please report it via [GitHub Security Advisories](https://github.com/Ilia01/Aegis2FA/security/advisories/new) instead of opening a public issue.

We take security seriously and will respond within 48 hours.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🌟 Support

- **Documentation:** [https://Ilia01.github.io/Aegis2FA](https://Ilia01.github.io/Aegis2FA/)
- **Issues:** [GitHub Issues](https://github.com/Ilia01/Aegis2FA/issues)
- **Discussions:** [GitHub Discussions](https://github.com/Ilia01/Aegis2FA/discussions)

---

<div align="center">

**Ready to add 2FA to your app?**

[View Documentation](https://Ilia01.github.io/Aegis2FA/) • [Quick Start](https://Ilia01.github.io/Aegis2FA/getting-started/quick-start/) • [API Reference](https://Ilia01.github.io/Aegis2FA/api/)

Made with ❤️ by [Ilia01](https://github.com/Ilia01)

</div>
