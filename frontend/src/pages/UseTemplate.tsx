import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../services/api'
import type { ApiResponse } from '../types'

export default function UseTemplate() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  const { data: tplResp, isLoading } = useQuery<ApiResponse<any> | undefined, Error>({
    queryKey: ['template', id],
    queryFn: () => api.getTemplate(id || ''),
    enabled: !!id
  })

  // populate form when template response arrives
  useEffect(() => {
    const resp = tplResp as ApiResponse<any> | undefined
    if (!resp?.data) return
    const tpl = resp.data
    setTitle(tpl?.name || '')
    setDescription(tpl?.description || '')
  }, [tplResp])

  const createFromTemplate = useMutation<ApiResponse<any>, unknown, { title: string; description: string }>({
    mutationFn: (payload) => api.useTemplate(id || '', payload),
    onSuccess: (res: ApiResponse<any>) => {
      toast.success('Document created from template')
      // try to find document id in response payload
      const created = (res as any).data || (res as any)
      const docId = created?.document?._id || created?._id || created?.documentId || created?.id
      if (docId) navigate(`/documents/${docId}`)
      else navigate('/documents')
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to create document from template')
  })

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return toast.error('Title is required')
    createFromTemplate.mutate({ title: title.trim(), description: description.trim() })
  }

  const tpl = tplResp?.data

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Use Template</h1>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading template...</div>
      ) : tpl ? (
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Template: {tpl.name}</h2>
            <p className="text-white/70 mb-4">{tpl.description}</p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Document Title *</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Enter document title"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                rows={3}
                placeholder="Optional document description"
              />
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-semibold text-white mb-2">Template Fields Preview</h3>
              <div className="border border-dashed border-gray-400 rounded-lg p-4 bg-gray-50">
                <div className="flex flex-wrap">
                  {tpl.fields?.length ? tpl.fields.map((f: any, i: number) => (
                    <div key={i} className="inline-block border border-gray-300 rounded p-2 m-1 bg-white">
                      <div className="text-xs text-gray-600 mb-1">{f.type}</div>
                      <div className="w-24 h-8 border border-gray-400 flex items-center justify-center text-xs">{f.label}</div>
                    </div>
                  )) : <div className="text-sm text-gray-500">No fields</div>}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => navigate('/templates')} className="px-4 py-2 border border-white/10 rounded-lg text-white/80">Cancel</button>
            <button type="submit" disabled={createFromTemplate.isPending} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
              {createFromTemplate.isPending ? 'Creating...' : 'Create Document'}
            </button>
          </div>
        </form>
      ) : (
        <div className="text-center py-12">Template not found</div>
      )}
    </div>
  )
}
