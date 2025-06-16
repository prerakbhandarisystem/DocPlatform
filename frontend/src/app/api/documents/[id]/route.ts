import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    
    console.log(`Fetching document ${id} from backend...`);
    
    const backendResponse = await fetch(`http://localhost:8000/api/v1/documents/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    console.log('Backend response status:', backendResponse.status);

    if (!backendResponse.ok) {
      console.error('Backend error:', backendResponse.status, backendResponse.statusText);
      throw new Error(`Backend API error: ${backendResponse.status}`);
    }

    const document = await backendResponse.json();
    console.log('Document fetched successfully:', document);

    return NextResponse.json(document, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Error fetching document:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch document',
        message: error instanceof Error ? error.message : 'Unknown error',
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

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    
    console.log(`Deleting document ${id}...`);
    
    const backendResponse = await fetch(`http://localhost:8000/api/v1/documents/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    console.log('Backend delete response status:', backendResponse.status);

    if (!backendResponse.ok) {
      console.error('Backend delete error:', backendResponse.status, backendResponse.statusText);
      const errorData = await backendResponse.json();
      throw new Error(errorData.detail || `Delete failed: ${backendResponse.status}`);
    }

    const result = await backendResponse.json();
    console.log('Document deleted successfully:', result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error deleting document:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to delete document',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
} 