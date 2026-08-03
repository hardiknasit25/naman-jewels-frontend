import { useCallback, useEffect, useRef, useState } from 'react'
import ReactCrop, {
  centerCrop,
  convertToPixelCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop,
} from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { toast } from 'sonner'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/responsive-dialog'
import { cropImageToDataUrl, type CropArea } from '@/lib/cropImage'

/** Smallest crop the user may drag, in on-screen pixels. */
const MIN_CROP_PX = 24
/** How much of the image the starting crop box covers. */
const INITIAL_CROP_PERCENT = 90

/**
 * Starting crop: centred, covering most of the image, and trimmed to `aspect`
 * when one is locked.
 */
function initialCrop(aspect: number | null, width: number, height: number): Crop {
  const base = { unit: '%' as const, x: 0, y: 0, width: INITIAL_CROP_PERCENT, height: INITIAL_CROP_PERCENT }
  return centerCrop(
    aspect == null ? base : makeAspectCrop(base, aspect, width, height),
    width,
    height
  )
}

/**
 * Translate a crop measured against the displayed image into the source image's
 * own pixels, which is what the canvas export works in.
 *
 * With a locked aspect the ratio is snapped back afterwards: the display box is
 * whole pixels, so scaling it up can drift the ratio by a fraction of a pixel
 * and a banner has to come out exactly 16:9.
 */
function toSourceArea(image: HTMLImageElement, crop: PixelCrop, aspect: number | null): CropArea {
  const scaleX = image.naturalWidth / image.width
  const scaleY = image.naturalHeight / image.height

  const x = Math.max(0, crop.x * scaleX)
  const y = Math.max(0, crop.y * scaleY)
  let width = Math.min(crop.width * scaleX, image.naturalWidth - x)
  let height = Math.min(crop.height * scaleY, image.naturalHeight - y)

  if (aspect != null) {
    height = width / aspect
    // Only possible on a sub-pixel overshoot, so the trim is imperceptible.
    if (y + height > image.naturalHeight) {
      height = image.naturalHeight - y
      width = height * aspect
    }
  }

  return { x, y, width, height }
}

interface ImageCropperDialogProps {
  /**
   * Images queued for cropping, as data URLs or image URLs. The dialog is open
   * whenever this is non-empty and walks the queue one image at a time.
   */
  sources: string[]
  /**
   * Crop box ratio — 1 for square category tiles, 16/9 for banners, or `null` for
   * a free crop where any rectangle can be drawn (products).
   */
  aspect: number | null
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
 * The whole image stays on screen and the user drags a selection over it: with
 * `aspect = null` that selection is any size and shape they like, and with an
 * `aspect` the library holds the ratio while they resize, so banners can only
 * ever be saved as 16:9.
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
  // Held in percent so the selection survives the dialog being resized; it is
  // converted to pixels only at export time, against the image's current size.
  const [crop, setCrop] = useState<Crop>()
  const [saving, setSaving] = useState(false)

  const imgRef = useRef<HTMLImageElement>(null)

  const open = sources.length > 0
  const current = sources[index]
  const isLast = index === sources.length - 1

  // Restart the walk whenever a fresh queue arrives.
  useEffect(() => {
    if (!open) return
    setIndex(0)
    setDone([])
  }, [open, sources])

  // Dropped so the next image is never briefly shown with the previous one's
  // selection before its own onLoad re-centres it.
  useEffect(() => {
    setCrop(undefined)
  }, [index])

  /** Centre a fresh selection on the image currently on screen. */
  const resetCrop = useCallback(() => {
    const image = imgRef.current
    if (!image?.width || !image.height) return
    // Seeded on load as well as on drag so "Use image" works without the user
    // having to touch the box first.
    setCrop(initialCrop(aspect, image.width, image.height))
  }, [aspect])

  // A locked ratio can change while the dialog is mounted (different call sites
  // reuse it), so re-centre rather than leave a selection at the old shape.
  useEffect(() => {
    if (imgRef.current?.complete) resetCrop()
  }, [resetCrop])

  const confirm = async () => {
    const image = imgRef.current
    if (!current || !image || !crop?.width || !crop.height) return
    const selection = convertToPixelCrop(crop, image.width, image.height)
    if (!selection.width || !selection.height) return
    setSaving(true)
    try {
      const cropped = await cropImageToDataUrl(current, toSourceArea(image, selection, aspect), maxSize)
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
      <DialogContent className="scrollbar-tw max-h-[90vh] overflow-y-auto sm:max-w-xl">
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
              (aspect == null
                ? 'Drag a box over the part you want to keep — any size or shape.'
                : 'Drag a box over the part you want to keep. The ratio stays locked as you resize.')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-48 w-full items-center justify-center overflow-hidden rounded-lg bg-muted p-2">
          {current && (
            <ReactCrop
              crop={crop}
              aspect={aspect ?? undefined}
              minWidth={MIN_CROP_PX}
              minHeight={MIN_CROP_PX}
              // Without this a click outside the box clears the selection and
              // leaves nothing to export.
              keepSelection
              ruleOfThirds
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              className="max-w-full"
            >
              <img
                ref={imgRef}
                src={current}
                alt="Crop preview"
                // Contained so the whole frame is reachable on any screen; the
                // export reads from the source image, so this costs no quality.
                className="max-h-[50vh] w-auto max-w-full select-none object-contain"
                onLoad={resetCrop}
              />
            </ReactCrop>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {aspect === 16 / 9
              ? 'Locked to 16:9'
              : aspect === 1
                ? 'Locked to a square'
                : 'Free size — drag the corners or edges'}
          </p>
          <Button type="button" variant="ghost" size="sm" onClick={resetCrop}>
            <RotateCcw className="size-4" /> Reset
          </Button>
        </div>

        <DialogFooter className="pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={confirm} disabled={!crop?.width || saving}>
            {isLast ? 'Use image' : 'Next image'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
