'use client';

import { useState, useEffect } from 'react';

interface SalesforceObject {
  name: string;
  label: string;
  custom: boolean;
  keyPrefix?: string;
  updateable: boolean;
  createable: boolean;
  deletable: boolean;
}

interface SalesforceField {
  name: string;
  label: string;
  type: string;
  length?: number;
  custom: boolean;
  updateable: boolean;
  createable: boolean;
  required: boolean;
  picklistValues?: Array<{ label: string; value: string }>;
  referenceTo?: string[];
  relationshipName?: string;
}

interface ChildRelationship {
  childSObject: string;
  field: string;
  relationshipName: string;
  cascadeDelete: boolean;
}

interface SalesforceConnection {
  connected: boolean;
  instance_url?: string;
  has_credentials: boolean;
}

interface SalesforcePanelProps {
  isVisible: boolean;
  onClose: () => void;
}

export function SalesforcePanel({ isVisible, onClose }: SalesforcePanelProps) {
  const [connection, setConnection] = useState<SalesforceConnection>({
    connected: false,
    has_credentials: false
  });
  const [objects, setObjects] = useState<SalesforceObject[]>([]);
  const [selectedObject, setSelectedObject] = useState<string | null>(null);
  const [objectFields, setObjectFields] = useState<SalesforceField[]>([]);
  const [childRelationships, setChildRelationships] = useState<ChildRelationship[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [fieldSearchTerm, setFieldSearchTerm] = useState('');

  useEffect(() => {
    if (isVisible) {
      checkConnectionStatus();
    }
  }, [isVisible]);

  const checkConnectionStatus = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/api/v1/salesforce/status`);
      const data = await response.json();
      
      if (data.success) {
        setConnection(data);
        if (data.connected) {
          loadObjects();
        }
      }
    } catch (error) {
      console.error('Error checking Salesforce status:', error);
      setError('Failed to check connection status');
    }
  };

  const connectToSalesforce = async () => {
    setConnecting(true);
    setError(null);
    
    try {
      // Get the OAuth authorization URL from backend
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/api/v1/salesforce/auth/url`);
      const data = await response.json();
      
      if (data.success && data.authorization_url) {
        // Redirect to Salesforce authorization page
        window.location.href = data.authorization_url;
      } else {
        setError(data.error || 'Failed to get authorization URL');
        setConnecting(false);
      }
    } catch (error) {
      console.error('Error initiating Salesforce OAuth:', error);
      setError('Failed to initiate Salesforce connection');
      setConnecting(false);
    }
  };

  const disconnectFromSalesforce = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/api/v1/salesforce/disconnect`, {
        method: 'POST',
      });
      
      if (response.ok) {
        setConnection({ connected: false, has_credentials: false });
        setObjects([]);
        setSelectedObject(null);
        setObjectFields([]);
        setChildRelationships([]);
      }
    } catch (error) {
      console.error('Error disconnecting from Salesforce:', error);
      setError('Failed to disconnect from Salesforce');
    }
  };

  const loadObjects = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/api/v1/salesforce/objects`);
      const data = await response.json();
      
      if (data.success) {
        setObjects(data.objects || []);
      } else {
        setError(data.error || 'Failed to load Salesforce objects');
      }
    } catch (error) {
      console.error('Error loading Salesforce objects:', error);
      setError('Failed to load Salesforce objects');
    } finally {
      setLoading(false);
    }
  };

  const loadObjectFields = async (objectName: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/api/v1/salesforce/objects/${objectName}/fields`);
      const data = await response.json();
      
      if (data.success) {
        setObjectFields(data.fields || []);
        setChildRelationships(data.childRelationships || []);
        setSelectedObject(objectName);
      } else {
        setError(data.error || 'Failed to load object fields');
      }
    } catch (error) {
      console.error('Error loading object fields:', error);
      setError('Failed to load object fields');
    } finally {
      setLoading(false);
    }
  };

  const filteredObjects = objects.filter(obj =>
    obj.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    obj.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredFields = objectFields.filter(field =>
    field.label.toLowerCase().includes(fieldSearchTerm.toLowerCase()) ||
    field.name.toLowerCase().includes(fieldSearchTerm.toLowerCase())
  );

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white border-l border-gray-200 shadow-lg z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <h2 className="text-lg font-semibold text-gray-900">Salesforce</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded-md transition-colors"
        >
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {!connection.connected ? (
          /* Connection Form */
          <div className="p-6 space-y-6">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.5 8.5c0 1.4-1.1 2.5-2.5 2.5S3.5 9.9 3.5 8.5 4.6 6 6 6s2.5 1.1 2.5 2.5zm12.5 4c0 1.4-1.1 2.5-2.5 2.5S16 13.9 16 12.5s1.1-2.5 2.5-2.5 2.5 1.1 2.5 2.5zM10 17c0 1.4-1.1 2.5-2.5 2.5S5 18.4 5 17s1.1-2.5 2.5-2.5S10 15.6 10 17zm8-4.5c0 1.4-1.1 2.5-2.5 2.5S13 13.9 13 12.5s1.1-2.5 2.5-2.5 2.5 1.1 2.5 2.5z"/>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Connect to Salesforce</h3>
              <p className="text-sm text-gray-600 mb-6">
                Securely connect to your Salesforce org to access objects and fields for document generation.
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Secure OAuth Authentication</p>
                    <p>You'll be redirected to Salesforce to enter your credentials. We never store your password.</p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-red-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                </div>
              )}

              <button
                onClick={connectToSalesforce}
                disabled={connecting}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {connecting ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Redirecting to Salesforce...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8.5 8.5c0 1.4-1.1 2.5-2.5 2.5S3.5 9.9 3.5 8.5 4.6 6 6 6s2.5 1.1 2.5 2.5zm12.5 4c0 1.4-1.1 2.5-2.5 2.5S16 13.9 16 12.5s1.1-2.5 2.5-2.5 2.5 1.1 2.5 2.5zM10 17c0 1.4-1.1 2.5-2.5 2.5S5 18.4 5 17s1.1-2.5 2.5-2.5S10 15.6 10 17zm8-4.5c0 1.4-1.1 2.5-2.5 2.5S13 13.9 13 12.5s1.1-2.5 2.5-2.5 2.5 1.1 2.5 2.5z"/>
                    </svg>
                    Connect with Salesforce
                  </div>
                )}
              </button>

              <p className="text-xs text-gray-500 text-center">
                By connecting, you agree to allow DocPlatform to access your Salesforce data for document generation purposes.
              </p>
            </div>
          </div>
        ) : (
          /* Connected View */
          <div className="flex-1 flex flex-col">
            {/* Connection Status */}
            <div className="p-4 bg-green-50 border-b border-green-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-green-800">Connected</span>
                </div>
                <button
                  onClick={disconnectFromSalesforce}
                  className="text-sm text-green-700 hover:text-green-900 underline"
                >
                  Disconnect
                </button>
              </div>
              {connection.instance_url && (
                <p className="text-xs text-green-600 mt-1">{connection.instance_url}</p>
              )}
            </div>

            {!selectedObject ? (
              /* Objects List */
              <div className="flex-1 flex flex-col">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900">Objects ({objects.length})</h3>
                    <button
                      onClick={loadObjects}
                      disabled={loading}
                      className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                    >
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search objects..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>

                <div className="flex-1 overflow-y-auto">
                  {loading ? (
                    <div className="p-4 text-center">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                      <p className="text-sm text-gray-600 mt-2">Loading objects...</p>
                    </div>
                  ) : error ? (
                    <div className="p-4">
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  ) : (
                    <div className="space-y-1 p-2">
                      {filteredObjects.map((object) => (
                        <button
                          key={object.name}
                          onClick={() => loadObjectFields(object.name)}
                          className="w-full text-left p-3 hover:bg-gray-50 rounded-md transition-colors border border-transparent hover:border-gray-200"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">{object.label}</p>
                              <p className="text-xs text-gray-500">{object.name}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              {object.custom && (
                                <span className="px-1.5 py-0.5 bg-purple-100 text-purple-600 text-xs rounded">Custom</span>
                              )}
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Object Fields View */
              <div className="flex-1 flex flex-col">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center gap-2 mb-3">
                    <button
                      onClick={() => {
                        setSelectedObject(null);
                        setObjectFields([]);
                        setChildRelationships([]);
                        setFieldSearchTerm('');
                      }}
                      className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                    >
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <h3 className="font-medium text-gray-900">{selectedObject}</h3>
                  </div>
                  <input
                    type="text"
                    value={fieldSearchTerm}
                    onChange={(e) => setFieldSearchTerm(e.target.value)}
                    placeholder="Search fields..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>

                <div className="flex-1 overflow-y-auto">
                  {loading ? (
                    <div className="p-4 text-center">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                      <p className="text-sm text-gray-600 mt-2">Loading fields...</p>
                    </div>
                  ) : (
                    <div className="space-y-4 p-4">
                      {/* Fields */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">
                          Fields ({filteredFields.length})
                        </h4>
                        <div className="space-y-2">
                          {filteredFields.map((field) => (
                            <div
                              key={field.name}
                              className="p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900 truncate">{field.label}</p>
                                  <p className="text-xs text-gray-500 truncate">{field.name}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                                      {field.type}
                                    </span>
                                    {field.required && (
                                      <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-xs rounded">
                                        Required
                                      </span>
                                    )}
                                    {field.custom && (
                                      <span className="px-1.5 py-0.5 bg-purple-100 text-purple-600 text-xs rounded">
                                        Custom
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(`{{${selectedObject}.${field.name}}}`);
                                    // Show a quick feedback
                                    const btn = event?.target as HTMLElement;
                                    const originalText = btn.innerHTML;
                                    btn.innerHTML = '✓';
                                    setTimeout(() => {
                                      btn.innerHTML = originalText;
                                    }, 1000);
                                  }}
                                  className="ml-2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                                  title="Copy field reference"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Child Relationships */}
                      {childRelationships.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-2">
                            Related Lists ({childRelationships.length})
                          </h4>
                          <div className="space-y-2">
                            {childRelationships.map((rel, index) => (
                              <div
                                key={index}
                                className="p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium text-gray-900">{rel.relationshipName}</p>
                                    <p className="text-xs text-gray-500">{rel.childSObject} via {rel.field}</p>
                                  </div>
                                  <button
                                    onClick={() => loadObjectFields(rel.childSObject)}
                                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                                    title="View child object"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 