import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Send, RefreshCw, X, CheckCircle, Clock } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import api from '../services/api'

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-900/20 text-yellow-200',
  in_progress: 'bg-blue-900/20 text-blue-200',
  completed: 'bg-emerald-900/20 text-emerald-200',
  expired: 'bg-slate-700/20 text-slate-200',
  cancelled: 'bg-red-900/20 text-red-200',
}

export default function SigningRequests() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState('')
  const [signers, setSigners] = useState([{ email: '', name: '', role: 'signer' }])
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [signingOrder, setSigningOrder] = useState<'sequential' | 'parallel'>('parallel')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['signing-requests'],
    queryFn: () => api.getSigningRequests(),
  })

  const { data: documents } = useQuery({
    queryKey: ['documents', 'select'],
    queryFn: () => api.getDocuments({ limit: 100 }),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => api.createSigningRequest(data),
    onSuccess: () => {
      toast.success('Signing request created')
      setShowCreateModal(false)
      setSigners([{ email: '', name: '', role: 'signer' }])
      setSubject('')
      setMessage('')
      refetch()
    },
    onError: () => toast.error('Failed to create request'),
  })

  const resendMutation = useMutation({
    mutationFn: (id: string) => api.resendSigningRequest(id),
    onSuccess: () => toast.success('Reminder sent'),
    onError: () => toast.error('Failed to send reminder'),
  })

  const addSigner = () => {
    setSigners([...signers, { email: '', name: '', role: 'signer' }])
  }

  const updateSigner = (index: number, field: string, value: string) => {
    const newSigners = [...signers]
    newSigners[index] = { ...newSigners[index], [field]: value }
    setSigners(newSigners)
  }

  const removeSigner = (index: number) => {
    setSigners(signers.filter((_, i) => i !== index))
  }

  const handleSubmit = () => {
    if (!selectedDoc || signers.some(s => !s.email || !s.name)) {
      toast.error('Please fill in all fields')
      return
    }

    createMutation.mutate({
      documentId: selectedDoc,
      signers,
      signingOrder,
      subject,
      message,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Signing Requests</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Send className="h-4 w-4" />
          New Request
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
        </div>
      ) : data?.data.signingRequests.length === 0 ? (
        <div className="card text-center py-12">
          <Send className="h-12 w-12 mx-auto text-white/40 mb-3" />
          <p className="text-white/70">No signing requests yet</p>
        </div>
      ) : (
        <div className="card shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-transparent">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase">Document</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase">Signers</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase">Created</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-white/70 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {data?.data.signingRequests.map((req: any) => (
                <tr key={req._id} className="hover:bg-white/2">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-white">{req.document?.title}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-white/70">{req.signers.length} signers</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[req.status]}`}>
                      {req.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-white/70">{format(new Date(req.createdAt), 'MMM d, yyyy')}</td>
                  <td className="px-6 py-4 text-right">
                    {req.status === 'pending' || req.status === 'in_progress' ? (
                      <button
                        onClick={() => resendMutation.mutate(req._id)}
                        className="text-primary-300 hover:text-primary-200"
                        title="Resend email"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                    ) : (
                      <CheckCircle className="h-4 w-4 text-emerald-400 inline" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      ) : (
        <div className="card">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-transparent">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase">Document</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase">Signers</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase">Created</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-white/70 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {data?.data.signingRequests.map((req: any) => (
                <tr key={req._id} className="hover:bg-white/2">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-white">{req.document?.title}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-white/70">{req.signers.length} signers</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[req.status]}`}>
                      {req.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-white/70">{format(new Date(req.createdAt), 'MMM d, yyyy')}</td>
                  <td className="px-6 py-4 text-right">
                    {req.status === 'pending' || req.status === 'in_progress' ? (
                      <button
                        onClick={() => resendMutation.mutate(req._id)}
                        className="text-primary-300 hover:text-primary-200"
                        title="Resend email"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                    ) : (
                      <CheckCircle className="h-4 w-4 text-emerald-400 inline" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Create Signing Request</h2>
              <button onClick={() => setShowCreateModal(false)}>
                <X className="h-5 w-5 text-white/80" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/80">Document</label>
                <select
                  value={selectedDoc}
                  onChange={(e) => setSelectedDoc(e.target.value)}
                  className="mt-1 w-full bg-transparent border border-white/10 rounded-lg px-3 py-2 text-white"
                >
                  <option value="">Select a document</option>
                  {documents?.data.documents.map((doc: any) => (
                    <option key={doc._id} value={doc._id}>{doc.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Signature Request"
                  className="mt-1 w-full bg-transparent border border-white/10 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80">Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  placeholder="Please sign this document..."
                  className="mt-1 w-full bg-transparent border border-white/10 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80">Signing Order</label>
                <select
                  value={signingOrder}
                  onChange={(e) => setSigningOrder(e.target.value as any)}
                  className="mt-1 w-full bg-transparent border border-white/10 rounded-lg px-3 py-2 text-white"
                >
                  <option value="parallel">All at once (Parallel)</option>
                  <option value="sequential">One by one (Sequential)</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-white/80">Signers</label>
                  <button onClick={addSigner} className="text-sm text-primary-300">
                    + Add Signer
                  </button>
                </div>
                <div className="space-y-2">
                  {signers.map((signer, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Name"
                        value={signer.name}
                        onChange={(e) => updateSigner(index, 'name', e.target.value)}
                        className="flex-1 bg-transparent border border-white/10 rounded-lg px-3 py-2 text-white"
                      />
                      <input
                        type="email"
                        placeholder="Email"
                        value={signer.email}
                        onChange={(e) => updateSigner(index, 'email', e.target.value)}
                        className="flex-1 bg-transparent border border-white/10 rounded-lg px-3 py-2 text-white"
                      />
                      {signers.length > 1 && (
                        <button onClick={() => removeSigner(index)} className="text-red-400">
                          <X className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 border border-white/10 rounded-lg text-white/80">
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={createMutation.isPending}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
