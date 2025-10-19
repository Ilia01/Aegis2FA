'use client'

import { useState, Suspense } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter, useSearchParams } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

const verify2FASchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits').regex(/^\d+$/, 'Code must contain only digits'),
  deviceName: z.string().optional(),
})

type Verify2FAFormData = z.infer<typeof verify2FASchema>

function Verify2FAContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tempToken = searchParams.get('token') || ''
  const [error, setError] = useState('')
  const [useBackupCode, setUseBackupCode] = useState(false)
  const [trustDevice, setTrustDevice] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Verify2FAFormData>({
    resolver: zodResolver(verify2FASchema),
  })

  const onSubmit = async (data: Verify2FAFormData) => {
    try {
      setError('')

      if (useBackupCode) {
        await apiClient.verifyBackupCode({
          tempToken,
          code: data.code,
        })
      } else {
        await apiClient.verify2FA({
          tempToken,
          code: data.code,
          trustDevice,
          deviceName: data.deviceName,
        })
      }

      router.push('/dashboard')
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      setError(error.response?.data?.message || 'Verification failed. Please try again.')
    }
  }

  if (!tempToken) {
    router.push('/login')
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Two-Factor Authentication</CardTitle>
          <CardDescription>
            {useBackupCode ? 'Enter your backup code' : 'Enter the 6-digit code from your authenticator app'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="code">{useBackupCode ? 'Backup Code' : '2FA Code'}</Label>
              <Input
                id="code"
                type="text"
                placeholder={useBackupCode ? 'XXXX-XXXX' : '123456'}
                maxLength={useBackupCode ? 9 : 6}
                {...register('code')}
              />
              {errors.code && (
                <p className="text-sm text-destructive">{errors.code.message}</p>
              )}
            </div>

            {!useBackupCode && (
              <>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="trustDevice"
                    checked={trustDevice}
                    onChange={(e) => setTrustDevice(e.target.checked)}
                    className="rounded border-input bg-background"
                  />
                  <Label htmlFor="trustDevice" className="font-normal cursor-pointer">
                    Trust this device for 30 days
                  </Label>
                </div>

                {trustDevice && (
                  <div className="space-y-2">
                    <Label htmlFor="deviceName">Device Name (Optional)</Label>
                    <Input
                      id="deviceName"
                      type="text"
                      placeholder="My Laptop"
                      {...register('deviceName')}
                    />
                  </div>
                )}
              </>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Verifying...' : 'Verify'}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setUseBackupCode(!useBackupCode)}
                className="text-sm text-muted-foreground hover:underline"
              >
                {useBackupCode ? 'Use 2FA code instead' : 'Use backup code instead'}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function Verify2FAPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Verify2FAContent />
    </Suspense>
  )
}
