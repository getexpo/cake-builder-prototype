import { createClient } from '@supabase/supabase-js'

// One Supabase client for the whole site (customer app, partner apps, admin).
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim()
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

export const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null

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
