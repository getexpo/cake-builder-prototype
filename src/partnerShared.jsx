import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient.js'
import './partner.css'

export function useSession() {
  const [state, setState] = useState({ loading: true, session: null })
  useEffect(() => {
    if (!supabase) {
      setState({ loading: false, session: null })
      return undefined
    }
    let active = true
    supabase.auth.getSession().then(({ data }) => { if (active) setState({ loading: false, session: data.session }) })
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED') return
      if (active) setState({ loading: false, session })
    })
    return () => { active = false; listener.subscription.unsubscribe() }
  }, [])
  return state
}

export function signInWithGoogle(path) {
  return supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}${path}` } })
}

export function signOut() {
  return supabase.auth.signOut()
}

export function money(value) {
  return `$${Number(value || 0).toFixed(2)}`
}

export function when(value) {
  if (!value) return ''
  return new Date(value).toLocaleString('en-CA', { timeZone: 'America/Vancouver', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export const STATUS_LABELS = {
  new: 'New',
  confirmed: 'Confirmed',
  baking: 'Baking',
  ready: 'Ready',
  out_for_delivery: 'Out for delivery',
  picked_up: 'Picked up',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  pending: 'Pending review',
  approved: 'Approved',
  rejected: 'Not approved',
  suspended: 'Suspended',
}

export function Badge({ status }) {
  return <span className={`pt-badge is-${status}`}>{STATUS_LABELS[status] || status}</span>
}

export function Shell({ title, subtitle, user, tabs, tab, onTab, children, wide }) {
  return (
    <div className="pt-root">
      <header className="pt-top">
        <div className="pt-top-inner">
          <a href="/" className="pt-brand" aria-label="Back to the customer app"><span className="pt-logo" aria-hidden="true">🎂</span><span>{title}</span></a>
          {user ? <button type="button" className="pt-link-btn" onClick={signOut}>Sign out</button> : null}
        </div>
        {tabs ? (
          <nav className="pt-tabs" aria-label={`${title} sections`}>
            {tabs.map((item) => (
              <button key={item.id} type="button" className={tab === item.id ? 'is-active' : ''} aria-current={tab === item.id ? 'page' : undefined} onClick={() => onTab(item.id)}>
                {item.label}{item.count ? <span className="pt-count">{item.count}</span> : null}
              </button>
            ))}
          </nav>
        ) : null}
      </header>
      <main className={`pt-main ${wide ? 'is-wide' : ''}`}>
        {subtitle ? <p className="pt-muted pt-subtitle">{subtitle}</p> : null}
        {children}
      </main>
    </div>
  )
}

export function SignInScreen({ title, heading, points, path }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <Shell title={title}>
      <section className="pt-hero">
        <h1>{heading}</h1>
        <ul className="pt-points">
          {points.map((point) => <li key={point}>{point}</li>)}
        </ul>
        {supabase ? (
          <button type="button" className="pt-btn is-large" disabled={busy} onClick={async () => {
            setBusy(true)
            const { error: err } = await signInWithGoogle(path)
            if (err) { setError(err.message); setBusy(false) }
          }}>{busy ? 'Opening Google…' : 'Continue with Google'}</button>
        ) : <p className="pt-error">Sign-in is not configured on this site.</p>}
        {error ? <p className="pt-error" role="alert">{error}</p> : null}
      </section>
    </Shell>
  )
}

export function Loading({ title }) {
  return <Shell title={title}><p className="pt-muted" role="status">Loading…</p></Shell>
}

export function Field({ label, hint, children, required }) {
  return (
    <label className="pt-field">
      <span className="pt-label">{label}{required ? <span className="pt-req" aria-hidden="true"> *</span> : <span className="pt-muted"> · optional</span>}</span>
      {children}
      {hint ? <span className="pt-hint">{hint}</span> : null}
    </label>
  )
}

export function Check({ checked, onChange, children }) {
  return (
    <label className="pt-check">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{children}</span>
    </label>
  )
}

export function FileField({ label, hint, required, value, onChange }) {
  return (
    <label className="pt-field">
      <span className="pt-label">{label}{required ? <span className="pt-req" aria-hidden="true"> *</span> : <span className="pt-muted"> · optional</span>}</span>
      <span className={`pt-file ${value ? 'has-file' : ''}`}>
        <input type="file" accept="image/*,application/pdf" onChange={(event) => onChange(event.target.files?.[0] || null)} />
        <span>{value ? `✓ ${value.name}` : 'Choose a photo or PDF'}</span>
      </span>
      {hint ? <span className="pt-hint">{hint}</span> : null}
    </label>
  )
}

export function Notice({ kind = 'info', children }) {
  return <div className={`pt-notice is-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>{children}</div>
}

export const BC_AREAS = ['Vancouver', 'Burnaby', 'Richmond', 'Surrey', 'Coquitlam', 'North Vancouver', 'West Vancouver', 'New Westminster', 'Delta', 'Langley', 'Port Coquitlam', 'Port Moody', 'Maple Ridge', 'White Rock', 'Victoria', 'Kelowna', 'Abbotsford', 'Other BC']
