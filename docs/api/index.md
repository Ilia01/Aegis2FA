# Interactive API Documentation

!!! success "Try it out!"
    This page provides interactive API documentation. You can test all endpoints directly in your browser!

## Quick Start

1. **Obtain an access token**: Call `/auth/register` or `/auth/login`
2. **Authorize**: Click the "Authorize" button below and paste your token
3. **Try endpoints**: Click "Try it out" on any endpoint to test it

## Authentication

Most endpoints require a JWT Bearer token. Include it in the `Authorization` header:

```
Authorization: Bearer <your_access_token>
```

## Swagger UI

<swagger-ui src="openapi.yaml"/>

## Need Help?

- [Authentication Guide](authentication.md) - Detailed auth flow documentation
- [Two-Factor Auth Guide](two-factor.md) - 2FA setup and verification
- [Integration Examples](../guides/integration.md) - Code examples for common scenarios
- [Error Codes](../reference/error-codes.md) - Complete error reference

## Rate Limiting

All API endpoints are rate-limited to prevent abuse:

| Endpoint | Limit |
|----------|-------|
| Default | 100 requests / 15 minutes |
| Login/Register | 5 requests / 15 minutes |
| 2FA Verification | 10 requests / 15 minutes |

Exceeding the rate limit returns HTTP 429 (Too Many Requests).

## Response Format

All responses follow this format:

### Success Response

```json
{
  "success": true,
  "data": {
    // Response data here
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message here"
}
```

## Common HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Validation error or invalid input |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | Valid token but insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists (e.g., duplicate email) |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error (check logs) |
| 503 | Service Unavailable | Service is down or unhealthy |
