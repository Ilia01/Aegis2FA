'use client'

import { createContext, useContext, ReactNode, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'
import type { User, LoginFormData, RegisterFormData } from '@/types'

interface AuthContextType {
  user: User | null | undefined
  isLoading: boolean
  isAuthenticated: boolean
  login: (data: LoginFormData) => Promise<any>
  register: (data: RegisterFormData) => Promise<any>
  logout: () => Promise<void>
  refetchUser: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  console.log('[AuthProvider] Rendering')
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: user, isLoading, refetch } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => apiClient.getCurrentUser(),
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  console.log('[AuthProvider] user:', user, 'isLoading:', isLoading)

  const loginMutation = useMutation({
    mutationFn: (data: LoginFormData) => {
      console.log('[AuthContext] Login mutation called with:', data)
      return apiClient.login(data)
    },
    onSuccess: (response) => {
      console.log('[AuthContext] Login mutation success:', response)
      if (!response.requiresTwoFactor) {
        console.log('[AuthContext] No 2FA required, invalidating queries and redirecting')
        queryClient.invalidateQueries({ queryKey: ['currentUser'] })
        router.push('/dashboard')
      }
    },
  })

  const registerMutation = useMutation({
    mutationFn: (data: RegisterFormData) => apiClient.register(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] })
      router.push('/dashboard')
    },
  })

  const logoutMutation = useMutation({
    mutationFn: () => apiClient.logout(),
    onSuccess: () => {
      queryClient.setQueryData(['currentUser'], null)
      queryClient.clear()
      router.push('/login')
    },
  })

  // Create stable callback references
  const login = useCallback(
    (data: LoginFormData) => loginMutation.mutateAsync(data),
    []
  )

  const register = useCallback(
    (data: RegisterFormData) => registerMutation.mutateAsync(data),
    []
  )

  const logout = useCallback(
    () => logoutMutation.mutateAsync(),
    []
  )

  const refetchUser = useCallback(
    () => refetch(),
    []
  )

  const value: AuthContextType = useMemo(
    () => {
      console.log('[AuthProvider] Creating new context value')
      return {
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refetchUser,
      }
    },
    [user, isLoading, login, register, logout, refetchUser]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
