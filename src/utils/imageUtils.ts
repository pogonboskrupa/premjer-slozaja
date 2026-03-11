/**
 * Compresses an image blob to a base64 data URL with max size.
 */
export async function compressImage(
  blob: Blob,
  maxWidth = 1280,
  quality = 0.75
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(blob)

    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      let { width, height } = img

      if (width > maxWidth) {
        height = Math.round(height * (maxWidth / width))
        width = maxWidth
      }

      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas context unavailable'))
        return
      }

      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }

    img.src = url
  })
}

/**
 * Captures a still frame from a video element and returns a Blob.
 */
export function captureVideoFrame(video: HTMLVideoElement): Blob | null {
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight

  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.drawImage(video, 0, 0)

  let blob: Blob | null = null
  canvas.toBlob(b => { blob = b }, 'image/jpeg', 0.9)
  return blob
}

/**
 * Captures a frame from video as a Promise<Blob>.
 */
export function captureVideoFrameAsync(video: HTMLVideoElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      reject(new Error('Canvas context unavailable'))
      return
    }

    ctx.drawImage(video, 0, 0)
    canvas.toBlob(
      blob => {
        if (blob) resolve(blob)
        else reject(new Error('Failed to capture frame'))
      },
      'image/jpeg',
      0.9
    )
  })
}
