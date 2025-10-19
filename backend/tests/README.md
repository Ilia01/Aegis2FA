# Backend Testing Guide

Comprehensive testing suite with unit tests and E2E tests.

## Test Structure

```
tests/
├── unit/                    # Unit tests for services and utilities
│   ├── crypto.test.ts       # Password hashing, OTP, HMAC
│   ├── jwt.test.ts          # Token generation and verification
│   ├── validators.test.ts   # Input validation
│   ├── auth.service.test.ts # Authentication service
│   ├── totp.service.test.ts # TOTP 2FA service
│   └── backupCodes.service.test.ts # Backup codes service
├── e2e/                     # End-to-end API tests
│   ├── auth.test.ts         # Auth endpoints
│   └── twofa.test.ts        # 2FA endpoints
├── helpers/                 # Test utilities
│   ├── testDb.ts            # Database helpers
│   ├── testRedis.ts         # Redis helpers
│   └── testApp.ts           # Express app setup
└── setup.ts                 # Global test setup
```

## Prerequisites

### 1. Test Database

Create a separate test database:

```bash
createdb twofa_test
```

Or update `.env.test` with your test database URL.

### 2. Redis

Ensure Redis is running on default port 6379.

## Running Tests

### All Tests

```bash
npm test
```

### Unit Tests Only

```bash
npm run test:unit
```

### E2E Tests Only

```bash
npm run test:e2e
```

### Watch Mode

```bash
npm run test:watch
```

### Coverage Report

```bash
npm run test:coverage
```

Coverage reports are generated in `coverage/` directory.

## Test Database Setup

The test suite automatically:
- Cleans the database before each test
- Cleans Redis before each test
- Disconnects after all tests complete

No manual cleanup required.

## Writing Tests

### Unit Test Example

```typescript
import { cleanDatabase, createTestUser, testDb, disconnectTestDb } from '../helpers/testDb';

describe('My Service', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  it('should do something', async () => {
    const user = await createTestUser();
    // Your test logic
  });
});
```

### E2E Test Example

```typescript
import request from 'supertest';
import { createTestApp } from '../helpers/testApp';
import { cleanDatabase } from '../helpers/testDb';

const app = createTestApp();

describe('My Endpoint', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  it('should return 200', async () => {
    const response = await request(app)
      .get('/api/endpoint')
      .expect(200);

    expect(response.body.success).toBe(true);
  });
});
```

## Test Coverage

Current coverage targets:
- **Overall**: 80%+
- **Services**: 90%+
- **Utils**: 95%+
- **Controllers**: 80%+

## CI/CD Integration

For CI/CD pipelines:

```yaml
# .github/workflows/test.yml
- name: Run tests
  run: |
    npm install
    npm run test:coverage
  env:
    DATABASE_URL: postgresql://postgres:postgres@localhost:5432/twofa_test
    NODE_ENV: test
```

## Troubleshooting

### Tests Hang

- Check if PostgreSQL is running
- Check if Redis is running
- Ensure test database exists

### Connection Errors

- Verify `.env.test` configuration
- Check database credentials
- Ensure Redis is accessible

### Flaky Tests

- Tests run sequentially (`--runInBand`)
- Database cleaned before each test
- Redis cleaned before each test

## Performance

- Unit tests: ~5-10 seconds
- E2E tests: ~15-20 seconds
- Full suite: ~25-30 seconds

## Test Coverage Report

View coverage:

```bash
npm run test:coverage
open coverage/lcov-report/index.html
```
