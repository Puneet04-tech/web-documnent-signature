import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { Upload, File, X } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'

export default function UploadDocument() {
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const pdfFile = acceptedFiles.find(f => f.type === 'application/pdf')
    if (pdfFile) {
      setFile(pdfFile)
      if (!title) {
        setTitle(pdfFile.name.replace('.pdf', ''))
      }
    } else {
      toast.error('Please upload a PDF file')
    }
  }, [title])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      toast.error('Please select a file')
      return
    }

    setIsUploading(true)
    try {
      await api.uploadDocument(file, title, description)
      toast.success('Document uploaded successfully')
      navigate('/documents')
    } catch {
      toast.error('Failed to upload document')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Upload Document</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* File Dropzone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-primary-500 bg-primary-50' : 'border-white/10 hover:border-white/30'
          }`}
        >
          <input {...getInputProps()} />
          {file ? (
            <div className="flex items-center justify-center space-x-2">
              <File className="h-8 w-8 text-primary-600" />
              <span className="text-white font-medium">{file.name}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setFile(null)
                }}
                className="text-red-500 hover:text-red-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="h-12 w-12 text-white/40 mx-auto" />
              <p className="text-white/70">
                {isDragActive ? 'Drop the PDF here' : 'Drag and drop a PDF, or click to select'}
              </p>
              <p className="text-sm text-white/70">Only PDF files are supported</p>
            </div>
          )}
        </div>

        {/* Document Details */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/80">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-transparent border border-white/10 rounded-lg text-white placeholder:text-white/70 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Document title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 block w-full px-3 py-2 bg-transparent border border-white/10 rounded-lg text-white placeholder:text-white/70 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Add a description..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate('/documents')}
            className="px-4 py-2 border border-white/10 rounded-lg text-white/80 hover:bg-white/4"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!file || isUploading}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? 'Uploading...' : 'Upload Document'}
          </button>
        </div>
      </form>
    </div>
  )
}
