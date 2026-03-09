import { useState, useRef } from 'react'
import { UploadProgress } from '../types'
import imageCompression from 'browser-image-compression'

interface PhotoUploadProps {
  eventId: string
  onUploadComplete: () => void
}

export default function PhotoUpload({ eventId, onUploadComplete }: PhotoUploadProps) {
  const [uploads, setUploads] = useState<UploadProgress[]>([])
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = async (files: FileList) => {
    const fileArray = Array.from(files)
    const initialUploads: UploadProgress[] = fileArray.map(file => ({
      file,
      progress: 0,
      status: 'pending',
    }))

    // Save starting index to update the correct items in the state later
    const startIndex = uploads.length
    setUploads(prev => [...prev, ...initialUploads])

    // Configuration for concurrency (how many files to process/upload at once)
    const CONCURRENCY_LIMIT = 5
    let activeTasks = 0
    let nextFileIndex = 0

    const processNext = async () => {
      if (nextFileIndex >= fileArray.length) return

      const currentIndex = nextFileIndex++
      const uploadIndex = startIndex + currentIndex
      const file = fileArray[currentIndex]
      activeTasks++

      try {
        // --- 1. Compression ---
        setUploads(prev => {
          const updated = [...prev]
          updated[uploadIndex] = { ...updated[uploadIndex], status: 'compressing' }
          return updated
        })

        const options = {
          maxSizeMB: 1.5,
          maxWidthOrHeight: 2048,
          useWebWorker: true,
          initialQuality: 0.85
        }

        let processedFile: File = file
        if (file.type.startsWith('image/')) {
          try {
            processedFile = await imageCompression(file, options)
            console.log(`Compressed ${file.name}: ${Math.round(file.size / 1024)}KB -> ${Math.round(processedFile.size / 1024)}KB`)
          } catch (e) {
            console.warn('Compression failed, using original', e)
          }
        }

        // --- 2. Upload ---
        setUploads(prev => {
          const updated = [...prev]
          updated[uploadIndex] = { ...updated[uploadIndex], status: 'uploading' }
          return updated
        })

        const { eventsApi } = await import('../api/events')
        await eventsApi.uploadPhoto(eventId, processedFile, (progress) => {
          setUploads(prev => {
            const updated = [...prev]
            updated[uploadIndex] = { ...updated[uploadIndex], progress }
            return updated
          })
        })

        // --- 3. Processing (AI etc) ---
        setUploads(prev => {
          const updated = [...prev]
          updated[uploadIndex] = { ...updated[uploadIndex], status: 'processing', progress: 100 }
          return updated
        })

        // Simulate wait for AWS Rekognition processing (usually takes 2-5s)
        await new Promise(r => setTimeout(r, 2000))

        setUploads(prev => {
          const updated = [...prev]
          updated[uploadIndex] = { ...updated[uploadIndex], status: 'completed' }
          return updated
        })

        // Notify parent to refresh gallery
        onUploadComplete()

      } catch (error) {
        console.error('Upload task failed:', error)
        setUploads(prev => {
          const updated = [...prev]
          updated[uploadIndex] = {
            ...updated[uploadIndex],
            status: 'error',
            error: 'Upload failed',
          }
          return updated
        })
      } finally {
        activeTasks--
        // Start next task
        processNext()
      }
    }

    // Start initial pool of workers
    for (let j = 0; j < Math.min(CONCURRENCY_LIMIT, fileArray.length); j++) {
      processNext()
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }

  return (
    <div className="space-y-6">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={() => setDragging(false)}
        className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 group ${dragging
          ? 'border-primary-500 bg-primary-500/10'
          : 'border-white/20 hover:border-primary-400 hover:bg-white/5'
          }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="hidden"
        />

        <div className={`w-20 h-20 mx-auto bg-white/10 rounded-full flex items-center justify-center mb-6 transition-transform duration-300 ${dragging ? 'scale-110' : 'group-hover:scale-110'}`}>
          <svg className={`w-10 h-10 text-white transition-opacity ${dragging ? 'opacity-100' : 'opacity-70'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>

        <div className="space-y-2">
          <p className="text-xl font-medium text-white">Upload Photos</p>
          <p className="text-gray-400">
            Drag files here or{' '}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-primary-400 hover:text-primary-300 font-semibold underline decoration-2 underline-offset-4 transition-colors"
            >
              browse files
            </button>
          </p>
          <p className="text-xs text-gray-500 pt-2 italic">Max optimization enabled (Up to 10x faster uploads)</p>
        </div>
      </div>

      {uploads.length > 0 && (
        <div className="space-y-3 animate-fade-in max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          <div className="flex justify-between items-center sticky top-0 bg-dark-900 z-10 py-1">
            <h3 className="font-semibold text-white">Upload Queue</h3>
            <span className="text-xs text-gray-400">
              {uploads.filter(u => u.status === 'completed').length} / {uploads.length} Done
            </span>
          </div>

          {uploads.map((upload, index) => (
            <div key={index} className="glass-panel p-3 flex items-center gap-3">
              <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-white truncate pr-4">
                    {upload.file.name}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    {upload.status === 'completed' && <span className="text-green-400">Done</span>}
                    {upload.status === 'error' && <span className="text-red-400">Error</span>}
                    {upload.status === 'compressing' && <span className="text-yellow-400 animate-pulse">Compressing...</span>}
                    {upload.status === 'processing' && <span className="text-blue-400 animate-pulse">AI Analysis...</span>}
                    {upload.status === 'uploading' && <span className="text-primary-400">{Math.round(upload.progress)}%</span>}
                    {upload.status === 'pending' && <span className="text-gray-500">Wait...</span>}
                  </span>
                </div>

                <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${upload.status === 'error' ? 'bg-red-500' :
                        upload.status === 'completed' ? 'bg-green-500' :
                          upload.status === 'compressing' ? 'bg-yellow-500' :
                            'bg-gradient-to-r from-primary-500 to-secondary-500'
                      }`}
                    style={{ width: `${upload.progress || (upload.status === 'completed' ? 100 : 0)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
