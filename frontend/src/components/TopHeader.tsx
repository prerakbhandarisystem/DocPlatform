'use client';

import { 
  ChevronRightIcon,
  ShareIcon,
  StarIcon,
  EllipsisHorizontalIcon,
  ClockIcon,
  EyeIcon,
  HomeIcon,
  DocumentTextIcon,
  CloudArrowUpIcon,
  MagnifyingGlassIcon,
  CogIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { useState } from 'react';
import Link from 'next/link';

interface DocumentData {
  id: string;
  filename: string;
  filetype: string;
  filesize: number;
  uploaded_at: string;
  google_drive_id?: string;
}

interface TopHeaderProps {
  documentData: DocumentData | null;
  onShowMergeFields?: () => void;
}

export function TopHeader({ documentData, onShowMergeFields }: TopHeaderProps) {
  const [isFavorited, setIsFavorited] = useState(false);
  const [viewers] = useState(3); // Mock viewer count
  const [activeNav, setActiveNav] = useState('documents');

  const mainNavItems = [
    { id: 'dashboard', name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { id: 'documents', name: 'View Documents', href: '/dashboard/documents', icon: DocumentTextIcon },
    { id: 'upload', name: 'Upload Files', href: '/upload', icon: CloudArrowUpIcon },
    { id: 'search', name: 'Search', href: '/search', icon: MagnifyingGlassIcon },
    { id: 'settings', name: 'Settings', href: '/settings', icon: CogIcon },
  ];

  const breadcrumbs = [
    { name: 'Documents', href: '/dashboard/documents' },
    { name: 'My Files', href: '/dashboard/documents/my-files' },
    { name: documentData?.filename || 'Document', href: '#' }
  ];

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white border-b border-gray-200">
      {/* Main Navigation */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          {/* Logo and Main Navigation */}
          <div className="flex items-center gap-8">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">DP</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">DocPlatform</h1>
                <p className="text-sm text-gray-500">AI-Powered Suite</p>
              </div>
            </div>

            {/* Main Navigation */}
            <nav className="flex items-center space-x-1">
              {mainNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeNav === item.id;
                
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setActiveNav(item.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-4">
            {/* Search Bar */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search documents..."
                className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-medium text-sm">JD</span>
              </div>
              <div className="text-sm">
                <p className="font-medium text-gray-900">John Doe</p>
                <p className="text-gray-500">john@example.com</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Document Context Bar */}
      {documentData && (
        <div className="px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Left Section - Breadcrumbs & Document Info */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              {/* Breadcrumbs */}
              <nav className="flex items-center space-x-2 text-sm">
                {breadcrumbs.map((item, index) => (
                  <div key={item.name} className="flex items-center">
                    {index > 0 && (
                      <ChevronRightIcon className="w-4 h-4 text-gray-400 mx-2" />
                    )}
                    <a
                      href={item.href}
                      className={`${
                        index === breadcrumbs.length - 1
                          ? 'text-gray-900 font-medium'
                          : 'text-gray-600 hover:text-gray-900'
                      } transition-colors`}
                    >
                      {item.name}
                    </a>
                  </div>
                ))}
              </nav>

              {/* Document Meta */}
              <div className="flex items-center gap-4 text-xs text-gray-500 ml-4">
                <span className="flex items-center gap-1">
                  <ClockIcon className="w-4 h-4" />
                  {formatDate(documentData.uploaded_at)}
                </span>
                <span>{formatFileSize(documentData.filesize)}</span>
                <span className="uppercase font-medium px-2 py-1 bg-gray-100 rounded">
                  {documentData.filetype}
                </span>
              </div>
            </div>

            {/* Right Section - Actions */}
            <div className="flex items-center gap-2">
              {/* Viewers */}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full border-2 border-white flex items-center justify-center">
                    <span className="text-white text-xs font-medium">You</span>
                  </div>
                  <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full border-2 border-white flex items-center justify-center">
                    <span className="text-white text-xs font-medium">JD</span>
                  </div>
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full border-2 border-white flex items-center justify-center">
                    <span className="text-white text-xs font-medium">AB</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <EyeIcon className="w-4 h-4" />
                  <span>{viewers}</span>
                </div>
              </div>

              {/* Merge Fields */}
              {onShowMergeFields && (
                <button
                  onClick={onShowMergeFields}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  title="View Salesforce Merge Fields"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Merge Fields
                </button>
              )}

              {/* Favorite */}
              <button
                onClick={() => setIsFavorited(!isFavorited)}
                className="p-2 text-gray-600 hover:text-yellow-500 hover:bg-yellow-50 rounded-lg transition-colors"
                title={isFavorited ? "Remove from favorites" : "Add to favorites"}
              >
                {isFavorited ? (
                  <StarIconSolid className="w-5 h-5 text-yellow-500" />
                ) : (
                  <StarIcon className="w-5 h-5" />
                )}
              </button>

              {/* Share */}
              <button className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors">
                <ShareIcon className="w-4 h-4" />
                Share
              </button>

              {/* More Options */}
              <button className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors">
                <EllipsisHorizontalIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 