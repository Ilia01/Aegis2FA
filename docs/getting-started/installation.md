# Installation Guide

This guide covers different ways to install and run the Aegis2FA service.

## Prerequisites

- **Node.js** 18+ (for manual setup)
- **PostgreSQL** 14+
- **Redis** 6+
- **Docker** & Docker Compose (for Docker setup)

---

## Quick Install (Docker Compose)

The easiest way to get started. All services run in containers.

### Step 1: Clone Repository

```bash
git clone https://github.com/Ilia01/Aegis2FA.git
cd Aegis2FA
```

### Step 2: Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Generate JWT secrets
for i in {1..4}; do
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
done

# Edit .env with your secrets
nano .env
```

Required variables:
```env
JWT_ACCESS_SECRET=<generated-secret-1>
JWT_REFRESH_SECRET=<generated-secret-2>
TEMP_TOKEN_SECRET=<generated-secret-3>
DEVICE_TOKEN_SECRET=<generated-secret-4>
```

### Step 3: Start Services

```bash
# Start all services
docker-compose up -d

# Run database migrations
docker-compose exec backend npx prisma migrate deploy

# Verify health
curl http://localhost:3001/api/health
```

**Done!** The service is now running:
- Backend API: http://localhost:3001
- Frontend: http://localhost:3000

---

## Manual Setup

For those who prefer to run without Docker or need more control.

### Step 1: Install Dependencies

#### PostgreSQL

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# macOS
brew install postgresql
brew services start postgresql

# Create database
sudo -u postgres psql
CREATE DATABASE twofa_db;
CREATE USER twofa_user WITH PASSWORD 'your-password';
GRANT ALL PRIVILEGES ON DATABASE twofa_db TO twofa_user;
\q
```

#### Redis

```bash
# Ubuntu/Debian
sudo apt install redis-server
sudo systemctl start redis

# macOS
brew install redis
brew services start redis

# Test connection
redis-cli ping  # Should return PONG
```

#### Node.js

```bash
# Ubuntu/Debian (via NodeSource)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# macOS
brew install node@18

# Verify
node --version  # Should be 18+
npm --version
```

### Step 2: Clone and Setup Backend

```bash
# Clone repository
git clone https://github.com/Ilia01/Aegis2FA.git
cd Aegis2FA/backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
nano .env
```

Configure `backend/.env`:
```env
NODE_ENV=development

# Database
DATABASE_URL=postgresql://twofa_user:your-password@localhost:5432/twofa_db?schema=public

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT Secrets (generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_ACCESS_SECRET=<64-char-secret>
JWT_REFRESH_SECRET=<64-char-secret>
TEMP_TOKEN_SECRET=<64-char-secret>
DEVICE_TOKEN_SECRET=<64-char-secret>

# Server
PORT=3001
CORS_ORIGINS=http://localhost:3000

# Optional: Email 2FA (Gmail example)
EMAIL_SERVICE=gmail
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=<app-password>
EMAIL_FROM=noreply@yourdomain.com

# Optional: SMS 2FA (Twilio)
TWILIO_ACCOUNT_SID=<your-sid>
TWILIO_AUTH_TOKEN=<your-token>
TWILIO_PHONE_NUMBER=<your-number>
```

### Step 3: Run Database Migrations

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Verify database
npx prisma db pull
```

### Step 4: Start Backend

```bash
# Development mode with hot reload
npm run dev

# Production mode
npm run build
npm start
```

Backend should now be running on http://localhost:3001

### Step 5: Setup Frontend (Optional)

The frontend is a demo application. For production, integrate the API into your own app.

```bash
cd ../frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
nano .env.local
```

Configure `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

Start frontend:
```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

Frontend should now be running on http://localhost:3000

### Step 6: Verify Installation

Test the health endpoint:
```bash
curl http://localhost:3001/api/health

# Expected response
{
  "status": "healthy",
  "checks": {
    "database": "up",
    "redis": "up"
  }
}
```

Test user registration:
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "SecurePass123!"
  }'
```

---

## Running as a Service (Linux)

To run the backend as a systemd service:

### Create Service File

```bash
sudo nano /etc/systemd/system/aegis2fa.service
```

```ini
[Unit]
Description=Aegis2FA Backend Service
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/Aegis2FA/backend
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### Enable and Start

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service on boot
sudo systemctl enable aegis2fa

# Start service
sudo systemctl start aegis2fa

# Check status
sudo systemctl status aegis2fa

# View logs
sudo journalctl -u aegis2fa -f
```

---

## Development Setup

For active development with testing and debugging.

### Install Dev Dependencies

```bash
cd backend
npm install --include=dev
```

### Run Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### Lint and Format

```bash
# Lint code
npm run lint

# Fix lint issues
npm run lint:fix

# Format code
npm run format
```

### Database Management

```bash
# Open Prisma Studio (GUI for database)
npx prisma studio

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Create new migration
npx prisma migrate dev --name your-migration-name

# View database schema
npx prisma db pull
```

---

## Troubleshooting

### PostgreSQL Connection Issues

```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Check connection
psql -U twofa_user -d twofa_db -h localhost -W

# If connection refused, check pg_hba.conf
sudo nano /etc/postgresql/14/main/pg_hba.conf
# Add: local   all   twofa_user   md5
sudo systemctl restart postgresql
```

### Redis Connection Issues

```bash
# Check if Redis is running
sudo systemctl status redis

# Test connection
redis-cli ping

# Check Redis config
sudo nano /etc/redis/redis.conf
```

### Port Already in Use

```bash
# Find process using port 3001
sudo lsof -i :3001

# Kill process
sudo kill -9 <PID>

# Or change port in .env
PORT=3002
```

### Module Not Found Errors

```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Prisma Issues

```bash
# Regenerate Prisma Client
npx prisma generate

# Reset Prisma Client
rm -rf node_modules/.prisma
npx prisma generate

# Check schema
npx prisma validate
```

---

## Next Steps

- [Quick Start Guide](quick-start.md) - Complete tutorial
- [Zero-Budget Deployment](zero-budget.md) - Deploy for free
- [API Documentation](../api/index.md) - Explore the API
- [Integration Guide](../guides/integration.md) - Integrate into your app

---

## Support

Having issues? Check:
- [FAQ](../faq.md) - Common questions
- [Troubleshooting Guide](../deployment/docker.md#troubleshooting) - Common problems
- [GitHub Issues](https://github.com/Ilia01/Aegis2FA/issues) - Report bugs
- [GitHub Discussions](https://github.com/Ilia01/Aegis2FA/discussions) - Ask questions
