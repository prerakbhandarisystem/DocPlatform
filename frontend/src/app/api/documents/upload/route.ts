import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    console.log('📁 Upload API: Starting file upload process');
    
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      console.error('📁 Upload API: No file provided in request');
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    console.log('📁 Upload API: File received:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // Forward the file to the backend API
    const backendFormData = new FormData();
    backendFormData.append('file', file);

    console.log('📁 Upload API: Forwarding to backend at http://localhost:8000/api/v1/documents/upload');

    const backendResponse = await fetch('http://localhost:8000/api/v1/documents/upload', {
      method: 'POST',
      body: backendFormData,
      headers: {
        // Don't set Content-Type header, let fetch handle it for FormData
      },
    });

    console.log('📁 Upload API: Backend response status:', backendResponse.status);

    if (!backendResponse.ok) {
      let errorMessage = 'Failed to upload file to backend';
      try {
        const errorData = await backendResponse.json();
        errorMessage = errorData.detail || errorData.error || errorMessage;
        console.error('📁 Upload API: Backend error details:', errorData);
      } catch (e) {
        console.error('📁 Upload API: Could not parse backend error response');
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          status: backendResponse.status,
          statusText: backendResponse.statusText
        },
        { status: backendResponse.status }
      );
    }

    const data = await backendResponse.json();
    console.log('📁 Upload API: Backend response data:', data);
    
    const responseData = {
      message: 'File uploaded successfully',
      document: {
        id: data.id,
        name: data.filename || file.name,
        url: `/api/documents/${data.id}/content`,
        createdAt: new Date().toISOString(),
      }
    };

    console.log('📁 Upload API: Returning success response:', responseData);
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('📁 Upload API: Unexpected error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to upload file',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 