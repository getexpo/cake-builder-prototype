import { useCallback, useEffect, useRef, useState } from 'react'
import { friendlyError, supabase } from './supabaseClient.js'
import { WEEKDAYS, addDays, dateLabel, vanDate, weekday } from './schedule.js'
import { normalizePhone, phoneProblem } from './validate.js'
import { PHONE_COUNTRIES, joinPhone, splitPhone } from './places.js'
import './widgets.css'

/* ---------- Month calendar ---------- */

function monthStart(day) {
  return `${day.slice(0, 7)}-01`
}

function monthTitle(day) {
  const [y, m] = day.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString('en-CA', { timeZone: 'UTC', month: 'long', year: 'numeric' })
}

function shiftMonth(first, delta) {
  const [y, m] = first.split('-').map(Number)
  const next = new Date(Date.UTC(y, m - 1 + delta, 1))
  return next.toISOString().slice(0, 10)
}

// cell(day) -> { disabled, note, tone: 'busy'|'off'|'full'|'', count }
export function MonthCalendar({ value, onPick, cell, initial, minMonth, maxMonths = 6, compact, scrollOnOpen }) {
  const boxRef = useRef(null)
  // When opened from a button, bring the whole calendar into view (above any sticky bar).
  useEffect(() => {
    if (!scrollOnOpen || !boxRef.current) return
    const id = requestAnimationFrame(() => boxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))
    return () => cancelAnimationFrame(id)
  }, [scrollOnOpen])
  const today = vanDate()
  const firstAllowed = monthStart(minMonth || today)
  const [first, setFirst] = useState(() => monthStart(initial || value || today))
  const lastAllowed = shiftMonth(firstAllowed, maxMonths - 1)
  const lead = weekday(first)
  const days = []
  for (let i = 0; i < 42; i += 1) {
    const day = addDays(first, i - lead)
    if (i >= 35 && day.slice(0, 7) !== first.slice(0, 7)) break
    days.push(day)
  }
  return (
    <div ref={boxRef} className={`cx-cal ${compact ? 'is-compact' : ''}`}>
      <div className="cx-cal-head">
        <button type="button" className="cx-cal-nav" aria-label="Previous month" disabled={first <= firstAllowed} onClick={() => setFirst(shiftMonth(first, -1))}>‹</button>
        <strong>{monthTitle(first)}</strong>
        <button type="button" className="cx-cal-nav" aria-label="Next month" disabled={first >= lastAllowed} onClick={() => setFirst(shiftMonth(first, 1))}>›</button>
      </div>
      <div className="cx-cal-grid" role="grid">
        {WEEKDAYS.map((name) => <span key={name} className="cx-cal-dow" aria-hidden="true">{name.slice(0, 2)}</span>)}
        {days.map((day) => {
          const outside = day.slice(0, 7) !== first.slice(0, 7)
          const info = cell ? cell(day) : {}
          const selected = value === day
          return (
            <button
              key={day}
              type="button"
              className={`cx-cal-day ${outside ? 'is-outside' : ''} ${selected ? 'is-selected' : ''} ${day === today ? 'is-today' : ''} ${info.tone ? `is-${info.tone}` : ''}`}
              disabled={info.disabled}
              aria-pressed={selected}
              aria-label={`${dateLabel(day, true)}${info.note ? `, ${info.note}` : ''}`}
              title={info.note || ''}
              onClick={() => onPick?.(day)}
            >
              <span>{Number(day.slice(8))}</span>
              {info.count ? <em>{info.count}</em> : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ---------- Chat ---------- */

function stamp(iso) {
  const date = new Date(iso)
  const sameDay = vanDate(date) === vanDate()
  return date.toLocaleString('en-CA', { timeZone: 'America/Vancouver', ...(sameDay ? {} : { month: 'short', day: 'numeric' }), hour: 'numeric', minute: '2-digit' }).replace(/\./g, '')
}

// side: 'customer' | 'bakery' (who is looking)
export function ChatThread({ conversationId, side, title, subtitle, onBack, placeholder }) {
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const endRef = useRef(null)

  const load = useCallback(async () => {
    const { data, error: err } = await supabase.from('messages').select('*').eq('conversation_id', conversationId).order('created_at').limit(500)
    if (err) { setError(friendlyError(err)); return }
    setMessages((current) => (current.length === (data || []).length ? current : data || []))
    supabase.rpc('mark_conversation_read', { p_conversation: conversationId })
  }, [conversationId])

  useEffect(() => {
    load()
    const timer = setInterval(load, 6000)
    return () => clearInterval(timer)
  }, [load])

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [messages.length])

  async function send(event) {
    event.preventDefault()
    const body = draft.trim()
    if (!body || busy) return
    setBusy(true); setError('')
    const { error: err } = await supabase.rpc('send_message', { p_conversation: conversationId, p_body: body })
    setBusy(false)
    if (err) { setError(friendlyError(err)); return }
    setDraft('')
    load()
  }

  return (
    <div className="cx-chat">
      <div className="cx-chat-head">
        {onBack ? <button type="button" className="cx-chat-back" aria-label="Back" onClick={onBack}>‹</button> : null}
        <span className="cx-chat-title"><strong>{title}</strong>{subtitle ? <span>{subtitle}</span> : null}</span>
      </div>
      <div className="cx-chat-body" aria-live="polite">
        {!messages.length ? <p className="cx-chat-empty">No messages yet. Ask about flavours, designs, allergies or dates.</p> : null}
        {messages.map((message, index) => {
          const mine = message.sender === side
          const showStamp = index === 0 || new Date(message.created_at) - new Date(messages[index - 1].created_at) > 15 * 60 * 1000
          return (
            <div key={message.id}>
              {showStamp ? <div className="cx-chat-stamp">{stamp(message.created_at)}</div> : null}
              <div className={`cx-bubble ${mine ? 'is-mine' : ''}`}>{message.body}</div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>
      {error ? <p className="cx-chat-error" role="alert">{error}</p> : null}
      <form className="cx-chat-compose" onSubmit={send}>
        <textarea
          aria-label="Message"
          rows={1}
          maxLength={2000}
          placeholder={placeholder || 'Write a message'}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) send(event) }}
        />
        <button type="submit" disabled={busy || !draft.trim()}>{busy ? '…' : 'Send'}</button>
      </form>
    </div>
  )
}

export function ConversationList({ conversations, side, onOpen, empty }) {
  if (!conversations.length) return <p className="cx-chat-empty">{empty || 'No messages yet.'}</p>
  return (
    <div className="cx-convos">
      {conversations.map((chat) => {
        const unread = side === 'customer' ? chat.customer_unread : chat.bakery_unread
        const name = side === 'customer' ? chat.bakery_name : side === 'admin' ? `${chat.customer_name || 'Customer'} → ${chat.bakery_name}` : chat.customer_name || 'Customer'
        return (
          <button key={chat.id} type="button" className={`cx-convo ${unread ? 'is-unread' : ''}`} onClick={() => onOpen(chat)}>
            <span className="cx-avatar">{String(name).slice(0, 1).toUpperCase()}</span>
            <span className="cx-convo-text">
              <strong>{name}</strong>
              <span>{chat.last_sender && chat.last_sender === (side === 'admin' ? 'bakery' : side) ? 'You: ' : ''}{chat.last_message || 'New conversation'}</span>
            </span>
            <span className="cx-convo-side">
              <span>{stamp(chat.last_message_at)}</span>
              {unread ? <em>{unread}</em> : null}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function useConversations(filter, enabled = true) {
  const [list, setList] = useState([])
  const load = useCallback(async () => {
    if (!enabled) { setList([]); return }
    let query = supabase.from('conversations').select('*').order('last_message_at', { ascending: false }).limit(200)
    if (filter?.bakeryId) query = query.eq('bakery_id', filter.bakeryId)
    if (filter?.customerId) query = query.eq('customer_id', filter.customerId)
    const { data } = await query
    setList(data || [])
  }, [filter?.bakeryId, filter?.customerId, enabled])
  useEffect(() => {
    load()
    if (!enabled) return undefined
    const timer = setInterval(load, 10000)
    return () => clearInterval(timer)
  }, [load, enabled])
  return [list, load]
}

/* ---------- Phone verification by text code ---------- */

let smsEnabledPromise = null
function loadSmsEnabled() {
  if (!smsEnabledPromise) {
    smsEnabledPromise = supabase.from('app_settings').select('value').eq('key', 'sms_enabled').maybeSingle()
      .then(({ data }) => data?.value === true)
      .catch(() => false)
  }
  return smsEnabledPromise
}

// Shows "Text me a code" under a phone field and reports whether the number is good to use.
// While texting is switched off (no Twilio number yet) any valid number counts as ok.
export function PhoneVerify({ phone, variant = 'pt', onOkChange }) {
  const target = normalizePhone(phone)
  const [state, setState] = useState('idle') // idle | checking | ready | sending | sent | verifying | verified | skipped
  const [code, setCode] = useState('')
  const [note, setNote] = useState('')
  const okRef = useRef(onOkChange)
  okRef.current = onOkChange

  useEffect(() => {
    let live = true
    setCode(''); setNote('')
    if (!target) { setState('idle'); okRef.current?.(false); return undefined }
    setState('checking')
    ;(async () => {
      const enabled = await loadSmsEnabled()
      if (!live) return
      if (!enabled) { setState('skipped'); okRef.current?.(true); return }
      const { data } = await supabase.from('verified_phones').select('phone').eq('phone', target).maybeSingle()
      if (!live) return
      if (data) { setState('verified'); okRef.current?.(true) } else { setState('ready'); okRef.current?.(false) }
    })()
    return () => { live = false }
  }, [target])

  async function sendCode() {
    setState('sending'); setNote('')
    const { data, error } = await supabase.rpc('start_phone_verification', { p_phone: target })
    if (error) { setState('ready'); setNote(friendlyError(error)); return }
    if (data?.status === 'verified' || data?.status === 'skipped') { setState(data.status); okRef.current?.(true); return }
    setState('sent'); setNote(`We texted a 6-digit code to ${phone}.`)
  }

  async function checkCode() {
    if (code.length !== 6) { setNote('Enter the 6-digit code.'); return }
    setState('verifying')
    const { data, error } = await supabase.rpc('check_phone_verification', { p_phone: target, p_code: code })
    if (error) { setState('sent'); setNote(friendlyError(error)); return }
    if (data?.status === 'verified') { setState('verified'); setNote(''); okRef.current?.(true); return }
    setState(data?.status === 'wrong' ? 'sent' : 'ready')
    setCode('')
    setNote(data?.status === 'wrong' ? 'That code isn’t right. Check the text and try again.'
      : data?.status === 'locked' ? 'Too many tries. Send a new code.'
      : 'That code has expired. Send a new one.')
  }

  const problem = phoneProblem(phone)
  const btn = variant === 'ca' ? 'ca-btn ca-btn-ghost ca-btn-small' : 'pt-btn is-ghost is-small'
  const input = variant === 'ca' ? 'ca-input' : 'pt-input'
  if (problem) return <p className="cx-phone-note is-bad" role="alert">{problem}</p>
  if (!target || state === 'skipped' || state === 'checking') return null
  if (state === 'verified') return <p className="cx-phone-note is-good">✓ Phone number verified</p>
  return (
    <div className="cx-phone-verify">
      {state === 'sent' || state === 'verifying' ? (
        <div className="cx-phone-row">
          <input className={input} inputMode="numeric" autoComplete="one-time-code" maxLength={6} aria-label="6-digit code" placeholder="6-digit code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); checkCode() } }} />
          <button type="button" className={btn} disabled={state === 'verifying'} onClick={checkCode}>{state === 'verifying' ? 'Checking…' : 'Verify'}</button>
          <button type="button" className="cx-link" onClick={sendCode}>Resend</button>
        </div>
      ) : (
        <div className="cx-phone-row">
          <span className="cx-phone-ask">Confirm this number so we can text you.</span>
          <button type="button" className={btn} disabled={state === 'sending'} onClick={sendCode}>{state === 'sending' ? 'Sending…' : 'Text me a code'}</button>
        </div>
      )}
      {note ? <p className="cx-phone-note" role="status">{note}</p> : null}
    </div>
  )
}

/* ---------- Phone number with country code ---------- */

// The value is one string like "+1 604-555-0123". Canada is picked by default.
export function PhoneInput({ value, onChange, onBlur, variant = 'pt', id, ...inputProps }) {
  const parsed = splitPhone(value)
  const [iso, setIso] = useState(parsed.iso)
  const country = PHONE_COUNTRIES.find((item) => item.iso === iso) || PHONE_COUNTRIES[0]
  const national = splitPhone(value, iso).national
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const wrapRef = useRef(null)
  const searchRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const close = (event) => { if (!wrapRef.current?.contains(event.target)) setOpen(false) }
    const key = (event) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', key)
    setTimeout(() => searchRef.current?.focus(), 30)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', key) }
  }, [open])

  const q = query.trim().toLowerCase().replace(/^\+/, '')
  const rank = (item) => {
    const name = item.name.toLowerCase()
    if (name === q || item.iso.toLowerCase() === q || item.dial === q) return 0
    if (name.startsWith(q)) return 1
    if (name.split(/[\s(]+/).some((word) => word.startsWith(q))) return 2
    if (item.dial.startsWith(q)) return 3
    return name.includes(q) ? 4 : 9
  }
  const list = q ? PHONE_COUNTRIES.map((item) => [rank(item), item]).filter(([r]) => r < 9).sort((a, b) => a[0] - b[0]).map(([, item]) => item) : PHONE_COUNTRIES

  function choose(item) {
    setIso(item.iso); setOpen(false); setQuery('')
    onChange(joinPhone(item.dial, national))
  }

  const inputClass = variant === 'ca' ? 'ca-input' : 'pt-input'
  return (
    <div ref={wrapRef} className={`cx-phone-input is-${variant}`}>
      <input
        id={id}
        className={`${inputClass} cx-phone-number`}
        type="tel"
        autoComplete="tel-national"
        value={national}
        onChange={(event) => onChange(joinPhone(country.dial, event.target.value.replace(/^\+\d*\s*/, '')))}
        onBlur={onBlur}
        {...inputProps}
      />
      <button type="button" className="cx-cc-btn" aria-haspopup="listbox" aria-expanded={open} aria-label={`Country code: ${country.name} +${country.dial}`} onClick={(event) => { event.preventDefault(); setOpen(!open) }}>
        <strong>{country.iso}</strong><span>+{country.dial}</span><svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      <div className={`cx-cc-menu ${open ? 'is-open' : ''}`} role="dialog" aria-label="Choose a country code" aria-hidden={!open}>
        <input ref={searchRef} className="cx-cc-search" type="search" placeholder="Search country or code" aria-label="Search country or code" tabIndex={open ? 0 : -1} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); if (list[0]) choose(list[0]) } }} />
        <ul className="cx-cc-list" role="listbox">
          {list.map((item, index) => (
            <li key={item.iso} role="option" aria-selected={item.iso === country.iso}>
              <button type="button" tabIndex={open ? 0 : -1} className={`${item.iso === country.iso ? 'is-on' : ''} ${!q && index === 1 ? 'is-split' : ''}`} onClick={(event) => { event.preventDefault(); choose(item) }}>
                <strong>{item.iso}</strong><span className="cx-cc-name">{item.name}</span><span className="cx-cc-dial">+{item.dial}</span>
              </button>
            </li>
          ))}
          {!list.length ? <li className="cx-cc-empty">No matches</li> : null}
        </ul>
      </div>
    </div>
  )
}

/* ---------- Setup checklist after approval ---------- */

export function SetupChecklist({ approvedAt, steps, onFinished }) {
  const left = steps.filter((step) => !step.done).length
  return (
    <section className="pt-card pt-stack">
      <div>
        <h1 className="pt-h1">{left ? 'You’re approved! Let’s get you set up' : 'You’re all set'}</h1>
        {approvedAt ? <p className="pt-muted">Approved {new Date(approvedAt).toLocaleDateString('en-CA', { timeZone: 'America/Vancouver', month: 'long', day: 'numeric', year: 'numeric' })}</p> : null}
      </div>
      <ol className="cx-steps">
        {steps.map((step, index) => (
          <li key={step.title} className={step.done ? 'is-done' : ''}>
            <span className="cx-step-dot" aria-hidden="true">{step.done ? '✓' : index + 1}</span>
            <div className="cx-step-body">
              <strong>{step.title}</strong>
              <span className="pt-muted pt-small">{step.done ? 'Done' : step.text}</span>
              {!step.done && step.action ? <button type="button" className="pt-btn is-small" disabled={step.disabled} onClick={step.onClick}>{step.action}</button> : null}
            </div>
          </li>
        ))}
      </ol>
      {!left && onFinished ? <button type="button" className="pt-btn" onClick={onFinished}>Go to my dashboard</button> : null}
    </section>
  )
}

/* ---------- Payouts: bank details + tax number, stored encrypted ---------- */

export function sinProblem(raw) {
  const digits = String(raw || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length !== 9) return 'A SIN has 9 digits.'
  let sum = 0
  for (let i = 0; i < 9; i += 1) {
    let d = Number(digits[i]) * (i % 2 ? 2 : 1)
    if (d > 9) d -= 9
    sum += d
  }
  return sum % 10 === 0 && digits[0] !== '0' ? '' : 'That SIN isn’t valid. Check the number on your SIN letter.'
}

export function usePayoutSummary(userId) {
  const [summary, setSummary] = useState(undefined)
  const load = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase.rpc('my_payout_summary')
    setSummary(data || null)
  }, [userId])
  useEffect(() => { load() }, [load])
  return [summary, load]
}

export function PayoutSetup({ summary, onSaved, allowBusinessNumber = true }) {
  const [form, setForm] = useState({ holder: summary?.holder || '', institution: '', transit: '', account: '', taxKind: summary?.tax_kind || 'sin', taxId: '' })
  const [editing, setEditing] = useState(!summary?.bank_last4)
  const [showTax, setShowTax] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('')
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const digits = (value, max) => value.replace(/\D/g, '').slice(0, max)
  const hasTax = Boolean(summary?.tax_last3)
  const taxError = form.taxKind === 'sin' ? sinProblem(form.taxId) : form.taxId && digits(form.taxId, 9).length !== 9 ? 'A business number starts with 9 digits.' : ''

  async function save(event) {
    event.preventDefault(); setError(''); setSaved('')
    if (!form.holder.trim()) return setError('Add the account holder’s name.')
    if (form.institution.length !== 3) return setError('The institution number has 3 digits.')
    if (form.transit.length !== 5) return setError('The transit number has 5 digits.')
    if (form.account.length < 5 || form.account.length > 12) return setError('The account number has 5 to 12 digits.')
    if (!hasTax && !form.taxId) return setError(form.taxKind === 'sin' ? 'Add your Social Insurance Number.' : 'Add your business number.')
    if (taxError) return setError(taxError)
    setBusy(true)
    const { error: err } = await supabase.rpc('save_payout_details', {
      p_holder: form.holder.trim(), p_institution: form.institution, p_transit: form.transit, p_account: form.account,
      p_tax_kind: form.taxKind, p_tax_id: form.taxId ? form.taxId.replace(/\D/g, '') : null,
    })
    setBusy(false)
    if (err) return setError(friendlyError(err))
    setForm((current) => ({ ...current, institution: '', transit: '', account: '', taxId: '' }))
    setEditing(false); setSaved('Saved. Your details are encrypted.')
    onSaved?.()
  }

  if (summary === undefined) return <p className="pt-muted" role="status">Loading…</p>
  return (
    <section className="pt-card pt-stack">
      <h2 className="pt-h2">Payouts</h2>
      <p className="pt-muted">We pay your earnings by direct deposit every week. Bank and tax numbers are encrypted before they’re stored and are never shown in full again, not even to you.</p>
      {saved ? <Notice>{saved}</Notice> : null}
      {summary?.bank_last4 && !editing ? (
        <>
          <dl className="pt-dl">
            <dt>Account holder</dt><dd>{summary.holder}</dd>
            <dt>Bank account</dt><dd>Institution {summary.institution} · ending in {summary.bank_last4}</dd>
            <dt>{summary.tax_kind === 'bn' ? 'Business number' : 'SIN'}</dt><dd>ending in {summary.tax_last3}</dd>
            <dt>Last updated</dt><dd>{new Date(summary.updated_at).toLocaleDateString('en-CA')}</dd>
          </dl>
          <button type="button" className="pt-btn is-ghost" onClick={() => setEditing(true)}>Change bank details</button>
        </>
      ) : (
        <form className="pt-stack" onSubmit={save} noValidate>
          <label className="pt-field"><span className="pt-label">Account holder name <span className="pt-req" aria-hidden="true">*</span></span><input className="pt-input" autoComplete="name" value={form.holder} onChange={(e) => set('holder', e.target.value)} /></label>
          <div className="pt-grid-3">
            <label className="pt-field"><span className="pt-label">Institution <span className="pt-req" aria-hidden="true">*</span></span><input className="pt-input" inputMode="numeric" autoComplete="off" placeholder="3 digits" value={form.institution} onChange={(e) => set('institution', digits(e.target.value, 3))} /></label>
            <label className="pt-field"><span className="pt-label">Transit <span className="pt-req" aria-hidden="true">*</span></span><input className="pt-input" inputMode="numeric" autoComplete="off" placeholder="5 digits" value={form.transit} onChange={(e) => set('transit', digits(e.target.value, 5))} /></label>
            <label className="pt-field"><span className="pt-label">Account <span className="pt-req" aria-hidden="true">*</span></span><input className="pt-input" inputMode="numeric" autoComplete="off" placeholder="7–12 digits" value={form.account} onChange={(e) => set('account', digits(e.target.value, 12))} /></label>
          </div>
          <p className="pt-small pt-muted">Find these on a void cheque or in your banking app under “direct deposit details”.</p>
          {hasTax && !showTax ? (
            <p className="pt-small">{summary.tax_kind === 'bn' ? 'Business number' : 'SIN'} on file, ending in {summary.tax_last3}. <button type="button" className="pt-link-btn" onClick={() => setShowTax(true)}>Change</button></p>
          ) : (
            <>
              {allowBusinessNumber ? (
                <label className="pt-field"><span className="pt-label">Tax number for your earnings</span>
                  <select className="pt-input" value={form.taxKind} onChange={(e) => { set('taxKind', e.target.value); set('taxId', '') }}>
                    <option value="sin">Social Insurance Number (sole proprietor)</option>
                    <option value="bn">Business number (incorporated or registered business)</option>
                  </select>
                </label>
              ) : null}
              <label className="pt-field"><span className="pt-label">{form.taxKind === 'bn' ? 'Business number' : 'Social Insurance Number (SIN)'} <span className="pt-req" aria-hidden="true">*</span></span>
                <input className="pt-input" type="password" inputMode="numeric" autoComplete="off" placeholder="9 digits" value={form.taxId} onChange={(e) => set('taxId', digits(e.target.value, 9))} />
                {taxError ? <span className="pt-field-error" role="alert">{taxError}</span> : <span className="pt-hint">Required by the Canada Revenue Agency to report platform earnings. Hidden as you type.</span>}
              </label>
            </>
          )}
          {error ? <p className="pt-error" role="alert">{error}</p> : null}
          <div className="pt-row pt-row-start">
            <button type="submit" className="pt-btn" disabled={busy}>{busy ? 'Saving securely…' : 'Save payout details'}</button>
            {summary?.bank_last4 ? <button type="button" className="pt-btn is-ghost" onClick={() => setEditing(false)}>Cancel</button> : null}
          </div>
        </form>
      )}
    </section>
  )
}

function Notice({ children }) {
  return <p className="cx-notice" role="status">{children}</p>
}
