import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { FileText, Save, X, Plus, Trash2, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'

interface FieldData {
  type: 'signature' | 'initials' | 'name' | 'date' | 'text' | 'input' | 'checkbox' | 'witness' | 'stamp'
  label: string
  width: number
  height: number
  x: number
  y: number
  page: number
  required: boolean
}

interface TemplateData {
  name: string
  description: string
  category: string
  isPublic: boolean
  fields: FieldData[]
}

const FIELD_TYPES = [
  { type: 'signature', label: 'Signature', width: 200, height: 60 },
  { type: 'initials', label: 'Initials', width: 80, height: 60 },
  { type: 'name', label: 'Name', width: 200, height: 40 },
  { type: 'date', label: 'Date', width: 150, height: 40 },
  { type: 'text', label: 'Text', width: 200, height: 40 },
  { type: 'input', label: 'Input', width: 200, height: 40 },
  { type: 'checkbox', label: 'Checkbox', width: 30, height: 30 },
  { type: 'witness', label: 'Witness', width: 200, height: 60 },
  { type: 'stamp', label: 'Stamp', width: 150, height: 150 }
]

const CATEGORIES = [
  { value: 'business', label: 'Business' },
  { value: 'legal', label: 'Legal' },
  { value: 'hr', label: 'HR' },
  { value: 'real-estate', label: 'Real Estate' }
]

export default function CreateTemplate() {
  const navigate = useNavigate()
  const [templateData, setTemplateData] = useState<TemplateData>({
    name: '',
    description: '',
    category: 'business',
    isPublic: false,
    fields: []
  })
  const [showPreview, setShowPreview] = useState(false)

  const createTemplateMutation = useMutation({
    mutationFn: (data: TemplateData) => api.createTemplate(data),
    onSuccess: () => {
      toast.success('Template created successfully!')
      navigate('/templates')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to create template')
    }
  })

  const addField = () => {
    const newField: FieldData = {
      type: 'signature',
      label: 'Signature',
      width: 200,
      height: 60,
      x: 50,
      y: 50,
      page: 1,
      required: true
    }
    setTemplateData(prev => ({
      ...prev,
      fields: [...prev.fields, newField]
    }))
  }

  const removeField = (index: number) => {
    setTemplateData(prev => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index)
    }))
  }

  const updateField = (index: number, field: Partial<FieldData>) => {
    setTemplateData(prev => ({
      ...prev,
      fields: prev.fields.map((f, i) => i === index ? { ...f, ...field } : f)
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!templateData.name.trim()) {
      toast.error('Template name is required')
      return
    }
    if (templateData.fields.length === 0) {
      toast.error('At least one field is required')
      return
    }
    createTemplateMutation.mutate(templateData)
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Create Template</h1>
        <button
          onClick={() => navigate('/templates')}
          className="text-gray-600 hover:text-gray-900"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Basic Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Template Name *</label>
              <input
                type="text"
                value={templateData.name}
                onChange={(e) => setTemplateData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter template name"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={templateData.category}
                onChange={(e) => setTemplateData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={templateData.description}
              onChange={(e) => setTemplateData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={4}
              placeholder="Describe what this template is used for..."
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isPublic"
              checked={templateData.isPublic}
              onChange={(e) => setTemplateData(prev => ({ ...prev, isPublic: e.target.checked }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isPublic" className="ml-2 text-sm font-medium text-gray-700">
              Make this template public (others can use it)
            </label>
          </div>
        </div>

        {/* Fields Configuration */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Template Fields</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={addField}
                className="inline-flex items-center px-3 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Field
              </button>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {showPreview ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {showPreview ? 'Hide' : 'Show'} Preview
              </button>
            </div>
          </div>

          {templateData.fields.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto text-gray-400 mb-3" />
              <p>No fields added yet. Click "Add Field" to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {templateData.fields.map((field, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                    <>
                      <select
                        value={field.type}
                        onChange={(e) => updateField(index, { type: e.target.value as any })}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {FIELD_TYPES.map(type => (
                          <option key={type.type} value={type.type}>{type.label}</option>
                        ))}
                      </select>
                      
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => updateField(index, { label: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Field label"
                      />
                    </>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => removeField(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Width</label>
                      <input
                        type="number"
                        value={field.width}
                        onChange={(e) => updateField(index, { width: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        min="50"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Height</label>
                      <input
                        type="number"
                        value={field.height}
                        onChange={(e) => updateField(index, { height: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        min="30"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">X Position</label>
                      <input
                        type="number"
                        value={field.x}
                        onChange={(e) => updateField(index, { x: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        min="0"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Y Position</label>
                      <input
                        type="number"
                        value={field.y}
                        onChange={(e) => updateField(index, { y: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        min="0"
                      />
                    </div>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(e) => updateField(index, { required: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 text-sm font-medium text-gray-700">Required field</label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Preview */}
        {showPreview && templateData.fields.length > 0 && (
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Template Preview</h2>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 bg-gray-50">
              <div className="text-center text-gray-500">
                <p className="mb-4">Template: <strong>{templateData.name}</strong></p>
                <p className="mb-4">Category: {templateData.category}</p>
                <div className="space-y-2">
                  {templateData.fields.map((field, index) => (
                    <div key={index} className="inline-block border border-gray-300 rounded p-2 m-1 bg-white">
                      <div className="text-xs text-gray-600 mb-1">{field.type}</div>
                      <div className="w-20 h-8 border border-gray-400 flex items-center justify-center text-xs">
                        {field.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form footer / submit */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/templates')}
            className="px-4 py-2 border border-white/10 rounded-lg text-white/80"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={createTemplateMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {createTemplateMutation.isPending ? 'Creating...' : 'Create Template'}
          </button>
        </div>
      </form>
    </div>
  )
}
