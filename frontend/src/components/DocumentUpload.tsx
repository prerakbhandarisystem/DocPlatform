'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useRouter } from 'next/navigation';

export function DocumentUpload() {
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadedDocument, setUploadedDocument] = useState<any>(null);
  const router = useRouter();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    try {
      setUploadStatus('uploading');
      setUploadProgress(0);
      setErrorMessage('');
      
      const file = acceptedFiles[0];
      console.log('Uploading file:', file.name, 'Size:', file.size);
      
      const formData = new FormData();
      formData.append('file', file);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        let errorMsg = 'Upload failed';
        try {
          const errorData = await response.json();
          errorMsg = errorData?.error || `Upload failed (${response.status}: ${response.statusText})`;
        } catch {
          errorMsg = `Upload failed (${response.status}: ${response.statusText})`;
        }
        throw new Error(errorMsg);
      }

      const result = await response.json();
      console.log('Upload successful:', result);
      
      setUploadedDocument(result.document);
      setUploadStatus('success');
      
      // Auto-redirect to documents page after successful upload
      setTimeout(() => {
        setUploadStatus('idle');
        setUploadProgress(0);
        setUploadedDocument(null);
        router.push('/dashboard/documents');
      }, 2000);

    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Upload failed');
      setUploadProgress(0);
    }
  }, [router]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB limit
  });

  const resetUpload = () => {
    setUploadStatus('idle');
    setErrorMessage('');
    setUploadProgress(0);
    setUploadedDocument(null);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* File Rejection Errors */}
      {fileRejections.length > 0 && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="text-sm font-medium text-red-800 mb-2">File Upload Errors:</h4>
          {fileRejections.map(({ file, errors }) => (
            <div key={file.name} className="text-sm text-red-600">
              <span className="font-medium">{file.name}</span>:
              <ul className="list-disc list-inside ml-2">
                {errors.map((error: any) => (
                  <li key={error.code}>
                    {error.code === 'file-too-large' ? 'File is too large (max 10MB)' : 
                     error.code === 'file-invalid-type' ? 'File type not supported' : 
                     error.message}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`relative p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-all duration-300
          ${isDragActive ? 'border-blue-500 bg-blue-50 scale-105' : 'border-gray-300 hover:border-blue-400'}
          ${uploadStatus === 'error' ? 'border-red-500 bg-red-50' : ''}
          ${uploadStatus === 'success' ? 'border-green-500 bg-green-50' : ''}
          ${uploadStatus === 'uploading' ? 'border-blue-500 bg-blue-50' : ''}`}
      >
        <input {...getInputProps()} />
        
        {uploadStatus === 'uploading' ? (
          <div className="text-blue-600">
            <div className="relative">
              <svg className="animate-spin h-12 w-12 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <p className="font-medium mb-2">Uploading...</p>
            <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-sm">{uploadProgress}% complete</p>
          </div>
        ) : uploadStatus === 'success' ? (
          <div className="text-green-600">
            <svg className="h-12 w-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="font-medium mb-2">Upload successful!</p>
            {uploadedDocument && (
              <p className="text-sm text-gray-600">
                {uploadedDocument.name} has been uploaded successfully.
              </p>
            )}
            <p className="text-xs text-gray-500 mt-2">Redirecting to documents...</p>
          </div>
        ) : uploadStatus === 'error' ? (
          <div className="text-red-600">
            <svg className="h-12 w-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <p className="font-medium mb-2">Upload failed</p>
            <p className="text-sm mb-4">{errorMessage}</p>
            <button
              onClick={resetUpload}
              className="px-4 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div>
            <svg className="h-12 w-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-lg font-medium text-gray-700 mb-2">
              {isDragActive
                ? "Drop the file here"
                : "Drag and drop a file here, or click to select"}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Supported formats: PDF, DOC, DOCX, TXT (max 10MB)
            </p>
            {!isDragActive && (
              <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                Select File
              </button>
            )}
          </div>
        )}
      </div>

      {/* Upload Tips */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Upload Tips:</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Maximum file size: 10MB</li>
          <li>• Text files (.txt) and Word documents (.docx) can be edited</li>
          <li>• PDF files are view-only but can be downloaded</li>
          <li>• Files are stored securely and only accessible to you</li>
        </ul>
      </div>
    </div>
  );
} 