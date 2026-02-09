import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { FileText, Upload, Clock, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'
import api from '../services/api'
import { Document } from '../types'

export default function Dashboard() {
  const { data: documentsData, isLoading } = useQuery({
    queryKey: ['documents', 'dashboard'],
    queryFn: () => api.getDocuments({ limit: 5 }),
  })

  const documents = documentsData?.data.data || []
  const totalDocuments = documentsData?.data.pagination.total || 0
  const completedDocuments = documents.filter((d: Document) => d.status === 'completed').length
  const pendingDocuments = documents.filter((d: Document) => d.status === 'pending' || d.status === 'partially_signed').length

  const stats = [
    { name: 'Total Documents', value: totalDocuments, icon: FileText },
    { name: 'Pending Signatures', value: pendingDocuments, icon: Clock },
    { name: 'Completed', value: completedDocuments, icon: CheckCircle },
  ]

  return (
    <div className="space-y-6">
      <div className="md:flex md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-white/75">Overview of your documents and signing activity</p>
        </div>
        <Link
          to="/documents/upload"
          className="mt-4 md:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload Document
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.name} className="card overflow-hidden">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Icon className="h-6 w-6 text-white/60" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-white/70 truncate">{stat.name}</dt>
                      <dd className="text-2xl font-semibold text-white">{stat.value}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Recent Documents */}
      <div className="card">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-white">Recent Documents</h3>
          <div className="mt-4">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8 text-white/70">
                <FileText className="h-12 w-12 mx-auto text-white/40 mb-3" />
                <p>No documents yet</p>
                <Link to="/documents/upload" className="text-primary-300 hover:text-primary-200">
                  Upload your first document
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-gray-700">
                {documentsData?.data.data.map((doc: Document) => (
                  <li key={doc._id} className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-white/60 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-white">{doc.title}</p>
                          <p className="text-xs text-white/70">
                            {format(new Date(doc.createdAt), 'MMM d, yyyy')} • {doc.pageCount} pages
                          </p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        doc.status === 'completed' ? 'bg-emerald-900/20 text-emerald-200' :
                        doc.status === 'pending' ? 'bg-yellow-900/20 text-yellow-200' :
                        'bg-slate-700/20 text-slate-200'
                      }`}>
                        {doc.status.replace('_', ' ')}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="mt-4">
            <Link to="/documents" className="text-sm font-medium text-primary-300 hover:text-primary-200">
              View all documents →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
