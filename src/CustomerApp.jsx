import { useCallback, useEffect, useMemo, useState } from 'react'
import { CATEGORIES, SHOPS } from './catalog.js'
import { cakeOptions } from './builderLibrary.js'
import { friendlyError, supabase } from './supabaseClient.js'
import { STATUS_HINT, addDays, dateLabel, dayStatus, earliestDay, leadFor, noticeLabel, timesOn, vanDate, vanMoment } from './schedule.js'
import { ChatThread, ConversationList, MonthCalendar, NotificationPrompt, PhoneInput, PhoneVerify, useConversations } from './widgets.jsx'
import { phoneProblem } from './validate.js'
import { distanceKm, geocode, kmLabel, shopLocations } from './geo.js'
import { OccasionsScreen, dismissPrompt, promptDismissed, upcoming, useOccasions } from './Occasions.jsx'
import { countdown, occasionTitle } from './occasions.js'
import { BRAND } from './brand.js'
import './customer.css'

// Customer-facing app (redesign). All data and actions come from App via `ctx`,
// so login, cart, checkout and orders keep using the same backend wiring.

const SETTINGS_KEY = 'cake-settings'

const CHOCOLATES = ['Milk', 'Dark', 'White']
const DEFAULT_LAYERS = 3

const PICKUP_STEPS = [
  { id: 'new', label: 'Order placed' },
  { id: 'confirmed', label: 'Confirmed by the bakery' },
  { id: 'baking', label: 'Baking and decorating' },
  { id: 'ready', label: 'Ready for pickup' },
  { id: 'picked_up', label: 'Picked up' },
]
const DELIVERY_STEPS = [
  { id: 'new', label: 'Order placed' },
  { id: 'confirmed', label: 'Confirmed by the bakery' },
  { id: 'baking', label: 'Baking and decorating' },
  { id: 'ready', label: 'Ready at the bakery' },
  { id: 'out_for_delivery', label: 'On the way' },
  { id: 'delivered', label: 'Delivered' },
]
const STATUS_TEXT = { new: 'Waiting for the bakery', confirmed: 'Confirmed', baking: 'Baking', ready: 'Ready', out_for_delivery: 'On the way', picked_up: 'Picked up', delivered: 'Delivered', cancelled: 'Cancelled' }

const DONE_STATUSES = ['delivered', 'picked_up', 'cancelled']
const PICKUP_TRACK = [{ label: 'Placed', statuses: ['new'] }, { label: 'Confirmed', statuses: ['confirmed'] }, { label: 'Baking', statuses: ['baking'] }, { label: 'Ready', statuses: ['ready'] }]
const DELIVERY_TRACK = [{ label: 'Placed', statuses: ['new'] }, { label: 'Confirmed', statuses: ['confirmed'] }, { label: 'Baking', statuses: ['baking', 'ready'] }, { label: 'On the way', statuses: ['out_for_delivery'] }]

const DETAILS_KEY = 'cake-customer-details'
const DELIVERY_FEE = 7.99
const SERVICE_FEE = 2.49
const DRIVER_PAY = 8
const TIP_PRESETS = ['15', '20']
const round2 = (n) => Math.round(n * 100) / 100

// choice = { mode: '15' | '20' | 'custom' | 'later' | 'none', kind: '%' | '$', amount: '' }
function tipAmount(choice, base) {
  if (!choice || choice.mode === 'later' || choice.mode === 'none') return 0
  if (choice.mode === 'custom') {
    const value = Math.max(0, Number(choice.amount) || 0)
    return round2(choice.kind === '%' ? (base * Math.min(value, 100)) / 100 : Math.min(value, 500))
  }
  return round2((base * Number(choice.mode)) / 100)
}

function TipPicker({ value, onChange, base, laterOption }) {
  const set = (patch) => onChange({ ...value, ...patch })
  const options = [...TIP_PRESETS.map((pct) => ({ id: pct, top: `${pct}%`, sub: money(round2((base * Number(pct)) / 100)) })), { id: 'custom', top: 'Custom', sub: '% or $' }, laterOption ? { id: 'later', top: 'Later', sub: 'After delivery' } : { id: 'none', top: 'No tip', sub: '' }]
  return (
    <div className="ca-stack-8">
      <div className="ca-grid-4" role="radiogroup" aria-label="Tip amount">
        {options.map((option) => (
          <button key={option.id} type="button" role="radio" aria-checked={value.mode === option.id} className={`ca-size ${value.mode === option.id ? 'is-selected' : ''}`} onClick={() => set({ mode: option.id })}>
            <strong className="ca-small-strong">{option.top}</strong>{option.sub ? <span className="ca-small">{option.sub}</span> : null}
          </button>
        ))}
      </div>
      {value.mode === 'custom' ? (
        <div className="ca-tip-custom">
          <div className="ca-seg" role="radiogroup" aria-label="Tip as a percent or dollar amount">
            {['%', '$'].map((kind) => <button key={kind} type="button" role="radio" aria-checked={value.kind === kind} className={value.kind === kind ? 'is-on' : ''} onClick={() => set({ kind, amount: '' })}>{kind === '%' ? '% of order' : '$ amount'}</button>)}
          </div>
          <div className="ca-tip-input">
            {value.kind === '$' ? <span aria-hidden="true">$</span> : null}
            <input className="ca-input" inputMode="decimal" aria-label={value.kind === '%' ? 'Tip percent' : 'Tip in dollars'} placeholder={value.kind === '%' ? '18' : '5.00'} value={value.amount} onChange={(event) => set({ amount: event.target.value.replace(/[^\d.]/g, '').slice(0, 6) })} />
            {value.kind === '%' ? <span aria-hidden="true">%</span> : null}
            <strong>= {money(tipAmount(value, base))}</strong>
          </div>
        </div>
      ) : null}
    </div>
  )
}

// Asks for a tip once a delivery has arrived. 100% goes to the driver.
function TipAfterDelivery({ order, onDone, onSkip, compact }) {
  const [choice, setChoice] = useState({ mode: '15', kind: '%', amount: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const base = Number(order.subtotal) || 0
  const amount = tipAmount(choice, base)
  const driver = order.driver_name ? order.driver_name.split(' ')[0] : 'your driver'
  async function send() {
    if (!amount) { onSkip(); return }
    setBusy(true); setError('')
    const { error: err } = await supabase.rpc('add_driver_tip', { p_order: order.id, p_tip: amount })
    setBusy(false)
    if (err) setError(friendlyError(err)); else onDone(amount)
  }
  return (
    <div className="ca-stack-12">
      {!compact ? <h2 className="ca-h3">Tip {driver}</h2> : null}
      <TipPicker value={choice} onChange={setChoice} base={base} />
      <span className="ca-muted ca-small">100% of your tip goes to {driver}. It’s charged to the card you paid with.</span>
      {error ? <p className="ca-toast is-error is-inline" role="alert">{error}</p> : null}
      <button type="button" className="ca-btn" disabled={busy} onClick={send}>{busy ? 'Adding tip…' : amount ? `Add ${money(amount)} tip` : 'No tip this time'}</button>
    </div>
  )
}

function readDetails() {
  try {
    return { addresses: [], cards: [], phone: '', ...JSON.parse(window.localStorage.getItem(DETAILS_KEY) || '{}') }
  } catch {
    return { addresses: [], cards: [], phone: '' }
  }
}

function timeText(date) {
  return date.toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' }).replace(':00', '').replace(/\./g, '')
}

// Earliest day anything on this shop's menu can be ready.
function shopEarliest(shop) {
  const leads = [Number(shop?.builder?.leadHours) || 0, ...(shop?.menu || []).map((item) => Number(item.leadHours) || 0)].filter(Boolean)
  const lead = Math.min(Number(shop?.leadHours) || 24, ...(leads.length ? leads : [Infinity]))
  return earliestDay(shop, lead)
}

function liveShopFromRow(row) {
  return {
    id: row.id, name: row.name, area: row.area, address: row.address, category: row.category,
    tagline: row.tagline || 'New on the app', leadHours: row.lead_hours || 24, tint: row.tint || '#F3E8E2', icon: row.icon || 'cake',
    locations: row.locations || [], closedDays: row.closed_days || [], blockedDates: row.blocked_dates || [], dailyCapacity: row.daily_capacity || null, pickupTimes: row.pickup_times || null,
    builder: row.builder && Object.keys(row.builder).length ? row.builder : SHOPS[0].builder,
    menu: (row.menu || []).map((item) => ({ ...item, price: Number(item.price) || 0, leadHours: Number(item.leadHours) || 0 })), live: true,
  }
}

const LEGACY_VIEWS = { builder: 'build', saved: 'orders', accounts: 'account' }

function scrollTop() {
  if (typeof document === 'undefined') return
  document.querySelector('.ca-root')?.scrollTo(0, 0)
  window.scrollTo(0, 0)
}

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`
}

function readSettings() {
  try {
    return { push: true, sms: true, email: false, reminders: true, ...JSON.parse(window.localStorage.getItem(SETTINGS_KEY) || '{}') }
  } catch {
    return { push: true, sms: true, email: false, reminders: true }
  }
}

function isCakeBuilder(shop) {
  return shop?.builder?.kind === 'cake'
}

function layerLimitFor(shop) {
  return isCakeBuilder(shop) ? shop.builder.maxLayers : 0
}

function optsFor(shop) {
  return cakeOptions(shop?.builder)
}

function shapesFor(shop) {
  return optsFor(shop).shapes
}

function flavoursFor(shop) {
  return optsFor(shop).flavours
}

function builderTitle(shop) {
  const noun = shop?.builder?.noun || 'cake'
  return `Build your own ${noun}`
}

function leadLabel(hours) {
  if (!hours) return 'Order ahead'
  if (hours >= 48 && hours % 24 === 0) {
    const days = hours / 24
    return days >= 14 && days % 7 === 0 ? `Order ${days / 7} weeks ahead` : `Order ${days} days ahead`
  }
  return `Order ${hours}h ahead`
}

function newBuild(shop) {
  const opts = optsFor(shop)
  const flavours = opts.flavours
  const layers = Math.min(DEFAULT_LAYERS, layerLimitFor(shop) || DEFAULT_LAYERS)
  return {
    shape: opts.shapes[0]?.id || 'round',
    size: (opts.sizes.find((item) => item.price === 0) || opts.sizes[0])?.id || '',
    flavor: (flavours.find((item) => item.id === 'chocolate') || flavours[0])?.id || '',
    chocolate: 'Dark',
    layerCount: layers,
    fillings: Array(layers).fill(opts.fillings[0]?.label || ''),
    sameFilling: true,
    frosting: (opts.frostings.find((item) => item.price === 0) || opts.frostings[0])?.id || '',
    toppings: [],
    message: '',
  }
}

function buildPrice(build, shop) {
  const opts = optsFor(shop)
  const shape = opts.shapes.find((item) => item.id === build.shape)
  const size = opts.sizes.find((item) => item.id === build.size)
  const flavor = opts.flavours.find((item) => item.id === build.flavor)
  const frosting = opts.frostings.find((item) => item.id === build.frosting)
  const toppings = opts.toppings.filter((item) => build.toppings.includes(item.id)).reduce((sum, item) => sum + Number(item.price || 0), 0)
  const fillings = build.fillings.slice(0, build.layerCount).reduce((sum, label) => sum + Number(opts.fillings.find((item) => item.label === label)?.price || 0), 0)
  return Math.max(0, Number(shape?.price || 0) + Number(size?.price || 0) + Number(flavor?.price || 0) + build.layerCount * opts.layerPrice + Number(frosting?.price || 0) + toppings + fillings)
}

function flavorName(build, shop) {
  const flavor = flavoursFor(shop).find((item) => item.id === build.flavor)
  if (build.flavor === 'chocolate') return `${build.chocolate.toLowerCase()} chocolate`
  return flavor?.label.toLowerCase() || ''
}

function buildSummary(build, shop) {
  const opts = optsFor(shop)
  const shape = opts.shapes.find((item) => item.id === build.shape)?.label || ''
  const size = opts.sizes.find((item) => item.id === build.size)?.label || ''
  const frosting = opts.frostings.find((item) => item.id === build.frosting)?.label.toLowerCase()
  const toppings = opts.toppings.filter((item) => build.toppings.includes(item.id)).map((item) => item.label.toLowerCase())
  return [`${shape} ${size}`, `${build.layerCount} layers of ${flavorName(build, shop)}`, frosting, ...toppings].filter(Boolean).join(' · ')
}

/* ----- general "build your own" (cupcakes, donuts, macarons, wedding tiers…) ----- */

function newCustom(shop) {
  const picks = {}
  ;(shop?.builder?.groups || []).forEach((group) => {
    if (group.type === 'single') picks[group.id] = group.required || group.options[0]?.price === 0 ? group.options[0].id : ''
    else if (group.type === 'multi') picks[group.id] = group.required ? [group.options[0].id] : []
    else if (group.type === 'count') picks[group.id] = group.default ?? group.min
    else picks[group.id] = ''
  })
  return picks
}

function customPrice(picks, shop) {
  const builder = shop?.builder || {}
  return (builder.groups || []).reduce((sum, group) => {
    const value = picks[group.id]
    if (group.type === 'single') return sum + (group.options.find((option) => option.id === value)?.price || 0)
    if (group.type === 'multi') return sum + group.options.filter((option) => (value || []).includes(option.id)).reduce((total, option) => total + option.price, 0)
    if (group.type === 'count') return sum + (Number(value) || 0) * (group.unitPrice || 0)
    return sum
  }, builder.base || 0)
}

function customFromPrice(shop) {
  const builder = shop?.builder || {}
  if (isCakeBuilder(shop)) {
    const opts = optsFor(shop)
    const cheapest = (list) => (list.length ? Math.min(...list.map((item) => Number(item.price) || 0)) : 0)
    return Math.max(0, cheapest(opts.shapes) + cheapest(opts.sizes) + cheapest(opts.flavours) + cheapest(opts.frostings) + Math.min(DEFAULT_LAYERS, opts.maxLayers) * opts.layerPrice)
  }
  return (builder.groups || []).reduce((sum, group) => {
    if (group.type === 'single' && group.required) return sum + Math.min(...group.options.map((option) => option.price))
    if (group.type === 'count') return sum + (group.min || 0) * (group.unitPrice || 0)
    return sum
  }, builder.base || 0)
}

function customSummary(picks, shop) {
  return (shop?.builder?.groups || []).flatMap((group) => {
    const value = picks[group.id]
    if (group.type === 'single') {
      const option = group.options.find((item) => item.id === value)
      return option && !/^no |^none$|^plain$/i.test(option.label) ? [option.label] : []
    }
    if (group.type === 'multi') return group.options.filter((option) => (value || []).includes(option.id)).map((option) => option.label)
    if (group.type === 'count') return value ? [`${value} ${group.unitLabel}${Number(value) === 1 ? '' : 's'}`] : []
    return []
  }).join(' · ')
}

function customMissing(picks, shop) {
  const group = (shop?.builder?.groups || []).find((item) => item.required && (item.type === 'multi' ? !(picks[item.id] || []).length : !picks[item.id]))
  return group ? `Choose ${group.title.toLowerCase()}` : ''
}

/* ---------- small building blocks ---------- */

function Icon({ name, size = 22 }) {
  const paths = {
    back: <path d="m15 18-6-6 6-6" />,
    close: <path d="M6 6l12 12M18 6 6 18" />,
    chevron: <path d="m9 6 6 6-6 6" />,
    home: <><path d="m3 11 9-7 9 7" /><path d="M5 10v10h14V10" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
    orders: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>,
    cart: <><path d="M6 6h15l-1.5 9h-12z" /><path d="M6 6 5 3H2" /><circle cx="9" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" /></>,
    cake: <><path d="M4 21h16v-8H4z" /><path d="M4 16c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5" /><path d="M12 13V9" /><path d="M12 6.5a1 1 0 0 0 0-2" /></>,
    pin: <><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></>,
    clock: <><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></>,
    card: <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" /><path d="M10 20a2 2 0 0 0 4 0" /></>,
    gear: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></>,
    help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5V14" /><path d="M12 17.5h.01" /></>,
    cupcake: <><path d="M6 12h12l-1.6 8.5a1 1 0 0 1-1 .8H8.6a1 1 0 0 1-1-.8z" /><path d="M5 12a3 3 0 0 1 2-5 4 4 0 0 1 7.5-1.5A3.5 3.5 0 0 1 19 12" /><path d="M10 15v3M14 15v3" /></>,
    donut: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="3" /><path d="M8 7.5l.5.8M15.5 7l-.4.9M17.5 12.5l-.9.2M7 15.5l.8-.4" /></>,
    cookie: <><circle cx="12" cy="12" r="8.5" /><circle cx="9" cy="9.5" r="1" /><circle cx="14.5" cy="8.5" r="1" /><circle cx="15" cy="14" r="1" /><circle cx="9.5" cy="15" r="1" /></>,
    macaron: <><path d="M4 10.5a8 4 0 0 1 16 0z" /><path d="M4 13.5a8 4 0 0 0 16 0z" /><path d="M3.5 12h17" /></>,
    icecream: <><path d="M5 11h14v9H5z" /><path d="M5 15h14" /><path d="M7 11a5 5 0 0 1 10 0" /></>,
    slice: <><path d="M3 18 19 8v10z" /><path d="M3 18 13 6.5a5 5 0 0 1 6 1.5" /><path d="M8 18v-2M13 18v-3" /></>,
    tiers: <><path d="M8 4h8v5H8z" /><path d="M5 9h14v5H5z" /><path d="M3 14h18v6H3z" /></>,
    filter: <path d="M4 6h16M7 12h10M10 18h4" />,
    heart: <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" />,
    check: <path d="m5 12 5 5 9-10" />,
    plus: <path d="M12 5v14M5 12h14" />,
    chat: <path d="M4 5h16v11H9l-5 4z" />,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
    store: <><path d="M4 10h16l-1-5H5z" /><path d="M5 10v10h14V10" /><path d="M10 20v-5h4v5" /></>,
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  )
}

function ShapeIcon({ id }) {
  const shapes = {
    round: <ellipse cx="42" cy="42" rx="34" ry="34" />,
    heart: <path d="M42 72C20 56 8 44 8 28a17 17 0 0 1 34-6 17 17 0 0 1 34 6c0 16-12 28-34 44z" />,
    tall: <rect x="24" y="8" width="36" height="68" rx="6" />,
    premium: <><rect x="28" y="8" width="28" height="20" rx="3" /><rect x="20" y="28" width="44" height="22" rx="3" /><rect x="12" y="50" width="60" height="26" rx="3" /></>,
    square: <rect x="10" y="10" width="64" height="64" rx="6" />,
    sheet: <rect x="6" y="20" width="72" height="44" rx="5" />,
    number: <path d="M30 22l12-10v62M28 74h28" />,
  }
  return (
    <svg className="ca-shape" width="84" height="84" viewBox="0 0 84 84" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" aria-hidden="true">
      {shapes[id] || shapes.round}
    </svg>
  )
}

function Section({ title, note, children }) {
  return (
    <section className="ca-option-section">
      <div className="ca-option-head"><h2 className="ca-h3">{title}</h2>{note ? <span className="ca-option-note">{note}</span> : null}</div>
      {children}
    </section>
  )
}

function Photo({ tint = '#F3E8E2', icon = 'cake', size = 30, className = '' }) {
  return (
    <div className={`ca-photo ${className}`} style={{ background: tint }} aria-hidden="true">
      <Icon name={icon} size={size} />
    </div>
  )
}

// A drawn cake for each bakery's cover until bakeries upload photos. Varies by shop so cards don't repeat.
function hashOf(text) {
  let h = 0
  for (const ch of String(text)) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h
}
const CAKE_PALETTES = [
  ['#F9D7E0', '#E88AA6', '#FFF4F7'], ['#FBE3C4', '#D9935B', '#FFF8EE'], ['#DDEBD5', '#7FAE74', '#F6FBF3'],
  ['#E3DCF5', '#9480C9', '#F8F5FF'], ['#D6E8F2', '#6FA3C2', '#F3F9FC'], ['#F6E2D8', '#C97B5D', '#FFF7F3'],
]
function CakeArt({ seed, className = '' }) {
  const h = hashOf(seed)
  const [cream, accent, ground] = CAKE_PALETTES[h % CAKE_PALETTES.length]
  const tiers = h % 3 === 0 ? 3 : 2
  const topper = (h >>> 3) % 3
  const widths = tiers === 3 ? [150, 112, 76] : [150, 104]
  const tierH = tiers === 3 ? 34 : 42
  let y = 128
  const parts = widths.map((w, i) => {
    y -= tierH
    const x = 160 - w / 2
    const drip = Array.from({ length: Math.floor(w / 18) }, (_, k) => `Q ${x + k * 18 + 9} ${y + 12 + ((k + i) % 2) * 7} ${x + (k + 1) * 18} ${y + 6}`).join(' ')
    return (
      <g key={i}>
        <rect x={x} y={y} width={w} height={tierH} rx="8" fill={cream} />
        <path d={`M ${x} ${y + 6} ${drip} L ${x + w} ${y + 6} L ${x + w} ${y + 4} Q ${x + w} ${y} ${x + w - 8} ${y} L ${x + 8} ${y} Q ${x} ${y} ${x} ${y + 4} Z`} fill={accent} />
        <rect x={x} y={y + tierH - 6} width={w} height="4" fill={accent} opacity="0.35" />
      </g>
    )
  })
  const topY = y
  return (
    <div className={`ca-cake-art ${className}`} style={{ background: ground }} aria-hidden="true">
      <svg viewBox="0 0 320 150" preserveAspectRatio="xMidYMax meet">
        <ellipse cx="160" cy="132" rx="104" ry="9" fill={accent} opacity="0.18" />
        <rect x="58" y="126" width="204" height="6" rx="3" fill="#FFFFFF" stroke={accent} strokeOpacity="0.35" />
        {parts}
        {topper === 0 ? [148, 160, 172].map((cx, i) => (
          <g key={cx}><rect x={cx - 2} y={topY - 20} width="4" height="20" rx="2" fill={i === 1 ? accent : '#FFFFFF'} stroke={accent} strokeWidth="1" /><path d={`M ${cx} ${topY - 30} q 4 6 0 9 q -4 -3 0 -9`} fill="#F59E0B" /></g>
        )) : null}
        {topper === 1 ? [146, 160, 174].map((cx) => <circle key={cx} cx={cx} cy={topY - 6} r="7" fill="#E11D48" opacity="0.85" />) : null}
        {topper === 2 ? <path d={`M 160 ${topY - 26} c -10 -12 -24 0 0 18 c 24 -18 10 -30 0 -18`} fill={accent} /> : null}
      </svg>
    </div>
  )
}

function TopBar({ title, onBack, right }) {
  return (
    <header className="ca-topbar">
      {onBack ? (
        <button type="button" className="ca-icon-btn" aria-label="Back" onClick={onBack}><Icon name="back" /></button>
      ) : <span className="ca-icon-spacer" />}
      <h1 className="ca-topbar-title">{title}</h1>
      {right || <span className="ca-icon-spacer" />}
    </header>
  )
}

function Segmented({ value, options, onChange, label }) {
  return (
    <div className="ca-segmented" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={value === option.id}
          className={value === option.id ? 'is-active' : ''}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function BottomNav({ view, go, cartCount, unread }) {
  const tabs = [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'search', label: 'Search', icon: 'search' },
    { id: 'orders', label: 'Orders', icon: 'orders' },
    { id: 'account', label: 'Account', icon: 'user' },
  ]
  return (
    <nav className="ca-bottomnav" aria-label="Main">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={view === tab.id ? 'is-active' : ''}
          aria-current={view === tab.id ? 'page' : undefined}
          onClick={() => go(tab.id)}
        >
          <span className="ca-nav-icon">
            <Icon name={tab.icon} size={24} />
            {tab.id === 'orders' && (cartCount || unread) ? <span className="ca-badge">{cartCount || unread}</span> : null}
          </span>
          {tab.label}
        </button>
      ))}
    </nav>
  )
}

function StickyBar({ children }) {
  return <div className="ca-sticky">{children}</div>
}

/* ---------- main component ---------- */

export default function CustomerApp({ ctx }) {
  const {
    view: rawView, setView, cart, setCart, uiState, setUiState,
    customerShopId, setCustomerShopId,
  } = ctx
  const view = LEGACY_VIEWS[rawView] || rawView

  const [itemId, setItemId] = useState('')
  const [itemNote, setItemNote] = useState('')
  const [liveShops, setLiveShops] = useState([])
  // Sample bakeries show how the app works until real ones join. Admin turns them off at launch.
  const [showSamples, setShowSamples] = useState(true)
  const bakeries = useMemo(() => [...liveShops, ...(showSamples ? SHOPS.map((shop) => ({ ...shop, sample: true })) : [])], [liveShops, showSamples])
  const [sbUser, setSbUser] = useState(null)
  const [myOrders, setMyOrders] = useState([])
  const [details, setDetails] = useState(readDetails)
  const [origin, setOrigin] = useState(null) // { lat, lng, label }
  const [locating, setLocating] = useState(false)
  const [pickedLocation, setPickedLocation] = useState(() => { try { return JSON.parse(window.localStorage.getItem('picked-location') || '{}') } catch { return {} } })
  const [checkout, setCheckout] = useState({ times: {}, addressId: '', line1: '', city: 'Vancouver', instructions: '', phone: '', tip: { mode: '15', kind: '%', amount: '' }, notes: '', cardId: '', cardName: '', cardLast4: '', placing: false, error: '' })
  const [build, setBuild] = useState(() => newBuild(SHOPS.find((item) => item.id === customerShopId) || SHOPS[0]))
  const [custom, setCustom] = useState(() => newCustom(SHOPS.find((item) => item.id === customerShopId) || SHOPS[0]))
  const [category, setCategory] = useState('all')
  const [query, setQuery] = useState('')
  const [pendingItem, setPendingItem] = useState(null)
  const [accountPage, setAccountPage] = useState('main')
  const [settings, setSettings] = useState(readSettings)
  const [openOrderId, setOpenOrderId] = useState('')
  const [placedIds, setPlacedIds] = useState([])
  const [dateOpenFor, setDateOpenFor] = useState(null)
  const [dayLoad, setDayLoad] = useState({})
  const [needDate, setNeedDate] = useState('')
  const [flavourQuery, setFlavourQuery] = useState('')
  const [showAllFlavours, setShowAllFlavours] = useState(false)
  const [needOpen, setNeedOpen] = useState(false)
  const [chat, setChat] = useState(null)
  const [chatReturn, setChatReturn] = useState('home')

  const bakery = bakeries.find((item) => item.id === customerShopId) || bakeries[0]
  const cartCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0)
  const cartTotals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + (item.unitPrice != null ? item.unitPrice * (item.quantity || 1) : item.totalPrice || 0), 0)
    const delivery = subtotal && ctx.fulfillmentType === 'delivery' ? DELIVERY_FEE : 0
    const service = subtotal ? SERVICE_FEE : 0
    const tax = Math.round((subtotal + delivery + service) * 0.05 * 100) / 100
    const tip = ctx.fulfillmentType === 'delivery' ? tipAmount(checkout.tip, subtotal) : 0
    return { subtotal, delivery, service, tax, tip, total: Math.round((subtotal + delivery + service + tax + tip) * 100) / 100 }
  }, [cart, ctx.fulfillmentType, checkout.tip])

  const signedIn = Boolean(sbUser)

  // After a delivery arrives, ask once for a tip if none was added at checkout.
  const [tipDismissed, setTipDismissed] = useState(() => { try { return JSON.parse(window.localStorage.getItem('tip-dismissed') || '[]') } catch { return [] } })
  function dismissTip(id) {
    const next = [...new Set([...tipDismissed, id])].slice(-100)
    setTipDismissed(next)
    try { window.localStorage.setItem('tip-dismissed', JSON.stringify(next)) } catch { /* ignore */ }
  }
  const needsTip = (order) => order.fulfillment === 'delivery' && order.status === 'delivered' && !Number(order.tip) && !order.tip_added_at && !tipDismissed.includes(order.id)
  const tipPromptOrder = signedIn ? myOrders.find((order) => needsTip(order) && Date.now() - new Date(order.ready_at || order.created_at).getTime() < 7 * 86400000) : null
  const cartShop = cart.length ? bakeries.find((item) => item.id === cart[0].shopId) : null
  const [conversations, loadConversations] = useConversations(sbUser ? { customerId: sbUser.id } : null, Boolean(sbUser))
  const occasionData = useOccasions(sbUser)
  const [hidePrompt, setHidePrompt] = useState(promptDismissed)
  const unreadMessages = conversations.reduce((sum, item) => sum + (item.customer_unread || 0), 0)

  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get('view')
    if (wanted === 'messages' || wanted === 'occasions') setView(wanted)
  }, [setView])

  // How booked each day is, so full days are greyed out.
  useEffect(() => {
    if (!cartShop?.live || !cartShop.dailyCapacity) { setDayLoad({}); return }
    const from = vanDate()
    supabase.rpc('bakery_day_load', { p_bakery: cartShop.id, p_from: from, p_to: addDays(from, 180) })
      .then(({ data }) => setDayLoad(Object.fromEntries((data || []).map((row) => [row.day, row.orders]))))
  }, [cartShop?.id, cartShop?.live, cartShop?.dailyCapacity])

  // Each cart item keeps its own date; fix any date that is no longer possible.
  useEffect(() => {
    if (!cart.length || !cartShop) return
    let changed = false
    const next = cart.map((item) => {
      const lead = leadFor(item, cartShop)
      if (item.date && dayStatus(item.date, cartShop, lead, dayLoad) === 'ok') return item
      changed = true
      return { ...item, date: earliestDay(cartShop, lead, dayLoad) }
    })
    if (changed) setCart(next)
  }, [cart, cartShop, dayLoad, setCart])

  useEffect(() => {
    if (!supabase) return undefined
    supabase.auth.getSession().then(({ data }) => setSbUser(data.session?.user || null))
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => { if (event !== 'TOKEN_REFRESHED') setSbUser(session?.user || null) })
    supabase.from('bakeries').select('*').eq('active', true).then(({ data }) => setLiveShops((data || []).map(liveShopFromRow)))
    supabase.from('app_settings').select('value').eq('key', 'show_sample_shops').maybeSingle().then(({ data }) => {
      if (data && (data.value === false || data.value === 'false')) setShowSamples(false)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const loadOrders = useCallback(async () => {
    if (!supabase || !sbUser) { setMyOrders([]); return }
    const { data } = await supabase.from('orders').select('*').eq('customer_id', sbUser.id).order('created_at', { ascending: false }).limit(50)
    setMyOrders(data || [])
  }, [sbUser])

  useEffect(() => {
    loadOrders()
    if (!sbUser || !(view === 'orders' || placedIds.length)) return undefined
    const timer = setInterval(loadOrders, 15000)
    return () => clearInterval(timer)
  }, [loadOrders, sbUser, view, placedIds.length])

  // Where distances are measured from: the customer's saved address, or their device location if they tap the button.
  const homeAddress = details.addresses[0]
  useEffect(() => {
    if (!homeAddress?.line1 || origin?.from === 'device') return undefined
    let live = true
    geocode(homeAddress.line1, homeAddress.city).then((point) => { if (live && point) setOrigin({ ...point, from: 'address', label: homeAddress.line1 }) })
    return () => { live = false }
  }, [homeAddress?.line1, homeAddress?.city]) // eslint-disable-line react-hooks/exhaustive-deps

  function locateMe() {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => { setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude, from: 'device', label: 'your location' }); setLocating(false) },
      () => setLocating(false),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    )
  }

  function locationsWithDistance(shop) {
    const list = shopLocations(shop).map((item) => ({ ...item, km: distanceKm(origin, item) }))
    const known = list.filter((item) => item.km != null)
    const nearestId = known.length ? known.reduce((a, b) => (b.km < a.km ? b : a)).id : null
    return list.map((item) => ({ ...item, nearest: list.length > 1 && item.id === nearestId }))
  }

  function chosenLocation(shop) {
    const list = locationsWithDistance(shop)
    return list.find((item) => item.id === pickedLocation[shop.id]) || list.find((item) => item.nearest) || list[0]
  }

  function pickLocation(shopId, locationId) {
    const next = { ...pickedLocation, [shopId]: locationId }
    setPickedLocation(next)
    try { window.localStorage.setItem('picked-location', JSON.stringify(next)) } catch { /* ignore */ }
  }

  function renderLocationPicker(shop) {
    const list = locationsWithDistance(shop)
    if (list.length < 2) return null
    const chosen = chosenLocation(shop)
    return (
      <div className="ca-stack-8">
        <div className="ca-row-between">
          <h2 className="ca-h3">Choose a location</h2>
          {!origin ? <button type="button" className="ca-link" disabled={locating} onClick={locateMe}>{locating ? 'Finding you…' : 'Use my location'}</button> : <span className="ca-muted ca-small">From {origin.label}</span>}
        </div>
        <div className="ca-loc-list" role="radiogroup" aria-label={`${shop.name} locations`}>
          {list.map((item) => (
            <button key={item.id} type="button" role="radio" aria-checked={chosen.id === item.id} className={`ca-loc ${chosen.id === item.id ? 'is-on' : ''}`} onClick={() => pickLocation(shop.id, item.id)}>
              <span className="ca-loc-dot" aria-hidden="true" />
              <span className="ca-loc-text">
                <strong>{item.name || item.city}</strong>
                <span className="ca-muted ca-small">{[item.address, item.city].filter(Boolean).join(', ')}</span>
              </span>
              <span className="ca-loc-km">
                {item.nearest ? <span className="ca-loc-nearest">Nearest</span> : null}
                {item.km != null ? <span className="ca-small">{kmLabel(item.km)}</span> : null}
              </span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  function saveDetails(next) {
    setDetails(next)
    try { window.localStorage.setItem(DETAILS_KEY, JSON.stringify(next)) } catch { /* storage unavailable */ }
  }

  function go(next) {
    setUiState((current) => ({ ...current, error: '', message: '' }))
    if (next === 'account') setAccountPage('main')
    setView(next)
    scrollTop()
  }

  function openBakery(id) {
    setCustomerShopId(id)
    go('bakery')
  }

  function startBuild(id) {
    const shop = bakeries.find((item) => item.id === id) || bakery
    setCustomerShopId(shop.id)
    setBuild(newBuild(shop))
    setCustom(newCustom(shop))
    setNeedDate('')
    setNeedOpen(false)
    setFlavourQuery('')
    setShowAllFlavours(false)
    go('build')
  }

  function addItemToCart(item) {
    const otherShop = cart.find((entry) => entry.shopId && entry.shopId !== item.shopId)
    if (otherShop) {
      const target = bakeries.find((entry) => entry.id === item.shopId) || bakery
      const lead = leadFor(item, target)
      setPendingItem({ ...item, date: needDate && dayStatus(needDate, target, lead) === 'ok' ? needDate : '' })
      return
    }
    const shop = bakeries.find((entry) => entry.id === item.shopId) || bakery
    const lead = leadFor(item, shop)
    const picked = needDate && dayStatus(needDate, shop, lead, dayLoad) === 'ok' ? needDate : ''
    const dated = { ...item, date: item.date || picked || earliestDay(shop, lead, dayLoad) }
    setCart((current) => [...current, dated])
    setUiState((current) => ({ ...current, error: '', message: `${item.title} added to your cart.` }))
    go('checkout')
  }

  function confirmNewCart() {
    const shop = bakeries.find((entry) => entry.id === pendingItem.shopId) || bakery
    setCart([{ ...pendingItem, date: pendingItem.date || earliestDay(shop, leadFor(pendingItem, shop)) }])
    setPendingItem(null)
    go('checkout')
  }

  function updateSetting(key, value) {
    setSettings((current) => {
      const next = { ...current, [key]: value }
      try { window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)) } catch { /* storage unavailable */ }
      return next
    })
  }

  async function openChat(shop, fromView) {
    if (!signedIn) { ctx.openCustomerSignIn(); return }
    const { data, error } = await supabase.rpc('start_conversation', { p_bakery_id: shop.id, p_bakery_name: shop.name, p_phone: details.phone || null })
    if (error) { setUiState((current) => ({ ...current, error: friendlyError(error) })); return }
    setChat({ id: data, bakery_name: shop.name })
    setChatReturn(fromView || view)
    go('messages')
    loadConversations()
  }

  /* ----- screens ----- */

  function renderToast() {
    const text = uiState.error || uiState.message
    if (!text || view === 'auth') return null
    return (
      <div className={`ca-toast ${uiState.error ? 'is-error' : ''}`} role="status">
        <span>{text}</span>
        <button type="button" aria-label="Dismiss" onClick={() => setUiState((current) => ({ ...current, error: '', message: '' }))}><Icon name="close" size={16} /></button>
      </div>
    )
  }

  function renderBakeryCard(item) {
    const ready = shopEarliest(item)
    const from = customFromPrice(item)
    return (
      <button key={item.id} type="button" className="ca-store-card" onClick={() => openBakery(item.id)}>
        <span className="ca-store-cover">
          <CakeArt seed={item.id} className="ca-store-photo" />
          {item.sample ? <span className="ca-cover-tag">Preview</span> : item.live ? <span className="ca-cover-tag is-new">New</span> : null}
        </span>
        <span className="ca-store-row">
          <span className="ca-store-text">
            <span className="ca-store-name">{item.name}</span>
            <span className="ca-muted">{item.area} · {item.tagline}</span>
            <span className="ca-store-facts">
              {from ? <span>From {money(from)}</span> : null}
              {ready ? <span>Ready {dateLabel(ready)}</span> : null}
            </span>
          </span>
        </span>
      </button>
    )
  }

  function renderHowItWorks() {
    if (signedIn && myOrders.length) return null
    return (
      <div className="ca-pad ca-section">
        <ol className="ca-how-strip" aria-label="How it works">
          <li><span>1</span>Pick a bakery</li>
          <li><span>2</span>Design your cake</li>
          <li><span>3</span>Pick the day</li>
        </ol>
      </div>
    )
  }

  function renderHome() {
    const shown = category === 'all' ? bakeries : bakeries.filter((item) => item.category === category)
    return (
      <div className="ca-screen has-nav">
        <div className="ca-pad ca-stack-14">
          <div className="ca-home-head">
            <div>
              <span className="ca-muted ca-small">{BRAND.tagline}</span>
              <span className="ca-home-place">{BRAND.region}</span>
            </div>
            <button type="button" className="ca-round-btn" aria-label={`Cart, ${cartCount} items`} onClick={() => go('checkout')}>
              <Icon name="cart" size={20} />
              {cartCount ? <span className="ca-badge">{cartCount}</span> : null}
            </button>
          </div>
          <Segmented label="Delivery or pickup" value={ctx.fulfillmentType} onChange={ctx.setFulfillmentType} options={[{ id: 'delivery', label: 'Delivery' }, { id: 'pickup', label: 'Pickup' }]} />
          <button type="button" className="ca-search-fake" onClick={() => go('search')}>
            <Icon name="search" size={18} /><span>Search cakes, cupcakes, bakeries</span>
          </button>
        </div>
        {renderHowItWorks()}
        {renderOccasionCard()}
        <div className="ca-cats" role="tablist" aria-label="Shop type">
          {CATEGORIES.map((item) => (
            <button key={item.id} type="button" role="tab" aria-selected={category === item.id} className={`ca-cat ${category === item.id ? 'is-active' : ''}`} onClick={() => setCategory(item.id)}>{item.label}</button>
          ))}
        </div>
        {category === 'all' && bakeries.length > 3 ? (
          <div className="ca-section">
            <div className="ca-pad ca-row-between"><h2 className="ca-h2 ca-mb-0">Ready soonest</h2></div>
            <div className="ca-carousel">
              {[...bakeries].sort((a, b) => String(shopEarliest(a) || '9').localeCompare(String(shopEarliest(b) || '9'))).slice(0, 8).map((item) => (
                <button key={item.id} type="button" className="ca-mini-card" onClick={() => openBakery(item.id)}>
                  <span className="ca-store-cover"><CakeArt seed={item.id} className="ca-mini-photo" />{item.sample ? <span className="ca-cover-tag">Preview</span> : null}</span>
                  <span className="ca-mini-name">{item.name}</span>
                  <span className="ca-mini-meta">Ready {shopEarliest(item) ? dateLabel(shopEarliest(item)) : 'soon'}{customFromPrice(item) ? ` · from ${money(customFromPrice(item))}` : ''}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <div className="ca-pad ca-section">
          <h2 className="ca-h2">{category === 'all' ? `All bakeries · ${bakeries.length}` : `${CATEGORIES.find((item) => item.id === category)?.label} · ${shown.length}`}</h2>
          {!shown.length ? (
            <div className="ca-empty-block">
              <strong>{bakeries.length ? 'No bakeries of this type yet' : 'Bakeries are joining now'}</strong>
              <span className="ca-muted">{bakeries.length ? 'Try another category.' : 'We’re signing up local bakers. Check back soon, or save your important dates so we can remind you.'}</span>
            </div>
          ) : null}
          <div className="ca-stack-14">{shown.map(renderBakeryCard)}</div>
        </div>
      </div>
    )
  }

  // "When do you need it?" picker on item and build screens.
  function renderNeedDate(lead) {
    const load = cartShop?.id === bakery.id ? dayLoad : {}
    const first = earliestDay(bakery, lead, load)
    const value = needDate && dayStatus(needDate, bakery, lead, load) === 'ok' ? needDate : first
    return (
      <div className="ca-pad ca-section ca-stack-8">
        <span className="ca-label">When do you need it?</span>
        <div className="ca-row-between">
          <button type="button" className={`cx-date-btn ${needOpen ? 'is-open' : ''}`} aria-expanded={needOpen} onClick={() => setNeedOpen(!needOpen)}>
            <Icon name="calendar" size={16} />{value ? dateLabel(value, true) : 'Pick a date'}<span className="ca-accent-text">{needOpen ? 'Done' : 'Change'}</span>
          </button>
          <span className="cx-note">{noticeLabel(lead)}</span>
        </div>
        {needOpen ? (
          <>
            <MonthCalendar
              compact
              scrollOnOpen
              value={value}
              initial={value}
              onPick={(day) => { setNeedDate(day); setNeedOpen(false) }}
              cell={(day) => {
                const status = dayStatus(day, bakery, lead, load)
                return { disabled: status !== 'ok', note: STATUS_HINT[status] || '', tone: status === 'full' ? 'full' : status === 'closed' || status === 'blocked' ? 'off' : '' }
              }}
            />
            <span className="cx-note">Greyed-out days: not enough notice for this item, the shop is closed, or it's fully booked.</span>
          </>
        ) : null}
      </div>
    )
  }

  function renderOccasionCard() {
    if (!signedIn || !occasionData.loaded) return null
    const soon = upcoming(occasionData.list, 45).slice(0, 3)
    if (soon.length) {
      return (
        <div className="ca-pad ca-section">
          <div className="ca-occasion-card">
            <div className="ca-row-between"><strong>Coming up</strong><button type="button" className="ca-link" onClick={() => go('occasions')}>All dates</button></div>
            {soon.map((item) => (
              <div key={item.id} className="ca-row-between ca-small">
                <span>{occasionTitle(item)}</span><span className={item.days <= 14 ? 'ca-accent-text' : 'ca-muted'}>{countdown(item.days)}</span>
              </div>
            ))}
          </div>
        </div>
      )
    }
    if (occasionData.list.length || hidePrompt) return null
    return (
      <div className="ca-pad ca-section">
        <div className="ca-occasion-card is-prompt">
          <strong>Never miss a cake day</strong>
          <span className="ca-small ca-lh">Save birthdays, anniversaries and big moments. We’ll text you 2 weeks before so there’s time for a custom cake.</span>
          <div className="ca-row-start">
            <button type="button" className="ca-btn ca-btn-small" onClick={() => go('occasions')}>Add dates</button>
            <button type="button" className="ca-link" onClick={() => { dismissPrompt(); setHidePrompt(true) }}>Not now</button>
          </div>
        </div>
      </div>
    )
  }

  function renderSearch() {
    const term = query.trim().toLowerCase()
    const bakeryHits = term ? bakeries.filter((item) => `${item.name} ${item.area} ${item.tagline} ${item.category} ${item.builder.noun}`.toLowerCase().includes(term)) : []
    const itemHits = term
      ? bakeries.flatMap((item) => item.menu.filter((preset) => `${preset.title} ${preset.detail}`.toLowerCase().includes(term)).map((preset) => ({ ...preset, shop: item })))
      : []
    return (
      <div className="ca-screen has-nav">
        <div className="ca-pad ca-stack-14">
          <h1 className="ca-h1">Search</h1>
          <label className="ca-search">
            <Icon name="search" size={18} />
            <span className="ca-sr">Search</span>
            <input type="search" value={query} autoFocus placeholder="Cupcakes, matcha, wedding, Kitsilano…" onChange={(event) => setQuery(event.target.value)} />
          </label>
        </div>
        <div className="ca-pad ca-section ca-stack-10">
          {!term ? <p className="ca-muted">Search by cake, flavour or bakery.</p> : null}
          {term && !bakeryHits.length && !itemHits.length ? <p className="ca-muted">Nothing matches “{query}” yet.</p> : null}
          {bakeryHits.map((item) => (
            <button key={item.id} type="button" className="ca-list-row" onClick={() => openBakery(item.id)}>
              <span className="ca-list-icon"><Icon name="store" /></span>
              <span className="ca-list-text"><strong>{item.name}</strong><span className="ca-muted">{item.area} · {item.tagline}</span></span>
              <Icon name="chevron" size={18} />
            </button>
          ))}
          {itemHits.map((preset) => (
            <button key={preset.id} type="button" className="ca-list-row" onClick={() => { setCustomerShopId(preset.shop.id); setItemId(preset.id); setItemNote(''); go('item') }}>
              <span className="ca-list-icon"><Icon name="cake" /></span>
              <span className="ca-list-text"><strong>{preset.title}</strong><span className="ca-muted">{preset.shop.name} · {money(preset.price)}</span></span>
              <Icon name="chevron" size={18} />
            </button>
          ))}
        </div>
      </div>
    )
  }

  function renderBakery() {
    const items = bakery.menu
    const limit = layerLimitFor(bakery)
    const builderLead = Number(bakery.builder?.leadHours) || 0
    return (
      <div className="ca-screen">
        <div className="ca-banner">
          <CakeArt seed={bakery.id} className="ca-banner-photo" />
          <button type="button" className="ca-float-btn ca-float-left" aria-label="Back" onClick={() => go('home')}><Icon name="back" size={20} /></button>
        </div>
        <div className="ca-pad ca-stack-12 ca-pt-16">
          <div className="ca-stack-4">
            <h1 className="ca-h1">{bakery.name}</h1>
            <span className="ca-muted">{bakery.tagline}</span>
          </div>
          {bakery.sample ? <div className="ca-preview-note"><strong>Preview bakery.</strong> This sample shows how ordering works. You can design a cake, but you can’t order from it.</div> : null}
          {bakery.sample ? null : <button type="button" className="ca-btn ca-btn-ghost" onClick={() => openChat(bakery, 'bakery')}><Icon name="chat" size={18} />Message {bakery.name}</button>}
          {renderLocationPicker(bakery)}
        </div>
        <div className="ca-pad ca-section">
          <h2 className="ca-h2">Menu</h2>
          <button type="button" className="ca-menu-row" onClick={() => startBuild(bakery.id)}>
            <span className="ca-menu-text">
              <span className="ca-menu-title">{builderTitle(bakery)}</span>
              <span className="ca-muted">{limit ? `Choose the shape, sponge, up to ${limit} layers, fillings and toppings` : `Choose ${(bakery.builder.groups || []).slice(0, 4).map((group) => group.title.toLowerCase()).join(', ')} and more`}</span>
              <span className="ca-menu-price">From {money(customFromPrice(bakery))}{builderLead && builderLead !== bakery.leadHours ? <span className="ca-muted ca-small"> · {noticeLabel(builderLead)}</span> : null}</span>
            </span>
            <span className="ca-menu-thumb is-accent"><Icon name={bakery.icon} size={32} /><span className="ca-plus" aria-hidden="true"><Icon name="plus" size={16} /></span></span>
          </button>
          {items.map((item) => (
            <button key={item.id} type="button" className="ca-menu-row" onClick={() => { setItemId(item.id); setItemNote(''); setNeedDate(''); setNeedOpen(false); go('item') }}>
              <span className="ca-menu-text">
                <span className="ca-menu-title">{item.title}</span>
                <span className="ca-muted">{item.detail}</span>
                <span className="ca-menu-price">{money(item.price)}{item.leadHours && item.leadHours !== bakery.leadHours ? <span className="ca-muted ca-small"> · {noticeLabel(item.leadHours)}</span> : null}</span>
              </span>
              <span className="ca-menu-thumb" style={{ background: bakery.tint }}><Icon name={bakery.icon} size={30} /><span className="ca-plus" aria-hidden="true"><Icon name="plus" size={16} /></span></span>
            </button>
          ))}
        </div>
        {cartCount ? (
          <StickyBar>
            <button type="button" className="ca-btn ca-btn-cart" onClick={() => go('checkout')}>
              <span className="ca-cart-count">{cartCount}</span><span>View cart</span><span>{money(cartTotals.subtotal)}</span>
            </button>
          </StickyBar>
        ) : null}
      </div>
    )
  }

  function renderItem() {
    const item = bakery.menu.find((entry) => entry.id === itemId)
    if (!item) return renderBakery()
    const addPreset = () => addItemToCart({
      id: Date.now(),
      title: item.title,
      summary: [item.detail, itemNote ? `“${itemNote}”` : ''].filter(Boolean).join(' · '),
      layerCount: 1,
      unitPrice: item.price,
      quantity: 1,
      totalPrice: item.price,
      shopId: bakery.id,
      savedDesignId: null,
      config: {
        occasion: 'Ready-made',
        summary: [item.title, itemNote ? `“${itemNote}”` : ''].filter(Boolean).join(' · '),
        mode: 'preset',
        cakeType: 'round',
        layerCount: 1,
        presetId: item.id,
        message: itemNote,
        layers: [{ id: 0, name: item.title, bread: item.title, sugar: 'White sugar', cream: 'Buttercream', flavor: item.title }],
      },
    })
    return (
      <div className="ca-screen">
        <div className="ca-banner is-tall">
          <Photo tint={bakery.tint} icon={bakery.icon} size={56} className="ca-banner-photo" />
          <button type="button" className="ca-float-btn ca-float-left" aria-label="Close" onClick={() => go('bakery')}><Icon name="close" size={18} /></button>
        </div>
        <div className="ca-pad ca-stack-8 ca-pt-16">
          <h1 className="ca-h1">{item.title}</h1>
          <span className="ca-price-lg">{money(item.price)}</span>
          <p className="ca-muted ca-lh">{item.detail}</p>
        </div>
        <div className="ca-pad ca-section ca-stack-8">
          <label htmlFor="ca-item-note" className="ca-label">Message on cake <span className="ca-muted">· optional</span></label>
          <input id="ca-item-note" className="ca-input" maxLength={40} placeholder="e.g. Happy 30th, Maya!" value={itemNote} onChange={(event) => setItemNote(event.target.value)} />
        </div>
        {renderNeedDate(Number(item.leadHours) || bakery.leadHours)}
        <StickyBar>
          <button type="button" className="ca-btn" onClick={addPreset}>Add to cart · {money(item.price)}</button>
        </StickyBar>
      </div>
    )
  }

  function renderBuild() {
    if (!isCakeBuilder(bakery)) return renderCustomBuild()
    const limit = layerLimitFor(bakery)
    const opts = optsFor(bakery)
    const flavours = opts.flavours
    const price = buildPrice(build, bakery)
    const longList = flavours.length > 10
    const query = flavourQuery.trim().toLowerCase()
    let shownFlavours = flavours
    if (longList && !showAllFlavours) {
      shownFlavours = flavours.slice(0, 8)
      const chosen = flavours.find((item) => item.id === build.flavor)
      if (chosen && !shownFlavours.includes(chosen)) shownFlavours = [chosen, ...shownFlavours.slice(0, 7)]
    } else if (query) {
      shownFlavours = flavours.filter((item) => item.label.toLowerCase().includes(query))
    }
    const shapes = shapesFor(bakery)
    const set = (patch) => setBuild((current) => ({ ...current, ...patch }))
    const atMax = build.layerCount >= limit
    const bandHeight = build.layerCount > 6 ? 14 : build.layerCount > 4 ? 18 : 24
    const setLayers = (count) => {
      const next = Math.min(Math.max(count, 1), limit)
      setBuild((current) => ({
        ...current,
        layerCount: next,
        fillings: Array.from({ length: next }, (_, index) => (current.sameFilling ? current.fillings[0] : current.fillings[index] || current.fillings[0])),
      }))
    }
    const addToCart = () => {
      const flavor = flavours.find((item) => item.id === build.flavor) || flavours[0]
      const sponge = build.flavor === 'chocolate' ? `${build.chocolate} chocolate sponge` : `${flavor.label} sponge`
      const summary = buildSummary(build, bakery) + (build.message ? ` · “${build.message}”` : '')
      addItemToCart({
        id: Date.now(),
        title: `Custom ${flavorName(build, bakery)} ${bakery.builder.noun}`,
        summary,
        layerCount: build.layerCount,
        unitPrice: price,
        quantity: 1,
        totalPrice: price,
        shopId: bakery.id,
        savedDesignId: null,
        config: {
          occasion: 'Custom',
          summary,
          mode: limit > 4 ? 'advanced' : 'simple',
          cakeType: build.shape,
          layerCount: build.layerCount,
          size: build.size,
          frosting: build.frosting,
          toppings: build.toppings,
          message: build.message,
          layers: build.fillings.map((filling, index) => ({ id: index, name: `Layer ${index + 1}`, bread: sponge, sugar: 'White sugar', cream: filling, flavor: flavor.label })),
        },
      })
    }

    return (
      <div className="ca-screen">
        <div className="ca-banner">
          <div className="ca-stack-view is-banner" role="img" aria-label={`${build.layerCount} layer ${flavorName(build, bakery)} cake`}>
            <div className="ca-stack">
              <div className="ca-stack-top" />
              {Array.from({ length: build.layerCount }, (_, index) => (
                <div key={index} className="ca-stack-layer" style={{ height: bandHeight }} />
              ))}
              <div className="ca-stack-plate" />
            </div>
          </div>
          <button type="button" className="ca-float-btn ca-float-left" aria-label="Close" onClick={() => go('bakery')}><Icon name="close" size={18} /></button>
        </div>
        <div className="ca-pad ca-stack-8 ca-pt-16">
          <h1 className="ca-h1">{builderTitle(bakery)}</h1>
          <span className="ca-price-lg">From {money(customFromPrice(bakery))}</span>
          <p className="ca-muted ca-lh">Choose everything: shape, sponge, layers, fillings and toppings. {bakery.name} bakes it fresh for the day you choose.</p>
        </div>

        <div className="ca-pad ca-pb-24">
          <Section title="Shape" note="Required">
            <div className="ca-grid-3 ca-shape-grid">
              {shapes.map((shape) => (
                <button key={shape.id} type="button" aria-pressed={build.shape === shape.id} className={`ca-tile ${build.shape === shape.id ? 'is-selected' : ''}`} onClick={() => set({ shape: shape.id })}>
                  <ShapeIcon id={shape.id} />
                  <span className="ca-tile-row"><strong>{shape.label}</strong><span>{money(Number(shape.price) || 0)}</span></span>
                </button>
              ))}
            </div>
          </Section>

          <Section title="Size" note="Required">
            <div className="ca-grid-3">
              {opts.sizes.map((size) => (
                <button key={size.id} type="button" aria-pressed={build.size === size.id} className={`ca-size ${build.size === size.id ? 'is-selected' : ''}`} onClick={() => set({ size: size.id })}>
                  <strong>{size.label}</strong>{size.serves ? <small>Serves {size.serves}</small> : null}<span>{Number(size.price) > 0 ? `+${money(size.price)}` : Number(size.price) < 0 ? `−${money(-size.price)}` : 'Included'}</span>
                </button>
              ))}
            </div>
          </Section>

          <Section title="Cake flavour" note={longList ? `${flavours.length} flavours` : 'Required'}>
            {longList && showAllFlavours ? (
              <input className="ca-input ca-mb-10" type="search" aria-label="Search flavours" placeholder="Search flavours" value={flavourQuery} onChange={(event) => setFlavourQuery(event.target.value)} />
            ) : null}
            <div className="ca-stack-10">
              {!shownFlavours.length ? <p className="ca-muted">No flavours match “{flavourQuery}”.</p> : null}
              {shownFlavours.map((flavor) => {
                const selected = build.flavor === flavor.id
                return (
                  <div key={flavor.id} className={`ca-flavor ${selected ? 'is-selected' : ''}`}>
                    <button type="button" aria-pressed={selected} className="ca-flavor-row" onClick={() => set({ flavor: flavor.id })}>
                      <span className={`ca-swatch ${flavor.swatch === 'marble' ? 'is-marble' : flavor.swatch === 'rainbow' ? 'is-rainbow' : ''}`} style={flavor.swatch === 'marble' || flavor.swatch === 'rainbow' ? undefined : { background: flavor.swatch || '#EADFD3' }} aria-hidden="true" />
                      <strong>{flavor.label}</strong>
                      <span className="ca-muted">{flavor.price ? `+${money(flavor.price)}` : 'Included'}</span>
                    </button>
                    {selected && flavor.id === 'chocolate' ? (
                      <div className="ca-subchoice">
                        <span className="ca-small ca-strong-muted">Which chocolate?</span>
                        <div className="ca-grid-3">
                          {CHOCOLATES.map((kind) => (
                            <button key={kind} type="button" aria-pressed={build.chocolate === kind} className={`ca-pill ${build.chocolate === kind ? 'is-dark' : ''}`} onClick={() => set({ chocolate: kind })}>{kind}</button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
            {longList ? (
              <button type="button" className="ca-btn ca-btn-ghost ca-mt-12" onClick={() => { setShowAllFlavours(!showAllFlavours); setFlavourQuery('') }}>
                {showAllFlavours ? 'Show fewer flavours' : `Show all ${flavours.length} flavours`}
              </button>
            ) : null}
          </Section>

          <Section title="Layers" note={`Up to ${limit} at this bakery`}>
            <div className="ca-layer-controls is-boxed">
              <div className="ca-stack-2">
                <strong>{build.layerCount} layers</strong>
                <span className={atMax ? 'ca-warn ca-small' : 'ca-muted ca-small'}>{atMax ? 'That’s the most this bakery can make' : (opts.layerPrice ? `+${money(opts.layerPrice)} per layer` : 'Extra layers included')}</span>
              </div>
              <div className="ca-stepper">
                <button type="button" aria-label="Remove a layer" disabled={build.layerCount <= 1} onClick={() => setLayers(build.layerCount - 1)}>−</button>
                <button type="button" aria-label="Add a layer" className="is-dark" disabled={atMax} onClick={() => setLayers(build.layerCount + 1)}>+</button>
              </div>
            </div>
          </Section>

          {opts.fillings.length ? <Section title="Filling between layers">
            <label className="ca-check-label ca-mb-10">
              <input type="checkbox" checked={build.sameFilling} onChange={(event) => set({ sameFilling: event.target.checked, fillings: event.target.checked ? build.fillings.map(() => build.fillings[0]) : build.fillings })} />
              Same filling in every layer
            </label>
            <ul className="ca-layer-list">
              {(build.sameFilling ? [build.fillings[0]] : build.fillings).map((filling, index) => (
                <li key={index}>
                  <label htmlFor={`ca-fill-${index}`} className="ca-layer-label">{build.sameFilling ? 'Every layer' : `Layer ${index + 1}`}</label>
                  <select
                    id={`ca-fill-${index}`}
                    className="ca-select"
                    value={filling}
                    onChange={(event) => setBuild((current) => ({
                      ...current,
                      fillings: current.sameFilling ? current.fillings.map(() => event.target.value) : current.fillings.map((value, i) => (i === index ? event.target.value : value)),
                    }))}
                  >
                    {opts.fillings.map((option) => <option key={option.id} value={option.label}>{option.label}{Number(option.price) ? ` (+${money(option.price)} per layer)` : ''}</option>)}
                  </select>
                </li>
              ))}
            </ul>
          </Section> : null}

          {opts.frostings.length > 9 ? <Section title="Outside frosting" note={`${opts.frostings.length} options`}>
            <select aria-label="Outside frosting" className="ca-select" value={build.frosting} onChange={(event) => set({ frosting: event.target.value })}>
              {opts.frostings.map((frosting) => <option key={frosting.id} value={frosting.id}>{frosting.label}{Number(frosting.price) ? ` (+${money(frosting.price)})` : ''}</option>)}
            </select>
          </Section> : null}
          {opts.frostings.length && opts.frostings.length <= 9 ? <Section title="Outside frosting" note="Required">
            <div className="ca-grid-3">
              {opts.frostings.map((frosting) => (
                <button key={frosting.id} type="button" aria-pressed={build.frosting === frosting.id} className={`ca-size ${build.frosting === frosting.id ? 'is-selected' : ''}`} onClick={() => set({ frosting: frosting.id })}>
                  <strong className="ca-small-strong">{frosting.label}</strong><span>{Number(frosting.price) ? `+${money(frosting.price)}` : 'Included'}</span>
                </button>
              ))}
            </div>
          </Section> : null}

          {opts.toppings.length ? <Section title="Toppings" note="Optional">
            <div className="ca-wrap">
              {opts.toppings.map((topping) => {
                const on = build.toppings.includes(topping.id)
                return (
                  <button key={topping.id} type="button" aria-pressed={on} className={`ca-pill ${on ? 'is-dark' : ''}`} onClick={() => set({ toppings: on ? build.toppings.filter((id) => id !== topping.id) : [...build.toppings, topping.id] })}>
                    {topping.label}{Number(topping.price) ? ` · +${money(topping.price)}` : ''}
                  </button>
                )
              })}
            </div>
          </Section> : null}

          <Section title="Message on top" note="Optional">
            <input id="ca-build-msg" aria-label="Message on top" className="ca-input" maxLength={40} placeholder="e.g. Happy 30th, Maya!" value={build.message} onChange={(event) => set({ message: event.target.value })} />
          </Section>

          <div className="ca-summary ca-mt-16">
            <strong>Your cake</strong>
            <span>{buildSummary(build, bakery)}</span>
          </div>
        </div>
        {renderNeedDate(Number(bakery.builder?.leadHours) || bakery.leadHours)}
        <StickyBar>
          <button type="button" className="ca-btn" onClick={addToCart}>Add to cart · {money(price)}</button>
        </StickyBar>
      </div>
    )
  }

  function renderCustomBuild() {
    const builder = bakery.builder
    const price = customPrice(custom, bakery)
    const missing = customMissing(custom, bakery)
    const setPick = (id, value) => setCustom((current) => ({ ...current, [id]: value }))
    const summary = customSummary(custom, bakery)
    const textGroup = builder.groups.find((group) => group.type === 'text')
    const note = textGroup ? String(custom[textGroup.id] || '').trim() : ''
    const addToCart = () => addItemToCart({
      id: Date.now(),
      title: `Custom ${builder.noun}`,
      summary: summary + (note ? ` · “${note}”` : ''),
      layerCount: 1,
      unitPrice: price,
      quantity: 1,
      totalPrice: price,
      shopId: bakery.id,
      savedDesignId: null,
      config: {
        occasion: 'Custom',
        kind: builder.noun,
        summary: summary + (note ? ` · “${note}”` : ''),
        mode: 'custom',
        cakeType: bakery.category,
        layerCount: 1,
        selections: custom,
        message: note,
        layers: [{ id: 0, name: `Custom ${builder.noun}`, bread: summary, sugar: '', cream: '', flavor: summary }],
      },
    })

    return (
      <div className="ca-screen">
        <div className="ca-banner">
          <Photo tint={bakery.tint} icon={bakery.icon} size={64} className="ca-banner-photo" />
          <button type="button" className="ca-float-btn ca-float-left" aria-label="Close" onClick={() => go('bakery')}><Icon name="close" size={18} /></button>
        </div>
        <div className="ca-pad ca-stack-8 ca-pt-16">
          <h1 className="ca-h1">{builderTitle(bakery)}</h1>
          <span className="ca-price-lg">From {money(customFromPrice(bakery))}</span>
          <p className="ca-muted ca-lh">Pick every detail. {bakery.name} makes it fresh for you. {leadLabel(bakery.leadHours)}.</p>
        </div>
        <div className="ca-pad ca-pb-24">
          {builder.groups.map((group) => {
            const value = custom[group.id]
            if (group.type === 'text') {
              return (
                <Section key={group.id} title={group.title} note="Optional">
                  <input aria-label={group.title} className="ca-input" maxLength={60} placeholder={group.placeholder} value={value || ''} onChange={(event) => setPick(group.id, event.target.value)} />
                </Section>
              )
            }
            if (group.type === 'count') {
              const step = group.step || 1
              return (
                <Section key={group.id} title={group.title} note={group.note}>
                  <div className="ca-layer-controls is-boxed">
                    <div className="ca-stack-2">
                      <strong>{value} {group.unitLabel}{Number(value) === 1 ? '' : 's'}</strong>
                      <span className={value >= group.max ? 'ca-warn ca-small' : 'ca-muted ca-small'}>{value >= group.max ? `${group.max} is the most this shop makes` : `+${money(group.unitPrice * step)} per ${step > 1 ? `${step} ${group.unitLabel}s` : group.unitLabel}`}</span>
                    </div>
                    <div className="ca-stepper">
                      <button type="button" aria-label={`Fewer ${group.unitLabel}s`} disabled={value <= group.min} onClick={() => setPick(group.id, Math.max(group.min, value - step))}>−</button>
                      <button type="button" aria-label={`More ${group.unitLabel}s`} className="is-dark" disabled={value >= group.max} onClick={() => setPick(group.id, Math.min(group.max, value + step))}>+</button>
                    </div>
                  </div>
                </Section>
              )
            }
            if (group.type === 'multi') {
              const chosen = value || []
              const full = group.max && chosen.length >= group.max
              return (
                <Section key={group.id} title={group.title} note={group.note || (group.required ? 'Required' : group.max ? `Optional · up to ${group.max}` : 'Optional')}>
                  <div className="ca-wrap">
                    {group.options.map((option) => {
                      const on = chosen.includes(option.id)
                      return (
                        <button key={option.id} type="button" aria-pressed={on} disabled={!on && full} className={`ca-pill ${on ? 'is-dark' : ''}`} onClick={() => setPick(group.id, on ? chosen.filter((id) => id !== option.id) : [...chosen, option.id])}>
                          {option.label}{option.price ? ` · +${money(option.price)}` : ''}
                        </button>
                      )
                    })}
                  </div>
                </Section>
              )
            }
            return (
              <Section key={group.id} title={group.title} note={group.required ? 'Required' : 'Optional'}>
                <div className={group.options.length <= 3 ? 'ca-grid-3' : 'ca-grid-2'}>
                  {group.options.map((option) => (
                    <button key={option.id} type="button" aria-pressed={value === option.id} className={`ca-size ${value === option.id ? 'is-selected' : ''}`} onClick={() => setPick(group.id, option.id)}>
                      <strong className="ca-small-strong">{option.label}</strong>
                      <span>{group.id === 'box' || group.id === 'size' || group.id === 'length' ? money(option.price) : option.price ? `+${money(option.price)}` : 'Included'}</span>
                    </button>
                  ))}
                </div>
              </Section>
            )
          })}
          <div className="ca-summary ca-mt-16">
            <strong>Your {builder.noun}</strong>
            <span>{summary || 'Make your picks above'}</span>
          </div>
        </div>
        {renderNeedDate(Number(bakery.builder?.leadHours) || bakery.leadHours)}
        <StickyBar>
          <button type="button" className="ca-btn" disabled={Boolean(missing)} onClick={addToCart}>{missing || `Add to cart · ${money(price)}`}</button>
        </StickyBar>
      </div>
    )
  }

  function renderPlaced(orders) {
    return (
      <div className="ca-screen">
        <TopBar title="Orders placed" onBack={() => { setPlacedIds([]); go('home') }} />
        <div className="ca-pad ca-stack-12 ca-pt-16">
          <h1 className="ca-h1">{orders.length} orders placed!</h1>
          <p className="ca-muted ca-lh">Your cakes are on different dates, so each date is its own order. We'll text you as each one is confirmed.</p>
          {orders.map((order) => (
            <button key={order.id} type="button" className="ca-list-row" onClick={() => { setPlacedIds([]); setOpenOrderId(order.id); go('orders') }}>
              <span className="ca-list-icon"><Icon name="clock" /></span>
              <span className="ca-list-text"><strong>{order.ready_window}</strong><span className="ca-muted">{(order.items || []).map((item) => item.title).join(', ')} · {money(order.total)}</span></span>
              <Icon name="chevron" size={18} />
            </button>
          ))}
          <button type="button" className="ca-btn ca-btn-ghost" onClick={() => { setPlacedIds([]); go('home') }}>Back to home</button>
        </div>
      </div>
    )
  }

  function renderCheckout() {
    if (placedIds.length) {
      const placed = myOrders.filter((order) => placedIds.includes(order.id))
      if (placed.length === 1) return renderOrderDetail(placed[0], () => { setPlacedIds([]); go('home') }, true)
      if (placed.length > 1) return renderPlaced(placed)
    }
    if (!cart.length) {
      return (
        <div className="ca-screen has-nav">
          <TopBar title="Your cart" onBack={() => go('home')} />
          <div className="ca-empty">
            <span className="ca-empty-icon"><Icon name="cart" size={32} /></span>
            <strong>Your cart is empty</strong>
            <span className="ca-muted">Build a cake or pick a ready-made one.</span>
            <button type="button" className="ca-btn ca-mt-12" onClick={() => go('home')}>Find a cake</button>
          </div>
        </div>
      )
    }
    const shop = cartShop || bakery
    const pickupFrom = chosenLocation(shop)
    const delivery = ctx.fulfillmentType === 'delivery'
    const setC = (patch) => setCheckout((current) => ({ ...current, ...patch, error: '' }))
    const savedAddress = details.addresses.find((item) => item.id === checkout.addressId)
    const address = savedAddress || { line1: checkout.line1.trim(), city: checkout.city, instructions: checkout.instructions.trim() }
    const savedCard = details.cards.find((item) => item.id === checkout.cardId)
    const card = savedCard || { name: checkout.cardName.trim(), last4: checkout.cardLast4 }
    const phone = (checkout.phone || details.phone || '').trim()

    // One order per date.
    const groups = [...new Set(cart.map((item) => item.date || ''))].sort().map((date) => {
      const items = cart.filter((item) => (item.date || '') === date)
      const lead = Math.max(...items.map((item) => leadFor(item, shop)))
      const times = date ? timesOn(date, shop, lead) : []
      const time = times.includes(checkout.times[date]) ? checkout.times[date] : times[0]
      const subtotal = items.reduce((sum, item) => sum + (item.unitPrice ?? item.totalPrice ?? 0) * (item.quantity || 1), 0)
      const deliveryFee = delivery ? DELIVERY_FEE : 0
      const tax = Math.round((subtotal + deliveryFee + SERVICE_FEE) * 0.05 * 100) / 100
      const tip = delivery ? tipAmount(checkout.tip, subtotal) : 0
      const total = Math.round((subtotal + deliveryFee + SERVICE_FEE + tax + tip) * 100) / 100
      return { date, items, times, time, subtotal, deliveryFee, service: SERVICE_FEE, tax, tip, total }
    })
    const sum = (key) => Math.round(groups.reduce((acc, group) => acc + group[key], 0) * 100) / 100
    const many = groups.length > 1
    const timesMissing = groups.some((group) => !group.date || !group.time)
    const blocker = cartShop?.sample ? 'This is a preview bakery, so it can’t take orders. Pick a real bakery to order.' : !signedIn ? '' : timesMissing ? 'Pick an available date for every item' : delivery && !address.line1 ? 'Add a delivery address' : !phone ? 'Add a phone number' : phoneProblem(phone) ? 'Enter a 10-digit phone number' : !checkout.phoneOk ? 'Confirm your phone number: tap “Text me a code”' : card.last4.length !== 4 ? 'Add a card' : ''

    function setItemDate(itemId, date) {
      setCart(cart.map((item) => (item.id === itemId ? { ...item, date } : item)))
      setDateOpenFor(null)
    }

    async function placeOrder() {
      if (blocker) { setC({ error: blocker }); return }
      setCheckout((current) => ({ ...current, placing: true, error: '' }))
      const placed = []
      for (const group of groups) {
        const items = group.items.map((item) => ({
          title: item.title,
          summary: item.summary || item.config?.summary || '',
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice ?? item.totalPrice,
          totalPrice: (item.unitPrice ?? item.totalPrice) * (item.quantity || 1),
          config: item.config || null,
        }))
        const row = {
          customer_id: sbUser.id,
          customer_name: sbUser.user_metadata?.full_name || sbUser.email,
          customer_email: sbUser.email,
          customer_phone: phone,
          bakery_id: shop.id,
          bakery_name: shop.name,
          bakery_area: pickupFrom.city || shop.area,
          bakery_address: (shopLocations(shop).length > 1 && pickupFrom.name ? `${pickupFrom.address} (${pickupFrom.name})` : pickupFrom.address) || shop.address || null,
          items,
          subtotal: group.subtotal,
          delivery_fee: group.deliveryFee,
          service_fee: group.service,
          tax: group.tax,
          tip: group.tip,
          total: group.total,
          fulfillment: delivery ? 'delivery' : 'pickup',
          // Customers choose a date only; the bakery and driver arrange the exact time.
          ready_at: vanMoment(group.date, '12:00').toISOString(),
          ready_window: dateLabel(group.date, true),
          dropoff: delivery ? address : null,
          notes: checkout.notes.trim() || null,
          payment: { mode: 'test', last4: card.last4, name: card.name },
          driver_pay: delivery ? DRIVER_PAY : 0,
        }
        const { data, error } = await supabase.from('orders').insert(row).select().single()
        if (error) {
          // Keep what was placed; leave the rest in the cart.
          if (placed.length) {
            const done = new Set(placed.map((order) => order.dateKey))
            setCart(cart.filter((item) => !done.has(item.date || '')))
            setMyOrders((current) => [...placed, ...current])
          }
          setCheckout((current) => ({ ...current, placing: false, error: `${placed.length ? `${placed.length} order${placed.length === 1 ? '' : 's'} placed. ` : ''}${dateLabel(group.date)}: ${friendlyError(error)}` }))
          return
        }
        placed.push({ ...data, dateKey: group.date })
      }
      const next = { ...details, phone }
      if (delivery && !savedAddress) next.addresses = [{ id: `a${Date.now()}`, ...address }, ...details.addresses].slice(0, 5)
      if (!savedCard) next.cards = [{ id: `c${Date.now()}`, ...card }, ...details.cards].slice(0, 3)
      saveDetails(next)
      setMyOrders((current) => [...placed, ...current])
      setCart([])
      setPlacedIds(placed.map((order) => order.id))
      setCheckout((current) => ({ ...current, placing: false, notes: '', times: {} }))
      scrollTop()
    }

    let cta
    if (!signedIn) cta = <button type="button" className="ca-btn" onClick={ctx.openCustomerSignIn}>Sign in to checkout</button>
    else if (cartShop?.sample) cta = <button type="button" className="ca-btn" disabled>Preview bakery: ordering not available</button>
    else cta = <button type="button" className="ca-btn" disabled={checkout.placing} onClick={placeOrder}>{checkout.placing ? 'Placing order…' : `Place ${many ? `${groups.length} orders` : 'order'} · ${money(sum('total'))}`}</button>

    return (
      <div className="ca-screen">
        <TopBar title="Checkout" onBack={() => go('home')} />
        <div className="ca-pad ca-stack-18 ca-pt-16 ca-pb-24">
          <Segmented label="Delivery or pickup" value={ctx.fulfillmentType} onChange={ctx.setFulfillmentType} options={[{ id: 'delivery', label: 'Delivery' }, { id: 'pickup', label: 'Pickup' }]} />

          <section className="ca-stack-10">
            <h2 className="ca-h3">Your order from {shop.name}</h2>
            {cart.map((item) => {
              const lead = leadFor(item, shop)
              const open = dateOpenFor === item.id
              return (
                <div key={item.id} className="ca-stack-8">
                  <div className="ca-cart-item">
                    <Photo tint={shop.tint} icon={shop.icon} className="ca-thumb-sm" />
                    <span className="ca-cart-text"><strong>{item.title}</strong><span className="ca-muted ca-small">{item.summary || ctx.toDesignSummary(item.config)}</span></span>
                    <span className="ca-cart-side">
                      <strong>{money((item.unitPrice ?? item.totalPrice) * (item.quantity || 1))}</strong>
                      <span className="ca-qty">
                        <button type="button" aria-label={`One less ${item.title}`} onClick={() => ctx.updateCartItemQuantity(item.id, -1)}>−</button>
                        <span>{item.quantity || 1}</span>
                        <button type="button" aria-label={`One more ${item.title}`} onClick={() => ctx.updateCartItemQuantity(item.id, 1)}>+</button>
                      </span>
                    </span>
                  </div>
                  <div className="ca-row-between">
                    <button type="button" className={`cx-date-btn ${open ? 'is-open' : ''}`} aria-expanded={open} onClick={() => setDateOpenFor(open ? null : item.id)}>
                      <Icon name="calendar" size={16} />{item.date ? dateLabel(item.date) : 'Pick a date'}<span className="ca-accent-text">{open ? 'Done' : 'Change'}</span>
                    </button>
                    <span className="cx-note">{noticeLabel(lead)}</span>
                  </div>
                  {open ? (
                    <div className="ca-stack-4">
                      <MonthCalendar
                        compact
                        scrollOnOpen
                        value={item.date}
                        initial={item.date}
                        onPick={(day) => setItemDate(item.id, day)}
                        cell={(day) => {
                          const status = dayStatus(day, shop, lead, dayLoad)
                          return { disabled: status !== 'ok', note: STATUS_HINT[status] || '', tone: status === 'full' ? 'full' : status === 'closed' || status === 'blocked' ? 'off' : '' }
                        }}
                      />
                      <span className="cx-note">Greyed-out days: not enough notice for this item, the shop is closed, or it's fully booked.</span>
                    </div>
                  ) : null}
                </div>
              )
            })}
            <input className="ca-input" aria-label="Note for the bakery" placeholder="Note for the bakery: allergies, colours… (optional)" value={checkout.notes} onChange={(event) => setC({ notes: event.target.value })} />
            {shop.sample ? <div className="ca-preview-note">This is a preview bakery, so it can’t take orders. Pick a real bakery to order.</div> : <button type="button" className="ca-btn ca-btn-ghost" onClick={() => openChat(shop, 'checkout')}><Icon name="chat" size={18} />Ask {shop.name} a question</button>}
          </section>

          <section className="ca-stack-10">
            <h2 className="ca-h3">{delivery ? 'Delivery date' : `Pickup date at ${shop.name}`}</h2>
            {many ? <p className="ca-muted ca-small ca-lh">Your items are on {groups.length} different dates, so this becomes {groups.length} orders, one per date.</p> : null}
            {groups.map((group) => (
              <div key={group.date} className="ca-stack-8">
                {many ? <strong className="ca-small">{group.date ? dateLabel(group.date, true) : 'No date yet'} · {group.items.map((item) => item.title).join(', ')}</strong> : <strong className="ca-small">{group.date ? dateLabel(group.date, true) : 'Pick a date above'}</strong>}
                {group.date && !group.times.length ? <span className="ca-muted ca-small">That date needs more notice. Pick a later date.</span> : null}
              </div>
            ))}
          </section>

          {delivery ? (
            <section className="ca-stack-8">
              <h2 className="ca-h3">Deliver to</h2>
              {details.addresses.map((item) => (
                <button key={item.id} type="button" aria-pressed={checkout.addressId === item.id} className={`ca-slot ${checkout.addressId === item.id ? 'is-selected' : ''}`} onClick={() => setC({ addressId: checkout.addressId === item.id ? '' : item.id })}>
                  <Icon name="pin" size={18} /><span>{item.line1}, {item.city}</span>
                </button>
              ))}
              {!savedAddress ? (
                <>
                  {details.addresses.length ? <span className="ca-muted ca-small">Or a new address:</span> : null}
                  <input className="ca-input" aria-label="Street address" autoComplete="street-address" placeholder="Street address, unit" value={checkout.line1} onChange={(event) => setC({ line1: event.target.value })} />
                  <select className="ca-select" aria-label="City" value={checkout.city} onChange={(event) => setC({ city: event.target.value })}>
                    {['Vancouver', 'Burnaby', 'Richmond', 'Surrey', 'Coquitlam', 'North Vancouver', 'West Vancouver', 'New Westminster', 'Delta', 'Langley', 'Port Moody', 'Port Coquitlam', 'Maple Ridge', 'White Rock'].map((city) => <option key={city}>{city}</option>)}
                  </select>
                  <input className="ca-input" aria-label="Drop-off notes" placeholder="Buzzer, gate code, where to leave it (optional)" value={checkout.instructions} onChange={(event) => setC({ instructions: event.target.value })} />
                </>
              ) : null}
            </section>
          ) : null}

          {shopLocations(shop).length > 1 ? <section className="ca-stack-8">{renderLocationPicker(shop)}</section> : null}

          <section className="ca-stack-8">
            <h2 className="ca-h3">Phone</h2>
            <PhoneInput variant="ca" aria-label="Phone number" placeholder={delivery ? 'So the driver can reach you' : 'So the bakery can reach you'} value={checkout.phone || details.phone} onChange={(phone) => setC({ phone })} />
            <PhoneVerify variant="ca" phone={checkout.phone || details.phone} onOkChange={(ok) => setCheckout((current) => (current.phoneOk === ok ? current : { ...current, phoneOk: ok }))} />
          </section>

          {delivery ? (
            <section className="ca-stack-8">
              <h2 className="ca-h3">Tip your driver</h2>
              <TipPicker value={checkout.tip} onChange={(tip) => setC({ tip })} base={sum('subtotal')} laterOption />
              <span className="ca-muted ca-small">{checkout.tip.mode === 'later' ? 'We’ll ask you after your cake arrives. ' : ''}100% of your tip goes to the driver.</span>
            </section>
          ) : null}

          {signedIn ? (
            <section className="ca-stack-8">
              <h2 className="ca-h3">Payment</h2>
              {details.cards.map((item) => (
                <button key={item.id} type="button" aria-pressed={checkout.cardId === item.id} className={`ca-slot ${checkout.cardId === item.id ? 'is-selected' : ''}`} onClick={() => setC({ cardId: checkout.cardId === item.id ? '' : item.id })}>
                  <Icon name="card" size={18} /><span>Card •••• {item.last4}</span>
                </button>
              ))}
              {!savedCard ? (
                <div className="ca-grid-2">
                  <input className="ca-input" aria-label="Name on card" placeholder="Name on card" value={checkout.cardName} onChange={(event) => setC({ cardName: event.target.value })} />
                  <input className="ca-input" aria-label="Last 4 digits" inputMode="numeric" placeholder="Last 4 digits" value={checkout.cardLast4} onChange={(event) => setC({ cardLast4: event.target.value.replace(/\D/g, '').slice(0, 4) })} />
                </div>
              ) : null}
              <p className="ca-muted ca-small">Test mode: no card is charged yet.</p>
            </section>
          ) : null}

          <dl className="ca-totals">
            <dt>Subtotal</dt><dd>{money(sum('subtotal'))}</dd>
            {delivery ? <><dt>Delivery fee{many ? ` × ${groups.length}` : ''}</dt><dd>{money(sum('deliveryFee'))}</dd></> : null}
            <dt>Service fee{many ? ` × ${groups.length}` : ''}</dt><dd>{money(sum('service'))}</dd>
            <dt>GST</dt><dd>{money(sum('tax'))}</dd>
            {sum('tip') ? <><dt>Driver tip{many && checkout.tip.mode === 'custom' && checkout.tip.kind === '$' ? ` × ${groups.length}` : ''}</dt><dd>{money(sum('tip'))}</dd></> : null}
            <dt className="ca-total">Total</dt><dd className="ca-total">{money(sum('total'))}</dd>
          </dl>
          {checkout.error ? <p className="ca-toast is-error is-inline" role="alert">{checkout.error}</p> : null}
        </div>
        <StickyBar>{cta}</StickyBar>
      </div>
    )
  }

  function renderOrderDetail(order, onClose, justPlaced) {
    const status = order.status || 'new'
    const cancelled = status === 'cancelled'
    const steps = order.fulfillment === 'delivery' ? DELIVERY_STEPS : PICKUP_STEPS
    const currentIndex = Math.max(0, steps.findIndex((step) => step.id === status))
    let headline = cancelled ? 'This order was cancelled' : steps[currentIndex].label
    if (status === 'new') headline = justPlaced ? 'Order placed!' : 'Waiting for the bakery to confirm'
    const driverLine = order.fulfillment === 'delivery' && !cancelled && !['delivered'].includes(status)
      ? (order.driver_name ? `${order.driver_name.split(' ')[0]} is your driver` : ['confirmed', 'baking', 'ready'].includes(status) ? 'Finding a driver near the bakery' : '')
      : ''

    async function cancel() {
      const { error } = await supabase.rpc('customer_cancel_order', { p_order: order.id })
      if (error) setUiState((current) => ({ ...current, error: friendlyError(error) }))
      loadOrders()
    }

    return (
      <div className="ca-screen">
        <div className="ca-map" aria-hidden="true"><Icon name={order.fulfillment === 'delivery' ? 'pin' : 'store'} size={28} /></div>
        <button type="button" className="ca-float-btn ca-float-left ca-float-fixed" aria-label="Close" onClick={onClose}><Icon name="close" size={18} /></button>
        <div className="ca-sheet ca-pad ca-stack-16">
          <div className="ca-stack-4">
            <span className="ca-accent-text ca-small">{order.fulfillment === 'delivery' ? 'Delivery' : 'Pickup'} · {order.ready_window}</span>
            <h1 className="ca-h1">{headline}</h1>
            <span className="ca-muted">{order.bakery_name} · Order #{String(order.id).slice(0, 6).toUpperCase()}</span>
            {driverLine ? <span className="ca-small ca-strong-muted">{driverLine}</span> : null}
          </div>
          {!cancelled ? (
            <ol className="ca-timeline">
              {steps.map((step, index) => (
                <li key={step.id} className={index < currentIndex ? 'is-done' : index === currentIndex ? 'is-current' : ''}>
                  <span className="ca-dot">{index < currentIndex ? <Icon name="check" size={13} /> : null}</span>
                  <span>{step.label}</span>
                </li>
              ))}
            </ol>
          ) : null}
          <div className="ca-summary">
            {(order.items || []).map((item, index) => <span key={index}><strong>{item.quantity || 1}× {item.title}</strong>{item.summary ? ` · ${item.summary}` : ''}</span>)}
            <strong>Total {money(order.total)}</strong>
            {order.fulfillment === 'delivery' && order.dropoff ? <span className="ca-muted">To {order.dropoff.line1}, {order.dropoff.city}</span> : null}
            {order.fulfillment === 'pickup' ? <span className="ca-muted">Pick up at {[order.bakery_address, order.bakery_area].filter(Boolean).join(', ')}</span> : null}
          </div>
          {needsTip(order) ? <div className="ca-tip-card"><TipAfterDelivery order={order} onDone={() => { dismissTip(order.id); loadOrders() }} onSkip={() => dismissTip(order.id)} /></div> : null}
          {order.tip_added_at && Number(order.tip) ? <p className="ca-muted ca-small">You tipped {money(order.tip)}. Thank you!</p> : null}
          <button type="button" className="ca-btn ca-btn-ghost" onClick={() => openChat({ id: order.bakery_id, name: order.bakery_name }, view)}><Icon name="chat" size={18} />Message {order.bakery_name}</button>
          {status === 'new' ? <button type="button" className="ca-btn ca-btn-ghost" onClick={cancel}>Cancel order</button> : null}
          <button type="button" className="ca-btn ca-btn-ghost" onClick={() => { setAccountPage('help'); go('account'); setAccountPage('help') }}><Icon name="help" size={18} />Get help with this order</button>
          <p className="ca-muted ca-small">This page updates on its own.</p>
        </div>
      </div>
    )
  }

  function renderOrderCard(order) {
    const steps = order.fulfillment === 'delivery' ? DELIVERY_TRACK : PICKUP_TRACK
    const at = steps.findIndex((step) => step.statuses.includes(order.status))
    const first = (order.items || [])[0]
    const more = (order.items || []).length - 1
    const done = DONE_STATUSES.includes(order.status)
    return (
      <button key={order.id} type="button" className={`ca-order-card ${order.status === 'cancelled' ? 'is-cancelled' : ''}`} onClick={() => setOpenOrderId(order.id)}>
        <span className="ca-order-top">
          <CakeArt seed={order.bakery_id} className="ca-order-thumb" />
          <span className="ca-order-text">
            <strong>{order.bakery_name}</strong>
            <span className="ca-muted ca-small">{first ? `${first.title}${more > 0 ? ` + ${more} more` : ''}` : 'Order'}</span>
            <span className="ca-small">{order.fulfillment === 'delivery' ? 'Delivery' : 'Pickup'} · {order.ready_window} · {money(order.total)}</span>
          </span>
          <span className={`ca-status-chip is-${order.status}`}>{STATUS_TEXT[order.status] || order.status}</span>
        </span>
        {!done && at >= 0 ? (
          <span className="ca-track" aria-label={`Step ${at + 1} of ${steps.length}: ${steps.at(at).label}`}>
            {steps.map((step, index) => <span key={step.label} className={`ca-track-step ${index <= at ? 'is-on' : ''}`}><span className="ca-track-bar" /><span className="ca-track-label">{step.label}</span></span>)}
          </span>
        ) : null}
      </button>
    )
  }

  function renderOrders() {
    if (openOrderId) {
      const order = myOrders.find((item) => item.id === openOrderId)
      if (order) return renderOrderDetail(order, () => setOpenOrderId(''))
    }
    return (
      <div className="ca-screen has-nav">
        <div className="ca-pad ca-pt-16"><h1 className="ca-h1">Orders</h1></div>
        {signedIn ? (
          <div className="ca-pad ca-section">
            <button type="button" className={`ca-list-row ${unreadMessages ? 'is-highlight' : ''}`} onClick={() => { setChat(null); setChatReturn('orders'); go('messages') }}>
              <span className="ca-list-icon"><Icon name="chat" /></span>
              <span className="ca-list-text"><strong>Messages{unreadMessages ? ` · ${unreadMessages} new` : ''}</strong><span className="ca-muted">Chat with your bakeries</span></span>
              <Icon name="chevron" size={18} />
            </button>
          </div>
        ) : null}
        {cart.length ? (
          <div className="ca-pad ca-section">
            <button type="button" className="ca-list-row is-highlight" onClick={() => go('checkout')}>
              <span className="ca-list-icon"><Icon name="cart" /></span>
              <span className="ca-list-text"><strong>Your cart · {cartCount} {cartCount === 1 ? 'item' : 'items'}</strong><span className="ca-muted">{money(cartTotals.subtotal)} · Continue to checkout</span></span>
              <Icon name="chevron" size={18} />
            </button>
          </div>
        ) : null}
        <div className="ca-pad ca-section ca-stack-10">
          {!signedIn ? (
            <div className="ca-empty">
              <strong>Sign in to see your orders</strong>
              <button type="button" className="ca-btn ca-mt-12" onClick={ctx.openCustomerSignIn}>Sign in</button>
            </div>
          ) : myOrders.length ? (
            <>
              {[['Upcoming', myOrders.filter((order) => !DONE_STATUSES.includes(order.status))], ['Past', myOrders.filter((order) => DONE_STATUSES.includes(order.status))]].map(([label, list]) => (list.length ? (
                <div key={label} className="ca-stack-10">
                  <h2 className="ca-h2">{label}</h2>
                  {list.map(renderOrderCard)}
                </div>
              ) : null))}
            </>
          ) : (
            <div className="ca-empty-block">
              <strong>No orders yet</strong>
              <span className="ca-muted">Pick a bakery and design your first cake. It will show up here.</span>
              <button type="button" className="ca-btn ca-mt-12" onClick={() => go('home')}>Find a bakery</button>
            </div>
          )}
        </div>
      </div>
    )
  }

  function renderAccount() {
    const name = sbUser?.user_metadata?.full_name || sbUser?.email || 'Guest'
    const back = () => setAccountPage('main')

    if (accountPage === 'addresses') {
      return (
        <div className="ca-screen">
          <TopBar title="Addresses" onBack={back} />
          <div className="ca-pad ca-stack-12 ca-pt-16">
            {!details.addresses.length ? <p className="ca-muted">No saved addresses yet. Addresses you deliver to are saved here.</p> : null}
            {details.addresses.map((address) => (
              <div key={address.id} className="ca-list-row is-static">
                <span className="ca-list-icon"><Icon name="pin" /></span>
                <span className="ca-list-text"><strong>{address.line1}</strong><span className="ca-muted">{address.city}{address.instructions ? ` · ${address.instructions}` : ''}</span></span>
                <button type="button" className="ca-link" onClick={() => saveDetails({ ...details, addresses: details.addresses.filter((item) => item.id !== address.id) })}>Remove</button>
              </div>
            ))}
            <p className="ca-muted ca-small">Saved on this device.</p>
          </div>
        </div>
      )
    }
    if (accountPage === 'payment') {
      return (
        <div className="ca-screen">
          <TopBar title="Payment methods" onBack={back} />
          <div className="ca-pad ca-stack-12 ca-pt-16">
            {!details.cards.length ? <p className="ca-muted">No saved cards yet. Add one at checkout.</p> : null}
            {details.cards.map((card) => (
              <div key={card.id} className="ca-list-row is-static">
                <span className="ca-list-icon"><Icon name="card" /></span>
                <span className="ca-list-text"><strong>Card •••• {card.last4}</strong><span className="ca-muted">{card.name}</span></span>
                <button type="button" className="ca-link" onClick={() => saveDetails({ ...details, cards: details.cards.filter((item) => item.id !== card.id) })}>Remove</button>
              </div>
            ))}
            <p className="ca-muted ca-small">Test mode: no card is charged, and only the last 4 digits are kept, on this device.</p>
          </div>
        </div>
      )
    }
    if (accountPage === 'saved') {
      return (
        <div className="ca-screen">
          <TopBar title="Saved cakes" onBack={back} />
          <div className="ca-pad ca-stack-10 ca-pt-16">
            {ctx.savedDesigns.length ? ctx.savedDesigns.map((design) => (
              <div key={design.id} className="ca-list-row is-static"><span className="ca-list-icon"><Icon name="cake" /></span><span className="ca-list-text"><strong>{design.title}</strong><span className="ca-muted">{design.summary || ''}{design.estimatedTotal ? ` · ${money(design.estimatedTotal)}` : ''}</span></span></div>
            )) : <p className="ca-muted">No saved cakes yet.</p>}
          </div>
        </div>
      )
    }
    if (accountPage === 'help') {
      return (
        <div className="ca-screen">
          <TopBar title="Help" onBack={back} />
          <div className="ca-pad ca-stack-12 ca-pt-16">
            <div className="ca-summary"><strong>Problem with an order?</strong><span>Open the order from the Orders tab. The bakery sees your message straight away.</span></div>
            <div className="ca-summary"><strong>Changing or cancelling</strong><span>You can cancel until the bakery starts baking. After that, contact the bakery.</span></div>
            <div className="ca-summary"><strong>Refunds</strong><span>If something went wrong with your cake, open the order and tell us what happened.</span></div>
          </div>
        </div>
      )
    }

    const rows = [
      { id: 'addresses', icon: 'pin', label: 'Addresses', sub: `${details.addresses.length || 'No'} saved` },
      { id: 'payment', icon: 'card', label: 'Payment methods', sub: `${details.cards.length || 'No'} saved` },
      { id: 'occasions', icon: 'calendar', label: 'Occasions and reminders', sub: 'Birthdays and big days, with reminders' },
      { id: 'settings', icon: 'gear', label: 'Settings', sub: 'Notifications, preferences, privacy' },
      { id: 'help', icon: 'help', label: 'Help', sub: 'Order issues, cancelling, refunds' },
    ]
    return (
      <div className="ca-screen has-nav">
        <div className="ca-pad ca-pt-24 ca-profile">
          <span className="ca-avatar">{name.slice(0, 1).toUpperCase()}</span>
          <span className="ca-stack-2">
            <strong className="ca-profile-name">{name}</strong>
            <span className="ca-muted ca-small">{signedIn ? `${sbUser.email} · Signed in with Google` : 'Sign in to save details and order'}</span>
          </span>
        </div>
        {signedIn ? (
          <div className="ca-pad ca-section ca-grid-3">
            <button type="button" className="ca-quick" onClick={() => go('orders')}><Icon name="orders" />Orders</button>
            <button type="button" className="ca-quick" onClick={() => setAccountPage('saved')}><Icon name="cake" />Saved cakes</button>
            <button type="button" className="ca-quick" onClick={() => { setChat(null); setChatReturn('account'); go('messages') }}><Icon name="chat" />Messages{unreadMessages ? ` (${unreadMessages})` : ''}</button>
          </div>
        ) : (
          <div className="ca-pad ca-section"><button type="button" className="ca-btn" onClick={ctx.openCustomerSignIn}>Sign in with Google</button></div>
        )}
        <ul className="ca-pad ca-menu-list">
          {rows.filter((row) => signedIn || ['settings', 'help'].includes(row.id)).map((row) => (
            <li key={row.id}>
              <button type="button" className="ca-list-row is-plain" onClick={() => (row.id === 'settings' || row.id === 'occasions' ? go(row.id) : setAccountPage(row.id))}>
                <span className="ca-list-icon is-plain"><Icon name={row.icon} /></span>
                <span className="ca-list-text"><strong>{row.label}</strong><span className="ca-muted ca-small">{row.sub}</span></span>
                <Icon name="chevron" size={18} />
              </button>
            </li>
          ))}
        </ul>
        <div className="ca-pad ca-section">
          <h2 className="ca-overline">Work with us</h2>
          <a className="ca-list-row is-plain ca-a" href="/driver">
            <span className="ca-list-icon is-plain"><Icon name="pin" /></span>
            <span className="ca-list-text"><strong>Deliver with us</strong><span className="ca-muted ca-small">Earn delivering cakes in your area</span></span>
            <Icon name="chevron" size={18} />
          </a>
          <a className="ca-list-row is-plain ca-a" href="/bakery">
            <span className="ca-list-icon is-plain"><Icon name="store" /></span>
            <span className="ca-list-text"><strong>Sell your cakes with us</strong><span className="ca-muted ca-small">For bakeries and home bakers with a food permit</span></span>
            <Icon name="chevron" size={18} />
          </a>
        </div>
        {signedIn ? <div className="ca-pad ca-section"><button type="button" className="ca-btn ca-btn-ghost" disabled={uiState.authUpdating} onClick={ctx.handleCustomerLogout}>{uiState.authUpdating ? 'Signing out…' : 'Sign out'}</button></div> : null}
      </div>
    )
  }

  function renderMessages() {
    const back = () => { if (chat) { setChat(null); loadConversations() } else go(chatReturn || 'home') }
    if (!signedIn) {
      return (
        <div className="ca-screen">
          <TopBar title="Messages" onBack={() => go('home')} />
          <div className="ca-empty"><strong>Sign in to message bakeries</strong><button type="button" className="ca-btn ca-mt-12" onClick={ctx.openCustomerSignIn}>Sign in</button></div>
        </div>
      )
    }
    if (chat) {
      return (
        <div className="ca-chat-screen">
          <ChatThread conversationId={chat.id} side="customer" title={chat.bakery_name} subtitle="Usually replies within a few hours" onBack={back} placeholder={`Message ${chat.bakery_name}`} />
        </div>
      )
    }
    return (
      <div className="ca-screen">
        <TopBar title="Messages" onBack={back} />
        <div className="ca-pad ca-pt-16">
          <ConversationList conversations={conversations} side="customer" onOpen={(item) => setChat(item)} empty="No messages yet. Open a bakery and tap “Message” to ask a question." />
        </div>
      </div>
    )
  }

  function renderSettings() {
    const toggles = [
      ['push', 'Order updates', 'Notifications when your cake status changes'],
      ['sms', 'Text messages', 'A text when your cake is ready'],
      ['email', 'Offers and new bakeries', 'Occasional emails about deals and new bakeries'],
      ['reminders', 'Occasion reminders', 'A nudge before birthdays you saved'],
    ]
    return (
      <div className="ca-screen">
        <TopBar title="Settings" onBack={() => go('account')} />
        <div className="ca-pad ca-pb-24">
          <h2 className="ca-overline">Notifications</h2>
          {toggles.map(([key, label, sub]) => (
            <div key={key} className="ca-setting-row">
              <span className="ca-list-text"><strong>{label}</strong><span className="ca-muted ca-small">{sub}</span></span>
              <button type="button" role="switch" aria-checked={Boolean(settings[key])} aria-label={label} className={`ca-switch ${settings[key] ? 'is-on' : ''}`} onClick={() => updateSetting(key, !settings[key])}><span /></button>
            </div>
          ))}
          <p className="ca-muted ca-small">Saved on this device.</p>
          <h2 className="ca-overline">Ordering</h2>
          <span className="ca-label">Default way to get your cake</span>
          <Segmented label="Default way to get your cake" value={ctx.fulfillmentType} onChange={ctx.setFulfillmentType} options={[{ id: 'delivery', label: 'Delivery' }, { id: 'pickup', label: 'Pickup' }]} />
          <h2 className="ca-overline">Privacy and legal</h2>
          <div className="ca-setting-row is-link"><strong>Privacy policy</strong><span className="ca-muted ca-small">Coming soon</span></div>
          <div className="ca-setting-row is-link"><strong>Terms of service</strong><span className="ca-muted ca-small">Coming soon</span></div>
          <h2 className="ca-overline">Bakery owners</h2>
          <button type="button" className="ca-setting-row is-link ca-reset" onClick={() => go('owner')}><strong>Open the bakery dashboard</strong><Icon name="chevron" size={18} /></button>
        </div>
      </div>
    )
  }

  function renderAuth() {
    const checking = ctx.customerAuthStatus === 'checking'
    return (
      <div className="ca-screen ca-auth">
        <div className="ca-auth-art" aria-hidden="true"><Icon name="cake" size={56} /></div>
        <div className="ca-pad ca-stack-12">
          <h1 className="ca-h1">Sign in or create an account</h1>
          <p className="ca-muted ca-lh">You need an account to place orders, save addresses and see your order history. Your cart is kept while you sign in.</p>
          {uiState.error ? <p className="ca-toast is-error is-inline">{uiState.error}</p> : null}
        </div>
        <div className="ca-pad ca-stack-10 ca-auth-actions">
          <button type="button" className="ca-btn" disabled={Boolean(uiState.authUpdating) || checking} onClick={() => ctx.continueWithSignIn('login')}>
            {uiState.authUpdating === 'login' ? 'Opening Google…' : checking ? 'Signing you in…' : 'Log in'}
          </button>
          <button type="button" className="ca-btn ca-btn-ghost" disabled={Boolean(uiState.authUpdating) || checking} onClick={() => ctx.continueWithSignIn('signup')}>
            {uiState.authUpdating === 'signup' ? 'Opening Google…' : 'Create an account'}
          </button>
          <button type="button" className="ca-link ca-center" onClick={() => setView(ctx.authReturnView || 'home')}>Not now</button>
        </div>
      </div>
    )
  }

  let screen
  if (view === 'auth') screen = renderAuth()
  else if (view === 'search') screen = renderSearch()
  else if (view === 'bakery') screen = renderBakery()
  else if (view === 'item') screen = renderItem()
  else if (view === 'build') screen = renderBuild()
  else if (view === 'checkout') screen = renderCheckout()
  else if (view === 'orders') screen = renderOrders()
  else if (view === 'account') screen = renderAccount()
  else if (view === 'settings') screen = renderSettings()
  else if (view === 'messages') screen = renderMessages()
  else if (view === 'occasions') screen = <OccasionsScreen user={sbUser} phone={details.phone} data={occasionData} onBack={() => go('account')} onShop={() => go('home')} onSignIn={ctx.openCustomerSignIn} TopBar={TopBar} Icon={Icon} />
  else screen = renderHome()

  const showNav = ['home', 'search', 'orders', 'account'].includes(view) && !(view === 'orders' && openOrderId) && !(view === 'account' && accountPage !== 'main')

  return (
    <div className="ca-root">
      <div className="ca-phone">
        {renderToast()}
        {signedIn && ['home', 'orders', 'account'].includes(view) ? <NotificationPrompt variant="ca" storageKey="notify-prompt-customer" text="Get notified when your order is confirmed, ready or on its way." /> : null}
        {screen}
        {showNav ? <BottomNav view={view} go={go} cartCount={cartCount} unread={unreadMessages} /> : null}
        {tipPromptOrder && !pendingItem && !(view === 'orders' && openOrderId === tipPromptOrder.id) ? (
          <div className="ca-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="ca-tip-title">
            <div className="ca-modal">
              <h2 id="ca-tip-title" className="ca-h2">Your cake was delivered!</h2>
              <p className="ca-muted ca-lh">{tipPromptOrder.bakery_name} · Order #{String(tipPromptOrder.id).slice(0, 6).toUpperCase()}. Want to thank {tipPromptOrder.driver_name ? tipPromptOrder.driver_name.split(' ')[0] : 'your driver'} with a tip?</p>
              <TipAfterDelivery compact order={tipPromptOrder} onDone={() => { dismissTip(tipPromptOrder.id); loadOrders() }} onSkip={() => dismissTip(tipPromptOrder.id)} />
              <button type="button" className="ca-link ca-center" onClick={() => dismissTip(tipPromptOrder.id)}>Not now</button>
            </div>
          </div>
        ) : null}
        {pendingItem ? (
          <div className="ca-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="ca-newcart-title">
            <div className="ca-modal">
              <h2 id="ca-newcart-title" className="ca-h2">Start a new cart?</h2>
              <p className="ca-muted ca-lh">Your cart has cakes from another bakery. Each order comes from one bakery.</p>
              <button type="button" className="ca-btn" onClick={confirmNewCart}>Start new cart</button>
              <button type="button" className="ca-btn ca-btn-ghost" onClick={() => setPendingItem(null)}>Keep my cart</button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
