'use client'

import { useState } from 'react'
import { Camera, X, ZoomIn } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

interface Props {
  src?: string | null
  alt: string
  label?: string
  className?: string
}

export function PhotoView({ src, alt, label, className }: Props) {
  const [open, setOpen] = useState(false)
  if (!src) {
    return (
      <div className={`flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 text-muted-foreground ${className ?? ''}`}>
        <Camera className="size-5 opacity-50" />
        <span className="text-xs">{label || 'بدون عکس'}</span>
      </div>
    )
  }
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`group relative overflow-hidden rounded-lg border border-border bg-muted ${className ?? ''}`}
        aria-label={alt}
      >
        <img src={src} alt={alt} className="h-full w-full object-cover transition group-hover:scale-105" />
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/40">
          <ZoomIn className="size-5 text-white opacity-0 transition group-hover:opacity-100" />
        </div>
        {label && (
          <span className="absolute bottom-0 right-0 left-0 bg-black/60 px-2 py-1 text-xs text-white">{label}</span>
        )}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl p-2" onCloseAutoFocus={() => {}}>
          <DialogTitle className="sr-only">{alt}</DialogTitle>
          <img src={src} alt={alt} className="max-h-[80vh] w-full rounded-lg object-contain" />
        </DialogContent>
      </Dialog>
    </>
  )
}
