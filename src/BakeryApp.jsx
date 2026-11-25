import { useCallback, useEffect, useState } from 'react'
import { CATEGORIES, SHOPS } from './catalog.js'
import { friendlyError, supabase, uploadDocument } from './supabaseClient.js'
import { BC_AREAS, Badge, Check, Field, FileField, Loading, Notice, Shell, SignInScreen, money, useSession, when } from './partnerShared.jsx'

const TITLE = 'Sell your cakes'
const SHOP_TYPES = CATEGORIES.filter((item) => item.id !== 'all')

const DOCS = [
  { id: 'food_permit', label: 'Food premises permit', required: true, hint: 'From your health authority (e.g. Vancouver Coastal Health or Fraser Health).' },
  { id: 'business_licence', label: 'City business licence', required: false },
  { id: 'storefront', label: 'Photo of your kitchen or storefront', required: false },
]

export function templateFor(category) {
  const sample = SHOPS.find((shop) => shop.category === category) || SHOPS[0]
  return { builder: JSON.parse(JSON.stringify(sample.builder)), icon: sample.icon, tint: sample.tint }
}

export default function BakeryApp() {
  const { loading, session } = useSession()
  if (loading) return <Loading title={TITLE} />
  if (!session) {
    return (
      <SignInScreen
        title={TITLE}
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
          {application.status === 'pending' ? <p>Thanks! We’re reviewing your application and food permit. We’ll email {application.email || user.email} when you’re approved, usually within 2 business days.</p> : null}
          {application.status === 'rejected' ? <><p>We couldn’t approve your application yet.</p>{application.review_note ? <Notice kind="error">{application.review_note}</Notice> : null}<button type="button" className="pt-btn" onClick={() => setEditing(true)}>Update and resubmit</button></> : null}
          {application.status === 'suspended' ? <p>Your shop is paused. Contact support to find out more.</p> : null}
          <dl className="pt-dl">
            <dt>Address</dt><dd>{application.address}, {application.city}</dd>
            <dt>Shop type</dt><dd>{SHOP_TYPES.find((item) => item.id === application.category)?.label}</dd>
            <dt>Submitted</dt><dd>{when(application.created_at)}</dd>
          </dl>
          {application.status === 'pending' ? <button type="button" className="pt-btn is-ghost" onClick={() => setEditing(true)}>Edit my application</button> : null}
        </section>
      </Shell>
    )
  }
  return <BakeryDashboard user={user} bakery={bakery} onSaved={load} />
}

function BakeryForm({ user, existing, onDone }) {
  const [form, setForm] = useState(() => ({
    business_name: '', contact_name: user.user_metadata?.full_name || '', phone: '', address: '', city: 'Vancouver',
    category: 'cakes', description: '', food_permit_number: '', agree: false, ...(existing || {}),
  }))
  const [files, setFiles] = useState({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const haveDoc = (id) => Boolean(files[id] || existing?.documents?.[id])

  const missing = [
    !form.business_name.trim() && 'your bakery’s name',
    !form.contact_name.trim() && 'a contact name',
    !form.phone.trim() && 'a phone number',
    !form.address.trim() && 'your street address',
    !form.food_permit_number?.trim() && 'your food permit number',
    ...DOCS.filter((doc) => doc.required && !haveDoc(doc.id)).map((doc) => `a copy of your ${doc.label.toLowerCase()}`),
    !form.agree && !existing && 'agreement to the partner terms',
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
        user_id: user.id, status: 'pending', email: user.email,
        business_name: form.business_name.trim(), contact_name: form.contact_name.trim(), phone: form.phone.trim(),
        address: form.address.trim(), city: form.city, category: form.category, description: form.description.trim(),
        food_permit_number: form.food_permit_number.trim(), documents,
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
        <Field label="Street address" required hint="Where drivers and customers pick up."><input className="pt-input" autoComplete="street-address" value={form.address} onChange={(e) => set('address', e.target.value)} /></Field>
        <Field label="City" required>
          <select className="pt-input" value={form.city} onChange={(e) => set('city', e.target.value)}>{BC_AREAS.map((area) => <option key={area}>{area}</option>)}</select>
        </Field>
      </section>
      <section className="pt-card pt-stack">
        <h2 className="pt-h2">Contact</h2>
        <Field label="Contact name" required><input className="pt-input" autoComplete="name" value={form.contact_name} onChange={(e) => set('contact_name', e.target.value)} /></Field>
        <Field label="Phone" required><input className="pt-input" type="tel" autoComplete="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
      </section>
      <section className="pt-card pt-stack">
        <h2 className="pt-h2">Permits</h2>
        <Field label="Food premises permit number" required><input className="pt-input" value={form.food_permit_number || ''} onChange={(e) => set('food_permit_number', e.target.value)} /></Field>
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

function BakeryDashboard({ user, bakery, onSaved }) {
  const [tab, setTab] = useState('orders')
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
  const tabs = [
    { id: 'orders', label: 'Orders', count: newCount },
    { id: 'menu', label: 'Menu' },
    { id: 'shop', label: 'Shop settings' },
  ]

  return (
    <Shell title={bakery.name} user={user} tabs={tabs} tab={tab} onTab={setTab} wide>
      {!bakery.active ? <Notice>Your shop is hidden from customers. Add your menu, then turn on “Show my shop to customers” in Shop settings.</Notice> : null}
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
      {tab === 'menu' ? <MenuEditor bakery={bakery} onSaved={onSaved} /> : null}
      {tab === 'shop' ? <ShopSettings bakery={bakery} onSaved={onSaved} /> : null}
    </Shell>
  )
}

function MenuEditor({ bakery, onSaved }) {
  const hasBuilder = bakery.builder && Object.keys(bakery.builder).length
  const [builder, setBuilder] = useState(() => (hasBuilder ? bakery.builder : templateFor(bakery.category).builder))
  const [items, setItems] = useState(() => (bakery.menu || []).map((item) => ({ ...item })))
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const setItem = (index, key, value) => setItems((current) => current.map((item, i) => (i === index ? { ...item, [key]: value } : item)))

  async function save() {
    setBusy(true); setMessage(''); setError('')
    const clean = items.filter((item) => item.title.trim()).map((item, index) => ({ id: item.id || `${bakery.id}-m${Date.now()}-${index}`, title: item.title.trim(), detail: (item.detail || '').trim(), price: Math.max(0, Number(item.price) || 0) }))
    const { error: err } = await supabase.from('bakeries').update({ builder, menu: clean }).eq('id', bakery.id)
    setBusy(false)
    if (err) setError(friendlyError(err))
    else { setMessage('Menu saved.'); setItems(clean); onSaved() }
  }

  return (
    <div className="pt-stack">
      <section className="pt-card pt-stack">
        <h2 className="pt-h2">Build-your-own item</h2>
        <p className="pt-muted">Customers see “Build your own {builder.noun || 'cake'}” at the top of your menu.</p>
        <Field label="Start from a template" required>
          <select className="pt-input" defaultValue="" onChange={(e) => { if (e.target.value) setBuilder(templateFor(e.target.value).builder) }}>
            <option value="">Keep current options</option>
            {SHOP_TYPES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </Field>
        <Field label="What customers build" required hint="e.g. cake, cupcakes, donut box"><input className="pt-input" value={builder.noun || ''} onChange={(e) => setBuilder((current) => ({ ...current, noun: e.target.value }))} /></Field>
        {builder.kind === 'cake' ? (
          <Field label="Most layers you can make" required>
            <input className="pt-input" type="number" min={1} max={12} value={builder.maxLayers || 4} onChange={(e) => setBuilder((current) => ({ ...current, maxLayers: Math.min(12, Math.max(1, Number(e.target.value) || 1)) }))} />
          </Field>
        ) : (
          <p className="pt-small">Options: {(builder.groups || []).map((group) => group.title).join(', ')}</p>
        )}
      </section>

      <section className="pt-card pt-stack">
        <div className="pt-row"><h2 className="pt-h2">Ready-made cakes</h2><button type="button" className="pt-btn is-ghost" onClick={() => setItems((current) => [...current, { title: '', detail: '', price: '' }])}>+ Add item</button></div>
        {!items.length ? <p className="pt-muted">No ready-made items yet.</p> : null}
        {items.map((item, index) => (
          <div key={item.id || index} className="pt-menu-row">
            <input className="pt-input" aria-label="Item name" placeholder="Name" value={item.title} onChange={(e) => setItem(index, 'title', e.target.value)} />
            <input className="pt-input" aria-label="Description" placeholder="Description" value={item.detail} onChange={(e) => setItem(index, 'detail', e.target.value)} />
            <input className="pt-input pt-price" aria-label="Price" inputMode="decimal" placeholder="Price" value={item.price} onChange={(e) => setItem(index, 'price', e.target.value.replace(/[^\d.]/g, ''))} />
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
  const [form, setForm] = useState({ name: bakery.name, tagline: bakery.tagline, address: bakery.address, area: bakery.area, phone: bakery.phone || '', lead_hours: bakery.lead_hours, active: bakery.active })
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const ready = (bakery.builder && Object.keys(bakery.builder).length) || (bakery.menu || []).length

  async function save() {
    setBusy(true); setMessage(''); setError('')
    const template = templateFor(bakery.category)
    const patch = { ...form, lead_hours: Math.max(1, Number(form.lead_hours) || 24) }
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
        <Field label="Pickup address" required><input className="pt-input" value={form.address} onChange={(e) => set('address', e.target.value)} /></Field>
        <Field label="City" required><select className="pt-input" value={form.area} onChange={(e) => set('area', e.target.value)}>{BC_AREAS.map((area) => <option key={area}>{area}</option>)}</select></Field>
        <Field label="Shop phone"><input className="pt-input" type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
        <Field label="How much notice you need (hours)" required hint="Customers can only choose pickup times after this. 24 = next day, 336 = 2 weeks.">
          <input className="pt-input" type="number" min={1} value={form.lead_hours} onChange={(e) => set('lead_hours', e.target.value)} />
        </Field>
        <Check checked={form.active} onChange={(v) => set('active', v)}>Show my shop to customers</Check>
        {form.active && !ready ? <Notice>Add your menu first so customers have something to order. Your build-your-own item uses the {SHOP_TYPES.find((item) => item.id === bakery.category)?.label.toLowerCase()} template until you change it.</Notice> : null}
      </section>
      {error ? <Notice kind="error">{error}</Notice> : null}
      {message ? <Notice kind="ok">{message}</Notice> : null}
      <button type="button" className="pt-btn is-large" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save settings'}</button>
    </div>
  )
}
