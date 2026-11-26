import { createClient } from '@supabase/supabase-js'

// One Supabase client for the whole site (customer app, partner apps, admin).
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim()
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

// Each app keeps its own sign-in, so the same person can use one email/phone as a customer and as a
// bakery owner or driver, and signing into one app never signs them into another.
function appArea() {
  const path = typeof window === 'undefined' ? '/' : window.location.pathname
  if (path.startsWith('/bakery')) return 'bakery'
  if (path.startsWith('/driver')) return 'driver'
  if (path.startsWith('/admin')) return 'admin'
  return 'customer'
}
export const APP_AREA = appArea()

export const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { storageKey: `cake-auth-${APP_AREA}` } })
  : null

export const DOCS_BUCKET = 'partner-documents'

export function friendlyError(error) {
  const text = error?.message || String(error || '')
  if (/JWT|not authenticated|Auth session missing/i.test(text)) return 'Please sign in again.'
  if (/row-level security/i.test(text)) return 'You do not have permission to do that.'
  return text || 'Something went wrong. Please try again.'
}

export async function uploadDocument(userId, kind, file) {
  if (!supabase) throw new Error('Storage is not configured')
  if (file.size > 10 * 1024 * 1024) throw new Error(`${file.name} is larger than 10 MB`)
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '')
  const path = `${userId}/${kind}-${Date.now()}.${ext}`
  const { error } = await supabase.storage.from(DOCS_BUCKET).upload(path, file, { upsert: false, contentType: file.type || undefined })
  if (error) throw error
  return { path, name: file.name, size: file.size, uploadedAt: new Date().toISOString() }
}

export async function documentUrl(path) {
  const { data, error } = await supabase.storage.from(DOCS_BUCKET).createSignedUrl(path, 60 * 10)
  if (error) throw error
  return data.signedUrl
}
