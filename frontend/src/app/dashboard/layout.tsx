'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import ErrorBoundary from '@/components/ErrorBoundary';
import LoadingSpinner from '@/components/LoadingSpinner';

import { 
  FaFileUpload, 
  FaFileAlt, 
  FaSignOutAlt, 
  FaUserCircle, 
  FaFolder,
  FaTachometerAlt,
  FaSearch,
  FaCog,
  FaEdit,
  FaEye
} from 'react-icons/fa';

interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
}

interface SalesforceConnection {
  connected: boolean;
  instance_url?: string;
  has_credentials: boolean;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [salesforceConnection, setSalesforceConnection] = useState<SalesforceConnection>({
    connected: false,
    has_credentials: false
  });
  const [salesforceLoading, setSalesforceLoading] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const accessToken = localStorage.getItem('access_token');

    if (!storedUser || !accessToken) {
      router.push('/auth/login');
      return;
    }

    try {
      setUser(JSON.parse(storedUser));
    } catch (error) {
      console.error('Error parsing user data:', error);
      localStorage.clear(); // Clear corrupted data
      router.push('/auth/login');
      return;
    }

    setIsLoading(false);
    checkSalesforceConnection();
    handleOAuthCallback();
  }, [router]);

  // Handle OAuth callback notifications
  const handleOAuthCallback = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const salesforceParam = urlParams.get('salesforce');
    
    if (salesforceParam === 'connected') {
      // Show success notification
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-all duration-300';
      notification.innerHTML = `
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          <span>Successfully connected to Salesforce!</span>
        </div>
      `;
      
      document.body.appendChild(notification);
      setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
      }, 4000);
      
      // Remove URL parameters and refresh connection status
      window.history.replaceState({}, document.title, window.location.pathname);
      setTimeout(checkSalesforceConnection, 1000);
    } else if (salesforceParam === 'error') {
      const message = urlParams.get('message') || 'Authentication failed';
      
      // Show error notification
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-all duration-300';
      notification.innerHTML = `
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span>Salesforce connection failed: ${message}</span>
        </div>
      `;
      
      document.body.appendChild(notification);
      setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
      }, 6000);
      
      // Remove URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  const checkSalesforceConnection = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/api/v1/salesforce/status`);
      const data = await response.json();
      
      if (data.success) {
        setSalesforceConnection(data);
      }
    } catch (error) {
      console.error('Error checking Salesforce status:', error);
    }
  };

  const connectToSalesforce = async () => {
    setSalesforceLoading(true);
    
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/api/v1/salesforce/auth/url`);
      const data = await response.json();
      
      if (data.success && data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        console.error('Failed to get authorization URL:', data.error);
        setSalesforceLoading(false);
      }
    } catch (error) {
      console.error('Error initiating Salesforce OAuth:', error);
      setSalesforceLoading(false);
    }
  };

  const disconnectFromSalesforce = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/api/v1/salesforce/disconnect`, {
        method: 'POST',
      });
      
      if (response.ok) {
        setSalesforceConnection({ connected: false, has_credentials: false });
      }
    } catch (error) {
      console.error('Error disconnecting from Salesforce:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    router.push('/auth/login');
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: FaTachometerAlt,
      current: pathname === '/dashboard',
      description: 'Overview & analytics'
    },
    {
      name: 'View Documents',
      href: '/dashboard/documents',
      icon: FaEye,
      current: pathname.startsWith('/dashboard/documents'),
      description: 'Browse & edit files'
    },
    {
      name: 'Upload Files',
      href: '/dashboard/upload',
      icon: FaFileUpload,
      current: pathname === '/dashboard/upload',
      description: 'Add new documents'
    },
    {
      name: 'Search',
      href: '/dashboard/search',
      icon: FaSearch,
      current: pathname === '/dashboard/search',
      description: 'Find content quickly'
    },
    {
      name: 'Settings',
      href: '/dashboard/settings',
      icon: FaCog,
      current: pathname === '/dashboard/settings',
      description: 'Manage preferences'
    },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <LoadingSpinner size="lg" message="Loading dashboard..." />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-gray-50">
        {/* Left Sidebar - Clean Design */}
        <div className={`flex flex-col bg-white shadow-2xl border-r border-gray-200 transition-all duration-300 ${
          isSidebarCollapsed ? 'w-16' : 'w-80'
        }`}>
          {/* Logo Section */}
          <div className="flex items-center justify-between h-20 px-6 bg-gradient-to-r from-blue-600 to-indigo-700 shadow-lg">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white bg-opacity-20 backdrop-blur-sm">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              {!isSidebarCollapsed && (
                <div className="ml-3">
                  <span className="text-xl font-bold text-white">DocPlatform</span>
                  <p className="text-xs text-blue-100">AI Document Suite</p>
                </div>
              )}
            </div>
            {/* Toggle Button */}
            <button
              onClick={toggleSidebar}
              className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
              title={isSidebarCollapsed ? "Expand menu" : "Collapse menu"}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isSidebarCollapsed ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7M19 19l-7-7 7-7" />
                )}
              </svg>
            </button>
          </div>

          {/* User Profile Section */}
          {!isSidebarCollapsed && (
            <div className="px-6 py-6 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center">
                {user?.avatar_url ? (
                  <img 
                    className="h-12 w-12 rounded-xl border-2 border-blue-200 shadow-sm object-cover" 
                    src={user.avatar_url} 
                    alt={user.full_name} 
                  />
                ) : (
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                    <FaUserCircle className="h-7 w-7 text-white" />
                  </div>
                )}
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-semibold text-gray-900 truncate">{user?.full_name || 'User'}</h3>
                  <p className="text-xs text-gray-500 truncate">{user?.email || 'user@example.com'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Menu */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            <div className="mb-4">
              {!isSidebarCollapsed && (
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-3">
                  Main Menu
                </h4>
              )}
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`
                      group flex items-center py-3 text-sm font-medium rounded-xl transition-all duration-200 mb-1
                      ${isSidebarCollapsed ? 'justify-center px-2' : 'px-4'}
                      ${item.current
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg transform scale-105'
                        : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700 hover:shadow-sm'
                      }
                    `}
                    title={isSidebarCollapsed ? item.name : undefined}
                  >
                    <Icon className={`h-5 w-5 ${item.current ? 'text-white' : 'text-gray-400 group-hover:text-blue-600'} ${
                      isSidebarCollapsed ? '' : 'mr-4'
                    }`} />
                    {!isSidebarCollapsed && (
                      <div className="flex-1">
                        <div className="font-medium">{item.name}</div>
                        <div className={`text-xs ${item.current ? 'text-blue-100' : 'text-gray-500'}`}>
                          {item.description}
                        </div>
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Salesforce Integration Section */}
            <div className="mt-6">
              {!isSidebarCollapsed && (
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-3">
                  Integrations
                </h4>
              )}
              
              <div className={`${isSidebarCollapsed ? 'px-2' : 'px-4'} mb-2`}>
                {salesforceConnection.connected ? (
                  <div className={`${isSidebarCollapsed ? 'justify-center px-2' : 'px-4'} py-3 bg-green-50 border border-green-200 rounded-xl`}>
                    {!isSidebarCollapsed ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-green-800">Salesforce</p>
                            <p className="text-xs text-green-600">Connected</p>
                          </div>
                        </div>
                        <button
                          onClick={disconnectFromSalesforce}
                          className="text-green-600 hover:text-red-600 transition-colors"
                          title="Disconnect"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center" title="Salesforce Connected">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={connectToSalesforce}
                    disabled={salesforceLoading}
                    className={`
                      group flex items-center w-full py-3 text-sm font-medium rounded-xl transition-all duration-200
                      ${isSidebarCollapsed ? 'justify-center px-2' : 'px-4'}
                      ${salesforceLoading 
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                        : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700 hover:shadow-sm border border-gray-200 hover:border-blue-300'
                      }
                    `}
                    title={isSidebarCollapsed ? "Connect Salesforce" : undefined}
                  >
                    {salesforceLoading ? (
                      <>
                        <div className={`animate-spin rounded-full h-5 w-5 border-b-2 border-gray-400 ${
                          isSidebarCollapsed ? '' : 'mr-4'
                        }`}></div>
                        {!isSidebarCollapsed && (
                          <div>
                            <div className="font-medium">Connecting...</div>
                            <div className="text-xs text-gray-500">Please wait</div>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <svg className={`h-5 w-5 text-blue-600 ${
                          isSidebarCollapsed ? '' : 'mr-4'
                        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        {!isSidebarCollapsed && (
                          <div>
                            <div className="font-medium">Connect Salesforce</div>
                            <div className="text-xs text-gray-500">Enable integrations</div>
                          </div>
                        )}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </nav>

          {/* Logout Section */}
          <div className="p-4 border-t border-gray-100 bg-gray-50">
            <button
              onClick={handleLogout}
              className={`flex items-center w-full py-3 text-sm font-medium text-gray-600 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all duration-200 group ${
                isSidebarCollapsed ? 'justify-center px-2' : 'px-4'
              }`}
              title={isSidebarCollapsed ? "Sign Out" : undefined}
            >
              <FaSignOutAlt className={`h-5 w-5 text-gray-400 group-hover:text-red-500 ${
                isSidebarCollapsed ? '' : 'mr-4'
              }`} />
              {!isSidebarCollapsed && (
                <div>
                  <div className="font-medium">Sign Out</div>
                  <div className="text-xs text-gray-500">Exit application</div>
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          {/* Content Container */}
          <main className="flex-1 overflow-auto bg-gray-50">
            <div className="h-full">
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
            </div>
          </main>
        </div>

        {/* Status Check Component */}
  
      </div>
    </ErrorBoundary>
  );
} 