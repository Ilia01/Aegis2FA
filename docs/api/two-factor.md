# Two-Factor Authentication API

Complete guide to 2FA setup, verification, and management.

## TOTP (Time-Based One-Time Password)

### Setup TOTP

Initiate TOTP setup and receive QR code.

#### Request

```http
POST /2fa/totp/setup
Authorization: Bearer <access_token>
```

#### Response

```json
{
  "success": true,
  "data": {
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANS...",
    "secret": "JBSWY3DPEHPK3PXP",
    "backupCodes": [
      "A1B2C3D4E5",
      "F6G7H8I9J0",
      "K1L2M3N4O5",
      "P6Q7R8S9T0",
      "U1V2W3X4Y5",
      "Z6A7B8C9D0",
      "E1F2G3H4I5",
      "J6K7L8M9N0",
      "O1P2Q3R4S5",
      "T6U7V8W9X0"
    ]
  }
}
```

!!! warning "Important"
    - Save backup codes securely (print or download)
    - Backup codes are shown only once
    - QR code should be scanned immediately
    - Secret can be entered manually if QR scan fails

#### Next Steps

1. Scan QR code with authenticator app (Google Authenticator, Authy, etc.)
2. **Or** manually enter secret into authenticator app
3. Save backup codes securely
4. Verify setup with a code from your authenticator app

---

### Verify TOTP Setup

Confirm TOTP setup by verifying a code from the authenticator app.

#### Request

```http
POST /2fa/totp/verify-setup
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "code": "123456"
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "enabled": true,
    "method": "totp"
  }
}
```

!!! success "TOTP Enabled"
    TOTP is now active. Future logins will require a code from your authenticator app.

#### Errors

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Invalid code | Code is incorrect or expired |
| 400 | Setup not initiated | Must call `/2fa/totp/setup` first |
| 401 | Unauthorized | Missing or invalid access token |
| 429 | Too many requests | Rate limit exceeded (10 requests / 15 min) |

---

### Disable TOTP

Remove TOTP 2FA from your account.

#### Request

```http
DELETE /2fa/totp
Authorization: Bearer <access_token>
```

#### Response

```json
{
  "success": true,
  "data": {
    "message": "TOTP disabled successfully"
  }
}
```

---

## SMS 2FA

!!! note "Requirements"
    SMS 2FA requires a configured Twilio account. Not available on free/zero-budget deployments.

### Setup SMS 2FA

Configure SMS-based 2FA.

#### Request

```http
POST /2fa/sms/setup
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "phoneNumber": "+1234567890"
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "phoneNumber": "+1234567890",
    "codeSent": true,
    "message": "Verification code sent to +123****7890"
  }
}
```

#### Next Steps

1. Check your phone for SMS with 6-digit code
2. Call `/2fa/sms/verify-setup` with the code

---

### Verify SMS Setup

Confirm SMS 2FA setup with the code received via SMS.

#### Request

```http
POST /2fa/sms/verify-setup
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "code": "123456"
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "enabled": true,
    "method": "sms",
    "phoneNumber": "+123****7890"
  }
}
```

---

## Email 2FA

### Setup Email 2FA

Configure email-based 2FA.

#### Request

```http
POST /2fa/email/setup
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "email": "use****@example.com",
    "codeSent": true,
    "message": "Verification code sent to use****@example.com"
  }
}
```

#### Next Steps

1. Check your email for 6-digit code
2. Call `/2fa/email/verify-setup` with the code

---

### Verify Email Setup

Confirm Email 2FA setup with the code received via email.

#### Request

```http
POST /2fa/email/verify-setup
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "code": "123456"
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "enabled": true,
    "method": "email",
    "email": "use****@example.com"
  }
}
```

---

## 2FA Verification

### Send OTP Code

Request a one-time password via SMS or Email.

!!! note "TOTP vs SMS/Email"
    - **TOTP**: Codes are generated offline by your authenticator app. No need to call this endpoint.
    - **SMS/Email**: Codes are sent on-demand. Call this endpoint to receive a code.

#### Request

```http
POST /2fa/send-code
Content-Type: application/json

{
  "tempToken": "eyJhbGciOiJIUzI1NiIs...",
  "method": "sms"
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "codeSent": true,
    "method": "sms",
    "expiresIn": 300
  }
}
```

#### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tempToken` | string | Yes | Temporary token from login response |
| `method` | string | Yes | "sms" or "email" |

#### Rate Limiting

- **SMS:** 5 requests per hour
- **Email:** 10 requests per hour

---

### Verify 2FA Code

Verify a 2FA code and complete authentication.

#### Request

```http
POST /2fa/verify
Content-Type: application/json

{
  "tempToken": "eyJhbGciOiJIUzI1NiIs...",
  "code": "123456",
  "trustDevice": false
}
```

#### Response (Success)

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "deviceToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

!!! note "Device Token"
    `deviceToken` is only included if `trustDevice: true`. Store this token to skip 2FA on future logins from this device for 30 days.

#### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tempToken` | string | Yes | Temporary token from login response |
| `code` | string | Yes | 6-digit code from authenticator/SMS/email |
| `trustDevice` | boolean | No | If true, skip 2FA on this device for 30 days |

#### Errors

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Invalid code | Code is incorrect or expired |
| 400 | Invalid temp token | Temp token expired or invalid |
| 429 | Too many requests | Rate limit exceeded (10 requests / 15 min) |

---

### Verify Backup Code

Use a backup code if primary 2FA method is unavailable.

#### Request

```http
POST /2fa/verify-backup-code
Content-Type: application/json

{
  "tempToken": "eyJhbGciOiJIUzI1NiIs...",
  "backupCode": "A1B2C3D4E5"
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "remainingCodes": 9
  }
}
```

!!! warning "One-Time Use"
    Each backup code can only be used once. Generate new codes when you run low.

---

### Resend OTP Code

Resend the OTP code via SMS or Email.

#### Request

```http
POST /2fa/resend
Content-Type: application/json

{
  "tempToken": "eyJhbGciOiJIUzI1NiIs...",
  "method": "sms"
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "codeSent": true,
    "method": "sms",
    "expiresIn": 300
  }
}
```

#### Rate Limiting

Same as `/2fa/send-code`:
- **SMS:** 5 requests per hour
- **Email:** 10 requests per hour

---

## Backup Codes

### Generate Backup Codes

Generate a new set of 10 backup codes.

!!! warning "Previous Codes Invalidated"
    Generating new backup codes will invalidate all previous unused codes.

#### Request

```http
POST /2fa/backup-codes/generate
Authorization: Bearer <access_token>
```

#### Response

```json
{
  "success": true,
  "data": {
    "backupCodes": [
      "A1B2C3D4E5",
      "F6G7H8I9J0",
      "K1L2M3N4O5",
      "P6Q7R8S9T0",
      "U1V2W3X4Y5",
      "Z6A7B8C9D0",
      "E1F2G3H4I5",
      "J6K7L8M9N0",
      "O1P2Q3R4S5",
      "T6U7V8W9X0"
    ]
  }
}
```

!!! important "Save Immediately"
    Backup codes are shown only once. Print or download them securely.

---

### Count Remaining Backup Codes

Check how many unused backup codes you have.

#### Request

```http
GET /2fa/backup-codes/count
Authorization: Bearer <access_token>
```

#### Response

```json
{
  "success": true,
  "data": {
    "remaining": 7,
    "total": 10
  }
}
```

---

## 2FA Methods Management

### List All 2FA Methods

Get all enabled 2FA methods for the current user.

#### Request

```http
GET /2fa/methods
Authorization: Bearer <access_token>
```

#### Response

```json
{
  "success": true,
  "data": {
    "methods": [
      {
        "id": "uuid-1",
        "type": "totp",
        "enabled": true,
        "verifiedAt": "2024-10-19T12:00:00.000Z",
        "createdAt": "2024-10-19T12:00:00.000Z"
      },
      {
        "id": "uuid-2",
        "type": "sms",
        "enabled": true,
        "phoneNumber": "+123****7890",
        "verifiedAt": "2024-10-20T12:00:00.000Z",
        "createdAt": "2024-10-20T12:00:00.000Z"
      }
    ]
  }
}
```

---

### Remove 2FA Method

Disable and remove a specific 2FA method.

!!! warning "Last Method"
    You cannot remove your last 2FA method if 2FA is enabled. Disable 2FA entirely first, or add another method.

#### Request

```http
DELETE /2fa/methods/{methodId}
Authorization: Bearer <access_token>
```

#### Response

```json
{
  "success": true,
  "data": {
    "message": "2FA method removed successfully"
  }
}
```

---

## Trusted Devices

### List Trusted Devices

Get all devices trusted for 2FA bypass.

#### Request

```http
GET /2fa/devices
Authorization: Bearer <access_token>
```

#### Response

```json
{
  "success": true,
  "data": {
    "devices": [
      {
        "id": "uuid-1",
        "deviceName": "Chrome on MacBook Pro",
        "ipAddress": "192.168.1.100",
        "userAgent": "Mozilla/5.0...",
        "createdAt": "2024-10-19T12:00:00.000Z",
        "lastUsedAt": "2024-10-25T08:30:00.000Z",
        "expiresAt": "2024-11-18T12:00:00.000Z"
      }
    ]
  }
}
```

---

### Remove Trusted Device

Revoke trust for a specific device.

#### Request

```http
DELETE /2fa/devices/{deviceId}
Authorization: Bearer <access_token>
```

#### Response

```json
{
  "success": true,
  "data": {
    "message": "Trusted device removed successfully"
  }
}
```

---

### Remove All Trusted Devices

Revoke trust for all devices (force 2FA on next login from all devices).

#### Request

```http
DELETE /2fa/devices
Authorization: Bearer <access_token>
```

#### Response

```json
{
  "success": true,
  "data": {
    "message": "All trusted devices removed",
    "removedCount": 3
  }
}
```

---

## Complete Setup Examples

### Example 1: Setup TOTP

```typescript
// 1. Initiate setup
const setupResponse = await fetch('/2fa/totp/setup', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
})
const { qrCode, secret, backupCodes } = await setupResponse.json()

// 2. Display QR code to user
displayQRCode(qrCode)

// 3. Save backup codes
saveBackupCodes(backupCodes)

// 4. User scans QR code and enters code from app
const userCode = await promptUserForCode()

// 5. Verify setup
const verifyResponse = await fetch('/2fa/totp/verify-setup', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ code: userCode })
})

if (verifyResponse.ok) {
  console.log('TOTP enabled successfully!')
}
```

### Example 2: Login with TOTP

```typescript
// 1. Initial login
const loginResponse = await fetch('/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
})
const loginData = await loginResponse.json()

if (loginData.data.requires2FA) {
  // 2. Prompt user for TOTP code
  const code = await promptUserForCode()

  // 3. Verify 2FA
  const verifyResponse = await fetch('/2fa/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tempToken: loginData.data.tempToken,
      code: code,
      trustDevice: true // Optional: skip 2FA for 30 days
    })
  })

  const { accessToken, refreshToken, deviceToken } = await verifyResponse.json()

  // Store tokens
  storeTokens(accessToken, refreshToken, deviceToken)
}
```

### Example 3: Login with SMS 2FA

```typescript
// 1. Initial login
const loginResponse = await fetch('/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
})
const loginData = await loginResponse.json()

if (loginData.data.requires2FA) {
  // 2. Request SMS code
  await fetch('/2fa/send-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tempToken: loginData.data.tempToken,
      method: 'sms'
    })
  })

  // 3. Prompt user for code from SMS
  const code = await promptUserForCode()

  // 4. Verify 2FA
  const verifyResponse = await fetch('/2fa/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tempToken: loginData.data.tempToken,
      code: code
    })
  })

  const { accessToken, refreshToken } = await verifyResponse.json()
  storeTokens(accessToken, refreshToken)
}
```

## Rate Limits Summary

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/2fa/*/setup` | 10 requests | 15 minutes |
| `/2fa/*/verify-setup` | 10 requests | 15 minutes |
| `/2fa/send-code` (SMS) | 5 requests | 1 hour |
| `/2fa/send-code` (Email) | 10 requests | 1 hour |
| `/2fa/verify` | 10 requests | 15 minutes |
| `/2fa/verify-backup-code` | 5 requests | 15 minutes |
| Other 2FA endpoints | 100 requests | 15 minutes |

## Next Steps

- [Authentication API](authentication.md) - Login and registration
- [Integration Guide](../guides/integration.md) - Integrate into your app
- [Security Best Practices](../architecture/security.md) - Security guidelines
