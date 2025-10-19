# Error Codes Reference

Complete reference of all error codes and how to handle them.

## Error Response Format

All errors follow a consistent format:

```json
{
  "success": false,
  "error": "Human-readable error message"
}
```

## HTTP Status Codes

| Status | Name | When It Occurs |
|--------|------|----------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Validation error or malformed request |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Authenticated but insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource already exists |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error |
| 503 | Service Unavailable | Service is down |

## Authentication Errors

### 400: Validation Error

**When:** Invalid input format

```json
{
  "success": false,
  "error": "Validation error: email must be a valid email address"
}
```

**Common causes:**
- Invalid email format
- Password doesn't meet requirements
- Missing required fields
- Invalid field types

**How to fix:**
- Validate input on client side
- Check [password requirements](../api/authentication.md#password-requirements)
- Ensure all required fields are provided

---

### 401: Invalid Credentials

**When:** Email or password incorrect during login

```json
{
  "success": false,
  "error": "Invalid email or password"
}
```

**How to fix:**
- Verify email is correct
- Verify password is correct
- Check if account exists
- Consider [password reset](../guides/password-reset.md) if user forgot password

---

### 401: Invalid or Expired Token

**When:** Access token is invalid, malformed, or expired

```json
{
  "success": false,
  "error": "Invalid or expired token"
}
```

**How to fix:**
- Refresh access token using refresh token
- If refresh fails, redirect to login
- Ensure `Authorization: Bearer <token>` header is set correctly

**Example fix:**

```typescript
try {
  await api.get('/auth/me')
} catch (error) {
  if (error.response?.status === 401) {
    // Try to refresh token
    try {
      const newToken = await refreshAccessToken()
      // Retry original request
    } catch {
      // Refresh failed, redirect to login
      router.push('/login')
    }
  }
}
```

---

### 401: Invalid Refresh Token

**When:** Refresh token is invalid, expired, or revoked

```json
{
  "success": false,
  "error": "Invalid refresh token"
}
```

**How to fix:**
- Redirect user to login page
- Clear stored tokens
- User must re-authenticate

---

### 409: Email Already Registered

**When:** Registration with existing email

```json
{
  "success": false,
  "error": "Email already registered"
}
```

**How to fix:**
- Prompt user to login instead
- Offer "Forgot password?" link
- Check if user meant to login

---

### 409: Username Already Taken

**When:** Registration with existing username

```json
{
  "success": false,
  "error": "Username already taken"
}
```

**How to fix:**
- Prompt user to choose different username
- Suggest available usernames
- Validate username availability before submission

---

## 2FA Errors

### 400: Invalid 2FA Code

**When:** TOTP/SMS/Email code is incorrect

```json
{
  "success": false,
  "error": "Invalid verification code"
}
```

**Common causes:**
- Code expired (5-minute window)
- User typed wrong code
- Time sync issue (TOTP)
- Code already used

**How to fix:**
- Ask user to try again
- For TOTP: Check device time is synced
- For SMS/Email: Offer to resend code
- Suggest using backup code

**Example:**

```typescript
try {
  await api.post('/2fa/verify', { tempToken, code })
} catch (error) {
  if (error.response?.status === 400) {
    setError('Invalid code. Please try again.')
    // Offer to resend
    showResendButton()
  }
}
```

---

### 400: Backup Code Already Used

**When:** Attempting to reuse a backup code

```json
{
  "success": false,
  "error": "This backup code has already been used"
}
```

**How to fix:**
- Each backup code is single-use
- Try a different backup code
- If no codes remain, contact support

---

### 400: Setup Not Initiated

**When:** Verifying 2FA setup without calling setup first

```json
{
  "success": false,
  "error": "2FA setup not initiated"
}
```

**How to fix:**
- Call `/2fa/totp/setup` first
- Then call `/2fa/totp/verify-setup`

---

### 400: No 2FA Method Available

**When:** User has no 2FA methods enabled

```json
{
  "success": false,
  "error": "No 2FA method available"
}
```

**How to fix:**
- Enable at least one 2FA method
- Setup TOTP, SMS, or Email 2FA

---

## Rate Limiting Errors

### 429: Too Many Requests

**When:** Rate limit exceeded

```json
{
  "success": false,
  "error": "Too many requests. Please try again later."
}
```

**Response headers:**
```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1697654700
```

**Common triggers:**
- Multiple failed login attempts
- Spamming 2FA code verification
- Automated bot traffic

**How to fix:**
- Wait for reset time (check `X-RateLimit-Reset` header)
- Implement exponential backoff
- Show countdown timer to user
- Cache requests on client side

**Example:**

```typescript
try {
  await api.post('/auth/login', { email, password })
} catch (error) {
  if (error.response?.status === 429) {
    const resetTime = error.response.headers['x-ratelimit-reset']
    const waitSeconds = resetTime - Math.floor(Date.now() / 1000)

    setError(`Too many attempts. Please wait ${waitSeconds} seconds.`)
  }
}
```

---

## Permission Errors

### 403: Insufficient Permissions

**When:** API key lacks required scope

```json
{
  "success": false,
  "error": "Insufficient permissions. Required scope: 2fa:write"
}
```

**How to fix:**
- Check API key scopes
- Create new API key with required permissions
- Use correct API key for the operation

---

## Resource Errors

### 404: Not Found

**When:** Requested resource doesn't exist

```json
{
  "success": false,
  "error": "Resource not found"
}
```

**Common causes:**
- Invalid user ID
- Invalid 2FA method ID
- Invalid device ID
- Invalid API key ID

**How to fix:**
- Verify resource ID is correct
- Check if resource was deleted
- List available resources first

---

## Server Errors

### 500: Internal Server Error

**When:** Unexpected server error

```json
{
  "success": false,
  "error": "Internal server error"
}
```

**What to do:**
- Retry request (may be temporary)
- Check service status
- Contact support if persists
- Check logs if self-hosted

---

### 503: Service Unavailable

**When:** Service is down or unhealthy

```json
{
  "success": false,
  "error": "Service unavailable"
}
```

**Common causes:**
- Database connection lost
- Redis connection lost
- Service restarting
- Maintenance mode

**What to do:**
- Retry with exponential backoff
- Check health endpoint: `GET /api/health`
- Check service status page
- Wait for service to recover

---

## Webhook Errors

### 400: Invalid Webhook Signature

**When:** HMAC signature verification failed

```json
{
  "success": false,
  "error": "Invalid webhook signature"
}
```

**How to fix:**
- Verify signature using webhook secret
- Check HMAC calculation
- Ensure using correct secret

**Signature verification:**

```typescript
import crypto from 'crypto'

function verifyWebhook(payload: string, signature: string, secret: string): boolean {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(signature.replace('sha256=', '')),
    Buffer.from(expected)
  )
}
```

---

## Error Handling Best Practices

### Client-Side

```typescript
async function handleApiCall() {
  try {
    const response = await api.post('/endpoint', data)
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status
      const message = error.response?.data?.error

      switch (status) {
        case 400:
          // Validation error - show to user
          showError(message)
          break

        case 401:
          // Unauthorized - try refresh or logout
          await handleUnauthorized()
          break

        case 429:
          // Rate limited - show retry timer
          showRateLimitError(error.response.headers)
          break

        case 500:
        case 503:
          // Server error - retry with backoff
          return retryWithBackoff(handleApiCall)

        default:
          showError('An error occurred. Please try again.')
      }
    }

    throw error
  }
}
```

### Retry Logic

```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === maxRetries - 1) throw error

      const delay = baseDelay * Math.pow(2, i)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw new Error('Max retries exceeded')
}
```

### User-Friendly Messages

```typescript
const errorMessages: Record<string, string> = {
  'Invalid email or password': 'The email or password you entered is incorrect. Please try again.',
  'Email already registered': 'An account with this email already exists. Try logging in instead.',
  'Too many requests': 'Too many attempts. Please wait a moment and try again.',
  'Invalid verification code': 'The code you entered is incorrect or expired. Please try again.',
  'Service unavailable': 'Our service is temporarily unavailable. Please try again in a few moments.'
}

function getUserFriendlyError(error: string): string {
  return errorMessages[error] || 'An unexpected error occurred. Please try again.'
}
```

## Rate Limit Reference

| Endpoint | Limit | Window | Identifier |
|----------|-------|--------|------------|
| `/auth/register` | 5 | 15 min | IP |
| `/auth/login` | 5 | 15 min | IP |
| `/auth/refresh` | 10 | 15 min | User ID |
| `/2fa/verify` | 10 | 15 min | IP |
| `/2fa/send-code` (SMS) | 5 | 1 hour | User ID |
| `/2fa/send-code` (Email) | 10 | 1 hour | User ID |
| `/2fa/*/setup` | 10 | 15 min | User ID |
| Default | 100 | 15 min | IP |

## Debugging Tips

### Check Request Format

```bash
# Verify your request is correctly formatted
curl -v -X POST https://your-api.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecureP@ssw0rd123!"}'
```

### Check Token

```bash
# Decode JWT token (don't use in production!)
node -e "console.log(JSON.parse(Buffer.from('YOUR_TOKEN'.split('.')[1], 'base64').toString()))"
```

### Check Health

```bash
# Verify service is healthy
curl https://your-api.com/api/health

# Response should be:
# {"status":"healthy","checks":{"database":"up","redis":"up"}}
```

## Support

If you encounter an error not documented here:

1. Check server logs (if self-hosted)
2. Search [GitHub Issues](https://github.com/your-org/2fa/issues)
3. Create new issue with:
   - Error message
   - Steps to reproduce
   - Expected vs actual behavior
   - Request/response details (remove sensitive data!)

## Next Steps

- [API Reference](../api/index.md) - Complete API documentation
- [Integration Guide](../guides/integration.md) - Integration examples
- [Troubleshooting](../deployment/monitoring.md#troubleshooting) - Common issues
