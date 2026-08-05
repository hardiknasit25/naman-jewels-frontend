/** Crop rectangle in the source image's own pixels. */
export interface CropArea {
  x: number
  y: number
  width: number
  height: number
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    // Needed so a remote (non-data-URL) image doesn't taint the canvas and make
    // toDataURL throw. Data URLs are same-origin so this is a no-op for uploads.
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not load image'))
    img.src = src
  })
}

/**
 * Whether this browser's canvas can export WebP. Chrome, Edge, Firefox and
 * Safari 16.4+ all can; anything older silently hands back a PNG data URL from
 * toDataURL, which is how this check spots it. Cached — the answer can't change
 * while the page is open.
 */
let webpSupport: boolean | null = null
function supportsWebp(): boolean {
  if (webpSupport == null) {
    const probe = document.createElement('canvas')
    probe.width = 1
    probe.height = 1
    webpSupport = probe.toDataURL('image/webp').startsWith('data:image/webp')
  }
  return webpSupport
}

/**
 * Draw the selected crop rectangle to a canvas and re-encode it as a WebP (or
 * JPEG) blob, ready to POST to /api/uploads.
 *
 * Re-encoding is deliberate: a raw phone photo is several megabytes. Capping the
 * longest edge at `maxSize` and exporting WebP at q0.85 gives roughly a quarter
 * less weight than the equivalent JPEG at the same visible quality. Transparency
 * is flattened onto white — neither format is used here with an alpha channel.
 */
export async function cropImageToBlob(
  src: string,
  crop: CropArea,
  maxSize = 1600,
  quality = 0.85
): Promise<Blob> {
  const image = await loadImage(src)

  // Never upscale — a small source stays at its own size.
  const scale = Math.min(1, maxSize / Math.max(crop.width, crop.height))
  const width = Math.max(1, Math.round(crop.width * scale))
  const height = Math.max(1, Math.round(crop.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not supported in this browser')

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, width, height)

  const type = supportsWebp() ? 'image/webp' : 'image/jpeg'
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the image'))),
      type,
      quality
    )
  })
}

/** Read a picked File into a data URL the cropper can display. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.readAsDataURL(file)
  })
}
