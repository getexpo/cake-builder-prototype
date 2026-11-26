import { useCallback, useEffect, useState } from 'react'
import { friendlyError, supabase, uploadDocument } from './supabaseClient.js'
import { BC_AREAS, Badge, Check, Field, FileField, Loading, Notice, Shell, SignInScreen, money, useSession, when } from './partnerShared.jsx'
import { PhoneInput, PhoneVerify } from './widgets.jsx'
import { MAKES, VEHICLES, joinVehicle, splitVehicle } from './vehicles.js'
import { expiryProblem, licenceProblem, phoneProblem, yearProblem } from './validate.js'

const TITLE = 'Deliver with us'
// BC: app-based delivery workers get at least 120% of the general minimum wage for engaged time.
const BC_MIN_WAGE = 18.25
const ENGAGED_RATE = Math.round(BC_MIN_WAGE * 1.2 * 100) / 100

const EMPTY_FORM = {
  full_name: '', phone: '', city: 'Vancouver', over_19: false,
  licence_class: 'Class 5', licence_number: '', licence_expiry: '',
  vehicle_type: 'Car', vehicle_make_model: '', vehicle_year: '',
  fits_large_cakes: false, has_ac: false, insurance_confirmed: false, background_check_consent: false,
}

const DOCS = [
  { id: 'licence_front', label: 'Driver’s licence (front)', required: true },
  { id: 'licence_back', label: 'Driver’s licence (back)', required: true },
  { id: 'insurance', label: 'Vehicle insurance showing delivery use', required: true, hint: 'Your ICBC or private insurance document. It must cover using your vehicle for deliveries.' },
  { id: 'record_check', label: 'Criminal record check', required: false, hint: 'You can add this later. We need it before your first delivery.' },
]

function mapsLink(text) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(text)}`
}

export default function DriverApp() {
  const { loading, session } = useSession()
  if (loading) return <Loading title={TITLE} />
  if (!session) {
    return (
      <SignInScreen
        title={TITLE}
        path="/driver"
        heading="Deliver cakes in your part of BC"
        points={[
          'Choose when you drive. See the pay and both addresses before you accept a job.',
          'Earn at least $' + ENGAGED_RATE.toFixed(2) + ' per hour of delivery time, plus 100% of tips.',
          'You need a BC driver’s licence, a car with room for cake boxes, and insurance that covers deliveries.',
        ]}
      />
    )
  }
  return <DriverHome user={session.user} />
}

function DriverHome({ user }) {
  const [application, setApplication] = useState(undefined)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)

  const load = useCallback(async () => {
    const { data, error: err } = await supabase.from('driver_applications').select('*').eq('user_id', user.id).maybeSingle()
    if (err) setError(friendlyError(err))
    setApplication(data || null)
  }, [user.id])

  useEffect(() => { load() }, [load])

  if (application === undefined) return <Loading title={TITLE} />
  if (!application || editing) {
    return (
      <Shell title={TITLE} user={user}>
        {error ? <Notice kind="error">{error}</Notice> : null}
        <DriverForm user={user} existing={application} onDone={() => { setEditing(false); load() }} />
      </Shell>
    )
  }
  if (application.status !== 'approved') {
    return (
      <Shell title={TITLE} user={user}>
        <section className="pt-card pt-stack">
          <div className="pt-row"><h1 className="pt-h1">Your application</h1><Badge status={application.status} /></div>
          {application.status === 'pending' ? <p>Thanks, {application.full_name.split(' ')[0]}. We’re checking your documents. We’ll email you at {application.email || user.email} when you’re approved, usually within 2 business days.</p> : null}
          {application.status === 'rejected' ? <><p>We couldn’t approve your application yet.</p>{application.review_note ? <Notice kind="error">{application.review_note}</Notice> : null}<button type="button" className="pt-btn" onClick={() => setEditing(true)}>Update and resubmit</button></> : null}
          {application.status === 'suspended' ? <p>Your account is paused. Contact support to find out more.</p> : null}
          <dl className="pt-dl">
            <dt>Area</dt><dd>{application.city}</dd>
            <dt>Vehicle</dt><dd>{[application.vehicle_year, application.vehicle_make_model, application.vehicle_type].filter(Boolean).join(' ')}</dd>
            <dt>Submitted</dt><dd>{when(application.created_at)}</dd>
          </dl>
          {application.status === 'pending' ? <button type="button" className="pt-btn is-ghost" onClick={() => setEditing(true)}>Edit my application</button> : null}
        </section>
      </Shell>
    )
  }
  return <DriverWork user={user} application={application} />
}

function DriverForm({ user, existing, onDone }) {
  const [form, setForm] = useState(() => ({ ...EMPTY_FORM, ...(existing || {}), full_name: existing?.full_name || user.user_metadata?.full_name || '', vehicle_year: existing?.vehicle_year || '', licence_expiry: existing?.licence_expiry || '' }))
  const [files, setFiles] = useState({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const haveDoc = (id) => Boolean(files[id] || existing?.documents?.[id])

  const today = new Date().toISOString().slice(0, 10)
  const thisYear = new Date().getFullYear()
  const [phoneOk, setPhoneOk] = useState(false)
  const licenceError = licenceProblem(form.licence_number)
  const expiryError = expiryProblem(form.licence_expiry, today)
  const yearError = yearProblem(form.vehicle_year, thisYear)
  const [car, setCar] = useState(() => splitVehicle(existing?.vehicle_make_model))
  const setCarPart = (patch) => setCar((current) => {
    const next = { ...current, ...patch }
    set('vehicle_make_model', joinVehicle(next))
    return next
  })
  const years = Array.from({ length: thisYear + 2 - 1995 }, (_, i) => String(thisYear + 1 - i))
  const missing = [
    !form.full_name.trim() && 'your full name',
    !form.phone.trim() && 'a phone number',
    phoneProblem(form.phone) && 'a 10-digit phone number',
    form.phone.trim() && !phoneProblem(form.phone) && !phoneOk && 'a verified phone number (tap “Text me a code”)',
    licenceError && 'a valid licence number',
    expiryError && 'a licence that hasn’t expired',
    yearError && 'a valid vehicle year',
    !form.over_19 && 'confirmation you are 19 or older',
    !form.licence_number.trim() && 'your licence number',
    !form.licence_expiry && 'your licence expiry date',
    !car.make && 'your vehicle make',
    car.make === 'Other' && !car.otherMake.trim() && 'your vehicle make',
    car.make && car.make !== 'Other' && !car.model && 'your vehicle model',
    (car.make === 'Other' || car.model === 'Other') && !car.otherModel.trim() && 'your vehicle model',
    !form.insurance_confirmed && 'confirmation your insurance covers deliveries',
    !form.background_check_consent && 'consent to a background check',
    ...DOCS.filter((doc) => doc.required && !haveDoc(doc.id)).map((doc) => doc.label.toLowerCase()),
  ].filter(Boolean)

  async function submit(event) {
    event.preventDefault()
    if (missing.length) { setError(`Please add ${missing[0]}.`); return }
    setBusy(true); setError('')
    try {
      const documents = { ...(existing?.documents || {}) }
      for (const doc of DOCS) {
        if (files[doc.id]) documents[doc.id] = await uploadDocument(user.id, doc.id, files[doc.id])
      }
      const row = {
        user_id: user.id,
        status: 'pending',
        email: user.email,
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        city: form.city,
        over_19: form.over_19,
        licence_class: form.licence_class,
        licence_number: form.licence_number.trim(),
        licence_expiry: form.licence_expiry,
        vehicle_type: form.vehicle_type,
        vehicle_make_model: form.vehicle_make_model.trim(),
        vehicle_year: form.vehicle_year ? Number(form.vehicle_year) : null,
        fits_large_cakes: form.fits_large_cakes,
        has_ac: form.has_ac,
        insurance_confirmed: form.insurance_confirmed,
        background_check_consent: form.background_check_consent,
        documents,
      }
      const query = existing ? supabase.from('driver_applications').update(row).eq('id', existing.id) : supabase.from('driver_applications').insert(row)
      const { error: err } = await query
      if (err) throw err
      onDone()
    } catch (err) {
      setError(friendlyError(err))
      setBusy(false)
    }
  }

  return (
    <form className="pt-stack" onSubmit={submit} noValidate>
      <div>
        <h1 className="pt-h1">{existing ? 'Update your application' : 'Apply to deliver'}</h1>
        <p className="pt-muted">Takes about 5 minutes. Have your licence and insurance ready to photograph.</p>
      </div>

      <section className="pt-card pt-stack">
        <h2 className="pt-h2">About you</h2>
        <Field label="Full legal name" required><input className="pt-input" autoComplete="name" value={form.full_name} onChange={(e) => set('full_name', e.target.value)} /></Field>
        <Field label="Mobile number" required hint="We text you about jobs and approvals."><PhoneInput value={form.phone} onChange={(phone) => set('phone', phone)} /></Field>
        <PhoneVerify phone={form.phone} onOkChange={setPhoneOk} />
        <Field label="Where you’ll deliver" required>
          <select className="pt-input" value={form.city} onChange={(e) => set('city', e.target.value)}>{BC_AREAS.map((area) => <option key={area}>{area}</option>)}</select>
        </Field>
        <Check checked={form.over_19} onChange={(v) => set('over_19', v)}>I am 19 or older and legally allowed to work in Canada.</Check>
      </section>

      <section className="pt-card pt-stack">
        <h2 className="pt-h2">Driver’s licence</h2>
        <div className="pt-grid-2">
          <Field label="Licence class" required>
            <select className="pt-input" value={form.licence_class} onChange={(e) => set('licence_class', e.target.value)}>{['Class 5', 'Class 4', 'Class 1', 'Class 2', 'Class 3', 'Class 7 (N)'].map((c) => <option key={c}>{c}</option>)}</select>
          </Field>
          <Field label="Expiry date" required error={expiryError}><input className="pt-input" type="date" min={today} value={form.licence_expiry} onChange={(e) => set('licence_expiry', e.target.value)} /></Field>
        </div>
        <Field label="Licence number" required error={licenceError} hint="7 digits, on the front of your BC licence."><input className="pt-input" inputMode="numeric" maxLength={9} value={form.licence_number} onChange={(e) => set('licence_number', e.target.value.replace(/[^\d\s-]/g, ''))} /></Field>
      </section>

      <section className="pt-card pt-stack">
        <h2 className="pt-h2">Your vehicle</h2>
        <p className="pt-muted">Cakes need a flat, level space. Bikes and scooters can’t carry most orders.</p>
        <div className="pt-grid-2">
          <Field label="Type" required>
            <select className="pt-input" value={form.vehicle_type} onChange={(e) => set('vehicle_type', e.target.value)}>{['Car', 'SUV', 'Minivan', 'Van', 'Pickup truck'].map((c) => <option key={c}>{c}</option>)}</select>
          </Field>
          <Field label="Year" error={yearError}>
            <select className="pt-input" value={form.vehicle_year || ''} onChange={(e) => set('vehicle_year', e.target.value)}>
              <option value="">Choose year</option>
              {years.map((year) => <option key={year}>{year}</option>)}
            </select>
          </Field>
        </div>
        <div className="pt-grid-2">
          <Field label="Make" required>
            <select className="pt-input" value={car.make} onChange={(e) => setCarPart({ make: e.target.value, model: '', otherModel: '' })}>
              <option value="" disabled>Choose make</option>
              {MAKES.map((make) => <option key={make}>{make}</option>)}
              <option value="Other">Other (not listed)</option>
            </select>
          </Field>
          <Field label="Model" required>
            {car.make === 'Other' ? (
              <input className="pt-input" placeholder="Model" value={car.otherModel} onChange={(e) => setCarPart({ otherModel: e.target.value })} />
            ) : (
              <select className="pt-input" value={car.model} disabled={!car.make} onChange={(e) => setCarPart({ model: e.target.value, otherModel: '' })}>
                <option value="" disabled>{car.make ? 'Choose model' : 'Choose make first'}</option>
                {(VEHICLES[car.make] || []).map((model) => <option key={model}>{model}</option>)}
                {car.make ? <option value="Other">Other (not listed)</option> : null}
              </select>
            )}
          </Field>
        </div>
        {car.make === 'Other' ? <Field label="Make name" required><input className="pt-input" placeholder="e.g. Fiat" value={car.otherMake} onChange={(e) => setCarPart({ otherMake: e.target.value })} /></Field> : null}
        {car.make && car.make !== 'Other' && car.model === 'Other' ? <Field label="Model name" required><input className="pt-input" placeholder={`Your ${car.make} model`} value={car.otherModel} onChange={(e) => setCarPart({ otherModel: e.target.value })} /></Field> : null}
        <Check checked={form.fits_large_cakes} onChange={(v) => set('fits_large_cakes', v)}>A large flat box (about 40 × 40 × 30 cm) fits flat in my trunk or on a level seat. Needed for tiered and wedding cakes.</Check>
        <Check checked={form.has_ac} onChange={(v) => set('has_ac', v)}>My vehicle has working air conditioning.</Check>
      </section>

      <section className="pt-card pt-stack">
        <h2 className="pt-h2">Documents</h2>
        <p className="pt-muted">Stored privately. Only our review team can see them.</p>
        {DOCS.map((doc) => (
          <div key={doc.id}>
            <FileField label={doc.label} hint={doc.hint} required={doc.required} value={files[doc.id]} onChange={(file) => setFiles((current) => ({ ...current, [doc.id]: file }))} />
            {!files[doc.id] && existing?.documents?.[doc.id] ? <span className="pt-hint">Already uploaded: {existing.documents[doc.id].name}</span> : null}
          </div>
        ))}
        <Check checked={form.insurance_confirmed} onChange={(v) => set('insurance_confirmed', v)}>My vehicle insurance covers using it for deliveries.</Check>
        <Check checked={form.background_check_consent} onChange={(v) => set('background_check_consent', v)}>I agree to a criminal record check before my first delivery.</Check>
      </section>

      {error ? <Notice kind="error">{error}</Notice> : null}
      <button type="submit" className="pt-btn is-large" disabled={busy}>{busy ? 'Uploading and submitting…' : existing ? 'Resubmit application' : 'Submit application'}</button>
    </form>
  )
}

function DriverWork({ user, application }) {
  const [tab, setTab] = useState('jobs')
  const [open, setOpen] = useState([])
  const [mine, setMine] = useState([])
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')

  const load = useCallback(async () => {
    const [openRes, mineRes] = await Promise.all([
      supabase.from('orders').select('*').is('driver_id', null).eq('fulfillment', 'delivery').in('status', ['confirmed', 'baking', 'ready']).order('ready_at', { ascending: true }),
      supabase.from('orders').select('*').eq('driver_id', user.id).order('accepted_at', { ascending: false }).limit(200),
    ])
    if (openRes.error || mineRes.error) setError(friendlyError(openRes.error || mineRes.error))
    setOpen(openRes.data || [])
    setMine(mineRes.data || [])
  }, [user.id])

  useEffect(() => {
    load()
    const timer = setInterval(load, 15000)
    return () => clearInterval(timer)
  }, [load])

  const current = mine.find((order) => !['delivered', 'cancelled'].includes(order.status))

  async function act(id, fn, args) {
    setBusyId(id); setError('')
    const { error: err } = await supabase.rpc(fn, args)
    if (err) setError(friendlyError(err))
    await load()
    setBusyId('')
    if (!err && fn === 'driver_accept_job') setTab('current')
  }

  const tabs = [
    { id: 'jobs', label: 'Jobs', count: open.length },
    { id: 'current', label: 'Current', count: current ? 1 : 0 },
    { id: 'earnings', label: 'Earnings' },
  ]

  return (
    <Shell title={TITLE} user={user} tabs={tabs} tab={tab} onTab={setTab} subtitle={`Signed in as ${application.full_name} · ${application.city}`}>
      {error ? <Notice kind="error">{error}</Notice> : null}
      {tab === 'jobs' ? (
        <div className="pt-stack">
          {current ? <Notice>You have a delivery in progress. Finish it before taking another.</Notice> : null}
          {!open.length ? <div className="pt-empty"><strong>No open jobs right now</strong><span className="pt-muted">New deliveries show up here. This page checks every 15 seconds.</span></div> : null}
          {open.map((order) => (
            <article key={order.id} className="pt-card pt-stack">
              <div className="pt-row"><strong className="pt-pay">{money(Number(order.driver_pay) + Number(order.tip))}</strong><Badge status={order.status} /></div>
              <span className="pt-muted pt-small">{money(order.driver_pay)} delivery pay{Number(order.tip) ? ` + ${money(order.tip)} tip` : ''}</span>
              <Route order={order} />
              <span className="pt-small">Ready {order.ready_window || when(order.ready_at)} · {(order.items || []).length} item{(order.items || []).length === 1 ? '' : 's'}</span>
              <button type="button" className="pt-btn" disabled={Boolean(current) || busyId === order.id} onClick={() => act(order.id, 'driver_accept_job', { p_order: order.id })}>{busyId === order.id ? 'Accepting…' : 'Accept job'}</button>
            </article>
          ))}
        </div>
      ) : null}

      {tab === 'current' ? (
        current ? (
          <article className="pt-card pt-stack">
            <div className="pt-row"><h1 className="pt-h2">Delivery for {current.customer_name || 'customer'}</h1><Badge status={current.status} /></div>
            <Route order={current} full />
            <div className="pt-items">
              {(current.items || []).map((item, index) => <div key={index}><strong>{item.quantity || 1}× {item.title}</strong><span className="pt-muted pt-small">{item.summary}</span></div>)}
            </div>
            {current.dropoff?.instructions ? <Notice>Drop-off note: {current.dropoff.instructions}</Notice> : null}
            {current.customer_phone ? <a className="pt-btn is-ghost" href={`tel:${current.customer_phone}`}>Call customer</a> : null}
            {current.status === 'out_for_delivery' ? (
              <button type="button" className="pt-btn is-large" disabled={busyId === current.id} onClick={() => act(current.id, 'driver_update_job', { p_order: current.id, p_step: 'delivered' })}>Mark delivered</button>
            ) : (
              <>
                <button type="button" className="pt-btn is-large" disabled={current.status !== 'ready' || busyId === current.id} onClick={() => act(current.id, 'driver_update_job', { p_order: current.id, p_step: 'picked_up' })}>{current.status === 'ready' ? 'I’ve picked up the cake' : 'Waiting for the bakery to mark it ready'}</button>
                <button type="button" className="pt-btn is-ghost" disabled={busyId === current.id} onClick={() => act(current.id, 'driver_update_job', { p_order: current.id, p_step: 'release' })}>I can’t do this job</button>
              </>
            )}
          </article>
        ) : <div className="pt-empty"><strong>No delivery in progress</strong><span className="pt-muted">Accept a job from the Jobs tab.</span></div>
      ) : null}

      {tab === 'earnings' ? <Earnings orders={mine.filter((order) => order.status === 'delivered')} /> : null}
    </Shell>
  )
}

function Route({ order, full }) {
  const pickup = [order.bakery_address, order.bakery_area].filter(Boolean).join(', ')
  const dropoffText = full ? [order.dropoff?.line1, order.dropoff?.city].filter(Boolean).join(', ') : [order.dropoff?.city || '', order.dropoff?.line1 ? order.dropoff.line1.replace(/^\d+\s*/, '') : ''].filter(Boolean).join(' · ')
  return (
    <ol className="pt-route">
      <li><span className="pt-dot" /> <span><strong>Pick up · {order.bakery_name}</strong><br /><a href={mapsLink(pickup || order.bakery_name)} target="_blank" rel="noreferrer">{pickup || order.bakery_area}</a></span></li>
      <li><span className="pt-dot is-end" /> <span><strong>Drop off</strong><br />{full ? <a href={mapsLink(dropoffText)} target="_blank" rel="noreferrer">{dropoffText}</a> : dropoffText}</span></li>
    </ol>
  )
}

function Earnings({ orders }) {
  const weekStart = new Date()
  weekStart.setHours(0, 0, 0, 0)
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7))
  const thisWeek = orders.filter((order) => new Date(order.delivered_at) >= weekStart)
  const minutes = thisWeek.reduce((sum, order) => sum + Math.max(0, (new Date(order.delivered_at) - new Date(order.accepted_at)) / 60000), 0)
  const pay = thisWeek.reduce((sum, order) => sum + Number(order.driver_pay), 0)
  const tips = thisWeek.reduce((sum, order) => sum + Number(order.tip), 0)
  const minimum = (minutes / 60) * ENGAGED_RATE
  const topUp = Math.max(0, minimum - pay)
  return (
    <div className="pt-stack">
      <section className="pt-card pt-stack">
        <h1 className="pt-h2">This week</h1>
        <div className="pt-stats">
          <div><strong>{money(pay + topUp + tips)}</strong><span>Total</span></div>
          <div><strong>{thisWeek.length}</strong><span>Deliveries</span></div>
          <div><strong>{Math.round(minutes)} min</strong><span>Delivery time</span></div>
        </div>
        <dl className="pt-dl">
          <dt>Delivery pay</dt><dd>{money(pay)}</dd>
          <dt>Minimum-pay top-up</dt><dd>{money(topUp)}</dd>
          <dt>Tips (100% yours)</dt><dd>{money(tips)}</dd>
        </dl>
        <p className="pt-muted pt-small">Delivery time runs from when you accept a job until you mark it delivered. BC guarantees at least {money(ENGAGED_RATE)} per hour of that time; we top you up if your delivery pay comes in lower.</p>
      </section>
      <section className="pt-card pt-stack">
        <h2 className="pt-h2">Past deliveries</h2>
        {!orders.length ? <p className="pt-muted">No completed deliveries yet.</p> : null}
        {orders.map((order) => (
          <div key={order.id} className="pt-row pt-line">
            <span><strong>{order.bakery_name}</strong><br /><span className="pt-muted pt-small">{when(order.delivered_at)} · {Math.round((new Date(order.delivered_at) - new Date(order.accepted_at)) / 60000)} min</span></span>
            <strong>{money(Number(order.driver_pay) + Number(order.tip))}</strong>
          </div>
        ))}
      </section>
    </div>
  )
}
