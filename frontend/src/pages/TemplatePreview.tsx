import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../services/api'

export default function TemplatePreview() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading } = useQuery({
    queryKey: ['template-preview', id],
    queryFn: () => api.getTemplate(id || ''),
    enabled: !!id
  })

  const tpl = data?.data

  if (isLoading) return <div className="p-6 text-center">Loading preview...</div>
  if (!tpl) return <div className="p-6 text-center">Template not found</div>

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="card p-6">
        <h1 className="text-2xl font-bold text-white mb-4">Preview — {tpl.name}</h1>
        <p className="text-white/70 mb-6">{tpl.description}</p>

        <div className="border border-dashed border-gray-400 rounded-lg p-6 bg-gray-50">
          <div className="flex flex-wrap">
            {tpl.fields?.length ? tpl.fields.map((f: any, i: number) => (
              <div key={i} className="inline-block border border-gray-300 rounded p-2 m-1 bg-white">
                <div className="text-xs text-gray-600 mb-1">{f.type}</div>
                <div className="w-32 h-10 border border-gray-400 flex items-center justify-center text-xs">{f.label}</div>
              </div>
            )) : <div className="text-sm text-gray-500">No fields</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
