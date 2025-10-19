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
import { Mail } from 'lucide-react'

const emailSchema = z.object({
  email: z.string().email('Invalid email address'),
})

const codeSchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits').regex(/^\d+$/, 'Code must contain only digits'),
})

type EmailFormData = z.infer<typeof emailSchema>
type CodeFormData = z.infer<typeof codeSchema>

export default function SetupEmailPage() {
  const router = useRouter()
  const { isAuthenticated, refetchUser } = useAuth()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [email, setEmail] = useState('')

  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
  })

  const codeForm = useForm<CodeFormData>({
    resolver: zodResolver(codeSchema),
  })

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, router])

  const onEmailSubmit = async (data: EmailFormData) => {
    try {
      setError('')
      setSuccess('')
      await apiClient.setupEmail(data.email)
      setEmail(data.email)
      setCodeSent(true)
      setSuccess(`Verification code sent to ${data.email}`)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      setError(error.response?.data?.message || 'Failed to send verification code. Please try again.')
    }
  }

  const onCodeSubmit = async (data: CodeFormData) => {
    try {
      setError('')
      await apiClient.verifyEmailSetup(data.code)
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
      await apiClient.resend2FACode('email')
      setSuccess(`Verification code resent to ${email}`)
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
              <Mail className="h-6 w-6 text-primary" />
              <CardTitle>Setup Email Verification</CardTitle>
            </div>
            <CardDescription>Enter your email address to receive verification codes</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  {...emailForm.register('email')}
                />
                {emailForm.formState.errors.email && (
                  <p className="text-sm text-destructive">{emailForm.formState.errors.email.message}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  This can be different from your account email
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
                <Button type="submit" disabled={emailForm.formState.isSubmitting} className="flex-1">
                  {emailForm.formState.isSubmitting ? 'Sending...' : 'Send Code'}
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
            <Mail className="h-6 w-6 text-primary" />
            <CardTitle>Verify Email Code</CardTitle>
          </div>
          <CardDescription>Enter the 6-digit code sent to {email}</CardDescription>
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
