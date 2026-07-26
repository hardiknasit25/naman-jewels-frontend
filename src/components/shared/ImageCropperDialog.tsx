import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import 'react-easy-crop/react-easy-crop.css'
import { toast } from 'sonner'
import { ZoomIn, ZoomOut, RotateCcw, Minimize2, Maximize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/responsive-dialog'
import { cropImageToDataUrl } from '@/lib/cropImage'

const MIN_ZOOM = 1
const MAX_ZOOM = 4
/** Smallest the crop box may shrink to, as a fraction of the largest box that fits. */
const MIN_CROP_SCALE = 0.3
/** Breathing room around the crop box so the corner handles stay easy to grab. */
const FRAME_INSET = 16

/** Corner handles — resizing is symmetric about the centre, so all four behave alike. */
const CORNERS = [
  { id: 'nw', position: '-left-px -top-px', cursor: 'nwse-resize', edges: 'border-l-2 border-t-2 rounded-tl' },
  { id: 'ne', position: '-right-px -top-px', cursor: 'nesw-resize', edges: 'border-r-2 border-t-2 rounded-tr' },
  { id: 'sw', position: '-bottom-px -left-px', cursor: 'nesw-resize', edges: 'border-b-2 border-l-2 rounded-bl' },
  { id: 'se', position: '-bottom-px -right-px', cursor: 'nwse-resize', edges: 'border-b-2 border-r-2 rounded-br' },
] as const

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

interface ImageCropperDialogProps {
  /**
   * Images queued for cropping, as data URLs or image URLs. The dialog is open
   * whenever this is non-empty and walks the queue one image at a time.
   */
  sources: string[]
  /** Crop box ratio — 1 for square product/category tiles, 16/9 for banners. */
  aspect: number
  /** Cropped images, in the same order as `sources`. Fires once the queue ends. */
  onComplete: (images: string[]) => void
  /** User backed out — nothing from this queue should be kept. */
  onCancel: () => void
  title?: string
  description?: string
  /** Longest edge of the exported image, in pixels. */
  maxSize?: number
}

/**
 * Crop-before-upload dialog shared by products, categories and banners.
 *
 * Every image entering the app goes through here so tiles line up in the customer
 * app instead of inheriting whatever aspect ratio the phone camera produced. The
 * export also downsizes and re-encodes, which keeps the Base64 payloads small.
 *
 * The crop box itself is resizable by its corner handles (or the size slider) and
 * always keeps `aspect` — the ratio is locked, only how much of the frame the box
 * covers changes. Dragging anywhere else moves the image underneath it.
 */
export function ImageCropperDialog({
  sources,
  aspect,
  onComplete,
  onCancel,
  title = 'Crop image',
  description,
  maxSize,
}: ImageCropperDialogProps) {
  const [index, setIndex] = useState(0)
  const [done, setDone] = useState<string[]>([])
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(MIN_ZOOM)
  const [cropScale, setCropScale] = useState(1)
  const [area, setArea] = useState<Area | null>(null)
  const [saving, setSaving] = useState(false)
  const [frame, setFrame] = useState({ width: 0, height: 0 })
  // Size the image is actually drawn at (letterboxed inside the frame), reported
  // by the cropper once each image loads.
  const [media, setMedia] = useState<{ width: number; height: number } | null>(null)

  const frameRef = useRef<HTMLDivElement>(null)
  const resizingRef = useRef(false)

  const open = sources.length > 0
  const current = sources[index]
  const isLast = index === sources.length - 1

  // Restart the walk whenever a fresh queue arrives.
  useEffect(() => {
    if (!open) return
    setIndex(0)
    setDone([])
  }, [open, sources])

  // The crop box is sized in pixels, so the frame has to be measured (and
  // re-measured when the dialog is resized or rotated).
  useEffect(() => {
    if (!open) return
    const el = frameRef.current
    if (!el) return
    const measure = () => setFrame({ width: el.clientWidth, height: el.clientHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [open])

  // Largest box of the requested ratio that fits inside the frame AND inside the
  // displayed image. Bounding by the image mirrors what react-easy-crop does on
  // its own, and is what guarantees the crop is always fully covered — a box
  // wider than a portrait photo would export white bars down the sides.
  const maxCrop = useMemo(() => {
    const frameWidth = frame.width - FRAME_INSET
    const frameHeight = frame.height - FRAME_INSET
    if (frameWidth <= 0 || frameHeight <= 0) return null
    const fitWidth = Math.min(media?.width ?? frameWidth, frameWidth)
    const fitHeight = Math.min(media?.height ?? frameHeight, frameHeight)
    const width = fitWidth > fitHeight * aspect ? fitHeight * aspect : fitWidth
    return { width, height: width / aspect }
  }, [frame, aspect, media])

  // Passing cropSize (instead of aspect) is what makes the box resizable; the
  // ratio stays locked because both edges are derived from the same scale.
  const cropSize = useMemo(
    () =>
      maxCrop
        ? { width: maxCrop.width * cropScale, height: maxCrop.height * cropScale }
        : undefined,
    [maxCrop, cropScale]
  )

  // Each image starts centred, unzoomed and at full crop size rather than
  // inheriting the previous one's view.
  const resetView = useCallback(() => {
    setCrop({ x: 0, y: 0 })
    setZoom(MIN_ZOOM)
    setCropScale(1)
    // Dropped so the next image's box is sized from its own dimensions, not the
    // previous one's, in the frame between switching and onMediaLoaded firing.
    setMedia(null)
  }, [])

  useEffect(() => {
    resetView()
  }, [index, resetView])

  // Resize from a corner: the box is centred, so the scale is driven by how far
  // the pointer is from the centre. Whichever axis is further out wins, which
  // keeps the dragged corner under the pointer as closely as the ratio allows.
  const resizeToPointer = (clientX: number, clientY: number) => {
    const el = frameRef.current
    if (!el || !maxCrop) return
    const rect = el.getBoundingClientRect()
    const dx = Math.abs(clientX - (rect.left + rect.width / 2))
    const dy = Math.abs(clientY - (rect.top + rect.height / 2))
    const width = Math.max(dx * 2, dy * 2 * aspect)
    setCropScale(clamp(width / maxCrop.width, MIN_CROP_SCALE, 1))
  }

  const confirm = async () => {
    if (!current || !area) return
    setSaving(true)
    try {
      const cropped = await cropImageToDataUrl(current, area, maxSize)
      const next = [...done, cropped]
      if (isLast) {
        onComplete(next)
      } else {
        setDone(next)
        setIndex((i) => i + 1)
      }
    } catch {
      toast.error('Could not crop this image')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {title}
            {sources.length > 1 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {index + 1} of {sources.length}
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            {description ??
              'Drag to reposition, pull a corner to resize the crop, and zoom to fill it.'}
          </DialogDescription>
        </DialogHeader>

        {/* react-easy-crop fills its nearest positioned ancestor, so the frame
            needs an explicit height. */}
        <div
          ref={frameRef}
          className="relative h-72 w-full overflow-hidden rounded-lg bg-muted sm:h-96"
        >
          {current && (
            <Cropper
              image={current}
              crop={crop}
              zoom={zoom}
              // cropSize wins once the frame is measured; aspect covers the first
              // paint before that happens.
              aspect={aspect}
              cropSize={cropSize}
              minZoom={MIN_ZOOM}
              maxZoom={MAX_ZOOM}
              restrictPosition
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onMediaLoaded={({ width, height }) => setMedia({ width, height })}
              onCropComplete={(_, pixels) => setArea(pixels)}
            />
          )}

          {/* Resize handles, laid over the crop box. Only the handles capture
              pointer events — everywhere else still drags the image. */}
          {cropSize && (
            <div className="pointer-events-none absolute inset-0 z-10">
              <div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{ width: cropSize.width, height: cropSize.height }}
              >
                {CORNERS.map((corner) => (
                  <div
                    key={corner.id}
                    role="slider"
                    aria-label="Resize crop"
                    aria-valuemin={Math.round(MIN_CROP_SCALE * 100)}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(cropScale * 100)}
                    tabIndex={-1}
                    onPointerDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      e.currentTarget.setPointerCapture(e.pointerId)
                      resizingRef.current = true
                      resizeToPointer(e.clientX, e.clientY)
                    }}
                    onPointerMove={(e) => {
                      if (!resizingRef.current) return
                      resizeToPointer(e.clientX, e.clientY)
                    }}
                    onPointerUp={(e) => {
                      resizingRef.current = false
                      e.currentTarget.releasePointerCapture(e.pointerId)
                    }}
                    onPointerCancel={() => {
                      resizingRef.current = false
                    }}
                    className={`pointer-events-auto absolute size-7 touch-none ${corner.position}`}
                    style={{ cursor: corner.cursor }}
                  >
                    <div
                      className={`absolute inset-1.5 border-white/95 drop-shadow ${corner.edges}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <ZoomOut className="size-4 shrink-0 text-muted-foreground" />
            <input
              type="range"
              aria-label="Zoom"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
            />
            <ZoomIn className="size-4 shrink-0 text-muted-foreground" />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Reset crop"
              title="Reset"
              onClick={resetView}
            >
              <RotateCcw className="size-4" />
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <Minimize2 className="size-4 shrink-0 text-muted-foreground" />
            <input
              type="range"
              aria-label="Crop size"
              min={MIN_CROP_SCALE}
              max={1}
              step={0.01}
              value={cropScale}
              onChange={(e) => setCropScale(Number(e.target.value))}
              disabled={!maxCrop}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
            />
            <Maximize2 className="size-4 shrink-0 text-muted-foreground" />
            {/* Spacer keeps both sliders the same length as the row above. */}
            <div className="size-9 shrink-0" aria-hidden />
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={confirm} disabled={!area || saving}>
            {isLast ? 'Use image' : 'Next image'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
