'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import LoadingSpinner from '@/components/LoadingSpinner'
import { FaFileAlt, FaUpload, FaEye, FaEdit, FaClock, FaChartLine } from 'react-icons/fa'

interface DashboardStats {
  totalDocuments: number;
  recentUploads: number;
  totalViews: number;
}

interface RecentDocument {
  id: string;
  name: string;
  createdAt: string;
  type: string;
}

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalDocuments: 0,
    recentUploads: 0,
    totalViews: 0,
  })
  const [recentDocuments, setRecentDocuments] = useState<RecentDocument[]>([])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Fetch documents to calculate stats
      const response = await fetch('/api/documents', {
        headers: { 'Cache-Control': 'no-cache' },
      })
      
      if (response.ok) {
        const documents = await response.json()
        
        // Calculate stats
        const total = documents.length
        const recent = documents.filter((doc: any) => {
          const daysSince = (Date.now() - new Date(doc.createdAt).getTime()) / (1000 * 60 * 60 * 24)
          return daysSince <= 7
        }).length
        
        setStats({
          totalDocuments: total,
          recentUploads: recent,
          totalViews: total * 3, // Mock view count
        })
        
        // Set recent documents (last 5)
        setRecentDocuments(
          documents
            .slice(0, 5)
            .map((doc: any) => ({
              id: doc.id,
              name: doc.name,
              createdAt: doc.createdAt,
              type: doc.name.split('.').pop()?.toUpperCase() || 'FILE'
            }))
        )
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <LoadingSpinner size="lg" message="Loading dashboard..." />
      </div>
    )
  }

  return (
    <div className="h-full p-6 overflow-auto">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome back!</h1>
        <p className="text-gray-600">
          Manage your documents with our AI-powered platform
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Documents</p>
              <p className="text-3xl font-bold">{stats.totalDocuments}</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-3">
              <FaFileAlt className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Recent Uploads</p>
              <p className="text-3xl font-bold">{stats.recentUploads}</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-3">
              <FaUpload className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Total Views</p>
              <p className="text-3xl font-bold">{stats.totalViews}</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-3">
              <FaChartLine className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <FaClock className="w-5 h-5 mr-2 text-blue-600" />
            Quick Actions
          </h2>
          
          <div className="space-y-4">
            <button
              onClick={() => router.push('/dashboard/upload')}
              className="w-full flex items-center p-4 text-left bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group"
            >
              <div className="bg-blue-600 rounded-lg p-3 mr-4">
                <FaUpload className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 group-hover:text-blue-700">Upload New Document</h3>
                <p className="text-sm text-gray-600">Add PDF, DOCX, DOC, or TXT files</p>
              </div>
            </button>
            
            <button
              onClick={() => router.push('/dashboard/documents')}
              className="w-full flex items-center p-4 text-left bg-green-50 hover:bg-green-100 rounded-lg transition-colors group"
            >
              <div className="bg-green-600 rounded-lg p-3 mr-4">
                <FaEye className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 group-hover:text-green-700">View All Documents</h3>
                <p className="text-sm text-gray-600">Browse and edit your files</p>
              </div>
            </button>
          </div>
        </div>

        {/* Recent Documents */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <FaFileAlt className="w-5 h-5 mr-2 text-green-600" />
            Recent Documents
          </h2>
          
          {recentDocuments.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-3">
                <FaFileAlt className="w-12 h-12 mx-auto" />
              </div>
              <p className="text-gray-500 mb-4">No documents yet</p>
              <button
                onClick={() => router.push('/dashboard/upload')}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FaUpload className="w-4 h-4 mr-2" />
                Upload First Document
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                  onClick={() => router.push('/dashboard/documents')}
                >
                  <div className="bg-gray-100 rounded-lg p-2 mr-3">
                    <FaFileAlt className="w-4 h-4 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{doc.name}</p>
                    <p className="text-xs text-gray-500">
                      {doc.type} • {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <FaEdit className="w-4 h-4 text-gray-400" />
                </div>
              ))}
              
              {recentDocuments.length > 0 && (
                <button
                  onClick={() => router.push('/dashboard/documents')}
                  className="w-full mt-4 text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  View all documents →
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 