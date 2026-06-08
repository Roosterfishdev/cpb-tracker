import { useEffect, useRef, useState } from 'react'
import { Camera, X } from 'lucide-react'
import type { MealPhoto } from '../lib/db'

interface MealPhotoUploadProps {
  photo?: MealPhoto
  onUpload: (file: File) => Promise<void>
  onDelete: () => Promise<void>
}

export function MealPhotoUpload({ photo, onUpload, onDelete }: MealPhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (!photo?.blob) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(photo.blob)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [photo?.blob, photo?.id])

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await onUpload(file)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <>
      <div className="mt-2 flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFile}
        />
        {previewUrl ? (
          <button
            type="button"
            onClick={() => setLightbox(true)}
            className="h-12 w-12 shrink-0 overflow-hidden rounded-xl shadow-sm"
          >
            <img src={previewUrl} alt="Meal" className="h-full w-full object-cover" />
          </button>
        ) : (
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="flex h-9 items-center gap-1.5 rounded-full bg-white px-3 text-xs font-semibold text-muted"
          >
            <Camera size={14} />
            {uploading ? 'Saving…' : 'Photo'}
          </button>
        )}
        {previewUrl && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-xs font-medium text-muted"
          >
            Replace
          </button>
        )}
      </div>

      {lightbox && previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-5">
          <div className="relative max-h-[85vh] w-full max-w-sm overflow-hidden rounded-card bg-surface p-3 shadow-card">
            <button
              type="button"
              onClick={() => setLightbox(false)}
              className="absolute right-4 top-4 z-10 rounded-full bg-surface-muted p-1.5"
              aria-label="Close"
            >
              <X size={18} />
            </button>
            <img
              src={previewUrl}
              alt="Meal preview"
              className="max-h-[60vh] w-full rounded-2xl object-contain"
            />
            <button
              type="button"
              onClick={async () => {
                await onDelete()
                setLightbox(false)
              }}
              className="mt-3 w-full min-h-[44px] rounded-full bg-pastel-pink/50 text-sm font-bold text-danger"
            >
              Delete photo
            </button>
          </div>
        </div>
      )}
    </>
  )
}

interface PhotoThumbnailProps {
  blob: Blob
  label?: string
  className?: string
}

export function PhotoThumbnail({ blob, label, className = 'h-14 w-14' }: PhotoThumbnailProps) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    const objectUrl = URL.createObjectURL(blob)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [blob])

  if (!url) return null

  return (
    <div className="flex flex-col items-center gap-1">
      <img
        src={url}
        alt={label ?? 'Meal photo'}
        className={`rounded-xl object-cover shadow-sm ${className}`}
      />
      {label && (
        <span className="max-w-[56px] truncate text-[10px] font-medium text-muted">{label}</span>
      )}
    </div>
  )
}
