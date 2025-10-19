# Authentication API

Complete guide to authentication endpoints.

## Register

Create a new user account.

### Request

```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "SecureP@ssw0rd123!"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "username": "johndoe",
      "emailVerified": false,
      "twoFactorEnabled": false,
      "createdAt": "2024-10-19T12:00:00.000Z",
      "updatedAt": "2024-10-19T12:00:00.000Z"
    }
  }
}
```

### Errors

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Validation error | Invalid email, username, or password format |
| 409 | Email already registered | Account exists with this email |
| 409 | Username already taken | Account exists with this username |
| 429 | Too many requests | Rate limit exceeded (5 requests / 15 min) |

### Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### Rate Limiting

- **Limit:** 5 requests per 15 minutes
- **Identifier:** IP address

---

## Login

Authenticate a user and obtain tokens.

### Without 2FA

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecureP@ssw0rd123!"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### With 2FA Enabled

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecureP@ssw0rd123!",
  "deviceToken": "optional_device_token_if_trusted"
}
```

**Response (2FA Required):**

```json
{
  "success": true,
  "data": {
    "tempToken": "eyJhbGciOiJIUzI1NiIs...",
    "requires2FA": true,
    "availableMethods": ["totp", "sms", "email"]
  }
}
```

**Response (Trusted Device):**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### Next Steps After 2FA Required

1. **For TOTP:** User enters code from authenticator app → Call [POST /2fa/verify](two-factor.md#verify-2fa-code)
2. **For SMS/Email:** Request code → Call [POST /2fa/send-code](two-factor.md#send-otp-code) → Call [POST /2fa/verify](two-factor.md#verify-2fa-code)

### Errors

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Validation error | Invalid email or password format |
| 401 | Invalid credentials | Email or password incorrect |
| 429 | Too many requests | Rate limit exceeded (5 requests / 15 min) |

### Rate Limiting

- **Limit:** 5 requests per 15 minutes
- **Identifier:** IP address

---

## Refresh Token

Obtain a new access token using a refresh token.

### Request

```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Response

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

!!! note "Token Rotation"
    The refresh token is rotated on each refresh. The old refresh token is invalidated and a new one is issued.

### Errors

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Invalid refresh token | Token invalid, expired, or revoked |
| 429 | Too many requests | Rate limit exceeded (10 requests / 15 min) |

### Rate Limiting

- **Limit:** 10 requests per 15 minutes
- **Identifier:** User ID

---

## Get Current User

Retrieve the authenticated user's profile.

### Request

```http
GET /auth/me
Authorization: Bearer <access_token>
```

### Response

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "username": "johndoe",
    "emailVerified": true,
    "twoFactorEnabled": true,
    "createdAt": "2024-10-19T12:00:00.000Z",
    "updatedAt": "2024-10-19T12:00:00.000Z"
  }
}
```

### Errors

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid access token |

---

## Logout

End the current session and revoke the refresh token.

### Request

```http
POST /auth/logout
Authorization: Bearer <access_token>
```

### Response

```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

!!! note "Access Token"
    The access token cannot be revoked (it's stateless). It will remain valid until expiration (15 minutes). The refresh token is immediately invalidated.

### Errors

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid access token |

---

## Revoke All Sessions

Logout from all devices by revoking all refresh tokens.

### Request

```http
POST /auth/revoke-sessions
Authorization: Bearer <access_token>
```

### Response

```json
{
  "success": true,
  "data": {
    "message": "All sessions revoked",
    "revokedCount": 5
  }
}
```

### Use Cases

- User suspects account compromise
- Lost device
- Security precaution

### Errors

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid access token |

---

## Token Lifetimes

| Token Type | Lifetime | Renewal | Storage |
|------------|----------|---------|---------|
| **Access Token** | 15 minutes | Via refresh token | Client memory (don't persist) |
| **Refresh Token** | 7 days | Rotated on each refresh | Secure storage (HttpOnly cookie recommended) |
| **Temp Token** | 5 minutes | Cannot be renewed | Client memory |

## Security Best Practices

### Client-Side

1. **Store access token in memory only** (React state, Vuex, etc.)
2. **Store refresh token securely:**
   - Web: HttpOnly cookie (server-side set)
   - Mobile: Secure keychain/keystore
   - Never in localStorage or sessionStorage
3. **Clear tokens on logout**
4. **Implement token refresh before expiration**

### Server-Side

1. **Use HTTPS only** in production
2. **Set HttpOnly, Secure, SameSite cookies** for refresh tokens
3. **Implement CSRF protection** for cookie-based auth
4. **Log all authentication events** for audit trail

## Example: Complete Login Flow

### React Example

```typescript
import axios from 'axios'

interface LoginResponse {
  accessToken?: string
  refreshToken?: string
  tempToken?: string
  requires2FA?: boolean
  availableMethods?: string[]
}

async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await axios.post('/auth/login', { email, password })

  if (data.data.requires2FA) {
    // Store temp token
    sessionStorage.setItem('tempToken', data.data.tempToken)
    // Redirect to 2FA page
    return data.data
  }

  // Store tokens
  localStorage.setItem('accessToken', data.data.accessToken) // ⚠️ Not recommended
  // Better: Store in memory only
  return data.data
}

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const { data } = await axios.post('/auth/refresh', { refreshToken })
  return data.data.accessToken
}

// Axios interceptor for auto-refresh
axios.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401 && error.config && !error.config._retry) {
      error.config._retry = true
      const refreshToken = getRefreshToken() // Your storage method
      const newAccessToken = await refreshAccessToken(refreshToken)
      error.config.headers.Authorization = `Bearer ${newAccessToken}`
      return axios(error.config)
    }
    return Promise.reject(error)
  }
)
```

### Node.js Example

```javascript
const axios = require('axios')

async function login(email, password) {
  try {
    const response = await axios.post('https://your-api.com/auth/login', {
      email,
      password
    })

    if (response.data.data.requires2FA) {
      console.log('2FA required:', response.data.data.availableMethods)
      return response.data.data
    }

    console.log('Login successful')
    return response.data.data
  } catch (error) {
    if (error.response?.status === 401) {
      console.error('Invalid credentials')
    } else if (error.response?.status === 429) {
      console.error('Too many login attempts. Please try again later.')
    }
    throw error
  }
}
```

### Python Example

```python
import requests

def login(email: str, password: str) -> dict:
    response = requests.post('https://your-api.com/auth/login', json={
        'email': email,
        'password': password
    })

    response.raise_for_status()
    data = response.json()['data']

    if data.get('requires2FA'):
        print(f"2FA required: {data['availableMethods']}")
        return data

    print("Login successful")
    return data
```

## Related Endpoints

- [Two-Factor Authentication](two-factor.md) - Setup and verify 2FA
- [Password Reset](../guides/password-reset.md) - Reset forgotten password
- [Email Verification](../guides/email-verification.md) - Verify email address

## Rate Limits Summary

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/auth/register` | 5 requests | 15 minutes |
| `/auth/login` | 5 requests | 15 minutes |
| `/auth/refresh` | 10 requests | 15 minutes |
| `/auth/me` | 100 requests | 15 minutes |
| `/auth/logout` | 100 requests | 15 minutes |
| `/auth/revoke-sessions` | 10 requests | 15 minutes |

## Next Steps

- [Setup 2FA](two-factor.md) - Enable two-factor authentication
- [Integration Guide](../guides/integration.md) - Integrate into your app
- [Error Codes](../reference/error-codes.md) - Complete error reference
