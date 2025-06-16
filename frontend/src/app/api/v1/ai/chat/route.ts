import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🤖 AI Chat request received');
    
    const body = await request.json();
    console.log('📤 Forwarding to backend:', { 
      message: body.message?.substring(0, 100) + '...',
      feature: body.feature,
      documentId: body.documentId,
      hasDocumentText: !!body.documentText,
      documentTextLength: body.documentText?.length || 0
    });
    
    // Forward the request to the FastAPI backend
    const backendResponse = await fetch('http://localhost:8000/api/v1/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });

    console.log('📥 Backend AI response status:', backendResponse.status);

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('❌ Backend AI error:', backendResponse.status, errorText);
      
      return NextResponse.json({
        response: 'I apologize, but I encountered an error while processing your request. Please try again.',
        status: 'error',
        suggestions: []
      }, { status: 200 }); // Return 200 to prevent frontend errors
    }

    const aiResponse = await backendResponse.json();
    console.log('✅ AI response received:', aiResponse.response?.substring(0, 100) + '...');

    return NextResponse.json(aiResponse, {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('❌ AI Chat API error:', error);
    
    return NextResponse.json({
      response: 'I apologize, but I encountered a technical error. Please try again later.',
      status: 'error',
      suggestions: []
    }, { status: 200 });
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// Test endpoint
export async function GET() {
  return NextResponse.json({ 
    message: '🤖 AI Chat API endpoint is available',
    status: 'ready',
    timestamp: new Date().toISOString()
  });
} 