import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; platform: string } }
) {
  try {
    const documentId = params.id;
    const platform = params.platform;
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const useAiEnhancement = searchParams.get('use_ai_enhancement') || 'true';
    const documentType = searchParams.get('document_type');
    
    let url = `http://localhost:8000/api/v1/templates/convert/${documentId}/${platform}?use_ai_enhancement=${useAiEnhancement}`;
    if (documentType) {
      url += `&document_type=${documentType}`;
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Template conversion error:', error);
    return NextResponse.json(
      { error: 'Failed to convert document to template' },
      { status: 500 }
    );
  }
} 