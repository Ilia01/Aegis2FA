'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, Smartphone, Mail, Key, Laptop } from 'lucide-react'

export default function DashboardPage() {
  const router = useRouter()
  const { user, isLoading, isAuthenticated, logout } = useAuth()

  const { data: methods = [] } = useQuery({
    queryKey: ['2fa-methods'],
    queryFn: () => apiClient.get2FAMethods(),
    enabled: isAuthenticated,
  })

  const { data: backupCodesCount = 0 } = useQuery({
    queryKey: ['backup-codes-count'],
    queryFn: () => apiClient.getBackupCodesCount(),
    enabled: isAuthenticated && user?.twoFactorEnabled,
  })

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading || !user) {
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
            <Button onClick={() => logout()} variant="ghost">
              Logout
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-2">Welcome back, {user.username}!</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Email</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{user.email}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">2FA Status</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {user.twoFactorEnabled ? (
                  <span className="text-green-400">Enabled</span>
                ) : (
                  <span className="text-destructive">Disabled</span>
                )}
              </p>
            </CardContent>
          </Card>

          {user.twoFactorEnabled && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Backup Codes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{backupCodesCount} remaining</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Two-Factor Authentication</CardTitle>
              <CardDescription>Secure your account with additional verification methods</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div className="flex items-center space-x-4">
                  <Smartphone className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <h3 className="font-medium">Authenticator App (TOTP)</h3>
                    <p className="text-sm text-muted-foreground">Use Google Authenticator, Authy, or similar apps</p>
                  </div>
                </div>
                {hasTOTP ? (
                  <span className="text-green-400 font-medium">Enabled</span>
                ) : (
                  <Link href="/setup-2fa/totp">
                    <Button size="sm">Setup</Button>
                  </Link>
                )}
              </div>

              <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div className="flex items-center space-x-4">
                  <Mail className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <h3 className="font-medium">Email Verification</h3>
                    <p className="text-sm text-muted-foreground">Receive codes via email</p>
                  </div>
                </div>
                {hasEmail ? (
                  <span className="text-green-400 font-medium">Enabled</span>
                ) : (
                  <Link href="/setup-2fa/email">
                    <Button size="sm">Setup</Button>
                  </Link>
                )}
              </div>

              <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div className="flex items-center space-x-4">
                  <Smartphone className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <h3 className="font-medium">SMS Verification</h3>
                    <p className="text-sm text-muted-foreground">Receive codes via text message</p>
                  </div>
                </div>
                {hasSMS ? (
                  <span className="text-green-400 font-medium">Enabled</span>
                ) : (
                  <Link href="/setup-2fa/sms">
                    <Button size="sm">Setup</Button>
                  </Link>
                )}
              </div>

              {user.twoFactorEnabled && (
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <Key className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <h3 className="font-medium">Backup Codes</h3>
                      <p className="text-sm text-muted-foreground">{backupCodesCount} codes remaining</p>
                    </div>
                  </div>
                  <Link href="/setup-2fa/backup-codes">
                    <Button size="sm" variant="outline">
                      Manage
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Trusted Devices</CardTitle>
              <CardDescription>Manage devices that don&apos;t require 2FA</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/devices">
                <Button variant="outline" className="w-full">
                  <Laptop className="h-4 w-4 mr-2" />
                  View Trusted Devices
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
