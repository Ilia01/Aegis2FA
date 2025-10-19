# 2FA Service Integration Guide

Complete guide for integrating the 2FA Authentication Service into your application.

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Docker Deployment](#docker-deployment)
4. [API Key Authentication](#api-key-authentication)
5. [Integration Patterns](#integration-patterns)
6. [Webhook Configuration](#webhook-configuration)
7. [Code Examples](#code-examples)
8. [Security Best Practices](#security-best-practices)

---

## Overview

The 2FA Authentication Service is a standalone microservice that provides enterprise-grade two-factor authentication for your applications. It supports multiple 2FA methods (TOTP, SMS, Email) and can be integrated via REST API.

### Architecture

```
┌─────────────────┐          ┌──────────────────┐
│  Your App       │  <───>   │  2FA Service     │
│  (Any Language) │   REST   │  (Docker/K8s)    │
└─────────────────┘   API    └──────────────────┘
                                      │
                              ┌───────┴────────┐
                              │                │
                        PostgreSQL         Redis
```

### Integration Methods

1. **User Token Authentication**: Your users log in directly to the 2FA service
2. **API Key Authentication**: Your app makes requests on behalf of users (recommended for B2B)
3. **Webhook Events**: Receive real-time notifications about 2FA events

---

## Quick Start

### 1. Deploy the Service

Using Docker Compose (recommended):

```bash
# Clone the repository
git clone https://github.com/your-org/2fa-service.git
cd 2fa-service

# Create environment file
cp .env.example .env

# Generate secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Update .env with your secrets:
# - JWT_ACCESS_SECRET
# - JWT_REFRESH_SECRET
# - DEVICE_TOKEN_SECRET
# - POSTGRES_PASSWORD

# Start the service
docker-compose up -d

# Run database migrations
docker-compose exec backend npx prisma migrate deploy
```

The service will be available at `http://localhost:3001`

### 2. Create a User Account

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yourapp.com",
    "username": "admin",
    "password": "SecurePassword123!"
  }'
```

### 3. Generate API Key

```bash
# Login first
LOGIN_RESPONSE=$(curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"emailOrUsername": "admin", "password": "SecurePassword123!"}')

ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.accessToken')

# Create API key
curl -X POST http://localhost:3001/api/api-keys \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production App",
    "scopes": ["2fa:read", "2fa:write"],
    "rateLimit": 5000
  }'
```

**Save the returned API key securely - it won't be shown again!**

---

## Docker Deployment

### Production Deployment

```bash
# Production deployment
docker-compose up -d

# View logs
docker-compose logs -f backend

# Scale workers
docker-compose up -d --scale worker=3
```

### Development Mode

```bash
# Development with hot-reload
docker-compose -f docker-compose.dev.yml up

# Your code changes will auto-reload
```

### Environment Variables

Required for production:

```env
# Database
DATABASE_URL=postgresql://user:password@postgres:5432/db

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# JWT Secrets (generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_ACCESS_SECRET=<64-char-secret>
JWT_REFRESH_SECRET=<64-char-secret>
DEVICE_TOKEN_SECRET=<64-char-secret>

# CORS (comma-separated)
CORS_ORIGINS=https://yourapp.com,https://admin.yourapp.com

# Optional: Twilio (for SMS)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Optional: Email (SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=
EMAIL_PASSWORD=
EMAIL_FROM=noreply@yourapp.com
```

---

## API Key Authentication

### Creating API Keys

API keys allow your application to interact with the 2FA service without requiring individual user login.

```javascript
// Step 1: Create API key (one-time setup)
const response = await fetch('http://2fa-service:3001/api/api-keys', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${userAccessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Production App',
    scopes: ['2fa:read', '2fa:write', 'webhooks:read', 'webhooks:write'],
    rateLimit: 10000, // requests per hour
    expiresAt: '2025-12-31T23:59:59Z' // optional
  })
});

const { apiKey } = await response.json();
// Save apiKey securely (e.g., environment variable)
```

### Using API Keys

```javascript
// Use API key for subsequent requests
const response = await fetch('http://2fa-service:3001/api/2fa/totp/setup', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`, // or
    'X-API-Key': apiKey,
    'Content-Type': 'application/json'
  }
});
```

### Available Scopes

- `*` - Full access (use cautiously)
- `2fa:read` - View 2FA methods and status
- `2fa:write` - Enable/disable 2FA methods
- `user:read` - View user information
- `webhooks:read` - View webhooks
- `webhooks:write` - Create/update webhooks

---

## Integration Patterns

### Pattern 1: Proxy Integration (Recommended)

Your app acts as a proxy between users and the 2FA service.

```javascript
// backend/routes/auth.js
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  // 1. Verify user in your database
  const user = await db.users.findByEmail(email);
  if (!user || !await bcrypt.compare(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // 2. Check if 2FA is enabled for this user
  const twoFAResponse = await fetch('http://2fa-service:3001/api/2fa/methods', {
    headers: { 'X-API-Key': process.env.TFA_API_KEY }
  });

  const { data: methods } = await twoFAResponse.json();
  const has2FA = methods.length > 0;

  if (has2FA) {
    // Return indication that 2FA is required
    return res.json({
      requiresTwoFactor: true,
      userId: user.id,
      // Don't send session token yet
    });
  }

  // 3. No 2FA - create session
  const sessionToken = createSession(user.id);
  res.json({ sessionToken, user });
});

app.post('/api/auth/verify-2fa', async (req, res) => {
  const { userId, code } = req.body;

  // Verify code with 2FA service
  const response = await fetch('http://2fa-service:3001/api/2fa/verify', {
    method: 'POST',
    headers: {
      'X-API-Key': process.env.TFA_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ code, userId })
  });

  if (response.ok) {
    const sessionToken = createSession(userId);
    return res.json({ sessionToken });
  }

  res.status(401).json({ error: '2FA verification failed' });
});
```

### Pattern 2: Direct Integration

Users interact directly with the 2FA service.

```javascript
// frontend/auth.js
async function login(email, password) {
  // Step 1: Login to 2FA service
  const response = await fetch('http://2fa-service:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrUsername: email, password })
  });

  const data = await response.json();

  if (data.requiresTwoFactor) {
    // Step 2: Prompt for 2FA code
    const code = await prompt2FA();

    // Step 3: Verify 2FA
    const verifyResponse = await fetch('http://2fa-service:3001/api/2fa/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tempToken: data.tempToken,
        code
      })
    });

    const verifyData = await verifyResponse.json();
    return verifyData.accessToken;
  }

  return data.accessToken;
}
```

---

## Webhook Configuration

Webhooks notify your application about 2FA events in real-time.

### 1. Create Webhook Endpoint

```javascript
// backend/webhooks/2fa.js
app.post('/webhooks/2fa', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const event = req.headers['x-webhook-event'];
  const payload = JSON.stringify(req.body);

  // Verify signature
  const crypto = require('crypto');
  const expectedSignature = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  if (signature !== expectedSignature) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Handle events
  switch (event) {
    case '2fa.enabled':
      console.log(`User ${req.body.data.userId} enabled 2FA`);
      // Update your database, send notification, etc.
      break;

    case '2fa.verified':
      console.log(`User ${req.body.data.userId} verified 2FA`);
      break;

    case '2fa.failed':
      console.log(`User ${req.body.data.userId} failed 2FA attempt`);
      // Track failed attempts, lock account after X failures
      break;
  }

  res.json({ success: true });
});
```

### 2. Register Webhook

```bash
curl -X POST http://localhost:3001/api/webhooks \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://yourapp.com/webhooks/2fa",
    "events": ["2fa.enabled", "2fa.verified", "2fa.failed"]
  }'
```

**Save the webhook secret returned - you need it to verify signatures!**

### 3. Test Webhook

```bash
curl -X POST http://localhost:3001/api/webhooks/{webhookId}/test \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### Supported Events

- `2fa.enabled` - User enables 2FA
- `2fa.disabled` - User disables 2FA
- `2fa.verified` - 2FA code verified successfully
- `2fa.failed` - 2FA verification failed
- `user.login` - User logged in
- `user.logout` - User logged out

---

## Code Examples

### Node.js/Express

```javascript
const axios = require('axios');

class TwoFactorAuthClient {
  constructor(apiKey, baseURL = 'http://localhost:3001/api') {
    this.client = axios.create({
      baseURL,
      headers: { 'X-API-Key': apiKey }
    });
  }

  async setupTOTP(userId) {
    const response = await this.client.post('/2fa/totp/setup', { userId });
    return response.data; // Returns QR code and secret
  }

  async verifyTOTP(userId, code) {
    const response = await this.client.post('/2fa/totp/verify-setup', {
      userId,
      code
    });
    return response.data; // Returns backup codes
  }

  async verify2FA(tempToken, code) {
    const response = await this.client.post('/2fa/verify', {
      tempToken,
      code
    });
    return response.data; // Returns access token
  }
}

// Usage
const tfaClient = new TwoFactorAuthClient(process.env.TFA_API_KEY);
const { qrCode, secret } = await tfaClient.setupTOTP('user-id');
```

### Python

```python
import requests
import hmac
import hashlib

class TwoFactorAuthClient:
    def __init__(self, api_key, base_url='http://localhost:3001/api'):
        self.api_key = api_key
        self.base_url = base_url

    def _headers(self):
        return {'X-API-Key': self.api_key, 'Content-Type': 'application/json'}

    def setup_totp(self, user_id):
        response = requests.post(
            f'{self.base_url}/2fa/totp/setup',
            json={'userId': user_id},
            headers=self._headers()
        )
        return response.json()

    def verify_2fa(self, temp_token, code):
        response = requests.post(
            f'{self.base_url}/2fa/verify',
            json={'tempToken': temp_token, 'code': code},
            headers=self._headers()
        )
        return response.json()

# Usage
client = TwoFactorAuthClient(os.getenv('TFA_API_KEY'))
result = client.setup_totp('user-id')
print(f"QR Code: {result['data']['qrCode']}")
```

### cURL

```bash
# Setup TOTP
curl -X POST http://localhost:3001/api/2fa/totp/setup \
  -H "X-API-Key: $TFA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-123"}'

# Verify 2FA
curl -X POST http://localhost:3001/api/2fa/verify \
  -H "Content-Type: application/json" \
  -d '{
    "tempToken": "...",
    "code": "123456"
  }'
```

---

## Security Best Practices

### 1. API Key Management

- Store API keys in environment variables or secret managers (AWS Secrets Manager, HashiCorp Vault)
- Use different keys for development, staging, and production
- Rotate keys regularly (use the `/api-keys/{id}/rotate` endpoint)
- Set appropriate scopes (principle of least privilege)
- Monitor API key usage and set rate limits

### 2. Network Security

- Run 2FA service in private network (not publicly accessible)
- Use API gateway or reverse proxy for external access
- Enable HTTPS/TLS for all traffic
- Whitelist IP addresses if possible

### 3. Webhook Security

- Always verify webhook signatures
- Use HTTPS endpoints for webhooks
- Implement idempotency (webhooks may be retried)
- Log all webhook deliveries for audit

### 4. Database Security

- Use strong PostgreSQL passwords
- Enable connection encryption
- Regular backups
- Limit database user permissions

### 5. Monitoring

- Monitor health endpoints: `/api/health`
- Track failed 2FA attempts
- Alert on webhook delivery failures
- Monitor API key usage patterns

---

## Health Checks

### Endpoints

- `GET /api/health` - Comprehensive health check (database, Redis, memory)
- `GET /api/health/live` - Liveness probe (for Kubernetes)
- `GET /api/health/ready` - Readiness probe (for load balancers)

### Example Response

```json
{
  "status": "healthy",
  "timestamp": "2024-10-18T19:00:00.000Z",
  "service": "2FA Authentication Service",
  "version": "1.0.0",
  "uptime": 3600,
  "checks": {
    "database": {
      "status": "up",
      "responseTime": 5
    },
    "redis": {
      "status": "up",
      "responseTime": 2
    },
    "memory": {
      "status": "up",
      "heapUsed": 150,
      "heapTotal": 200
    }
  }
}
```

---

## Support

- GitHub Issues: https://github.com/your-org/2fa-service/issues
- Documentation: https://docs.yourservice.com
- Email: support@yourservice.com
