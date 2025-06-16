'use client';

import { useState, useEffect } from 'react';

export function StatusCheck() {
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [frontendApiStatus, setFrontendApiStatus] = useState<'checking' | 'connected' | 'error'>('checking');

  useEffect(() => {
    checkBackendStatus();
    checkFrontendApiStatus();
  }, []);

  const checkBackendStatus = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/documents');
      setBackendStatus(response.ok ? 'connected' : 'error');
    } catch (error) {
      setBackendStatus('error');
    }
  };

  const checkFrontendApiStatus = async () => {
    try {
      const response = await fetch('/api/documents');
      setFrontendApiStatus(response.ok ? 'connected' : 'error');
    } catch (error) {
      setFrontendApiStatus('error');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'checking':
        return <div className="w-4 h-4 animate-spin border-2 border-gray-300 border-t-blue-600 rounded-full"></div>;
      case 'connected':
        return <div className="w-4 h-4 bg-green-500 rounded-full"></div>;
      case 'error':
        return <div className="w-4 h-4 bg-red-500 rounded-full"></div>;
      default:
        return null;
    }
  };

  if (process.env.NODE_ENV !== 'development') {
    return null; // Only show in development
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
      <div className="font-medium text-gray-700 mb-2">Status Check</div>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          {getStatusIcon(backendStatus)}
          <span>Backend API</span>
        </div>
        <div className="flex items-center gap-2">
          {getStatusIcon(frontendApiStatus)}
          <span>Frontend API</span>
        </div>
      </div>
    </div>
  );
} 