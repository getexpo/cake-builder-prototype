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

// Sign up vs log in. Google creates the sign-in itself, so we remember which button was pressed:
// "login" only lets people in who already have an account in this app; "signup" creates one.
const INTENT_KEY = `cake-intent-${APP_AREA}`
export function setSignInIntent(intent) {
  try { window.sessionStorage.setItem(INTENT_KEY, intent) } catch { /* ignore */ }
}
export function takeSignInIntent() {
  try {
    const intent = window.sessionStorage.getItem(INTENT_KEY)
    window.sessionStorage.removeItem(INTENT_KEY)
    return intent
  } catch { return null }
}
export function peekSignInIntent() {
  try { return window.sessionStorage.getItem(INTENT_KEY) } catch { return null }
}
export function googleSignIn(redirectTo, intent) {
  setSignInIntent(intent)
  // select_account makes Google ask which account every time instead of signing in silently.
  return supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, queryParams: { prompt: 'select_account' } } })
}
