'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Key } from 'lucide-react'

export default function BackupCodesPage() {
  const router = useRouter()
  const { isAuthenticated, user } = useAuth()
  const [error, setError] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [showNewCodes, setShowNewCodes] = useState(false)

  const { data: backupCodesCount = 0, refetch } = useQuery({
    queryKey: ['backup-codes-count'],
    queryFn: () => apiClient.getBackupCodesCount(),
    enabled: isAuthenticated && user?.twoFactorEnabled,
  })

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
    } else if (!user?.twoFactorEnabled) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, user, router])

  const handleGenerateCodes = async () => {
    try {
      setError('')
      const response = await apiClient.generateBackupCodes()
      setBackupCodes(response.data!.backupCodes)
      setShowNewCodes(true)
      await refetch()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      setError(error.response?.data?.message || 'Failed to generate backup codes. Please try again.')
    }
  }

  const downloadBackupCodes = () => {
    const text = backupCodes.join('\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `backup-codes-${new Date().toISOString().split('T')[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (showNewCodes) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center space-x-2 mb-2">
              <Key className="h-6 w-6 text-primary" />
              <CardTitle>New Backup Codes</CardTitle>
            </div>
            <CardDescription>Save these codes in a secure location. You can use them to access your account if you lose your device.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                Each backup code can only be used once. Store them somewhere safe!
              </AlertDescription>
            </Alert>

            <div className="bg-secondary p-4 rounded-lg font-mono text-sm grid grid-cols-2 gap-2">
              {backupCodes.map((code, index) => (
                <div key={index}>{code}</div>
              ))}
            </div>

            <div className="flex space-x-2">
              <Button onClick={downloadBackupCodes} variant="outline" className="flex-1">
                Download Codes
              </Button>
              <Button onClick={() => router.push('/dashboard')} className="flex-1">
                Done
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center space-x-2 mb-2">
            <Key className="h-6 w-6 text-primary" />
            <CardTitle>Backup Codes</CardTitle>
          </div>
          <CardDescription>Manage your backup recovery codes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div>
                <h3 className="font-medium">Remaining Backup Codes</h3>
                <p className="text-sm text-muted-foreground">You have {backupCodesCount} codes left</p>
              </div>
              <span className="text-2xl font-bold">{backupCodesCount}</span>
            </div>
          </div>

          <Alert>
            <AlertDescription>
              Generating new backup codes will invalidate all existing codes. Make sure to save the new codes in a secure location.
            </AlertDescription>
          </Alert>

          <div className="flex space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard')}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button onClick={handleGenerateCodes} className="flex-1">
              Generate New Codes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
