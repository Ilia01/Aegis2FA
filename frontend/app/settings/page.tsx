'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield, User, LogOut, Trash2, Key, Laptop } from 'lucide-react'

export default function SettingsPage() {
  const router = useRouter()
  const { user, isAuthenticated, logout } = useAuth()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const { data: methods = [] } = useQuery({
    queryKey: ['2fa-methods'],
    queryFn: () => apiClient.get2FAMethods(),
    enabled: isAuthenticated,
  })

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, router])

  const handleRevokeAllSessions = async () => {
    if (!confirm('This will log you out from all devices. You will need to log in again. Continue?')) {
      return
    }

    try {
      setError('')
      setSuccess('')
      await apiClient.revokeAllSessions()
      setSuccess('All sessions revoked successfully. You will be logged out shortly.')
      setTimeout(() => {
        logout()
      }, 2000)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      setError(error.response?.data?.message || 'Failed to revoke sessions. Please try again.')
    }
  }

  const handleDisable2FAMethod = async (methodId: string, methodType: string) => {
    if (!confirm(`Are you sure you want to disable ${methodType.toUpperCase()} 2FA?`)) {
      return
    }

    try {
      setError('')
      setSuccess('')
      await apiClient.delete2FAMethod(methodId)
      setSuccess(`${methodType.toUpperCase()} 2FA disabled successfully`)
      window.location.reload()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      setError(error.response?.data?.message || 'Failed to disable 2FA method. Please try again.')
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-foreground">Loading...</p>
      </div>
    )
  }

  const hasTOTP = methods.some((m) => m.type === 'totp')
  const hasSMS = methods.some((m) => m.type === 'sms')
  const hasEmail = methods.some((m) => m.type === 'email')

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-2">
              <Shield className="h-6 w-6 text-primary" />
              <span className="font-semibold text-lg">2FA System</span>
            </div>
            <Button onClick={() => router.push('/dashboard')} variant="ghost">
              Back to Dashboard
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Account Settings</h1>
          <p className="text-muted-foreground mt-2">Manage your account and security settings</p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert variant="success" className="mb-6">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-primary" />
                <CardTitle>Profile Information</CardTitle>
              </div>
              <CardDescription>Your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Username</p>
                  <p className="font-medium">{user.username}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{user.email}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Member Since</p>
                <p className="font-medium">
                  {new Date(user.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-primary" />
                <CardTitle>Two-Factor Authentication</CardTitle>
              </div>
              <CardDescription>Manage your 2FA methods</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div>
                  <h3 className="font-medium">2FA Status</h3>
                  <p className="text-sm text-muted-foreground">
                    {user.twoFactorEnabled ? 'Two-factor authentication is enabled' : 'Two-factor authentication is disabled'}
                  </p>
                </div>
                <span className={`font-medium ${user.twoFactorEnabled ? 'text-green-400' : 'text-destructive'}`}>
                  {user.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>

              {user.twoFactorEnabled && (
                <>
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Active Methods</h4>
                    {hasTOTP && (
                      <div className="flex items-center justify-between p-3 border border-border rounded">
                        <span className="text-sm">Authenticator App (TOTP)</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => {
                            const totpMethod = methods.find((m) => m.type === 'totp')
                            if (totpMethod) handleDisable2FAMethod(totpMethod.id, 'totp')
                          }}
                        >
                          Disable
                        </Button>
                      </div>
                    )}
                    {hasSMS && (
                      <div className="flex items-center justify-between p-3 border border-border rounded">
                        <span className="text-sm">SMS Verification</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => {
                            const smsMethod = methods.find((m) => m.type === 'sms')
                            if (smsMethod) handleDisable2FAMethod(smsMethod.id, 'sms')
                          }}
                        >
                          Disable
                        </Button>
                      </div>
                    )}
                    {hasEmail && (
                      <div className="flex items-center justify-between p-3 border border-border rounded">
                        <span className="text-sm">Email Verification</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => {
                            const emailMethod = methods.find((m) => m.type === 'email')
                            if (emailMethod) handleDisable2FAMethod(emailMethod.id, 'email')
                          }}
                        >
                          Disable
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Key className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <h3 className="font-medium">Backup Codes</h3>
                        <p className="text-sm text-muted-foreground">Manage your recovery codes</p>
                      </div>
                    </div>
                    <Link href="/setup-2fa/backup-codes">
                      <Button size="sm" variant="outline">
                        Manage
                      </Button>
                    </Link>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Laptop className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <h3 className="font-medium">Trusted Devices</h3>
                        <p className="text-sm text-muted-foreground">Manage trusted devices</p>
                      </div>
                    </div>
                    <Link href="/devices">
                      <Button size="sm" variant="outline">
                        Manage
                      </Button>
                    </Link>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <LogOut className="h-5 w-5 text-primary" />
                <CardTitle>Session Management</CardTitle>
              </div>
              <CardDescription>Manage your active sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div>
                  <h3 className="font-medium">Active Sessions</h3>
                  <p className="text-sm text-muted-foreground">
                    Revoke all sessions and log out from all devices
                  </p>
                </div>
                <Button onClick={handleRevokeAllSessions} variant="destructive" size="sm">
                  Revoke All Sessions
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Trash2 className="h-5 w-5 text-destructive" />
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
              </div>
              <CardDescription>Irreversible and destructive actions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border border-destructive rounded-lg">
                <div>
                  <h3 className="font-medium text-destructive">Delete Account</h3>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete your account and all associated data
                  </p>
                </div>
                <Button variant="destructive" size="sm" disabled>
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
