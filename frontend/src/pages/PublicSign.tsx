import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Document as PDFDoc, Page as PDFPage, pdfjs } from 'react-pdf'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`

export default function PublicSign() {
  const { token } = useParams<{ token: string }>()
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email') || ''
  
  const [numPages, setNumPages] = useState(0)
  const [pageNumber, setPageNumber] = useState(1)
  const [signatureText, setSignatureText] = useState('')
  const [signaturePos, setSignaturePos] = useState<{ x: number; y: number } | null>(null)
  const [isPlacing, setIsPlacing] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['signing-request', token, email],
    queryFn: () => api.getSigningRequestByToken(token!, email),
    enabled: !!token,
  })

  const signMutation = useMutation({
    mutationFn: (data: any) => api.signByToken(token!, data),
    onSuccess: (res) => {
      toast.success(res.data.completed ? 'Document signing complete!' : 'Signature saved')
    },
    onError: () => toast.error('Failed to sign document'),
  })

  const handleSubmit = () => {
    if (!signaturePos || !signatureText.trim()) {
      toast.error('Please add signature and position')
      return
    }

    signMutation.mutate({
      email,
      signatureData: signatureText,
      type: 'typed',
      page: pageNumber,
      x: signaturePos.x,
      y: signaturePos.y,
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  const { signingRequest, currentSigner } = data?.data || {}

  // Debug PDF file path
  const pdfFilePath = `/uploads/${signingRequest?.document?.fileName}`
  console.log('PDF file path:', pdfFilePath)
  console.log('Document data:', signingRequest?.document)

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="card p-6">
          <h1 className="text-2xl font-bold text-white">Sign Document</h1>
          <p className="text-white/70 mt-2">{signingRequest?.document?.title}</p>
          <p className="text-sm text-white/70">Signing as: {currentSigner?.name || email}</p>
        </div>

        <div className="card p-4">
          <label className="block text-sm font-medium text-white/80 mb-2">Your Signature</label>
          <input
            type="text"
            value={signatureText}
            onChange={(e) => setSignatureText(e.target.value)}
            placeholder="Type your name"
            className="w-full px-3 py-2 bg-transparent border border-white/10 rounded-lg text-white placeholder:text-white/70"
          />
        </div>

        <div className="card p-4 overflow-auto">
          <div className="relative inline-block" onClick={(e) => {
            if (!isPlacing) return
            const pdfElement = e.currentTarget.querySelector('canvas')
            if (!pdfElement) return
            
            // Get PDF canvas position and dimensions
            const canvasRect = pdfElement.getBoundingClientRect()
            const scaleX = pdfElement.width / canvasRect.width
            const scaleY = pdfElement.height / canvasRect.height
            
            // Calculate position relative to PDF coordinates
            const pdfX = (e.clientX - canvasRect.left) * scaleX
            const pdfY = (e.clientY - canvasRect.top) * scaleY
            
            setSignaturePos({
              x: pdfX,
              y: pdfY,
            })
            setIsPlacing(false)
          }}>
            <PDFDoc
              file={pdfFilePath}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              onSourceError={(error: Error) => {
                console.error('PDF loading error:', error)
                toast.error('Failed to load PDF document')
              }}
            >
              <PDFPage pageNumber={pageNumber} scale={1.2} />
            </PDFDoc>
            
            {signaturePos && (
              <div
                className="absolute border-2 border-primary-500 bg-primary-100 px-2 py-1 rounded text-sm"
                style={{ 
                  left: signaturePos.x / 1.2, // Adjust for PDF scale
                  top: signaturePos.y / 1.2, // Adjust for PDF scale
                  transform: 'scale(0.8)' // Scale down signature preview
                }}
              >
                {signatureText || 'Signature'}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center">
          <button
            onClick={() => setIsPlacing(!isPlacing)}
            className={`px-4 py-2 rounded ${isPlacing ? 'bg-yellow-700/20 text-yellow-200' : 'bg-white/4 text-white'}`}
          >
            {isPlacing ? 'Click on PDF' : 'Place Signature'}
          </button>
          
          <div className="flex gap-2">
            <button
              onClick={() => setPageNumber(p => Math.max(1, p - 1))}
              disabled={pageNumber <= 1}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Previous
            </button>
            <span className="self-center">Page {pageNumber} of {numPages}</span>
            <button
              onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
              disabled={pageNumber >= numPages}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={signMutation.isPending}
          className="w-full py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
        >
          {signMutation.isPending ? 'Saving...' : 'Sign Document'}
        </button>
      </div>
    </div>
  )
}
