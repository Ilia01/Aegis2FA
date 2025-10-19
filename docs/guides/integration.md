# Integration Guide

Complete guide to integrating the 2FA Authentication Service into your application.

## Integration Approaches

### 1. REST API (Recommended)

Call API endpoints directly from your application. Works with any language or framework.

**Pros:**
- Maximum flexibility
- Works with any tech stack
- Full control over UI/UX

**Cons:**
- More implementation work
- Need to handle token management

### 2. SDK (Coming Soon)

Use our official JavaScript/TypeScript SDK for easier integration.

**Pros:**
- Pre-built auth flows
- Automatic token refresh
- Type-safe
- Less code to write

**Cons:**
- Currently in development

## Quick Start Integration

### Step 1: Create Account

```bash
curl -X POST https://your-api.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "johndoe",
    "password": "SecureP@ssw0rd123!"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci...",
    "user": { "id": "uuid", "email": "user@example.com", ... }
  }
}
```

### Step 2: Enable 2FA

```bash
curl -X POST https://your-api.com/2fa/totp/setup \
  -H "Authorization: Bearer <access_token>"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "qrCode": "data:image/png;base64,...",
    "secret": "JBSWY3DPEHPK3PXP",
    "backupCodes": ["A1B2C3D4E5", ...]
  }
}
```

### Step 3: Login with 2FA

```bash
# 1. Initial login
curl -X POST https://your-api.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "SecureP@ssw0rd123!"}'

# Response: {"tempToken": "...", "requires2FA": true}

# 2. Verify 2FA
curl -X POST https://your-api.com/2fa/verify \
  -H "Content-Type: application/json" \
  -d '{"tempToken": "...", "code": "123456"}'

# Response: {"accessToken": "...", "refreshToken": "..."}
```

## Framework-Specific Integrations

### React / Next.js

#### Installation

```bash
npm install axios
```

#### Create API Client

```typescript
// lib/api.ts
import axios from 'axios'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Add access token to all requests
api.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auto-refresh on 401
api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true
      const refreshToken = localStorage.getItem('refreshToken')

      try {
        const { data } = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
          refreshToken
        })

        localStorage.setItem('accessToken', data.data.accessToken)
        localStorage.setItem('refreshToken', data.data.refreshToken)

        error.config.headers.Authorization = `Bearer ${data.data.accessToken}`
        return api(error.config)
      } catch {
        // Refresh failed, logout user
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
```

#### Authentication Context

```typescript
// contexts/AuthContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import api from '@/lib/api'

interface User {
  id: string
  email: string
  username: string
  twoFactorEnabled: boolean
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<any>
  logout: () => Promise<void>
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is logged in on mount
    const loadUser = async () => {
      const token = localStorage.getItem('accessToken')
      if (token) {
        try {
          const { data } = await api.get('/auth/me')
          setUser(data.data)
        } catch (error) {
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
        }
      }
      setIsLoading(false)
    }
    loadUser()
  }, [])

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password })

    if (data.data.requires2FA) {
      // Return temp token for 2FA verification
      return { requires2FA: true, tempToken: data.data.tempToken }
    }

    // No 2FA, login successful
    localStorage.setItem('accessToken', data.data.accessToken)
    localStorage.setItem('refreshToken', data.data.refreshToken)

    const userResponse = await api.get('/auth/me')
    setUser(userResponse.data.data)

    return { requires2FA: false }
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } catch (error) {
      console.error('Logout error:', error)
    }

    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
```

#### Login Page

```typescript
// app/login/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const result = await login(email, password)

      if (result.requires2FA) {
        // Redirect to 2FA verification
        router.push(`/verify-2fa?tempToken=${result.tempToken}`)
      } else {
        // Login successful
        router.push('/dashboard')
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed')
    }
  }

  return (
    <div className="max-w-md mx-auto mt-8">
      <h1 className="text-2xl font-bold mb-4">Login</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            required
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Login
        </button>
      </form>
    </div>
  )
}
```

#### 2FA Verification Page

```typescript
// app/verify-2fa/page.tsx
'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import api from '@/lib/api'

export default function Verify2FAPage() {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const tempToken = searchParams.get('tempToken')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const { data } = await api.post('/2fa/verify', {
        tempToken,
        code,
        trustDevice: true
      })

      localStorage.setItem('accessToken', data.data.accessToken)
      localStorage.setItem('refreshToken', data.data.refreshToken)
      if (data.data.deviceToken) {
        localStorage.setItem('deviceToken', data.data.deviceToken)
      }

      router.push('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Verification failed')
    }
  }

  return (
    <div className="max-w-md mx-auto mt-8">
      <h1 className="text-2xl font-bold mb-4">Two-Factor Authentication</h1>
      <p className="mb-4 text-gray-600">Enter the 6-digit code from your authenticator app.</p>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Verification Code</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="w-full px-3 py-2 border rounded text-center text-2xl tracking-widest"
            placeholder="123456"
            maxLength={6}
            required
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Verify
        </button>
      </form>
    </div>
  )
}
```

### Vue.js

#### API Client

```javascript
// src/api/client.js
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' }
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api
```

#### Composable

```javascript
// src/composables/useAuth.js
import { ref, computed } from 'vue'
import api from '@/api/client'

const user = ref(null)
const isLoading = ref(false)

export function useAuth() {
  const isAuthenticated = computed(() => !!user.value)

  const login = async (email, password) => {
    isLoading.value = true
    try {
      const { data } = await api.post('/auth/login', { email, password })

      if (data.data.requires2FA) {
        return { requires2FA: true, tempToken: data.data.tempToken }
      }

      localStorage.setItem('accessToken', data.data.accessToken)
      localStorage.setItem('refreshToken', data.data.refreshToken)

      const userResponse = await api.get('/auth/me')
      user.value = userResponse.data.data

      return { requires2FA: false }
    } finally {
      isLoading.value = false
    }
  }

  const logout = async () => {
    await api.post('/auth/logout')
    localStorage.clear()
    user.value = null
  }

  return {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout
  }
}
```

### Node.js / Express

#### Middleware

```javascript
// middleware/auth.js
const axios = require('axios')

async function authenticateUser(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const { data } = await axios.get(`${process.env.API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })

    req.user = data.data
    next()
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' })
  }
}

module.exports = { authenticateUser }
```

#### Usage

```javascript
// routes/protected.js
const express = require('express')
const { authenticateUser } = require('../middleware/auth')

const router = express.Router()

router.get('/profile', authenticateUser, (req, res) => {
  res.json({ user: req.user })
})

module.exports = router
```

### Python / Flask

#### Client

```python
# auth_client.py
import requests
from typing import Optional, Dict

class AuthClient:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.access_token: Optional[str] = None
        self.refresh_token: Optional[str] = None

    def register(self, email: str, username: str, password: str) -> Dict:
        response = requests.post(f'{self.base_url}/auth/register', json={
            'email': email,
            'username': username,
            'password': password
        })
        response.raise_for_status()
        data = response.json()['data']

        self.access_token = data['accessToken']
        self.refresh_token = data['refreshToken']

        return data

    def login(self, email: str, password: str) -> Dict:
        response = requests.post(f'{self.base_url}/auth/login', json={
            'email': email,
            'password': password
        })
        response.raise_for_status()
        data = response.json()['data']

        if 'accessToken' in data:
            self.access_token = data['accessToken']
            self.refresh_token = data['refreshToken']

        return data

    def verify_2fa(self, temp_token: str, code: str) -> Dict:
        response = requests.post(f'{self.base_url}/2fa/verify', json={
            'tempToken': temp_token,
            'code': code
        })
        response.raise_for_status()
        data = response.json()['data']

        self.access_token = data['accessToken']
        self.refresh_token = data['refreshToken']

        return data

    def get_headers(self) -> Dict:
        return {
            'Authorization': f'Bearer {self.access_token}'
        }

# Usage
client = AuthClient('https://your-api.com')

# Register
user = client.register('user@example.com', 'johndoe', 'SecureP@ssw0rd123!')

# Login
result = client.login('user@example.com', 'SecureP@ssw0rd123!')

if result.get('requires2FA'):
    code = input('Enter 2FA code: ')
    client.verify_2fa(result['tempToken'], code)

# Make authenticated requests
response = requests.get('https://your-api.com/auth/me', headers=client.get_headers())
```

### Mobile (React Native)

#### Secure Storage

```bash
npm install @react-native-async-storage/async-storage
```

#### Auth Service

```typescript
// services/auth.ts
import AsyncStorage from '@react-native-async-storage/async-storage'
import axios from 'axios'

const API_URL = 'https://your-api.com'

export class AuthService {
  static async login(email: string, password: string) {
    const { data } = await axios.post(`${API_URL}/auth/login`, { email, password })

    if (data.data.requires2FA) {
      return { requires2FA: true, tempToken: data.data.tempToken }
    }

    await AsyncStorage.setItem('accessToken', data.data.accessToken)
    await AsyncStorage.setItem('refreshToken', data.data.refreshToken)

    return { requires2FA: false }
  }

  static async verify2FA(tempToken: string, code: string, trustDevice: boolean = false) {
    const { data } = await axios.post(`${API_URL}/2fa/verify`, {
      tempToken,
      code,
      trustDevice
    })

    await AsyncStorage.setItem('accessToken', data.data.accessToken)
    await AsyncStorage.setItem('refreshToken', data.data.refreshToken)

    if (data.data.deviceToken) {
      await AsyncStorage.setItem('deviceToken', data.data.deviceToken)
    }

    return data.data
  }

  static async logout() {
    const token = await AsyncStorage.getItem('accessToken')

    if (token) {
      await axios.post(`${API_URL}/auth/logout`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
    }

    await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'deviceToken'])
  }

  static async getAccessToken() {
    return await AsyncStorage.getItem('accessToken')
  }
}
```

## Common Integration Patterns

### Pattern 1: Protected Routes

```typescript
// middleware/requireAuth.ts
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('accessToken')?.value

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Verify token with API
  try {
    const response = await fetch(`${process.env.API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (!response.ok) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    return NextResponse.next()
  } catch {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: ['/dashboard/:path*', '/settings/:path*']
}
```

### Pattern 2: Token Refresh

```typescript
// utils/tokenRefresh.ts
let refreshPromise: Promise<string> | null = null

export async function refreshAccessToken(): Promise<string> {
  // Prevent multiple simultaneous refresh requests
  if (refreshPromise) {
    return refreshPromise
  }

  refreshPromise = (async () => {
    const refreshToken = localStorage.getItem('refreshToken')

    const { data } = await axios.post('/auth/refresh', { refreshToken })

    localStorage.setItem('accessToken', data.data.accessToken)
    localStorage.setItem('refreshToken', data.data.refreshToken)

    return data.data.accessToken
  })()

  try {
    return await refreshPromise
  } finally {
    refreshPromise = null
  }
}
```

### Pattern 3: Remember Me

```typescript
// Use different storage based on "remember me" option
function storeTokens(accessToken: string, refreshToken: string, rememberMe: boolean) {
  const storage = rememberMe ? localStorage : sessionStorage

  storage.setItem('accessToken', accessToken)
  storage.setItem('refreshToken', refreshToken)
}
```

## Testing Your Integration

### Manual Testing Checklist

- [ ] Registration creates account successfully
- [ ] Login without 2FA works
- [ ] Login with 2FA prompts for code
- [ ] Invalid 2FA code shows error
- [ ] Valid 2FA code logs in
- [ ] Access token expires after 15 minutes
- [ ] Refresh token renews access token
- [ ] Logout invalidates session
- [ ] Protected routes require authentication
- [ ] Token refresh happens automatically

### Automated Testing

```typescript
// Example Jest test
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import LoginPage from '@/app/login/page'
import api from '@/lib/api'

jest.mock('@/lib/api')

test('login with 2FA flow', async () => {
  (api.post as jest.Mock)
    .mockResolvedValueOnce({
      data: {
        data: {
          requires2FA: true,
          tempToken: 'temp_token_123'
        }
      }
    })

  render(<LoginPage />)

  fireEvent.change(screen.getByLabelText(/email/i), {
    target: { value: 'user@example.com' }
  })
  fireEvent.change(screen.getByLabelText(/password/i), {
    target: { value: 'SecureP@ssw0rd123!' }
  })

  fireEvent.click(screen.getByText(/login/i))

  await waitFor(() => {
    expect(api.post).toHaveBeenCalledWith('/auth/login', {
      email: 'user@example.com',
      password: 'SecureP@ssw0rd123!'
    })
  })
})
```

## Next Steps

- [Authentication API](../api/authentication.md) - API reference
- [Two-Factor API](../api/two-factor.md) - 2FA API reference
- [Error Handling](../reference/error-codes.md) - Error codes and handling
- [Security Best Practices](../architecture/security.md) - Security guidelines
