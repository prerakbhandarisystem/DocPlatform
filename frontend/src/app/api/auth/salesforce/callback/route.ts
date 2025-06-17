import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Handle OAuth error
    if (error) {
      console.error('Salesforce OAuth error:', error, errorDescription);
      return NextResponse.redirect(
        new URL(`/dashboard/documents?salesforce=error&message=${encodeURIComponent(errorDescription || error)}`, request.url)
      );
    }

    // Validate required parameters
    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/dashboard/documents?salesforce=error&message=Missing authorization code or state', request.url)
      );
    }

    // Exchange code for tokens via backend
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const response = await fetch(`${backendUrl}/api/v1/salesforce/auth/callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        state,
      }),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      // Success - redirect to documents page with success message
      return NextResponse.redirect(
        new URL('/dashboard/documents?salesforce=connected', request.url)
      );
    } else {
      // Error from backend
      const errorMsg = result.error || 'Authentication failed';
      return NextResponse.redirect(
        new URL(`/dashboard/documents?salesforce=error&message=${encodeURIComponent(errorMsg)}`, request.url)
      );
    }
  } catch (error) {
    console.error('Error handling Salesforce callback:', error);
    return NextResponse.redirect(
      new URL('/dashboard/documents?salesforce=error&message=Authentication failed', request.url)
    );
  }
} 