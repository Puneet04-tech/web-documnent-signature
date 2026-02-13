import React, { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Document as PDFDoc, Page as PDFPage, pdfjs } from 'react-pdf'
import {
  Loader2,
  Save,
  X,
  Pen,
  Type,
  Trash2,
  User,
  Calendar,
  AlignLeft,
  CheckSquare,
  Building2,
  Pen as SignatureIcon,
  Send,
  ChevronLeft,
  ChevronRight,
  MousePointer,
  Edit3,
  Check,
  Download,
  Eye,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { ApiResponse, Document, Signature, SigningRequest } from '../types'

// Import worker via Vite URL to avoid CORS issues
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

type FieldType = 'signature' | 'initials' | 'name' | 'date' | 'text' | 'input' | 'checkbox' | 'witness' | 'stamp'

interface FieldTypeConfig {
  type: FieldType
  label: string
  icon: React.ReactNode
  width: number
  height: number
}

const FIELD_TYPES: FieldTypeConfig[] = [
  { type: 'signature', label: 'Signature', icon: <SignatureIcon className="h-5 w-5" />, width: 200, height: 60 },
  { type: 'initials', label: 'Initials', icon: <Type className="h-5 w-5" />, width: 80, height: 60 },
  { type: 'name', label: 'Name', icon: <User className="h-5 w-5" />, width: 200, height: 40 },
  { type: 'date', label: 'Date', icon: <Calendar className="h-5 w-5" />, width: 150, height: 40 },
  { type: 'text', label: 'Text', icon: <AlignLeft className="h-5 w-5" />, width: 200, height: 40 },
  { type: 'input', label: 'Input', icon: <Pen className="h-5 w-5" />, width: 200, height: 40 },
  { type: 'checkbox', label: 'Checkbox', icon: <CheckSquare className="h-5 w-5" />, width: 30, height: 30 },
  { type: 'witness', label: 'Witness', icon: <Eye className="h-5 w-5" />, width: 200, height: 60 },
  { type: 'stamp', label: 'Stamp', icon: <Building2 className="h-5 w-5" />, width: 150, height: 150 },
]

interface SignatureField {
  _id: string
  page: number
  x: number
  y: number
  width: number
  height: number
  type: FieldType
  label?: string
  value?: string
  assignedTo?: string
  status: 'pending' | 'completed'
  required: boolean
}

// Signature/Drawing Modal
function SignatureModal({ 
  isOpen, 
  onClose, 
  onSave,
  title = 'Create Signature'
}: { 
  isOpen: boolean
  onClose: () => void
  onSave: (data: string, type: 'drawn' | 'typed') => void
  title?: string
}) {
  const [activeTab, setActiveTab] = useState<'draw' | 'type'>('draw')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [signatureText, setSignatureText] = useState('')

  useEffect(() => {
    if (isOpen && activeTab === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.strokeStyle = '#000'
        ctx.lineWidth = 2
        ctx.lineCap = 'round'
      }
    }
  }, [isOpen, activeTab])

  const startDrawing = (e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    setIsDrawing(true)
    const rect = canvas.getBoundingClientRect()
    ctx.beginPath()
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
  }

  const draw = (e: React.MouseEvent) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.closePath()
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  const handleSave = () => {
    if (activeTab === 'draw') {
      const canvas = canvasRef.current
      if (!canvas) return
      onSave(canvas.toDataURL('image/png'), 'drawn')
    } else {
      if (!signatureText.trim()) return
      onSave(signatureText, 'typed')
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveTab('draw')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg flex-1 ${
                activeTab === 'draw' ? 'bg-blue-50 text-blue-700 border-2 border-blue-500' : 'bg-gray-50 text-gray-700 border-2 border-transparent'
              }`}
            >
              <Pen className="h-4 w-4" /> Draw
            </button>
            <button
              onClick={() => setActiveTab('type')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg flex-1 ${
                activeTab === 'type' ? 'bg-blue-50 text-blue-700 border-2 border-blue-500' : 'bg-gray-50 text-gray-700 border-2 border-transparent'
              }`}
            >
              <Type className="h-4 w-4" /> Type
            </button>
          </div>

          {activeTab === 'draw' ? (
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Draw your signature</span>
                <button onClick={clearCanvas} className="text-sm text-red-600 flex items-center gap-1 hover:text-red-700">
                  <Trash2 className="h-4 w-4" /> Clear
                </button>
              </div>
              <canvas
                ref={canvasRef}
                width={450}
                height={200}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                className="border-2 border-gray-300 rounded-lg cursor-crosshair bg-white w-full"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type your signature</label>
              <input
                type="text"
                value={signatureText}
                onChange={(e) => setSignatureText(e.target.value)}
                placeholder="Type your name"
                className="w-full px-3 py-3 border border-gray-300 rounded-lg text-gray-900"
                style={{ fontFamily: 'cursive', fontSize: '32px' }}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <Save className="h-4 w-4" /> Save to Field
          </button>
        </div>
      </div>
    </div>
  )
}

// Text Input Modal for name, date, text fields
function TextInputModal({
  isOpen,
  onClose,
  onSave,
  title,
  placeholder,
  initialValue = ''
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (value: string) => void
  title: string
  placeholder: string
  initialValue?: string
}) {
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    setValue(initialValue)
  }, [isOpen, initialValue])

  const handleSave = () => {
    if (!value.trim()) {
      toast.error('Please enter a value')
      return
    }
    onSave(value)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-3 border border-gray-300 rounded-lg text-lg text-gray-900"
            autoFocus
          />
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <Save className="h-4 w-4" /> Save
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SignDocument() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email')
  
  // Fallback: if id is undefined, try to extract from URL path
  const documentId = id || window.location.pathname.split('/').pop()
  
  console.log('=== SIGNDOCUMENT DEBUG ===');
  console.log('isDocumentRecipient:', !!email);
  console.log('id from params:', id);
  console.log('id from path:', documentId);
  console.log('email:', email);

  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [numPages, setNumPages] = useState(0)
  const [pageNumber, setPageNumber] = useState(1)
  const [scale, setScale] = useState(1.2)
  const [fields, setFields] = useState<SignatureField[]>([])
  const [selectedTool, setSelectedTool] = useState<FieldType | null>(null)
  const [selectedField, setSelectedField] = useState<string | null>(null)
  const [isPlacing, setIsPlacing] = useState(false)
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false)
  const [isTextModalOpen, setIsTextModalOpen] = useState(false)
  const [currentSigner, setCurrentSigner] = useState<string>('me')
  const [signers] = useState<string[]>(['me'])
  const [isDragging, setIsDragging] = useState<string | null>(null)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  // Determine if this is a document recipient signing flow
  const isDocumentRecipient = !!email

  console.log('=== SIGNDOCUMENT DEBUG ===');
  console.log('isDocumentRecipient:', isDocumentRecipient);
  console.log('id:', id);
  console.log('email:', email);

  type DocumentData = 
    | { document: Document; signatures: Signature[]; signingRequests: SigningRequest[]; fields?: any[] }
    | { document: any; recipient: any; signatures: any[]; fields?: any[] };

  const { data: docData, isLoading } = useQuery<ApiResponse<DocumentData>>({
    queryKey: isDocumentRecipient ? ['document-signing', documentId, email] : ['document', documentId],
    queryFn: () => {
      console.log('=== API CALL ===');
      console.log('Calling:', isDocumentRecipient ? 
        `getDocumentForSigning(${documentId}, ${email})` : 
        `getDocument(${documentId})`
      );
      return isDocumentRecipient ? 
        api.getDocumentForSigning(documentId!, email!) : 
        api.getDocument(documentId!);
    },
    enabled: !!documentId,
  })

  // Debug: Log the document data when it arrives
  useEffect(() => {
    if (docData) {
      console.log('=== DOCUMENT DATA RECEIVED ===');
      console.log('Document data:', docData);
      console.log('Fields in document data:', docData?.data?.fields);
      console.log('Number of fields:', docData?.data?.fields?.length);
    }
  }, [docData])

  const { data: fieldsData } = useQuery({
    queryKey: ['signatureFields', documentId],
    queryFn: () => api.getSignatureFields(documentId!),
    enabled: !!documentId && !isDocumentRecipient, // Only for document owners, not recipients
  })

  // For document recipients, use fields from document data
  const recipientFields = isDocumentRecipient ? docData?.data?.fields : null

  // Set fields directly when data changes
  useEffect(() => {
    if (isDocumentRecipient && recipientFields) {
      console.log('=== SETTING RECIPIENT FIELDS ===');
      console.log('Recipient fields:', recipientFields);
      setFields(recipientFields)
    } else if (!isDocumentRecipient && fieldsData?.data?.fields) {
      console.log('=== SETTING OWNER FIELDS ===');
      console.log('Fields data:', fieldsData.data.fields);
      setFields(fieldsData.data.fields)
    }
  }, [recipientFields, fieldsData?.data?.fields, isDocumentRecipient])

  // Add a test field for debugging
  useEffect(() => {
    if (isDocumentRecipient && documentId && fields.length === 0) {
      console.log('=== ADDING TEST FIELD ===');
      const testField: any = {
        _id: 'test-field-123',
        document: documentId,
        page: 1,
        x: 100,
        y: 100,
        width: 150,
        height: 50,
        type: 'signature',
        label: 'Test Signature',
        assignedTo: 'me',
        required: true,
        value: null,
        signer: null,
        signingRequest: null,
        status: 'pending',
        placeholder: null,
        linkedFieldId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      console.log('Adding test field:', testField);
      setFields([testField]);
    }
  }, [isDocumentRecipient, documentId, fields.length])

  const createFieldMutation = useMutation({
    mutationFn: (data: any) => api.createSignatureField(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signatureFields', documentId] })
      toast.success('Field added. Click on it to fill.')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to add field')
    },
  })

  const fillFieldMutation = useMutation({
    mutationFn: async ({ fieldId, value, type }: { fieldId: string; value: string; type: string }): Promise<ApiResponse<{ field: any }>> => {
      if (isDocumentRecipient) {
        // Use recipient-specific API
        const field = fields.find(f => f._id === fieldId);
        if (!field) throw new Error('Field not found');
        
        const result = await api.fillSignatureFieldAsRecipient(documentId!, email!, {
          signatureData: value,
          type: 'drawn', // Fixed: Use 'drawn' instead of 'signature' to match backend enum
          page: field.page,
          x: field.x, // Use current field position (might be updated by dragging)
          y: field.y, // Use current field position (might be updated by dragging)
          width: field.width,
          height: field.height
        });
        
        // Transform the response to match expected type
        return {
          success: result.success,
          message: result.message,
          data: { field: result.data.signature }
        };
      } else {
        // Use regular API for document owners
        return api.fillSignatureField({ fieldId, value, type, signatureData: value });
      }
    },
    onSuccess: () => {
      if (isDocumentRecipient) {
        // For recipients, refresh document data to get updated signatures
        queryClient.invalidateQueries({ queryKey: ['document-signing', documentId, email] });
      } else {
        // For owners, refresh signature fields
        queryClient.invalidateQueries({ queryKey: ['signatureFields', documentId] });
      }
      toast.success('Field filled successfully!');
      setSelectedField(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to fill field');
    },
  })

  const updateFieldMutation = useMutation({
    mutationFn: ({ id: fieldId, data }: { id: string; data: any }) => api.updateSignatureField(fieldId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['signatureFields', documentId] }),
  })

  const deleteFieldMutation = useMutation({
    mutationFn: (fieldId: string) => api.deleteSignatureField(fieldId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signatureFields', documentId] })
      toast.success('Field deleted successfully!')
      setSelectedField(null)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to delete field')
    },
  })

  // Finalize mutation
  const finalizeMutation = useMutation({
    mutationFn: () => api.finalizeDocument(documentId!),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['document', documentId] })
      toast.success(`Document finalized! ${data.data.fieldsEmbedded} fields embedded into PDF.`)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to finalize document')
    },
  })

  const handleFinalize = () => {
    if (!documentId) return
    finalizeMutation.mutate()
  }

  const handleDownloadSigned = async () => {
    if (!documentId) return
    try {
      // Use different approach for recipients vs owners
      if (isDocumentRecipient) {
        // For recipients, use the public download endpoint
        const response = await fetch(`/api/signing-requests/sign-document/${documentId}/${email}/download`, {
          method: 'GET'
        })
        if (!response.ok) throw new Error('Download failed')
        
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = docData?.data?.document?.originalName || 'signed-document.pdf'
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success('Signed PDF downloaded!')
      } else {
        // Use fetch with auth token for owners
        const token = localStorage.getItem('accessToken')
        const response = await fetch(`/api/docs/${documentId}/download?signed=true`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        if (!response.ok) throw new Error('Download failed')
        
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = docData?.data?.document?.originalName || 'signed-document.pdf'
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success('Signed PDF downloaded!')
      }
    } catch (err) {
      toast.error('Failed to download signed PDF')
    }
  }

  useEffect(() => {
    console.log('=== RENDERING DEBUG ===');
    console.log('Current fields:', fields);
    console.log('Current page:', pageNumber);
    const pageFields = fields.filter(f => f.page === pageNumber);
    console.log('Fields for current page:', pageFields);
    if (pageFields.length > 0) {
      console.log('Field details:', pageFields[0]);
      console.log('Field position:', { x: pageFields[0].x, y: pageFields[0].y });
      console.log('Field size:', { width: pageFields[0].width, height: pageFields[0].height });
      console.log('Field style:', getFieldStyle(pageFields[0]));
    }
  }, [fields, pageNumber])

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
  }

  const handleToolSelect = (tool: FieldType) => {
    setSelectedTool(tool)
    setIsPlacing(true)
    setSelectedField(null)
  }

  const handlePageClick = (e: React.MouseEvent) => {
    if (!isPlacing || !selectedTool || !containerRef.current) return
    
    // Prevent field creation for document recipients
    if (isDocumentRecipient) {
      toast.error('Document recipients cannot add signature fields')
      setIsPlacing(false)
      setSelectedTool(null)
      return
    }
    
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const fieldConfig = FIELD_TYPES.find(f => f.type === selectedTool)
    if (!fieldConfig) return

    // Normalize coordinates to PDF scale (1.0) by dividing by current scale
    // This ensures coordinates are always stored at base PDF size
    const normalizedX = x / scale
    const normalizedY = y / scale
    const normalizedWidth = fieldConfig.width / scale
    const normalizedHeight = fieldConfig.height / scale

    console.log('Creating field at:', { x, y, scale, normalizedX, normalizedY })

    createFieldMutation.mutate({
      documentId: documentId,
      page: pageNumber,
      x: normalizedX,
      y: normalizedY,
      width: normalizedWidth,
      height: normalizedHeight,
      type: selectedTool,
      label: fieldConfig.label,
      assignedTo: currentSigner,
      required: true,
    })

    setIsPlacing(false)
    setSelectedTool(null)
  }

  const handleFieldClick = (field: SignatureField, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    
    console.log('Field clicked:', field.type, field._id, 'isPlacing:', isPlacing)
    
    if (isPlacing || isDragging) return // Don't open if we're in placement or dragging mode
    
    setSelectedField(field._id)
    
    // Open appropriate modal based on field type
    if (field.type === 'signature' || field.type === 'initials' || field.type === 'witness') {
      setIsSignatureModalOpen(true)
    } else if (field.type === 'name' || field.type === 'text' || field.type === 'input') {
      setIsTextModalOpen(true)
    } else if (field.type === 'date') {
      // Auto-fill with current date
      const today = new Date().toLocaleDateString()
      fillFieldMutation.mutate({ fieldId: field._id, value: today, type: field.type })
    } else if (field.type === 'checkbox') {
      fillFieldMutation.mutate({ fieldId: field._id, value: 'checked', type: field.type })
    }
  }

  const handleSignatureSave = (data: string, _type: 'drawn' | 'typed') => {
    if (!selectedField) return
    
    const field = fields.find(f => f._id === selectedField)
    if (!field) return

    fillFieldMutation.mutate({ 
      fieldId: selectedField, 
      value: data, 
      type: field.type 
    })
  }

  const handleTextSave = (value: string) => {
    if (!selectedField) return
    
    const field = fields.find(f => f._id === selectedField)
    if (!field) return

    fillFieldMutation.mutate({ 
      fieldId: selectedField, 
      value, 
      type: field.type 
    })
  }

  const handleFieldDelete = (fieldId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    const field = fields.find(f => f._id === fieldId)
    if (!field) return
    
    // Show confirmation dialog
    if (window.confirm(`Are you sure you want to delete this ${field.type} field?${field.value ? ' This will also remove the signature/value.' : ''}`)) {
      deleteFieldMutation.mutate(fieldId)
    }
  }

  // Drag handlers
  const handleMouseDown = (fieldId: string, e: React.MouseEvent) => {
    if (isPlacing) return
    e.preventDefault()
    e.stopPropagation()
    
    console.log('Mouse down on field:', fieldId)
    setIsDragging(fieldId)
    setDragStart({ x: e.clientX, y: e.clientY })
    setSelectedField(fieldId)
  }

  useEffect(() => {
    let dragTimeout: number | undefined
    
    const handleGlobalMouseUp = () => {
      if (dragTimeout) {
        clearTimeout(dragTimeout)
      }
      setIsDragging(null)
      // Re-enable page scrolling when drag ends
      document.removeEventListener('wheel', preventScroll, { passive: false } as any)
      document.removeEventListener('touchmove', preventScroll as any, { passive: false } as any)
    }

    const preventScroll = (e: Event) => {
      e.preventDefault()
    }
    
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return
      
      // Add a small threshold to distinguish between click and drag
      const deltaX = Math.abs(e.clientX - dragStart.x)
      const deltaY = Math.abs(e.clientY - dragStart.y)
      
      if (deltaX < 3 && deltaY < 3) return // Don't move if it's just a small click
      
      const scaledDeltaX = (e.clientX - dragStart.x) / scale
      const scaledDeltaY = (e.clientY - dragStart.y) / scale
      
      const field = fields.find(f => f._id === isDragging)
      if (!field) return
      
      const newX = Math.max(0, field.x + scaledDeltaX)
      const newY = Math.max(0, field.y + scaledDeltaY)
      
      console.log('Dragging field:', isDragging, 'from', field.x, field.y, 'to', newX, newY)
      
      // Auto-scroll when dragging near edges
      const mainElement = document.querySelector('main') as HTMLElement
      const scrollSpeed = 15
      const edgeThreshold = 50 // pixels from edge to start scrolling
      
      if (mainElement) {
        const rect = mainElement.getBoundingClientRect()
        
        // Check if mouse is near the edges of the main element
        const nearLeft = e.clientX < rect.left + edgeThreshold
        const nearRight = e.clientX > rect.right - edgeThreshold
        const nearTop = e.clientY < rect.top + edgeThreshold
        const nearBottom = e.clientY > rect.bottom - edgeThreshold
        
        // Scroll the main element if near edges
        if (nearLeft && mainElement.scrollLeft > 0) {
          mainElement.scrollLeft -= scrollSpeed
        } else if (nearRight && mainElement.scrollLeft < mainElement.scrollWidth - mainElement.clientWidth) {
          mainElement.scrollLeft += scrollSpeed
        }
        
        if (nearTop && mainElement.scrollTop > 0) {
          mainElement.scrollTop -= scrollSpeed
        } else if (nearBottom && mainElement.scrollTop < mainElement.scrollHeight - mainElement.clientHeight) {
          mainElement.scrollTop += scrollSpeed
        }
      }
      
      // Update local state immediately for visual feedback
      setFields(prevFields => 
        prevFields.map(f => 
          f._id === isDragging 
            ? { ...f, x: newX, y: newY }
            : f
        )
      )
      setDragStart({ x: e.clientX, y: e.clientY })
      
      // For recipients, that's all we need (no backend call)
      if (isDocumentRecipient) {
        return
      }
      
      // For owners, also update backend with debouncing
      if (dragTimeout) {
        clearTimeout(dragTimeout)
      }
      
      dragTimeout = setTimeout(() => {
        updateFieldMutation.mutate({
          id: isDragging,
          data: { x: newX, y: newY }
        })
      }, 100) // Reduced from 16ms to 100ms to prevent 429 errors
    }
    
    if (isDragging) {
      // Allow scrolling during drag for auto-scroll functionality
      document.addEventListener('mouseup', handleGlobalMouseUp)
      document.addEventListener('mousemove', handleGlobalMouseMove)
    }
    
    return () => {
      if (dragTimeout) {
        clearTimeout(dragTimeout)
      }
      document.removeEventListener('mouseup', handleGlobalMouseUp)
      document.removeEventListener('mousemove', handleGlobalMouseMove)
    }
  }, [isDragging, dragStart, scale, fields])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedField && (e.key === 'Delete' || e.key === 'Backspace')) {
        // Prevent recipients from deleting fields
        if (isDocumentRecipient) {
          return;
        }
        
        e.preventDefault()
        const field = fields.find(f => f._id === selectedField)
        if (field) {
          if (window.confirm(`Are you sure you want to delete this ${field.type} field?${field.value ? ' This will also remove the signature/value.' : ''}`)) {
            deleteFieldMutation.mutate(selectedField)
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedField, fields, isDocumentRecipient])

  const getFieldStyle = (field: SignatureField) => {
    const isSelected = selectedField === field._id
    const isFilled = field.value && field.value.length > 0
    const isFieldDragging = isDragging === field._id
    
    // Multiply by current scale for rendering
    const baseStyle = {
      position: 'absolute' as const,
      left: field.x * scale,
      top: field.y * scale,
      width: field.width * scale,
      height: field.height * scale,
      border: isSelected ? '3px solid #2563EB' : (isFilled ? '2px solid #22C55E' : '2px dashed #9CA3AF'),
      backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.1)' : (isFilled ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.8)'), // Clean white background
      borderRadius: '4px',
      cursor: isPlacing ? 'default' : (isFieldDragging ? 'grabbing' : 'grab'),
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: field.type === 'initials' ? '20px' : '14px',
      overflow: 'hidden',
      zIndex: isFieldDragging ? 1000 : 1000, // Higher z-index for debugging
      pointerEvents: 'auto' as const,
      userSelect: 'none' as const,
      touchAction: 'none' as const, // Prevent touch scrolling on mobile
    }
    
    console.log('Field style for', field._id, ':', baseStyle);
    return baseStyle
  }

  const renderFieldContent = (field: SignatureField) => {
    // If field has a value, show it
    if (field.value) {
      if (field.type === 'signature' || field.type === 'initials' || field.type === 'witness') {
        if (field.value.startsWith('data:image')) {
          return <img src={field.value} alt="signature" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        }
        return <span style={{ fontFamily: 'cursive', fontSize: '20px', fontWeight: 'bold' }}>{field.value}</span>
      }
      if (field.type === 'checkbox') {
        return <Check className="h-6 w-6 text-green-600" />
      }
      return <span className="font-medium text-black px-2">{field.value}</span>
    }
    
    // Show placeholder if empty
    return (
      <div className="flex flex-col items-center text-black/60">
        {FIELD_TYPES.find(f => f.type === field.type)?.icon}
        <span className="text-xs mt-1 font-medium">{field.label}</span>
        <span className="text-[10px] text-black/50">Click to fill</span>
      </div>
    )
  }

  // Get current field for text modal
  const currentField = selectedField ? fields.find(f => f._id === selectedField) : null

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-transparent border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(`/documents/${id}`)} className="text-gray-700 hover:text-gray-900">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{docData?.data?.document?.title || 'Document'}</h1>
            <p className="text-sm text-gray-600">Page {pageNumber} of {numPages}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isPlacing && (
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm">
              <MousePointer className="h-4 w-4" />
              Click on PDF to place field
              <button 
                onClick={() => { setIsPlacing(false); setSelectedTool(null); }}
                className="ml-2 text-blue-800 hover:text-blue-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <select
            value={currentSigner}
            onChange={(e) => setCurrentSigner(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">Select Signer</option>
            {signers.map((signer, idx) => (
              <option key={idx} value={signer}>{signer === 'me' ? 'Me (Owner)' : signer}</option>
            ))}
          </select>

          {!isDocumentRecipient && (
            <button
              onClick={() => navigate(`/documents/${id}`)}
              className="px-4 py-2 bg-white text-gray-800 rounded-lg hover:bg-gray-100 flex items-center gap-2"
            >
              <Send className="h-4 w-4" /> Send
            </button>
          )}

          {!isDocumentRecipient && (
            <button
              onClick={handleFinalize}
              disabled={finalizeMutation.isPending}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
            >
              {finalizeMutation.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Finalizing...</>
              ) : (
                <><Check className="h-4 w-4" /> Finalize</>
              )}
            </button>
          )}

          {docData?.data?.document?.signedFilePath && (
            <button
              onClick={handleDownloadSigned}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Download className="h-4 w-4" /> Download Signed
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
          {!isDocumentRecipient && (
            <>
              <div className="p-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900 text-lg">Field Types</h2>
                <p className="text-sm text-gray-600 mt-1">Click a type, then click PDF to place it</p>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {FIELD_TYPES.map((fieldType) => (
                  <button
                    key={fieldType.type}
                    onClick={() => handleToolSelect(fieldType.type)}
                    aria-pressed={selectedTool === fieldType.type}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                      selectedTool === fieldType.type 
                        ? 'bg-blue-50 border-2 border-blue-500 text-blue-700' 
                        : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent text-gray-700'
                    } focus:outline-none focus:ring-2 focus:ring-blue-400`}
                  >
                    <div className={`p-2 rounded-lg ${
                      selectedTool === fieldType.type ? 'bg-blue-100 text-blue-600' : 'text-gray-500'
                    }`}>
                      {fieldType.icon}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium">{fieldType.label}</div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
          
          {isDocumentRecipient && (
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900 text-lg">Document Signing</h2>
              <p className="text-sm text-gray-600 mt-1">Click on signature fields to sign the document</p>
            </div>
          )}

          {/* Instructions */}
          <div className="p-4 bg-gray-50 border-t border-gray-200">
            <h3 className="font-semibold text-sm text-gray-900 mb-2">How to use:</h3>
            <ol className="text-xs text-gray-600 space-y-1 list-decimal pl-4">
              <li>Select a field type (left)</li>
              <li>Click on PDF to place it</li>
              <li>Click a placed field to edit or fill</li>
            </ol>
          </div>
        </aside>

        {/* PDF Viewer */}
        <main className="flex-1 bg-gray-100 p-8" style={{ overflow: 'auto', maxHeight: '70vh', maxWidth: '80vw' }}>
          <div className="flex justify-center">
            <div
              ref={containerRef}
              className={`relative shadow-lg ${isPlacing ? 'cursor-crosshair' : 'cursor-default'}`}
              onClick={handlePageClick}
              style={{ 
                pointerEvents: isDragging ? 'none' : 'auto',
                display: 'inline-block'
              }}
            >
              {docData?.data?.document?.fileName && docData?.data?.document?.fileSize > 0 ? (
                <PDFDoc
                  file={`/uploads/${docData?.data?.document?.fileName}`}
                  onLoadSuccess={onDocumentLoadSuccess}
                  loading={<Loader2 className="h-8 w-8 animate-spin" />}
                >
                  <PDFPage 
                    pageNumber={pageNumber} 
                    scale={scale} 
                    renderTextLayer={false} 
                    renderAnnotationLayer={false}
                    className="shadow-lg"
                  />
                </PDFDoc>
              ) : (
                <div className="w-[900px] h-[1100px] bg-white flex items-center justify-center text-center p-8">
                  <div>
                    <p className="text-xl font-semibold text-gray-700 mb-4">No PDF uploaded for this document</p>
                    <p className="text-sm text-gray-500 mb-6">This document was created from a template and doesn't have an attached PDF yet. Upload a file to enable signing and preview.</p>
                    <div className="flex justify-center gap-3">
                      <button onClick={() => navigate('/documents/upload')} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Upload File</button>
                      <button onClick={() => navigate(`/documents/${documentId}/recipients`)} className="px-4 py-2 border rounded-lg">Manage Recipients</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Fields Overlay - separate from PDF to capture clicks */}
              <div 
                className="absolute inset-0 pointer-events-none"
                style={{ zIndex: 50 }}
              >
                {/* Coordinate display for debugging */}
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  left: '10px',
                  backgroundColor: 'white',
                  padding: '10px',
                  border: '2px solid black',
                  zIndex: 10000,
                  fontSize: '12px'
                }}>
                  Field Position: {fields.filter(f => f.page === pageNumber).map(f => `${Math.round(f.x)}, ${Math.round(f.y)}`).join(', ') || 'No fields'}
                </div>
                {fields.filter(f => f.page === pageNumber).map((field) => (
                  <React.Fragment key={field._id}>
                    {/* Actual field */}
                    <div
                      style={{
                        ...getFieldStyle(field),
                        pointerEvents: 'auto',
                      }}
                      onMouseDown={(e) => handleMouseDown(field._id, e)}
                      onClick={(e) => {
                        if (!isDragging) {
                          handleFieldClick(field, e)
                        }
                      }}
                      className="hover:shadow-md transition-shadow"
                    >
                      {renderFieldContent(field)}
                      
                      {/* Delete button on hover for selected field */}
                      {selectedField === field._id && !isDragging && !isDocumentRecipient && (
                        <button
                          onClick={(e) => handleFieldDelete(field._id, e)}
                          className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 z-10"
                          title={`Delete ${field.type} field`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </main>

        {/* Right Sidebar - Properties */}
        {selectedField && currentField && (
          <aside className="w-72 bg-white border-l border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Field Properties</h3>
              <button onClick={() => setSelectedField(null)} className="text-gray-500 hover:text-gray-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <div className="px-3 py-2 bg-gray-100 rounded text-sm capitalize font-medium">
                  {FIELD_TYPES.find(f => f.type === currentField.type)?.icon}
                  <span className="ml-2">{currentField.type}</span>
                </div>
              </div>

              {currentField.value && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700 text-sm font-medium mb-1">
                    <Check className="h-4 w-4" /> Filled
                  </div>
                  <div className="text-xs text-green-600 truncate">
                    {currentField.value.length > 50 ? currentField.value.substring(0, 50) + '...' : currentField.value}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
                <input
                  type="text"
                  value={currentField.label || ''}
                  onChange={(e) => updateFieldMutation.mutate({ id: currentField._id, data: { label: e.target.value } })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                <select
                  value={currentField.assignedTo || ''}
                  onChange={(e) => updateFieldMutation.mutate({ id: currentField._id, data: { assignedTo: e.target.value } })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  {signers.map((signer, idx) => (
                    <option key={idx} value={signer}>{signer === 'me' ? 'Me (Owner)' : signer}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">X</label>
                  <input
                    type="number"
                    value={Math.round(currentField.x)}
                    onChange={(e) => updateFieldMutation.mutate({ id: currentField._id, data: { x: Number(e.target.value) } })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Y</label>
                  <input
                    type="number"
                    value={Math.round(currentField.y)}
                    onChange={(e) => updateFieldMutation.mutate({ id: currentField._id, data: { y: Number(e.target.value) } })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (currentField.type === 'signature' || currentField.type === 'initials' || currentField.type === 'witness') {
                      setIsSignatureModalOpen(true)
                    } else {
                      setIsTextModalOpen(true)
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 flex items-center justify-center gap-2"
                >
                  <Edit3 className="h-4 w-4" />
                  {currentField.value ? 'Edit' : 'Fill'}
                </button>

                <button
                  onClick={(e) => handleFieldDelete(currentField._id, e as any)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2 disabled:opacity-50"
                  title={`Delete ${currentField.type} field`}
                  disabled={isDocumentRecipient}
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-center gap-4">
        <button
          onClick={() => setPageNumber(p => Math.max(1, p - 1))}
          disabled={pageNumber <= 1}
          className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 flex items-center gap-1 text-gray-700 hover:bg-gray-50"
        >
          <ChevronLeft className="h-4 w-4" /> Previous
        </button>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Page</span>
          <input
            type="number"
            min={1}
            max={numPages}
            value={pageNumber}
            onChange={(e) => setPageNumber(Math.max(1, Math.min(numPages, Number(e.target.value))))}
            className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
          />
          <span className="text-sm text-gray-600">of {numPages}</span>
        </div>

        <button
          onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
          disabled={pageNumber >= numPages}
          className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 flex items-center gap-1 text-gray-700 hover:bg-gray-50"
        >
          Next <ChevronRight className="h-4 w-4" />
        </button>

        <select value={scale} onChange={(e) => setScale(Number(e.target.value))} className="px-2 py-1 border border-gray-300 rounded ml-4">
          <option value={0.8}>80%</option>
          <option value={1.0}>100%</option>
          <option value={1.2}>120%</option>
          <option value={1.5}>150%</option>
          <option value={2.0}>200%</option>
        </select>
      </footer>

      {/* Signature Modal */}
      <SignatureModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        onSave={handleSignatureSave}
        title={currentField?.type === 'initials' ? 'Add Initials' : currentField?.type === 'witness' ? 'Add Witness Signature' : 'Add Signature'}
      />

      {/* Text Input Modal */}
      <TextInputModal
        isOpen={isTextModalOpen}
        onClose={() => setIsTextModalOpen(false)}
        onSave={handleTextSave}
        title={`Fill ${currentField?.label || currentField?.type || 'Field'}`}
        placeholder={`Enter ${currentField?.type || 'value'}...`}
        initialValue={currentField?.value || ''}
      />
    </div>
  )
}
