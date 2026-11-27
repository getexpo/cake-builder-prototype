import { supabase } from './supabaseClient.js'

const SHOP_BUCKET = 'shop-photos'
const ORDER_BUCKET = 'order-photos'
const MAX_INPUT = 25 * 1024 * 1024

// Shrink a photo on the phone before uploading: long side 1600 px, JPEG. Faster uploads, less storage.
export async function compressImage(file, maxSide = 1600, quality = 0.82) {
  if (!file || !/^image\//.test(file.type)) throw new Error('Choose a photo (JPG, PNG or HEIC).')
  if (file.size > MAX_INPUT) throw new Error(`${file.name} is too large. Choose a photo under 25 MB.`)
  let bitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new Error(`Couldn’t read ${file.name}. Try a JPG or PNG.`)
  }
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close?.()
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
  if (!blob) throw new Error('Couldn’t prepare that photo. Try another one.')
  return blob
}

function randomName() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}.jpg`
}

export async function uploadShopPhoto(bakeryId, file) {
  const blob = await compressImage(file)
  const path = `${bakeryId}/${randomName()}`
  const { error } = await supabase.storage.from(SHOP_BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: false })
  if (error) throw error
  return path
}

export async function removeShopPhoto(path) {
  if (!path) return
  await supabase.storage.from(SHOP_BUCKET).remove([path])
}

export function shopPhotoUrl(path) {
  if (!path) return ''
  if (/^https?:/.test(path)) return path
  const { data } = supabase.storage.from(SHOP_BUCKET).getPublicUrl(path)
  return data?.publicUrl || ''
}

export async function uploadOrderPhoto(userId, file) {
  const blob = await compressImage(file, 1400)
  const path = `${userId}/${randomName()}`
  const { error } = await supabase.storage.from(ORDER_BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: false })
  if (error) throw error
  return path
}

export async function orderPhotoUrls(paths) {
  if (!paths?.length) return []
  const { data, error } = await supabase.storage.from(ORDER_BUCKET).createSignedUrls(paths, 60 * 60)
  if (error) return []
  return (data || []).map((item) => item.signedUrl).filter(Boolean)
}
