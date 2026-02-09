import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { History, ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import api from '../services/api'

const actionLabels: Record<string, string> = {
  'document_created': 'Document created',
  'document_viewed': 'Document viewed',
  'document_downloaded': 'Document downloaded',
  'document_deleted': 'Document deleted',
  'signature_added': 'Signature added',
  'signature_removed': 'Signature removed',
  'signature_signed': 'Document signed',
  'signature_rejected': 'Signature rejected',
  'signing_request_created': 'Signing request created',
  'signing_request_sent': 'Email sent',
  'signing_request_viewed': 'Signing link viewed',
  'document_finalized': 'Document finalized',
  'user_login': 'User logged in',
  'user_logout': 'User logged out',
  'user_registered': 'User registered',
}

export default function AuditLog() {
  const { docId } = useParams<{ docId: string }>()

  const { data, isLoading } = useQuery({
    queryKey: ['audit', docId],
    queryFn: () => api.getAuditLogs(docId!),
    enabled: !!docId,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to={`/documents/${docId}`} className="text-white/70 hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-white">Audit Log</h1>
      </div>

      <div className="card">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : data?.data.auditLogs.length === 0 ? (
          <div className="text-center py-12">
            <History className="h-12 w-12 mx-auto text-white/40 mb-3" />
            <p className="text-white/70">No audit entries yet</p>
          </div>
        ) : (
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-transparent">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase">IP Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {data?.data.auditLogs.map((log: any) => (
                  <tr key={log._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-white">
                        {actionLabels[log.action] || log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-white/70">
                      {log.user?.name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 text-sm text-white/70">{log.ipAddress}</td>
                    <td className="px-6 py-4 text-sm text-white/70">
                      {format(new Date(log.timestamp), 'MMM d, yyyy HH:mm')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
