import React, { useState } from 'react'
import { X, Eye, Upload, FileText, Image } from 'lucide-react'

interface FileUploadProps {
  file: File | null | undefined
  fileName: string
  onFileChange: (file: File | null) => void
  onFileNameChange: (name: string) => void
  accept?: string
  disabled?: boolean
  label?: string
  optional?: boolean
}

const FileUpload: React.FC<FileUploadProps> = ({
  file,
  fileName,
  onFileChange,
  onFileNameChange,
  accept = ".pdf,.jpg,.jpeg,.png",
  disabled = false,
  label,
  optional = false
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null
    onFileChange(selectedFile)
    onFileNameChange(selectedFile?.name || '')
    
    // Create preview for images
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(selectedFile)
      setPreviewUrl(url)
    } else {
      setPreviewUrl(null)
    }
  }

  const handleCancel = () => {
    onFileChange(null)
    onFileNameChange('')
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
  }

  const handleView = () => {
    if (file) {
      const url = URL.createObjectURL(file)
      const newWindow = window.open(url, '_blank')
      if (newWindow) {
        newWindow.onload = () => {
          URL.revokeObjectURL(url)
        }
      }
    }
  }

  const getFileIcon = () => {
    if (!fileName) return <Upload size={16} />
    
    const extension = fileName.split('.').pop()?.toLowerCase()
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension || '')) {
      return <Image size={16} />
    }
    return <FileText size={16} />
  }

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
          {label}
          {optional && <span className="ml-2 text-xs text-gray-400">(optional)</span>}
        </label>
      )}
      
      {!fileName ? (
        <div className="relative">
          <input
            type="file"
            accept={accept}
            onChange={handleFileChange}
            disabled={disabled}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
      ) : (
        <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="text-gray-500 dark:text-gray-400">
              {getFileIcon()}
            </div>
            <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
              {fileName}
            </span>
          </div>
          
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleView}
              disabled={disabled}
              className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="View document"
            >
              <Eye size={16} />
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={disabled}
              className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Remove file"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
      
      {previewUrl && (
        <div className="mt-2">
          <img 
            src={previewUrl} 
            alt="Preview" 
            className="max-w-full h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
          />
        </div>
      )}
    </div>
  )
}

export default FileUpload
