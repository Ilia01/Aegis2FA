# Frequently Asked Questions

## General Questions

### What is this service?

A production-ready Two-Factor Authentication service that you can self-host and integrate into your applications. It provides enterprise-grade 2FA capabilities via REST API.

### Is it really free?

Yes! With TOTP 2FA (Google Authenticator), you can deploy and run this service with **$0/month** using free hosting tiers. See our [Zero-Budget Deployment Guide](getting-started/zero-budget.md).

### Can I use this in production?

Absolutely! The service includes:
- ✅ 80%+ test coverage
- ✅ Security best practices (Argon2, rate limiting, CSRF protection)
- ✅ Health checks and monitoring
- ✅ Docker deployment
- ✅ CI/CD pipelines

However, for mission-critical applications, consider using paid tiers for better reliability.

### What 2FA methods are supported?

- **TOTP** (Google Authenticator, Authy) - Free
- **SMS** (via Twilio) - Paid
- **Email** (via SMTP) - Free with Gmail (500/day limit)
- **Backup Codes** - Free
- **Trusted Devices** - Free

## Setup & Installation

### How long does setup take?

- **Docker (local)**: 5 minutes
- **Zero-budget deployment**: 15-30 minutes
- **Production deployment**: 1-2 hours

Follow our [Quick Start Guide](getting-started/quick-start.md).

### Do I need a database?

Yes, PostgreSQL 14+ is required. Free options:
- Supabase (500MB free)
- Railway (512MB free)
- Neon (3GB free)

### Do I need Redis?

Yes, Redis 6+ is required for OTP storage and rate limiting. Free options:
- Upstash (10MB free)
- Redis Cloud (30MB free)

### Can I run this without Docker?

Yes! See the [manual installation guide](getting-started/installation.md#manual-setup).

## TOTP (Google Authenticator)

### How does TOTP work?

TOTP generates time-based one-time passwords that change every 30 seconds. It works completely offline - no internet connection needed after setup.

### Which authenticator apps are supported?

Any TOTP-compatible app:
- Google Authenticator
- Authy
- Microsoft Authenticator
- 1Password
- Bitwarden

### What if I lose my authenticator device?

Use your backup codes! You receive 10 one-time use backup codes when setting up 2FA. Store them securely.

### Can I have multiple authenticator apps?

Yes! The same QR code can be scanned by multiple devices. Or use backup codes as a fallback.

## SMS 2FA

### How much does SMS cost?

SMS 2FA requires a Twilio account (~$0.0075 per SMS). Not included in free tier.

### Which countries are supported for SMS?

Twilio supports 200+ countries. Check [Twilio's SMS coverage](https://www.twilio.com/en-us/guidelines/sms).

### Can I use a different SMS provider?

Currently only Twilio is supported. Other providers (AWS SNS, etc.) are on the roadmap.

## Email 2FA

### Can I use Gmail for free?

Yes! Gmail allows 500 emails/day on the free tier. Perfect for small applications.

### How do I setup Gmail for Email 2FA?

1. Enable 2-Step Verification on your Google account
2. Generate an App Password
3. Add to environment variables

See [Email Setup Guide](guides/email-setup.md).

### What other email providers are supported?

Any SMTP server:
- Gmail (500 emails/day free)
- SendGrid (100 emails/day free)
- Mailgun (5,000 emails/month free)
- Custom SMTP server

## Integration

### How do I integrate this into my app?

Three main approaches:

1. **REST API** (recommended) - Call endpoints from your app
2. **SDK** (coming soon) - Use our JavaScript/Python SDK
3. **Embed** (future) - Embed UI components

See [Integration Guide](guides/integration.md).

### Can I customize the frontend?

Yes! The included frontend is just a demo. You can:
- Use it as-is for testing
- Customize it for your brand
- Build your own frontend
- Integrate directly into your existing UI

### Does it work with Next.js / React / Vue?

Yes! It's a REST API, so it works with any frontend framework or language.

### Can I use this with mobile apps?

Yes! The REST API works with:
- iOS (Swift)
- Android (Kotlin/Java)
- React Native
- Flutter
- Any language that can make HTTP requests

## API Keys & Webhooks

### What are API keys for?

API keys allow third-party services to integrate with your 2FA service. Features:
- Scoped permissions
- Rate limiting per key
- Key rotation
- Revocation

See [API Keys Guide](guides/api-keys.md).

### How do webhooks work?

Webhooks notify your app of events in real-time:
- User enabled 2FA
- 2FA verified successfully
- 2FA verification failed

See [Webhooks Guide](guides/webhooks.md).

### Are webhooks secure?

Yes! All webhook requests include an HMAC signature that you can verify.

## Security

### How are passwords stored?

Passwords are hashed using **Argon2id** (winner of the Password Hashing Competition), the most secure password hashing algorithm available.

### Are 2FA codes stored?

OTP codes are stored temporarily in Redis with expiration (default: 5 minutes). They are never stored in the database.

### How long do JWT tokens last?

- **Access token**: 15 minutes
- **Refresh token**: 7 days
- **Temp token** (for 2FA): 5 minutes
- **Device token** (trusted devices): 30 days

### Is rate limiting enabled?

Yes! All endpoints are rate-limited:
- Login/Register: 5 requests / 15 minutes
- 2FA verification: 10 requests / 15 minutes
- Other endpoints: 100 requests / 15 minutes

### What about SQL injection / XSS?

Protected:
- ✅ Parameterized queries (Prisma ORM)
- ✅ Input validation and sanitization
- ✅ CSRF protection
- ✅ Helmet security headers
- ✅ Content Security Policy

## Deployment

### Where can I deploy this?

**Free options:**
- Railway (500 hours/month)
- Render (750 hours/month)
- Fly.io (3 VMs free)

**Paid options:**
- AWS (EC2, ECS, Fargate)
- Google Cloud (Cloud Run, GKE)
- Azure (Container Instances, AKS)
- Your own server

See [Deployment Guide](deployment/docker.md).

### Do I need a domain name?

Not required, but recommended for production. You can use:
- Provider's subdomain (e.g., your-app.railway.app)
- Your own domain with custom SSL

### How do I setup HTTPS?

See [SSL Setup Guide](deployment/ssl.md). Free options:
- Let's Encrypt (free SSL certificates)
- Cloudflare (free SSL + CDN)

### Can I scale horizontally?

Yes! You can run multiple backend instances behind a load balancer. See [Scaling Guide](deployment/cloud-platforms.md#scaling).

## Troubleshooting

### Database connection errors

Check:
1. PostgreSQL is running
2. DATABASE_URL is correct
3. Database exists and is accessible
4. Connection pool limit not exceeded

### Redis connection errors

Check:
1. Redis is running
2. REDIS_HOST and REDIS_PORT are correct
3. Redis password (if required)
4. Firewall rules

### "Invalid TOTP code" errors

Common causes:
- Time sync issue (check device time)
- Wrong secret used
- Code expired (30-second window)
- Rate limit exceeded

### Port already in use

Change ports in `docker-compose.yml`:

```yaml
backend:
  ports:
    - "3002:3001"  # Changed from 3001
```

### Tests failing

Ensure:
1. PostgreSQL test database exists
2. Redis is running
3. Run `npx prisma migrate deploy` first
4. No other services using test ports

## Performance

### How many users can it handle?

Depends on your infrastructure:
- **Free tier**: 100-500 users
- **$10/month server**: 1,000-5,000 users
- **$50/month server**: 10,000+ users

With proper caching and optimization, it can scale to millions of users.

### What's the latency?

Typical response times:
- Login: 100-300ms (Argon2 hashing)
- TOTP verification: 10-50ms
- SMS/Email delivery: 1-5 seconds
- Other endpoints: < 50ms

### Can I improve performance?

Yes! See [Performance Guide](deployment/monitoring.md#performance-optimization):
- Increase worker pool size
- Add Redis caching
- Use connection pooling
- Enable HTTP/2
- Add CDN

## Contributing

### How can I contribute?

See [Contributing Guide](development/contributing.md). We welcome:
- Bug reports
- Feature requests
- Documentation improvements
- Code contributions
- Security reports

### I found a security vulnerability

Please **email security@example.com** instead of opening a public issue. We'll respond within 48 hours.

### Can I fork this project?

Yes! It's MIT licensed. You can:
- Use it commercially
- Modify it
- Distribute it
- Use it privately

Just include the original license.

## Still Have Questions?

- **GitHub Discussions**: [Ask the community](https://github.com/your-org/2fa/discussions)
- **GitHub Issues**: [Report bugs](https://github.com/your-org/2fa/issues)
- **Email**: support@example.com
