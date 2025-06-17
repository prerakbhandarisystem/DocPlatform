'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  ChatBubbleLeftRightIcon,
  QuestionMarkCircleIcon,
  SparklesIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  LanguageIcon,
  ClipboardDocumentIcon,
  BookmarkIcon,
  ClockIcon,
  UserGroupIcon,
  PaperAirplaneIcon,
  MicrophoneIcon,
  StopIcon,
  PlayIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  CogIcon,
  XMarkIcon,
  RocketLaunchIcon
} from '@heroicons/react/24/outline';
import { TemplateConverter } from './TemplateConverter';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type?: AIFeature;
  suggestions?: Array<{
    description: string;
    text: string;
    type: 'insert' | 'replace';
  }>;
  corrections?: Array<{
    original: string;
    corrected: string;
    reason: string;
    type: 'replace';
  }>;
}

interface DocumentData {
  id: string;
  filename: string;
  filetype: string;
  filesize: number;
  uploaded_at: string;
  google_drive_id?: string;
}

interface AIAssistantPanelProps {
  documentId: string;
  documentData: DocumentData | null;
  documentText: string;
  textLoading: boolean;
  onDownloadDocument: (format: string) => void;
  onInsertText: (text: string) => Promise<void>;
  onAIResponse?: (response: any) => void;
  onToggleCollapse?: () => void;
  isCollapsed?: boolean;
}

type AIFeature = 
  | 'chat'
  | 'questions'
  | 'suggestions'
  | 'summary'
  | 'grammar'
  | 'translation'
  | 'templates'
  | 'formatting'
  | 'expansion'
  | 'tone'
  | 'collaboration';

export function AIAssistantPanel({ documentId, documentData, documentText, textLoading, onDownloadDocument, onInsertText, onAIResponse, onToggleCollapse }: AIAssistantPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeFeature, setActiveFeature] = useState<AIFeature>('chat');
  const [savedResponses, setSavedResponses] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [showTemplateConverter, setShowTemplateConverter] = useState(false);
  const [toneSettings, setToneSettings] = useState({
    formality: 'neutral',
    emotion: 'neutral',
    clarity: 'clear'
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const aiFeatures = [
    { id: 'chat', name: 'Chat', icon: ChatBubbleLeftRightIcon, description: 'General AI conversation' },
    { id: 'questions', name: 'Q&A', icon: QuestionMarkCircleIcon, description: 'Ask about document' },
    { id: 'suggestions', name: 'Suggestions', icon: SparklesIcon, description: 'Content improvements' },
    { id: 'summary', name: 'Summary', icon: DocumentTextIcon, description: 'Summarize sections' },
    { id: 'grammar', name: 'Grammar', icon: CheckCircleIcon, description: 'Grammar & style check' },
    { id: 'translation', name: 'Translation', icon: LanguageIcon, description: 'Translate content' },
    { id: 'templates', name: 'Templates', icon: RocketLaunchIcon, description: 'Convert to SF/SN templates' },
    { id: 'collaboration', name: 'Notes', icon: UserGroupIcon, description: 'Collaboration notes' }
  ];

  const quickActions = [
    { action: 'summarize', label: 'Summarize Document', prompt: 'Please provide a comprehensive summary of this document.' },
    { action: 'improve', label: 'Improve Writing', prompt: 'Please suggest improvements for the writing style and clarity.' },
    { action: 'expand', label: 'Expand Content', prompt: 'Please suggest ways to expand and elaborate on the main points.' },
    { action: 'outline', label: 'Create Outline', prompt: 'Please create a detailed outline of this document.' },
    { action: 'proofread', label: 'Proofread', prompt: 'Please proofread this document for grammar and spelling errors.' }
  ];

  const sendMessage = async (content: string, type: AIFeature = 'chat') => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
      type
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content,
          documentId: documentId,
          documentText: documentText,
          selected_text: selectedText,
          feature: type,
          context: {
            documentData: documentData,
            toneSettings: toneSettings
          }
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🤖 AI Response:', data);
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
          type,
          suggestions: data.suggestions || [],
          corrections: data.corrections || []
        };
        
        setMessages(prev => [...prev, assistantMessage]);
        
        // Notify parent component about the AI response
        if (onAIResponse) {
          onAIResponse(data);
        }
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
        type
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };

  const handleQuickAction = (action: string, prompt: string) => {
    sendMessage(prompt, activeFeature);
  };

  const saveResponse = (message: Message) => {
    setSavedResponses(prev => [...prev, message]);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputText, activeFeature);
    }
  };

  const startVoiceInput = () => {
    // Voice input implementation would go here
    setIsListening(true);
    // Placeholder for speech recognition
    setTimeout(() => setIsListening(false), 3000);
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <SparklesIcon className="w-5 h-5" />
            AI Assistant
          </h2>
          <div className="flex gap-1">
            <button
              onClick={clearChat}
              className="p-1 hover:bg-white/20 rounded"
              title="Clear Chat"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
            <button className="p-1 hover:bg-white/20 rounded" title="Settings">
              <CogIcon className="w-4 h-4" />
            </button>
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="p-1 hover:bg-white/20 rounded"
                title="Collapse Panel"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7M19 19l-7-7 7-7" />
                </svg>
              </button>
            )}
          </div>
        </div>
        <div className="text-sm space-y-1">
          <p className="opacity-90">
            {documentData?.filename || 'Document Assistant'}
          </p>
          {/* Document Text Status */}
          <div className="flex items-center gap-2 text-xs">
            {textLoading ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border border-white/30 border-t-white"></div>
                <span className="opacity-75">Analyzing document...</span>
              </>
            ) : documentText ? (
              <>
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="opacity-75">Document content loaded ({Math.round(documentText.length / 1000)}k chars)</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                <span className="opacity-75">No document content available</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Feature Tabs */}
      <div className="border-b border-gray-200 bg-gray-50">
        <div className="flex overflow-x-auto scrollbar-hide">
          {aiFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <button
                key={feature.id}
                onClick={() => setActiveFeature(feature.id as AIFeature)}
                className={`flex-shrink-0 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                  activeFeature === feature.id
                    ? 'border-blue-500 text-blue-600 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-white/50'
                }`}
                title={feature.description}
              >
                <Icon className="w-4 h-4 mx-auto mb-1" />
                {feature.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-3 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-wrap gap-1">
          {quickActions.map((action) => (
            <button
              key={action.action}
              onClick={() => handleQuickAction(action.action, action.prompt)}
              className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Selected Text Display */}
      {selectedText && (
        <div className="p-3 bg-yellow-50 border-b border-yellow-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-yellow-800">Selected Text:</span>
            <button
              onClick={() => setSelectedText('')}
              className="text-yellow-600 hover:text-yellow-800"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-yellow-700 bg-white p-2 rounded border">
            {selectedText}
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 custom-scrollbar" style={{ maxHeight: 'calc(100vh - 400px)' }}>
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <SparklesIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">AI Assistant Ready</p>
            <div className="text-sm space-y-1">
              <p>• Ask questions about your document</p>
              <p>• Get writing suggestions</p>
              <p>• Summarize content</p>
              <p>• Check grammar and style</p>
              <p>• Translate text</p>
              <p>• Convert to templates</p>
              <p className="pt-4 text-xs text-gray-400">
                💡 Tip: Start typing multiple messages to test vertical scrolling
              </p>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>

              {/* Suggestions */}
              {message.suggestions && message.suggestions.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200/50">
                  <p className="text-xs font-medium text-gray-600 mb-2">💡 Suggestions:</p>
                  <div className="space-y-2">
                    {message.suggestions.map((suggestion, index) => (
                      <div key={index} className="bg-white/50 rounded p-2 text-sm">
                        <p className="text-gray-700 mb-2">{suggestion.description}</p>
                        <div className="flex items-center justify-between">
                          <code className="text-xs bg-gray-200 px-2 py-1 rounded text-gray-800">
                            {suggestion.text.length > 50 ? suggestion.text.substring(0, 50) + '...' : suggestion.text}
                          </code>
                          <button
                            onClick={() => onInsertText(suggestion.text)}
                            className="ml-2 px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                          >
                            Insert
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Corrections */}
              {message.corrections && message.corrections.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200/50">
                  <p className="text-xs font-medium text-gray-600 mb-2">✏️ Corrections:</p>
                  <div className="space-y-2">
                    {message.corrections.map((correction, index) => (
                      <div key={index} className="bg-white/50 rounded p-2 text-sm">
                        <p className="text-gray-700 mb-1">{correction.reason}</p>
                        <div className="mb-2">
                          <div className="text-xs text-red-600">
                            <span className="font-medium">Original:</span> <del>{correction.original}</del>
                          </div>
                          <div className="text-xs text-green-600">
                            <span className="font-medium">Corrected:</span> {correction.corrected}
                          </div>
                        </div>
                        <button
                          onClick={() => onInsertText(correction.corrected)}
                          className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                        >
                          Apply Fix
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200/20">
                <span className="text-xs opacity-70">
                  {message.timestamp.toLocaleTimeString()}
                </span>
                {message.role === 'assistant' && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => copyToClipboard(message.content)}
                      className="p-1 hover:bg-black/10 rounded"
                      title="Copy"
                    >
                      <ClipboardDocumentIcon className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => saveResponse(message)}
                      className="p-1 hover:bg-black/10 rounded"
                      title="Save"
                    >
                      <BookmarkIcon className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                <span className="text-sm text-gray-600">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex gap-2 mb-2">
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Ask about ${activeFeature}...`}
            className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={2}
            disabled={isLoading}
          />
          <div className="flex flex-col gap-1">
            <button
              onClick={() => sendMessage(inputText, activeFeature)}
              disabled={!inputText.trim() || isLoading}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Send"
            >
              <PaperAirplaneIcon className="w-4 h-4" />
            </button>
            <button
              onClick={startVoiceInput}
              className={`p-2 rounded-lg transition-colors ${
                isListening 
                  ? 'bg-red-600 text-white' 
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
              title="Voice Input"
            >
              <MicrophoneIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Document Actions */}
        <div className="flex gap-2 pt-2 border-t border-gray-100">
          <button
            onClick={() => onDownloadDocument('docx')}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
          >
            <ArrowDownTrayIcon className="w-3 h-3" />
            DOCX
          </button>
          <button
            onClick={() => onDownloadDocument('pdf')}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
          >
            <ArrowDownTrayIcon className="w-3 h-3" />
            PDF
          </button>
          <button 
            onClick={() => setShowTemplateConverter(true)}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 rounded hover:from-blue-200 hover:to-indigo-200 transition-colors"
          >
            <RocketLaunchIcon className="w-3 h-3" />
            Convert Template
          </button>
          <button className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors">
            <ClockIcon className="w-3 h-3" />
            History
          </button>
        </div>
      </div>

      {/* Template Converter Modal */}
      <TemplateConverter
        documentId={documentId}
        documentData={documentData}
        isVisible={showTemplateConverter}
        onClose={() => setShowTemplateConverter(false)}
        onInsertTemplate={onInsertText}
      />
    </div>
  );
} 