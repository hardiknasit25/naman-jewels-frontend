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
 * Draw the selected crop rectangle to a canvas and re-encode it as a JPEG data URL.
 *
 * Re-encoding is deliberate: uploads are stored as Base64 in the database, and a
 * raw phone photo is several megabytes. Capping the longest edge at `maxSize` and
 * exporting JPEG keeps product payloads small enough for the customer app to load.
 * Transparency is flattened onto white since JPEG has no alpha channel.
 */
export async function cropImageToDataUrl(
  src: string,
  crop: CropArea,
  maxSize = 1200,
  quality = 0.85
): Promise<string> {
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

  return canvas.toDataURL('image/jpeg', quality)
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
