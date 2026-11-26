import { useCallback, useEffect, useState } from 'react'
import { CATEGORIES, SHOPS } from './catalog.js'
import { friendlyError, supabase, uploadDocument } from './supabaseClient.js'
import { Badge, Check, Field, FileField, LocationsEditor, Loading, Notice, Shell, SignInScreen, WorkEligibility, eligibilityDocs, eligibilityMissing, locationsProblem, money, useAccountGate, useSession, when } from './partnerShared.jsx'
import { newLocation, shopLocations, withCoordinates } from './geo.js'
import { DEFAULT_TIMES, NOTICE_OPTIONS, WEEKDAYS, dateLabel, timeLabel, vanDate, weekday } from './schedule.js'
import { LIBRARY, cakeOptions } from './builderLibrary.js'
import { ChatThread, ConversationList, MonthCalendar, PayoutSetup, PhoneInput, PhoneVerify, SetupChecklist, usePayoutSummary, useConversations } from './widgets.jsx'
import { cleanPermit, permitProblem, phoneProblem } from './validate.js'

const TITLE = 'Sell your cakes'
const SHOP_TYPES = CATEGORIES.filter((item) => item.id !== 'all')

const DOCS = [
  { id: 'food_permit', label: 'Food premises permit', required: true, hint: 'From your health authority (e.g. Vancouver Coastal Health or Fraser Health).' },
  { id: 'business_licence', label: 'City business licence', required: true, hint: 'From your city or municipality (home-based bakeries need one too).' },
  { id: 'storefront', label: 'Photo of your kitchen or storefront', required: true, hint: 'A clear photo of where your cakes are made.' },
]

export function templateFor(category) {
  const sample = SHOPS.find((shop) => shop.category === category) || SHOPS[0]
  return { builder: JSON.parse(JSON.stringify(sample.builder)), icon: sample.icon, tint: sample.tint }
}

export default function BakeryApp() {
  const { loading, session } = useSession()
  const gate = useAccountGate(session, async (user) => {
    const { data } = await supabase.from('bakery_applications').select('id').eq('user_id', user.id).maybeSingle()
    return Boolean(data)
  }, (email) => `There’s no bakery account for ${email} yet. Tap “Create a bakery account” to apply.`)
  if (loading || gate.checking) return <Loading title={TITLE} />
  if (!session) {
    return (
      <SignInScreen
        title={TITLE}
        notice={gate.notice}
        signupLabel="Create a bakery account"
        path="/bakery"
        heading="Sell your cakes to customers across BC"
        points={[
          'Customers pre-order ready-made cakes or build their own from the options you set.',
          'You choose your lead time, layer limits, prices and pickup hours.',
          'Delivery is handled by our local drivers, or customers pick up.',
        ]}
      />
    )
  }
  return <BakeryHome user={session.user} />
}

function BakeryHome({ user }) {
  const [application, setApplication] = useState(undefined)
  const [bakery, setBakery] = useState(null)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const [appRes, shopRes] = await Promise.all([
      supabase.from('bakery_applications').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('bakeries').select('*').eq('owner_id', user.id).maybeSingle(),
    ])
    if (appRes.error) setError(friendlyError(appRes.error))
    setApplication(appRes.data || null)
    setBakery(shopRes.data || null)
  }, [user.id])

  useEffect(() => { load() }, [load])
  // While the application is being reviewed, check every 20 seconds so approval shows up on its own.
  const waiting = application && (application.status === 'pending' || (application.status === 'approved' && !bakery))
  useEffect(() => {
    if (!waiting || editing) return undefined
    const timer = setInterval(load, 20000)
    return () => clearInterval(timer)
  }, [waiting, editing, load])

  if (application === undefined) return <Loading title={TITLE} />
  if (!application || editing) {
    return (
      <Shell title={TITLE} user={user}>
        {error ? <Notice kind="error">{error}</Notice> : null}
        <BakeryForm user={user} existing={application} onDone={() => { setEditing(false); load() }} />
      </Shell>
    )
  }
  if (application.status !== 'approved' || !bakery) {
    return (
      <Shell title={TITLE} user={user}>
        <section className="pt-card pt-stack">
          <div className="pt-row"><h1 className="pt-h1">{application.business_name}</h1><Badge status={application.status} /></div>
          {application.status === 'pending' ? <p>Thanks! We’re reviewing your application and food permit. We’ll text you at {application.phone} when you’re approved, usually within 2 business days.</p> : null}
          {application.status === 'pending' ? <p className="pt-muted pt-small">This page updates on its own when we’ve reviewed it.</p> : null}
          {application.status === 'approved' ? <p>You’re approved! We’re setting up your shop. This page will update in a moment.</p> : null}
          {application.status === 'rejected' ? <><p>We couldn’t approve your application{application.reviewed_at ? ` (reviewed ${when(application.reviewed_at)})` : ''}.</p><Notice kind="error"><strong>Reason:</strong> {application.review_note || 'No reason was given. Message us from the customer app’s Help page and we’ll explain.'}</Notice><button type="button" className="pt-btn" onClick={() => setEditing(true)}>Fix and resubmit</button></> : null}
          {application.status === 'suspended' ? <><p>Your shop is paused. Contact support to find out more.</p>{application.review_note ? <Notice kind="error"><strong>Reason:</strong> {application.review_note}</Notice> : null}</> : null}
          <dl className="pt-dl">
            <dt>Address</dt><dd>{application.address}, {application.city}</dd>
            <dt>Shop type</dt><dd>{SHOP_TYPES.find((item) => item.id === application.category)?.label}</dd>
            <dt>Submitted</dt><dd>{when(application.created_at)}</dd>
            {application.reviewed_at && application.status !== 'pending' ? <><dt>{application.status === 'approved' ? 'Approved' : application.status === 'rejected' ? 'Not approved' : 'Updated'}</dt><dd>{when(application.reviewed_at)}</dd></> : null}
          </dl>
          {application.status === 'pending' ? <button type="button" className="pt-btn is-ghost" onClick={() => setEditing(true)}>Edit my application</button> : null}
        </section>
      </Shell>
    )
  }
  return <BakeryDashboard user={user} bakery={bakery} application={application} onSaved={load} />
}

function BakeryForm({ user, existing, onDone }) {
  const [form, setForm] = useState(() => ({
    business_name: '', contact_name: user.user_metadata?.full_name || '', phone: '', address: '', city: 'Vancouver',
    category: 'cakes', description: '', food_permit_number: '', agree: false, ...(existing || {}),
    email: existing?.email || user.email || '', permit_expiry: existing?.permit_expiry || '', immigration_status: existing?.immigration_status || '',
    locations: existing?.locations?.length ? existing.locations : [{ ...newLocation(), name: '', address: existing?.address || '', city: existing?.city || 'Vancouver' }],
  }))
  const [files, setFiles] = useState({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const haveDoc = (id) => Boolean(files[id] || existing?.documents?.[id])
  const [phoneOk, setPhoneOk] = useState(false)
  const permitError = permitProblem(form.food_permit_number)
  const today = new Date().toISOString().slice(0, 10)
  const emailError = form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim()) ? 'Enter a valid email address.' : ''

  const missing = [
    !form.business_name.trim() && 'your bakery’s name',
    !form.contact_name.trim() && 'a contact name',
    !form.email.trim() && 'an email address',
    emailError && 'a valid email address',
    !form.phone.trim() && 'a phone number',
    phoneProblem(form.phone) && 'a 10-digit phone number',
    form.phone.trim() && !phoneProblem(form.phone) && !phoneOk && 'a verified phone number (tap “Text me a code”)',
    locationsProblem(form.locations) && 'a name and street address for each location',
    !form.food_permit_number?.trim() && 'your food permit number',
    permitError && 'a valid food permit number',
    ...DOCS.filter((doc) => doc.required && !haveDoc(doc.id)).map((doc) => `a copy of your ${doc.label.toLowerCase()}`),
    ...eligibilityMissing(form, haveDoc, today),
    !form.agree && !existing && 'agreement to the partner terms',
  ].filter(Boolean)

  async function submit(event) {
    event.preventDefault()
    if (missing.length) { setError(`Please add ${missing[0]}.`); return }
    setBusy(true); setError('')
    try {
      const documents = { ...(existing?.documents || {}) }
      for (const doc of [...DOCS, ...eligibilityDocs(form.immigration_status)]) {
        if (files[doc.id]) documents[doc.id] = await uploadDocument(user.id, doc.id, files[doc.id])
      }
      const locations = await withCoordinates(form.locations.map((item) => ({ ...item, name: item.name.trim(), address: item.address.trim() })))
      const row = {
        user_id: user.id, status: 'pending', email: form.email.trim().toLowerCase(),
        immigration_status: form.immigration_status, permit_expiry: form.permit_expiry || null,
        business_name: form.business_name.trim(), contact_name: form.contact_name.trim(), phone: form.phone.trim(),
        locations, address: locations[0].address, city: locations[0].city, category: form.category, description: form.description.trim(),
        food_permit_number: cleanPermit(form.food_permit_number), documents,
      }
      const query = existing ? supabase.from('bakery_applications').update(row).eq('id', existing.id) : supabase.from('bakery_applications').insert(row)
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
        <h1 className="pt-h1">{existing ? 'Update your application' : 'Apply to sell on our app'}</h1>
        <p className="pt-muted">Takes about 5 minutes. You’ll set up your menu after you’re approved.</p>
      </div>
      <section className="pt-card pt-stack">
        <h2 className="pt-h2">Your bakery</h2>
        <Field label="Bakery name" required><input className="pt-input" value={form.business_name} onChange={(e) => set('business_name', e.target.value)} /></Field>
        <Field label="What do you mostly make?" required>
          <select className="pt-input" value={form.category} onChange={(e) => set('category', e.target.value)}>{SHOP_TYPES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
        </Field>
        <Field label="One line about your bakery" hint="Shown to customers, e.g. “Japanese-style fresh cream cakes”."><input className="pt-input" maxLength={90} value={form.description} onChange={(e) => set('description', e.target.value)} /></Field>
      </section>

      <section className="pt-card pt-stack">
        <h2 className="pt-h2">Locations</h2>
        <p className="pt-muted">Add each shop or kitchen customers can order from. If you have more than one, customers pick the one they want and we show them the nearest.</p>
        <LocationsEditor locations={form.locations} onChange={(locations) => set('locations', locations)} newLocation={newLocation} />
      </section>
      <section className="pt-card pt-stack">
        <h2 className="pt-h2">Contact</h2>
        <Field label="Contact name" required><input className="pt-input" autoComplete="name" value={form.contact_name} onChange={(e) => set('contact_name', e.target.value)} /></Field>
        <Field label="Email" required error={emailError} hint="We email you about your application and orders."><input className="pt-input" type="email" autoComplete="email" value={form.email} onChange={(e) => set('email', e.target.value)} /></Field>
        <Field label="Phone" required hint="We text you about orders and your application."><PhoneInput value={form.phone} onChange={(phone) => set('phone', phone)} /></Field>
        <PhoneVerify phone={form.phone} onOkChange={setPhoneOk} />
      </section>
      <WorkEligibility form={form} set={set} files={files} setFiles={setFiles} today={today} />
      <section className="pt-card pt-stack">
        <h2 className="pt-h2">Permits</h2>
        <Field label="Food premises permit number" required error={permitError} hint="As printed on your health permit, e.g. 253639 or FH-12345."><input className="pt-input" autoCapitalize="characters" spellCheck={false} maxLength={30} value={form.food_permit_number || ''} onChange={(e) => set('food_permit_number', e.target.value)} onBlur={(e) => set('food_permit_number', cleanPermit(e.target.value))} /></Field>
        {DOCS.map((doc) => (
          <div key={doc.id}>
            <FileField label={doc.label} hint={doc.hint} required={doc.required} value={files[doc.id]} onChange={(file) => setFiles((current) => ({ ...current, [doc.id]: file }))} />
            {!files[doc.id] && existing?.documents?.[doc.id] ? <span className="pt-hint">Already uploaded: {existing.documents[doc.id].name}</span> : null}
          </div>
        ))}
        {!existing ? <Check checked={form.agree} onChange={(v) => set('agree', v)}>I confirm the information is correct and my kitchen holds a valid food permit.</Check> : null}
      </section>
      <p className="pt-muted pt-small">Payouts: once you’re approved we’ll set up secure payouts with you. We never ask for bank details in this form.</p>
      {error ? <Notice kind="error">{error}</Notice> : null}
      <button type="submit" className="pt-btn is-large" disabled={busy}>{busy ? 'Uploading and submitting…' : existing ? 'Resubmit application' : 'Submit application'}</button>
    </form>
  )
}

function BakeryDashboard({ user, bakery, application, onSaved }) {
  const [tab, setTab] = useState(bakery.active ? 'orders' : 'setup')
  const [orders, setOrders] = useState([])
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')

  const loadOrders = useCallback(async () => {
    const { data, error: err } = await supabase.from('orders').select('*').eq('bakery_id', bakery.id).order('created_at', { ascending: false }).limit(200)
    if (err) setError(friendlyError(err))
    setOrders(data || [])
  }, [bakery.id])

  useEffect(() => {
    loadOrders()
    const timer = setInterval(loadOrders, 15000)
    return () => clearInterval(timer)
  }, [loadOrders])

  async function setStatus(order, status) {
    setBusyId(order.id); setError('')
    const { error: err } = await supabase.rpc('bakery_set_order_status', { p_order: order.id, p_status: status })
    if (err) setError(friendlyError(err))
    await loadOrders()
    setBusyId('')
  }

  const groups = [
    { id: 'new', title: 'New orders', match: ['new'] },
    { id: 'active', title: 'In progress', match: ['confirmed', 'baking'] },
    { id: 'ready', title: 'Ready / out for delivery', match: ['ready', 'out_for_delivery'] },
    { id: 'done', title: 'Completed', match: ['picked_up', 'delivered', 'cancelled'] },
  ]
  const newCount = orders.filter((order) => order.status === 'new').length
  const [conversations, loadConversations] = useConversations({ bakeryId: bakery.id })
  const unread = conversations.reduce((sum, item) => sum + (item.bakery_unread || 0), 0)
  const [payout, reloadPayout] = usePayoutSummary(user.id)
  const optionsDone = Boolean((bakery.builder && Object.keys(bakery.builder).length) || (bakery.menu || []).length)
  const setupLeft = [!optionsDone, !payout?.bank_last4, !bakery.active].filter(Boolean).length
  const tabs = [
    ...(setupLeft ? [{ id: 'setup', label: 'Get started', count: setupLeft }] : []),
    { id: 'orders', label: 'Orders', count: newCount },
    { id: 'calendar', label: 'Calendar' },
    { id: 'messages', label: 'Messages', count: unread },
    { id: 'menu', label: 'Menu' },
    { id: 'shop', label: 'Shop settings' },
    { id: 'payouts', label: 'Payouts' },
  ]

  return (
    <Shell title={bakery.name} user={user} tabs={tabs} tab={tab} onTab={setTab} wide>
      {!bakery.active && tab !== 'setup' ? <Notice>Your shop isn’t live yet. <button type="button" className="pt-link-btn" onClick={() => setTab('setup')}>See what’s left</button></Notice> : null}
      {tab === 'setup' ? (
        <SetupChecklist
          approvedAt={application?.reviewed_at}
          steps={[
            { done: optionsDone, title: 'Choose what customers can order', text: 'Pick your flavours, fillings, frostings, sizes and layers, and set your prices.', action: 'Set up my options', onClick: () => setTab('menu') },
            { done: Boolean(payout?.bank_last4), title: 'Add your bank details for payouts', text: 'Where we send your earnings. Stored encrypted; only you and our payouts team can see it.', action: 'Add bank details', onClick: () => setTab('payouts') },
            { done: bakery.active, title: 'Go live', text: optionsDone ? 'Your shop appears in the customer app as soon as you publish.' : 'Your shop goes live automatically when you save your options.', action: 'Publish my shop', disabled: !optionsDone, onClick: async () => { await supabase.from('bakeries').update({ active: true }).eq('id', bakery.id); onSaved() } },
          ]}
          onFinished={() => setTab('orders')}
        />
      ) : null}
      {tab === 'payouts' ? <PayoutSetup onSaved={reloadPayout} summary={payout} /> : null}
      {error ? <Notice kind="error">{error}</Notice> : null}
      {tab === 'orders' ? (
        <div className="pt-stack">
          {!orders.length ? <div className="pt-empty"><strong>No orders yet</strong><span className="pt-muted">New orders appear here automatically.</span></div> : null}
          {groups.map((group) => {
            const list = orders.filter((order) => group.match.includes(order.status))
            if (!list.length) return null
            return (
              <section key={group.id} className="pt-stack">
                <h2 className="pt-h2">{group.title} <span className="pt-muted">· {list.length}</span></h2>
                <div className="pt-cards">
                  {list.map((order) => (
                    <article key={order.id} className={`pt-card pt-stack ${order.status === 'new' ? 'is-hot' : ''}`}>
                      <div className="pt-row"><strong>#{order.id.slice(0, 6).toUpperCase()} · {order.customer_name || 'Customer'}</strong><Badge status={order.status} /></div>
                      <span className="pt-small">{order.fulfillment === 'delivery' ? '🚗 Delivery' : '🛍️ Pickup'} · {order.ready_window || when(order.ready_at)}</span>
                      <div className="pt-items">
                        {(order.items || []).map((item, index) => <div key={index}><strong>{item.quantity || 1}× {item.title}</strong><span className="pt-muted pt-small">{item.summary}</span></div>)}
                      </div>
                      {order.notes ? <Notice>{order.notes}</Notice> : null}
                      <div className="pt-row"><span className="pt-muted pt-small">Food total</span><strong>{money(order.subtotal)}</strong></div>
                      {order.fulfillment === 'delivery' && ['confirmed', 'baking', 'ready'].includes(order.status) ? <span className="pt-small">{order.driver_name ? `Driver: ${order.driver_name}` : 'Waiting for a driver to accept'}</span> : null}
                      <div className="pt-actions">
                        {order.status === 'new' ? <><button type="button" className="pt-btn" disabled={busyId === order.id} onClick={() => setStatus(order, 'confirmed')}>Accept order</button><button type="button" className="pt-btn is-ghost" disabled={busyId === order.id} onClick={() => setStatus(order, 'cancelled')}>Decline</button></> : null}
                        {order.status === 'confirmed' ? <button type="button" className="pt-btn" disabled={busyId === order.id} onClick={() => setStatus(order, 'baking')}>Start baking</button> : null}
                        {order.status === 'baking' ? <button type="button" className="pt-btn" disabled={busyId === order.id} onClick={() => setStatus(order, 'ready')}>Mark ready</button> : null}
                        {order.status === 'ready' && order.fulfillment === 'pickup' ? <button type="button" className="pt-btn" disabled={busyId === order.id} onClick={() => setStatus(order, 'picked_up')}>Customer picked up</button> : null}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      ) : null}
      {tab === 'calendar' ? <BakeryCalendar bakery={bakery} orders={orders} onSaved={onSaved} /> : null}
      {tab === 'messages' ? <BakeryMessages conversations={conversations} reload={loadConversations} /> : null}
      {tab === 'menu' ? <MenuEditor bakery={bakery} onSaved={onSaved} /> : null}
      {tab === 'shop' ? <ShopSettings bakery={bakery} onSaved={onSaved} /> : null}
    </Shell>
  )
}

function MenuEditor({ bakery, onSaved }) {
  const hasBuilder = bakery.builder && Object.keys(bakery.builder).length
  const [builder, setBuilder] = useState(() => withOptions(hasBuilder ? bakery.builder : templateFor(bakery.category).builder))
  const [items, setItems] = useState(() => (bakery.menu || []).map((item) => ({ ...item })))
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const setItem = (index, key, value) => setItems((current) => current.map((item, i) => (i === index ? { ...item, [key]: value } : item)))

  async function save() {
    setBusy(true); setMessage(''); setError('')
    const clean = items.filter((item) => item.title.trim()).map((item, index) => ({ id: item.id || `${bakery.id}-m${Date.now()}-${index}`, title: item.title.trim(), detail: (item.detail || '').trim(), price: Math.max(0, Number(item.price) || 0), leadHours: Number(item.leadHours) || 0 }))
    const problem = builderProblem(builder)
    if (problem) { setBusy(false); setError(problem); return }
    // The first time a newly approved bakery saves its options, the shop goes live for customers.
    const goLive = !bakery.active && !bakery.went_live_at
    const { error: err } = await supabase.from('bakeries').update({ builder: cleanBuilder(builder), menu: clean, ...(goLive ? { active: true, went_live_at: new Date().toISOString() } : {}) }).eq('id', bakery.id)
    setBusy(false)
    if (err) setError(friendlyError(err))
    else { setMessage(goLive ? 'Saved. Your shop is now live: customers can find it in the app.' : 'Menu saved.'); setItems(clean); onSaved() }
  }

  return (
    <div className="pt-stack">
      <section className="pt-card pt-stack">
        <h2 className="pt-h2">Build-your-own item</h2>
        <p className="pt-muted">Customers see “Build your own {builder.noun || 'cake'}” at the top of your menu.</p>
        <Field label="Start from a template" required>
          <select className="pt-input" defaultValue="" onChange={(e) => { if (e.target.value) setBuilder(withOptions(templateFor(e.target.value).builder)) }}>
            <option value="">Keep current options</option>
            {SHOP_TYPES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </Field>
        <Field label="What customers build" required hint="e.g. cake, cupcakes, donut box"><input className="pt-input" value={builder.noun || ''} onChange={(e) => setBuilder((current) => ({ ...current, noun: e.target.value }))} /></Field>
        <Field label="Notice needed for custom orders" hint={`Customers can't pick dates sooner than this. Your shop default is ${Math.round(bakery.lead_hours / 24) || 1} day(s).`}>
          <NoticeSelect value={builder.leadHours || 0} onChange={(hours) => setBuilder((current) => ({ ...current, leadHours: hours }))} />
        </Field>
        {builder.kind === 'cake' ? (
          <div className="pt-grid-2">
            <Field label="Most layers you can make" required>
              <input className="pt-input" type="number" min={1} max={12} value={builder.maxLayers || 4} onChange={(e) => setBuilder((current) => ({ ...current, maxLayers: Math.min(12, Math.max(1, Number(e.target.value) || 1)) }))} />
            </Field>
            <Field label="Price per layer ($)" hint="0 if layers are included">
              <input className="pt-input" inputMode="decimal" value={builder.layerPrice ?? ''} onChange={(e) => setBuilder((current) => ({ ...current, layerPrice: e.target.value.replace(/[^\d.]/g, '') }))} />
            </Field>
          </div>
        ) : (
          <Field label="Starting price ($)" hint="Added to every order before options">
            <input className="pt-input" inputMode="decimal" value={builder.base ?? 0} onChange={(e) => setBuilder((current) => ({ ...current, base: e.target.value.replace(/[^\d.]/g, '') }))} />
          </Field>
        )}
      </section>

      {builder.kind === 'cake' ? (
        <>
          <p className="pt-muted">Tick what you make and set your price for each. Customers only see the options you tick. Prices are added on top of the shape price.</p>
          {CAKE_SECTIONS.map((section) => (
            <OptionEditor key={section.kind} {...section} value={builder[section.kind]} onChange={(list) => setBuilder((current) => ({ ...current, [section.kind]: list }))} />
          ))}
        </>
      ) : (
        <GroupsEditor groups={builder.groups || []} onChange={(groups) => setBuilder((current) => ({ ...current, groups }))} />
      )}

      <section className="pt-card pt-stack">
        <div className="pt-row"><h2 className="pt-h2">Ready-made cakes</h2><button type="button" className="pt-btn is-ghost" onClick={() => setItems((current) => [...current, { title: '', detail: '', price: '', leadHours: 0 }])}>+ Add item</button></div>
        <p className="pt-muted pt-small">Set a longer notice on items that take more time. Customers only see dates that work for each item.</p>
        {!items.length ? <p className="pt-muted">No ready-made items yet.</p> : null}
        {items.map((item, index) => (
          <div key={item.id || index} className="pt-menu-row">
            <input className="pt-input" aria-label="Item name" placeholder="Name" value={item.title} onChange={(e) => setItem(index, 'title', e.target.value)} />
            <input className="pt-input" aria-label="Description" placeholder="Description" value={item.detail} onChange={(e) => setItem(index, 'detail', e.target.value)} />
            <input className="pt-input pt-price" aria-label="Price" inputMode="decimal" placeholder="Price" value={item.price} onChange={(e) => setItem(index, 'price', e.target.value.replace(/[^\d.]/g, ''))} />
            <NoticeSelect value={item.leadHours || 0} onChange={(hours) => setItem(index, 'leadHours', hours)} label={`Notice for ${item.title || 'item'}`} />
            <button type="button" className="pt-link-btn" aria-label={`Remove ${item.title || 'item'}`} onClick={() => setItems((current) => current.filter((_, i) => i !== index))}>Remove</button>
          </div>
        ))}
      </section>
      {error ? <Notice kind="error">{error}</Notice> : null}
      {message ? <Notice kind="ok">{message}</Notice> : null}
      <button type="button" className="pt-btn is-large" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save menu'}</button>
    </div>
  )
}

function ShopSettings({ bakery, onSaved }) {
  const [form, setForm] = useState({ name: bakery.name, tagline: bakery.tagline, address: bakery.address, area: bakery.area, phone: bakery.phone || '', lead_hours: bakery.lead_hours, active: bakery.active, closed_days: bakery.closed_days || [], pickup_times: bakery.pickup_times?.length ? bakery.pickup_times : DEFAULT_TIMES, daily_capacity: bakery.daily_capacity ?? '', locations: bakery.locations?.length ? bakery.locations : shopLocations({ address: bakery.address, area: bakery.area }).map((item) => ({ ...item, id: newLocation().id, name: '' })) })
  const [newTime, setNewTime] = useState('11:00')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const ready = (bakery.builder && Object.keys(bakery.builder).length) || (bakery.menu || []).length
  const [phoneOk, setPhoneOk] = useState(false)

  async function save() {
    setBusy(true); setMessage(''); setError('')
    if (phoneProblem(form.phone)) { setBusy(false); setError('Enter a 10-digit shop phone number.'); return }
    if (form.phone.trim() && !phoneOk) { setBusy(false); setError('Confirm the shop phone first: tap “Text me a code”.'); return }
    const template = templateFor(bakery.category)
    if (!form.pickup_times.length) { setBusy(false); setError('Add at least one pickup time.'); return }
    if (form.closed_days.length === 7) { setBusy(false); setError('Leave at least one day open.'); return }
    const placeProblem = locationsProblem(form.locations)
    if (placeProblem) { setBusy(false); setError(placeProblem); return }
    const locations = await withCoordinates(form.locations.map((item) => ({ ...item, name: String(item.name || '').trim(), address: item.address.trim() })))
    const patch = { ...form, locations, address: locations[0].address, area: locations[0].city, lead_hours: Math.max(1, Number(form.lead_hours) || 24), daily_capacity: Number(form.daily_capacity) > 0 ? Math.round(Number(form.daily_capacity)) : null, pickup_times: [...form.pickup_times].sort() }
    if (!bakery.builder || !Object.keys(bakery.builder).length) Object.assign(patch, { builder: template.builder, icon: template.icon, tint: template.tint })
    const { error: err } = await supabase.from('bakeries').update(patch).eq('id', bakery.id)
    setBusy(false)
    if (err) setError(friendlyError(err))
    else { setMessage('Saved.'); onSaved() }
  }

  return (
    <div className="pt-stack">
      <section className="pt-card pt-stack">
        <Field label="Shop name" required><input className="pt-input" value={form.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="One line about your shop"><input className="pt-input" maxLength={90} value={form.tagline} onChange={(e) => set('tagline', e.target.value)} /></Field>
        <Field label="Shop phone" hint="We text new orders and customer messages to this number."><PhoneInput value={form.phone} onChange={(phone) => set('phone', phone)} /></Field>
        <PhoneVerify phone={form.phone} onOkChange={setPhoneOk} />
        <Field label="How much notice you need (hours)" required hint="Customers can only choose pickup times after this. 24 = next day, 336 = 2 weeks.">
          <input className="pt-input" type="number" min={1} value={form.lead_hours} onChange={(e) => set('lead_hours', e.target.value)} />
        </Field>
        <Check checked={form.active} onChange={(v) => set('active', v)}>Show my shop to customers</Check>
      </section>

      <section className="pt-card pt-stack">
        <h2 className="pt-h2">Locations</h2>
        <p className="pt-muted">Customers choose which location to order from. The one closest to them is marked “Nearest”.</p>
        <LocationsEditor locations={form.locations} onChange={(locations) => set('locations', locations)} newLocation={newLocation} />
      </section>
      <section className="pt-card pt-stack">
        <h2 className="pt-h2">Days and times</h2>
        <Field label="Days you're open for pickup and delivery" hint="Tap a day to close it. Block single dates (holidays, busy weekends) in the Calendar tab.">
          <div className="cx-chip-row">
            {WEEKDAYS.map((name, index) => {
              const open = !form.closed_days.includes(index)
              return <button key={name} type="button" aria-pressed={open} className={`cx-chip ${open ? 'is-on' : ''}`} onClick={() => set('closed_days', open ? [...form.closed_days, index] : form.closed_days.filter((day) => day !== index))}>{name}</button>
            })}
          </div>
        </Field>
        <Field label="Pickup and delivery times" hint="Customers choose one of these. Each is a 1-hour window.">
          <div className="cx-chip-row">
            {[...form.pickup_times].sort().map((time) => (
              <span key={time} className="cx-chip is-on">{timeLabel(time)}<button type="button" aria-label={`Remove ${timeLabel(time)}`} onClick={() => set('pickup_times', form.pickup_times.filter((item) => item !== time))}>×</button></span>
            ))}
          </div>
          <div className="pt-row pt-row-start">
            <input className="pt-input pt-time" type="time" step={1800} aria-label="New pickup time" value={newTime} onChange={(e) => setNewTime(e.target.value)} />
            <button type="button" className="pt-btn is-ghost" onClick={() => { if (newTime && !form.pickup_times.includes(newTime)) set('pickup_times', [...form.pickup_times, newTime]) }}>+ Add time</button>
          </div>
        </Field>
        <Field label="Most orders per day" hint="When a day reaches this, customers see it as fully booked. Leave blank for no limit.">
          <input className="pt-input" type="number" min={1} placeholder="No limit" value={form.daily_capacity} onChange={(e) => set('daily_capacity', e.target.value)} />
        </Field>
        {form.active && !ready ? <Notice>Add your menu first so customers have something to order. Your build-your-own item uses the {SHOP_TYPES.find((item) => item.id === bakery.category)?.label.toLowerCase()} template until you change it.</Notice> : null}
      </section>
      {error ? <Notice kind="error">{error}</Notice> : null}
      {message ? <Notice kind="ok">{message}</Notice> : null}
      <button type="button" className="pt-btn is-large" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save settings'}</button>
    </div>
  )
}

function NoticeSelect({ value, onChange, label }) {
  return (
    <select className="pt-input" aria-label={label || 'Notice needed'} value={value || 0} onChange={(e) => onChange(Number(e.target.value))}>
      {NOTICE_OPTIONS.map((option) => <option key={option.hours} value={option.hours}>{option.hours ? `${option.label} notice` : 'Shop default notice'}</option>)}
    </select>
  )
}

function orderDay(order) {
  return order.ready_at ? vanDate(new Date(order.ready_at)) : ''
}

function BakeryCalendar({ bakery, orders, onSaved }) {
  const [day, setDay] = useState(vanDate())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const live = orders.filter((order) => order.status !== 'cancelled')
  const counts = live.reduce((acc, order) => { const key = orderDay(order); acc[key] = (acc[key] || 0) + 1; return acc }, {})
  const blocked = bakery.blocked_dates || []
  const closed = bakery.closed_days || []
  const capacity = bakery.daily_capacity
  const dayOrders = live.filter((order) => orderDay(order) === day).sort((a, b) => String(a.ready_at).localeCompare(String(b.ready_at)))
  const isBlocked = blocked.includes(day)
  const isClosed = closed.includes(weekday(day))
  const upcoming = Object.entries(counts).filter(([key]) => key >= vanDate()).sort().slice(0, 7)

  async function toggleBlock() {
    setBusy(true); setError('')
    const next = isBlocked ? blocked.filter((item) => item !== day) : [...blocked, day].sort()
    const { error: err } = await supabase.from('bakeries').update({ blocked_dates: next }).eq('id', bakery.id)
    setBusy(false)
    if (err) setError(err.message)
    else onSaved()
  }

  return (
    <div className="pt-cal-layout">
      <div className="pt-stack">
        <MonthCalendar
          value={day}
          onPick={setDay}
          minMonth={vanDate()}
          maxMonths={12}
          cell={(date) => {
            const count = counts[date] || 0
            const off = blocked.includes(date) || closed.includes(weekday(date))
            return { count: count ? (capacity ? `${count}/${capacity}` : String(count)) : '', tone: off ? 'off' : capacity && count >= capacity ? 'full' : count ? 'busy' : '', note: off ? 'Closed' : count ? `${count} order${count === 1 ? '' : 's'}` : '' }
          }}
        />
        <div className="cx-cal-legend"><span><i className="is-busy" />Has orders</span><span><i className="is-full" />Fully booked</span><span><i className="is-off" />Closed or blocked</span></div>
        {upcoming.length ? (
          <section className="pt-card pt-stack">
            <h2 className="pt-h2">Coming up</h2>
            {upcoming.map(([date, count]) => (
              <button key={date} type="button" className="pt-row pt-plain-row" onClick={() => setDay(date)}><span>{dateLabel(date, true)}</span><strong>{count} order{count === 1 ? '' : 's'}</strong></button>
            ))}
          </section>
        ) : null}
      </div>
      <section className="pt-card pt-stack">
        <div className="pt-row"><h2 className="pt-h2">{dateLabel(day, true)}</h2><span className="pt-muted">{dayOrders.length} order{dayOrders.length === 1 ? '' : 's'}{capacity ? ` of ${capacity}` : ''}</span></div>
        {isClosed ? <Notice>You're closed on {WEEKDAYS[weekday(day)]}s. Change your open days in Shop settings.</Notice> : null}
        {!isClosed && day >= vanDate() ? (
          <button type="button" className="pt-btn is-ghost" disabled={busy} onClick={toggleBlock}>{isBlocked ? 'Open this day for orders again' : 'Block this day (no new orders)'}</button>
        ) : null}
        {isBlocked ? <Notice>Blocked: customers can't pick this day. Orders already booked stay.</Notice> : null}
        {error ? <Notice kind="error">{error}</Notice> : null}
        {!dayOrders.length ? <p className="pt-muted">Nothing due this day.</p> : null}
        {dayOrders.map((order) => (
          <article key={order.id} className="pt-cal-order">
            <div className="pt-row"><strong>{(order.ready_window || '').split(' · ')[1] || when(order.ready_at)} · {order.fulfillment === 'delivery' ? 'Delivery' : 'Pickup'}</strong><Badge status={order.status} /></div>
            <span className="pt-small">#{order.id.slice(0, 6).toUpperCase()} · {order.customer_name || 'Customer'}</span>
            {(order.items || []).map((item, index) => <span key={index} className="pt-small"><strong>{item.quantity || 1}× {item.title}</strong>{item.summary ? ` · ${item.summary}` : ''}</span>)}
            {order.notes ? <span className="pt-small pt-muted">Note: {order.notes}</span> : null}
          </article>
        ))}
      </section>
    </div>
  )
}

function BakeryMessages({ conversations, reload }) {
  const [open, setOpen] = useState(null)
  if (open) {
    return <ChatThread conversationId={open.id} side="bakery" title={open.customer_name || 'Customer'} subtitle="Customer" onBack={() => { setOpen(null); reload() }} placeholder="Reply to the customer" />
  }
  return (
    <div className="pt-stack">
      <p className="pt-muted">Customers can message you before and after ordering. You'll get a text when a new message comes in.</p>
      <ConversationList conversations={conversations} side="bakery" onOpen={setOpen} empty="No messages yet." />
    </div>
  )
}

/* ---------- Build-your-own options ---------- */

const CAKE_SECTIONS = [
  { kind: 'shapes', title: 'Shapes', hint: 'The shape price is the starting price of the cake.', priceLabel: 'Price', required: true },
  { kind: 'sizes', title: 'Sizes', hint: 'Extra charge on top of the shape price (use a minus for smaller sizes). Set how many people each size serves.', priceLabel: '+ Price', required: true, allowNegative: true },
  { kind: 'flavours', title: 'Cake flavours', hint: 'The first 8 you tick are shown first; customers can open the full list.', priceLabel: '+ Price', required: true },
  { kind: 'fillings', title: 'Fillings between layers', hint: 'Price is charged per layer.', priceLabel: '+ Per layer' },
  { kind: 'frostings', title: 'Outside frosting', priceLabel: '+ Price', required: true },
  { kind: 'toppings', title: 'Toppings', hint: 'Customers can add as many as they like.', priceLabel: '+ Price' },
]

function withOptions(builder) {
  const copy = JSON.parse(JSON.stringify(builder || {}))
  if (copy.kind !== 'cake') return copy
  const opts = cakeOptions(copy)
  return { ...copy, shapes: opts.shapes, sizes: opts.sizes, flavours: opts.flavours, fillings: opts.fillings, frostings: opts.frostings, toppings: opts.toppings, layerPrice: opts.layerPrice, maxLayers: opts.maxLayers }
}

const num = (value, allowNegative) => {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.round((allowNegative ? n : Math.max(0, n)) * 100) / 100
}

function cleanBuilder(builder) {
  const out = { ...builder }
  if (builder.kind === 'cake') {
    CAKE_SECTIONS.forEach(({ kind, allowNegative }) => {
      out[kind] = (builder[kind] || []).map((item) => ({ ...item, label: String(item.label).trim(), price: num(item.price, allowNegative) })).filter((item) => item.label)
    })
    out.layerPrice = num(builder.layerPrice)
  } else {
    out.base = num(builder.base)
    out.groups = (builder.groups || []).map((group) => ({
      ...group,
      title: String(group.title || '').trim() || 'Options',
      ...(group.unitPrice != null ? { unitPrice: num(group.unitPrice) } : {}),
      ...(group.options ? { options: group.options.map((option) => ({ ...option, label: String(option.label).trim(), price: num(option.price) })).filter((option) => option.label) } : {}),
    }))
  }
  return out
}

function builderProblem(builder) {
  if (builder.kind === 'cake') {
    const missing = CAKE_SECTIONS.find((section) => section.required && !(builder[section.kind] || []).length)
    return missing ? `Tick at least one option under “${missing.title}”.` : ''
  }
  const empty = (builder.groups || []).find((group) => ['single', 'multi'].includes(group.type) && group.required && !(group.options || []).some((option) => String(option.label).trim()))
  return empty ? `Add at least one option to “${empty.title}”.` : ''
}

const slug = (text) => String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'item'

function OptionEditor({ kind, title, hint, priceLabel, value, onChange, allowNegative, required }) {
  const [query, setQuery] = useState('')
  const [onlyOn, setOnlyOn] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const list = value || []
  const chosen = new Map(list.map((item) => [item.id, item]))
  const library = LIBRARY[kind]
  const custom = list.filter((item) => !library.some((entry) => entry.id === item.id))
  const rows = [...library, ...custom].map((item) => (chosen.has(item.id) ? { ...item, ...chosen.get(item.id), on: true } : { ...item, on: false }))
  const q = query.trim().toLowerCase()
  const shown = rows.filter((row) => (!onlyOn || row.on) && (!q || row.label.toLowerCase().includes(q)))
  const order = (next) => rows.map((row) => next.find((item) => item.id === row.id)).filter(Boolean).concat(next.filter((item) => !rows.some((row) => row.id === item.id)))

  const toggle = (row) => {
    if (row.on) onChange(list.filter((item) => item.id !== row.id))
    else onChange(order([...list, { id: row.id, label: row.label, price: row.price, ...(row.swatch ? { swatch: row.swatch } : {}), ...(row.serves ? { serves: row.serves } : {}) }]))
  }
  const setPrice = (id, price) => onChange(list.map((item) => (item.id === id ? { ...item, price } : item)))
  const addOwn = () => {
    const label = newName.trim()
    if (!label) return
    onChange([...list, { id: `own-${slug(label)}-${Date.now().toString(36)}`, label, price: newPrice || 0 }])
    setNewName(''); setNewPrice('')
  }

  return (
    <section className="pt-card pt-stack">
      <div className="pt-row">
        <h2 className="pt-h2">{title}{required ? '' : <span className="pt-muted pt-small"> · optional</span>}</h2>
        <span className="pt-muted pt-small">{list.length} of {rows.length} on</span>
      </div>
      {hint ? <p className="pt-muted pt-small">{hint}</p> : null}
      <div className="pt-row pt-row-start pt-wrap">
        {rows.length > 12 ? <input className="pt-input pt-search" type="search" aria-label={`Search ${title}`} placeholder={`Search ${title.toLowerCase()}`} value={query} onChange={(e) => setQuery(e.target.value)} /> : null}
        <button type="button" className="pt-btn is-ghost is-small" onClick={() => setOnlyOn(!onlyOn)}>{onlyOn ? 'Show all' : 'Show ticked only'}</button>
        <button type="button" className="pt-btn is-ghost is-small" onClick={() => onChange(rows.map(({ on, ...item }) => (chosen.get(item.id) || item)))}>Tick all</button>
        <button type="button" className="pt-btn is-ghost is-small" onClick={() => onChange([])}>Untick all</button>
      </div>
      <div className="pt-options">
        {shown.map((row) => (
          <div key={row.id} className={`pt-option ${row.on ? 'is-on' : ''}`}>
            <label className="pt-option-name">
              <input type="checkbox" checked={row.on} onChange={() => toggle(row)} />
              {row.swatch && row.swatch !== 'marble' && row.swatch !== 'rainbow' ? <span className="pt-swatch" style={{ background: row.swatch }} aria-hidden="true" /> : null}
              <span>{row.label}</span>
              {kind === 'sizes' ? <input className="pt-input pt-serves" aria-label={`Serves for ${row.label}`} placeholder="Serves" disabled={!row.on} value={row.serves || ''} onClick={(e) => e.preventDefault()} onChange={(e) => onChange(list.map((item) => (item.id === row.id ? { ...item, serves: e.target.value.slice(0, 12) } : item)))} /> : null}
            </label>
            <span className="pt-option-price">
              <span aria-hidden="true">$</span>
              <input className="pt-input" inputMode="decimal" aria-label={`${priceLabel} for ${row.label}`} disabled={!row.on} value={row.on ? row.price : row.price} onChange={(e) => setPrice(row.id, e.target.value.replace(allowNegative ? /[^\d.-]/g : /[^\d.]/g, ''))} />
            </span>
            {row.id.startsWith('own-') ? <button type="button" className="pt-link-btn" onClick={() => onChange(list.filter((item) => item.id !== row.id))}>Remove</button> : <span />}
          </div>
        ))}
        {!shown.length ? <p className="pt-muted">Nothing matches.</p> : null}
      </div>
      <div className="pt-option pt-option-add">
        <input className="pt-input" aria-label={`New ${title.toLowerCase()} name`} placeholder="Add your own…" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addOwn() }} />
        <span className="pt-option-price"><span aria-hidden="true">$</span><input className="pt-input" inputMode="decimal" aria-label="Price" placeholder="0" value={newPrice} onChange={(e) => setNewPrice(e.target.value.replace(/[^\d.]/g, ''))} /></span>
        <button type="button" className="pt-btn is-ghost is-small" onClick={addOwn}>Add</button>
      </div>
      <p className="pt-small pt-muted">{priceLabel === 'Price' ? 'Price shown is the full starting price.' : `Column shows the extra charge (${priceLabel.replace('+ ', '').toLowerCase()}).`}</p>
    </section>
  )
}

function GroupsEditor({ groups, onChange }) {
  const setGroup = (index, patch) => onChange(groups.map((group, i) => (i === index ? { ...group, ...patch } : group)))
  const setOption = (gi, oi, patch) => setGroup(gi, { options: groups[gi].options.map((option, i) => (i === oi ? { ...option, ...patch } : option)) })
  return (
    <>
      <p className="pt-muted">These are the choices customers make. Rename them, change prices, add or remove options.</p>
      {groups.map((group, gi) => (
        <section key={group.id} className="pt-card pt-stack">
          <div className="pt-row">
            <input className="pt-input pt-group-title" aria-label="Section name" value={group.title} onChange={(e) => setGroup(gi, { title: e.target.value })} />
            <span className="pt-muted pt-small">{group.type === 'single' ? 'Pick one' : group.type === 'multi' ? `Pick up to ${group.max || 'any'}` : group.type === 'count' ? 'Number' : 'Free text'}</span>
          </div>
          {group.type === 'count' ? (
            <div className="pt-grid-3">
              <Field label="Least"><input className="pt-input" type="number" value={group.min ?? 1} onChange={(e) => setGroup(gi, { min: Math.max(0, Number(e.target.value) || 0) })} /></Field>
              <Field label="Most"><input className="pt-input" type="number" value={group.max ?? 5} onChange={(e) => setGroup(gi, { max: Math.max(1, Number(e.target.value) || 1) })} /></Field>
              <Field label={`$ per ${group.unitLabel || 'unit'}`}><input className="pt-input" inputMode="decimal" value={group.unitPrice ?? 0} onChange={(e) => setGroup(gi, { unitPrice: e.target.value.replace(/[^\d.]/g, '') })} /></Field>
            </div>
          ) : null}
          {group.options ? (
            <div className="pt-options">
              {group.options.map((option, oi) => (
                <div key={option.id} className="pt-option is-on">
                  <input className="pt-input" aria-label="Option name" value={option.label} onChange={(e) => setOption(gi, oi, { label: e.target.value })} />
                  <span className="pt-option-price"><span aria-hidden="true">$</span><input className="pt-input" inputMode="decimal" aria-label={`Price for ${option.label}`} value={option.price} onChange={(e) => setOption(gi, oi, { price: e.target.value.replace(/[^\d.]/g, '') })} /></span>
                  <button type="button" className="pt-link-btn" disabled={group.required && group.options.length <= 1} onClick={() => setGroup(gi, { options: group.options.filter((_, i) => i !== oi) })}>Remove</button>
                </div>
              ))}
              <button type="button" className="pt-btn is-ghost is-small" onClick={() => setGroup(gi, { options: [...group.options, { id: `own-${Date.now().toString(36)}`, label: '', price: 0 }] })}>+ Add option</button>
            </div>
          ) : null}
        </section>
      ))}
    </>
  )
}
