import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { document_ids } = body;
    
    if (!document_ids || !Array.isArray(document_ids)) {
      return NextResponse.json(
        { error: 'document_ids array is required' },
        { status: 400 }
      );
    }
    
    console.log('Deleting selected documents:', document_ids);
    
    const backendResponse = await fetch('http://localhost:8000/api/v1/documents/delete-selected', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(document_ids),
    });

    console.log('Backend selected delete response status:', backendResponse.status);

    if (!backendResponse.ok) {
      console.error('Backend selected delete error:', backendResponse.status, backendResponse.statusText);
      const errorData = await backendResponse.json();
      throw new Error(errorData.detail || `Selected delete failed: ${backendResponse.status}`);
    }

    const result = await backendResponse.json();
    console.log('Selected documents deleted successfully:', result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error deleting selected documents:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to delete selected documents',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
} 