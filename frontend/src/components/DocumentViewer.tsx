'use client';

import { useState, useEffect } from 'react';
import { AIAssistantPanel } from './AIAssistantPanel';
import { SuggestionOverlay } from './SuggestionOverlay';
import { FloatingInsertToolbar } from './FloatingInsertToolbar';
import { TopHeader } from './TopHeader';
import { SalesforceMetadataPanel } from './SalesforceMetadataPanel';

interface DocumentData {
  id: string;
  filename: string;
  filetype: string;
  filesize: number;
  uploaded_at: string;
  google_drive_id?: string;
}

interface DocumentViewerProps {
  documentId: string;
}

interface Suggestion {
  id: string;
  text: string;
  description: string;
  type: 'insert' | 'replace' | 'delete';
  position: { x: number; y: number };
  originalText?: string;
  confidence?: number;
}

interface ChatContent {
  id: string;
  text: string;
  type: 'response' | 'suggestion' | 'correction';
  timestamp: Date;
  preview: string;
}

export function DocumentViewer({ documentId }: DocumentViewerProps) {
  const [documentData, setDocumentData] = useState<DocumentData | null>(null);
  const [documentText, setDocumentText] = useState<string>('');
  const [textLoading, setTextLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [embedUrl, setEmbedUrl] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [panelWidth, setPanelWidth] = useState(400);
  const [isDragging, setIsDragging] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Salesforce merge fields panel state
  const [showMergeFieldsPanel, setShowMergeFieldsPanel] = useState(false);

  // Cursor-style UI state
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [chatContent, setChatContent] = useState<ChatContent[]>([]);
  const [showFloatingToolbar, setShowFloatingToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    fetchDocument();
  }, [documentId]);



  // Handle document clicks to show/hide floating toolbar
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Check if click is inside the iframe (Google Docs)
      const iframe = document.querySelector('iframe');
      if (iframe && iframe.contains(target)) {
        setCursorPosition({ x: e.clientX, y: e.clientY });
        setToolbarPosition({ x: e.clientX, y: e.clientY - 10 });
        setShowFloatingToolbar(true);
      } else if (!target.closest('.floating-toolbar') && !target.closest('.ai-panel')) {
        setShowFloatingToolbar(false);
      }
    };

    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, []);

  const fetchDocument = async () => {
    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (response.ok) {
        const doc = await response.json();
        console.log('📄 Document data received:', doc);
        console.log('🔗 Google Drive ID:', doc.google_drive_id);
        setDocumentData(doc);
        
        if (doc.google_drive_id) {
          setEmbedUrl(`https://docs.google.com/document/d/${doc.google_drive_id}/edit?embedded=true`);
        } else {
          setError('Document not available in Google Docs format');
        }
        
        fetchDocumentText();
      } else {
        setError('Failed to load document');
      }
    } catch (error) {
      console.error('Error fetching document:', error);
      setError('Error loading document');
    } finally {
      setLoading(false);
    }
  };

  const fetchDocumentText = async () => {
    try {
      setTextLoading(true);
      console.log('📝 Fetching document text for AI analysis...');
      
      const response = await fetch(`/api/documents/${documentId}/text`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (response.ok) {
        const textData = await response.json();
        console.log('✅ Document text loaded:', textData.word_count, 'words');
        setDocumentText(textData.text_content || '');
      } else {
        console.warn('⚠️ Could not load document text for AI analysis');
        setDocumentText('');
      }
    } catch (error) {
      console.error('❌ Error fetching document text:', error);
      setDocumentText('');
    } finally {
      setTextLoading(false);
    }
  };

  const downloadDocument = async (format: string) => {
    try {
      const response = await fetch(`/api/v1/documents/${documentId}/download?format=${format}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const anchor = window.document.createElement('a');
        anchor.href = url;
        anchor.download = `${documentData?.filename}.${format}`;
        anchor.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error downloading document:', error);
    }
  };

  const insertTextIntoDocument = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      
      // Create a more sophisticated notification
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-all duration-300';
      notification.innerHTML = `
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          <span>Text copied! Paste into your document</span>
        </div>
      `;
      
      document.body.appendChild(notification);
      setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
      }, 3000);
    } catch (error) {
      console.error('Error inserting text:', error);
      alert(`Please copy this text into your document:\n\n"${text}"`);
    }
  };

  const handleSuggestionAccept = async (suggestion: Suggestion) => {
    try {
      await insertTextIntoDocument(suggestion.text);
      setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
      
      // Add to chat content for future reference
      const chatItem: ChatContent = {
        id: Date.now().toString(),
        text: suggestion.text,
        type: 'suggestion',
        timestamp: new Date(),
        preview: suggestion.description
      };
      setChatContent(prev => [chatItem, ...prev].slice(0, 20)); // Keep last 20 items
    } catch (error) {
      console.error('Error accepting suggestion:', error);
    }
  };

  const handleSuggestionReject = (suggestionId: string) => {
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
  };

  const handleRequestSuggestion = async () => {
    // This would integrate with the AI service to get suggestions for the current cursor position
    console.log('Requesting AI suggestions for cursor position:', cursorPosition);
    
    // Mock suggestion for demonstration
    const mockSuggestion: Suggestion = {
      id: Date.now().toString(),
      text: 'Consider adding more detail here to strengthen your argument.',
      description: 'Content enhancement suggestion',
      type: 'insert',
      position: { x: cursorPosition.x, y: cursorPosition.y - 50 },
      confidence: 0.85
    };
    
    setSuggestions(prev => [...prev, mockSuggestion]);
    setShowFloatingToolbar(false);
  };

  const handleAIResponse = (response: any) => {
    // Convert AI suggestions to cursor-style suggestions
    if (response.suggestions && response.suggestions.length > 0) {
      const newSuggestions: Suggestion[] = response.suggestions.map((s: any, index: number) => ({
        id: `ai-${Date.now()}-${index}`,
        text: s.text,
        description: s.description,
        type: s.type,
        position: { 
          x: 600 + (index * 50), // Spread suggestions across the document
          y: 200 + (index * 30) 
        },
        confidence: 0.8
      }));
      
      setSuggestions(prev => [...prev, ...newSuggestions]);
    }

    // Add response to chat content
    const chatItem: ChatContent = {
      id: Date.now().toString(),
      text: response.response,
      type: 'response',
      timestamp: new Date(),
      preview: response.response.substring(0, 100) + (response.response.length > 100 ? '...' : '')
    };
    setChatContent(prev => [chatItem, ...prev].slice(0, 20));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const newWidth = window.innerWidth - e.clientX;
    const minWidth = 300;
    const maxWidth = window.innerWidth * 0.6;
    
    setPanelWidth(Math.max(minWidth, Math.min(maxWidth, newWidth)));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };



  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2">Loading document...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-red-800 font-semibold">Error</h3>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full relative flex-col">
      {/* Top Header */}
      <TopHeader 
        documentData={documentData} 
        onShowMergeFields={() => setShowMergeFieldsPanel(true)}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 h-full min-h-0">
        {/* Google Docs Editor */}
        <div className="flex-1 min-w-0 relative">
          {embedUrl && (
            <iframe
              src={embedUrl}
              className="w-full h-full border-0"
              title="Google Docs Editor"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation"
            />
          )}
        </div>

        {/* Resizable Divider */}
        {!isCollapsed && (
          <div
            className={`w-1 bg-gray-300 hover:bg-blue-500 cursor-col-resize transition-colors ${
              isDragging ? 'bg-blue-500' : ''
            }`}
            onMouseDown={handleMouseDown}
          />
        )}

        {/* AI Assistant Panel */}
        <div 
          className={`bg-white border-l border-gray-200 flex flex-col ai-panel transition-all duration-300 h-full ${
            isCollapsed ? 'w-12' : ''
          }`}
          style={{ width: isCollapsed ? 48 : panelWidth }}
        >
          {isCollapsed ? (
            // Collapsed state - minimal sidebar
            <div className="h-full flex flex-col items-center py-4 space-y-4">
              <button
                onClick={toggleCollapse}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors group"
                title="Expand AI Assistant"
              >
                <svg className="w-5 h-5 transform group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
              
              {/* AI Status Indicator */}
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" title="AI Ready"></div>
              
              {/* Suggestion Count */}
              {suggestions.length > 0 && (
                <div className="relative">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-blue-600">{suggestions.length}</span>
                  </div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                </div>
              )}
              
              {/* Chat Content Count */}
              {chatContent.length > 0 && (
                <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-purple-600">{chatContent.length}</span>
                </div>
              )}
            </div>
          ) : (
            // Expanded state - full panel
            <AIAssistantPanel 
              documentId={documentId} 
              documentData={documentData}
              documentText={documentText}
              textLoading={textLoading}
              onDownloadDocument={downloadDocument}
              onInsertText={insertTextIntoDocument}
              onAIResponse={handleAIResponse}
              onToggleCollapse={toggleCollapse}
              isCollapsed={isCollapsed}
            />
          )}
        </div>
      </div>

      {/* Suggestion Overlays */}
      <SuggestionOverlay
        suggestions={suggestions}
        onAccept={handleSuggestionAccept}
        onReject={handleSuggestionReject}
        onInsert={insertTextIntoDocument}
      />

      {/* Floating Insert Toolbar */}
      <div className="floating-toolbar">
        <FloatingInsertToolbar
          chatContent={chatContent}
          onInsert={insertTextIntoDocument}
          onRequestSuggestion={handleRequestSuggestion}
          isVisible={showFloatingToolbar}
          position={toolbarPosition}
        />
      </div>

      {/* Salesforce Merge Fields Panel */}
      <SalesforceMetadataPanel
        isVisible={showMergeFieldsPanel}
        onClose={() => setShowMergeFieldsPanel(false)}
        onInsertMergeField={insertTextIntoDocument}
      />
    </div>
  );
} 