import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Testing backend connectivity...');
    
    // Test 1: Check if backend is reachable
    const healthResponse = await fetch('http://localhost:8000/api/v1/health', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const results = {
      timestamp: new Date().toISOString(),
      backend_reachable: healthResponse.ok,
      backend_status: healthResponse.status,
      backend_health: null,
      documents_endpoint: null,
    };

    if (healthResponse.ok) {
      results.backend_health = await healthResponse.json();
      
      // Test 2: Check documents endpoint
      try {
        const docsResponse = await fetch('http://localhost:8000/api/v1/documents', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        results.documents_endpoint = {
          status: docsResponse.status,
          ok: docsResponse.ok,
          data: docsResponse.ok ? await docsResponse.json() : null,
        };
      } catch (error) {
        results.documents_endpoint = {
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    return NextResponse.json({
      message: 'Backend connectivity test results',
      results,
      suggestions: [
        healthResponse.ok ? '✅ Backend is reachable' : '❌ Backend is not reachable - ensure it\'s running on port 8000',
        'Run: cd backend && uvicorn app.main:app --reload --port 8000',
        'Check console logs for any database errors',
      ]
    });

  } catch (error) {
    console.error('❌ Backend test error:', error);
    
    return NextResponse.json({
      message: 'Backend connectivity test failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      suggestions: [
        '❌ Cannot connect to backend',
        'Ensure backend is running: cd backend && uvicorn app.main:app --reload --port 8000',
        'Check if port 8000 is available',
        'Check firewall settings',
      ]
    });
  }
} 