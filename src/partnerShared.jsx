import { useEffect, useState } from 'react'
import { APP_AREA, googleSignIn, peekSignInIntent, supabase, takeSignInIntent } from './supabaseClient.js'
import { NotificationPrompt } from './widgets.jsx'
import { OTHER_COUNTRIES, REGIONS, SERVED_COUNTRIES, cleanPostal, postalLabel, postalProblem, regionLabel } from './places.js'
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

export function signInWithGoogle(path, intent = 'login') {
  return googleSignIn(`${window.location.origin}${path}`, intent)
}

// After Google sends someone back: if they pressed "Log in" but have no account in this app,
// sign them out again and say so, instead of quietly creating one.
export function useAccountGate(session, hasAccount, noAccountText) {
  const userId = session?.user?.id
  const [state, setState] = useState(() => ({ checking: peekSignInIntent() === 'login', notice: '' }))
  useEffect(() => {
    if (!userId) return undefined
    const intent = takeSignInIntent()
    if (intent !== 'login') { setState((current) => (current.checking ? { ...current, checking: false } : current)); return undefined }
    let live = true
    setState({ checking: true, notice: '' })
    Promise.resolve(hasAccount(session.user)).catch(() => true).then(async (ok) => {
      if (!live) return
      if (ok) { setState({ checking: false, notice: '' }); return }
      const email = session.user.email
      await supabase.auth.signOut()
      setState({ checking: false, notice: noAccountText ? noAccountText(email) : `There’s no account for ${email} here yet. Tap “Create an account” to sign up.` })
    })
    return () => { live = false }
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps
  return state
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

export function Shell({ title, subtitle, user, tabs, tab, onTab, children, wide, headerExtra }) {
  return (
    <div className="pt-root">
      <header className="pt-top">
        <div className="pt-top-inner">
          <a href="/" className="pt-brand" aria-label="Back to the customer app"><span className="pt-logo" aria-hidden="true">🎂</span><span>{title}</span></a>
          {headerExtra ? <div className="pt-top-extra">{headerExtra}</div> : null}
          {user ? <span className="pt-who"><span className="pt-who-email" title={user.email}>{user.email}</span><button type="button" className="pt-link-btn" onClick={signOut}>Sign out</button></span> : null}
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
        {user && APP_AREA === 'bakery' ? <NotificationPrompt text="Get notified the moment a new order or customer message comes in." /> : null}
        {subtitle ? <p className="pt-muted pt-subtitle">{subtitle}</p> : null}
        {children}
      </main>
    </div>
  )
}

export function SignInScreen({ title, heading, points, path, notice, signup = true, signupLabel = 'Create an account' }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const go = async (intent) => {
    setBusy(intent); setError('')
    const { error: err } = await signInWithGoogle(path, intent)
    if (err) { setError(err.message); setBusy('') }
  }
  return (
    <Shell title={title}>
      <section className="pt-hero">
        <h1>{heading}</h1>
        <ul className="pt-points">
          {points.map((point) => <li key={point}>{point}</li>)}
        </ul>
        {notice ? <p className="pt-notice-box" role="alert">{notice}</p> : null}
        {supabase ? (
          <div className="pt-auth-buttons">
            {signup ? <button type="button" className="pt-btn is-large" disabled={Boolean(busy)} onClick={() => go('signup')}>{busy === 'signup' ? 'Opening Google…' : signupLabel}</button> : null}
            <button type="button" className={`pt-btn is-large ${signup ? 'is-ghost' : ''}`} disabled={Boolean(busy)} onClick={() => go('login')}>{busy === 'login' ? 'Opening Google…' : signup ? 'I already have an account — Log in' : 'Log in with Google'}</button>
            <p className="pt-small pt-muted">Uses your Google account. You can use the same email here and in the customer app; each has its own sign-in.</p>
          </div>
        ) : <p className="pt-error">Sign-in is not configured on this site.</p>}
        {error ? <p className="pt-error" role="alert">{error}</p> : null}
      </section>
    </Shell>
  )
}

export function Loading({ title }) {
  return <Shell title={title}><p className="pt-muted" role="status">Loading…</p></Shell>
}

export function Field({ label, hint, children, required, error }) {
  return (
    <label className="pt-field">
      <span className="pt-label">{label}{required ? <span className="pt-req" aria-hidden="true"> *</span> : <span className="pt-muted"> · optional</span>}</span>
      {children}
      {error ? <span className="pt-field-error" role="alert">{error}</span> : hint ? <span className="pt-hint">{hint}</span> : null}
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

/* ---------- Bakery locations (branches) ---------- */

export function locationsProblem(locations) {
  const list = locations || []
  if (!list.length) return 'Add at least one location.'
  for (const [i, item] of list.entries()) {
    const n = list.length > 1 ? ` for location ${i + 1}` : ''
    if (list.length > 1 && !String(item.name || '').trim()) return `Name location ${i + 1} (e.g. “Kitsilano” or “Main St”) so customers can tell them apart.`
    if (!String(item.address || '').trim()) return `Add the street address${n}.`
    if (!String(item.city || '').trim()) return `Add the city${n}.`
    if (!String(item.province || '').trim()) return `Choose the ${regionLabel(item.country).toLowerCase()}${n}.`
    if (!String(item.postal || '').trim()) return `Add the ${postalLabel(item.country).toLowerCase()}${n}.`
    const bad = postalProblem(item.postal, item.country)
    if (bad) return `Check the ${postalLabel(item.country).toLowerCase()}${n}: ${bad}`
  }
  return ''
}

export function LocationsEditor({ locations, onChange, newLocation }) {
  const list = locations || []
  const update = (index, patch) => onChange(list.map((item, i) => (i === index ? { ...item, ...patch, ...(['address', 'city', 'province', 'postal', 'country'].some((key) => key in patch) ? { lat: undefined, lng: undefined } : {}) } : item)))
  return (
    <div className="pt-stack">
      <datalist id="pt-city-list">{BC_AREAS.filter((area) => area !== 'Other BC').map((area) => <option key={area} value={area} />)}</datalist>
      {list.map((location, index) => {
        const country = location.country || 'Canada'
        const regions = REGIONS[country] || []
        const postalError = postalProblem(location.postal, country)
        return (
          <div key={location.id} className="pt-location">
            <div className="pt-row">
              <strong>Location {index + 1}</strong>
              {list.length > 1 ? <button type="button" className="pt-link-btn" onClick={() => onChange(list.filter((_, i) => i !== index))}>Remove</button> : null}
            </div>
            <Field label="Location name" required={list.length > 1} hint={index === 0 ? 'e.g. “Kitsilano” or “Main St”. Customers see this when choosing where to order from.' : null}>
              <input className="pt-input" maxLength={40} value={location.name || ''} onChange={(e) => update(index, { name: e.target.value })} />
            </Field>
            <Field label="Street address" required hint={index === 0 ? 'Where drivers and customers pick up. Include the unit number if there is one.' : null}>
              <input className="pt-input" autoComplete={index === 0 ? 'address-line1' : 'off'} value={location.address || ''} onChange={(e) => update(index, { address: e.target.value })} />
            </Field>
            <div className="pt-grid-2">
              <Field label="City" required>
                <input className="pt-input" list="pt-city-list" autoComplete={index === 0 ? 'address-level2' : 'off'} value={location.city || ''} onChange={(e) => update(index, { city: e.target.value })} />
              </Field>
              <Field label={regionLabel(country)} required>
                <select className="pt-input" value={location.province || ''} onChange={(e) => update(index, { province: e.target.value })}>
                  <option value="" disabled>Choose…</option>
                  {regions.map((region) => <option key={region}>{region}</option>)}
                </select>
              </Field>
            </div>
            <div className="pt-grid-2">
              <Field label={postalLabel(country)} required error={postalError}>
                <input className="pt-input" autoComplete={index === 0 ? 'postal-code' : 'off'} autoCapitalize="characters" maxLength={10} value={location.postal || ''} onChange={(e) => update(index, { postal: e.target.value })} onBlur={(e) => update(index, { postal: cleanPostal(e.target.value, country) })} />
              </Field>
              <Field label="Country" required>
                <select className="pt-input" value={country} onChange={(e) => update(index, { country: e.target.value, province: e.target.value === 'Canada' ? 'British Columbia' : '', postal: '' })}>
                  {SERVED_COUNTRIES.map((name) => <option key={name}>{name}</option>)}
                  <option disabled>──────────</option>
                  {OTHER_COUNTRIES.map((name) => <option key={name} disabled>{name}</option>)}
                </select>
              </Field>
            </div>
          </div>
        )
      })}
      <button type="button" className="pt-btn is-ghost" onClick={() => onChange([...list, newLocation()])}>+ Add another location</button>
    </div>
  )
}

/* ---------- Work eligibility (immigration status + proof) ---------- */

export const IMMIGRATION_STATUSES = [
  { id: 'citizen', label: 'Canadian citizen' },
  { id: 'pr', label: 'Permanent resident' },
  { id: 'work', label: 'Work permit' },
  { id: 'study', label: 'Study permit (student)' },
]

export function eligibilityDocs(status) {
  if (status === 'citizen') return [{ id: 'birth_certificate', label: 'Birth certificate', required: true, hint: 'A clear photo or PDF. A Canadian passport photo page also works.' }]
  if (status === 'pr') return [
    { id: 'pr_card_front', label: 'PR card (front)', required: true },
    { id: 'pr_card_back', label: 'PR card (back)', required: true },
  ]
  if (status === 'work') return [{ id: 'work_permit', label: 'Work permit', required: true, hint: 'All pages that show your name, conditions and expiry date.' }]
  if (status === 'study') return [{ id: 'study_permit', label: 'Study permit', required: true, hint: 'Shows whether you may work off campus.' }]
  return []
}

export const needsPermitExpiry = (status) => status === 'work' || status === 'study'

export function eligibilityMissing(form, haveDoc, today) {
  if (!form.immigration_status) return ['your status in Canada']
  const missing = eligibilityDocs(form.immigration_status).filter((doc) => !haveDoc(doc.id)).map((doc) => `a copy of your ${doc.label.toLowerCase()}`)
  if (needsPermitExpiry(form.immigration_status)) {
    if (!form.permit_expiry) missing.push('your permit expiry date')
    else if (form.permit_expiry <= today) missing.push('a permit that hasn’t expired')
  }
  return missing
}

export function WorkEligibility({ form, set, files, setFiles, today }) {
  const status = form.immigration_status || ''
  return (
    <section className="pt-card pt-stack">
      <h2 className="pt-h2">Your status in Canada</h2>
      <p className="pt-muted">We have to confirm you’re allowed to work in Canada. Your documents are stored privately and only our review team can see them.</p>
      <Field label="Status" required>
        <select className="pt-input" value={status} onChange={(e) => set('immigration_status', e.target.value)}>
          <option value="" disabled>Choose your status</option>
          {IMMIGRATION_STATUSES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </Field>
      {needsPermitExpiry(status) ? (
        <Field label="Permit expiry date" required error={form.permit_expiry && form.permit_expiry <= today ? 'This permit has expired.' : ''}>
          <input className="pt-input" type="date" min={today} value={form.permit_expiry || ''} onChange={(e) => set('permit_expiry', e.target.value)} />
        </Field>
      ) : null}
      {eligibilityDocs(status).map((doc) => (
        <FileField key={doc.id} label={doc.label} hint={doc.hint} required={doc.required} value={files[doc.id]} onChange={(file) => setFiles((current) => ({ ...current, [doc.id]: file }))} />
      ))}
    </section>
  )
}
