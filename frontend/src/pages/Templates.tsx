import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { FileText, Plus, Clock, Star, Filter } from 'lucide-react'
import { format } from 'date-fns'
import api from '../services/api'

interface Template {
  _id: string
  name: string
  description: string
  fieldCount: number
  uses: number
  createdAt: string
  isPublic: boolean
}

export default function Templates() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')

  const { data: templatesData, isLoading } = useQuery({
    queryKey: ['templates', { search, category }],
    queryFn: () => api.getTemplates({ search, category }),
  })

  const templates = templatesData?.data || []

  const categories = [
    { value: 'all', label: 'All Templates' },
    { value: 'business', label: 'Business' },
    { value: 'legal', label: 'Legal' },
    { value: 'hr', label: 'HR' },
    { value: 'real-estate', label: 'Real Estate' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Document Templates</h1>
          <p className="mt-1 text-sm text-white/75">Pre-configured templates for common document types</p>
        </div>
        <Link
          to="/templates/create"
          className="mt-4 md:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter className="h-5 w-5 text-white/60" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates..."
              className="block w-full pl-10 pr-3 py-2 border border-white/10 rounded-lg bg-white/5 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-3 py-2 border border-white/10 rounded-lg bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {categories.map((cat) => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto text-white/40 mb-3" />
          <p className="text-white/70">No templates found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template: Template) => (
            <div key={template._id} className="card p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <FileText className="h-6 w-6 text-white/60 mr-2" />
                  <div>
                    <h3 className="text-lg font-medium text-white">{template.name}</h3>
                    <p className="text-sm text-white/60">{template.fieldCount} fields</p>
                  </div>
                </div>
                {template.isPublic && (
                  <div className="flex items-center text-yellow-400">
                    <Star className="h-4 w-4" />
                  </div>
                )}
              </div>
              
              <p className="text-white/70 text-sm mb-4 line-clamp-2">{template.description}</p>
              
              <div className="flex items-center justify-between text-sm text-white/60">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  {template.uses} uses
                </div>
                <span>{format(new Date(template.createdAt), 'MMM d, yyyy')}</span>
              </div>
              
              <div className="mt-4 flex gap-2">
                <Link
                  to={`/templates/${template._id}/use`}
                  className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-transparent rounded-lg text-xs font-medium text-white bg-primary-600 hover:bg-primary-700"
                >
                  Use Template
                </Link>
                <Link
                  to={`/templates/${template._id}/preview`}
                  className="inline-flex justify-center items-center px-3 py-2 border border-white/10 rounded-lg text-xs font-medium text-white/80 hover:bg-white/10"
                >
                  Preview
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
