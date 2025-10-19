'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Laptop, Trash2, Shield } from 'lucide-react'

export default function DevicesPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const { data: devices = [], refetch } = useQuery({
    queryKey: ['trusted-devices'],
    queryFn: () => apiClient.getTrustedDevices(),
    enabled: isAuthenticated,
  })

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, router])

  const handleRemoveDevice = async (deviceId: string) => {
    try {
      setError('')
      setSuccess('')
      await apiClient.removeTrustedDevice(deviceId)
      setSuccess('Device removed successfully')
      await refetch()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      setError(error.response?.data?.message || 'Failed to remove device. Please try again.')
    }
  }

  const handleRemoveAllDevices = async () => {
    if (!confirm('Are you sure you want to remove all trusted devices? You will need to verify with 2FA on your next login from any device.')) {
      return
    }

    try {
      setError('')
      setSuccess('')
      await apiClient.removeAllTrustedDevices()
      setSuccess('All devices removed successfully')
      await refetch()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      setError(error.response?.data?.message || 'Failed to remove devices. Please try again.')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

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
          <h1 className="text-3xl font-bold">Trusted Devices</h1>
          <p className="text-muted-foreground mt-2">
            Manage devices that don&apos;t require 2FA verification for 30 days
          </p>
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

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Your Trusted Devices</CardTitle>
                <CardDescription>
                  {devices.length === 0 ? 'No trusted devices' : `${devices.length} trusted ${devices.length === 1 ? 'device' : 'devices'}`}
                </CardDescription>
              </div>
              {devices.length > 0 && (
                <Button onClick={handleRemoveAllDevices} variant="destructive" size="sm">
                  Remove All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {devices.length === 0 ? (
              <div className="text-center py-12">
                <Laptop className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No trusted devices found</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Devices will appear here when you check &ldquo;Trust this device&rdquo; during 2FA verification
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {devices.map((device) => (
                  <div
                    key={device.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <Laptop className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <h3 className="font-medium">{device.deviceName || 'Unnamed Device'}</h3>
                        <p className="text-sm text-muted-foreground">
                          Added on {formatDate(device.createdAt)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Expires on {formatDate(device.expiresAt)}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleRemoveDevice(device.id)}
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
