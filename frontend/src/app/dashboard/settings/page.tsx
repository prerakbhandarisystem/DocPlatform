'use client';

import { useState, useEffect } from 'react';

interface ApiStatus {
  status: 'checking' | 'connected' | 'error';
  message?: string;
  lastChecked?: Date;
}

export default function SettingsPage() {
  const [backendStatus, setBackendStatus] = useState<ApiStatus>({ status: 'checking' });
  const [frontendApiStatus, setFrontendApiStatus] = useState<ApiStatus>({ status: 'checking' });
  const [salesforceStatus, setSalesforceStatus] = useState<ApiStatus>({ status: 'checking' });

  useEffect(() => {
    checkAllAPIs();
  }, []);

  const checkAllAPIs = () => {
    checkBackendStatus();
    checkFrontendApiStatus();
    checkSalesforceStatus();
  };

  const checkBackendStatus = async () => {
    setBackendStatus({ status: 'checking' });
    try {
      const response = await fetch('http://localhost:8000/api/v1/documents');
      setBackendStatus({
        status: response.ok ? 'connected' : 'error',
        message: response.ok ? 'Backend API is running' : `HTTP ${response.status}`,
        lastChecked: new Date()
      });
    } catch (error) {
      setBackendStatus({
        status: 'error',
        message: 'Connection failed - Backend server may be down',
        lastChecked: new Date()
      });
    }
  };

  const checkFrontendApiStatus = async () => {
    setFrontendApiStatus({ status: 'checking' });
    try {
      const response = await fetch('/api/documents');
      setFrontendApiStatus({
        status: response.ok ? 'connected' : 'error',
        message: response.ok ? 'Frontend API routes are working' : `HTTP ${response.status}`,
        lastChecked: new Date()
      });
    } catch (error) {
      setFrontendApiStatus({
        status: 'error',
        message: 'Frontend API routes failed',
        lastChecked: new Date()
      });
    }
  };

  const checkSalesforceStatus = async () => {
    setSalesforceStatus({ status: 'checking' });
    try {
      const response = await fetch('http://localhost:8000/api/v1/salesforce/status');
      const data = await response.json();
      setSalesforceStatus({
        status: response.ok ? 'connected' : 'error',
        message: response.ok ? 
          (data.connected ? 'Salesforce connected' : 'Salesforce configured but not connected') :
          'Salesforce API failed',
        lastChecked: new Date()
      });
    } catch (error) {
      setSalesforceStatus({
        status: 'error',
        message: 'Salesforce API check failed',
        lastChecked: new Date()
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'checking':
        return <div className="w-5 h-5 animate-spin border-2 border-gray-300 border-t-blue-600 rounded-full"></div>;
      case 'connected':
        return (
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'checking': return 'border-yellow-200 bg-yellow-50';
      case 'connected': return 'border-green-200 bg-green-50';
      case 'error': return 'border-red-200 bg-red-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Configure your DocPlatform settings and check system status.</p>
      </div>

      {/* API Status Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">API Status</h2>
            <button
              onClick={checkAllAPIs}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh All
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1">Monitor the health of all API endpoints</p>
        </div>
        
        <div className="p-6 space-y-4">
          {/* Backend API Status */}
          <div className={`border rounded-lg p-4 ${getStatusColor(backendStatus.status)}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getStatusIcon(backendStatus.status)}
                <div>
                  <h3 className="font-medium text-gray-900">Backend API</h3>
                  <p className="text-sm text-gray-600">http://localhost:8000</p>
                </div>
              </div>
              <button
                onClick={checkBackendStatus}
                className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                Test
              </button>
            </div>
            {backendStatus.message && (
              <div className="mt-3 text-sm">
                <p className="text-gray-700">{backendStatus.message}</p>
                {backendStatus.lastChecked && (
                  <p className="text-gray-500 text-xs mt-1">
                    Last checked: {backendStatus.lastChecked.toLocaleTimeString()}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Frontend API Status */}
          <div className={`border rounded-lg p-4 ${getStatusColor(frontendApiStatus.status)}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getStatusIcon(frontendApiStatus.status)}
                <div>
                  <h3 className="font-medium text-gray-900">Frontend API</h3>
                  <p className="text-sm text-gray-600">Next.js API Routes</p>
                </div>
              </div>
              <button
                onClick={checkFrontendApiStatus}
                className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                Test
              </button>
            </div>
            {frontendApiStatus.message && (
              <div className="mt-3 text-sm">
                <p className="text-gray-700">{frontendApiStatus.message}</p>
                {frontendApiStatus.lastChecked && (
                  <p className="text-gray-500 text-xs mt-1">
                    Last checked: {frontendApiStatus.lastChecked.toLocaleTimeString()}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Salesforce API Status */}
          <div className={`border rounded-lg p-4 ${getStatusColor(salesforceStatus.status)}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getStatusIcon(salesforceStatus.status)}
                <div>
                  <h3 className="font-medium text-gray-900">Salesforce API</h3>
                  <p className="text-sm text-gray-600">Integration status</p>
                </div>
              </div>
              <button
                onClick={checkSalesforceStatus}
                className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                Test
              </button>
            </div>
            {salesforceStatus.message && (
              <div className="mt-3 text-sm">
                <p className="text-gray-700">{salesforceStatus.message}</p>
                {salesforceStatus.lastChecked && (
                  <p className="text-gray-500 text-xs mt-1">
                    Last checked: {salesforceStatus.lastChecked.toLocaleTimeString()}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Additional Settings Sections */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">General Settings</h2>
          <p className="text-sm text-gray-600 mt-1">Configure your application preferences</p>
        </div>
        
        <div className="p-6">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Auto-save Documents
              </label>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  defaultChecked
                />
                <span className="ml-2 text-sm text-gray-600">
                  Automatically save changes to Google Drive
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                AI Suggestions
              </label>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  defaultChecked
                />
                <span className="ml-2 text-sm text-gray-600">
                  Enable AI-powered writing suggestions
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Salesforce Auto-connect
              </label>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-600">
                  Automatically connect to Salesforce on startup
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Environment Info */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Environment</h2>
          <p className="text-sm text-gray-600 mt-1">System information</p>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Environment:</span>
              <span className="ml-2 text-gray-600">{process.env.NODE_ENV || 'development'}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Version:</span>
              <span className="ml-2 text-gray-600">1.0.0</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Backend URL:</span>
              <span className="ml-2 text-gray-600">http://localhost:8000</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Frontend URL:</span>
              <span className="ml-2 text-gray-600">http://localhost:3000</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 