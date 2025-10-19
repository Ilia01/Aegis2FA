# Zero-Budget Deployment ($0/month)

Deploy the 2FA Authentication Service with **absolutely zero cost** using TOTP 2FA and free hosting tiers.

!!! success "100% Free Components"
    - ✅ TOTP (Google Authenticator) - No external service needed
    - ✅ Backup Codes - Built-in
    - ✅ Trusted Devices - Built-in
    - ✅ PostgreSQL - Free tier available
    - ✅ Redis - Free tier available
    - ✅ Hosting - Multiple free options

## What Works for Free

| Feature | Cost | Details |
|---------|------|---------|
| **TOTP 2FA** | $0 | Google Authenticator, Authy - 100% offline |
| **Backup Codes** | $0 | Generated and stored in your database |
| **Trusted Devices** | $0 | 30-day device memory |
| **PostgreSQL** | $0 | 500MB-3GB free (varies by provider) |
| **Redis** | $0 | 10MB-30MB free (varies by provider) |
| **Hosting** | $0 | 500-750 hours/month free |

## What Doesn't Work (Requires Payment)

- ❌ SMS 2FA (Twilio charges ~$0.0075 per SMS)
- ❌ Email 2FA if over 500 emails/day (Gmail free tier)

## Step-by-Step Setup

### Step 1: Choose Your Free Hosting Platform

=== "Railway (Recommended)"

    **Free Tier**: 500 hours/month

    ```bash
    # Install Railway CLI
    npm i -g @railway/cli

    # Login and deploy
    railway login
    railway init
    railway up
    ```

    **Add PostgreSQL**:
    1. Go to Railway dashboard
    2. Click "New" → "Database" → "PostgreSQL"
    3. Copy `DATABASE_URL` from variables

    **Add Redis** (via Upstash):
    1. In Railway, click "New" → "Empty Service"
    2. Connect to [Upstash](https://upstash.com) (10MB free)
    3. Copy Redis URL

=== "Render"

    **Free Tier**: 750 hours/month

    1. Sign up at [render.com](https://render.com)
    2. Create new "Web Service" from GitHub repo
    3. Add PostgreSQL (1GB free for 90 days)
    4. Set environment variables

=== "Fly.io"

    **Free Tier**: 3 shared-CPU VMs

    ```bash
    # Install Fly CLI
    curl -L https://fly.io/install.sh | sh

    # Deploy
    fly launch
    fly postgres create
    ```

### Step 2: Generate JWT Secrets

Generate 4 secrets locally:

```bash
for i in {1..4}; do
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
done
```

### Step 3: Configure Environment Variables

In your hosting platform dashboard, set these variables:

```env
# Required JWT Secrets (paste your generated secrets)
JWT_ACCESS_SECRET=<your-64-char-secret-1>
JWT_REFRESH_SECRET=<your-64-char-secret-2>
TEMP_TOKEN_SECRET=<your-64-char-secret-3>
DEVICE_TOKEN_SECRET=<your-64-char-secret-4>

# Database (provided by hosting platform)
DATABASE_URL=<provided-by-platform>

# Redis (from Upstash or platform)
REDIS_HOST=<your-redis-host>
REDIS_PORT=6379
REDIS_PASSWORD=<provided-if-needed>

# IMPORTANT: Leave these UNSET for zero-budget
# TWILIO_ACCOUNT_SID=  # ← Not needed for TOTP
# TWILIO_AUTH_TOKEN=   # ← Not needed for TOTP
# EMAIL_USER=          # ← Optional, only if you want email
# EMAIL_PASSWORD=      # ← Optional, only if you want email
```

### Step 4: Deploy

#### Railway

```bash
railway up
railway run npx prisma migrate deploy
```

#### Render

Render will auto-deploy on git push. Run migrations in the shell:

```bash
npx prisma migrate deploy
```

#### Fly.io

```bash
fly deploy
fly ssh console
npx prisma migrate deploy
```

### Step 5: Verify Deployment

Test your deployed service:

```bash
curl https://your-app.railway.app/api/health

# Should return:
# {
#   "status": "healthy",
#   "checks": {
#     "database": "up",
#     "redis": "up"
#   }
# }
```

## Free Database Options

### PostgreSQL

| Provider | Free Tier | Limits |
|----------|-----------|--------|
| **Supabase** | 500MB | 2 projects, unlimited API requests |
| **Railway** | 512MB | Shared CPU, 500hrs/month |
| **Neon** | 3GB | 10 projects |
| **Render** | 1GB | Expires after 90 days |
| **ElephantSQL** | 20MB | Shared server |

### Redis

| Provider | Free Tier | Limits |
|----------|-----------|--------|
| **Upstash** | 10MB | 10K commands/day |
| **Redis Cloud** | 30MB | Shared server |
| **Railway** | Via marketplace | 500hrs/month |

## Optional: Free Email (500 emails/day)

If you want Email 2FA with Gmail's free tier:

1. **Enable 2-Step Verification** on your Google account
2. **Generate App Password**:
   - Go to Google Account → Security → 2-Step Verification
   - Scroll to "App passwords"
   - Generate password for "Mail"

3. **Add to environment variables**:

```env
EMAIL_SERVICE=gmail
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=<16-char-app-password>
EMAIL_FROM=noreply@yourdomain.com
```

**Limit**: 500 emails/day (Google's free tier limit)

## Cost Breakdown

### Completely Free Setup (TOTP Only)

```
Railway/Render Hosting:     $0/month (free tier)
PostgreSQL (Supabase):       $0/month (500MB free)
Redis (Upstash):            $0/month (10MB free)
TOTP 2FA:                   $0/month (no external service)
Backup Codes:               $0/month (built-in)
Trusted Devices:            $0/month (built-in)
───────────────────────────────────────
TOTAL:                      $0/month
```

### With Optional Email (Gmail)

```
Everything above:           $0/month
Gmail (500 emails/day):     $0/month
───────────────────────────────────────
TOTAL:                      $0/month
```

## Limitations of Free Tier

### What You Get

- ✅ Full TOTP 2FA functionality
- ✅ User registration and authentication
- ✅ Backup codes
- ✅ Trusted devices
- ✅ API key management
- ✅ Webhooks
- ✅ Health checks

### What You Don't Get

- ❌ SMS 2FA (requires paid Twilio account)
- ❌ Unlimited emails (Gmail limit: 500/day)
- ❌ High availability (free tiers may have downtime)
- ❌ Auto-scaling
- ❌ Dedicated resources

## Scaling Beyond Free Tier

When you outgrow the free tier:

| Service | Paid Tier | Cost |
|---------|-----------|------|
| Railway | Hobby | $5/month + usage |
| Render | Starter | $7/month |
| Supabase | Pro | $25/month |
| Upstash Redis | Pay-as-you-go | $0.20 per 100K commands |
| Twilio SMS | Pay-per-use | $0.0075 per SMS |

## Production Considerations

!!! warning "Free Tier vs Production"
    Free tiers are great for:

    - ✅ Development
    - ✅ Testing
    - ✅ Small projects (< 100 users)
    - ✅ Proof of concept

    Consider paid tiers for:

    - ⚠️ Production apps with > 100 users
    - ⚠️ Mission-critical applications
    - ⚠️ Applications requiring 99.9% uptime
    - ⚠️ High-traffic applications

## Troubleshooting

### Database Connection Limit Reached

Free PostgreSQL tiers have connection limits (usually 20-100).

**Solution**: Reduce connection pool size in Prisma:

```env
DATABASE_URL=postgresql://user:pass@host:5432/db?connection_limit=10
```

### Redis Memory Limit Exceeded

Upstash free tier is 10MB.

**Solution**:
- Reduce OTP expiry time (default 5 minutes)
- Clear old rate limit keys more frequently
- Upgrade to paid tier ($0.20 per 100K commands)

### Service Sleeps (Railway/Render)

Free tiers may sleep after inactivity.

**Solution**:
- Upgrade to paid tier
- Use a free uptime monitor (UptimeRobot) to ping every 5 minutes
- Accept the ~30-second cold start delay

## Next Steps

Once deployed:

1. **Test the API**: [API Reference](../api/index.md)
2. **Integrate into your app**: [Integration Guide](../guides/integration.md)
3. **Monitor your service**: [Monitoring Guide](../deployment/monitoring.md)
4. **Scale when needed**: [Cloud Platforms](../deployment/cloud-platforms.md)

---

**Questions?** Join our [GitHub Discussions](https://github.com/your-org/2fa/discussions)
