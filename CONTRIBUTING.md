# Contributing to 2FA Authentication Service

Thank you for your interest in contributing! This guide will help you get started.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Setup](#development-setup)
4. [Making Changes](#making-changes)
5. [Testing](#testing)
6. [Coding Standards](#coding-standards)
7. [Commit Guidelines](#commit-guidelines)
8. [Pull Request Process](#pull-request-process)

---

## Code of Conduct

### Our Standards

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on what is best for the community
- Show empathy towards other community members

### Our Responsibilities

- Maintain code quality and security
- Provide constructive feedback
- Review pull requests promptly
- Help contributors improve their contributions

---

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Redis 6+
- Docker & Docker Compose (optional)
- Git

### Find an Issue

1. Browse [open issues](https://github.com/your-org/2fa/issues)
2. Look for issues labeled `good first issue` or `help wanted`
3. Comment on the issue to let us know you're working on it

### Reporting Bugs

**Before submitting:**
- Check if the bug has already been reported
- Include steps to reproduce
- Include expected vs actual behavior
- Include environment details (OS, Node version, etc.)

**Bug report template:**
```markdown
**Description:**
Clear description of the bug

**Steps to Reproduce:**
1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior:**
What should happen

**Actual Behavior:**
What actually happens

**Environment:**
- OS: [e.g., Ubuntu 22.04]
- Node.js: [e.g., 18.17.0]
- npm: [e.g., 9.8.1]
- Database: [e.g., PostgreSQL 14.9]
```

### Feature Requests

We welcome feature requests! Please:
- Explain the use case
- Describe the proposed solution
- Consider alternatives
- Label with `enhancement`

---

## Development Setup

### 1. Fork and Clone

```bash
# Fork on GitHub, then clone your fork
git clone https://github.com/YOUR-USERNAME/2fa.git
cd 2fa

# Add upstream remote
git remote add upstream https://github.com/your-org/2fa.git
```

### 2. Install Dependencies

```bash
# Backend
cd backend
npm install
npm run prisma:generate

# Frontend
cd ../frontend
npm install
```

### 3. Setup Development Environment

```bash
# Create environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# Update with development values
nano backend/.env
```

Development `.env` (backend):
```env
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/twofa_dev
REDIS_HOST=localhost
REDIS_PORT=6379

JWT_ACCESS_SECRET=dev_access_secret
JWT_REFRESH_SECRET=dev_refresh_secret
TEMP_TOKEN_SECRET=dev_temp_secret
DEVICE_TOKEN_SECRET=dev_device_secret
```

### 4. Setup Database

```bash
# Create development database
createdb twofa_dev

# Run migrations
cd backend
npm run prisma:migrate

# Optional: Seed data
npm run prisma:seed  # if seed script exists
```

### 5. Start Development Servers

**Option 1: Docker Compose (Recommended)**
```bash
# Start all services with hot-reload
docker-compose -f docker-compose.dev.yml up
```

**Option 2: Manual**
```bash
# Terminal 1: PostgreSQL (if not running)
# Terminal 2: Redis (if not running)

# Terminal 3: Backend
cd backend
npm run dev

# Terminal 4: Frontend
cd frontend
npm run dev
```

Access:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- API Docs: http://localhost:3001/api (future)

---

## Making Changes

### Branch Naming

Use descriptive branch names:
- `feature/add-sms-verification`
- `fix/login-redirect-bug`
- `docs/update-readme`
- `refactor/auth-service`

```bash
# Create and switch to new branch
git checkout -b feature/your-feature-name
```

### File Structure

```
2fa/
├── backend/
│   ├── src/
│   │   ├── config/       # Configuration files
│   │   ├── controllers/  # Request handlers
│   │   ├── middleware/   # Express middleware
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic
│   │   ├── utils/        # Utility functions
│   │   └── types/        # TypeScript types
│   ├── tests/
│   │   ├── unit/         # Unit tests
│   │   ├── e2e/          # End-to-end tests
│   │   └── helpers/      # Test utilities
│   └── prisma/
│       └── schema.prisma # Database schema
├── frontend/
│   ├── app/              # Next.js pages (App Router)
│   ├── components/       # React components
│   ├── contexts/         # React contexts
│   └── lib/              # Utility libraries
└── docs/                 # Documentation
```

### Code Style

#### Backend (TypeScript)

```typescript
// Use explicit types
function generateToken(userId: string, email: string): string {
  // Implementation
}

// Use async/await (not callbacks)
async function createUser(data: CreateUserData): Promise<User> {
  try {
    const user = await prisma.user.create({ data })
    return user
  } catch (error) {
    logger.error('Failed to create user', error)
    throw error
  }
}

// Use meaningful variable names
const isEmailVerified = user.emailVerifiedAt !== null
const hasActiveTwoFactor = methods.length > 0
```

#### Frontend (React/TypeScript)

```typescript
// Use functional components with hooks
export function LoginPage() {
  const [email, setEmail] = useState('')
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await login({ email, password })
  }

  return <form onSubmit={handleSubmit}>...</form>
}

// Extract complex logic to custom hooks
function useAuth() {
  // Implementation
}
```

---

## Testing

### Running Tests

```bash
# Backend - All tests
cd backend
npm test

# Backend - Specific test suite
npm run test:unit
npm run test:e2e

# Backend - With coverage
npm run test:coverage

# Frontend - Build test
cd frontend
npm run build
```

### Writing Tests

#### Unit Test Example

```typescript
// backend/tests/unit/crypto.test.ts
import { hashPassword, verifyPassword } from '../../src/utils/crypto'

describe('Password Hashing', () => {
  it('should hash and verify password correctly', async () => {
    const password = 'SecurePass123!'
    const hash = await hashPassword(password)

    expect(hash).not.toBe(password)
    expect(await verifyPassword(password, hash)).toBe(true)
    expect(await verifyPassword('wrong', hash)).toBe(false)
  })
})
```

#### E2E Test Example

```typescript
// backend/tests/e2e/auth.test.ts
import request from 'supertest'
import app from '../../src/server'

describe('POST /api/auth/register', () => {
  it('should create new user', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        username: 'testuser',
        password: 'SecurePass123!',
      })

    expect(response.status).toBe(201)
    expect(response.body.success).toBe(true)
  })
})
```

### Test Coverage Requirements

- Overall: 80%+
- Services: 90%+
- Utils: 95%+
- Controllers: 80%+

---

## Coding Standards

### TypeScript

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Auto-fix linting errors
npm run lint:fix
```

### Code Quality Rules

1. **No `any` types** - Use proper TypeScript types
2. **Error handling** - Always handle errors appropriately
3. **No console.log** - Use proper logging (except in development)
4. **Comments** - Add comments for complex logic
5. **DRY** - Don't Repeat Yourself
6. **KISS** - Keep It Simple, Stupid
7. **YAGNI** - You Aren't Gonna Need It

### Security Guidelines

1. **Never commit secrets** - Use environment variables
2. **Validate input** - Always validate user input
3. **Sanitize output** - Prevent XSS attacks
4. **Use parameterized queries** - Prevent SQL injection
5. **Hash passwords** - Use Argon2 (already implemented)
6. **Rate limiting** - Implement on sensitive endpoints

---

## Commit Guidelines

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding/updating tests
- `chore`: Build process, dependencies, etc.

**Examples:**

```
feat(auth): add Google OAuth integration

Implements Google OAuth 2.0 authentication flow.
Users can now sign in with their Google account.

Closes #123
```

```
fix(2fa): resolve TOTP verification timing issue

Previously, TOTP codes were rejected if submitted
exactly at the 30-second boundary. This fix adds
a 30-second window tolerance.

Fixes #456
```

### Pre-commit Checklist

- [ ] Code compiles without errors
- [ ] All tests pass
- [ ] No linting errors
- [ ] Changes are documented
- [ ] Commit message follows guidelines

---

## Pull Request Process

### 1. Update Your Branch

```bash
# Fetch latest changes from upstream
git fetch upstream

# Rebase your branch on upstream/main
git rebase upstream/main

# Push to your fork (force push if rebased)
git push origin your-branch-name --force-with-lease
```

### 2. Create Pull Request

**PR Title:** Same format as commit messages
```
feat(auth): add Google OAuth integration
```

**PR Description Template:**
```markdown
## Description
Brief description of the changes

## Changes
- Change 1
- Change 2
- Change 3

## Related Issues
Closes #123
Fixes #456

## Testing
- [ ] Unit tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed

## Screenshots (if applicable)
[Add screenshots for UI changes]

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests pass locally
```

### 3. Code Review

- Address reviewer feedback
- Make requested changes
- Push updates to the same branch
- Mark conversations as resolved

### 4. Merge

Once approved:
- Squash commits if requested
- Wait for CI to pass
- Maintainer will merge

---

## Getting Help

- **Questions:** GitHub Discussions
- **Bugs:** GitHub Issues
- **Chat:** Discord (if available)
- **Email:** dev@example.com

---

## Recognition

Contributors will be:
- Added to the Contributors list
- Mentioned in release notes for significant contributions
- Invited to the contributors team (for regular contributors)

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
