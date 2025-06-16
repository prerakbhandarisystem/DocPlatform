import { NextResponse } from 'next/server';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const documentId = params.id;
    
    const response = await fetch(`http://localhost:8000/api/v1/templates/analyze/${documentId}`, {
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
    console.error('Template analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze document for template conversion' },
      { status: 500 }
    );
  }
} 