import { Fragment, useCallback, useEffect, useState } from 'react'
import { CATEGORIES } from './catalog.js'
import { documentUrl, friendlyError, supabase } from './supabaseClient.js'
import { Badge, Loading, Notice, Shell, SignInScreen, money, useSession, when } from './partnerShared.jsx'
import { ChatThread, ConversationList, useConversations } from './widgets.jsx'

const TITLE = 'Admin'

export default function AdminApp() {
  const { loading, session } = useSession()
  const [allowed, setAllowed] = useState(undefined)

  useEffect(() => {
    if (!session) return
    supabase.rpc('is_admin').then(({ data }) => setAllowed(Boolean(data)))
  }, [session])

  if (loading) return <Loading title={TITLE} />
  if (!session) return <SignInScreen title={TITLE} path="/admin" heading="Admin sign-in" points={['Only approved admin accounts can open this page.']} />
  if (allowed === undefined) return <Loading title={TITLE} />
  if (!allowed) return <Shell title={TITLE} user={session.user}><Notice kind="error">{session.user.email} is not an admin account.</Notice></Shell>
  return <AdminHome user={session.user} />
}

function AdminHome({ user }) {
  const [tab, setTab] = useState('drivers')
  const [drivers, setDrivers] = useState([])
  const [bakeries, setBakeries] = useState([])
  const [shops, setShops] = useState([])
  const [orders, setOrders] = useState([])
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const [d, b, s, o] = await Promise.all([
      supabase.from('driver_applications').select('*').order('created_at', { ascending: false }),
      supabase.from('bakery_applications').select('*').order('created_at', { ascending: false }),
      supabase.from('bakeries').select('*').order('created_at', { ascending: false }),
      supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(300),
    ])
    const err = d.error || b.error || s.error || o.error
    if (err) setError(friendlyError(err))
    setDrivers(d.data || []); setBakeries(b.data || []); setShops(s.data || []); setOrders(o.data || [])
  }, [])

  useEffect(() => {
    load()
    const timer = setInterval(load, 20000)
    return () => clearInterval(timer)
  }, [load])

  const pendingDrivers = drivers.filter((item) => item.status === 'pending').length
  const pendingBakeries = bakeries.filter((item) => item.status === 'pending').length
  const [allChats, reloadChats] = useConversations({})
  const adminUnread = allChats.filter((chat) => !chat.bakery_id.startsWith('bk-')).reduce((sum, chat) => sum + (chat.bakery_unread || 0), 0)
  const openOrders = orders.filter((item) => !['delivered', 'picked_up', 'cancelled'].includes(item.status)).length
  const tabs = [
    { id: 'drivers', label: 'Drivers', count: pendingDrivers },
    { id: 'bakeries', label: 'Bakeries', count: pendingBakeries },
    { id: 'orders', label: 'Orders', count: openOrders },
    { id: 'messages', label: 'Messages', count: adminUnread },
  ]

  return (
    <Shell title={TITLE} user={user} tabs={tabs} tab={tab} onTab={setTab} wide subtitle={`Signed in as ${user.email}`}>
      {error ? <Notice kind="error">{error}</Notice> : null}
      {tab === 'drivers' ? <Applications kind="driver" rows={drivers} onChanged={load} /> : null}
      {tab === 'bakeries' ? <Applications kind="bakery" rows={bakeries} shops={shops} onChanged={load} /> : null}
      {tab === 'orders' ? <Orders orders={orders} onChanged={load} /> : null}
      {tab === 'messages' ? <AdminMessages conversations={allChats} reload={reloadChats} /> : null}
    </Shell>
  )
}

function Applications({ kind, rows, shops = [], onChanged }) {
  const [filter, setFilter] = useState('pending')
  const [openId, setOpenId] = useState('')
  const shown = filter === 'all' ? rows : rows.filter((row) => row.status === filter)
  const counts = ['pending', 'approved', 'rejected', 'suspended'].map((status) => [status, rows.filter((row) => row.status === status).length])
  return (
    <div className="pt-stack">
      <div className="pt-filters" role="group" aria-label="Filter by status">
        {[...counts, ['all', rows.length]].map(([status, count]) => (
          <button key={status} type="button" className={filter === status ? 'is-active' : ''} onClick={() => setFilter(status)}>{status === 'all' ? 'All' : status[0].toUpperCase() + status.slice(1)} · {count}</button>
        ))}
      </div>
      {!shown.length ? <div className="pt-empty"><strong>Nothing here</strong><span className="pt-muted">{filter === 'pending' ? `No ${kind} applications waiting for review.` : 'No applications with this status.'}</span></div> : null}
      {shown.map((row) => (
        <article key={row.id} className="pt-card pt-stack">
          <button type="button" className="pt-row pt-reset" aria-expanded={openId === row.id} onClick={() => setOpenId(openId === row.id ? '' : row.id)}>
            <span><strong>{kind === 'driver' ? row.full_name : row.business_name}</strong><br /><span className="pt-muted pt-small">{row.city} · applied {when(row.created_at)}</span></span>
            <Badge status={row.status} />
          </button>
          {openId === row.id ? <Review kind={kind} row={row} shop={shops.find((shop) => shop.owner_id === row.user_id)} onChanged={onChanged} /> : null}
        </article>
      ))}
    </div>
  )
}

function Review({ kind, row, shop, onChanged }) {
  const [note, setNote] = useState(row.review_note || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function decide(decision) {
    if (decision === 'rejected' && !note.trim()) { setError('Add a note telling them what to fix.'); return }
    setBusy(true); setError('')
    const fn = kind === 'driver' ? 'admin_review_driver' : 'admin_review_bakery'
    const { error: err } = await supabase.rpc(fn, { p_id: row.id, p_decision: decision, p_note: note.trim() || null })
    setBusy(false)
    if (err) setError(friendlyError(err))
    else onChanged()
  }

  async function openDoc(path) {
    try { window.open(await documentUrl(path), '_blank', 'noopener') } catch (err) { setError(friendlyError(err)) }
  }

  const details = kind === 'driver'
    ? [
        ['Email', row.email], ['Phone', row.phone], ['Area', row.city], ['19+ and can work in Canada', row.over_19 ? 'Yes' : 'No'],
        ['Licence', `${row.licence_class || ''} · ${row.licence_number || ''} · expires ${row.licence_expiry || '?'}`],
        ['Vehicle', [row.vehicle_year, row.vehicle_make_model, row.vehicle_type].filter(Boolean).join(' ')],
        ['Fits large cakes', row.fits_large_cakes ? 'Yes' : 'No'], ['Air conditioning', row.has_ac ? 'Yes' : 'No'],
        ['Insurance covers delivery', row.insurance_confirmed ? 'Confirmed by driver' : 'Not confirmed'],
        ['Background check consent', row.background_check_consent ? 'Yes' : 'No'],
      ]
    : [
        ['Contact', row.contact_name], ['Email', row.email], ['Phone', row.phone], ['Address', `${row.address}, ${row.city}`],
        ['Shop type', CATEGORIES.find((item) => item.id === row.category)?.label || row.category], ['About', row.description || '—'],
        ['Food permit #', row.food_permit_number || '—'],
        ['Live shop', shop ? `${shop.id} · ${shop.active ? 'visible to customers' : 'hidden until they publish'}` : 'Created when approved'],
      ]
  const docs = Object.entries(row.documents || {})

  return (
    <div className="pt-stack">
      <dl className="pt-dl">{details.map(([label, value]) => <Fragment key={label}><dt>{label}</dt><dd>{value}</dd></Fragment>)}</dl>
      <div className="pt-stack">
        <strong>Documents</strong>
        {!docs.length ? <span className="pt-muted">No documents uploaded.</span> : null}
        <div className="pt-actions">
          {docs.map(([id, doc]) => <button key={id} type="button" className="pt-btn is-ghost" onClick={() => openDoc(doc.path)}>Open {id.replace(/_/g, ' ')}</button>)}
        </div>
      </div>
      <label className="pt-field"><span className="pt-label">Note to applicant</span><textarea className="pt-input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Required when rejecting, e.g. “Insurance document is expired.”" /></label>
      {error ? <Notice kind="error">{error}</Notice> : null}
      <div className="pt-actions">
        {row.status !== 'approved' ? <button type="button" className="pt-btn" disabled={busy} onClick={() => decide('approved')}>Approve</button> : null}
        {row.status !== 'rejected' ? <button type="button" className="pt-btn is-ghost" disabled={busy} onClick={() => decide('rejected')}>Reject</button> : null}
        {row.status === 'approved' ? <button type="button" className="pt-btn is-ghost" disabled={busy} onClick={() => decide('suspended')}>Suspend</button> : null}
      </div>
    </div>
  )
}

function Orders({ orders, onChanged }) {
  const [filter, setFilter] = useState('open')
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const done = ['delivered', 'picked_up', 'cancelled']
  const shown = filter === 'open' ? orders.filter((order) => !done.includes(order.status)) : orders

  async function setStatus(order, status) {
    setBusyId(order.id); setError('')
    const { error: err } = await supabase.rpc('bakery_set_order_status', { p_order: order.id, p_status: status })
    setBusyId('')
    if (err) setError(friendlyError(err))
    else onChanged()
  }

  const next = { new: 'confirmed', confirmed: 'baking', baking: 'ready' }
  return (
    <div className="pt-stack">
      <div className="pt-filters" role="group" aria-label="Filter orders">
        <button type="button" className={filter === 'open' ? 'is-active' : ''} onClick={() => setFilter('open')}>Open · {orders.filter((order) => !done.includes(order.status)).length}</button>
        <button type="button" className={filter === 'all' ? 'is-active' : ''} onClick={() => setFilter('all')}>All · {orders.length}</button>
      </div>
      <p className="pt-muted pt-small">Orders for the 20 demo shops have no bakery owner. You can move them forward here to test the driver flow.</p>
      {error ? <Notice kind="error">{error}</Notice> : null}
      {!shown.length ? <div className="pt-empty"><strong>No orders</strong></div> : null}
      <div className="pt-table" role="table" aria-label="Orders">
        {shown.map((order) => (
          <div key={order.id} className="pt-tr" role="row">
            <span role="cell"><strong>#{order.id.slice(0, 6).toUpperCase()}</strong><br /><span className="pt-muted pt-small">{when(order.created_at)}</span></span>
            <span role="cell">{order.bakery_name}<br /><span className="pt-muted pt-small">{order.customer_name || order.customer_email}</span></span>
            <span role="cell">{order.fulfillment === 'delivery' ? `Delivery${order.driver_name ? ` · ${order.driver_name}` : ''}` : 'Pickup'}<br /><span className="pt-muted pt-small">{order.ready_window}</span></span>
            <span role="cell"><strong>{money(order.total)}</strong></span>
            <span role="cell"><Badge status={order.status} /></span>
            <span role="cell" className="pt-actions">
              {next[order.status] ? <button type="button" className="pt-btn is-small" disabled={busyId === order.id} onClick={() => setStatus(order, next[order.status])}>Mark {next[order.status]}</button> : null}
              {order.status === 'ready' && order.fulfillment === 'pickup' ? <button type="button" className="pt-btn is-small" disabled={busyId === order.id} onClick={() => setStatus(order, 'picked_up')}>Picked up</button> : null}
              {!done.includes(order.status) ? <button type="button" className="pt-btn is-small is-ghost" disabled={busyId === order.id} onClick={() => setStatus(order, 'cancelled')}>Cancel</button> : null}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function AdminMessages({ conversations, reload }) {
  const [open, setOpen] = useState(null)
  if (open) {
    return <ChatThread conversationId={open.id} side="bakery" title={`${open.customer_name || 'Customer'} → ${open.bakery_name}`} subtitle="You're replying as the shop" onBack={() => { setOpen(null); reload() }} placeholder={`Reply as ${open.bakery_name}`} />
  }
  return (
    <div className="pt-stack">
      <p className="pt-muted">Every customer chat. Demo shops have no owner, so answer their customers here. Your replies show as the shop.</p>
      <ConversationList conversations={conversations} side="admin" onOpen={setOpen} empty="No messages yet." />
    </div>
  )
}
