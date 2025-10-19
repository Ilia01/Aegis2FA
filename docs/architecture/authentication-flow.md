# Authentication Flow

This document details the authentication and authorization flows in the 2FA Authentication Service.

## User Registration

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant AuthSvc as Auth Service
    participant Worker as Argon2 Worker
    participant DB as PostgreSQL
    participant Audit as Audit Service

    Client->>API: POST /auth/register<br/>{email, username, password}
    API->>API: Validate input (Zod)
    API->>API: Check rate limit

    API->>AuthSvc: Register user
    AuthSvc->>DB: Check email exists
    DB-->>AuthSvc: Email available

    AuthSvc->>Worker: Hash password (Argon2id)
    Note over Worker: CPU-intensive operation<br/>in worker pool
    Worker-->>AuthSvc: Hashed password

    AuthSvc->>DB: Create user record
    DB-->>AuthSvc: User created

    AuthSvc->>AuthSvc: Generate JWT tokens
    AuthSvc->>DB: Store refresh token
    AuthSvc->>Audit: Log registration event

    AuthSvc-->>API: Return tokens
    API-->>Client: 201 Created<br/>{accessToken, refreshToken, user}
```

### Registration Request

```json
POST /auth/register
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "SecureP@ssw0rd123!"
}
```

### Registration Response

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "username": "johndoe",
      "twoFactorEnabled": false,
      "createdAt": "2024-10-19T00:00:00.000Z"
    }
  }
}
```

## Login Without 2FA

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant AuthSvc as Auth Service
    participant Worker as Argon2 Worker
    participant DB as PostgreSQL
    participant Redis
    participant Audit as Audit Service

    Client->>API: POST /auth/login<br/>{email, password}
    API->>API: Validate input
    API->>API: Check rate limit

    API->>AuthSvc: Authenticate user
    AuthSvc->>DB: Query user by email
    DB-->>AuthSvc: User data

    AuthSvc->>Worker: Verify password (Argon2)
    Worker-->>AuthSvc: Password valid

    AuthSvc->>DB: Check 2FA enabled
    DB-->>AuthSvc: 2FA disabled

    AuthSvc->>AuthSvc: Generate JWT tokens
    AuthSvc->>DB: Store refresh token
    AuthSvc->>Redis: Store session
    AuthSvc->>Audit: Log login success

    AuthSvc-->>API: Return tokens
    API-->>Client: 200 OK<br/>{accessToken, refreshToken}
```

## Login With 2FA (TOTP)

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#667eea','primaryTextColor':'#fff','primaryBorderColor':'#764ba2','lineColor':'#764ba2','secondaryColor':'#84fab0','tertiaryColor':'#fa709a'}}}%%
sequenceDiagram
    participant Client
    participant API
    participant AuthSvc as Auth Service
    participant TFASvc as 2FA Service
    participant Worker as Argon2 Worker
    participant DB as PostgreSQL
    participant Redis
    participant Audit as Audit Service

    rect rgb(230, 235, 250)
    Note over Client,Audit: 🔐 Step 1: Initial Authentication
    Client->>+API: POST /auth/login<br/>{email, password}
    API->>+AuthSvc: Authenticate
    AuthSvc->>+DB: Query user
    DB-->>-AuthSvc: User data
    AuthSvc->>+Worker: Verify password (Argon2)
    Worker-->>-AuthSvc: ✓ Valid

    AuthSvc->>+DB: Check 2FA enabled
    DB-->>-AuthSvc: ✓ TOTP enabled

    AuthSvc->>+Redis: Store temp token (5 min TTL)
    Redis-->>-AuthSvc: Token stored
    AuthSvc-->>-API: Return temp token
    API-->>-Client: 200 OK<br/>{tempToken, requires2FA: true, method: "totp"}
    end

    rect rgb(230, 250, 235)
    Note over Client,Audit: 📱 Step 2: Client Prompts for TOTP Code
    Client->>Client: Show TOTP input
    Note over Client: User opens Google Authenticator<br/>and enters 6-digit code
    end

    rect rgb(250, 235, 230)
    Note over Client,Audit: ✅ Step 3: 2FA Verification
    Client->>+API: POST /2fa/verify<br/>{tempToken, code: "123456"}
    API->>+TFASvc: Verify TOTP code
    TFASvc->>+DB: Get user's TOTP secret
    DB-->>-TFASvc: Secret key
    TFASvc->>TFASvc: Generate expected codes<br/>(with time drift tolerance)

    alt Code valid
        TFASvc->>+AuthSvc: Generate JWT tokens
        AuthSvc->>+DB: Store refresh token
        DB-->>-AuthSvc: Token stored
        AuthSvc->>+Redis: Store session
        Redis-->>-AuthSvc: Session stored
        AuthSvc->>Audit: Log 2FA success ✓
        AuthSvc-->>-TFASvc: Tokens generated
        TFASvc-->>-API: Return tokens
        API-->>-Client: 200 OK<br/>{accessToken, refreshToken}
    else Code invalid
        TFASvc->>Audit: Log 2FA failure ✗
        TFASvc-->>API: Invalid code
        API-->>Client: 401 Unauthorized
    end
    end
```

## Login With 2FA (SMS/Email)

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant AuthSvc as Auth Service
    participant TFASvc as 2FA Service
    participant Redis
    participant Twilio
    participant SMTP
    participant Audit

    rect rgb(200, 220, 240)
    Note over Client,Audit: Step 1: Initial Authentication
    Client->>API: POST /auth/login<br/>{email, password}
    API->>AuthSvc: Authenticate
    AuthSvc->>AuthSvc: Verify password
    AuthSvc->>Redis: Store temp token
    AuthSvc-->>Client: {tempToken, requires2FA: true,<br/>availableMethods: ["sms", "email"]}
    end

    rect rgb(200, 240, 220)
    Note over Client,Audit: Step 2: Client Selects 2FA Method
    Client->>API: POST /2fa/send-code<br/>{tempToken, method: "sms"}
    API->>TFASvc: Send SMS code
    TFASvc->>TFASvc: Generate 6-digit OTP
    TFASvc->>Redis: Store OTP (5 min TTL)
    TFASvc->>Twilio: Send SMS
    Twilio-->>TFASvc: SMS sent
    TFASvc-->>Client: 200 OK {codeSent: true}
    end

    rect rgb(240, 220, 200)
    Note over Client,Audit: Step 3: User Receives & Enters Code
    Twilio->>Client: SMS: "Your code is: 123456"
    Client->>Client: User enters code
    Client->>API: POST /2fa/verify<br/>{tempToken, code: "123456"}
    API->>TFASvc: Verify code
    TFASvc->>Redis: Get stored OTP
    Redis-->>TFASvc: OTP: "123456"
    TFASvc->>TFASvc: Compare codes

    alt Code valid
        TFASvc->>Redis: Delete OTP
        TFASvc->>AuthSvc: Generate tokens
        TFASvc->>Audit: Log success
        TFASvc-->>Client: {accessToken, refreshToken}
    else Code invalid
        TFASvc->>Audit: Log failure
        TFASvc-->>Client: 401 Unauthorized
    end
    end
```

## Token Refresh

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant AuthSvc as Auth Service
    participant DB as PostgreSQL
    participant Redis

    Client->>API: POST /auth/refresh<br/>{refreshToken}
    API->>AuthSvc: Refresh tokens
    AuthSvc->>AuthSvc: Verify refresh token signature
    AuthSvc->>DB: Check refresh token exists
    DB-->>AuthSvc: Token valid

    alt Token valid and not expired
        AuthSvc->>AuthSvc: Generate new access token
        AuthSvc->>DB: Rotate refresh token
        AuthSvc->>Redis: Update session
        AuthSvc-->>API: Return new tokens
        API-->>Client: 200 OK<br/>{accessToken, refreshToken}
    else Token invalid or expired
        AuthSvc->>DB: Delete refresh token
        AuthSvc->>Redis: Delete session
        AuthSvc-->>API: Unauthorized
        API-->>Client: 401 Unauthorized
    end
```

## Logout

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant AuthSvc as Auth Service
    participant DB as PostgreSQL
    participant Redis

    Client->>API: POST /auth/logout<br/>Authorization: Bearer <accessToken>
    API->>API: Verify access token
    API->>AuthSvc: Logout user
    AuthSvc->>DB: Delete refresh token
    AuthSvc->>Redis: Delete session
    AuthSvc-->>API: Success
    API-->>Client: 200 OK
```

## 2FA Setup (TOTP)

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant TFASvc as 2FA Service
    participant DB as PostgreSQL
    participant QR as QR Code Generator

    Client->>API: POST /2fa/totp/setup<br/>Authorization: Bearer <token>
    API->>TFASvc: Setup TOTP
    TFASvc->>TFASvc: Generate secret key
    TFASvc->>QR: Generate QR code
    QR-->>TFASvc: QR code data URL
    TFASvc->>TFASvc: Generate backup codes (10)
    TFASvc->>DB: Store secret (encrypted)<br/>Store backup codes (hashed)
    TFASvc-->>API: Return setup data
    API-->>Client: 200 OK<br/>{qrCode, secret, backupCodes}

    Note over Client: User scans QR code<br/>with authenticator app

    Client->>API: POST /2fa/totp/verify-setup<br/>{code: "123456"}
    API->>TFASvc: Verify setup code
    TFASvc->>DB: Get temp secret
    TFASvc->>TFASvc: Verify code

    alt Code valid
        TFASvc->>DB: Enable TOTP for user<br/>Mark secret as verified
        TFASvc-->>Client: 200 OK {enabled: true}
    else Code invalid
        TFASvc-->>Client: 400 Invalid code
    end
```

## Trusted Device Flow

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant TFASvc as 2FA Service
    participant DB as PostgreSQL
    participant Redis

    Note over Client: User logs in with 2FA

    Client->>API: POST /2fa/verify<br/>{tempToken, code, trustDevice: true}
    API->>TFASvc: Verify 2FA
    TFASvc->>TFASvc: Verify code

    alt Code valid and trustDevice=true
        TFASvc->>TFASvc: Generate device token (30 days)
        TFASvc->>DB: Store trusted device
        TFASvc->>Redis: Cache device token
        TFASvc-->>Client: {accessToken, refreshToken,<br/>deviceToken}
        Note over Client: Client stores deviceToken<br/>in localStorage/keychain
    end

    Note over Client: Next login from same device

    Client->>API: POST /auth/login<br/>{email, password,<br/>deviceToken}
    API->>TFASvc: Check device token
    TFASvc->>Redis: Get cached device
    alt Device token valid
        TFASvc-->>API: Skip 2FA
        API->>API: Generate tokens directly
        API-->>Client: {accessToken, refreshToken}
    else Device token invalid/expired
        API-->>Client: {requires2FA: true}
    end
```

## API Key Authentication

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant AuthMW as Auth Middleware
    participant DB as PostgreSQL
    participant Redis

    Client->>API: GET /api/endpoint<br/>X-API-Key: <api_key>
    API->>AuthMW: Authenticate API key
    AuthMW->>Redis: Check cached key

    alt Cache hit
        Redis-->>AuthMW: Key data
    else Cache miss
        AuthMW->>DB: Query API key
        DB-->>AuthMW: Key data
        AuthMW->>Redis: Cache key data (1 hour)
    end

    AuthMW->>AuthMW: Verify key active
    AuthMW->>AuthMW: Check scopes
    AuthMW->>AuthMW: Check rate limit

    alt Valid key and authorized
        AuthMW->>API: Proceed
        API-->>Client: 200 OK {data}
    else Invalid or unauthorized
        AuthMW-->>Client: 401/403 Error
    end
```

## Token Types and Lifetimes

| Token Type | Purpose | Lifetime | Storage |
|------------|---------|----------|---------|
| **Access Token** | API authorization | 15 minutes | Client memory |
| **Refresh Token** | Obtain new access token | 7 days | Database + Client storage |
| **Temp Token** | Hold 2FA session | 5 minutes | Redis only |
| **Device Token** | Trust device for 2FA | 30 days | Database + Client storage |
| **API Key** | Third-party integration | Until revoked | Database |

## Security Features

### Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### Rate Limiting

| Endpoint | Limit |
|----------|-------|
| `/auth/register` | 5 requests / 15 minutes |
| `/auth/login` | 5 requests / 15 minutes |
| `/2fa/verify` | 10 requests / 15 minutes |
| `/auth/refresh` | 10 requests / 15 minutes |
| Other endpoints | 100 requests / 15 minutes |

### Password Hashing

- **Algorithm**: Argon2id
- **Memory**: 64MB
- **Iterations**: 3
- **Parallelism**: 4
- **Worker Pool**: Piscina (prevents event loop blocking)

### JWT Security

- **Algorithm**: HS256 (HMAC with SHA-256)
- **Secrets**: Minimum 64 characters, cryptographically random
- **Rotation**: Refresh tokens rotated on each refresh
- **Revocation**: Refresh tokens stored in database for revocation

## Error Responses

### Invalid Credentials

```json
{
  "success": false,
  "error": "Invalid email or password"
}
```

### 2FA Required

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

### Invalid 2FA Code

```json
{
  "success": false,
  "error": "Invalid verification code"
}
```

### Rate Limit Exceeded

```json
{
  "success": false,
  "error": "Too many requests. Please try again later."
}
```

## Next Steps

- [Database Schema](database-schema.md) - Data model and relationships
- [Security Architecture](security.md) - Security controls
- [API Reference](../api/authentication.md) - Detailed endpoint documentation
