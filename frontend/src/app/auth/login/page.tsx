'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Script from 'next/script'

interface GoogleUser {
  credential: string
}

declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: any) => void
          renderButton: (element: HTMLElement, config: any) => void
          prompt: () => void
        }
      }
    }
  }
}

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGoogleSignIn = async (response: { credential: string }) => {
    console.log('🔍 Starting Google sign-in process')
    console.log('🔍 Token preview:', response.credential.substring(0, 20) + '...')
    
    setIsLoading(true)
    setError(null)

    try {
      console.log('🔍 Sending request to /api/auth/google')
      const result = await fetch('/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ credential: response.credential }),
      })

      console.log('🔍 Response status:', result.status)
      console.log('🔍 Response headers:', result.headers)

      if (!result.ok) {
        const errorData = await result.json()
        console.error('🔍 Auth failed:', errorData)
        throw new Error('Authentication failed')
      }

      const data = await result.json()
      console.log('🔍 Auth success:', { user: data.user?.email, hasToken: !!data.token })
      
      // Store tokens in localStorage (in production, consider more secure storage)
      localStorage.setItem('access_token', data.token.access_token)
      localStorage.setItem('refresh_token', data.token.refresh_token)
      localStorage.setItem('user', JSON.stringify(data.user))

      // Redirect to dashboard
      router.push('/dashboard')
    } catch (err) {
      console.error('🔍 Auth error:', err)
      setError('Failed to sign in. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const initializeGoogleSignIn = () => {
    // Multiple fallback methods to ensure client ID is available
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 
                          '431073746499-02boqh099nag50pib62orjsk8jmcluol.apps.googleusercontent.com'
    
    console.log('Environment variable:', process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID)
    console.log('Final Google Client ID:', googleClientId)
    console.log('Client ID length:', googleClientId.length)
    
    if (!googleClientId || googleClientId === 'undefined') {
      console.error('❌ Google Client ID is not properly set!')
      setError('Google Client ID configuration error. Please contact support.')
      return
    }
    
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleSignIn,
        auto_select: false,
        cancel_on_tap_outside: true,
      })

      const buttonElement = document.getElementById('google-signin-button')
      if (buttonElement) {
        window.google.accounts.id.renderButton(buttonElement, {
          type: 'standard',
          shape: 'rounded',
          theme: 'outline',
          text: 'signin_with',
          size: 'medium',
          width: '280',
        })
      }
    }
  }

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        onLoad={initializeGoogleSignIn}
      />
      
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-8 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
          </div>
          
          {/* Title */}
          <h2 className="text-center text-2xl font-bold text-gray-900 mb-2">
            Welcome to DocPlatform
          </h2>
          <p className="text-center text-sm text-gray-600 mb-8">
            AI-powered document generation at scale
          </p>
        </div>

        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
          <div className="bg-white py-6 px-6 shadow-sm sm:rounded-lg border border-gray-200">
            {/* Welcome Message */}
            <div className="text-center mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                Sign in to your account
              </h3>
              <p className="text-sm text-gray-500">
                Get started with AI-powered templates
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-md bg-red-50 p-3 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-4 w-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-2">
                    <p className="text-sm font-medium text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Google Sign In Button */}
            <div className="flex flex-col items-center space-y-4">
              <div
                id="google-signin-button"
                className="flex justify-center"
              />

              {isLoading && (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-sm text-gray-600">Signing you in...</span>
                </div>
              )}
            </div>

            {/* Features */}
            <div className="mt-6 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500 text-center mb-3">Features you'll get:</p>
              <div className="space-y-2">
                <div className="flex items-center text-xs text-gray-600">
                  <svg className="w-3 h-3 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>AI document template conversion</span>
                </div>
                <div className="flex items-center text-xs text-gray-600">
                  <svg className="w-3 h-3 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Salesforce integration</span>
                </div>
                <div className="flex items-center text-xs text-gray-600">
                  <svg className="w-3 h-3 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Mass document generation</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="mt-4 text-center text-xs text-gray-500">
            By signing in, you agree to our{' '}
            <a href="#" className="font-medium text-blue-600 hover:text-blue-500">Terms</a>
            {' '}and{' '}
            <a href="#" className="font-medium text-blue-600 hover:text-blue-500">Privacy Policy</a>
          </p>
        </div>
      </div>
    </>
  )
} 