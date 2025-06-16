'use client';

import { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  ChevronUpIcon, 
  ChevronDownIcon,
  ClipboardDocumentIcon,
  PaperAirplaneIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

interface ChatContent {
  id: string;
  text: string;
  type: 'response' | 'suggestion' | 'correction';
  timestamp: Date;
  preview: string;
}

interface FloatingInsertToolbarProps {
  chatContent: ChatContent[];
  onInsert: (text: string) => void;
  onRequestSuggestion: () => void;
  isVisible: boolean;
  position: { x: number; y: number };
}

export function FloatingInsertToolbar({ 
  chatContent, 
  onInsert, 
  onRequestSuggestion, 
  isVisible, 
  position 
}: FloatingInsertToolbarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedContent, setSelectedContent] = useState<string | null>(null);

  useEffect(() => {
    if (!isVisible) {
      setIsExpanded(false);
      setSelectedContent(null);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div
      className="fixed z-40 bg-white rounded-lg shadow-xl border border-gray-200 min-w-80 floating-toolbar-enter"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -100%)'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <SparklesIcon className="w-5 h-5 text-blue-600" />
          <span className="font-medium text-gray-900">AI Content</span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={onRequestSuggestion}
            className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Get AI suggestions for this location"
          >
            <PaperAirplaneIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
          >
            {isExpanded ? (
              <ChevronUpIcon className="w-4 h-4" />
            ) : (
              <ChevronDownIcon className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Quick Insert Section */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Recent AI Content</span>
          <span className="text-xs text-gray-500">{chatContent.length} items</span>
        </div>
        
        {chatContent.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            <SparklesIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No AI content available</p>
            <p className="text-xs">Chat with AI to generate insertable content</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {chatContent.slice(0, 3).map((content) => (
              <div
                key={content.id}
                className={`
                  p-2 rounded border cursor-pointer transition-all
                  ${selectedContent === content.id 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }
                `}
                onClick={() => setSelectedContent(content.id)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    content.type === 'suggestion' ? 'bg-green-100 text-green-800' :
                    content.type === 'correction' ? 'bg-blue-100 text-blue-800' :
                    'bg-purple-100 text-purple-800'
                  }`}>
                    {content.type}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onInsert(content.text);
                    }}
                    className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-100 rounded transition-colors"
                    title="Insert this content"
                  >
                    <PlusIcon className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-sm text-gray-700 line-clamp-2">{content.preview}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {content.timestamp.toLocaleTimeString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && chatContent.length > 0 && (
        <div className="border-t border-gray-200 p-3 max-h-64 overflow-y-auto">
          <div className="space-y-3">
            {chatContent.map((content) => (
              <div
                key={content.id}
                className="border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    content.type === 'suggestion' ? 'bg-green-100 text-green-800' :
                    content.type === 'correction' ? 'bg-blue-100 text-blue-800' :
                    'bg-purple-100 text-purple-800'
                  }`}>
                    {content.type}
                  </span>
                  <span className="text-xs text-gray-500">
                    {content.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mb-3">{content.text}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => onInsert(content.text)}
                    className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                  >
                    <PlusIcon className="w-3 h-3" />
                    Insert
                  </button>
                  <button
                    onClick={() => navigator.clipboard.writeText(content.text)}
                    className="flex items-center gap-1 px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-colors"
                  >
                    <ClipboardDocumentIcon className="w-3 h-3" />
                    Copy
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Arrow pointing to cursor position */}
      <div className="absolute top-full left-1/2 transform -translate-x-1/2">
        <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white" />
        <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-200 -mt-1" />
      </div>
    </div>
  );
} 