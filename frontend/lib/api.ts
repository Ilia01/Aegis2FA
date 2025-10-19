import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import Cookies from 'js-cookie'
import type {
  LoginResponse,
  RegisterResponse,
  User,
  TOTPSetupResponse,
  TOTPVerifySetupResponse,
  BackupCodesResponse,
  BackupCodesCountResponse,
  TrustedDevicesResponse,
  Verify2FAResponse,
  TwoFactorMethod,
  APIResponse,
  LoginFormData,
  RegisterFormData,
  Verify2FARequest,
  VerifyBackupCodeFormData,
  TOTPVerifyFormData,
} from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

class APIClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    })

    this.client.interceptors.request.use((config) => {
      const token = Cookies.get('accessToken')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    })

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean })

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true

          try {
            const { data } = await axios.post(
              `${API_URL}/auth/refresh`,
              {},
              { withCredentials: true }
            )

            if (data.data?.accessToken) {
              Cookies.set('accessToken', data.data.accessToken, { expires: 1 / 96 })
              originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`
              return this.client(originalRequest)
            }
          } catch (refreshError) {
            Cookies.remove('accessToken')
            if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
              window.location.href = '/login'
            }
            return Promise.reject(refreshError)
          }
        }

        return Promise.reject(error)
      }
    )
  }

  async register(data: RegisterFormData): Promise<RegisterResponse> {
    const { confirmPassword, ...registerData } = data
    // confirmPassword is excluded from the request payload
    void confirmPassword
    const response = await this.client.post<RegisterResponse>('/auth/register', registerData)

    if (response.data.tokens?.accessToken) {
      Cookies.set('accessToken', response.data.tokens.accessToken, { expires: 1 / 96 })
    }

    return response.data
  }

  async login(data: LoginFormData): Promise<LoginResponse> {
    const response = await this.client.post<LoginResponse>('/auth/login', data)

    if (response.data.tokens?.accessToken) {
      Cookies.set('accessToken', response.data.tokens.accessToken, { expires: 1 / 96 })
    }

    return response.data
  }

  async logout(): Promise<void> {
    await this.client.post('/auth/logout')
    Cookies.remove('accessToken')
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.client.get<APIResponse<{ user: User }>>('/auth/me')
    return response.data.data!.user
  }

  async revokeAllSessions(): Promise<void> {
    await this.client.post('/auth/revoke-sessions')
  }

  async setupTOTP(): Promise<TOTPSetupResponse> {
    const response = await this.client.post<TOTPSetupResponse>('/2fa/totp/setup')
    return response.data
  }

  async verifyTOTPSetup(data: TOTPVerifyFormData & { secret: string }): Promise<TOTPVerifySetupResponse> {
    const response = await this.client.post<TOTPVerifySetupResponse>('/2fa/totp/verify-setup', data)
    return response.data
  }

  async disableTOTP(): Promise<void> {
    await this.client.delete('/2fa/totp')
  }

  async setupSMS(phoneNumber: string): Promise<void> {
    await this.client.post('/2fa/sms/setup', { phoneNumber })
  }

  async verifySMSSetup(code: string): Promise<void> {
    await this.client.post('/2fa/sms/verify-setup', { code })
  }

  async setupEmail(email: string): Promise<void> {
    await this.client.post('/2fa/email/setup', { email })
  }

  async verifyEmailSetup(code: string): Promise<void> {
    await this.client.post('/2fa/email/verify-setup', { code })
  }

  async verify2FA(data: Verify2FARequest): Promise<Verify2FAResponse> {
    const response = await this.client.post<Verify2FAResponse>('/2fa/verify', data)

    if (response.data.data?.accessToken) {
      Cookies.set('accessToken', response.data.data.accessToken, { expires: 1 / 96 })
    }

    return response.data
  }

  async verifyBackupCode(data: VerifyBackupCodeFormData & { tempToken: string }): Promise<Verify2FAResponse> {
    const response = await this.client.post<Verify2FAResponse>('/2fa/verify-backup-code', data)

    if (response.data.data?.accessToken) {
      Cookies.set('accessToken', response.data.data.accessToken, { expires: 1 / 96 })
    }

    return response.data
  }

  async resend2FACode(method: 'sms' | 'email'): Promise<void> {
    await this.client.post('/2fa/resend', { method })
  }

  async generateBackupCodes(): Promise<BackupCodesResponse> {
    const response = await this.client.post<BackupCodesResponse>('/2fa/backup-codes/generate')
    return response.data
  }

  async getBackupCodesCount(): Promise<number> {
    const response = await this.client.get<BackupCodesCountResponse>('/2fa/backup-codes/count')
    return response.data.data!.count
  }

  async get2FAMethods(): Promise<TwoFactorMethod[]> {
    const response = await this.client.get<APIResponse<{ methods: TwoFactorMethod[] }>>('/2fa/methods')
    return response.data.data!.methods
  }

  async delete2FAMethod(methodId: string): Promise<void> {
    await this.client.delete(`/2fa/methods/${methodId}`)
  }

  async getTrustedDevices(): Promise<TrustedDevicesResponse['data']['devices']> {
    const response = await this.client.get<TrustedDevicesResponse>('/2fa/devices')
    return response.data.data!.devices
  }

  async removeTrustedDevice(deviceId: string): Promise<void> {
    await this.client.delete(`/2fa/devices/${deviceId}`)
  }

  async removeAllTrustedDevices(): Promise<void> {
    await this.client.delete('/2fa/devices')
  }
}

export const apiClient = new APIClient()
