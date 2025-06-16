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
  FaChartLine
} from 'react-icons/fa';

interface TemplateConverterProps {
  documentId: string;
  documentData: any;
  isVisible: boolean;
  onClose: () => void;
  onInsertTemplate: (template: string) => void;
}

interface ConversionResult {
  template_text: string;
  document_type: string;
  mapped_fields: Record<string, any>;
  available_fields: Record<string, string>;
  extracted_data: Record<string, string>;
  ai_enhancement?: string;
  enhancement_applied?: boolean;
}

interface ComparisonResult {
  salesforce_conversion: ConversionResult;
  servicenow_conversion: ConversionResult;
  ai_recommendation: string;
  comparison_metrics: {
    salesforce_fields_mapped: number;
    servicenow_fields_mapped: number;
    salesforce_doc_type: string;
    servicenow_doc_type: string;
  };
}

export function TemplateConverter({ 
  documentId, 
  documentData, 
  isVisible, 
  onClose, 
  onInsertTemplate 
}: TemplateConverterProps) {
  const [activeStep, setActiveStep] = useState<'analyze' | 'convert' | 'preview'>('analyze');
  const [selectedPlatform, setSelectedPlatform] = useState<'salesforce' | 'servicenow' | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [conversion, setConversion] = useState<ConversionResult | null>(null);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [useAiEnhancement, setUseAiEnhancement] = useState(true);
  const [showFieldMapping, setShowFieldMapping] = useState(false);

  useEffect(() => {
    if (isVisible && documentId) {
      analyzeDocument();
    }
  }, [isVisible, documentId]);

  const analyzeDocument = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(`/api/v1/templates/analyze/${documentId}`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to analyze document');
      }
      
      const data = await response.json();
      setAnalysis(data.analysis);
      
      // Also get platform comparison
      await compareplatforms();
      
    } catch (err) {
      console.error('Error analyzing document:', err);
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const compareplatforms = async () => {
    try {
      const response = await fetch(`/api/v1/templates/compare/${documentId}`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const data = await response.json();
        setComparison(data.comparison);
      }
    } catch (err) {
      console.error('Error comparing platforms:', err);
    }
  };

  const convertToTemplate = async (platform: 'salesforce' | 'servicenow') => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(`/api/v1/templates/convert/${documentId}/${platform}?use_ai_enhancement=${useAiEnhancement}`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to convert to ${platform} template`);
      }
      
      const data = await response.json();
      setConversion(data.conversion);
      setSelectedPlatform(platform);
      setActiveStep('preview');
      
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
    if (!conversion) return;
    
    const blob = new Blob([conversion.template_text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${documentData?.filename || 'template'}_${selectedPlatform}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FaRocket className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-bold">AI Template Converter</h2>
              <p className="text-blue-100 text-sm">Convert your document to Salesforce or ServiceNow templates</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {/* Platform Selection */}
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Choose Integration Platform
              </h3>
              <p className="text-gray-600">
                Select the platform you want to convert your document to
              </p>
            </div>

            {/* AI Enhancement Toggle */}
            <div className="flex items-center justify-center gap-4 p-4 bg-gray-50 rounded-lg">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useAiEnhancement}
                  onChange={(e) => setUseAiEnhancement(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Use AI Enhancement
                </span>
              </label>
              <span className="text-xs text-gray-500">
                AI will optimize field mappings and remove redundant content
              </span>
            </div>

            {/* Platform Selection */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Salesforce */}
              <button
                onClick={() => convertToTemplate('salesforce')}
                disabled={loading}
                className="p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group text-left"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                    <FaSalesforce className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Salesforce</h4>
                    <p className="text-sm text-gray-600">CRM Platform</p>
                  </div>
                </div>
                <p className="text-sm text-gray-700 mb-3">
                  Convert to Salesforce template with CRM field mappings for quotes, proposals, contracts, and invoices.
                </p>
                <div className="text-xs text-gray-500">
                  Best for: Sales documents, customer communications, quotes
                </div>
                {comparison && (
                  <div className="mt-3 text-xs text-blue-600">
                    {comparison.comparison_metrics.salesforce_fields_mapped} fields available
                  </div>
                )}
              </button>

              {/* ServiceNow */}
              <button
                onClick={() => convertToTemplate('servicenow')}
                disabled={loading}
                className="p-6 border-2 border-gray-200 rounded-xl hover:border-red-500 hover:bg-red-50 transition-all group text-left"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center group-hover:bg-red-200 transition-colors">
                    <div className="w-6 h-6 bg-red-600 rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">SN</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">ServiceNow</h4>
                    <p className="text-sm text-gray-600">ITSM Platform</p>
                  </div>
                </div>
                <p className="text-sm text-gray-700 mb-3">
                  Convert to ServiceNow template with ITSM field mappings for incidents, changes, problems, and requests.
                </p>
                <div className="text-xs text-gray-500">
                  Best for: IT documents, service requests, incident reports
                </div>
                {comparison && (
                  <div className="mt-3 text-xs text-red-600">
                    {comparison.comparison_metrics.servicenow_fields_mapped} fields available
                  </div>
                )}
              </button>
            </div>

            {loading && (
              <div className="flex items-center justify-center py-6">
                <FaSpinner className="w-6 h-6 animate-spin text-blue-600 mr-3" />
                <span className="text-gray-600">
                  {analysis ? 'Converting to template...' : 'Analyzing document...'}
                </span>
              </div>
            )}

            {/* Template Preview */}
            {conversion && (
              <div className="bg-gray-50 rounded-lg p-6 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-gray-900">
                    {selectedPlatform === 'salesforce' ? 'Salesforce' : 'ServiceNow'} Template
                  </h4>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyToClipboard(conversion.template_text)}
                      className="px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                    >
                      <FaCopy className="w-3 h-3 mr-1" />
                      Copy
                    </button>
                    <button
                      onClick={downloadTemplate}
                      className="px-3 py-2 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                    >
                      <FaDownload className="w-3 h-3 mr-1" />
                      Download
                    </button>
                  </div>
                </div>

                {/* Template Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-blue-50 p-3 rounded-lg text-center">
                    <div className="text-lg font-bold text-blue-600">
                      {conversion.document_type}
                    </div>
                    <div className="text-xs text-gray-600">Document Type</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg text-center">
                    <div className="text-lg font-bold text-green-600">
                      {Object.keys(conversion.mapped_fields).length}
                    </div>
                    <div className="text-xs text-gray-600">Fields Mapped</div>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg text-center">
                    <div className="text-lg font-bold text-purple-600">
                      {Object.keys(conversion.available_fields).length}
                    </div>
                    <div className="text-xs text-gray-600">Available Fields</div>
                  </div>
                  <div className="bg-yellow-50 p-3 rounded-lg text-center">
                    <div className="text-lg font-bold text-yellow-600">
                      {conversion.enhancement_applied ? 'Yes' : 'No'}
                    </div>
                    <div className="text-xs text-gray-600">AI Enhanced</div>
                  </div>
                </div>

                {/* Template Content */}
                <div className="bg-white border rounded-lg p-4 font-mono text-sm whitespace-pre-wrap max-h-64 overflow-y-auto mb-4">
                  {conversion.template_text}
                </div>

                {/* Actions */}
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => {
                      setConversion(null);
                      setSelectedPlatform(null);
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Convert Another
                  </button>
                  <button
                    onClick={() => {
                      onInsertTemplate(conversion.template_text);
                      onClose();
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <FaEdit className="w-4 h-4" />
                    Insert Template
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 