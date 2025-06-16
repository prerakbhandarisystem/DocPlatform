import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('Fetching documents from backend API...');
    
    const backendResponse = await fetch('http://localhost:8000/api/v1/documents', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      cache: 'no-store', // Disable caching for fresh data
    });

    console.log('Backend response status:', backendResponse.status);

    if (!backendResponse.ok) {
      console.error('Backend error:', backendResponse.status, backendResponse.statusText);
      throw new Error(`Backend API error: ${backendResponse.status}`);
    }

    const documents = await backendResponse.json();
    console.log('Documents fetched successfully:', documents.length, 'documents');

    // Transform the response to match our frontend interface
    const transformedDocuments = documents.map((doc: any) => ({
      id: doc.id,
      name: doc.filename,
      url: `/api/documents/${doc.id}/content`,
      createdAt: doc.uploaded_at,
    }));

    // Add CORS headers and cache control
    return NextResponse.json(transformedDocuments, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch documents',
        message: error instanceof Error ? error.message : 'Unknown error',
        documents: [] // Fallback empty array
      },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }
}

// Handle DELETE requests for bulk document deletion
export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const confirm = url.searchParams.get('confirm') === 'true';
    
    console.log('Deleting all documents...');
    
    const backendResponse = await fetch(`http://localhost:8000/api/v1/documents?confirm=${confirm}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    console.log('Backend bulk delete response status:', backendResponse.status);

    if (!backendResponse.ok) {
      console.error('Backend bulk delete error:', backendResponse.status, backendResponse.statusText);
      const errorData = await backendResponse.json();
      throw new Error(errorData.detail || `Bulk delete failed: ${backendResponse.status}`);
    }

    const result = await backendResponse.json();
    console.log('All documents deleted successfully:', result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error deleting all documents:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to delete all documents',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
} 