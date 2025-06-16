'use client';

import { useState, useEffect } from 'react';
import { CheckIcon, XMarkIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';

interface Suggestion {
  id: string;
  text: string;
  description: string;
  type: 'insert' | 'replace' | 'delete';
  position: { x: number; y: number };
  originalText?: string;
  confidence?: number;
}

interface SuggestionOverlayProps {
  suggestions: Suggestion[];
  onAccept: (suggestion: Suggestion) => void;
  onReject: (suggestionId: string) => void;
  onInsert: (text: string) => void;
}

export function SuggestionOverlay({ suggestions, onAccept, onReject, onInsert }: SuggestionOverlayProps) {
  const [activeSuggestion, setActiveSuggestion] = useState<string | null>(null);

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'insert': return '✨';
      case 'replace': return '🔄';
      case 'delete': return '🗑️';
      default: return '💡';
    }
  };

  const getSuggestionColor = (type: string) => {
    switch (type) {
      case 'insert': return 'border-green-400 bg-green-50';
      case 'replace': return 'border-blue-400 bg-blue-50';
      case 'delete': return 'border-red-400 bg-red-50';
      default: return 'border-purple-400 bg-purple-50';
    }
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      {suggestions.map((suggestion) => (
        <div
          key={suggestion.id}
          className="pointer-events-auto absolute"
          style={{
            left: suggestion.position.x,
            top: suggestion.position.y,
            transform: 'translate(-50%, -100%)'
          }}
        >
          {/* Suggestion Card */}
          <div 
            className={`
              relative bg-white rounded-lg shadow-lg border-2 p-3 max-w-sm suggestion-overlay
              ${getSuggestionColor(suggestion.type)}
              ${activeSuggestion === suggestion.id ? 'ring-2 ring-blue-500' : ''}
              transition-all duration-200 hover:shadow-xl
            `}
            onMouseEnter={() => setActiveSuggestion(suggestion.id)}
            onMouseLeave={() => setActiveSuggestion(null)}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{getSuggestionIcon(suggestion.type)}</span>
                <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                  {suggestion.type}
                </span>
              </div>
              {suggestion.confidence && (
                <div className="text-xs text-gray-500">
                  {Math.round(suggestion.confidence * 100)}%
                </div>
              )}
            </div>

            {/* Description */}
            <p className="text-sm text-gray-700 mb-3">{suggestion.description}</p>

            {/* Text Preview */}
            <div className="mb-3">
              {suggestion.originalText && suggestion.type === 'replace' && (
                <div className="mb-2">
                  <div className="text-xs text-red-600 mb-1">Original:</div>
                  <div className="text-sm bg-red-100 p-2 rounded line-through">
                    {suggestion.originalText}
                  </div>
                </div>
              )}
              <div className="text-xs text-green-600 mb-1">
                {suggestion.type === 'insert' ? 'Insert:' : 'Replace with:'}
              </div>
              <div className="text-sm bg-green-100 p-2 rounded font-medium">
                {suggestion.text}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => onAccept(suggestion)}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
              >
                <CheckIcon className="w-4 h-4" />
                Accept
              </button>
              <button
                onClick={() => onReject(suggestion.id)}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
              >
                <XMarkIcon className="w-4 h-4" />
                Reject
              </button>
              <button
                onClick={() => onInsert(suggestion.text)}
                className="px-2 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                title="Copy to clipboard"
              >
                <ClipboardDocumentIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Arrow pointing to suggestion location */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2">
              <div className={`w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent ${
                suggestion.type === 'insert' ? 'border-t-green-400' :
                suggestion.type === 'replace' ? 'border-t-blue-400' :
                suggestion.type === 'delete' ? 'border-t-red-400' : 'border-t-purple-400'
              }`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
} 