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

interface SalesforceMetadataPanelProps {
  isVisible: boolean;
  onClose: () => void;
  onInsertMergeField: (mergeField: string) => void;
}

export function SalesforceMetadataPanel({ isVisible, onClose, onInsertMergeField }: SalesforceMetadataPanelProps) {
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

  const handleInsertMergeField = (fieldName: string, objectName: string) => {
    const mergeField = `{!${objectName}.${fieldName}}`;
    onInsertMergeField(mergeField);
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
    <div className="fixed inset-y-0 right-0 w-96 bg-white border-l border-gray-200 shadow-lg z-50 flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <h2 className="text-lg font-semibold text-gray-900">Merge Fields</h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Connection Status */}
      {!connection.connected ? (
        <div className="p-4 bg-yellow-50 border-b border-yellow-200">
          <div className="flex items-center gap-2 text-yellow-800">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-sm font-medium">Salesforce Not Connected</span>
          </div>
          <p className="text-sm text-yellow-700 mt-1">
            Connect to Salesforce from the navigation menu to view merge fields.
          </p>
        </div>
      ) : (
        <div className="p-4 bg-green-50 border-b border-green-200">
          <div className="flex items-center gap-2 text-green-800">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm font-medium">Connected to Salesforce</span>
          </div>
          <p className="text-sm text-green-700 mt-1">
            Select objects and fields to insert merge fields into your document.
          </p>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {connection.connected ? (
          <div className="h-full flex flex-col">
            {!selectedObject ? (
              /* Object List */
              <div className="flex-1 flex flex-col">
                <div className="p-4 border-b border-gray-200">
                  <input
                    type="text"
                    placeholder="Search objects..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar" style={{ maxHeight: 'calc(100vh - 300px)' }}>
                  {loading ? (
                    <div className="flex items-center justify-center p-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                  ) : error ? (
                    <div className="p-4 text-center text-red-600">
                      <p className="text-sm">{error}</p>
                    </div>
                  ) : (
                    <div className="p-2">
                      {filteredObjects.map((obj) => (
                        <button
                          key={obj.name}
                          onClick={() => loadObjectFields(obj.name)}
                          className="w-full text-left p-3 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-colors mb-2"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-medium text-gray-900">{obj.label}</h3>
                              <p className="text-sm text-gray-500">{obj.name}</p>
                            </div>
                            {obj.custom && (
                              <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                                Custom
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Field List */
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
                      className="p-1 text-gray-500 hover:text-gray-700"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <h3 className="font-medium text-gray-900">
                      {objects.find(obj => obj.name === selectedObject)?.label || selectedObject}
                    </h3>
                  </div>
                  
                  <input
                    type="text"
                    placeholder="Search fields..."
                    value={fieldSearchTerm}
                    onChange={(e) => setFieldSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar" style={{ maxHeight: 'calc(100vh - 300px)' }}>
                  {loading ? (
                    <div className="flex items-center justify-center p-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                  ) : (
                    <div className="p-2">
                      {filteredFields.map((field) => (
                        <button
                          key={field.name}
                          onClick={() => handleInsertMergeField(field.name, selectedObject!)}
                          className="w-full text-left p-3 rounded-lg hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-colors mb-2 group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-gray-900 truncate">{field.label}</h4>
                                {field.required && (
                                  <span className="text-xs bg-red-100 text-red-800 px-1 py-0.5 rounded">
                                    Required
                                  </span>
                                )}
                                {field.custom && (
                                  <span className="text-xs bg-purple-100 text-purple-800 px-1 py-0.5 rounded">
                                    Custom
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-500 truncate">{field.name}</p>
                              <p className="text-xs text-gray-400">{field.type}</p>
                            </div>
                            <div className="flex items-center text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                            </div>
                          </div>
                        </button>
                      ))}
                      
                      {/* Child Relationships */}
                      {childRelationships.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Related Objects</h4>
                          {childRelationships.map((rel) => (
                            <button
                              key={rel.relationshipName}
                              onClick={() => loadObjectFields(rel.childSObject)}
                              className="w-full text-left p-2 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-colors mb-1"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{rel.relationshipName}</p>
                                  <p className="text-xs text-gray-500">{rel.childSObject}</p>
                                </div>
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <p className="text-sm">Connect to Salesforce to view merge fields</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 