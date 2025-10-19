'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Smartphone } from 'lucide-react'

const phoneSchema = z.object({
  phoneNumber: z.string().min(10, 'Phone number must be at least 10 digits').regex(/^\+?[1-9]\d{1,14}$/, 'Enter a valid phone number with country code (e.g., +1234567890)'),
})

const codeSchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits').regex(/^\d+$/, 'Code must contain only digits'),
})

type PhoneFormData = z.infer<typeof phoneSchema>
type CodeFormData = z.infer<typeof codeSchema>

export default function SetupSMSPage() {
  const router = useRouter()
  const { isAuthenticated, refetchUser } = useAuth()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('')

  const phoneForm = useForm<PhoneFormData>({
    resolver: zodResolver(phoneSchema),
  })

  const codeForm = useForm<CodeFormData>({
    resolver: zodResolver(codeSchema),
  })

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, router])

  const onPhoneSubmit = async (data: PhoneFormData) => {
    try {
      setError('')
      setSuccess('')
      await apiClient.setupSMS(data.phoneNumber)
      setPhoneNumber(data.phoneNumber)
      setCodeSent(true)
      setSuccess(`Verification code sent to ${data.phoneNumber}`)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      setError(error.response?.data?.message || 'Failed to send verification code. Please try again.')
    }
  }

  const onCodeSubmit = async (data: CodeFormData) => {
    try {
      setError('')
      await apiClient.verifySMSSetup(data.code)
      await refetchUser()
      router.push('/dashboard')
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      setError(error.response?.data?.message || 'Verification failed. Please try again.')
    }
  }

  const handleResend = async () => {
    try {
      setError('')
      setSuccess('')
      await apiClient.resend2FACode('sms')
      setSuccess(`Verification code resent to ${phoneNumber}`)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      setError(error.response?.data?.message || 'Failed to resend code. Please try again.')
    }
  }

  if (!codeSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center space-x-2 mb-2">
              <Smartphone className="h-6 w-6 text-primary" />
              <CardTitle>Setup SMS Verification</CardTitle>
            </div>
            <CardDescription>Enter your phone number to receive verification codes via SMS</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="+1234567890"
                  {...phoneForm.register('phoneNumber')}
                />
                {phoneForm.formState.errors.phoneNumber && (
                  <p className="text-sm text-destructive">{phoneForm.formState.errors.phoneNumber.message}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  Include your country code (e.g., +1 for US, +44 for UK)
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
                <Button type="submit" disabled={phoneForm.formState.isSubmitting} className="flex-1">
                  {phoneForm.formState.isSubmitting ? 'Sending...' : 'Send Code'}
                </Button>
              </div>
            </form>
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
            <Smartphone className="h-6 w-6 text-primary" />
            <CardTitle>Verify SMS Code</CardTitle>
          </div>
          <CardDescription>Enter the 6-digit code sent to {phoneNumber}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={codeForm.handleSubmit(onCodeSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert variant="success">
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="code">Verification Code</Label>
              <Input
                id="code"
                type="text"
                placeholder="123456"
                maxLength={6}
                {...codeForm.register('code')}
              />
              {codeForm.formState.errors.code && (
                <p className="text-sm text-destructive">{codeForm.formState.errors.code.message}</p>
              )}
            </div>

            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCodeSent(false)}
                className="flex-1"
              >
                Back
              </Button>
              <Button type="submit" disabled={codeForm.formState.isSubmitting} className="flex-1">
                {codeForm.formState.isSubmitting ? 'Verifying...' : 'Verify & Enable'}
              </Button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={handleResend}
                className="text-sm text-muted-foreground hover:underline"
              >
                Didn&apos;t receive a code? Resend
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
