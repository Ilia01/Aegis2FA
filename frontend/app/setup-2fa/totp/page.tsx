'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { QRCodeSVG } from 'qrcode.react'
import { apiClient } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

const verifyCodeSchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits').regex(/^\d+$/, 'Code must contain only digits'),
})

type VerifyCodeFormData = z.infer<typeof verifyCodeSchema>

export default function SetupTOTPPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const [error, setError] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [showBackupCodes, setShowBackupCodes] = useState(false)

  const { data: totpData, isLoading } = useQuery({
    queryKey: ['totp-setup'],
    queryFn: () => apiClient.setupTOTP(),
    enabled: isAuthenticated,
  })

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<VerifyCodeFormData>({
    resolver: zodResolver(verifyCodeSchema),
  })

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, router])

  const onSubmit = async (data: VerifyCodeFormData) => {
    try {
      setError('')

      if (!totpData?.data?.secret) {
        setError('TOTP setup not initialized')
        return
      }

      const response = await apiClient.verifyTOTPSetup({
        secret: totpData.data.secret,
        code: data.code,
      })

      setBackupCodes(response.data!.backupCodes)
      setShowBackupCodes(true)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      setError(error.response?.data?.message || 'Verification failed. Please try again.')
    }
  }

  const downloadBackupCodes = () => {
    const text = backupCodes.join('\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'backup-codes.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading || !totpData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-foreground">Loading...</p>
      </div>
    )
  }

  if (showBackupCodes) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Backup Codes</CardTitle>
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
                Continue to Dashboard
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
          <CardTitle>Setup Authenticator App</CardTitle>
          <CardDescription>Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center p-4 bg-white rounded-lg">
            <QRCodeSVG value={totpData.data!.qrCode} size={200} />
          </div>

          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Or enter this code manually:</p>
            <code className="bg-secondary px-3 py-1 rounded text-sm">{totpData.data!.secret}</code>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="code">Verification Code</Label>
              <Input
                id="code"
                type="text"
                placeholder="123456"
                maxLength={6}
                {...register('code')}
              />
              {errors.code && (
                <p className="text-sm text-destructive">{errors.code.message}</p>
              )}
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code from your authenticator app to verify the setup
              </p>
            </div>

            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/dashboard')}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? 'Verifying...' : 'Verify & Enable'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
