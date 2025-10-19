# Quick Start

Get the 2FA Authentication Service running in **5 minutes** with Docker.

## Prerequisites

Before starting, ensure you have:

- [x] Docker and Docker Compose installed
- [x] 1GB RAM minimum
- [x] Port 3000 and 3001 available

!!! tip "Don't have Docker?"
    [Install Docker Desktop](https://www.docker.com/products/docker-desktop/) for your operating system.

## Step 1: Clone the Repository

```bash
git clone https://github.com/Ilia01/Aegis2FA.git
cd 2fa
```

## Step 2: Generate JWT Secrets

Generate 4 random secrets for JWT tokens:

```bash
for i in {1..4}; do
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
done
```

Copy the 4 generated strings - you'll need them in the next step.

## Step 3: Configure Environment

Create your environment file:

```bash
cp .env.example .env
nano .env  # Or use your preferred editor
```

Add the 4 secrets you generated:

```env title=".env"
JWT_ACCESS_SECRET=<paste-first-secret-here>
JWT_REFRESH_SECRET=<paste-second-secret-here>
TEMP_TOKEN_SECRET=<paste-third-secret-here>
DEVICE_TOKEN_SECRET=<paste-fourth-secret-here>

# Database will be created automatically by Docker
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/twofa_db?schema=public

# Redis (already configured for Docker)
REDIS_HOST=redis
REDIS_PORT=6379
```

!!! success "TOTP Only (No External Services)"
    The configuration above is all you need for TOTP 2FA (Google Authenticator).
    No Twilio, no email service required!

## Step 4: Start the Services

```bash
docker-compose up -d
```

This starts:

- ✅ PostgreSQL database
- ✅ Redis cache
- ✅ Backend API (port 3001)
- ✅ Frontend demo (port 3000)
- ✅ Background workers

## Step 5: Run Database Migrations

```bash
docker-compose exec backend npx prisma migrate deploy
```

## Step 6: Verify Installation

Check that all services are healthy:

```bash
# Check health endpoint
curl http://localhost:3001/api/health

# Expected response:
# {
#   "status": "healthy",
#   "checks": {
#     "database": "up",
#     "redis": "up",
#     "memory": "ok"
#   }
# }
```

Visit the frontend demo:

```
http://localhost:3000
```

## Step 7: Test the Service

### Register a User

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "SecurePass123!"
  }'
```

### Setup TOTP 2FA

1. Visit http://localhost:3000
2. Register with the credentials above
3. Navigate to "Setup 2FA"
4. Choose "TOTP (Google Authenticator)"
5. Scan the QR code with your authenticator app
6. Enter the 6-digit code to complete setup

!!! success "🎉 Congratulations!"
    Your 2FA service is now running! You can now integrate it into your application.

## Next Steps

=== "Integrate into Your App"

    Learn how to integrate the 2FA service into your application

    [:octicons-arrow-right-24: Integration Guide](../guides/integration.md)

=== "Deploy to Production"

    Deploy the service to a cloud platform or your own server

    [:octicons-arrow-right-24: Deployment Guide](../deployment/docker.md)

=== "Explore the API"

    Try out all the API endpoints with interactive documentation

    [:octicons-arrow-right-24: API Reference](../api/index.md)

=== "Setup Other 2FA Methods"

    Configure SMS or Email 2FA

    [:octicons-arrow-right-24: SMS Setup](../api/two-factor.md#sms-2fa)
    [:octicons-arrow-right-24: Email Setup](../api/two-factor.md#email-2fa)

## Troubleshooting

### Port Already in Use

If ports 3000 or 3001 are already in use, edit `docker-compose.yml`:

```yaml
services:
  backend:
    ports:
      - "3002:3001"  # Change 3001 to 3002
  frontend:
    ports:
      - "3001:3000"  # Change 3000 to 3001
```

### Database Connection Error

Ensure PostgreSQL container is running:

```bash
docker-compose ps postgres
docker-compose logs postgres
```

If needed, restart the database:

```bash
docker-compose restart postgres
```

### Redis Connection Error

Check Redis status:

```bash
docker-compose exec redis redis-cli ping
# Should return: PONG
```

### View Logs

See what's happening in the backend:

```bash
docker-compose logs -f backend
```

## Clean Up

To stop and remove all containers:

```bash
docker-compose down
```

To also remove volumes (⚠️ deletes all data):

```bash
docker-compose down -v
```

## Support

Need help? Check out:

- [FAQ](../faq.md) - Common questions and solutions
- [GitHub Issues](https://github.com/Ilia01/Aegis2FA/issues) - Report bugs or request features
- [GitHub Discussions](https://github.com/Ilia01/Aegis2FA/discussions) - Ask questions
