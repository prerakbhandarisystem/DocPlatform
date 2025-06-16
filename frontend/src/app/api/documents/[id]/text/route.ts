import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    
    console.log(`📄 Fetching text content for document ${id}...`);
    
    const backendResponse = await fetch(`http://localhost:8000/api/v1/documents/${id}/text`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    console.log('📥 Backend text extraction response status:', backendResponse.status);

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('❌ Backend text extraction error:', backendResponse.status, errorText);
      return NextResponse.json(
        { 
          error: 'Failed to extract text from document',
          text_content: 'Unable to extract text content for AI analysis.',
          word_count: 0,
          char_count: 0
        },
        { status: 200 } // Return 200 so frontend gets fallback content
      );
    }

    const textData = await backendResponse.json();
    console.log('✅ Text extracted successfully:', textData.word_count, 'words');

    return NextResponse.json(textData, {
      headers: {
        'Cache-Control': 'public, max-age=300', // Cache text for 5 minutes
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('❌ Text extraction API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to extract document text',
        text_content: 'Unable to extract text content for AI analysis.',
        word_count: 0,
        char_count: 0
      },
      { status: 200 }
    );
  }
} 