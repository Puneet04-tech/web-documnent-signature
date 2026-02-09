import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { FileText, Search, Filter, ChevronLeft, ChevronRight, Download, Trash2, Eye } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import api from '../services/api'
import { Document } from '../types'

const statusColors: Record<string, string> = {
  draft: 'bg-slate-700/20 text-slate-200',
  pending: 'bg-yellow-900/20 text-yellow-200',
  partially_signed: 'bg-blue-900/20 text-blue-200',
  completed: 'bg-emerald-900/20 text-emerald-200',
  archived: 'bg-purple-900/20 text-purple-200',
}

export default function Documents() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [status, setStatus] = useState(searchParams.get('status') || '')
  const [page, setPage] = useState(1)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['documents', { search, status, page }],
    queryFn: () => api.getDocuments({ search, status, page, limit: 10 }),
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    refetch()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return
    
    try {
      await api.deleteDocument(id)
      toast.success('Document deleted')
      refetch()
    } catch {
      toast.error('Failed to delete document')
    }
  }

  const handleDownload = async (doc: Document, signed = false) => {
    try {
      const blob = await api.downloadDocument(doc._id, signed)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = signed ? `signed_${doc.originalName}` : doc.originalName
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      toast.error('Failed to download document')
    }
  }

  return (
    <div className="space-y-6">
      <div className="md:flex md:items-center md:justify-between">
        <h1 className="text-2xl font-bold text-white">Documents</h1>
        <Link
          to="/documents/upload"
          className="mt-4 md:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
        >
          Upload Document
        </Link>
      </div>

      {/* Filters */}
      <div className="card p-4 rounded-lg">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/60" />
            <input
              type="text"
              placeholder="Search documents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-transparent border border-white/10 rounded-lg text-white placeholder:text-white/70 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-4 py-2 bg-transparent border border-white/10 rounded-lg text-white placeholder:text-white/70 focus:ring-primary-500 focus:border-primary-500"
          >
            <option className="text-black" value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="partially_signed">Partially Signed</option>
            <option value="completed">Completed</option>
          </select>
          <button type="submit" className="btn-primary">
            <Filter className="h-4 w-4" />
          </button>
        </form>
      </div>

      {/* Documents List */}
      <div className="card shadow rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : data?.data.documents.length === 0 ? (
          <div className="text-center py-12 text-white/70">
            <FileText className="h-12 w-12 mx-auto text-white/40 mb-3" />
            <p>No documents found</p>
          </div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-transparent">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Document</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Signatures</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-white/70 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {data?.data.documents.map((doc: Document) => (
                  <tr key={doc._id} className="hover:bg-white/2">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-white/60 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-white">{doc.title}</p>
                          <p className="text-xs text-white/70">{doc.pageCount} pages</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[doc.status]}`}>
                        {doc.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-white/70">{doc.signatureCount || 0}</td>
                    <td className="px-6 py-4 text-sm text-white/70">{format(new Date(doc.createdAt), 'MMM d, yyyy')}</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Link to={`/documents/${doc._id}`} className="text-primary-300 hover:text-primary-200">
                        <Eye className="h-4 w-4 inline" />
                      </Link>
                      <button onClick={() => handleDownload(doc)} className="text-white/80 hover:text-white">
                        <Download className="h-4 w-4 inline" />
                      </button>
                      <button onClick={() => handleDelete(doc._id)} className="text-red-400 hover:text-red-300">
                        <Trash2 className="h-4 w-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {data?.data.pagination.pages > 1 && (
              <div className="px-6 py-4 flex items-center justify-between border-t border-white/10">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center text-sm text-white/70 hover:text-white disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </button>
                <span className="text-sm text-white/70">
                  Page {page} of {data.data.pagination.pages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(data.data.pagination.pages, p + 1))}
                  disabled={page === data.data.pagination.pages}
                  className="flex items-center text-sm text-white/70 hover:text-white disabled:opacity-50"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
