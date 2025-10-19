# Deployment Guide

Complete deployment guide for the 2FA Authentication Service with various deployment options.

## Table of Contents

1. [Quick Deploy (Zero Budget)](#quick-deploy-zero-budget)
2. [Production Deployment](#production-deployment)
3. [Cloud Platforms](#cloud-platforms)
4. [Environment Variables](#environment-variables)
5. [Database Setup](#database-setup)
6. [SSL/HTTPS Configuration](#sslhttps-configuration)
7. [Monitoring](#monitoring)
8. [Troubleshooting](#troubleshooting)

---

## Quick Deploy (Zero Budget)

Deploy with **$0/month** using TOTP 2FA (Google Authenticator) - no external services required!

### Prerequisites

- Docker & Docker Compose installed
- 1GB RAM minimum
- PostgreSQL-compatible database (free options below)
- Redis (free options below)

### Step 1: Generate Secrets

```bash
# Generate 4 JWT secrets
for i in {1..4}; do
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
done
```

### Step 2: Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit with your secrets
nano .env
```

Required variables:
```env
JWT_ACCESS_SECRET=<generated-secret-1>
JWT_REFRESH_SECRET=<generated-secret-2>
TEMP_TOKEN_SECRET=<generated-secret-3>
DEVICE_TOKEN_SECRET=<generated-secret-4>

# Use backend/.env.production.example for TOTP-only setup
```

### Step 3: Deploy with Docker Compose

```bash
# Start all services
docker-compose up -d

# Run database migrations
docker-compose exec backend npx prisma migrate deploy

# Check health
curl http://localhost:3001/api/health
```

### Free Hosting Options

#### Railway (Recommended)
- **Free tier**: 500 hours/month
- **Database**: PostgreSQL 512MB free
- **Redis**: Upstash 10MB free via marketplace

```bash
# Install Railway CLI
npm i -g @railway/cli

# Deploy
railway login
railway init
railway up
```

#### Render
- **Free tier**: 750 hours/month
- **Database**: PostgreSQL 1GB free (expires after 90 days)

#### Fly.io
- **Free tier**: 3 shared-cpu VMs
- **Database**: Fly Postgres 3GB free

---

## Production Deployment

### Architecture

```
┌─────────────────┐
│   Load Balancer │ (nginx/Caddy with SSL)
│   (HTTPS:443)   │
└────────┬────────┘
         │
    ┌────┴─────┬──────────┬──────────┐
    │          │          │          │
┌───┴───┐  ┌──┴───┐  ┌──┴───┐  ┌──┴───┐
│Backend│  │Backend│  │Worker│  │Worker│
│  :3001│  │  :3001│  │      │  │      │
└───┬───┘  └──┬───┘  └──┬───┘  └──┬───┘
    │         │         │          │
    └─────────┴─────────┴──────────┘
              │         │
      ┌───────┴───┐ ┌───┴────┐
      │ PostgreSQL│ │  Redis │
      └───────────┘ └────────┘
```

### Deployment Steps

#### 1. Server Setup (Ubuntu 22.04)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose-plugin

# Create deployment directory
sudo mkdir -p /opt/2fa
cd /opt/2fa
```

#### 2. Clone Repository

```bash
git clone https://github.com/your-org/2fa.git .
```

#### 3. Configure Production Environment

```bash
cp .env.example .env
nano .env
```

Production `.env`:
```env
NODE_ENV=production

# Database (use strong passwords!)
POSTGRES_PASSWORD=<strong-random-password>
DATABASE_URL=postgresql://twofa_user:${POSTGRES_PASSWORD}@postgres:5432/twofa_db?schema=public&connection_limit=20

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# JWT Secrets (64+ characters each)
JWT_ACCESS_SECRET=<secret-1>
JWT_REFRESH_SECRET=<secret-2>
TEMP_TOKEN_SECRET=<secret-3>
DEVICE_TOKEN_SECRET=<secret-4>

# CORS
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Optional: Email (free with Gmail)
EMAIL_SERVICE=gmail
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=<gmail-app-password>
EMAIL_FROM=noreply@yourdomain.com
```

#### 4. Deploy Services

```bash
# Build and start
docker-compose up -d

# Run migrations
docker-compose exec backend npx prisma migrate deploy

# Check status
docker-compose ps
docker-compose logs -f
```

#### 5. Setup Reverse Proxy (nginx)

```bash
sudo apt install nginx certbot python3-certbot-nginx

# Create nginx config
sudo nano /etc/nginx/sites-available/2fa
```

nginx configuration:
```nginx
# Backend API
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Frontend
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/2fa /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 6. Enable SSL with Let's Encrypt

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com
```

---

## Cloud Platforms

### AWS Deployment

#### Using ECS (Elastic Container Service)

```bash
# Install AWS CLI
aws configure

# Create ECR repositories
aws ecr create-repository --repository-name 2fa/backend
aws ecr create-repository --repository-name 2fa/frontend

# Build and push
docker build -t 2fa-backend ./backend
docker tag 2fa-backend:latest <account-id>.dkr.ecr.<region>.amazonaws.com/2fa/backend:latest
docker push <account-id>.dkr.ecr.<region>.amazonaws.com/2fa/backend:latest

# Deploy via ECS task definition
aws ecs create-service --service-name 2fa-backend --task-definition 2fa-backend --desired-count 2
```

#### Using EC2

```bash
# Launch Ubuntu 22.04 instance
# SSH into instance
ssh -i your-key.pem ubuntu@<instance-ip>

# Follow Production Deployment steps above
```

### Google Cloud Platform

#### Using Cloud Run

```bash
# Install gcloud CLI
gcloud auth login

# Build and deploy backend
gcloud run deploy 2fa-backend \
  --source=./backend \
  --region=us-central1 \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production,DATABASE_URL=..."

# Build and deploy frontend
gcloud run deploy 2fa-frontend \
  --source=./frontend \
  --region=us-central1 \
  --allow-unauthenticated
```

### Azure

#### Using Container Instances

```bash
az login

# Create resource group
az group create --name 2fa-rg --location eastus

# Deploy backend
az container create \
  --resource-group 2fa-rg \
  --name 2fa-backend \
  --image ghcr.io/your-org/2fa/backend:latest \
  --ports 3001 \
  --environment-variables NODE_ENV=production
```

---

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `production` |
| `DATABASE_URL` | PostgreSQL connection | `postgresql://user:pass@host:5432/db` |
| `REDIS_HOST` | Redis hostname | `redis` or `localhost` |
| `JWT_ACCESS_SECRET` | Access token secret (64+ chars) | `<generated>` |
| `JWT_REFRESH_SECRET` | Refresh token secret (64+ chars) | `<generated>` |
| `TEMP_TOKEN_SECRET` | Temp token secret (64+ chars) | `<generated>` |
| `DEVICE_TOKEN_SECRET` | Device token secret (64+ chars) | `<generated>` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Backend port | `3001` |
| `CORS_ORIGINS` | Allowed origins (comma-separated) | `http://localhost:3000` |
| `EMAIL_SERVICE` | Email service provider | `gmail` |
| `EMAIL_HOST` | SMTP host | `smtp.gmail.com` |
| `EMAIL_PORT` | SMTP port | `587` |
| `EMAIL_USER` | SMTP username | - |
| `EMAIL_PASSWORD` | SMTP password/app password | - |
| `TWILIO_ACCOUNT_SID` | Twilio SID (for SMS) | - |
| `TWILIO_AUTH_TOKEN` | Twilio token | - |
| `TWILIO_PHONE_NUMBER` | Twilio phone number | - |

---

## Database Setup

### PostgreSQL

#### Managed Services (Recommended)

- **Supabase**: 500MB free
- **Railway**: 512MB free
- **Neon**: 3GB free
- **AWS RDS**: Free tier 20GB

#### Self-Hosted

```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Create database
sudo -u postgres psql
CREATE DATABASE twofa_db;
CREATE USER twofa_user WITH PASSWORD 'strong-password';
GRANT ALL PRIVILEGES ON DATABASE twofa_db TO twofa_user;
```

### Redis

#### Managed Services

- **Upstash**: 10MB free
- **Redis Cloud**: 30MB free
- **Railway**: Redis via marketplace

#### Self-Hosted

```bash
# Install Redis
sudo apt install redis-server

# Configure persistence
sudo nano /etc/redis/redis.conf
# Set: appendonly yes

# Restart
sudo systemctl restart redis
```

---

## SSL/HTTPS Configuration

### Let's Encrypt (Free)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal (crontab)
0 0 * * * certbot renew --quiet
```

### Cloudflare (Free SSL + CDN)

1. Add domain to Cloudflare
2. Update DNS to Cloudflare nameservers
3. Enable "Full (Strict)" SSL mode
4. Enable "Always Use HTTPS"

---

## Monitoring

### Health Checks

```bash
# Backend health
curl https://api.yourdomain.com/api/health

# Expected response
{
  "status": "healthy",
  "checks": {
    "database": "up",
    "redis": "up"
  }
}
```

### Logging

```bash
# View logs
docker-compose logs -f backend
docker-compose logs -f worker

# Export to file
docker-compose logs backend > backend.log
```

### Prometheus + Grafana (Optional)

See monitoring configuration in `/docs/MONITORING.md` (future)

---

## Troubleshooting

### Common Issues

#### Database Connection Errors

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Verify connection string
docker-compose exec backend node -e "console.log(process.env.DATABASE_URL)"
```

#### Redis Connection Errors

```bash
# Test Redis
docker-compose exec redis redis-cli ping
# Should return: PONG
```

#### Port Already in Use

```bash
# Find process using port 3001
sudo lsof -i :3001

# Kill process
sudo kill -9 <PID>
```

#### Out of Memory

```bash
# Check memory usage
docker stats

# Increase Docker memory limit
# Or add swap space
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

---

## Backup & Recovery

### Database Backup

```bash
# Backup
docker-compose exec postgres pg_dump -U twofa_user twofa_db > backup-$(date +%Y%m%d).sql

# Restore
docker-compose exec -T postgres psql -U twofa_user twofa_db < backup-20241019.sql
```

### Automated Backups (cron)

```bash
# Add to crontab
0 2 * * * cd /opt/2fa && docker-compose exec postgres pg_dump -U twofa_user twofa_db | gzip > /backups/2fa-$(date +\%Y\%m\%d).sql.gz
```

---

## Scaling

### Horizontal Scaling

```bash
# Scale backend to 3 instances
docker-compose up -d --scale backend=3

# Scale workers to 2 instances
docker-compose up -d --scale worker=2
```

### Load Balancing

Use nginx or HAProxy for load balancing multiple backend instances.

---

## Security Checklist

- [ ] Strong JWT secrets (64+ characters)
- [ ] HTTPS enabled
- [ ] Firewall configured (only 80/443 open)
- [ ] Database passwords changed
- [ ] CORS origins whitelist
- [ ] Regular security updates
- [ ] Backup strategy in place
- [ ] Monitoring enabled

---

## Support

- **Documentation**: See `/docs`
- **Issues**: GitHub Issues
- **Community**: GitHub Discussions
