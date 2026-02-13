import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { FileText, Download, Trash2, Edit, Send, History, CheckCircle, Users } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import api from '../services/api'

export default function DocumentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'overview' | 'signatures' | 'requests'>('overview')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['document', id],
    queryFn: () => api.getDocument(id!),
    enabled: !!id,
  })

  const handleFinalize = async () => {
    if (!confirm('Finalize this document? This will embed all signatures into the PDF.')) return
    
    try {
      await api.finalizeDocument(id!)
      toast.success('Document finalized successfully')
      refetch()
    } catch {
      toast.error('Failed to finalize document')
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this document?')) return
    
    try {
      await api.deleteDocument(id!)
      toast.success('Document deleted')
      navigate('/documents')
    } catch {
      toast.error('Failed to delete document')
    }
  }

  const handleDownload = async (signed = false) => {
    try {
      const blob = await api.downloadDocument(id!, signed)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = data?.data.document.originalName || 'document.pdf'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      console.error('Download error:', err)
      toast.error(err?.response?.data?.message || 'Failed to download document')
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
      </div>
    )
  }

  const { document: doc, signatures, signingRequests } = data?.data || {}

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <Link to="/documents" className="text-sm text-white/70 hover:text-white">← Back to documents</Link>
          <h1 className="text-2xl font-bold text-white mt-1">{doc?.title}</h1>
          <p className="text-sm text-white/70">{doc?.pageCount} pages • Uploaded {format(new Date(doc?.createdAt || ''), 'MMM d, yyyy')}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => handleDownload()} className="btn-secondary flex items-center gap-2">
            <Download className="h-4 w-4" />
            Download
          </button>
          {doc?.status === 'partially_signed' && (
            <button onClick={handleFinalize} className="btn-primary flex items-center gap-2 bg-green-600 hover:bg-green-700">
              <CheckCircle className="h-4 w-4" />
              Finalize
            </button>
          )}
          {doc?.status === 'completed' && (
            <button onClick={() => handleDownload(true)} className="btn-primary flex items-center gap-2">
              <Download className="h-4 w-4" />
              Download Signed
            </button>
          )}
          <Link to={`/documents/${id}/sign`} className="btn-primary flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Sign
          </Link>
          <Link to={`/signing-requests`} className="btn-secondary flex items-center gap-2">
            <Send className="h-4 w-4" />
            Request Signatures
          </Link>
          <Link to={`/documents/${id}/recipients`} className="btn-secondary flex items-center gap-2">
            <Users className="h-4 w-4" />
            Manage Recipients
          </Link>
          <Link to={`/documents/${id}/analytics`} className="btn-secondary flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </Link>
          <button onClick={handleDelete} className="btn-danger flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/10">
        <nav className="-mb-px flex space-x-8">
          {['overview', 'signatures', 'requests'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-primary-500 text-primary-300'
                  : 'border-transparent text-white/70 hover:text-white hover:border-white/10'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-white/80">Status</h3>
              <span className={`mt-1 inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                doc?.status === 'completed' ? 'bg-emerald-900/20 text-emerald-200' :
                doc?.status === 'partially_signed' ? 'bg-blue-900/20 text-blue-200' :
                doc?.status === 'pending' ? 'bg-yellow-900/20 text-yellow-200' :
                'bg-slate-700/20 text-slate-200'
              }`}>
                {doc?.status?.replace('_', ' ')}
              </span>
            </div>
            <div>
              <h3 className="text-sm font-medium text-white/80">File Size</h3>
              <p className="mt-1 text-sm text-white">{((doc?.fileSize || 0) / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-white/80">Original Name</h3>
              <p className="mt-1 text-sm text-white">{doc?.originalName}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-white/80">Description</h3>
              <p className="mt-1 text-sm text-white">{doc?.description || 'No description'}</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'signatures' && (
        <div className="card">
          {signatures?.length === 0 ? (
            <div className="p-6 text-center text-white/70">
              <FileText className="h-12 w-12 mx-auto text-white/40 mb-3" />
              <p>No signatures yet</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-700">
              {signatures?.map((sig: any) => (
                <li key={sig._id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">{sig.signer.name}</p>
                      <p className="text-sm text-white/70">{sig.signer.email}</p>
                      <p className="text-xs text-white/60">Page {sig.page} • {sig.type}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      sig.status === 'signed' ? 'bg-emerald-900/20 text-emerald-200' :
                      sig.status === 'rejected' ? 'bg-red-900/20 text-red-200' :
                      'bg-yellow-900/20 text-yellow-200'
                    }`}>
                      {sig.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="card">
          {signingRequests?.length === 0 ? (
            <div className="p-6 text-center text-white/70">
              <Send className="h-12 w-12 mx-auto text-white/40 mb-3" />
              <p>No signing requests yet</p>
              <Link to="/signing-requests" className="text-primary-300 hover:text-primary-200 mt-2 inline-block">
                Create a signing request
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-gray-700">
              {signingRequests?.map((req: any) => (
                <li key={req._id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">{req.subject || 'Signing Request'}</p>
                      <p className="text-sm text-white/70">{req.signers.length} signers • {req.signingOrder} order</p>
                      <p className="text-xs text-white/60">Created {format(new Date(req.createdAt), 'MMM d, yyyy')}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      req.status === 'completed' ? 'bg-emerald-900/20 text-emerald-200' :
                      req.status === 'in_progress' ? 'bg-blue-900/20 text-blue-200' :
                      'bg-yellow-900/20 text-yellow-200'
                    }`}>
                      {req.status.replace('_', ' ')}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Audit Link */}
      <div className="flex justify-end">
        <Link to={`/audit/${id}`} className="text-sm text-primary-600 hover:text-primary-500 flex items-center gap-1">
          <History className="h-4 w-4" />
          View Audit Log
        </Link>
      </div>
    </div>
  )
}
