'use client';

import React, { useState, useEffect } from 'react';
import { 
  FaRocket, 
  FaSalesforce, 
  FaExchangeAlt, 
  FaDownload, 
  FaCopy, 
  FaSpinner,
  FaCheck,
  FaCode,
  FaEye,
  FaEdit,
  FaTimes,
  FaLightbulb,
  FaChartLine,
  FaSave,
  FaFileAlt,
  FaTools,
  FaBrain
} from 'react-icons/fa';

interface TemplateConverterProps {
  documentId: string;
  documentData: any;
  isVisible: boolean;
  onClose: () => void;
  onInsertTemplate: (template: string) => void;
}

interface DocumentAnalysis {
  document_type: string;
  confidence: string;
  primary_salesforce_object: string;
  suggested_merge_fields: Array<{
    field_name: string;
    display_name: string;
    salesforce_object: string;
    sample_value: string;
    merge_syntax: string;
  }>;
  identified_clauses: Array<{
    title: string;
    content: string;
    type: string;
    position: number;
    is_mandatory: boolean;
    confidence: string;
  }>;
  document_structure: {
    has_header: boolean;
    has_footer: boolean;
    sections: string[];
    total_paragraphs: number;
    estimated_merge_points: number;
  };
  recommendations: string[];
  document_metadata?: any;
}

interface TemplateConversion {
  template_content: string;
  merge_fields_used: Array<{
    merge_field: string;
    original_value: string;
    field_type: string;
    description: string;
  }>;
  template_metadata: {
    total_merge_fields: number;
    primary_object: string;
    related_objects: string[];
    template_complexity: string;
  };
  conversion_notes: string[];
}

interface SavedTemplate {
  success: boolean;
  template_id: string;
  template_name: string;
  conversion_result: TemplateConversion;
  clauses_created: number;
}

export function TemplateConverter({ 
  documentId, 
  documentData, 
  isVisible, 
  onClose, 
  onInsertTemplate 
}: TemplateConverterProps) {
  const [activeStep, setActiveStep] = useState<'analyze' | 'convert' | 'save' | 'complete'>('analyze');
  const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null);
  const [conversion, setConversion] = useState<TemplateConversion | null>(null);
  const [savedTemplate, setSavedTemplate] = useState<SavedTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  
  // Form data for template saving
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [salesforceObject, setSalesforceObject] = useState('');

  useEffect(() => {
    if (isVisible && documentId) {
      resetState();
      analyzeDocument();
    }
  }, [isVisible, documentId]);

  const resetState = () => {
    setActiveStep('analyze');
    setAnalysis(null);
    setConversion(null);
    setSavedTemplate(null);
    setError('');
    setTemplateName('');
    setTemplateDescription('');
    setSalesforceObject('');
  };

  const analyzeDocument = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(`/api/templates/analyze/${documentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to analyze document');
      }
      
      const analysisData = await response.json();
      setAnalysis(analysisData);
      
      // Pre-fill form with analysis results
      if (analysisData.document_type) {
        setTemplateName(`${analysisData.document_type} Template - ${documentData?.filename || 'Document'}`);
      }
      if (analysisData.primary_salesforce_object) {
        setSalesforceObject(analysisData.primary_salesforce_object);
      }
      
      setActiveStep('convert');
      
    } catch (err) {
      console.error('Error analyzing document:', err);
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const convertToTemplate = async () => {
    if (!analysis) {
      setError('No analysis data available');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const conversionRequest = {
        document_id: documentId,
        analysis_results: analysis,
        template_name: templateName,
        description: templateDescription,
        salesforce_object: salesforceObject
      };
      
      const response = await fetch('/api/templates/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(conversionRequest),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to convert to template');
      }
      
      const conversionData = await response.json();
      setConversion(conversionData.conversion_result);
      setSavedTemplate(conversionData);
      setActiveStep('complete');
      
    } catch (err) {
      console.error('Error converting template:', err);
      setError(err instanceof Error ? err.message : 'Conversion failed');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Show success notification
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      notification.textContent = 'Template copied to clipboard!';
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 3000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const downloadTemplate = () => {
    if (!conversion?.template_content || !templateName) return;
    
    const blob = new Blob([conversion.template_content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${templateName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateDocument = async () => {
    if (!savedTemplate?.template_id) {
      setError('No template ID available for document generation');
      return;
    }
    
    try {
      setLoading(true);
      
      // Example merge data - in a real app, this would come from a form or Salesforce
      const sampleMergeData = {
        Account: {
          Name: 'Sample Company Inc.',
          BillingAddress: '123 Main St, City, State 12345',
        },
        Contact: {
          FirstName: 'John',
          LastName: 'Doe',
          Email: 'john.doe@example.com',
        },
        // Add more sample data based on the merge fields
      };
      
      const response = await fetch(`/api/templates/${savedTemplate.template_id}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template_id: savedTemplate.template_id,
          merge_data: sampleMergeData,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate document');
      }
      
      const generatedDoc = await response.json();
      
      // Download the generated document
      const blob = new Blob([generatedDoc.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `generated_${templateName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error('Error generating document:', err);
      setError(err instanceof Error ? err.message : 'Document generation failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-700 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FaBrain className="w-7 h-7" />
            <div>
              <h2 className="text-xl font-bold">AI Template Converter</h2>
              <p className="text-blue-100 text-sm">Powered by Gemini AI • Convert documents to Salesforce templates</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="bg-gray-50 border-b px-6 py-4">
          <div className="flex items-center justify-center space-x-8">
            {[
              { key: 'analyze', label: 'AI Analysis', icon: FaChartLine },
              { key: 'convert', label: 'Template Setup', icon: FaTools },
              { key: 'complete', label: 'Complete', icon: FaCheck },
            ].map(({ key, label, icon: Icon }, index) => (
              <div key={key} className="flex items-center">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  activeStep === key 
                    ? 'bg-blue-100 text-blue-700' 
                    : index < ['analyze', 'convert', 'complete'].indexOf(activeStep)
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{label}</span>
                </div>
                {index < 2 && (
                  <div className="w-8 h-px bg-gray-300 mx-2" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 flex items-center gap-2">
                <FaTimes className="w-4 h-4" />
                {error}
              </p>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-12">
              <FaSpinner className="w-8 h-8 animate-spin text-blue-600 mr-4" />
              <div className="text-center">
                <p className="text-lg font-medium text-gray-900">
                  {activeStep === 'analyze' && 'Analyzing document with AI...'}
                  {activeStep === 'convert' && 'Converting to template...'}
                  {activeStep === 'complete' && 'Processing...'}
                </p>
                <p className="text-sm text-gray-600">This may take a few moments</p>
              </div>
            </div>
          )}

          {/* Step: Analysis Results */}
          {activeStep === 'convert' && analysis && !loading && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <FaCheck className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Document Analysis Complete</h3>
                </div>
                
                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <h4 className="font-medium text-gray-900 mb-2">Document Type</h4>
                    <p className="text-lg font-bold text-blue-600">{analysis?.document_type || 'Unknown'}</p>
                    <p className="text-sm text-gray-600">Confidence: {analysis?.confidence || 'N/A'}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <h4 className="font-medium text-gray-900 mb-2">Merge Fields</h4>
                    <p className="text-lg font-bold text-green-600">{analysis?.suggested_merge_fields?.length || 0}</p>
                    <p className="text-sm text-gray-600">Fields identified</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <h4 className="font-medium text-gray-900 mb-2">Clauses Found</h4>
                    <p className="text-lg font-bold text-purple-600">{analysis?.identified_clauses?.length || 0}</p>
                    <p className="text-sm text-gray-600">Legal clauses</p>
                  </div>
                </div>

                {analysis?.recommendations && analysis.recommendations.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <FaLightbulb className="w-4 h-4 text-yellow-600" />
                      AI Recommendations
                    </h4>
                    <ul className="list-disc list-inside space-y-1">
                      {analysis.recommendations.map((rec, index) => (
                        <li key={index} className="text-sm text-gray-700">{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Template Configuration Form */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Template Configuration</h3>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Template Name *
                    </label>
                    <input
                      type="text"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter template name..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Salesforce Object *
                    </label>
                    <select
                      value={salesforceObject}
                      onChange={(e) => setSalesforceObject(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select object...</option>
                      <option value="Account">Account</option>
                      <option value="Contact">Contact</option>
                      <option value="Opportunity">Opportunity</option>
                      <option value="Lead">Lead</option>
                      <option value="Case">Case</option>
                      <option value="Contract">Contract</option>
                      <option value="Quote">Quote</option>
                      <option value="Product2">Product</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Optional description for this template..."
                  />
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={convertToTemplate}
                    disabled={!templateName || !salesforceObject || loading}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    <FaRocket className="w-4 h-4" />
                    Convert to Template
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step: Template Complete */}
          {activeStep === 'complete' && conversion && savedTemplate && !loading && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <FaCheck className="w-6 h-6 text-green-600" />
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">Template Created Successfully!</h3>
                    <p className="text-green-700">Your AI-powered template is ready to use</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600">{conversion?.template_metadata?.total_merge_fields || 0}</div>
                    <div className="text-sm text-gray-600">Merge Fields</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">{savedTemplate?.clauses_created || 0}</div>
                    <div className="text-sm text-gray-600">Clauses Created</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-purple-600">{conversion?.template_metadata?.template_complexity || 'N/A'}</div>
                    <div className="text-sm text-gray-600">Complexity</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-orange-600">{conversion?.template_metadata?.related_objects?.length || 0}</div>
                    <div className="text-sm text-gray-600">SF Objects</div>
                  </div>
                </div>
              </div>

              {/* Template Preview */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-900">Template Preview</h4>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => conversion?.template_content && copyToClipboard(conversion.template_content)}
                      disabled={!conversion?.template_content}
                      className="px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                    >
                      <FaCopy className="w-3 h-3" />
                      Copy
                    </button>
                    <button
                      onClick={downloadTemplate}
                      disabled={!conversion?.template_content || !savedTemplate?.template_name}
                      className="px-3 py-2 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                    >
                      <FaDownload className="w-3 h-3" />
                      Download
                    </button>
                  </div>
                </div>

                <div className="bg-gray-50 border rounded-lg p-4 font-mono text-sm whitespace-pre-wrap max-h-64 overflow-y-auto mb-4">
                  {conversion?.template_content || 'No content available'}
                </div>

                {/* Merge Fields Used */}
                {conversion?.merge_fields_used && conversion.merge_fields_used.length > 0 && (
                  <div className="mt-4">
                    <h5 className="font-medium text-gray-900 mb-2">Merge Fields Used:</h5>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {conversion.merge_fields_used.map((field, index) => (
                        <div key={index} className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">
                          {field?.merge_field || 'Unknown field'}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => {
                    if (conversion?.template_content) {
                      onInsertTemplate(conversion.template_content);
                      onClose();
                    }
                  }}
                  disabled={!conversion?.template_content}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  <FaEdit className="w-4 h-4" />
                  Insert Template
                </button>
                <button
                  onClick={generateDocument}
                  disabled={loading || !savedTemplate?.template_id}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors flex items-center gap-2"
                >
                  <FaFileAlt className="w-4 h-4" />
                  Generate Sample Document
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 