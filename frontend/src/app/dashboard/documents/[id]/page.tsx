'use client';

import { DocumentViewer } from '@/components/DocumentViewer';

interface DocumentViewPageProps {
  params: {
    id: string;
  };
}

export default function DocumentViewPage({ params }: DocumentViewPageProps) {
  return (
    <div className="h-full">
      <DocumentViewer documentId={params.id} />
    </div>
  );
} 