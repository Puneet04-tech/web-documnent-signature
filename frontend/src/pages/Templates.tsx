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
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
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
              className="block w-full pl-10 pr-4 py-3 border border-white/20 rounded-xl bg-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-400 transition-all duration-200 text-base"
            />
          </div>
        </div>
        <div className="relative">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="appearance-none px-4 py-3 pr-8 border border-white/20 rounded-xl bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-400 transition-all duration-200 text-base cursor-pointer hover:bg-white/20"
          >
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value} className="bg-gray-800 text-white">{cat.label}</option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <svg className="h-5 w-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {templates.map((template: Template) => (
            <div key={template._id} className="card p-8 hover:shadow-2xl hover:scale-105 transition-all duration-300 border border-white/10 hover:border-primary-500/30 group">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center">
                  <div className="p-3 bg-primary-500/20 rounded-xl mr-4 group-hover:bg-primary-500/30 transition-colors duration-200">
                    <FileText className="h-8 w-8 text-primary-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-primary-300 transition-colors duration-200">{template.name}</h3>
                    <p className="text-base text-white/70 font-medium">{template.fieldCount} fields</p>
                  </div>
                </div>
                {template.isPublic && (
                  <div className="flex items-center px-3 py-1 bg-yellow-500/20 rounded-full border border-yellow-500/30">
                    <Star className="h-5 w-5 text-yellow-400" />
                  </div>
                )}
              </div>
              
              <p className="text-white/80 text-base leading-relaxed mb-6 line-clamp-3 group-hover:text-white/90 transition-colors duration-200">{template.description}</p>
              
              <div className="flex items-center justify-between text-sm text-white/60 mb-6">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  <span className="font-medium">{template.uses} uses</span>
                </div>
                <span className="text-white/50 font-medium">{format(new Date(template.createdAt), 'MMM d, yyyy')}</span>
              </div>
              
              <div className="flex gap-3">
                <Link
                  to={`/templates/${template._id}/use`}
                  className="flex-1 inline-flex justify-center items-center px-4 py-3 border border-transparent rounded-xl text-base font-semibold text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200 group-hover:shadow-lg"
                >
                  Use Template
                </Link>
                <Link
                  to={`/templates/${template._id}/preview`}
                  className="inline-flex justify-center items-center px-4 py-3 border border-white/20 rounded-xl text-base font-medium text-white/80 hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200"
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
