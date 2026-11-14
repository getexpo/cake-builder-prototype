import { useMemo, useState } from 'react'
import './customer.css'

// Customer-facing app (redesign). All data and actions come from App via `ctx`,
// so login, cart, checkout and orders keep using the same backend wiring.

const SETTINGS_KEY = 'cake-settings'

const SHAPES = [
  { id: 'round', label: 'Round', price: 45 },
  { id: 'heart', label: 'Heart', price: 55 },
  { id: 'tall', label: 'Tall', price: 70 },
  { id: 'premium', label: 'Premium tiered', price: 90 },
]
// Placeholder prices until each bakery sets its own.
const SIZES = [
  { id: '6', label: '6"', price: 0 },
  { id: '8', label: '8"', price: 15 },
  { id: '10', label: '10"', price: 30 },
]
const FLAVORS = [
  { id: 'vanilla', label: 'Vanilla', sponge: 'Vanilla sponge', price: 0, swatch: '#F6E7C1' },
  { id: 'chocolate', label: 'Chocolate', sponge: 'Chocolate sponge', price: 4, swatch: '#5B3A29' },
  { id: 'red-velvet', label: 'Red velvet', sponge: 'Red velvet', price: 6, swatch: '#9F1D2C' },
  { id: 'marble', label: 'Marble', sponge: 'Marble', price: 5, swatch: 'marble' },
]
const CHOCOLATES = ['Milk', 'Dark', 'White']
const FILLINGS = ['Vanilla cream', 'Chocolate ganache', 'Strawberry jam', 'Cream cheese']
const FROSTINGS = [
  { id: 'buttercream', label: 'Buttercream', price: 0 },
  { id: 'cream-cheese', label: 'Cream cheese', price: 5 },
  { id: 'ganache', label: 'Ganache drip', price: 7 },
]
const TOPPINGS = [
  { id: 'sprinkles', label: 'Sprinkles', price: 3 },
  { id: 'shavings', label: 'Chocolate shavings', price: 4 },
  { id: 'berries', label: 'Fresh berries', price: 6 },
  { id: 'drizzle', label: 'Extra drizzle', price: 3 },
]
const PRICE_PER_LAYER = 8
const DEFAULT_LAYERS = 3

const ORDER_STEPS = [
  { id: 'placed', label: 'Order placed', statuses: ['new'] },
  { id: 'confirmed', label: 'Confirmed by the bakery', statuses: ['confirmed'] },
  { id: 'baking', label: 'Baking and decorating', statuses: ['baking', 'decorating'] },
  { id: 'ready', label: 'Ready', statuses: ['ready'] },
  { id: 'done', label: 'Picked up', statuses: ['picked_up', 'delivered', 'completed'] },
]

const LEGACY_VIEWS = { builder: 'build', saved: 'orders', accounts: 'account' }

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

function layerLimitFor(bakery) {
  if (!bakery?.capability) return 0
  if (bakery.capability.fullCustom) return 10
  if (bakery.capability.presetsCustomizable) return 4
  return 0
}

function shapesFor(bakery) {
  return bakery?.capability?.fullCustom ? SHAPES : SHAPES.filter((shape) => ['round', 'heart'].includes(shape.id))
}

function newBuild() {
  return {
    step: 1,
    shape: 'round',
    size: '6',
    flavor: 'chocolate',
    chocolate: 'Dark',
    layerCount: DEFAULT_LAYERS,
    fillings: Array(DEFAULT_LAYERS).fill(FILLINGS[0]),
    sameFilling: true,
    frosting: 'buttercream',
    toppings: [],
    message: '',
  }
}

function buildPrice(build) {
  const shape = SHAPES.find((item) => item.id === build.shape)
  const size = SIZES.find((item) => item.id === build.size)
  const flavor = FLAVORS.find((item) => item.id === build.flavor)
  const frosting = FROSTINGS.find((item) => item.id === build.frosting)
  const toppings = TOPPINGS.filter((item) => build.toppings.includes(item.id)).reduce((sum, item) => sum + item.price, 0)
  return (shape?.price || 0) + (size?.price || 0) + (flavor?.price || 0) + build.layerCount * PRICE_PER_LAYER + (frosting?.price || 0) + toppings
}

function flavorName(build) {
  const flavor = FLAVORS.find((item) => item.id === build.flavor)
  if (build.flavor === 'chocolate') return `${build.chocolate.toLowerCase()} chocolate`
  return flavor?.label.toLowerCase() || ''
}

function buildSummary(build) {
  const shape = SHAPES.find((item) => item.id === build.shape)?.label || ''
  const size = SIZES.find((item) => item.id === build.size)?.label || ''
  const frosting = FROSTINGS.find((item) => item.id === build.frosting)?.label.toLowerCase()
  const toppings = TOPPINGS.filter((item) => build.toppings.includes(item.id)).map((item) => item.label.toLowerCase())
  return [`${shape} ${size}`, `${build.layerCount} layers of ${flavorName(build)}`, frosting, ...toppings].filter(Boolean).join(' · ')
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
    heart: <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" />,
    check: <path d="m5 12 5 5 9-10" />,
    plus: <path d="M12 5v14M5 12h14" />,
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
  }
  return (
    <svg className="ca-shape" width="84" height="84" viewBox="0 0 84 84" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" aria-hidden="true">
      {shapes[id]}
    </svg>
  )
}

function Photo({ tint = '#F3E8E2', className = '' }) {
  return (
    <div className={`ca-photo ${className}`} style={{ background: tint }} aria-hidden="true">
      <Icon name="cake" size={30} />
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

function BottomNav({ view, go, cartCount }) {
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
            {tab.id === 'orders' && cartCount ? <span className="ca-badge">{cartCount}</span> : null}
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
    view: rawView, setView, bakeries, presets, cart, setCart, uiState, setUiState,
    customerShopId, setCustomerShopId, pickupSlots,
  } = ctx
  const view = LEGACY_VIEWS[rawView] || rawView

  const [itemId, setItemId] = useState('')
  const [itemNote, setItemNote] = useState('')
  const [build, setBuild] = useState(newBuild)
  const [query, setQuery] = useState('')
  const [pendingItem, setPendingItem] = useState(null)
  const [accountPage, setAccountPage] = useState('main')
  const [settings, setSettings] = useState(readSettings)
  const [openOrderId, setOpenOrderId] = useState('')

  const bakery = bakeries.find((item) => item.id === customerShopId) || bakeries[0]
  const cartCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0)

  const nextSlotFor = useMemo(() => {
    const now = Date.now()
    const map = {}
    pickupSlots.forEach((slot) => {
      const start = new Date(slot.startTime || 0).getTime()
      if (slot.active === false || start < now || slot.booked >= slot.capacity) return
      if (!map[slot.shopId] || start < new Date(map[slot.shopId].startTime).getTime()) map[slot.shopId] = slot
    })
    return map
  }, [pickupSlots])

  function go(next) {
    setUiState((current) => ({ ...current, error: '', message: '' }))
    if (next === 'account') setAccountPage('main')
    setView(next)
    if (typeof window !== 'undefined') window.scrollTo(0, 0)
  }

  function openBakery(id) {
    setCustomerShopId(id)
    go('bakery')
  }

  function startBuild(id) {
    const fallback = bakeries.find((item) => layerLimitFor(item) > 0)
    if (id) setCustomerShopId(id)
    else if (layerLimitFor(bakery) === 0 && fallback) setCustomerShopId(fallback.id)
    setBuild(newBuild())
    go('build')
  }

  function addItemToCart(item) {
    const otherShop = cart.find((entry) => entry.shopId && entry.shopId !== item.shopId)
    if (otherShop) {
      setPendingItem(item)
      return
    }
    setCart((current) => [...current, item])
    setUiState((current) => ({ ...current, error: '', message: `${item.title} added to your cart.` }))
    go('checkout')
  }

  function confirmNewCart() {
    setCart([pendingItem])
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

  function renderBakeryCard(item, index) {
    const tints = ['#F3E8E2', '#EDE5F0', '#E5EEE8']
    const slot = nextSlotFor[item.id]
    const canBuild = layerLimitFor(item) > 0
    return (
      <button key={item.id} type="button" className="ca-store-card" onClick={() => openBakery(item.id)}>
        <Photo tint={tints[index % tints.length]} className="ca-store-photo" />
        <span className="ca-store-row">
          <span className="ca-store-text">
            <span className="ca-store-name">{item.name}</span>
            <span className="ca-muted">{item.hero || item.menuSummary}</span>
            <span className="ca-chips">
              {canBuild ? <span className="ca-chip is-accent">Build your own</span> : <span className="ca-chip">Ready-made</span>}
              {slot ? <span className="ca-chip">Next: {ctx.formatPickupWindow(slot)}</span> : null}
            </span>
          </span>
        </span>
      </button>
    )
  }

  function renderHome() {
    const buildable = bakeries.filter((item) => layerLimitFor(item) > 0)
    return (
      <div className="ca-screen has-nav">
        <div className="ca-pad ca-stack-14">
          <div className="ca-home-head">
            <div>
              <span className="ca-muted ca-small">Order ahead from</span>
              <span className="ca-home-place">Local bakeries near you</span>
            </div>
            <button type="button" className="ca-round-btn" aria-label={`Cart, ${cartCount} items`} onClick={() => go('checkout')}>
              <Icon name="cart" size={20} />
              {cartCount ? <span className="ca-badge">{cartCount}</span> : null}
            </button>
          </div>
          <Segmented label="Delivery or pickup" value={ctx.fulfillmentType} onChange={ctx.setFulfillmentType} options={[{ id: 'delivery', label: 'Delivery' }, { id: 'pickup', label: 'Pickup' }]} />
          <button type="button" className="ca-search-fake" onClick={() => go('search')}>
            <Icon name="search" size={18} /><span>Search cakes and bakeries</span>
          </button>
          {buildable.length ? (
            <button type="button" className="ca-build-hero" onClick={() => startBuild(buildable.length === 1 ? buildable[0].id : '')}>
              <span className="ca-build-hero-icon"><Icon name="cake" size={30} /></span>
              <span className="ca-build-hero-text">
                <strong>Build your own cake</strong>
                <span>Pick the sponge, layers and toppings. A local bakery makes it fresh.</span>
              </span>
              <Icon name="chevron" size={20} />
            </button>
          ) : null}
        </div>
        <div className="ca-pad ca-section">
          <h2 className="ca-h2">Bakeries near you</h2>
          <div className="ca-stack-18">{bakeries.map(renderBakeryCard)}</div>
        </div>
      </div>
    )
  }

  function renderSearch() {
    const term = query.trim().toLowerCase()
    const bakeryHits = term ? bakeries.filter((item) => `${item.name} ${item.hero} ${item.city}`.toLowerCase().includes(term)) : []
    const itemHits = term
      ? bakeries.flatMap((item) => (presets[item.id] || []).filter((preset) => `${preset.title} ${preset.detail}`.toLowerCase().includes(term)).map((preset) => ({ ...preset, shop: item })))
      : []
    return (
      <div className="ca-screen has-nav">
        <div className="ca-pad ca-stack-14">
          <h1 className="ca-h1">Search</h1>
          <label className="ca-search">
            <Icon name="search" size={18} />
            <span className="ca-sr">Search</span>
            <input type="search" value={query} autoFocus placeholder="Chocolate, birthday, Richmond…" onChange={(event) => setQuery(event.target.value)} />
          </label>
        </div>
        <div className="ca-pad ca-section ca-stack-10">
          {!term ? <p className="ca-muted">Search by cake, flavour or bakery.</p> : null}
          {term && !bakeryHits.length && !itemHits.length ? <p className="ca-muted">Nothing matches “{query}” yet.</p> : null}
          {bakeryHits.map((item) => (
            <button key={item.id} type="button" className="ca-list-row" onClick={() => openBakery(item.id)}>
              <span className="ca-list-icon"><Icon name="store" /></span>
              <span className="ca-list-text"><strong>{item.name}</strong><span className="ca-muted">{item.hero}</span></span>
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
    const items = presets[bakery.id] || []
    const limit = layerLimitFor(bakery)
    const slot = nextSlotFor[bakery.id]
    return (
      <div className="ca-screen">
        <div className="ca-banner">
          <Photo tint="#F3E8E2" className="ca-banner-photo" />
          <button type="button" className="ca-float-btn ca-float-left" aria-label="Back" onClick={() => go('home')}><Icon name="back" size={20} /></button>
        </div>
        <div className="ca-pad ca-stack-12 ca-pt-16">
          <div className="ca-stack-4">
            <h1 className="ca-h1">{bakery.name}</h1>
            <span className="ca-muted">{bakery.hero}</span>
          </div>
          <div className="ca-facts">
            <div><strong>{bakery.city || 'Local'}</strong><span>Location</span></div>
            <div><strong>{slot ? ctx.formatPickupWindow(slot) : 'Order ahead'}</strong><span>Next pickup</span></div>
            <div><strong>{limit ? `Up to ${limit}` : 'Ready-made'}</strong><span>{limit ? 'Layers' : 'Menu'}</span></div>
          </div>
        </div>
        <div className="ca-pad ca-section">
          {limit ? (
            <button type="button" className="ca-menu-row" onClick={() => startBuild(bakery.id)}>
              <span className="ca-menu-text">
                <span className="ca-menu-title">Design your own cake <span className="ca-chip is-accent">Custom</span></span>
                <span className="ca-muted">Pick shape, sponge, layers, fillings and toppings</span>
                <span className="ca-menu-price">From {money(SHAPES[0].price + PRICE_PER_LAYER * DEFAULT_LAYERS)}</span>
              </span>
              <span className="ca-menu-thumb is-accent"><Icon name="cake" size={34} /></span>
            </button>
          ) : null}
          <h2 className="ca-h2 ca-mt-12">Ready-made cakes</h2>
          {items.length ? items.map((item) => (
            <button key={item.id} type="button" className="ca-menu-row" onClick={() => { setItemId(item.id); setItemNote(''); go('item') }}>
              <span className="ca-menu-text">
                <span className="ca-menu-title">{item.title}</span>
                <span className="ca-muted">{item.detail}</span>
                <span className="ca-menu-price">{money(item.price)}</span>
              </span>
              <span className="ca-menu-thumb"><Icon name="cake" size={30} /><span className="ca-plus" aria-hidden="true"><Icon name="plus" size={16} /></span></span>
            </button>
          )) : <p className="ca-muted">This bakery hasn’t added ready-made cakes yet.</p>}
        </div>
        {cartCount ? (
          <StickyBar>
            <button type="button" className="ca-btn ca-btn-cart" onClick={() => go('checkout')}>
              <span className="ca-cart-count">{cartCount}</span><span>View cart</span><span>{money(ctx.cartSubtotal)}</span>
            </button>
          </StickyBar>
        ) : null}
      </div>
    )
  }

  function renderItem() {
    const item = (presets[bakery.id] || []).find((entry) => entry.id === itemId)
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
          <Photo tint="#F3E8E2" className="ca-banner-photo" />
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
        <StickyBar>
          <button type="button" className="ca-btn" onClick={addPreset}>Add to cart · {money(item.price)}</button>
        </StickyBar>
      </div>
    )
  }

  function renderBuild() {
    const limit = layerLimitFor(bakery)
    const buildable = bakeries.filter((item) => layerLimitFor(item) > 0)
    const price = buildPrice(build)
    const set = (patch) => setBuild((current) => ({ ...current, ...patch }))
    const goStep = (step) => { set({ step }); if (typeof window !== 'undefined') window.scrollTo(0, 0) }
    const back = () => (build.step === 1 ? go('home') : goStep(build.step - 1))
    const setLayers = (count) => {
      const next = Math.min(Math.max(count, 1), limit || 1)
      setBuild((current) => ({
        ...current,
        layerCount: next,
        fillings: Array.from({ length: next }, (_, index) => (current.sameFilling ? current.fillings[0] : current.fillings[index] || current.fillings[0])),
      }))
    }
    const addToCart = () => {
      const flavor = FLAVORS.find((item) => item.id === build.flavor)
      const sponge = build.flavor === 'chocolate' ? `${build.chocolate} chocolate sponge` : flavor.sponge
      addItemToCart({
        id: Date.now(),
        title: `Custom ${flavorName(build)} cake`,
        summary: buildSummary(build) + (build.message ? ` · “${build.message}”` : ''),
        layerCount: build.layerCount,
        unitPrice: price,
        quantity: 1,
        totalPrice: price,
        shopId: bakery.id,
        savedDesignId: null,
        config: {
          occasion: 'Custom',
          mode: bakery.capability?.fullCustom ? 'advanced' : 'simple',
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

    let body = null
    let canContinue = true
    if (build.step === 1) {
      canContinue = layerLimitFor(bakery) > 0
      body = (
        <>
          <div className="ca-step-head"><h1 className="ca-h1">Where should we bake it?</h1><p className="ca-muted">Each bakery offers its own options and decides how big a cake it can make.</p></div>
          <div className="ca-stack-12">
            {bakeries.map((item) => {
              const itemLimit = layerLimitFor(item)
              const slot = nextSlotFor[item.id]
              if (!itemLimit) {
                return (
                  <div key={item.id} className="ca-option-card is-disabled">
                    <Photo tint="#F5F5F4" className="ca-thumb" />
                    <span className="ca-option-text"><strong>{item.name}</strong><span className="ca-muted">Ready-made cakes only</span>
                      <button type="button" className="ca-link" onClick={() => openBakery(item.id)}>See their menu instead</button></span>
                  </div>
                )
              }
              const selected = item.id === bakery.id
              return (
                <button key={item.id} type="button" aria-pressed={selected} className={`ca-option-card ${selected ? 'is-selected' : ''}`} onClick={() => {
                  setCustomerShopId(item.id)
                  setBuild((current) => {
                    const layerCount = Math.min(current.layerCount, itemLimit)
                    const shape = shapesFor(item).some((entry) => entry.id === current.shape) ? current.shape : 'round'
                    return { ...current, shape, layerCount, fillings: current.fillings.slice(0, layerCount) }
                  })
                }}>
                  <Photo tint="#EDE5F0" className="ca-thumb" />
                  <span className="ca-option-text">
                    <strong>{item.name}</strong>
                    <span className="ca-muted">{item.capability.fullCustom ? 'Full custom builder' : 'Builder with set shapes'}</span>
                    <span className="ca-chips"><span className="ca-chip is-accent">Up to {itemLimit} layers</span>{slot ? <span className="ca-chip">Next: {ctx.formatPickupWindow(slot)}</span> : null}</span>
                  </span>
                  {selected ? <span className="ca-check"><Icon name="check" size={16} /></span> : null}
                </button>
              )
            })}
          </div>
          {!buildable.length ? <p className="ca-muted">No bakery offers custom cakes yet.</p> : null}
        </>
      )
    } else if (build.step === 2) {
      const shapes = shapesFor(bakery)
      body = (
        <>
          <div className="ca-step-head"><h1 className="ca-h1">Pick your cake</h1><p className="ca-muted">Choose a shape, then a size.</p></div>
          <div className="ca-grid-2">
            {shapes.map((shape) => (
              <button key={shape.id} type="button" aria-pressed={build.shape === shape.id} className={`ca-tile ${build.shape === shape.id ? 'is-selected' : ''}`} onClick={() => set({ shape: shape.id })}>
                <ShapeIcon id={shape.id} />
                <span className="ca-tile-row"><strong>{shape.label}</strong><span>{money(shape.price)}</span></span>
              </button>
            ))}
          </div>
          <h2 className="ca-h3 ca-mt-20">Size</h2>
          <div className="ca-grid-3">
            {SIZES.map((size) => (
              <button key={size.id} type="button" aria-pressed={build.size === size.id} className={`ca-size ${build.size === size.id ? 'is-selected' : ''}`} onClick={() => set({ size: size.id })}>
                <strong>{size.label}</strong><span>{size.price ? `+${money(size.price)}` : 'Included'}</span>
              </button>
            ))}
          </div>
        </>
      )
    } else if (build.step === 3) {
      body = (
        <>
          <div className="ca-step-head"><h1 className="ca-h1">What kind of cake?</h1><p className="ca-muted">This is the main sponge for every layer.</p></div>
          <div className="ca-stack-10">
            {FLAVORS.map((flavor) => {
              const selected = build.flavor === flavor.id
              return (
                <div key={flavor.id} className={`ca-flavor ${selected ? 'is-selected' : ''}`}>
                  <button type="button" aria-pressed={selected} className="ca-flavor-row" onClick={() => set({ flavor: flavor.id })}>
                    <span className={`ca-swatch ${flavor.swatch === 'marble' ? 'is-marble' : ''}`} style={flavor.swatch === 'marble' ? undefined : { background: flavor.swatch }} aria-hidden="true" />
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
        </>
      )
    } else if (build.step === 4) {
      const atMax = build.layerCount >= limit
      const bandHeight = build.layerCount > 6 ? 14 : build.layerCount > 4 ? 18 : 24
      body = (
        <>
          <div className="ca-step-head"><h1 className="ca-h1">Build your layers</h1><p className="ca-muted">Most cakes have {DEFAULT_LAYERS}. {bakery.name} can make up to {limit}.</p></div>
          <div className="ca-stack-view" role="img" aria-label={`${build.layerCount} layer ${flavorName(build)} cake`}>
            <div className="ca-stack">
              <div className="ca-stack-top" />
              {Array.from({ length: build.layerCount }, (_, index) => (
                <div key={index} className="ca-stack-layer" style={{ height: bandHeight }} />
              ))}
              <div className="ca-stack-plate" />
            </div>
          </div>
          <div className="ca-layer-controls">
            <div className="ca-stack-2">
              <strong>{build.layerCount} layers</strong>
              <span className={atMax ? 'ca-warn ca-small' : 'ca-muted ca-small'}>{atMax ? 'That’s the most this bakery can make' : `+${money(PRICE_PER_LAYER)} per layer`}</span>
            </div>
            <div className="ca-stepper">
              <button type="button" aria-label="Remove a layer" disabled={build.layerCount <= 1} onClick={() => setLayers(build.layerCount - 1)}>−</button>
              <button type="button" aria-label="Add a layer" className="is-dark" disabled={atMax} onClick={() => setLayers(build.layerCount + 1)}>+</button>
            </div>
          </div>
          <div className="ca-row-between ca-mt-16">
            <h2 className="ca-h3">Filling between layers</h2>
            <label className="ca-check-label">
              <input type="checkbox" checked={build.sameFilling} onChange={(event) => set({ sameFilling: event.target.checked, fillings: event.target.checked ? build.fillings.map(() => build.fillings[0]) : build.fillings })} />
              Same for all
            </label>
          </div>
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
                  {FILLINGS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </li>
            ))}
          </ul>
        </>
      )
    } else {
      body = (
        <>
          <div className="ca-step-head"><h1 className="ca-h1">Finish it off</h1></div>
          <h2 className="ca-h3">Outside frosting</h2>
          <div className="ca-grid-3">
            {FROSTINGS.map((frosting) => (
              <button key={frosting.id} type="button" aria-pressed={build.frosting === frosting.id} className={`ca-size ${build.frosting === frosting.id ? 'is-selected' : ''}`} onClick={() => set({ frosting: frosting.id })}>
                <strong className="ca-small-strong">{frosting.label}</strong><span>{frosting.price ? `+${money(frosting.price)}` : 'Included'}</span>
              </button>
            ))}
          </div>
          <h2 className="ca-h3 ca-mt-16">Toppings</h2>
          <div className="ca-wrap">
            {TOPPINGS.map((topping) => {
              const on = build.toppings.includes(topping.id)
              return (
                <button key={topping.id} type="button" aria-pressed={on} className={`ca-pill ${on ? 'is-dark' : ''}`} onClick={() => set({ toppings: on ? build.toppings.filter((id) => id !== topping.id) : [...build.toppings, topping.id] })}>
                  {topping.label} · +{money(topping.price)}
                </button>
              )
            })}
          </div>
          <label htmlFor="ca-build-msg" className="ca-label ca-mt-16">Message on top <span className="ca-muted">· optional</span></label>
          <input id="ca-build-msg" className="ca-input" maxLength={40} placeholder="e.g. Happy 30th, Maya!" value={build.message} onChange={(event) => set({ message: event.target.value })} />
          <div className="ca-summary ca-mt-16">
            <strong>Your cake</strong>
            <span>{buildSummary(build)}</span>
            <span className="ca-muted">From {bakery.name}. The bakery confirms your time at checkout.</span>
          </div>
        </>
      )
    }

    return (
      <div className="ca-screen">
        <div className="ca-step-bar">
          <button type="button" className="ca-icon-btn" aria-label="Back" onClick={back}><Icon name="back" /></button>
          <span className="ca-small ca-strong-muted">Step {build.step} of 5{build.step > 1 ? ` · ${bakery.name}` : ''}</span>
        </div>
        <div className="ca-progress" aria-hidden="true"><div style={{ width: `${build.step * 20}%` }} /></div>
        <div className="ca-pad ca-pb-24">{body}</div>
        <StickyBar>
          <div className="ca-so-far"><span className="ca-small ca-muted">So far</span><strong>{money(price)}</strong></div>
          {build.step < 5 ? (
            <button type="button" className="ca-btn ca-flex-1" disabled={!canContinue} onClick={() => goStep(build.step + 1)}>Continue</button>
          ) : (
            <button type="button" className="ca-btn ca-flex-1" onClick={addToCart}>Add to cart · {money(price)}</button>
          )}
        </StickyBar>
      </div>
    )
  }

  function renderCheckout() {
    if (ctx.checkoutStage === 'placed' && ctx.latestPlacedOrder) {
      const placed = ctx.customerOrders.find((order) => order.id === ctx.latestPlacedOrder.id) || { ...ctx.latestPlacedOrder, status: 'new' }
      return renderOrderDetail(placed, () => { ctx.setCheckoutStage('summary'); go('home') })
    }
    const signedIn = Boolean(ctx.authTokens.customer)
    const checking = ctx.customerAuthStatus === 'checking'
    const shopName = bakeries.find((item) => item.id === ctx.checkoutShopId)?.name || ctx.checkoutShopLabel
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
    const slots = ctx.sortedPickupSlots.filter((slot) => ctx.getPickupSlotState(slot).selectable)
    let cta
    if (!signedIn) {
      cta = <button type="button" className="ca-btn" disabled={checking} onClick={ctx.openCustomerSignIn}>{checking ? 'Signing you in…' : 'Sign in to checkout'}</button>
    } else if (!ctx.checkoutReady) {
      cta = <button type="button" className="ca-btn" disabled>{ctx.checkoutBlockers[0]}</button>
    } else {
      cta = <button type="button" className="ca-btn" disabled={uiState.submitting} onClick={ctx.submitCartOrder}>{uiState.submitting ? 'Placing order…' : `Place order · ${money(ctx.checkoutTotal)}`}</button>
    }
    return (
      <div className="ca-screen">
        <TopBar title="Checkout" onBack={() => go('home')} />
        <div className="ca-pad ca-stack-18 ca-pt-16 ca-pb-24">
          <Segmented label="Delivery or pickup" value={ctx.fulfillmentType} onChange={ctx.setFulfillmentType} options={[{ id: 'delivery', label: 'Delivery' }, { id: 'pickup', label: 'Pickup' }]} />

          {ctx.fulfillmentType === 'pickup' ? (
            <section className="ca-stack-8">
              <h2 className="ca-h3">Pickup time at {shopName}</h2>
              {slots.length ? (
                <div className="ca-stack-8">
                  {slots.slice(0, 4).map((slot) => (
                    <button key={slot.id} type="button" aria-pressed={ctx.pickupSlotId === slot.id} className={`ca-slot ${ctx.pickupSlotId === slot.id ? 'is-selected' : ''}`} onClick={() => ctx.setPickupSlotId(slot.id)}>
                      <Icon name="clock" size={18} /><span>{ctx.formatPickupWindow(slot)}</span>
                      <span className="ca-muted ca-small">{slot.capacity - slot.booked} left</span>
                    </button>
                  ))}
                </div>
              ) : <p className="ca-muted">No pickup times are open right now. Try delivery or check back soon.</p>}
            </section>
          ) : (
            <section className="ca-stack-8">
              <h2 className="ca-h3">Deliver to</h2>
              {signedIn && ctx.customerProfile.addresses.length ? (
                <div className="ca-stack-8">
                  {ctx.customerProfile.addresses.map((address) => (
                    <button key={address.id} type="button" aria-pressed={ctx.selectedAddress?.id === address.id} className={`ca-slot ${ctx.selectedAddress?.id === address.id ? 'is-selected' : ''}`} onClick={() => ctx.setSelectedAddressId(address.id)}>
                      <Icon name="pin" size={18} /><span><strong>{address.label}</strong> · {address.line1}</span>
                    </button>
                  ))}
                </div>
              ) : null}
              {signedIn ? (
                <button type="button" className="ca-link" onClick={() => { setAccountPage('addresses'); go('account'); setAccountPage('addresses') }}>+ Add an address</button>
              ) : <p className="ca-muted">Sign in to add your address.</p>}
            </section>
          )}

          <section className="ca-stack-10">
            <h2 className="ca-h3">Your order</h2>
            {cart.map((item) => (
              <div key={item.id} className="ca-cart-item">
                <Photo tint="#F3E8E2" className="ca-thumb-sm" />
                <span className="ca-cart-text"><strong>{item.title}</strong><span className="ca-muted ca-small">{item.summary || ctx.toDesignSummary(item.config)}</span></span>
                <span className="ca-cart-side">
                  <strong>{money(item.totalPrice)}</strong>
                  <span className="ca-qty">
                    <button type="button" aria-label={`One less ${item.title}`} onClick={() => ctx.updateCartItemQuantity(item.id, -1)}>−</button>
                    <span>{item.quantity || 1}</span>
                    <button type="button" aria-label={`One more ${item.title}`} onClick={() => ctx.updateCartItemQuantity(item.id, 1)}>+</button>
                  </span>
                </span>
              </div>
            ))}
          </section>

          {signedIn ? (
            <section className="ca-stack-8">
              <h2 className="ca-h3">Payment</h2>
              {ctx.customerProfile.cards.length ? ctx.customerProfile.cards.map((card) => {
                const chosen = ctx.paymentCard.last4 === card.last4 && ctx.paymentCard.brand === card.brand
                return (
                  <button key={card.id} type="button" aria-pressed={chosen} className={`ca-slot ${chosen ? 'is-selected' : ''}`} onClick={() => ctx.setPaymentCard({ brand: card.brand, last4: card.last4, name: card.name })}>
                    <Icon name="card" size={18} /><span>{card.brand} •••• {card.last4}</span>
                  </button>
                )
              }) : (
                <div className="ca-grid-2">
                  <input className="ca-input" aria-label="Name on card" placeholder="Name on card" value={ctx.paymentCard.name} onChange={(event) => ctx.setPaymentCard((current) => ({ ...current, name: event.target.value }))} />
                  <input className="ca-input" aria-label="Last 4 digits" inputMode="numeric" placeholder="Last 4 digits" value={ctx.paymentCard.last4} onChange={(event) => ctx.setPaymentCard((current) => ({ ...current, last4: event.target.value.replace(/\D/g, '').slice(0, 4) }))} />
                </div>
              )}
              <p className="ca-muted ca-small">Test mode: no card is charged yet.</p>
            </section>
          ) : null}

          <dl className="ca-totals">
            <dt>Subtotal</dt><dd>{money(ctx.cartSubtotal)}</dd>
            {ctx.fulfillmentType === 'delivery' ? <><dt>Delivery fee</dt><dd>{money(ctx.deliveryFee)}</dd></> : null}
            <dt>Service fee</dt><dd>{money(ctx.serviceFee)}</dd>
            <dt>GST</dt><dd>{money(ctx.gstHst)}</dd>
            <dt className="ca-total">Total</dt><dd className="ca-total">{money(ctx.checkoutTotal)}</dd>
          </dl>
        </div>
        <StickyBar>{cta}</StickyBar>
      </div>
    )
  }

  function renderOrderDetail(order, onClose) {
    const status = order.status || 'new'
    const cancelled = status === 'cancelled'
    const currentIndex = Math.max(0, ORDER_STEPS.findIndex((step) => step.statuses.includes(status)))
    const shopName = bakeries.find((item) => item.id === order.shopId)?.name || order.shopLabel || 'Your bakery'
    const headline = cancelled ? 'This order was cancelled' : ORDER_STEPS[currentIndex].label
    return (
      <div className="ca-screen">
        <div className="ca-map" aria-hidden="true"><Icon name="pin" size={28} /></div>
        <button type="button" className="ca-float-btn ca-float-left ca-float-fixed" aria-label="Close" onClick={onClose}><Icon name="close" size={18} /></button>
        <div className="ca-sheet ca-pad ca-stack-16">
          <div className="ca-stack-4">
            {order.pickupSlot ? <span className="ca-accent-text ca-small">Pickup {ctx.formatPickupWindow(order.pickupSlot)}</span> : null}
            <h1 className="ca-h1">{headline}</h1>
            <span className="ca-muted">{shopName} · Order {String(order.id).slice(-6)}</span>
          </div>
          {!cancelled ? (
            <ol className="ca-timeline">
              {ORDER_STEPS.map((step, index) => (
                <li key={step.id} className={index < currentIndex ? 'is-done' : index === currentIndex ? 'is-current' : ''}>
                  <span className="ca-dot">{index < currentIndex ? <Icon name="check" size={13} /> : null}</span>
                  <span>{step.id === 'done' && order.fulfillment === 'delivery' ? 'Delivered' : step.label}</span>
                </li>
              ))}
            </ol>
          ) : null}
          <div className="ca-summary">
            <strong>{money(order.total)}</strong>
            <span>{order.designSnapshot ? ctx.toDesignSummary(order.designSnapshot) : 'Cake order'}</span>
          </div>
          <button type="button" className="ca-btn ca-btn-ghost" onClick={() => { setAccountPage('help'); go('account'); setAccountPage('help') }}><Icon name="help" size={18} />Get help with this order</button>
        </div>
      </div>
    )
  }

  function renderOrders() {
    if (openOrderId) {
      const order = ctx.customerOrders.find((item) => item.id === openOrderId)
      if (order) return renderOrderDetail(order, () => setOpenOrderId(''))
    }
    const signedIn = Boolean(ctx.authTokens.customer)
    const orders = ctx.customerOrders.slice().sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    return (
      <div className="ca-screen has-nav">
        <div className="ca-pad ca-pt-16"><h1 className="ca-h1">Orders</h1></div>
        {cart.length ? (
          <div className="ca-pad ca-section">
            <button type="button" className="ca-list-row is-highlight" onClick={() => go('checkout')}>
              <span className="ca-list-icon"><Icon name="cart" /></span>
              <span className="ca-list-text"><strong>Your cart · {cartCount} {cartCount === 1 ? 'cake' : 'cakes'}</strong><span className="ca-muted">{money(ctx.cartSubtotal)} · Continue to checkout</span></span>
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
          ) : orders.length ? orders.map((order) => (
            <button key={order.id} type="button" className="ca-list-row" onClick={() => setOpenOrderId(order.id)}>
              <span className="ca-list-icon"><Icon name="cake" /></span>
              <span className="ca-list-text">
                <strong>{bakeries.find((item) => item.id === order.shopId)?.name || 'Cake order'}</strong>
                <span className="ca-muted">{ctx.formatStatus(order.status)} · {money(order.total)}</span>
              </span>
              <Icon name="chevron" size={18} />
            </button>
          )) : <p className="ca-muted">No orders yet. Your first cake will show up here.</p>}
        </div>
      </div>
    )
  }

  function renderAccount() {
    const signedIn = Boolean(ctx.authTokens.customer)
    const session = ctx.accountSessions.customer
    const name = ctx.customerProfile.fullName || session?.name || 'Guest'
    const back = () => setAccountPage('main')

    if (accountPage === 'addresses') {
      return (
        <div className="ca-screen">
          <TopBar title="Addresses" onBack={back} />
          <div className="ca-pad ca-stack-12 ca-pt-16">
            {ctx.customerProfile.addresses.map((address) => (
              <div key={address.id} className="ca-list-row is-static"><span className="ca-list-icon"><Icon name="pin" /></span><span className="ca-list-text"><strong>{address.label}</strong><span className="ca-muted">{address.line1}{address.instructions ? ` · ${address.instructions}` : ''}</span></span></div>
            ))}
            <h2 className="ca-h3 ca-mt-12">Add an address</h2>
            <input className="ca-input" aria-label="Label" placeholder="Label (Home, Work…)" value={ctx.addressDraft.label} onChange={(event) => ctx.setAddressDraft((current) => ({ ...current, label: event.target.value }))} />
            <input className="ca-input" aria-label="Street address" placeholder="Street address" value={ctx.addressDraft.line1} onChange={(event) => ctx.setAddressDraft((current) => ({ ...current, line1: event.target.value }))} />
            <input className="ca-input" aria-label="Drop-off notes" placeholder="Drop-off notes (optional)" value={ctx.addressDraft.instructions} onChange={(event) => ctx.setAddressDraft((current) => ({ ...current, instructions: event.target.value }))} />
            <button type="button" className="ca-btn" disabled={!ctx.addressDraft.label.trim() || !ctx.addressDraft.line1.trim() || uiState.updating} onClick={ctx.addProfileAddress}>Save address</button>
          </div>
        </div>
      )
    }
    if (accountPage === 'payment') {
      return (
        <div className="ca-screen">
          <TopBar title="Payment methods" onBack={back} />
          <div className="ca-pad ca-stack-12 ca-pt-16">
            {ctx.customerProfile.cards.map((card) => (
              <div key={card.id} className="ca-list-row is-static"><span className="ca-list-icon"><Icon name="card" /></span><span className="ca-list-text"><strong>{card.brand} •••• {card.last4}</strong><span className="ca-muted">{card.name}</span></span></div>
            ))}
            <h2 className="ca-h3 ca-mt-12">Add a card</h2>
            <input className="ca-input" aria-label="Name on card" placeholder="Name on card" value={ctx.cardDraft.name} onChange={(event) => ctx.setCardDraft((current) => ({ ...current, name: event.target.value }))} />
            <div className="ca-grid-2">
              <select className="ca-select" aria-label="Card brand" value={ctx.cardDraft.brand} onChange={(event) => ctx.setCardDraft((current) => ({ ...current, brand: event.target.value }))}>
                {['Visa', 'Mastercard', 'Amex'].map((brand) => <option key={brand}>{brand}</option>)}
              </select>
              <input className="ca-input" aria-label="Last 4 digits" inputMode="numeric" placeholder="Last 4 digits" value={ctx.cardDraft.last4} onChange={(event) => ctx.setCardDraft((current) => ({ ...current, last4: event.target.value.replace(/\D/g, '').slice(0, 4) }))} />
            </div>
            <button type="button" className="ca-btn" disabled={ctx.cardDraft.last4.length !== 4 || uiState.updating} onClick={ctx.addProfileCard}>Save card</button>
            <p className="ca-muted ca-small">Test mode: only the brand and last 4 digits are stored.</p>
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
      { id: 'addresses', icon: 'pin', label: 'Addresses', sub: `${ctx.customerProfile.addresses.length || 'No'} saved` },
      { id: 'payment', icon: 'card', label: 'Payment methods', sub: `${ctx.customerProfile.cards.length || 'No'} saved` },
      { id: 'settings', icon: 'gear', label: 'Settings', sub: 'Notifications, preferences, privacy' },
      { id: 'help', icon: 'help', label: 'Help', sub: 'Order issues, cancelling, refunds' },
    ]
    return (
      <div className="ca-screen has-nav">
        <div className="ca-pad ca-pt-24 ca-profile">
          <span className="ca-avatar">{name.slice(0, 1).toUpperCase()}</span>
          <span className="ca-stack-2">
            <strong className="ca-profile-name">{name}</strong>
            <span className="ca-muted ca-small">{signedIn ? `${ctx.customerProfile.email || session?.email || ''} · Signed in with Google` : 'Sign in to save details and order'}</span>
          </span>
        </div>
        {signedIn ? (
          <div className="ca-pad ca-section ca-grid-3">
            <button type="button" className="ca-quick" onClick={() => go('orders')}><Icon name="orders" />Orders</button>
            <button type="button" className="ca-quick" onClick={() => setAccountPage('saved')}><Icon name="cake" />Saved cakes</button>
            <button type="button" className="ca-quick" onClick={() => go('checkout')}><Icon name="cart" />Cart</button>
          </div>
        ) : (
          <div className="ca-pad ca-section"><button type="button" className="ca-btn" onClick={ctx.openCustomerSignIn}>Sign in with Google</button></div>
        )}
        <ul className="ca-pad ca-menu-list">
          {rows.filter((row) => signedIn || ['settings', 'help'].includes(row.id)).map((row) => (
            <li key={row.id}>
              <button type="button" className="ca-list-row is-plain" onClick={() => (row.id === 'settings' ? go('settings') : setAccountPage(row.id))}>
                <span className="ca-list-icon is-plain"><Icon name={row.icon} /></span>
                <span className="ca-list-text"><strong>{row.label}</strong><span className="ca-muted ca-small">{row.sub}</span></span>
                <Icon name="chevron" size={18} />
              </button>
            </li>
          ))}
        </ul>
        {signedIn ? <div className="ca-pad ca-section"><button type="button" className="ca-btn ca-btn-ghost" disabled={uiState.authUpdating} onClick={ctx.handleCustomerLogout}>{uiState.authUpdating ? 'Signing out…' : 'Sign out'}</button></div> : null}
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
          <h1 className="ca-h1">Sign in to continue</h1>
          <p className="ca-muted ca-lh">Sign in to place orders, save addresses and see your order history. Your cart is kept while you sign in.</p>
          {uiState.error ? <p className="ca-toast is-error is-inline">{uiState.error}</p> : null}
        </div>
        <div className="ca-pad ca-stack-10 ca-auth-actions">
          <button type="button" className="ca-btn" disabled={uiState.authUpdating || checking} onClick={ctx.continueWithSignIn}>
            {uiState.authUpdating ? 'Opening Google…' : checking ? 'Signing you in…' : ctx.googleEnabled ? 'Continue with Google' : 'Sign in'}
          </button>
          <button type="button" className="ca-btn ca-btn-ghost" onClick={() => setView(ctx.authReturnView || 'home')}>Not now</button>
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
  else screen = renderHome()

  const showNav = ['home', 'search', 'orders', 'account'].includes(view) && !(view === 'orders' && openOrderId) && !(view === 'account' && accountPage !== 'main')

  return (
    <div className="ca-root">
      <div className="ca-phone">
        {renderToast()}
        {screen}
        {showNav ? <BottomNav view={view} go={go} cartCount={cartCount} /> : null}
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
