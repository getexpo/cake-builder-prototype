import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import './App.css'

const ENV_API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim()
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim()
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null
const API_BASE_CANDIDATES = ENV_API_BASE_URL
  ? [ENV_API_BASE_URL]
  : ['http://localhost:4224', 'http://localhost:4222', 'http://localhost:4220', 'http://localhost:4218', 'http://localhost:4204', 'http://localhost:4202', 'http://localhost:4194', 'http://localhost:4192', 'http://localhost:4176', 'http://localhost:4174', 'http://localhost:4172', 'http://localhost:4170', 'http://localhost:4164', 'http://localhost:4160', 'http://localhost:4126', 'http://localhost:4124', 'http://localhost:4122', 'http://localhost:4120', 'http://localhost:4020']
const HAS_REMOTE_API = Boolean(ENV_API_BASE_URL)
const API_ROUTE_PROBE = [
  { path: '/api/meta/order-statuses', allowedStatuses: [200] },
  { path: '/api/auth/me', allowedStatuses: [200, 401] },
  { path: '/api/auth/sessions', allowedStatuses: [200, 401] },
  { path: '/api/owner/queue', allowedStatuses: [200, 401, 403] },
  { path: '/api/owner/locations', allowedStatuses: [401, 403] },
  { path: '/api/admin/team', allowedStatuses: [401, 403] },
]
const DEFAULT_SHOP_ID = 'shop-1'
const DEFAULT_CUSTOMER_NAME = 'Emma Johnson'
const DEMO_USERS = {
  customer: { email: 'customer@demo.com', role: 'customer', name: 'Emma Johnson' },
  owner: { email: 'owner@demo.com', role: 'owner', name: 'Maya Chen' },
  staff: { email: 'staff@demo.com', role: 'staff', name: 'Luis Garcia' },
  admin: { email: 'admin@demo.com', role: 'admin', name: 'Avery Patel' },
}

const ownerStaffByShop = {
  'shop-1': [{ id: 'staff-1', label: 'Luis Garcia · Downtown lead' }],
  'shop-2': [{ id: 'staff-2', label: 'Burnaby Lead · Burnaby Heights' }],
  'shop-3': [{ id: 'staff-3', label: 'Richmond Lead · Pickup hub' }],
}

const occasionConfigs = {
  Birthday: { cakeType: 'round', layers: 3, mode: 'simple' },
  Wedding: { cakeType: 'premium', layers: 6, mode: 'advanced' },
  'Baby shower': { cakeType: 'heart', layers: 2, mode: 'simple' },
  Anniversary: { cakeType: 'heart', layers: 4, mode: 'advanced' },
  Holiday: { cakeType: 'round', layers: 5, mode: 'simple' },
  Corporate: { cakeType: 'tall', layers: 4, mode: 'advanced' },
}

const cakeTypes = [
  { id: 'round', label: 'Round', basePrice: 45 },
  { id: 'heart', label: 'Heart', basePrice: 55 },
  { id: 'tall', label: 'Tall', basePrice: 70 },
  { id: 'premium', label: 'Premium', basePrice: 90 },
]

const modeRules = {
  simple: {
    label: 'Quick build',
    description: 'Fewer choices, guided setup, faster ordering.',
    minLayers: 1,
    maxLayers: 4,
    cakeTypes: ['round', 'heart'],
    fields: ['bread', 'flavor', 'cream'],
  },
  advanced: {
    label: 'Full custom',
    description: 'More control, more cake types, more layer-by-layer detail.',
    minLayers: 1,
    maxLayers: 10,
    cakeTypes: ['round', 'heart', 'tall', 'premium'],
    fields: ['bread', 'sugar', 'cream', 'flavor'],
  },
}

const fieldLabels = {
  bread: 'Base',
  sugar: 'Sugar level',
  cream: 'Cream',
  flavor: 'Flavor',
}

const optionSets = {
  bread: [
    { label: 'Vanilla sponge', price: 0 },
    { label: 'Chocolate sponge', price: 4 },
    { label: 'Red velvet', price: 6 },
    { label: 'Marble', price: 5 },
  ],
  sugar: [
    { label: 'White sugar', price: 0 },
    { label: 'Brown sugar', price: 2 },
    { label: 'Honey blend', price: 4 },
    { label: 'Low sugar', price: 3 },
  ],
  cream: [
    { label: 'Buttercream', price: 0 },
    { label: 'Whipped cream', price: 3 },
    { label: 'Cream cheese', price: 5 },
    { label: 'Ganache', price: 7 },
  ],
  flavor: [
    { label: 'Classic vanilla', price: 0 },
    { label: 'Chocolate fudge', price: 4 },
    { label: 'Strawberry', price: 3 },
    { label: 'Cookies and cream', price: 5 },
  ],
}

const adminModules = [
  'All shops overview',
  'Subscription monitoring',
  'Support and disputes',
  'Refund tooling',
  'Platform analytics',
  'Delivery issue monitoring',
]

const pillarCards = [
  {
    title: 'Order creation',
    status: 'MVP active',
    bullets: ['Visual cake builder', 'Simple and advanced ordering paths', 'Cart and checkout foundation'],
  },
  {
    title: 'Shop operations',
    status: 'Structured',
    bullets: ['Owner workspace', 'Template and pricing controls', 'Order pipeline and staff actions'],
  },
  {
    title: 'Fulfillment',
    status: 'Pickup first',
    bullets: ['Pickup slots now represented', 'Notifications visible in flow', 'Delivery stays optional for MVP'],
  },
  {
    title: 'Platform foundation',
    status: 'Defined',
    bullets: ['Multi-tenant model', 'Auth and roles', 'Billing and admin path'],
  },
]

const notificationMoments = [
  'Order confirmation sent',
  'Pickup reminder 2 hours before',
  'Ready for pickup alert',
]

const accountCards = [
  {
    title: 'Customer account',
    items: ['Email / Google / phone login', 'Saved designs and favorites', 'Order history and reorders'],
  },
  {
    title: 'Owner account',
    items: ['Shop workspace access', 'Team invites', 'Template and pricing permissions'],
  },
  {
    title: 'Staff roles',
    items: ['Baking queue access', 'Order status updates', 'Permission-based views'],
  },
  {
    title: 'Platform admin',
    items: ['All shops visibility', 'Billing/support access', 'Disputes and analytics controls'],
  },
]

const profileSections = [
  { id: 'profile', label: 'Profile' },
  { id: 'settings', label: 'Settings' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'locations', label: 'Locations' },
  { id: 'security', label: 'Security' },
]

const settingsArchitecture = [
  {
    title: 'General',
    items: ['Profile details', 'Business identity', 'Timezone and locale', 'Default fulfillment preferences'],
  },
  {
    title: 'Notifications',
    items: ['Order updates', 'Pickup reminders', 'Staff alerts', 'Admin incident escalation'],
  },
  {
    title: 'Personalization',
    items: ['Saved designs and favorites', 'Repeat-order shortcuts', 'Theme and accessibility choices', 'Preferred cake presets'],
  },
  {
    title: 'Billing and storage',
    items: ['Plan and invoices', 'Per-location billing', 'Media/storage usage', 'Payout and tax settings'],
  },
  {
    title: 'Security and access',
    items: ['Passwordless and social login', 'Device/session management', 'Team roles', 'Audit trail'],
  },
]

const defaultOwnerLocations = [
  {
    id: 'shop-1',
    name: 'Downtown Vancouver',
    status: 'Primary studio',
    team: 8,
    city: 'Vancouver',
    capability: {
      presetsOnly: true,
      presetsCustomizable: false,
      fullCustom: false,
    },
    hero: 'Classic celebration cakes ready to order',
    menuSummary: 'Preset cakes only',
  },
  {
    id: 'shop-2',
    name: 'Burnaby Heights',
    status: 'Growth location',
    team: 5,
    city: 'Burnaby',
    capability: {
      presetsOnly: false,
      presetsCustomizable: true,
      fullCustom: false,
    },
    hero: 'Signature cakes with flavor and topping tweaks',
    menuSummary: 'Preset cakes + limited customization',
  },
  {
    id: 'shop-3',
    name: 'Richmond Pickup Hub',
    status: 'Pickup-focused',
    team: 3,
    city: 'Richmond',
    capability: {
      presetsOnly: false,
      presetsCustomizable: true,
      fullCustom: true,
    },
    hero: 'From house designs to fully custom builds',
    menuSummary: 'Preset cakes + limited customization + full custom',
  },
]

const fakeBakeryPresets = {
  'shop-1': [
    { id: 'shop-1-preset-1', title: 'Vanilla Birthday Bloom', detail: '6 inch vanilla cake with buttercream florals', price: 58 },
    { id: 'shop-1-preset-2', title: 'Chocolate Celebration Stack', detail: 'Rich chocolate sponge with ganache finish', price: 72 },
  ],
  'shop-2': [
    { id: 'shop-2-preset-1', title: 'Strawberry Party Cake', detail: 'Preset base with frosting and topper customization', price: 64 },
    { id: 'shop-2-preset-2', title: 'Cookies and Cream Crowd Pleaser', detail: 'Preset flavor with mix-in and message options', price: 70 },
  ],
  'shop-3': [
    { id: 'shop-3-preset-1', title: 'Luxury Wedding Sample', detail: 'Preset structure with premium finishing options', price: 125 },
    { id: 'shop-3-preset-2', title: 'Ridiculous Custom Inspiration', detail: 'Start from this or build from scratch', price: 140 },
  ],
}

const customerShopOptions = defaultOwnerLocations.map((location) => ({
  id: location.id,
  name: location.name,
}))

const bulkApplyTemplates = [
  { id: 'holiday-menu', label: 'Holiday menu', detail: 'Push seasonal cakes and pricing' },
  { id: 'pickup-hours', label: 'Pickup hours', detail: 'Align slot timing and reminders' },
  { id: 'staff-playbook', label: 'Staff playbook', detail: 'Sync queue notes and handoff rules' },
]

const helpActions = [
  'Track a live order',
  'Reconnect your session',
  'Ask for pickup timing help',
  'Start a support chat',
]

const DEMO_AUTH_STORAGE_KEY = 'cake-demo-auth-state'

const roleSessionDescriptions = {
  customer: 'Personal orders, saved cakes, and checkout recovery',
  owner: 'Shop workspace, team coordination, and fulfillment controls',
  staff: 'Production queue access with narrower permissions',
  admin: 'Cross-shop analytics, disputes, and platform oversight',
}

function getDeviceLabel() {
  if (typeof navigator === 'undefined') return 'This browser'
  const platform = navigator.userAgentData?.platform || navigator.platform || 'browser'
  return `${platform} browser`
}

function readStoredDemoAuthState() {
  if (typeof window === 'undefined') {
    return {
      desiredRoles: { customer: false, owner: false, staff: false, admin: false },
      sessionMeta: {},
    }
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(DEMO_AUTH_STORAGE_KEY) || '{}')
    return {
      desiredRoles: {
        customer: parsed?.desiredRoles?.customer === true,
        owner: parsed?.desiredRoles?.owner === true,
        staff: parsed?.desiredRoles?.staff === true,
        admin: parsed?.desiredRoles?.admin === true,
      },
      sessionMeta: parsed?.sessionMeta || {},
    }
  } catch {
    return {
      desiredRoles: { customer: false, owner: false, staff: false, admin: false },
      sessionMeta: {},
    }
  }
}

function createSessionMetaPatch(overrides = {}) {
  const now = new Date().toISOString()
  return {
    deviceLabel: getDeviceLabel(),
    lastActionAt: now,
    ...overrides,
  }
}

function makeLayers(count, occasion) {
  const defaultsByOccasion = {
    Wedding: { flavor: 'Classic vanilla', cream: 'Buttercream' },
    Birthday: { flavor: 'Chocolate fudge', cream: 'Buttercream' },
    Holiday: { flavor: 'Strawberry', cream: 'Whipped cream' },
    Corporate: { flavor: 'Classic vanilla', cream: 'Ganache' },
    Anniversary: { flavor: 'Strawberry', cream: 'Cream cheese' },
    'Baby shower': { flavor: 'Cookies and cream', cream: 'Whipped cream' },
  }

  const preset = defaultsByOccasion[occasion] || defaultsByOccasion.Birthday

  return Array.from({ length: count }, (_, index) => ({
    id: index,
    name: `Layer ${index + 1}`,
    bread: optionSets.bread[0].label,
    sugar: optionSets.sugar[0].label,
    cream: preset.cream,
    flavor: preset.flavor,
  }))
}

function clampLayerCount(count, rules) {
  return Math.min(rules.maxLayers, Math.max(rules.minLayers, count))
}

function buildLayerSet({ count, occasion, mode, existingLayers = [], preserveOccasionTaste = false }) {
  const defaults = makeLayers(count, occasion)
  const editableFields = modeRules[mode].fields

  return defaults.map((fallbackLayer, index) => {
    const existingLayer = existingLayers[index]

    if (!existingLayer) {
      return fallbackLayer
    }

    const nextLayer = {
      ...fallbackLayer,
      id: index,
      name: `Layer ${index + 1}`,
    }

    editableFields.forEach((field) => {
      if (existingLayer[field]) {
        nextLayer[field] = existingLayer[field]
      }
    })

    if (preserveOccasionTaste) {
      ;['cream', 'flavor'].forEach((field) => {
        if (!editableFields.includes(field) && existingLayer[field]) {
          nextLayer[field] = existingLayer[field]
        }
      })
    }

    return nextLayer
  })
}

let apiBasePromise

async function probeApiBase(baseUrl) {
  try {
    const checks = await Promise.all(API_ROUTE_PROBE.map(async ({ path, allowedStatuses }) => {
      const response = await fetch(`${baseUrl}${path}`, { signal: AbortSignal.timeout(2000) })
      return allowedStatuses.includes(response.status)
    }))

    return checks.every(Boolean) ? baseUrl : null
  } catch {
    return null
  }
}

async function resolveApiBase({ force = false } = {}) {
  if (!force && apiBasePromise) return apiBasePromise

  apiBasePromise = (async () => {
    for (const candidate of API_BASE_CANDIDATES) {
      const resolved = await probeApiBase(candidate)
      if (resolved) return resolved
    }

    throw new Error(`No compatible backend found. Tried: ${API_BASE_CANDIDATES.join(', ')}`)
  })()

  try {
    return await apiBasePromise
  } catch (error) {
    apiBasePromise = undefined
    throw error
  }
}

async function apiFetch(path, options = {}) {
  const baseUrl = await resolveApiBase()
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  })

  if (!response.ok) {
    let message = `Request failed: ${response.status}`
    try {
      const data = await response.json()
      message = data.error || message
    } catch {
      // no-op
    }

    const error = new Error(message)
    error.status = response.status
    error.baseUrl = baseUrl
    throw error
  }

  return response.json()
}

function formatMoney(value) {
  return `$${Number(value || 0).toFixed(0)}`
}

function formatStatus(value) {
  return value ? value.replaceAll('_', ' ') : 'unknown'
}

function formatRoleLabel(role) {
  if (!role) return 'Account'
  return `${role.charAt(0).toUpperCase()}${role.slice(1)} account`
}

function formatTemplateLabel(value) {
  return value ? value.split('-').map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`).join(' ') : 'Template'
}

function formatShortTimestamp(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function getOrderActionLabel(status) {
  const map = {
    confirmed: 'Confirm order',
    baking: 'Move to baking',
    decorating: 'Move to decorating',
    ready: 'Mark ready for pickup',
    picked_up: 'Mark picked up',
  }

  return map[status] || `Move to ${formatStatus(status)}`
}

function getFriendlyError(error, fallback, roleLabel = 'this account') {
  if (error?.status === 401) return `${roleLabel} is signed out. Sign back in to continue.`
  if (error?.status === 403) return `${roleLabel} does not have permission for that action.`
  return error?.message || fallback
}

function toDesignSummary(config = {}) {
  const typeLabel = cakeTypes.find((type) => type.id === config.cakeType)?.label || config.cakeType || 'Cake'
  return `${config.occasion || 'Custom'} · ${typeLabel} · ${config.layerCount || 1} layers`
}

function formatPickupWindow(slot = {}) {
  if (!slot?.startTime) return slot?.label || 'Pickup window unavailable'

  const start = new Date(slot.startTime)
  const end = slot.endTime ? new Date(slot.endTime) : null
  const dayLabel = start.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
  const startLabel = start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  const endLabel = end ? end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : null

  return `${dayLabel} · ${startLabel}${endLabel ? ` to ${endLabel}` : ''}`
}

function getMinutesUntilPickup(slot = {}) {
  if (slot?.startTime) {
    return Math.round((new Date(slot.startTime).getTime() - Date.now()) / 60000)
  }

  if (!slot?.label) return null
  const match = slot.label.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
  if (!match) return null

  const now = new Date()
  let hour = Number(match[1]) % 12
  if (match[3].toUpperCase() === 'PM') hour += 12
  const minutes = Number(match[2])
  const pickup = new Date(now)
  pickup.setHours(hour, minutes, 0, 0)

  if (pickup.getTime() < now.getTime() - 60 * 1000) {
    pickup.setDate(pickup.getDate() + 1)
  }

  return Math.round((pickup.getTime() - now.getTime()) / 60000)
}

function getPickupSlotState(slot = {}) {
  const remaining = Number(slot.capacity || 0) - Number(slot.booked || 0)
  const minutesUntilPickup = getMinutesUntilPickup(slot)

  if (!slot.active) return { label: 'Paused', detail: 'Owner has hidden this slot for now.', selectable: false }
  if (minutesUntilPickup !== null && minutesUntilPickup < 0) return { label: 'Expired', detail: 'Pickup window already passed.', selectable: false }
  if (remaining <= 0) return { label: 'Full', detail: 'No remaining pickup capacity.', selectable: false }
  if (minutesUntilPickup !== null && minutesUntilPickup < 180) return { label: 'Closing soon', detail: 'Good for near-term pickup.', selectable: true }
  return { label: 'Available', detail: `${remaining} pickup spot${remaining === 1 ? '' : 's'} left.`, selectable: true }
}

function getDesignActivity(order) {
  if (!order) return 'No order yet'
  return `${formatStatus(order.status)}${order.pickupSlot?.label ? ` · ${order.pickupSlot.label}` : ''}`
}

function canCustomerCancelOrder(order = {}) {
  return ['new', 'confirmed'].includes(order.status)
}

function getExceptionLabel(order = {}) {
  if (order.attentionFlags?.length) return order.attentionFlags[0].replaceAll('_', ' ')
  const slot = order.pickupSlot || {}
  const remaining = typeof slot.capacity === 'number' && typeof slot.booked === 'number' ? slot.capacity - slot.booked : null
  const pickupMinutes = getMinutesUntilPickup(slot)
  if (order.status === 'cancelled') return order.refundStatus === 'refunded' ? 'Cancelled and refunded' : 'Cancelled, refund follow-up open'
  if (order.disputes?.some((item) => item.status === 'open')) return 'Open support dispute'
  if (order.supportStatus && !['closed', 'resolved', 'monitoring'].includes(order.supportStatus)) return formatStatus(order.supportStatus)
  if (remaining !== null && remaining < 0) return 'Overbooked pickup slot'
  if (!slot.label) return 'Pickup slot missing'
  if (!order.notes) return 'Missing operator notes'
  if (order.status === 'ready' && pickupMinutes !== null && pickupMinutes > 180) return 'Ready too early for pickup window'
  if (order.status !== 'picked_up' && pickupMinutes !== null && pickupMinutes < 0) return 'Pickup window passed'
  return ''
}

function App() {
  const storedDemoAuthState = readStoredDemoAuthState()
  const [occasion, setOccasion] = useState('Birthday')
  const [mode, setMode] = useState('simple')
  const [cakeType, setCakeType] = useState('round')
  const [layerCount, setLayerCount] = useState(3)
  const [layers, setLayers] = useState(makeLayers(3, 'Birthday'))
  const [activeLayer, setActiveLayer] = useState(0)
  const [cart, setCart] = useState([])
  const [view, setView] = useState('home')
  const [guestMode, setGuestMode] = useState(false)
  const [profileSection, setProfileSection] = useState('profile')
  const [profileMenuExpanded, setProfileMenuExpanded] = useState(false)
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false)
  const [profileHelpOpen, setProfileHelpOpen] = useState(false)
  const [builderMenuOpen, setBuilderMenuOpen] = useState(false)
  const [builderStep, setBuilderStep] = useState('review')
  const [builderScreen, setBuilderScreen] = useState('store-menu')
  const [selectedMenuItem, setSelectedMenuItem] = useState(null)
  const [selectedCartShopId, setSelectedCartShopId] = useState('')
  const [pickupSlots, setPickupSlots] = useState([])
  const [pickupSlotId, setPickupSlotId] = useState('')
  const [checkoutStage, setCheckoutStage] = useState('summary')
  const [fulfillmentType, setFulfillmentType] = useState('pickup')
  const [paymentCard, setPaymentCard] = useState({ name: '', last4: '', brand: 'Visa' })
  const [addressDraft, setAddressDraft] = useState({ label: '', line1: '', instructions: '' })
  const [cardDraft, setCardDraft] = useState({ brand: 'Visa', last4: '', name: '' })
  const [customerProfile, setCustomerProfile] = useState({
    fullName: '',
    email: '',
    addresses: [],
    cards: [],
  })
  const [selectedAddressId, setSelectedAddressId] = useState('')
  const [latestPlacedOrder, setLatestPlacedOrder] = useState(null)
  const [customerShopId, setCustomerShopId] = useState(DEFAULT_SHOP_ID)
  const [accountType, setAccountType] = useState('customer')
  const [savedDesigns, setSavedDesigns] = useState([])
  const [customerOrders, setCustomerOrders] = useState([])
  const [customerNotifications, setCustomerNotifications] = useState([])
  const [ownerSummary, setOwnerSummary] = useState({ total: 0, byStatus: {} })
  const [ownerQueue, setOwnerQueue] = useState({ newOrders: [], inProduction: [], ready: [], pickedUp: [], cancelled: [], attentionCounts: {}, attentionOrders: [] })
  const [ownerPickupSlots, setOwnerPickupSlots] = useState([])
  const [ownerOrder, setOwnerOrder] = useState(null)
  const [ownerOrderId, setOwnerOrderId] = useState('')
  const [selectedOrderStatus, setSelectedOrderStatus] = useState('ready')
  const [ownerOpsDraft, setOwnerOpsDraft] = useState({ notes: '', pickupSlotId: '', assignedStaffId: '' })
  const [orderStatuses, setOrderStatuses] = useState([])
  const [notifications, setNotifications] = useState([])
  const [pickupSlotDrafts, setPickupSlotDrafts] = useState({})
  const [adminDisputes, setAdminDisputes] = useState([])
  const [adminDisputeDrafts, setAdminDisputeDrafts] = useState({})
  const [adminAssignmentDrafts, setAdminAssignmentDrafts] = useState({})
  const [customerSupportDrafts, setCustomerSupportDrafts] = useState({})
  const [authTokens, setAuthTokens] = useState({ customer: '', owner: '', staff: '', admin: '' })
  const [desiredDemoRoles, setDesiredDemoRoles] = useState(storedDemoAuthState.desiredRoles)
  const [accountSessions, setAccountSessions] = useState({})
  const [backendSessionsByRole, setBackendSessionsByRole] = useState({ customer: [], owner: [], staff: [], admin: [] })
  const [sessionMeta, setSessionMeta] = useState(storedDemoAuthState.sessionMeta)
  const [accountAccess, setAccountAccess] = useState({
    staffQueue: { total: 0, byStatus: {} },
    adminAnalytics: { activeShops: 0, totalOrders: 0, totalRevenue: 0, avgOrderValue: 0 },
    adminShops: [],
    adminTeam: [],
  })
  const [authCheck, setAuthCheck] = useState({ status: 'idle', detail: '', denied: '' })
  const [favoriteDesignIds, setFavoriteDesignIds] = useState([])
  const [lastSavedDesignId, setLastSavedDesignId] = useState('')
  const [builderSourceDesignId, setBuilderSourceDesignId] = useState('')
  const [ownerLocations, setOwnerLocations] = useState(defaultOwnerLocations)
  const [activeOwnerLocationId, setActiveOwnerLocationId] = useState(defaultOwnerLocations[0].id)
  const [selectedLocationIds, setSelectedLocationIds] = useState([defaultOwnerLocations[0].id])
  const [bulkApplyTemplateId, setBulkApplyTemplateId] = useState(bulkApplyTemplates[0].id)
  const [ownerTemplates, setOwnerTemplates] = useState([])
  const [ownerTemplateDraft, setOwnerTemplateDraft] = useState({ id: '', name: '', occasion: '', defaultMode: 'simple', maxLayers: 1, allowedCakeTypes: [] })
  const [uiState, setUiState] = useState({ loading: true, error: '', message: '', saving: false, submitting: false, updating: false, reorderingId: '', authUpdating: false, apiBaseUrl: '' })
  const googleAuthEnabled = true
  const backendRequiredForActions = HAS_REMOTE_API || typeof window === 'undefined' || window.location.hostname === 'localhost'
  const customerVisibleError = view === 'builder' || view === 'home' ? '' : uiState.error
  const ownerOrderIdRef = useRef('')

  useEffect(() => {
    if (!supabase || !googleAuthEnabled) return

    supabase.auth.getSession().then(({ data }) => {
      const session = data.session
      if (!session?.user) return
      setAuthTokens((current) => ({ ...current, customer: `supabase:${session.access_token}` }))
      setAccountSessions((current) => ({
        ...current,
        customer: {
          name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || DEFAULT_CUSTOMER_NAME,
          email: session.user.email || DEMO_USERS.customer.email,
          role: 'customer',
        },
      }))
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setAuthTokens((current) => ({ ...current, customer: `supabase:${session.access_token}` }))
        setAccountSessions((current) => ({
          ...current,
          customer: {
            name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || DEFAULT_CUSTOMER_NAME,
            email: session.user.email || DEMO_USERS.customer.email,
            role: 'customer',
          },
        }))
        return
      }

      setAuthTokens((current) => ({ ...current, customer: '' }))
      setAccountSessions((current) => ({ ...current, customer: null }))
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const active = layers[activeLayer]
  const visibleLayers = useMemo(() => layers.slice().reverse(), [layers])
  const activeMode = modeRules[mode]
  const availableCakeTypes = cakeTypes.filter((type) => activeMode.cakeTypes.includes(type.id))
  const editableFields = activeMode.fields
  const previewTitle = `${occasion} · ${cakeTypes.find((x) => x.id === cakeType)?.label || ''}`
  const selectedBakery = ownerLocations.find((location) => location.id === customerShopId) || ownerLocations[0] || null
  const customerShopLabel = selectedBakery?.name || customerShopOptions.find((location) => location.id === customerShopId)?.name || customerShopId
  const selectedBakeryCapability = selectedBakery?.capability || { presetsOnly: false, presetsCustomizable: false, fullCustom: true }
  const selectedBakeryPresets = fakeBakeryPresets[customerShopId] || []
  const totalPrice = useMemo(() => {
    const typePrice = cakeTypes.find((type) => type.id === cakeType)?.basePrice || 0
    const layerPrice = layers.reduce((sum, layer) => {
      return sum + lookupPrice('bread', layer.bread) + lookupPrice('sugar', layer.sugar) + lookupPrice('cream', layer.cream) + lookupPrice('flavor', layer.flavor)
    }, 0)
    return typePrice + layerCount * 8 + layerPrice
  }, [cakeType, layerCount, layers])

  const selectedBakeryMenuItems = [
    ...selectedBakeryPresets.map((preset, index) => ({
      ...preset,
      type: 'preset',
      image: ['Berry cream finish', 'Chocolate ganache', 'Vanilla floral'][index % 3],
      description: preset.detail,
    })),
    ...(selectedBakeryCapability.fullCustom ? [{
      id: `${customerShopId}-custom-cake`,
      title: 'Custom Cake',
      detail: 'Build your cake layer by layer with full control.',
      description: 'Choose occasion, size, layers, flavors, and finishing details.',
      price: totalPrice,
      type: 'custom',
      image: 'Custom design preview',
    }] : []),
  ]

  const activeAccountSession = accountSessions[accountType]
  const sessionEntries = useMemo(() => ([
    {
      role: 'customer',
      label: 'Customer session',
      state: authTokens.customer ? 'Connected' : 'Signed out',
      identity: accountSessions.customer?.name || DEFAULT_CUSTOMER_NAME,
      detail: roleSessionDescriptions.customer,
      email: accountSessions.customer?.email || DEMO_USERS.customer.email,
      actionLabel: authTokens.customer ? 'Sign out' : 'Reconnect',
      meta: sessionMeta.customer,
      backendSessions: backendSessionsByRole.customer,
    },
    {
      role: 'owner',
      label: 'Owner workspace',
      state: authTokens.owner ? 'Connected' : 'Signed out',
      identity: accountSessions.owner?.name || DEMO_USERS.owner.name,
      detail: roleSessionDescriptions.owner,
      email: accountSessions.owner?.email || DEMO_USERS.owner.email,
      actionLabel: authTokens.owner ? 'Sign out' : 'Reconnect',
      meta: sessionMeta.owner,
      backendSessions: backendSessionsByRole.owner,
    },
    {
      role: 'staff',
      label: 'Staff queue',
      state: authTokens.staff ? 'Connected' : 'Signed out',
      identity: accountSessions.staff?.name || DEMO_USERS.staff.name,
      detail: roleSessionDescriptions.staff,
      email: accountSessions.staff?.email || DEMO_USERS.staff.email,
      actionLabel: authTokens.staff ? 'Sign out' : 'Reconnect',
      meta: sessionMeta.staff,
      backendSessions: backendSessionsByRole.staff,
    },
    {
      role: 'admin',
      label: 'Platform admin',
      state: authTokens.admin ? 'Connected' : 'Signed out',
      identity: accountSessions.admin?.name || DEMO_USERS.admin.name,
      detail: roleSessionDescriptions.admin,
      email: accountSessions.admin?.email || DEMO_USERS.admin.email,
      actionLabel: authTokens.admin ? 'Sign out' : 'Reconnect',
      meta: sessionMeta.admin,
      backendSessions: backendSessionsByRole.admin,
    },
  ]), [accountSessions.admin, accountSessions.customer, accountSessions.owner, accountSessions.staff, authTokens.admin, authTokens.customer, authTokens.owner, authTokens.staff, backendSessionsByRole.admin, backendSessionsByRole.customer, backendSessionsByRole.owner, backendSessionsByRole.staff, sessionMeta.admin, sessionMeta.customer, sessionMeta.owner, sessionMeta.staff])
  const connectedSessionCount = sessionEntries.filter((entry) => entry.state === 'Connected').length
  const selectedLocationNames = ownerLocations.filter((location) => selectedLocationIds.includes(location.id)).map((location) => location.name)
  const activeOwnerLocation = ownerLocations.find((location) => location.id === activeOwnerLocationId) || ownerLocations[0] || null
  const ownerScopeQuery = activeOwnerLocationId ? `?shopId=${activeOwnerLocationId}` : ''
  const activeOwnerTemplate = useMemo(() => (
    ownerTemplates.find((template) => template.shopId === activeOwnerLocationId) || ownerTemplates[0] || null
  ), [activeOwnerLocationId, ownerTemplates])
  const ownerStaffOptions = useMemo(() => {
    const scopedShopId = ownerOrder?.shopId || activeOwnerLocationId
    return ownerStaffByShop[scopedShopId] || ownerStaffByShop[DEFAULT_SHOP_ID] || []
  }, [activeOwnerLocationId, ownerOrder?.shopId])

  const ownerModules = useMemo(() => ([
    {
      title: 'Orders pipeline',
      metric: `${ownerSummary.total} active orders`,
      items: [
        `${ownerQueue.newOrders.length} new approvals`,
        `${ownerQueue.inProduction.length} baking / decorating`,
        `${ownerQueue.ready.length} ready for pickup`,
        `${ownerQueue.pickedUp.length} picked up`,
        `${ownerQueue.cancelled.length} cancelled / refund follow-up`,
      ],
    },
    {
      title: 'Builder settings',
      metric: 'Templates live',
      items: ['Occasion presets', 'Layer limits by shop', 'Pricing controls', 'Premium upsell rules'],
    },
    {
      title: 'Customers',
      metric: `${savedDesigns.length} saved designs`,
      items: ['Saved designs', 'Favorites', 'Gift orders', 'High-value customers'],
    },
    {
      title: 'Billing',
      metric: 'Growth plan',
      items: ['Subscription status healthy', 'Commission tracking', 'Payout summary', 'Invoice history'],
    },
  ]), [ownerQueue, ownerSummary.total, savedDesigns.length])

  const queueSections = useMemo(() => ([
    { title: 'New', items: ownerQueue.newOrders },
    { title: 'In production', items: ownerQueue.inProduction },
    { title: 'Ready', items: ownerQueue.ready },
    { title: 'Picked up', items: ownerQueue.pickedUp },
    { title: 'Cancelled', items: ownerQueue.cancelled },
  ]), [ownerQueue])

  const workflowStages = orderStatuses.length ? orderStatuses.map((item) => formatStatus(item)) : ['New', 'Confirmed', 'Baking', 'Decorating', 'Ready', 'Picked up']

  const orderActions = orderStatuses.filter((status) => !['new', 'picked_up'].includes(status)).map((status) => ({
    label: getOrderActionLabel(status),
    status,
  }))

  const ownerQueueItems = useMemo(() => (
    queueSections.flatMap((section) => section.items.map((item) => ({ ...item, queueSection: section.title })))
  ), [queueSections])

  const queueHealth = useMemo(() => {
    const exceptions = ownerQueueItems.filter((item) => getExceptionLabel(item))
    const readyWithoutPickup = ownerQueueItems.filter((item) => item.status === 'ready' && !item.pickupSlot?.label)
    return {
      exceptions,
      readyWithoutPickup,
      needsAttention: ownerQueue.newOrders.length + exceptions.length,
    }
  }, [ownerQueue.newOrders.length, ownerQueueItems])

  const selectedOrderException = ownerOrder ? getExceptionLabel(ownerOrder) : ''
  const selectedOrderNotifications = notifications.slice(0, 3)
  const sortedOwnerPickupSlots = useMemo(() => (
    ownerPickupSlots.slice().sort((left, right) => ((right.capacity - right.booked) - (left.capacity - left.booked)) || left.label.localeCompare(right.label))
  ), [ownerPickupSlots])

  const latestCustomerOrder = useMemo(() => (
    customerOrders.slice().sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0))[0] || null
  ), [customerOrders])
  const sortedSavedDesigns = useMemo(() => (
    savedDesigns
      .slice()
      .sort((left, right) => {
        const leftFavorite = favoriteDesignIds.includes(left.id) || left.isFavorite
        const rightFavorite = favoriteDesignIds.includes(right.id) || right.isFavorite
        if (leftFavorite !== rightFavorite) return Number(rightFavorite) - Number(leftFavorite)
        if (left.id === lastSavedDesignId) return -1
        if (right.id === lastSavedDesignId) return 1
        return new Date(right.lastUsedAt || 0) - new Date(left.lastUsedAt || 0)
      })
  ), [favoriteDesignIds, lastSavedDesignId, savedDesigns])
  const customerOrderSummary = latestCustomerOrder
    ? `${formatStatus(latestCustomerOrder.status)}${latestCustomerOrder.pickupSlot?.label ? ` · ${latestCustomerOrder.pickupSlot.label}` : ''}`
    : 'No live order yet'
  const cartItemCount = cart.length
  const cartSubtotal = cart.reduce((sum, item) => sum + (item.totalPrice || 0), 0)
  const deliveryFee = cartSubtotal > 0 && fulfillmentType === 'delivery' ? 7.99 : 0
  const serviceFee = cartSubtotal > 0 ? 2.49 : 0
  const gstHst = Number(((cartSubtotal + deliveryFee + serviceFee) * 0.05).toFixed(2))
  const checkoutTotal = Number((cartSubtotal + deliveryFee + serviceFee + gstHst).toFixed(2))
  const cartGroups = ownerLocations.map((location) => ({
    shopId: location.id,
    shopName: location.name,
    items: cart.filter((item) => item.shopId === location.id),
  })).filter((group) => group.items.length)
  const activeCartGroup = cartGroups.find((group) => group.shopId === selectedCartShopId) || cartGroups[0] || null
  const activeCheckoutItem = activeCartGroup?.items?.[activeCartGroup.items.length - 1] || cart[cart.length - 1] || null
  const activeCheckoutSavedDesign = activeCheckoutItem?.savedDesignId
    ? savedDesigns.find((design) => design.id === activeCheckoutItem.savedDesignId) || null
    : null
  const checkoutShopId = activeCheckoutItem?.shopId || activeCheckoutSavedDesign?.shopId || DEFAULT_SHOP_ID
  const checkoutShopLabel = ownerLocations.find((location) => location.id === checkoutShopId)?.name || checkoutShopId
  const checkoutPickupSlots = useMemo(() => pickupSlots.filter((slot) => slot.shopId === checkoutShopId), [checkoutShopId, pickupSlots])
  const sortedPickupSlots = useMemo(() => (
    checkoutPickupSlots
      .slice()
      .sort((left, right) => {
        const leftState = getPickupSlotState(left)
        const rightState = getPickupSlotState(right)
        if (leftState.selectable !== rightState.selectable) return Number(rightState.selectable) - Number(leftState.selectable)
        const leftRemaining = left.capacity - left.booked
        const rightRemaining = right.capacity - right.booked
        if (leftRemaining === rightRemaining) return new Date(left.startTime || 0) - new Date(right.startTime || 0)
        return rightRemaining - leftRemaining
      })
  ), [checkoutPickupSlots])

  const selectedPickupSlot = sortedPickupSlots.find((slot) => slot.id === pickupSlotId)
  const recommendedPickupSlot = sortedPickupSlots.find((slot) => getPickupSlotState(slot).selectable) || null
  const selectedPickupRemaining = selectedPickupSlot ? selectedPickupSlot.capacity - selectedPickupSlot.booked : 0
  const selectedAddress = customerProfile.addresses.find((address) => address.id === selectedAddressId) || customerProfile.addresses[0] || null
  const liveMapStops = fulfillmentType === 'delivery'
    ? [
        { id: 'bakery', label: activeCartGroup?.shopName || checkoutShopLabel, detail: 'Restaurant / bakery', side: 'left' },
        { id: 'route', label: 'Courier route', detail: 'Live delivery path', side: 'center' },
        { id: 'customer', label: customerProfile.fullName || 'Customer', detail: selectedAddress?.line1 || 'Customer address', side: 'right' },
      ]
    : [
        { id: 'bakery', label: activeCartGroup?.shopName || checkoutShopLabel, detail: 'Bakery location', side: 'left' },
        { id: 'pickup', label: selectedPickupSlot?.label ? formatPickupWindow(selectedPickupSlot) : 'Pickup point', detail: 'Order handoff', side: 'center' },
        { id: 'customer', label: customerProfile.fullName || 'Customer', detail: 'Current customer location', side: 'right' },
      ]
  const customerSessionLabel = authTokens.customer ? `${accountSessions.customer?.name || formatRoleLabel('customer')} connected` : 'Customer session required'
  const mainTabs = [
    { id: 'home', label: 'All Stores' },
    { id: 'builder', label: 'Build' },
    { id: 'saved', label: cartItemCount ? `Orders (${cartItemCount})` : 'Orders' },
    { id: 'accounts', label: 'Profile' },
  ]
  const builderSteps = [
    { id: 'occasion', label: 'Occasion' },
    { id: 'location', label: 'Location' },
    { id: 'style', label: 'Style' },
    { id: 'flavor', label: 'Layers' },
    { id: 'review', label: 'Review' },
  ]
  const builderStepIndex = builderSteps.findIndex((step) => step.id === builderStep)
  const stepCompletion = {
    occasion: Boolean(occasion),
    location: Boolean(customerShopId),
    style: Boolean(mode && cakeType && layerCount),
    flavor: editableFields.every((field) => Boolean(active?.[field])),
    review: Boolean(occasion && customerShopId && cakeType && layerCount && editableFields.every((field) => Boolean(active?.[field]))),
  }
  const currentBuilderStepLabel = builderSteps[builderStepIndex]?.label || 'Build'
  const builderStepSummaries = {
    occasion: occasion,
    location: customerShopLabel,
    style: `${mode === 'advanced' ? 'Advanced' : 'Simple'} · ${cakeTypes.find((type) => type.id === cakeType)?.label} · ${layerCount} layers`,
    flavor: `${active?.bread || 'Base'} · ${active?.flavor || 'Flavor'} · ${active?.sugar || 'Sugar level'}`,
    review: stepCompletion.review ? 'Ready' : 'Incomplete',
  }
  const checkoutBlockers = [
    !authTokens.customer ? 'Reconnect the customer demo session' : null,
    !cart.length ? 'Add a cake to the cart' : null,
    fulfillmentType === 'pickup' && !selectedPickupSlot ? 'Choose a pickup slot' : null,
    fulfillmentType === 'pickup' && selectedPickupSlot && !getPickupSlotState(selectedPickupSlot).selectable ? 'Choose an available pickup slot that is not full, paused, or expired' : null,
    fulfillmentType === 'pickup' && selectedPickupSlot && selectedPickupRemaining <= 0 ? 'Choose a slot with remaining capacity' : null,
    fulfillmentType === 'delivery' && !selectedAddress?.line1 ? 'Choose a delivery address' : null,
  ].filter(Boolean)
  const checkoutReady = checkoutBlockers.length === 0
  const checkoutNextStep = !authTokens.customer
    ? 'Continue to enter your details.'
    : !cart.length
      ? 'Add a cake to the cart to continue.'
      : !selectedPickupSlot
        ? 'Choose a pickup time.'
        : !checkoutReady
          ? 'Finish the remaining checkout step.'
          : 'Buy now.'

  const hydrateData = useCallback(async (tokens, { preserveMessage = true } = {}) => {
    setUiState((current) => ({ ...current, loading: true, error: preserveMessage ? current.error : '', message: preserveMessage ? current.message : '' }))
    try {
      const ownerHeaders = tokens.owner ? { Authorization: `Bearer ${tokens.owner}` } : null
      const customerHeaders = tokens.customer ? { Authorization: `Bearer ${tokens.customer}` } : null
      const staffHeaders = tokens.staff ? { Authorization: `Bearer ${tokens.staff}` } : null
      const adminHeaders = tokens.admin ? { Authorization: `Bearer ${tokens.admin}` } : null
      const [slotData, ownerSlotData, ownerLocationData, ownerTemplateData, designData, orderData, summaryData, queueData, statusData, customerSession, ownerSession, staffSession, adminSession, customerSessionList, ownerSessionList, staffSessionList, adminSessionList, staffQueueSummary, adminAnalytics, adminShops, adminTeam, disputeData] = await Promise.all([
        apiFetch('/api/pickup-slots'),
        ownerHeaders ? apiFetch(`/api/owner/pickup-slots${ownerScopeQuery}`, { headers: ownerHeaders }) : Promise.resolve([]),
        ownerHeaders ? apiFetch('/api/owner/locations', { headers: ownerHeaders }) : Promise.resolve([]),
        ownerHeaders ? apiFetch('/api/owner/templates', { headers: ownerHeaders }) : Promise.resolve([]),
        customerHeaders ? apiFetch('/api/designs', { headers: customerHeaders }) : Promise.resolve([]),
        customerHeaders ? apiFetch('/api/orders/me', { headers: customerHeaders }) : Promise.resolve([]),
        ownerHeaders ? apiFetch(`/api/owner/orders/summary${ownerScopeQuery}`, { headers: ownerHeaders }) : Promise.resolve({ total: 0, byStatus: {} }),
        ownerHeaders ? apiFetch(`/api/owner/queue${ownerScopeQuery}`, { headers: ownerHeaders }) : Promise.resolve({ newOrders: [], inProduction: [], ready: [], pickedUp: [], cancelled: [] }),
        apiFetch('/api/meta/order-statuses'),
        customerHeaders ? apiFetch('/api/auth/me', { headers: customerHeaders }) : Promise.resolve({ user: null }),
        ownerHeaders ? apiFetch('/api/auth/me', { headers: ownerHeaders }) : Promise.resolve({ user: null }),
        staffHeaders ? apiFetch('/api/auth/me', { headers: staffHeaders }) : Promise.resolve({ user: null }),
        adminHeaders ? apiFetch('/api/auth/me', { headers: adminHeaders }) : Promise.resolve({ user: null }),
        customerHeaders ? apiFetch('/api/auth/sessions', { headers: customerHeaders }) : Promise.resolve({ sessions: [] }),
        customerHeaders ? apiFetch('/api/profile', { headers: customerHeaders }) : Promise.resolve(null),
        ownerHeaders ? apiFetch('/api/auth/sessions', { headers: ownerHeaders }) : Promise.resolve({ sessions: [] }),
        staffHeaders ? apiFetch('/api/auth/sessions', { headers: staffHeaders }) : Promise.resolve({ sessions: [] }),
        adminHeaders ? apiFetch('/api/auth/sessions', { headers: adminHeaders }) : Promise.resolve({ sessions: [] }),
        staffHeaders ? apiFetch('/api/owner/orders/summary', { headers: staffHeaders }) : Promise.resolve({ total: 0, byStatus: {} }),
        adminHeaders ? apiFetch('/api/admin/analytics', { headers: adminHeaders }) : Promise.resolve({ activeShops: 0, totalOrders: 0, totalRevenue: 0, avgOrderValue: 0 }),
        adminHeaders ? apiFetch('/api/admin/shops', { headers: adminHeaders }) : Promise.resolve([]),
        adminHeaders ? apiFetch('/api/admin/team', { headers: adminHeaders }) : Promise.resolve([]),
        adminHeaders ? apiFetch('/api/admin/disputes', { headers: adminHeaders }) : Promise.resolve([]),
      ])

      const activeSlots = slotData
      const queueItems = [...queueData.newOrders, ...queueData.inProduction, ...queueData.ready, ...queueData.pickedUp, ...(queueData.cancelled || [])]
      const preferredOrder = queueItems.find((item) => item.id === ownerOrderIdRef.current) || queueItems[0] || null
      const latestOrder = orderData.slice().sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0))[0] || null
      const [notificationData, customerNotificationData] = await Promise.all([
        preferredOrder ? apiFetch(`/api/notifications?orderId=${preferredOrder.id}`) : Promise.resolve([]),
        latestOrder ? apiFetch(`/api/notifications?orderId=${latestOrder.id}`) : Promise.resolve([]),
      ])

      setPickupSlots(activeSlots)
      setPickupSlotId((current) => {
        const existing = activeSlots.find((slot) => slot.id === current && getPickupSlotState(slot).selectable)
        if (existing) return existing.id
        return activeSlots.find((slot) => getPickupSlotState(slot).selectable)?.id || activeSlots[0]?.id || ''
      })
      const normalizedLocations = ownerLocationData.map((shop) => ({
        id: shop.id,
        name: shop.location || shop.name,
        status: shop.lastBulkTemplateKey ? `Last sync ${formatTemplateLabel(shop.lastBulkTemplateKey)}` : `${shop.plan} plan`,
        team: shop.teamSize || 0,
        lastBulkTemplateKey: shop.lastBulkTemplateKey || '',
        lastBulkAppliedAt: shop.lastBulkAppliedAt || '',
      }))

      setOwnerLocations(normalizedLocations.length ? normalizedLocations : defaultOwnerLocations)
      setActiveOwnerLocationId((current) => {
        const availableIds = new Set((normalizedLocations.length ? normalizedLocations : defaultOwnerLocations).map((location) => location.id))
        return availableIds.has(current) ? current : Array.from(availableIds)[0]
      })
      setSelectedLocationIds((current) => {
        const availableIds = new Set((normalizedLocations.length ? normalizedLocations : defaultOwnerLocations).map((location) => location.id))
        const kept = current.filter((id) => availableIds.has(id))
        return kept.length ? kept : [Array.from(availableIds)[0]]
      })
      setOwnerTemplates(ownerTemplateData)
      setSavedDesigns(designData)
      setFavoriteDesignIds(designData.filter((design) => design.isFavorite).map((design) => design.id))
      setCustomerOrders(orderData)
      setCustomerNotifications(customerNotificationData)
      const customerProfileData = customerHeaders ? await apiFetch('/api/profile', { headers: customerHeaders }) : null
      if (customerProfileData) {
        setCustomerProfile({
          fullName: customerProfileData.fullName || customerSession.user?.name || DEFAULT_CUSTOMER_NAME,
          email: customerProfileData.email || customerSession.user?.email || DEMO_USERS.customer.email,
          addresses: customerProfileData.addresses || [],
          cards: customerProfileData.cards || [],
        })
        setSelectedAddressId(customerProfileData.preferredAddressId || customerProfileData.addresses?.[0]?.id || '')
      } else if (customerSession.user) {
        setCustomerProfile((current) => ({
          ...current,
          fullName: customerSession.user.name || current.fullName,
          email: customerSession.user.email || current.email,
        }))
      }
      setOwnerSummary(summaryData)
      setOwnerQueue(queueData)
      setOwnerPickupSlots(ownerSlotData)
      setOwnerOrder(preferredOrder)
      setOwnerOrderId(preferredOrder?.id || '')
      setOwnerOpsDraft({ notes: preferredOrder?.notes || '', pickupSlotId: preferredOrder?.pickupSlotId || '', assignedStaffId: preferredOrder?.assignedStaffId || '' })
      setSelectedOrderStatus(preferredOrder?.status || statusData[1] || statusData[0] || 'ready')
      setOrderStatuses(statusData)
      setNotifications(notificationData)
      setPickupSlotDrafts(Object.fromEntries(ownerSlotData.map((slot) => [slot.id, { capacity: slot.capacity, active: slot.active }])))
      setAdminDisputes(disputeData)
      setAdminAssignmentDrafts(Object.fromEntries(disputeData.map((dispute) => [dispute.id, dispute.assignedAdminId || ''])))
      setAccountSessions({
        customer: customerSession.user,
        owner: ownerSession.user,
        staff: staffSession.user,
        admin: adminSession.user,
      })
      setBackendSessionsByRole({
        customer: customerSessionList.sessions || [],
        owner: ownerSessionList.sessions || [],
        staff: staffSessionList.sessions || [],
        admin: adminSessionList.sessions || [],
      })
      const verifiedAt = new Date().toISOString()
      setSessionMeta((current) => {
        const next = { ...current }
        Object.entries(tokens).forEach(([role, token]) => {
          if (!token) return
          next[role] = {
            ...current[role],
            ...createSessionMetaPatch({
              state: 'connected',
              signedInAt: current[role]?.signedInAt || verifiedAt,
              lastVerifiedAt: verifiedAt,
            }),
          }
        })
        return next
      })
      setAccountAccess({
        staffQueue: staffQueueSummary,
        adminAnalytics,
        adminShops,
        adminTeam,
      })
      const baseUrl = await resolveApiBase()
      setUiState((current) => ({ ...current, loading: false, error: '', apiBaseUrl: baseUrl }))
    } catch (error) {
      setUiState((current) => ({ ...current, loading: false, error: view === 'builder' ? '' : (error.message || 'Failed to load live backend data.') }))
    }
  }, [ownerScopeQuery])

  useEffect(() => {
    ownerOrderIdRef.current = ownerOrderId
  }, [ownerOrderId])

  useEffect(() => {
    if (activeOwnerTemplate) {
      setOwnerTemplateDraft({
        id: activeOwnerTemplate.id,
        name: activeOwnerTemplate.name || '',
        occasion: activeOwnerTemplate.occasion || '',
        defaultMode: activeOwnerTemplate.defaultMode || 'simple',
        maxLayers: activeOwnerTemplate.maxLayers || 1,
        allowedCakeTypes: activeOwnerTemplate.allowedCakeTypes || [],
      })
    }
  }, [activeOwnerTemplate])

  useEffect(() => {
    if (!ownerOrderId || !authTokens.owner) return

    async function loadOwnerOrder() {
      try {
        const [detail, notificationData] = await Promise.all([
          apiFetch(`/api/owner/orders/${ownerOrderId}`, { headers: { Authorization: `Bearer ${authTokens.owner}` } }),
          apiFetch(`/api/notifications?orderId=${ownerOrderId}`),
        ])
        setOwnerOrder(detail)
        setOwnerOpsDraft({ notes: detail.notes || '', pickupSlotId: detail.pickupSlotId || '', assignedStaffId: detail.assignedStaffId || '' })
        setSelectedOrderStatus(detail.status)
        setNotifications(notificationData)
      } catch (error) {
        setUiState((current) => ({ ...current, error: error.message || 'Failed to load selected owner order.' }))
      }
    }

    loadOwnerOrder()
  }, [authTokens.owner, ownerOrderId])

  useEffect(() => {
    if (!authTokens.owner) return
    hydrateData(authTokens, { preserveMessage: true })
  }, [activeOwnerLocationId, authTokens, hydrateData])

  const signInDemoRole = useCallback(async (role, { message, refresh = true } = {}) => {
    if (!backendRequiredForActions) {
      const offlineUser = { ...DEMO_USERS[role] }
      const nextTokens = { ...authTokens, [role]: `offline-demo:${role}` }
      const nextSessions = { ...accountSessions, [role]: offlineUser }
      setAuthTokens(nextTokens)
      setAccountSessions(nextSessions)
      setDesiredDemoRoles((current) => ({ ...current, [role]: true }))
      setSessionMeta((current) => ({
        ...current,
        [role]: {
          ...current[role],
          ...createSessionMetaPatch({
            state: 'connected',
            signedInAt: current[role]?.signedInAt || new Date().toISOString(),
          }),
        },
      }))
      setCustomerProfile((current) => ({
        ...current,
        fullName: offlineUser.name || current.fullName,
        email: offlineUser.email || current.email,
      }))
      setUiState((current) => ({ ...current, authUpdating: false, error: '', message: message || 'Signed in to demo mode. Live backend is not connected yet.' }))
      return { tokens: nextTokens, user: offlineUser }
    }

    const response = await apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify(DEMO_USERS[role]) })
    const nextTokens = { ...authTokens, [role]: response.token }
    const nextSessions = { ...accountSessions, [role]: response.user }
    setAuthTokens(nextTokens)
    setAccountSessions(nextSessions)
    setDesiredDemoRoles((current) => ({ ...current, [role]: true }))
    setSessionMeta((current) => ({
      ...current,
      [role]: {
        ...current[role],
        ...createSessionMetaPatch({
          state: 'connected',
          signedInAt: current[role]?.signedInAt || new Date().toISOString(),
        }),
      },
    }))
    if (refresh) {
      await hydrateData(nextTokens, { preserveMessage: false })
    }
    if (message) {
      setUiState((current) => ({ ...current, error: '', message }))
    }
    return { tokens: nextTokens, user: response.user }
  }, [accountSessions, authTokens, backendRequiredForActions, hydrateData])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(DEMO_AUTH_STORAGE_KEY, JSON.stringify({
      desiredRoles: desiredDemoRoles,
      sessionMeta,
    }))
  }, [desiredDemoRoles, sessionMeta])

  useEffect(() => {
    async function bootstrap() {
      setUiState((current) => ({ ...current, loading: true, error: '', message: '' }))
      try {
        const roleOrder = ['customer', 'owner', 'staff', 'admin']
        const loginResults = await Promise.all(roleOrder.map(async (role) => {
          if (!desiredDemoRoles[role]) return [role, null]
          if (!backendRequiredForActions) {
            return [role, { token: `offline-demo:${role}`, user: { ...DEMO_USERS[role] } }]
          }
          const auth = await apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify(DEMO_USERS[role]) })
          return [role, auth]
        }))
        const tokens = { customer: '', owner: '', staff: '', admin: '' }
        const sessions = {}
        loginResults.forEach(([role, auth]) => {
          if (!auth) return
          tokens[role] = auth.token
          sessions[role] = auth.user
        })
        setAuthTokens(tokens)
        setAccountSessions(sessions)
        setSessionMeta((current) => {
          const next = { ...current }
          roleOrder.forEach((role) => {
            if (!desiredDemoRoles[role]) {
              next[role] = {
                ...next[role],
                ...createSessionMetaPatch({ state: 'signed_out' }),
              }
              return
            }

            next[role] = {
              ...next[role],
              ...createSessionMetaPatch({
                state: 'connected',
                signedInAt: next[role]?.signedInAt || new Date().toISOString(),
              }),
            }
          })
          return next
        })
        await hydrateData(tokens, { preserveMessage: false })
      } catch (error) {
        setUiState((current) => ({ ...current, loading: false, error: error.message || 'Failed to connect to backend.' }))
      }
    }

    bootstrap()
  }, [desiredDemoRoles, hydrateData])

  const enforceMode = (nextMode, nextCakeType = cakeType, nextLayerCount = layerCount) => {
    const rules = modeRules[nextMode]
    const safeCakeType = rules.cakeTypes.includes(nextCakeType) ? nextCakeType : rules.cakeTypes[0]
    const safeLayerCount = clampLayerCount(nextLayerCount, rules)

    setMode(nextMode)
    setCakeType(safeCakeType)
    setLayerCount(safeLayerCount)
    setLayers(buildLayerSet({ count: safeLayerCount, occasion, mode: nextMode, existingLayers: layers, preserveOccasionTaste: true }))
    setActiveLayer((current) => Math.min(current, safeLayerCount - 1))
  }

  const applyOccasion = (nextOccasion) => {
    const config = occasionConfigs[nextOccasion]
    const rules = modeRules[config.mode]
    const safeCakeType = rules.cakeTypes.includes(config.cakeType) ? config.cakeType : rules.cakeTypes[0]
    const safeLayerCount = clampLayerCount(config.layers, rules)

    setOccasion(nextOccasion)
    setMode(config.mode)
    setCakeType(safeCakeType)
    setLayerCount(safeLayerCount)
    setLayers(buildLayerSet({ count: safeLayerCount, occasion: nextOccasion, mode: config.mode, existingLayers: layers }))
    setActiveLayer((current) => Math.min(current, safeLayerCount - 1))
  }

  const advanceBuilderStep = () => {
    setBuilderStep((current) => {
      const index = builderSteps.findIndex((step) => step.id === current)
      if (index === -1 || index === builderSteps.length - 1) return current
      return builderSteps[index + 1].id
    })
  }

  const goToPreviousBuilderStep = () => {
    setBuilderStep((current) => {
      const index = builderSteps.findIndex((step) => step.id === current)
      if (index <= 0) return current
      return builderSteps[index - 1].id
    })
  }

  const updateLayerCount = (count) => {
    const rules = modeRules[mode]
    const safeCount = clampLayerCount(count, rules)
    setLayerCount(safeCount)
    setLayers(buildLayerSet({ count: safeCount, occasion, mode, existingLayers: layers, preserveOccasionTaste: true }))
    setActiveLayer((current) => Math.min(current, safeCount - 1))
  }

  const updateLayerField = (field, value, layerIndex = activeLayer) => {
    setLayers((current) => current.map((layer, index) => (index === layerIndex ? { ...layer, [field]: value } : layer)))
  }

  const applyActiveLayerToAll = () => {
    setLayers((current) => current.map((layer, index) => {
      const nextLayer = { ...layer }
      editableFields.forEach((field) => {
        nextLayer[field] = current[activeLayer][field]
      })
      nextLayer.id = index
      nextLayer.name = `Layer ${index + 1}`
      return nextLayer
    }))
    setUiState((current) => ({ ...current, message: `${active.name} settings applied across all layers.`, error: '' }))
  }

  const resetActiveLayerToPreset = () => {
    const presetLayer = makeLayers(layerCount, occasion)[activeLayer]
    setLayers((current) => current.map((layer) => {
      if (layer.id !== activeLayer) return layer

      const nextLayer = { ...layer }
      editableFields.forEach((field) => {
        nextLayer[field] = presetLayer[field]
      })
      return nextLayer
    }))
    setUiState((current) => ({ ...current, message: `${active.name} reset to the ${occasion} preset.`, error: '' }))
  }

  const addToCart = () => {
    const item = {
      id: Date.now(),
      title: previewTitle,
      layerCount,
      unitPrice: totalPrice,
      quantity: 1,
      totalPrice,
      shopId: customerShopId,
      savedDesignId: builderSourceDesignId || null,
      config: { occasion, mode, cakeType, layerCount, layers },
    }
    setCart((current) => [...current, item])
    setBuilderStep('review')
    setView('checkout')
    setUiState((current) => ({ ...current, message: 'Cake added to cart.', error: '' }))
  }

  const addPresetMenuItemToCart = (menuItem) => {
    const item = {
      id: Date.now(),
      title: menuItem.title,
      layerCount: 1,
      unitPrice: menuItem.price,
      quantity: 1,
      totalPrice: menuItem.price,
      shopId: customerShopId,
      savedDesignId: null,
      config: {
        occasion,
        mode: selectedBakeryCapability.presetsCustomizable ? 'simple' : 'preset',
        cakeType,
        layerCount: 1,
        layers: [{
          id: 0,
          name: 'Preset cake',
          bread: active?.bread || optionSets.bread[0].label,
          sugar: active?.sugar || optionSets.sugar[0].label,
          cream: active?.cream || optionSets.cream[0].label,
          flavor: active?.flavor || optionSets.flavor[0].label,
        }],
      },
    }
    setCart((current) => [...current, item])
    setSelectedMenuItem(null)
    setBuilderScreen('store-menu')
    setView('saved')
    setUiState((current) => ({ ...current, message: `${menuItem.title} added to cart.`, error: '' }))
  }

  async function saveCurrentDesign() {
    setUiState((current) => ({ ...current, saving: true, error: '', message: '' }))
    try {
      const savedDesign = await apiFetch('/api/designs', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authTokens.customer}` },
        body: JSON.stringify({
          shopId: customerShopId,
          customerId: 'cust-1',
          title: previewTitle,
          summary: `${active.flavor} with ${active.cream}`,
          estimatedTotal: totalPrice,
          config: { occasion, mode, cakeType, layerCount, layers },
        }),
      })
      await hydrateData(authTokens, { preserveMessage: false })
      setLastSavedDesignId(savedDesign.id)
      setBuilderSourceDesignId(savedDesign.id)
      setView('saved')
      setUiState((current) => ({ ...current, saving: false, message: `Design saved to the backend for ${customerShopLabel}.` }))
    } catch (error) {
      setUiState((current) => ({ ...current, saving: false, error: getFriendlyError(error, 'Failed to save design.', 'Customer demo session') }))
    }
  }

  async function submitCartOrder() {
    if (!cart.length || !authTokens.customer) return

    const latest = cart[cart.length - 1]
    const savedCard = {
      id: `card-${Date.now()}`,
      brand: paymentCard.brand,
      last4: paymentCard.last4,
      name: paymentCard.name,
    }
    setUiState((current) => ({ ...current, submitting: true, error: '', message: '' }))
    try {
      if (!customerProfile.cards.some((card) => card.last4 === savedCard.last4 && card.brand === savedCard.brand)) {
        await apiFetch('/api/profile/cards', {
          method: 'POST',
          headers: { Authorization: `Bearer ${authTokens.customer}` },
          body: JSON.stringify(savedCard),
        })
      }

      const createdOrder = await apiFetch('/api/orders', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authTokens.customer}` },
        body: JSON.stringify({
          shopId: latest.shopId || DEFAULT_SHOP_ID,
          customer: customerProfile.fullName || DEFAULT_CUSTOMER_NAME,
          total: checkoutTotal,
          fulfillment: fulfillmentType,
          pickupSlotId: fulfillmentType === 'pickup' ? pickupSlotId : null,
          addressSnapshot: fulfillmentType === 'delivery' ? selectedAddress : null,
          paymentMethodSnapshot: savedCard,
          fees: {
            subtotal: cartSubtotal,
            serviceFee,
            deliveryFee,
            tax: gstHst,
            total: checkoutTotal,
          },
          notes: latest.savedDesignId ? 'Placed from saved design checkout' : 'Placed from builder checkout',
          savedDesignId: latest.savedDesignId || undefined,
          designSnapshot: latest.config,
        }),
      })
      setLatestPlacedOrder({
        id: createdOrder?.id || `order-${Date.now()}`,
        total: checkoutTotal,
        pickupSlot: selectedPickupSlot,
        fulfillment: fulfillmentType,
        shopLabel: checkoutShopLabel,
        card: savedCard,
        address: selectedAddress,
        itemCount: cartItemCount,
        createdAt: new Date().toISOString(),
      })
      setCart([])
      await hydrateData(authTokens, { preserveMessage: false })
      setCheckoutStage('placed')
      setView('checkout')
      setUiState((current) => ({ ...current, submitting: false, message: fulfillmentType === 'delivery' ? 'Delivery order submitted and saved in the live queue.' : `Order submitted for ${selectedPickupSlot?.label || 'pickup'} and saved in the live queue.` }))
    } catch (error) {
      setUiState((current) => ({ ...current, submitting: false, error: getFriendlyError(error, 'Failed to create order.', 'Customer demo session') }))
    }
  }

  async function addProfileAddress() {
    if (!authTokens.customer || !addressDraft.label.trim() || !addressDraft.line1.trim()) return

    setUiState((current) => ({ ...current, updating: true, error: '', message: '' }))
    try {
      const updatedProfile = await apiFetch('/api/profile/addresses', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authTokens.customer}` },
        body: JSON.stringify({
          label: addressDraft.label.trim(),
          line1: addressDraft.line1.trim(),
          instructions: addressDraft.instructions.trim(),
        }),
      })
      setCustomerProfile((current) => ({ ...current, addresses: updatedProfile.addresses || [] }))
      setSelectedAddressId(updatedProfile.preferredAddressId || updatedProfile.addresses?.[0]?.id || '')
      setAddressDraft({ label: '', line1: '', instructions: '' })
      setUiState((current) => ({ ...current, updating: false, message: 'Address saved to your profile.' }))
    } catch (error) {
      setUiState((current) => ({ ...current, updating: false, error: getFriendlyError(error, 'Failed to save address.', 'Customer profile') }))
    }
  }

  async function addProfileCard() {
    if (!authTokens.customer || !cardDraft.name.trim() || cardDraft.last4.length !== 4) return

    setUiState((current) => ({ ...current, updating: true, error: '', message: '' }))
    try {
      const updatedProfile = await apiFetch('/api/profile/cards', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authTokens.customer}` },
        body: JSON.stringify({
          brand: cardDraft.brand,
          last4: cardDraft.last4,
          name: cardDraft.name.trim(),
        }),
      })
      setCustomerProfile((current) => ({ ...current, cards: updatedProfile.cards || [] }))
      setPaymentCard({ brand: cardDraft.brand, last4: cardDraft.last4, name: cardDraft.name.trim() })
      setCardDraft((current) => ({ ...current, last4: '' }))
      setUiState((current) => ({ ...current, updating: false, message: 'Card saved to your profile.' }))
    } catch (error) {
      setUiState((current) => ({ ...current, updating: false, error: getFriendlyError(error, 'Failed to save card.', 'Customer profile') }))
    }
  }

  async function reorderDesign(designId, estimatedTotal) {
    if (!pickupSlotId) return

    setUiState((current) => ({ ...current, reorderingId: designId, error: '', message: '' }))
    try {
      await apiFetch(`/api/designs/${designId}/reorder`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authTokens.customer}` },
        body: JSON.stringify({
          pickupSlotId,
          customer: DEFAULT_CUSTOMER_NAME,
          total: estimatedTotal || totalPrice,
          notes: 'Reordered from saved designs screen',
        }),
      })
      await hydrateData(authTokens, { preserveMessage: false })
      setView('saved')
      setUiState((current) => ({ ...current, reorderingId: '', message: `Reorder created for ${selectedPickupSlot?.label || 'pickup'} and pushed into the live queue.` }))
    } catch (error) {
      setUiState((current) => ({ ...current, reorderingId: '', error: getFriendlyError(error, 'Failed to reorder design.', 'Customer demo session') }))
    }
  }

  async function toggleFavoriteDesign(designId) {
    const isFavorite = !favoriteDesignIds.includes(designId)
    setUiState((current) => ({ ...current, updating: true, error: '', message: '' }))
    try {
      await apiFetch(`/api/designs/${designId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${authTokens.customer}` },
        body: JSON.stringify({ isFavorite }),
      })
      await hydrateData(authTokens, { preserveMessage: false })
      setUiState((current) => ({ ...current, updating: false, message: isFavorite ? 'Design favorited across sessions.' : 'Design removed from favorites.' }))
    } catch (error) {
      setUiState((current) => ({ ...current, updating: false, error: getFriendlyError(error, 'Failed to update favorite.', 'Customer demo session') }))
    }
  }

  function removeCartItem(itemId) {
    setCart((current) => current.filter((item) => item.id !== itemId))
    setUiState((current) => ({ ...current, error: '', message: 'Item removed from cart.' }))
  }

  function updateCartItemQuantity(itemId, delta) {
    setCart((current) => current.flatMap((item) => {
      if (item.id !== itemId) return [item]
      const nextQuantity = Math.max(0, (item.quantity || 1) + delta)
      if (nextQuantity === 0) return []
      return [{ ...item, quantity: nextQuantity, totalPrice: (item.unitPrice || item.totalPrice || 0) * nextQuantity }]
    }))
  }

  function openCartGroup(shopId) {
    setSelectedCartShopId(shopId)
    setCheckoutStage('summary')
    setView('checkout')
  }

  function addSavedDesignToCart(design) {
    const nextConfig = design.config || {}
    const nextLayerCount = nextConfig.layerCount || 1
    const item = {
      id: Date.now(),
      title: design.title,
      layerCount: nextLayerCount,
      unitPrice: design.estimatedTotal || totalPrice,
      quantity: 1,
      totalPrice: design.estimatedTotal || totalPrice,
      shopId: design.shopId || DEFAULT_SHOP_ID,
      savedDesignId: design.id,
      config: {
        occasion: nextConfig.occasion || occasion,
        mode: nextConfig.mode || mode,
        cakeType: nextConfig.cakeType || cakeType,
        layerCount: nextLayerCount,
        layers: nextConfig.layers || layers,
      },
    }
    setCart((current) => [...current, item])
    setView('checkout')
    setUiState((current) => ({ ...current, error: '', message: `${design.title} added to cart from saved designs.` }))
  }

  function loadSavedDesign(design) {
    setBuilderSourceDesignId(design.id)
    setCustomerShopId(design.shopId || DEFAULT_SHOP_ID)
    const nextConfig = design.config || {}
    const nextMode = nextConfig.mode || mode
    const rules = modeRules[nextMode]
    const nextOccasion = nextConfig.occasion || occasion
    const nextLayerCount = clampLayerCount(nextConfig.layerCount || 1, rules)
    const nextCakeType = rules.cakeTypes.includes(nextConfig.cakeType) ? nextConfig.cakeType : rules.cakeTypes[0]
    const nextLayers = buildLayerSet({ count: nextLayerCount, occasion: nextOccasion, mode: nextMode, existingLayers: nextConfig.layers || [] })

    setOccasion(nextOccasion)
    setMode(nextMode)
    setCakeType(nextCakeType)
    setLayerCount(nextLayerCount)
    setLayers(nextLayers)
    setActiveLayer(0)
    setView('builder')
    setUiState((current) => ({ ...current, message: `Loaded ${design.title} back into the builder.`, error: '' }))
  }

  function toggleLocationSelection(locationId) {
    setSelectedLocationIds((current) => {
      if (current.includes(locationId)) {
        if (current.length === 1) return current
        return current.filter((id) => id !== locationId)
      }

      return [...current, locationId]
    })
  }

  async function applyBulkTemplate() {
    const template = bulkApplyTemplates.find((item) => item.id === bulkApplyTemplateId)
    if (!selectedLocationIds.length) {
      setUiState((current) => ({ ...current, error: 'Select at least one location before applying changes.' }))
      return
    }

    setUiState((current) => ({ ...current, updating: true, error: '', message: '' }))
    try {
      const result = await apiFetch('/api/owner/location-bulk-apply', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authTokens.owner}` },
        body: JSON.stringify({ templateKey: bulkApplyTemplateId, shopIds: selectedLocationIds }),
      })
      await hydrateData(authTokens, { preserveMessage: false })
      const scope = result.updatedShops.length === ownerLocations.length ? 'all locations' : selectedLocationNames.join(', ')
      setUiState((current) => ({
        ...current,
        updating: false,
        error: '',
        message: `${template?.label || 'Template'} applied to ${scope}. ${result.updatedShops.length} location${result.updatedShops.length === 1 ? '' : 's'} updated.`,
      }))
    } catch (error) {
      setUiState((current) => ({ ...current, updating: false, error: getFriendlyError(error, 'Failed to apply location updates.', 'Owner demo session') }))
    }
  }

  async function saveOwnerTemplate() {
    if (!ownerTemplateDraft.id || !authTokens.owner) return

    setUiState((current) => ({ ...current, updating: true, error: '', message: '' }))
    try {
      await apiFetch(`/api/owner/templates/${ownerTemplateDraft.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${authTokens.owner}` },
        body: JSON.stringify({
          name: ownerTemplateDraft.name.trim(),
          occasion: ownerTemplateDraft.occasion.trim(),
          defaultMode: ownerTemplateDraft.defaultMode,
          maxLayers: Number(ownerTemplateDraft.maxLayers),
          allowedCakeTypes: ownerTemplateDraft.allowedCakeTypes,
        }),
      })
      await hydrateData(authTokens, { preserveMessage: false })
      setUiState((current) => ({ ...current, updating: false, error: '', message: `Template updated for ${activeOwnerLocation?.name || 'the active location'}.` }))
    } catch (error) {
      setUiState((current) => ({ ...current, updating: false, error: getFriendlyError(error, 'Failed to save location template.', 'Owner demo session') }))
    }
  }

  async function handleCustomerLogout() {
    setProfileDrawerOpen(false)
    setProfileHelpOpen(false)
    setView('accounts')
    if (supabase && authTokens.customer?.startsWith('supabase:')) {
      await supabase.auth.signOut()
      setAuthTokens((current) => ({ ...current, customer: '' }))
      setAccountSessions((current) => ({ ...current, customer: null }))
      return
    }
    await toggleDemoSession('customer')
  }

  async function updateOwnerOrderStatus() {
    if (!ownerOrder) return

    setUiState((current) => ({ ...current, updating: true, error: '', message: '' }))
    try {
      await apiFetch(`/api/owner/orders/${ownerOrder.id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${authTokens.owner}` },
        body: JSON.stringify({ status: selectedOrderStatus }),
      })
      await hydrateData(authTokens, { preserveMessage: false })
      setUiState((current) => ({ ...current, updating: false, message: `Order moved to ${formatStatus(selectedOrderStatus)}.` }))
    } catch (error) {
      setUiState((current) => ({ ...current, updating: false, error: getFriendlyError(error, 'Failed to update order status.', 'Owner demo session') }))
    }
  }

  async function updatePickupSlot(slotId) {
    const draft = pickupSlotDrafts[slotId]
    if (!draft) return

    setUiState((current) => ({ ...current, updating: true, error: '', message: '' }))
    try {
      await apiFetch(`/api/owner/pickup-slots/${slotId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${authTokens.owner}` },
        body: JSON.stringify({ capacity: Number(draft.capacity), active: Boolean(draft.active) }),
      })
      await hydrateData(authTokens, { preserveMessage: false })
      setUiState((current) => ({ ...current, updating: false, message: 'Pickup slot updated from the owner panel.' }))
    } catch (error) {
      setUiState((current) => ({ ...current, updating: false, error: getFriendlyError(error, 'Failed to update pickup slot.', 'Owner demo session') }))
    }
  }

  async function completeOwnerPickup() {
    if (!ownerOrder) return

    setUiState((current) => ({ ...current, updating: true, error: '', message: '' }))
    try {
      await apiFetch(`/api/owner/orders/${ownerOrder.id}/complete-pickup`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authTokens.owner}` },
      })
      await hydrateData(authTokens, { preserveMessage: false })
      setUiState((current) => ({ ...current, updating: false, message: 'Pickup completed and recorded in the live order history.' }))
    } catch (error) {
      setUiState((current) => ({ ...current, updating: false, error: getFriendlyError(error, 'Failed to complete pickup.', 'Owner demo session') }))
    }
  }

  async function saveOwnerOperations() {
    if (!ownerOrder) return

    setUiState((current) => ({ ...current, updating: true, error: '', message: '' }))
    try {
      await apiFetch(`/api/owner/orders/${ownerOrder.id}/ops`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${authTokens.owner}` },
        body: JSON.stringify(ownerOpsDraft),
      })
      await hydrateData(authTokens, { preserveMessage: false })
      setUiState((current) => ({ ...current, updating: false, message: 'Owner operations saved, including notes, staff assignment, and pickup-slot changes.' }))
    } catch (error) {
      setUiState((current) => ({ ...current, updating: false, error: getFriendlyError(error, 'Failed to save owner operations.', 'Owner demo session') }))
    }
  }

  async function cancelOwnerOrder() {
    if (!ownerOrder) return

    setUiState((current) => ({ ...current, updating: true, error: '', message: '' }))
    try {
      await apiFetch(`/api/owner/orders/${ownerOrder.id}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authTokens.owner}` },
        body: JSON.stringify({ reason: ownerOpsDraft.notes || 'Owner cancellation from dashboard' }),
      })
      await hydrateData(authTokens, { preserveMessage: false })
      setUiState((current) => ({ ...current, updating: false, message: 'Order cancelled. Pickup capacity was released and refund follow-up is now visible.' }))
    } catch (error) {
      setUiState((current) => ({ ...current, updating: false, error: getFriendlyError(error, 'Failed to cancel order.', 'Owner demo session') }))
    }
  }

  async function flagOwnerException(kind) {
    if (!ownerOrder) return

    setUiState((current) => ({ ...current, updating: true, error: '', message: '' }))
    try {
      await apiFetch(`/api/owner/orders/${ownerOrder.id}/flag-exception`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authTokens.owner}` },
        body: JSON.stringify({
          reason: ownerOpsDraft.notes || (kind === 'refund' ? 'Refund review requested from owner workspace' : 'Support escalation requested from owner workspace'),
          supportStatus: kind === 'refund' ? 'refund_review_requested' : 'escalated',
          refundStatus: kind === 'refund' ? 'pending_review' : ownerOrder.refundStatus || 'not_requested',
        }),
      })
      await hydrateData(authTokens, { preserveMessage: false })
      setUiState((current) => ({ ...current, updating: false, message: kind === 'refund' ? 'Refund review opened and surfaced to admin.' : 'Support exception escalated to admin.' }))
    } catch (error) {
      setUiState((current) => ({ ...current, updating: false, error: getFriendlyError(error, 'Failed to flag exception.', 'Owner demo session') }))
    }
  }

  async function addOwnerExceptionNote() {
    if (!ownerOrder) return

    setUiState((current) => ({ ...current, updating: true, error: '', message: '' }))
    try {
      await apiFetch(`/api/owner/orders/${ownerOrder.id}/exception-notes`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authTokens.owner}` },
        body: JSON.stringify({ body: ownerOpsDraft.notes || 'Owner follow-up added from dashboard' }),
      })
      await hydrateData(authTokens, { preserveMessage: false })
      setUiState((current) => ({ ...current, updating: false, message: 'Owner exception follow-up added to the admin thread.' }))
    } catch (error) {
      setUiState((current) => ({ ...current, updating: false, error: getFriendlyError(error, 'Failed to add exception note.', 'Owner demo session') }))
    }
  }

  async function resolveAdminDispute(disputeId, status) {
    setUiState((current) => ({ ...current, updating: true, error: '', message: '' }))
    try {
      await apiFetch(`/api/admin/disputes/${disputeId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${authTokens.admin}` },
        body: JSON.stringify({
          status,
          refundStatus: status === 'resolved' ? 'approved' : 'pending_review',
          resolution: status === 'resolved' ? 'Pickup issue closed from admin triage.' : 'Escalated for deeper review.',
        }),
      })
      await hydrateData(authTokens, { preserveMessage: false })
      setUiState((current) => ({ ...current, updating: false, message: `Dispute ${formatStatus(status)} from the admin exception panel.` }))
    } catch (error) {
      setUiState((current) => ({ ...current, updating: false, error: getFriendlyError(error, 'Failed to update dispute.', 'Admin demo session') }))
    }
  }

  async function handleAdminRefundDecision(dispute, decision) {
    setUiState((current) => ({ ...current, updating: true, error: '', message: '' }))
    try {
      await apiFetch(`/api/admin/disputes/${dispute.id}/refund`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authTokens.admin}` },
        body: JSON.stringify({
          decision,
          resolution: decision === 'approved' ? 'Refund approved from admin exception panel.' : 'Refund request rejected from admin exception panel.',
          note: decision === 'approved' ? 'Demo refund seam executed.' : 'Refund request denied after review.',
        }),
      })
      await hydrateData(authTokens, { preserveMessage: false })
      setUiState((current) => ({ ...current, updating: false, message: decision === 'approved' ? 'Refund approved and logged on the dispute.' : 'Refund rejected and logged on the dispute.' }))
    } catch (error) {
      setUiState((current) => ({ ...current, updating: false, error: getFriendlyError(error, 'Failed to update refund decision.', 'Admin demo session') }))
    }
  }

  async function addAdminDisputeMessage(disputeId, visibility = 'internal') {
    const body = adminDisputeDrafts[disputeId]?.trim()
    if (!body) {
      setUiState((current) => ({ ...current, error: 'Write a support note before posting it.' }))
      return
    }

    setUiState((current) => ({ ...current, updating: true, error: '', message: '' }))
    try {
      await apiFetch(`/api/admin/disputes/${disputeId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authTokens.admin}` },
        body: JSON.stringify({ body, visibility }),
      })
      setAdminDisputeDrafts((current) => ({ ...current, [disputeId]: '' }))
      await hydrateData(authTokens, { preserveMessage: false })
      setUiState((current) => ({ ...current, updating: false, message: visibility === 'customer' ? 'Customer reply added to the support thread.' : 'Support note added to the dispute thread.' }))
    } catch (error) {
      setUiState((current) => ({ ...current, updating: false, error: getFriendlyError(error, 'Failed to add support note.', 'Admin demo session') }))
    }
  }

  async function assignAdminDispute(disputeId) {
    const assignedAdminId = adminAssignmentDrafts[disputeId] || ''
    setUiState((current) => ({ ...current, updating: true, error: '', message: '' }))
    try {
      await apiFetch(`/api/admin/disputes/${disputeId}/assign`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authTokens.admin}` },
        body: JSON.stringify({ assignedAdminId, note: assignedAdminId ? 'Assigned from admin exception panel.' : 'Assignment cleared from admin exception panel.' }),
      })
      await hydrateData(authTokens, { preserveMessage: false })
      setUiState((current) => ({ ...current, updating: false, message: assignedAdminId ? 'Dispute reassigned in the admin queue.' : 'Dispute assignment cleared.' }))
    } catch (error) {
      setUiState((current) => ({ ...current, updating: false, error: getFriendlyError(error, 'Failed to update dispute assignment.', 'Admin demo session') }))
    }
  }

  async function addCustomerSupportMessage(orderId) {
    const body = customerSupportDrafts[orderId]?.trim()
    if (!body) {
      setUiState((current) => ({ ...current, error: 'Write your support message before sending it.' }))
      return
    }

    setUiState((current) => ({ ...current, updating: true, error: '', message: '' }))
    try {
      await apiFetch(`/api/orders/${orderId}/support-messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authTokens.customer}` },
        body: JSON.stringify({ body }),
      })
      setCustomerSupportDrafts((current) => ({ ...current, [orderId]: '' }))
      await hydrateData(authTokens, { preserveMessage: false })
      setUiState((current) => ({ ...current, updating: false, message: 'Support message sent and surfaced to admin.' }))
    } catch (error) {
      setUiState((current) => ({ ...current, updating: false, error: getFriendlyError(error, 'Failed to send support message.', 'Customer demo session') }))
    }
  }

  async function cancelCustomerOrder(orderId) {
    setUiState((current) => ({ ...current, updating: true, error: '', message: '' }))
    try {
      await apiFetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authTokens.customer}` },
        body: JSON.stringify({ reason: 'Customer changed plans before production started' }),
      })
      await hydrateData(authTokens, { preserveMessage: false })
      setUiState((current) => ({ ...current, updating: false, message: 'Order cancelled before production and moved into refund follow-up.' }))
    } catch (error) {
      setUiState((current) => ({ ...current, updating: false, error: getFriendlyError(error, 'Failed to cancel order.', 'Customer demo session') }))
    }
  }

  async function toggleDemoSession(role) {
    setUiState((current) => ({ ...current, authUpdating: true, error: '', message: '' }))
    try {
      if (role === 'customer' && supabase && googleAuthEnabled) {
        if (authTokens.customer?.startsWith('supabase:')) {
          await supabase.auth.signOut()
          setAuthTokens((current) => ({ ...current, customer: '' }))
          setAccountSessions((current) => ({ ...current, customer: null }))
          setUiState((current) => ({ ...current, authUpdating: false, message: 'Signed out.' }))
          return
        }

        const redirectTo = 'https://cake-builder-prototype.vercel.app'
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo },
        })
        if (error) throw error
        setUiState((current) => ({ ...current, authUpdating: false }))
        return
      }

      if (authTokens[role]) {
        if (String(authTokens[role]).startsWith('offline-demo:')) {
          const nextTokens = { ...authTokens, [role]: '' }
          const nextSessions = { ...accountSessions, [role]: null }
          setAuthTokens(nextTokens)
          setAccountSessions(nextSessions)
          setDesiredDemoRoles((current) => ({ ...current, [role]: false }))
          setSessionMeta((current) => ({
            ...current,
            [role]: {
              ...current[role],
              ...createSessionMetaPatch({ state: 'signed_out' }),
            },
          }))
          setUiState((current) => ({ ...current, authUpdating: false, message: `${role} demo session signed out.` }))
          return
        }
        await apiFetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${authTokens[role]}` },
        })
        const nextTokens = { ...authTokens, [role]: '' }
        const nextSessions = { ...accountSessions, [role]: null }
        setAuthTokens(nextTokens)
        setAccountSessions(nextSessions)
        setBackendSessionsByRole((current) => ({ ...current, [role]: [] }))
        setDesiredDemoRoles((current) => ({ ...current, [role]: false }))
        setSessionMeta((current) => ({
          ...current,
          [role]: {
            ...current[role],
            ...createSessionMetaPatch({ state: 'signed_out' }),
          },
        }))
        setAuthCheck((current) => current.status === role ? { status: 'idle', detail: '', denied: '' } : current)
        setUiState((current) => ({ ...current, authUpdating: false, message: `${role} demo session signed out.` }))
        return
      }

      await signInDemoRole(role, { message: `${role} demo session reconnected.` })
      setUiState((current) => ({ ...current, authUpdating: false }))
    } catch (error) {
      setUiState((current) => ({ ...current, authUpdating: false, error: getFriendlyError(error, 'Failed to update demo session.', `${role} demo session`) }))
    }
  }

  async function signOutOtherSessions(role) {
    const token = authTokens[role]
    const currentSessionId = backendSessionsByRole[role]?.find((session) => session.isCurrent)?.id
    if (!token || !currentSessionId) return

    setUiState((current) => ({ ...current, authUpdating: true, error: '', message: '' }))
    try {
      const result = await apiFetch(`/api/auth/sessions/${currentSessionId}/revoke`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ scope: 'others' }),
      })
      await hydrateData(authTokens, { preserveMessage: false })
      setUiState((current) => ({ ...current, authUpdating: false, message: result.revokedCount ? `${role} signed out ${result.revokedCount} other session${result.revokedCount === 1 ? '' : 's'}.` : `No other ${role} sessions were active.` }))
    } catch (error) {
      setUiState((current) => ({ ...current, authUpdating: false, error: getFriendlyError(error, 'Failed to sign out other sessions.', `${role} demo session`) }))
    }
  }

  async function revokeBackendSession(role, sessionId) {
    const token = authTokens[role]
    if (!token || !sessionId) return

    setUiState((current) => ({ ...current, authUpdating: true, error: '', message: '' }))
    try {
      const result = await apiFetch(`/api/auth/sessions/${sessionId}/revoke`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      await hydrateData(authTokens, { preserveMessage: false })
      setUiState((current) => ({
        ...current,
        authUpdating: false,
        message: result.revokedCount ? `${role} session ${sessionId} revoked.` : `No ${role} session was revoked.`,
      }))
    } catch (error) {
      setUiState((current) => ({ ...current, authUpdating: false, error: getFriendlyError(error, 'Failed to revoke that session.', `${role} demo session`) }))
    }
  }

  async function restoreRecommendedSessions() {
    setUiState((current) => ({ ...current, authUpdating: true, error: '', message: '' }))
    try {
      setDesiredDemoRoles({ customer: true, owner: true, staff: true, admin: true })
      setUiState((current) => ({ ...current, authUpdating: false, message: 'Recommended demo sessions restored.' }))
    } catch (error) {
      setUiState((current) => ({ ...current, authUpdating: false, error: getFriendlyError(error, 'Failed to restore demo sessions.', 'Session center') }))
    }
  }

  async function runPermissionCheck() {
    setAuthCheck({ status: 'checking', detail: '', denied: '' })
    const token = authTokens[accountType]

    if (!token) {
      setAuthCheck({ status: 'signed_out', detail: `${accountType} session is signed out.`, denied: '' })
      return
    }

    const allowedPath = accountType === 'customer'
      ? '/api/orders/me'
      : accountType === 'admin'
        ? '/api/admin/analytics'
        : '/api/owner/orders/summary'

    const deniedPath = accountType === 'customer' ? '/api/admin/analytics' : '/api/designs'

    try {
      await apiFetch(allowedPath, { headers: { Authorization: `Bearer ${token}` } })
      let deniedMessage = 'No denial check run.'
      try {
        await apiFetch(deniedPath, { headers: { Authorization: `Bearer ${token}` } })
        deniedMessage = 'Unexpectedly allowed, review backend guard.'
      } catch (error) {
        deniedMessage = getFriendlyError(error, 'Blocked as expected.', `${accountType} demo session`)
      }

      setAuthCheck({ status: 'ok', detail: `${accountType} can reach ${allowedPath}.`, denied: deniedMessage })
    } catch (error) {
      setAuthCheck({ status: 'error', detail: getFriendlyError(error, 'Permission check failed.', `${accountType} demo session`), denied: '' })
    }
  }

  const favoriteDesigns = savedDesigns.filter((design) => favoriteDesignIds.includes(design.id) || design.isFavorite)
  const savedDesignOrderMap = useMemo(() => {
    return customerOrders.reduce((acc, order) => {
      if (!order.savedDesignId) return acc
      const existing = acc[order.savedDesignId]
      if (!existing || new Date(order.createdAt || 0) > new Date(existing.createdAt || 0)) {
        acc[order.savedDesignId] = order
      }
      return acc
    }, {})
  }, [customerOrders])
  const favoriteOrders = favoriteDesigns.length
    ? favoriteDesigns.map((design) => design.title)
    : customerOrders.slice(0, 3).map((order) => order.savedDesign?.title || order.designSnapshot?.occasion || order.id)

  if (!guestMode && !authTokens.customer) {
    return (
      <div className="page auth-gate-page">
        <div className="phone-frame auth-gate-frame">
          <section className="auth-gate-card">
            <div className="auth-gate-copy">
              <p className="eyebrow">Cake app</p>
              <h1>Design your cake in minutes</h1>
              <p className="screen-subcopy">Sign in to save your profile and checkout faster, or continue without signing in to explore first.</p>
            </div>
            <div className="auth-gate-actions">
              <button type="button" className="cta" onClick={() => toggleDemoSession('customer')} disabled={uiState.authUpdating}>{uiState.authUpdating ? 'Signing in...' : 'Sign in to continue'}</button>
              <button type="button" className="auth-guest-link" onClick={() => {
                setDesiredDemoRoles({ customer: false, owner: false, staff: false, admin: false })
                setGuestMode(true)
              }}>Continue without signing in</button>
            </div>
          </section>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="phone-frame wide">
        <div className="app-main">
        {view !== 'builder' && view !== 'home' && (uiState.loading || uiState.error || uiState.message || uiState.apiBaseUrl) && (
          <section className="status-banner-wrap">
            {uiState.loading && <div className="status-banner">Loading live backend data...</div>}
            {customerVisibleError && <div className="status-banner error">{customerVisibleError}</div>}
            {uiState.message && <div className="status-banner success">{uiState.message}</div>}
            {!uiState.loading && uiState.apiBaseUrl && <div className="status-banner success">Connected to {uiState.apiBaseUrl}</div>}
          </section>
        )}

        {view === 'home' && (
          <section className="screen-card marketplace-screen uber-home-screen">
            <div className="marketplace-hero uber-home-hero richer-home-hero">
              <div className="marketplace-topbar uber-home-topbar">
                <div className="marketplace-location-pill uber-location-pill">
                  <span>Delivering from</span>
                  <strong>{customerShopLabel}</strong>
                </div>
                <button type="button" className="marketplace-notice-button" aria-label="Notifications">◌</button>
              </div>
              <div className="uber-home-hero-copy">
                <h2>Order cakes that feel ready for tonight.</h2>
                <p>Pick a bakery, browse fast, and jump straight into custom or ready-made cakes.</p>
              </div>
            </div>

            <div className="uber-home-heading cleaner-home-heading">
              <div>
                <span className="label">Nearby bakeries</span>
                <h2>Choose a bakery</h2>
              </div>
              <p>{ownerLocations.length} bakery option{ownerLocations.length === 1 ? '' : 's'}</p>
            </div>

            <div className="marketplace-store-list uber-store-list">
              {ownerLocations.map((location, index) => {
                const capability = location.capability || {}
                const accentClass = index % 3 === 0 ? 'berry' : index % 3 === 1 ? 'cream' : 'mocha'
                const storeMeta = capability.fullCustom
                  ? 'Custom cakes'
                  : capability.presetsCustomizable
                    ? 'Preset cakes + edits'
                    : 'Preset cakes only'
                const storeEta = index === 0 ? '10 min' : index === 1 ? '14 min' : '18 min'
                const storeSubline = index === 0 ? 'Best overall' : index === 1 ? '4.8★ rating' : 'Popular nearby'

                return (
                  <button
                    key={`home-bakery-${location.id}`}
                    type="button"
                    className={customerShopId === location.id ? `uber-store-card active ${accentClass}` : `uber-store-card ${accentClass}`}
                    onClick={() => {
                      setCustomerShopId(location.id)
                      setSelectedMenuItem(null)
                      setBuilderScreen('store-menu')
                      setView('builder')
                    }}
                  >
                    <div className={`uber-store-image ${accentClass}`}>
                      <div className="marketplace-store-fade" />
                      <div className="uber-store-badge">{storeEta}</div>
                    </div>
                    <div className="uber-store-content cleaner-store-content">
                      <div className="uber-store-title-row">
                        <h3>{location.name}</h3>
                        <span className="uber-store-heart">♡</span>
                      </div>
                      <div className="uber-store-meta-line">
                        <span>{storeMeta}</span>
                        <span>•</span>
                        <span>{storeSubline}</span>
                      </div>
                      <div className="uber-store-subline">Open menu</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {view === 'builder' && (
          <>
            <section className="customer-shell minimal-builder-shell">
              <header className="customer-header minimal-builder-header cleaner-builder-header">
                <div className="minimal-builder-title">
                  <p className="eyebrow">Bakery</p>
                  <h2>{customerShopLabel}</h2>
                  <p className="screen-subcopy">{builderScreen === 'store-menu' ? 'Pick a cake to customize or add fast.' : builderScreen === 'item-detail' ? selectedMenuItem?.description : selectedBakery?.hero}</p>
                </div>
                <div className="pill-row compact">
                  <button type="button" className="pill" onClick={() => builderScreen === 'store-menu' ? setView('home') : builderScreen === 'item-detail' ? setBuilderScreen('store-menu') : setBuilderScreen('store-menu')}>{builderScreen === 'store-menu' ? 'All bakeries' : 'Back to menu'}</button>
                  {builderScreen === 'custom-builder' ? <button type="button" className="menu-dot-button" aria-label="Menu" onClick={() => { setBuilderStep('review'); setBuilderMenuOpen((current) => !current) }}>☰</button> : null}
                </div>
              </header>

              {builderScreen === 'custom-builder' && builderMenuOpen && (
                <div className="builder-menu-sheet builder-menu-dropdown">
                  <div className="builder-menu-topbar builder-menu-topbar-minimal">
                    <button type="button" className="cart-icon-button" aria-label="Open cart" onClick={() => { setBuilderMenuOpen(false); setView('checkout') }}>
                      <span>🛒</span>
                      {cart.length ? <b>{cart.length}</b> : null}
                    </button>
                    <button
                      type="button"
                      className="profile-avatar-button"
                      aria-label="Profile settings"
                      onClick={() => {
                        setProfileDrawerOpen((current) => !current)
                        setProfileHelpOpen(false)
                        setProfileSection('profile')
                      }}
                    >
                      <span>{(accountSessions.customer?.name || DEFAULT_CUSTOMER_NAME).slice(0, 1)}</span>
                    </button>
                  </div>

                  {profileDrawerOpen && (
                    <div className="builder-profile-popover account-sheet-popover">
                      <div className="builder-profile-head">
                        <div className="profile-avatar-large">{(accountSessions.customer?.name || DEFAULT_CUSTOMER_NAME).slice(0, 1)}</div>
                        <div>
                          <strong>{accountSessions.customer?.name || DEFAULT_CUSTOMER_NAME}</strong>
                          <p>{accountSessions.customer?.email || DEMO_USERS.customer.email}</p>
                        </div>
                      </div>

                      <div className="account-sheet-menu">
                        <button type="button" className="account-sheet-row" onClick={() => { setView('saved'); setProfileDrawerOpen(false); setBuilderMenuOpen(false) }}>
                          <span>My orders</span>
                          <strong>›</strong>
                        </button>
                        <button type="button" className="account-sheet-row" onClick={() => { setView('saved'); setProfileDrawerOpen(false); setBuilderMenuOpen(false) }}>
                          <span>Saved cakes</span>
                          <strong>›</strong>
                        </button>
                        <button type="button" className="account-sheet-row" onClick={() => { setView('accounts'); setProfileSection('settings'); setProfileDrawerOpen(false); setBuilderMenuOpen(false) }}>
                          <span>Account settings</span>
                          <strong>›</strong>
                        </button>
                        <button type="button" className="account-sheet-row" onClick={() => { setView('accounts'); setProfileSection('notifications'); setProfileDrawerOpen(false); setBuilderMenuOpen(false) }}>
                          <span>Notifications</span>
                          <strong>›</strong>
                        </button>
                        <button type="button" className="account-sheet-row" onClick={() => setProfileHelpOpen((current) => !current)}>
                          <span>Help</span>
                          <strong>{profileHelpOpen ? '−' : '›'}</strong>
                        </button>
                      </div>

                      {profileHelpOpen ? (
                        <div className="account-sheet-help">
                          {helpActions.map((item) => <div key={`builder-help-${item}`} className="account-sheet-help-row">{item}</div>)}
                        </div>
                      ) : null}

                      <div className="account-sheet-footer">
                        {authTokens.customer ? (
                          <button type="button" className="account-logout-button" onClick={handleCustomerLogout} disabled={uiState.authUpdating}>{uiState.authUpdating ? 'Logging out...' : 'Logout'}</button>
                        ) : (
                          <button type="button" className="account-logout-button" onClick={() => toggleDemoSession('customer')} disabled={uiState.authUpdating}>{uiState.authUpdating ? 'Reconnecting...' : 'Reconnect customer session'}</button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="builder-accordion-list">
                    {builderSteps.map((step, index) => {
                      const isActive = builderStep === step.id
                      return (
                        <div key={`accordion-${step.id}`} className={isActive ? 'builder-accordion-item active' : step.id === 'flavor' ? 'builder-accordion-item builder-accordion-item layers-spotlight' : 'builder-accordion-item'}>
                          <button type="button" className="builder-accordion-trigger" onClick={() => setBuilderStep(isActive ? '' : step.id)}>
                            <div className="builder-accordion-trigger-copy">
                              <span>{index + 1}. {step.label}</span>
                              <strong>{step.label}</strong>
                            </div>
                            <div className="builder-accordion-trigger-side">
                              <small>{builderStepSummaries[step.id]}</small>
                              <div className="builder-accordion-status">
                                {stepCompletion[step.id] ? <b>✓</b> : null}
                                <em>{isActive ? '−' : '+'}</em>
                              </div>
                            </div>
                          </button>

                          {isActive && step.id === 'occasion' && (
                            <div className="builder-accordion-panel">
                              <div className="pill-row scroll-row">
                                {Object.keys(occasionConfigs).map((item) => (
                                  <button key={item} type="button" className={occasion === item ? 'pill active' : 'pill'} onClick={() => applyOccasion(item)}>{item}</button>
                                ))}
                              </div>
                            </div>
                          )}

                          {isActive && step.id === 'location' && (
                            <div className="builder-accordion-panel">
                              <div className="pill-row compact">
                                {ownerLocations.map((location) => (
                                  <button key={`menu-customer-shop-${location.id}`} type="button" className={customerShopId === location.id ? 'pill active' : 'pill'} onClick={() => setCustomerShopId(location.id)}>{location.name}</button>
                                ))}
                              </div>
                            </div>
                          )}

                          {isActive && step.id === 'style' && (
                            <div className="builder-accordion-panel">
                              <div className="section-block compact-block">
                                <span className="label">Mode</span>
                                <div className="pill-row compact">
                                  {['simple', 'advanced'].map((item) => (
                                    <button key={`menu-${item}`} type="button" className={mode === item ? 'pill active' : 'pill'} onClick={() => enforceMode(item)}>{item}</button>
                                  ))}
                                </div>
                              </div>
                              <div className="section-block compact-block">
                                <span className="label">Cake type</span>
                                <div className="pill-row compact">
                                  {availableCakeTypes.map((type) => (
                                    <button key={`menu-type-${type.id}`} type="button" className={cakeType === type.id ? 'pill active' : 'pill'} onClick={() => setCakeType(type.id)}>{type.label}</button>
                                  ))}
                                </div>
                              </div>
                              <label className="range-card compact-range-card">
                                <div className="range-head">
                                  <span className="label">Layers</span>
                                  <strong>{layerCount}</strong>
                                </div>
                                <input type="range" min={activeMode.minLayers} max={activeMode.maxLayers} value={layerCount} onChange={(event) => updateLayerCount(Number(event.target.value))} />
                              </label>
                            </div>
                          )}

                          {isActive && step.id === 'flavor' && (
                            <div className="builder-accordion-panel">
                              <div className="section-intro section-intro-layers">
                                <strong>Customize each layer</strong>
                                <p>Tap a layer card below, then choose sponge, cream, flavor, and sugar options inside that layer.</p>
                              </div>
                              <div className="layer-selector-row compact-layer-selector-row">
                                {layers.map((layer, index) => (
                                  <button key={`menu-layer-${layer.id}`} type="button" className={activeLayer === index ? 'layer-chip active' : 'layer-chip'} onClick={() => setActiveLayer(index)}>
                                    <strong>{layer.name}</strong>
                                    <span>{[layer.bread, layer.flavor, layer.sugar].filter(Boolean).join(' · ')}</span>
                                  </button>
                                ))}
                              </div>
                              <div className="layer-detail-list">
                                {layers.map((layer, index) => {
                                  const expanded = activeLayer === index
                                  return (
                                    <div key={`layer-detail-${layer.id}`} className={expanded ? 'layer-detail-card active' : 'layer-detail-card'}>
                                      <button type="button" className="layer-detail-trigger" onClick={() => setActiveLayer(index)}>
                                        <div className="layer-detail-trigger-copy">
                                          <strong>{layer.name}</strong>
                                          <span>{[layer.bread, layer.flavor, layer.sugar, layer.cream].filter(Boolean).join(' · ')}</span>
                                        </div>
                                        <em>{expanded ? '−' : '+'}</em>
                                      </button>
                                      {expanded && (
                                        <div className="editor-card mobile-editor-card nested-editor-card">
                                          {editableFields.map((field) => (
                                            <OptionSelect
                                              key={`menu-${layer.id}-${field}`}
                                              label={fieldLabels[field]}
                                              value={layer[field]}
                                              options={optionSets[field]}
                                              onChange={(value) => {
                                                if (activeLayer !== index) setActiveLayer(index)
                                                updateLayerField(field, value, index)
                                              }}
                                            />
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          {isActive && step.id === 'review' && (
                            <div className="builder-accordion-panel">
                              <div className="review-summary-card">
                                <div className="review-summary-top">
                                  <div>
                                    <span className="label">Review</span>
                                    <strong>{occasion} Cake</strong>
                                    <p>{cakeTypes.find((type) => type.id === cakeType)?.label} · {mode === 'advanced' ? 'Advanced build' : 'Quick build'} · {layerCount} layers</p>
                                    <p>{customerShopLabel}</p>
                                  </div>
                                  <div className="review-price-pill">{formatMoney(totalPrice)}</div>
                                </div>
                                <div className="review-layer-stack">
                                  {layers.map((layer) => (
                                    <div key={`review-${layer.id}`} className="review-layer-card">
                                      <div className="review-layer-head">
                                        <strong>{layer.name}</strong>
                                        <span>{layer.flavor}</span>
                                      </div>
                                      <div className="review-layer-meta">
                                        <span>Base: {layer.bread}</span>
                                        <span>Sugar: {layer.sugar}</span>
                                        <span>Cream: {layer.cream}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {builderScreen === 'custom-builder' && builderMenuOpen && <div className="builder-menu-backdrop" onClick={() => setBuilderMenuOpen(false)} />}

              {builderScreen === 'store-menu' && (
                <>
                  <div className="store-menu-summary-bar">
                    <div>
                      <span className="label">Menu</span>
                      <strong>{selectedBakeryMenuItems.length} items available</strong>
                    </div>
                    <p>{selectedBakery?.hero || 'Fresh bakery options ready to browse.'}</p>
                  </div>
                  <div className="store-menu-grid cleaner-store-menu-grid">
                    {selectedBakeryMenuItems.map((item) => (
                      <div key={item.id} className="store-menu-card cleaner-store-menu-card">
                        <button type="button" className="store-menu-hit" onClick={() => {
                          setSelectedMenuItem(item)
                          setBuilderScreen(item.type === 'custom' ? 'custom-builder' : 'item-detail')
                        }}>
                          <div className={`store-menu-image ${item.type === 'custom' ? 'custom' : ''}`}>
                            <span>{item.image}</span>
                            <div className="store-menu-tag">{item.type === 'custom' ? 'Custom' : 'Ready to order'}</div>
                            <button
                              type="button"
                              className="store-menu-plus"
                              onClick={(event) => {
                                event.stopPropagation()
                                if (item.type === 'custom') {
                                  setSelectedMenuItem(item)
                                  setBuilderScreen('custom-builder')
                                  return
                                }
                                setSelectedMenuItem(item)
                                setBuilderScreen('item-detail')
                              }}
                            >
                              +
                            </button>
                          </div>
                          <div className="store-menu-copy">
                            <div className="store-menu-price-row">
                              <strong>{item.title}</strong>
                              <span>{formatMoney(item.price)}</span>
                            </div>
                            <p>{item.description}</p>
                            <small>{item.type === 'custom' ? 'Build it your way' : 'Quick add available'}</small>
                          </div>
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {builderScreen === 'item-detail' && selectedMenuItem && (
                <div className="single-flow-card item-detail-card cleaner-item-detail-card">
                  <div className="store-menu-image detail-image">
                    <span>{selectedMenuItem.image}</span>
                    <div className="store-menu-tag detail-tag">Bakery favorite</div>
                  </div>
                  <div className="editor-head">
                    <div>
                      <span className="label">Cake details</span>
                      <strong>{selectedMenuItem.title}</strong>
                    </div>
                    <strong>{formatMoney(selectedMenuItem.price)}</strong>
                  </div>
                  <p>{selectedMenuItem.detail}</p>
                  <div className="option-card chip-option-card cleaner-included-card">
                    <span>What you get</span>
                    <div className="pill-row compact">
                      <span className="pill static-pill">6 inch</span>
                      <span className="pill static-pill">Bakery finished</span>
                      <span className="pill static-pill">Ready for pickup</span>
                    </div>
                  </div>
                  <div className="flow-step-footer sticky-cart-footer">
                    <button type="button" className="cta" onClick={() => addPresetMenuItemToCart(selectedMenuItem)}>
                      Add to cart • {formatMoney(selectedMenuItem.price)}
                    </button>
                  </div>
                </div>
              )}

              {builderScreen === 'custom-builder' && <div className="customer-visual-card focused-visual-card solo-visual-card">
                <div className="visual-copy compact-visual-copy">
                  <span className="label">Live cake</span>
                  <strong>{previewTitle}</strong>
                </div>
                <div className={`cake-preview mobile-preview ${cakeType}`}>
                  {visibleLayers.map((layer, reverseIndex) => {
                    const actualIndex = layerCount - 1 - reverseIndex
                    const width = Math.max(130, 248 - reverseIndex * 12)
                    const height = cakeType === 'tall' ? 58 : cakeType === 'premium' ? 50 : 42
                    return (
                      <button key={layer.id} type="button" className={activeLayer === actualIndex ? 'cake-layer active' : 'cake-layer'} style={{ width: `${width}px`, height: `${height}px` }} onClick={() => { setActiveLayer(actualIndex); setBuilderStep('flavor'); setBuilderMenuOpen(true) }}>
                        <span>{actualIndex === 0 ? 'Top' : actualIndex === layerCount - 1 ? 'Base' : `Layer ${actualIndex + 1}`}</span>
                      </button>
                    )
                  })}
                </div>
                <div className="builder-action-bar">
                  <button type="button" className="cta add-cart-cta" onClick={addToCart}>Add to cart</button>
                  <button type="button" className="cta secondary" onClick={() => {
                    setSelectedCartShopId(customerShopId)
                    setView('checkout')
                  }}>View cart</button>
                </div>
              </div>}

            </section>
          </>
        )}

        {view === 'checkout' && (
          <section className="screen-card uber-cart-screen checkout-upgrade-screen">
            <div className="uber-cart-header cleaner-checkout-header">
              <button type="button" className="icon-pill" onClick={() => checkoutStage === 'payment' ? setCheckoutStage('summary') : checkoutStage === 'placed' ? setView('saved') : setView('saved')}>{checkoutStage === 'payment' ? '←' : '×'}</button>
              <div className="checkout-stage-inline">
                <strong>{checkoutStage === 'payment' ? 'Payment' : checkoutStage === 'placed' ? 'Order confirmed' : 'Your cart'}</strong>
                <span>{activeCartGroup?.shopName || 'Downtown Vancouver'}</span>
              </div>
              <button type="button" className="icon-pill" aria-label="Add more items" onClick={() => {
                setCustomerShopId(activeCartGroup?.shopId || customerShopId)
                setBuilderScreen('store-menu')
                setView('builder')
              }}>+</button>
            </div>

            {checkoutStage === 'summary' && (
              <>
                <div className="uber-cart-title-block compact-cart-title-block">
                  <h2>Your cart</h2>
                  <p>{cartItemCount} item{cartItemCount === 1 ? '' : 's'}</p>
                </div>

                <div className="uber-cart-items">
                  {!activeCartGroup?.items?.length ? <p>No cakes in this cart yet.</p> : activeCartGroup.items.map((item) => <div key={item.id} className="uber-cart-item-row"><div className="uber-cart-item-image"><span>Cake</span></div><div className="uber-cart-item-copy"><strong>{item.title}</strong><p>{cakeTypes.find((type) => type.id === item.config.cakeType)?.label || 'Cake'} · {item.layerCount} layers</p><small>{formatMoney(item.unitPrice || item.totalPrice)}</small></div><div className="uber-cart-stepper"><button type="button" className="stepper-btn" aria-label="Remove one item" onClick={() => updateCartItemQuantity(item.id, -1)}>−</button><span>{item.quantity || 1}</span><button type="button" className="stepper-btn" aria-label="Add one item" onClick={() => updateCartItemQuantity(item.id, 1)}>+</button></div></div>)}
                  {activeCartGroup?.shopId ? <button type="button" className="uber-add-items-btn" onClick={() => {
                    setCustomerShopId(activeCartGroup.shopId)
                    setBuilderScreen('store-menu')
                    setView('builder')
                  }}>+ Add items</button> : null}
                </div>

                <div className="checkout-summary-card">
                  <div className="section-head-simple">
                    <strong>Summary</strong>
                    <span>{cartItemCount} item{cartItemCount === 1 ? '' : 's'}</span>
                  </div>
                  <div className="fulfillment-switch-row">
                    <button type="button" className={fulfillmentType === 'pickup' ? 'fulfillment-chip active' : 'fulfillment-chip'} onClick={() => setFulfillmentType('pickup')}>Pickup</button>
                    <button type="button" className={fulfillmentType === 'delivery' ? 'fulfillment-chip active' : 'fulfillment-chip'} onClick={() => setFulfillmentType('delivery')}>Delivery</button>
                  </div>
                  <div className="checkout-price-row"><span>Subtotal</span><strong>{formatMoney(cartSubtotal)}</strong></div>
                  <div className="checkout-price-row"><span>Delivery fee</span><strong>{formatMoney(deliveryFee)}</strong></div>
                  <div className="checkout-price-row"><span>Service fee</span><strong>{formatMoney(serviceFee)}</strong></div>
                  <div className="checkout-price-row"><span>GST / HST</span><strong>${gstHst.toFixed(2)}</strong></div>
                  <div className="checkout-price-row total"><span>Total</span><strong>${checkoutTotal.toFixed(2)}</strong></div>
                </div>

                {fulfillmentType === 'pickup' ? (
                  <div className="uber-pickup-card">
                    <div className="section-head-simple">
                      <strong>Pickup</strong>
                      <span>{activeCartGroup?.shopName || checkoutShopLabel}</span>
                    </div>
                    <div className="layer-map">
                      {sortedPickupSlots.map((slot) => {
                        const state = getPickupSlotState(slot)
                        return (
                          <button key={slot.id} type="button" className={pickupSlotId === slot.id ? 'layer-chip active' : 'layer-chip'} onClick={() => setPickupSlotId(slot.id)} disabled={!state.selectable}>
                            <strong>{formatPickupWindow(slot)}</strong>
                            <span>{state.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="uber-pickup-card">
                    <div className="section-head-simple">
                      <strong>Delivery address</strong>
                      <span>{activeCartGroup?.shopName || checkoutShopLabel}</span>
                    </div>
                    <div className="layer-map">
                      {customerProfile.addresses.map((address) => (
                        <button key={address.id} type="button" className={selectedAddressId === address.id ? 'layer-chip active' : 'layer-chip'} onClick={() => setSelectedAddressId(address.id)}>
                          <strong>{address.label}</strong>
                          <span>{address.line1}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="uber-cart-footer">
                  {!authTokens.customer ? (
                    <button type="button" className="uber-checkout-btn" onClick={() => toggleDemoSession('customer')} disabled={uiState.authUpdating}>{uiState.authUpdating ? 'Logging in...' : 'Login to continue'}</button>
                  ) : fulfillmentType === 'pickup' && !selectedPickupSlot ? (
                    <button type="button" className="uber-checkout-btn" disabled>Choose pickup time</button>
                  ) : fulfillmentType === 'delivery' && !selectedAddress ? (
                    <button type="button" className="uber-checkout-btn" disabled>Choose delivery address</button>
                  ) : (
                    <button type="button" className="uber-checkout-btn" onClick={() => setCheckoutStage('payment')} disabled={!checkoutReady}>Continue to pay</button>
                  )}
                </div>
              </>
            )}

            {checkoutStage === 'payment' && (
              <>
                <div className="uber-cart-title-block compact-cart-title-block">
                  <h2>Payment</h2>
                  <p>Add a card and confirm your order.</p>
                </div>

                <div className="checkout-payment-card">
                  <div className="section-head-simple">
                    <strong>Payment method</strong>
                    <span>{paymentCard.brand}</span>
                  </div>
                  <div className="checkout-profile-mini-card">
                    <strong>{customerProfile.fullName || 'No account name saved yet'}</strong>
                    <span>{customerProfile.email || 'Add an email in Account'}</span>
                  </div>
                  {fulfillmentType === 'delivery' ? (
                    <label className="checkout-input-row">
                      <span>Delivery address</span>
                      <select value={selectedAddressId} onChange={(event) => setSelectedAddressId(event.target.value)}>
                        <option value="">Choose an address</option>
                        {customerProfile.addresses.map((address) => <option key={address.id} value={address.id}>{address.label} · {address.line1}</option>)}
                      </select>
                    </label>
                  ) : (
                    <div className="checkout-inline-status-card">
                      <span className="label">Pickup</span>
                      <strong>{selectedPickupSlot ? formatPickupWindow(selectedPickupSlot) : 'Pickup time not selected'}</strong>
                      <p>{activeCartGroup?.shopName || checkoutShopLabel}</p>
                    </div>
                  )}
                  <label className="checkout-input-row">
                    <span>Name on card</span>
                    <input type="text" value={paymentCard.name} placeholder="Enter the cardholder name" onChange={(event) => setPaymentCard((current) => ({ ...current, name: event.target.value }))} />
                  </label>
                  <label className="checkout-input-row">
                    <span>Card ending in</span>
                    <input type="text" value={paymentCard.last4} placeholder="Last 4 digits" maxLength={4} onChange={(event) => setPaymentCard((current) => ({ ...current, last4: event.target.value.replace(/\D/g, '').slice(0, 4) }))} />
                  </label>
                  {!!customerProfile.cards.length && (
                    <div className="saved-cards-stack">
                      {customerProfile.cards.map((card) => <button key={card.id} type="button" className="saved-card-chip" onClick={() => setPaymentCard({ name: card.name, last4: card.last4, brand: card.brand })}>{card.brand} •••• {card.last4}</button>)}
                    </div>
                  )}
                </div>

                <div className="checkout-summary-card compact-payment-summary">
                  <div className="checkout-price-row"><span>Subtotal</span><strong>{formatMoney(cartSubtotal)}</strong></div>
                  <div className="checkout-price-row"><span>Delivery fee</span><strong>{formatMoney(deliveryFee)}</strong></div>
                  <div className="checkout-price-row"><span>Service fee</span><strong>{formatMoney(serviceFee)}</strong></div>
                  <div className="checkout-price-row"><span>GST / HST</span><strong>${gstHst.toFixed(2)}</strong></div>
                  <div className="checkout-price-row total"><span>Charge today</span><strong>${checkoutTotal.toFixed(2)}</strong></div>
                </div>

                <div className="uber-cart-footer dual-action-footer">
                  <button type="button" className="cta secondary" onClick={() => setCheckoutStage('summary')}>Back</button>
                  <button type="button" className="uber-checkout-btn" onClick={submitCartOrder} disabled={!checkoutReady || uiState.submitting || !paymentCard.name.trim() || paymentCard.last4.length !== 4}>{uiState.submitting ? 'Submitting...' : `Pay $${checkoutTotal.toFixed(2)}`}</button>
                </div>
              </>
            )}

            {checkoutStage === 'placed' && (
              <>
                <div className="uber-cart-title-block placed-order-head">
                  <h2>Order confirmed</h2>
                  <p>Your order is in. Here is the full confirmation.</p>
                </div>

                <div className="live-map-card">
                  <div className="section-head-simple">
                    <strong>Order progress</strong>
                    <span>{(latestPlacedOrder?.fulfillment || fulfillmentType) === 'delivery' ? 'Delivery route' : 'Pickup timeline'}</span>
                  </div>
                  <div className="live-map-route">
                    <div className="live-map-dots" />
                    <div className="live-map-arrow">➜</div>
                  </div>
                  <div className="live-map-stops">
                    {liveMapStops.map((stop) => (
                      <div key={stop.id} className={`live-map-stop ${stop.side}`}>
                        <div className="live-map-pin" />
                        <strong>{stop.label}</strong>
                        <span>{stop.detail}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="checkout-summary-card">
                  <div className="section-head-simple">
                    <strong>Final order</strong>
                    <span>{latestPlacedOrder?.shopLabel || checkoutShopLabel}</span>
                  </div>
                  <div className="checkout-price-row"><span>Order ID</span><strong>{latestPlacedOrder?.id || 'Pending'}</strong></div>
                  <div className="checkout-price-row"><span>Total paid</span><strong>${Number(latestPlacedOrder?.total || checkoutTotal).toFixed(2)}</strong></div>
                  <div className="checkout-price-row"><span>{(latestPlacedOrder?.fulfillment || fulfillmentType) === 'delivery' ? 'Delivery address' : 'Pickup window'}</span><strong>{(latestPlacedOrder?.fulfillment || fulfillmentType) === 'delivery' ? (latestPlacedOrder?.address?.line1 || selectedAddress?.line1 || 'No address') : (latestPlacedOrder?.pickupSlot ? formatPickupWindow(latestPlacedOrder.pickupSlot) : (selectedPickupSlot ? formatPickupWindow(selectedPickupSlot) : 'Pending'))}</strong></div>
                  <div className="checkout-price-row"><span>Fulfillment</span><strong>{formatStatus(latestPlacedOrder?.fulfillment || fulfillmentType)}</strong></div>
                  <div className="checkout-price-row"><span>Card used</span><strong>{latestPlacedOrder?.card?.brand || paymentCard.brand} •••• {latestPlacedOrder?.card?.last4 || paymentCard.last4 || 'Pending'}</strong></div>
                </div>

                <div className="uber-cart-footer dual-action-footer">
                  <button type="button" className="cta secondary" onClick={() => setView('saved')}>View orders</button>
                  <button type="button" className="uber-checkout-btn" onClick={() => {
                    setCheckoutStage('summary')
                    setView('builder')
                    setBuilderScreen('store-menu')
                  }}>Back to store</button>
                </div>
              </>
            )}
          </section>
        )}

        {view === 'accounts' && (
          <section className="screen-card profile-menu-screen">
            <div className="profile-menu-head cleaner-profile-head">
              <h2>Account</h2>
              <p className="screen-subcopy">Manage your details, addresses, and payments.</p>
            </div>

            {profileSection === 'profile' && (
              <div className="list-card cleaner-profile-list">
                <button type="button" className="cleaner-profile-row" onClick={() => setProfileSection('details')}>
                  <div>
                    <strong>Full name</strong>
                    <span>{customerProfile.fullName || accountSessions.customer?.name || DEFAULT_CUSTOMER_NAME}</span>
                  </div>
                  <em>›</em>
                </button>
                <button type="button" className="cleaner-profile-row" onClick={() => setProfileSection('email')}>
                  <div>
                    <strong>Email</strong>
                    <span>{customerProfile.email}</span>
                  </div>
                  <em>›</em>
                </button>
                <button type="button" className="cleaner-profile-row" onClick={() => setProfileSection('addresses')}>
                  <div>
                    <strong>Addresses</strong>
                    <span>{customerProfile.addresses.length ? `${customerProfile.addresses.length} saved` : 'Add your first address'}</span>
                  </div>
                  <em>›</em>
                </button>
                <button type="button" className="cleaner-profile-row" onClick={() => setProfileSection('payments')}>
                  <div>
                    <strong>Payment methods</strong>
                    <span>{customerProfile.cards.length ? `${customerProfile.cards.length} saved` : 'Add your first card'}</span>
                  </div>
                  <em>›</em>
                </button>
                <button type="button" className="cleaner-profile-row" onClick={() => setProfileSection('orders')}>
                  <div>
                    <strong>Orders</strong>
                    <span>{cartItemCount ? `${cartItemCount} in cart` : `${customerOrders.length} past orders`}</span>
                  </div>
                  <em>›</em>
                </button>
                <button type="button" className="cleaner-profile-row" onClick={() => setProfileSection('saved')}>
                  <div>
                    <strong>Saved cakes</strong>
                    <span>{savedDesigns.length ? `${savedDesigns.length} saved` : 'No saved cakes yet'}</span>
                  </div>
                  <em>›</em>
                </button>
                <button type="button" className="cleaner-profile-row" onClick={() => setProfileSection('settings')}>
                  <div>
                    <strong>Settings</strong>
                    <span>Notifications and checkout preferences</span>
                  </div>
                  <em>›</em>
                </button>
                <button type="button" className="cleaner-profile-row" onClick={() => setProfileSection('help')}>
                  <div>
                    <strong>Help</strong>
                    <span>Support, pickup, refunds</span>
                  </div>
                  <em>›</em>
                </button>
                <button type="button" className="cleaner-profile-row" onClick={() => setProfileSection('security')}>
                  <div>
                    <strong>Logout</strong>
                    <span>{authTokens.customer ? 'Signed in' : 'Reconnect your account'}</span>
                  </div>
                  <em>›</em>
                </button>
              </div>
            )}

            {profileSection === 'details' && <div className="list-card profile-detail-card cleaner-profile-detail-card">
              <div className="cleaner-profile-subhead">
                <button type="button" className="pill" onClick={() => setProfileSection('profile')}>Back</button>
                <strong>Full name</strong>
              </div>
              <div className="list-row"><span>Name</span><strong>{customerProfile.fullName}</strong></div>
            </div>}

            {profileSection === 'email' && <div className="list-card profile-detail-card cleaner-profile-detail-card">
              <div className="cleaner-profile-subhead">
                <button type="button" className="pill" onClick={() => setProfileSection('profile')}>Back</button>
                <strong>Email</strong>
              </div>
              <div className="list-row"><span>Primary email</span><strong>{customerProfile.email}</strong></div>
            </div>}

            {profileSection === 'addresses' && <div className="list-card profile-detail-card cleaner-profile-detail-card">
              <div className="cleaner-profile-subhead">
                <button type="button" className="pill" onClick={() => setProfileSection('profile')}>Back</button>
                <strong>Addresses</strong>
              </div>
              {customerProfile.addresses.map((address) => (
                <button key={address.id} type="button" className={selectedAddressId === address.id ? 'profile-saved-row active' : 'profile-saved-row'} onClick={() => setSelectedAddressId(address.id)}>
                  <div>
                    <strong>{address.label}</strong>
                    <span>{address.line1}</span>
                  </div>
                  <em>{selectedAddressId === address.id ? 'Selected' : 'Use'}</em>
                </button>
              ))}
              <div className="profile-form-grid">
                <label className="checkout-input-row">
                  <span>Label</span>
                  <input type="text" value={addressDraft.label} onChange={(event) => setAddressDraft((current) => ({ ...current, label: event.target.value }))} placeholder="Home, Work, Mom's place" />
                </label>
                <label className="checkout-input-row">
                  <span>Delivery address</span>
                  <input type="text" value={addressDraft.line1} onChange={(event) => setAddressDraft((current) => ({ ...current, line1: event.target.value }))} placeholder="1234 Main St, Vancouver, BC" />
                </label>
                <label className="checkout-input-row">
                  <span>Delivery notes</span>
                  <input type="text" value={addressDraft.instructions} onChange={(event) => setAddressDraft((current) => ({ ...current, instructions: event.target.value }))} placeholder="Buzz 204, leave at concierge" />
                </label>
                <button type="button" className="pill active" onClick={addProfileAddress} disabled={uiState.updating || !addressDraft.label.trim() || !addressDraft.line1.trim()}>Save address</button>
              </div>
            </div>}

            {profileSection === 'payments' && <div className="list-card profile-detail-card cleaner-profile-detail-card">
              <div className="cleaner-profile-subhead">
                <button type="button" className="pill" onClick={() => setProfileSection('profile')}>Back</button>
                <strong>Payment methods</strong>
              </div>
              {customerProfile.cards.map((card) => (
                <button key={card.id} type="button" className="profile-saved-row" onClick={() => setPaymentCard({ brand: card.brand, last4: card.last4, name: card.name })}>
                  <div>
                    <strong>{card.brand} •••• {card.last4}</strong>
                    <span>{card.name}</span>
                  </div>
                  <em>Use</em>
                </button>
              ))}
              <div className="profile-form-grid compact">
                <label className="checkout-input-row">
                  <span>Brand</span>
                  <select value={cardDraft.brand} onChange={(event) => setCardDraft((current) => ({ ...current, brand: event.target.value }))}>
                    <option value="Visa">Visa</option>
                    <option value="Mastercard">Mastercard</option>
                    <option value="Amex">Amex</option>
                  </select>
                </label>
                <label className="checkout-input-row">
                  <span>Last 4</span>
                  <input type="text" value={cardDraft.last4} maxLength={4} onChange={(event) => setCardDraft((current) => ({ ...current, last4: event.target.value.replace(/\D/g, '').slice(0, 4) }))} placeholder="4242" />
                </label>
                <label className="checkout-input-row">
                  <span>Name on card</span>
                  <input type="text" value={cardDraft.name} onChange={(event) => setCardDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Emma Johnson" />
                </label>
                <button type="button" className="pill active" onClick={addProfileCard} disabled={uiState.updating || !cardDraft.name.trim() || cardDraft.last4.length !== 4}>Save card</button>
              </div>
            </div>}

            {profileSection === 'orders' && <div className="list-card profile-detail-card cleaner-profile-detail-card">
              <div className="cleaner-profile-subhead">
                <button type="button" className="pill" onClick={() => setProfileSection('profile')}>Back</button>
                <strong>Orders</strong>
              </div>
              <div className="list-row"><span>Items in cart</span><strong>{cartItemCount}</strong></div>
              <div className="list-row"><span>Order history</span><strong>{customerOrders.length}</strong></div>
              <div className="list-row"><span>Latest order</span><strong>{customerOrderSummary}</strong></div>
              {latestPlacedOrder ? <div className="list-row"><span>Last payment</span><strong>{latestPlacedOrder.card.brand} •••• {latestPlacedOrder.card.last4}</strong></div> : null}
              <div className="profile-stack-block">
                {(customerOrders.slice(0, 5)).map((order) => (
                  <div key={order.id} className="profile-saved-row static">
                    <div>
                      <strong>{order.shop?.name || order.shopId || 'Cake order'}</strong>
                      <span>{formatStatus(order.fulfillment)} · ${Number(order.total || 0).toFixed(2)}</span>
                    </div>
                    <em>{formatStatus(order.status)}</em>
                  </div>
                ))}
                {!customerOrders.length ? <p className="mini-note">No past orders yet.</p> : null}
              </div>
              <div className="pill-row">
                <button type="button" className="pill active" onClick={() => setView('saved')}>Open orders</button>
              </div>
            </div>}

            {profileSection === 'saved' && <div className="list-card profile-detail-card cleaner-profile-detail-card">
              <div className="cleaner-profile-subhead">
                <button type="button" className="pill" onClick={() => setProfileSection('profile')}>Back</button>
                <strong>Saved cakes</strong>
              </div>
              {sortedSavedDesigns.slice(0, 4).map((design) => (
                <div key={design.id} className="list-row"><span>{design.title}</span><strong>{formatMoney(design.estimatedTotal || totalPrice)}</strong></div>
              ))}
              {!sortedSavedDesigns.length ? <p className="mini-note">No saved cakes yet.</p> : null}
            </div>}

            {profileSection === 'settings' && <div className="list-card profile-detail-card cleaner-profile-detail-card">
              <div className="cleaner-profile-subhead">
                <button type="button" className="pill" onClick={() => setProfileSection('profile')}>Back</button>
                <strong>Settings</strong>
              </div>
              <div className="list-row"><span>Notifications</span><strong>Order updates and promos</strong></div>
              <div className="list-row"><span>Fulfillment preferences</span><strong>{fulfillmentType === 'delivery' ? 'Delivery-first checkout' : 'Pickup-first checkout'}</strong></div>
              <div className="list-row"><span>Accessibility</span><strong>Readable text and comfort</strong></div>
            </div>}

            {profileSection === 'help' && <div className="list-card profile-detail-card cleaner-profile-detail-card">
              <div className="cleaner-profile-subhead">
                <button type="button" className="pill" onClick={() => setProfileSection('profile')}>Back</button>
                <strong>Help</strong>
              </div>
              {helpActions.map((item) => (
                <div key={item} className="list-row"><span>{item}</span><strong>Available</strong></div>
              ))}
            </div>}

            {profileSection === 'security' && <div className="list-card profile-detail-card cleaner-profile-detail-card">
              <div className="cleaner-profile-subhead">
                <button type="button" className="pill" onClick={() => setProfileSection('profile')}>Back</button>
                <strong>Logout</strong>
              </div>
              <div className="list-row"><span>Status</span><strong>{authTokens.customer ? 'Connected' : 'Needs reconnect'}</strong></div>
              <div className="list-row"><span>Device</span><strong>{sessionMeta.customer?.deviceLabel || 'This browser'}</strong></div>
              <div className="pill-row">
                {authTokens.customer ? (
                  <button type="button" className="pill active" onClick={handleCustomerLogout} disabled={uiState.authUpdating}>{uiState.authUpdating ? 'Logging out...' : 'Logout'}</button>
                ) : (
                  <button type="button" className="pill active" onClick={() => toggleDemoSession('customer')} disabled={uiState.authUpdating}>{uiState.authUpdating ? 'Reconnecting...' : 'Reconnect'}</button>
                )}
              </div>
            </div>}
          </section>
        )}

        {view === 'saved' && (
          <section className="screen-card orders-screen-minimal">
            <div className="store-cart-list">
              {!cartGroups.length ? (
                <div className="list-card">
                  <p>Your cart is empty right now.</p>
                </div>
              ) : cartGroups.map((group) => {
                const groupSubtotal = group.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0)
                return (
                  <div key={group.shopId} className="store-cart-card list-card uber-orders-card">
                    <div className="uber-orders-card-top">
                      <div className="uber-orders-thumb"><span>Cake</span></div>
                      <div className="uber-orders-copy">
                        <h3>{group.items[0]?.title || group.shopName}</h3>
                        <p>{group.shopName}</p>
                        <span>{group.items.length} item{group.items.length === 1 ? '' : 's'} · {formatMoney(groupSubtotal)}</span>
                      </div>
                    </div>
                    <button type="button" className="uber-orders-main-btn" onClick={() => openCartGroup(group.shopId)}>View cart</button>
                    <button type="button" className="uber-orders-secondary-btn" onClick={() => {
                      setCustomerShopId(group.shopId)
                      setBuilderScreen('store-menu')
                      setView('builder')
                    }}>View store</button>
                  </div>
                )
              })}
            </div>

          </section>
        )}

        {view === 'owner' && (
          <section className="screen-card">
            <div>
              <p className="eyebrow">Owner and platform operations</p>
              <h2>Owner dashboard</h2>
              <p className="screen-subcopy">This screen is now wired to backend summary, queue, order detail, pickup slots, and notifications.</p>
            </div>

            <div className="summary-strip owner-summary">
              <div><span>Shop</span><strong>{activeOwnerLocation?.name || 'Demo Cake Studio'}</strong></div>
              <div><span>Orders today</span><strong>{ownerSummary.total}</strong></div>
              <div><span>Needs attention</span><strong>{queueHealth.needsAttention}</strong></div>
              <div><span>Status</span><strong>{queueHealth.needsAttention ? 'Action queue open' : 'Healthy ops'}</strong></div>
            </div>

            <div className="pill-row compact">
              {ownerLocations.map((location) => (
                <button key={`${location.id}-owner-panel`} type="button" className={activeOwnerLocationId === location.id ? 'pill active' : 'pill'} onClick={() => setActiveOwnerLocationId(location.id)}>{location.name}</button>
              ))}
            </div>
            <p className="mini-note">Owner summary, queue, and pickup slots now follow the selected bakery location instead of staying pinned to the default shop.</p>

            <div className="grid-cards">
              {ownerModules.map((module) => (
                <div key={module.title} className="list-card">
                  <div className="module-head">
                    <h3>{module.title}</h3>
                    <strong>{module.metric}</strong>
                  </div>
                  {module.items.map((item) => <p key={item}>{item}</p>)}
                </div>
              ))}
            </div>

            <div className="grid-cards pillar-grid">
              <div className="list-card">
                <div className="editor-head">
                  <div>
                    <span className="label">Order detail</span>
                    <strong>{ownerOrder ? `${ownerOrder.id} · ${formatStatus(ownerOrder.status)}` : 'No live order selected'}</strong>
                  </div>
                  <span className="mini-note">Live operations</span>
                </div>
                {ownerOrder ? <><div className="list-row"><span>Customer</span><strong>{ownerOrder.customer}</strong></div><div className="list-row"><span>Cake</span><strong>{ownerOrder.savedDesign?.title || toDesignSummary(ownerOrder.designSnapshot)}</strong></div><div className="list-row"><span>Pickup</span><strong>{ownerOrder.pickupSlot?.label || 'No slot'}</strong></div><div className="list-row"><span>Assigned staff</span><strong>{ownerOrder.assignedStaff?.name || 'Unassigned'}</strong></div><div className="list-row"><span>Support status</span><strong>{formatStatus(ownerOrder.supportStatus || 'monitoring')}</strong></div><div className="list-row"><span>Refund status</span><strong>{formatStatus(ownerOrder.refundStatus || 'not_requested')}</strong></div><div className="list-row"><span>Notes</span><strong>{ownerOrder.notes || 'No operator notes yet'}</strong></div><div className="list-row"><span>Operational risk</span><strong>{selectedOrderException || 'No active exception'}</strong></div><div className="list-row"><span>Attention flags</span><strong>{ownerOrder.attentionFlags?.length ? ownerOrder.attentionFlags.map((item) => item.replaceAll('_', ' ')).join(', ') : 'No queue flags'}</strong></div><div className="list-row"><span>Latest workflow events</span><strong>{selectedOrderNotifications.length || 0}</strong></div><div className="list-row"><span>Pickup completion</span><strong>{ownerOrder.pickupCompletion?.completedAt ? `Logged ${new Date(ownerOrder.pickupCompletion.completedAt).toLocaleString()}` : 'Waiting for handoff'}</strong></div><div className="list-row"><span>Pickup actor</span><strong>{ownerOrder.pickupCompletion?.actorRole ? `${formatStatus(ownerOrder.pickupCompletion.actorRole)} ${ownerOrder.pickupCompletion.actorId || ''}`.trim() : 'Not captured yet'}</strong></div></> : <p>No orders loaded from backend yet.</p>}
              </div>

              <div className="list-card">
                <div className="editor-head">
                  <div>
                    <span className="label">Status actions</span>
                    <strong>Next operator move</strong>
                  </div>
                  <span className="mini-note">Staff / owner tools</span>
                </div>
                <div className="pill-row">
                  {orderActions.map((action) => (
                    <button key={action.status} type="button" className={selectedOrderStatus === action.status ? 'pill active' : 'pill'} onClick={() => setSelectedOrderStatus(action.status)}>{action.label}</button>
                  ))}
                </div>
                <div className="list-row"><span>Selected action</span><strong>{formatStatus(selectedOrderStatus)}</strong></div>
                <label className="list-row"><span>Ops notes</span><input type="text" value={ownerOpsDraft.notes} onChange={(event) => setOwnerOpsDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Pickup notes, cancellation reason, support context" /></label>
                <label className="list-row"><span>Assigned staff</span><select value={ownerOpsDraft.assignedStaffId} onChange={(event) => setOwnerOpsDraft((current) => ({ ...current, assignedStaffId: event.target.value }))}><option value="">Unassigned</option><option value="owner-1">Maya Chen · Owner</option>{ownerStaffOptions.map((staff) => <option key={staff.id} value={staff.id}>{staff.label}</option>)}</select></label>
                <label className="list-row"><span>Pickup slot</span><select value={ownerOpsDraft.pickupSlotId} onChange={(event) => setOwnerOpsDraft((current) => ({ ...current, pickupSlotId: event.target.value }))}>{sortedOwnerPickupSlots.map((slot) => <option key={slot.id} value={slot.id}>{slot.label} · {slot.booked}/{slot.capacity}</option>)}</select></label>
                <button type="button" className="cta secondary" onClick={saveOwnerOperations} disabled={!ownerOrder || uiState.updating || !authTokens.owner || ownerOrder?.status === 'picked_up'}>{uiState.updating ? 'Updating...' : 'Save owner ops'}</button>
                <button type="button" className="cta" onClick={updateOwnerOrderStatus} disabled={!ownerOrder || uiState.updating || !authTokens.owner || ownerOrder?.status === 'picked_up'}>{uiState.updating ? 'Updating...' : 'Apply status update'}</button>
                <button type="button" className="cta secondary" onClick={completeOwnerPickup} disabled={!ownerOrder || uiState.updating || !authTokens.owner || ownerOrder?.status !== 'ready'}>{uiState.updating ? 'Updating...' : 'Complete pickup handoff'}</button>
                <button type="button" className="cta secondary" onClick={cancelOwnerOrder} disabled={!ownerOrder || uiState.updating || !authTokens.owner || ['picked_up', 'cancelled'].includes(ownerOrder?.status)}>{uiState.updating ? 'Updating...' : 'Cancel order and release slot'}</button>
                <div className="pill-row">
                  <button type="button" className="pill" onClick={() => flagOwnerException('support')} disabled={!ownerOrder || uiState.updating || !authTokens.owner || ownerOrder?.status === 'picked_up'}>Escalate support</button>
                  <button type="button" className="pill" onClick={() => flagOwnerException('refund')} disabled={!ownerOrder || uiState.updating || !authTokens.owner || ownerOrder?.status === 'picked_up'}>Request refund review</button>
                  <button type="button" className="pill" onClick={addOwnerExceptionNote} disabled={!ownerOrder || uiState.updating || !authTokens.owner}>Post exception follow-up</button>
                </div>
                <p className="mini-note">Picked up now uses the explicit backend completion endpoint so the owner panel records handoff metadata instead of treating pickup like a generic status jump.</p>
              </div>
            </div>

            <div className="grid-cards pillar-grid">
              <div className="list-card">
                <div className="editor-head">
                  <div>
                    <span className="label">Owner queue</span>
                    <strong>Live grouped orders</strong>
                  </div>
                  <span className="mini-note">Queue endpoint</span>
                </div>
                <div className="list-row"><span>New</span><strong>{ownerQueue.newOrders.length}</strong></div>
                <div className="list-row"><span>In production</span><strong>{ownerQueue.inProduction.length}</strong></div>
                <div className="list-row"><span>Ready</span><strong>{ownerQueue.ready.length}</strong></div>
                <div className="list-row"><span>Picked up</span><strong>{ownerQueue.pickedUp.length}</strong></div>
                <div className="list-row"><span>Cancelled</span><strong>{ownerQueue.cancelled.length}</strong></div>
                <div className="list-row"><span>Exceptions</span><strong>{queueHealth.exceptions.length}</strong></div>
                <div className="list-row"><span>Support-dispute flags</span><strong>{ownerQueue.attentionCounts?.support_dispute_open || 0}</strong></div>
                <div className="list-row"><span>Unassigned production</span><strong>{ownerQueue.attentionCounts?.staff_unassigned || 0}</strong></div>
                {ownerQueueItems.map((item) => {
                  const exception = getExceptionLabel(item)
                  return (
                    <button key={item.id} type="button" className={ownerOrderId === item.id ? 'pill active' : 'pill'} onClick={() => setOwnerOrderId(item.id)}>
                      {item.queueSection}: {item.customer} · {item.pickupSlot?.label || formatStatus(item.status)}{exception ? ` · ${exception}` : ''}
                    </button>
                  )
                })}
              </div>

              <div className="list-card">
                <div className="editor-head">
                  <div>
                    <span className="label">Pickup slots</span>
                    <strong>Live capacity</strong>
                  </div>
                  <span className="mini-note">Pickup-slot endpoint</span>
                </div>
                {sortedOwnerPickupSlots.map((slot) => {
                  const remaining = slot.capacity - slot.booked
                  return (
                    <div key={slot.id} className="list-card">
                      <div className="list-row"><span>{slot.label}</span><strong>{slot.booked}/{slot.capacity}</strong></div>
                      <div className="list-row"><span>Remaining</span><strong>{remaining}</strong></div>
                      <div className="list-row"><span>Operational state</span><strong>{slot.operatorState ? formatStatus(slot.operatorState) : remaining <= 0 ? 'Full, move orders forward fast' : slot.active ? 'Accepting pickup volume' : 'Paused'}</strong></div>
                      <div className="list-row"><span>Paused reason</span><strong>{slot.pauseReason || 'Not paused'}</strong></div>
                      <div className="list-row"><span>Impacted live orders</span><strong>{ownerQueueItems.filter((item) => item.pickupSlotId === slot.id && !['picked_up', 'cancelled'].includes(item.status)).length}</strong></div>
                      <label className="list-row"><span>Capacity</span><input type="number" min={slot.booked} value={pickupSlotDrafts[slot.id]?.capacity ?? slot.capacity} onChange={(event) => setPickupSlotDrafts((current) => ({ ...current, [slot.id]: { ...(current[slot.id] || {}), capacity: event.target.value, active: current[slot.id]?.active ?? slot.active } }))} /></label>
                      <label className="list-row"><span>Active</span><input type="checkbox" checked={pickupSlotDrafts[slot.id]?.active ?? slot.active} onChange={(event) => setPickupSlotDrafts((current) => ({ ...current, [slot.id]: { ...(current[slot.id] || {}), capacity: current[slot.id]?.capacity ?? slot.capacity, active: event.target.checked } }))} /></label>
                      <button type="button" className="pill" onClick={() => updatePickupSlot(slot.id)} disabled={!authTokens.owner || uiState.updating}>Save slot</button>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="grid-cards pillar-grid">
              <div className="list-card">
                <div className="editor-head">
                  <div>
                    <span className="label">Notifications</span>
                    <strong>Order workflow</strong>
                  </div>
                  <span className="mini-note">Notification events</span>
                </div>
                {notifications.length === 0 ? <p>No notifications for the selected order yet.</p> : notifications.map((item) => <div key={item.id} className="list-row"><span>{formatStatus(item.type)}</span><strong>{formatStatus(item.status)}</strong></div>)}
                <div className="stage-row">
                  {workflowStages.map((stage) => <div key={stage} className="stage-pill">{stage}</div>)}
                </div>
              </div>

              <div className="list-card">
                <div className="editor-head">
                  <div>
                    <span className="label">Support and admin exceptions</span>
                    <strong>Operational gaps surfaced</strong>
                  </div>
                  <span className="mini-note">Queue triage</span>
                </div>
                <div className="list-row"><span>Exception orders</span><strong>{queueHealth.exceptions.length}</strong></div>
                <div className="list-row"><span>Staff summary access</span><strong>{accountAccess.staffQueue.total} visible orders</strong></div>
                <div className="list-row"><span>Admin shop visibility</span><strong>{accountAccess.adminShops.length} shops</strong></div>
                <div className="list-row"><span>Open disputes</span><strong>{adminDisputes.filter((item) => item.status === 'open').length}</strong></div>
                {queueHealth.exceptions.length === 0 ? <p>No queue exceptions are surfaced right now.</p> : queueHealth.exceptions.slice(0, 4).map((item) => <div key={item.id} className="list-row"><span>{item.customer}</span><strong>{getExceptionLabel(item)}</strong></div>)}
                {adminDisputes.slice(0, 3).map((item) => <div key={item.id} className="list-card"><div className="list-row"><span>{item.reason}</span><strong>{formatStatus(item.status)}</strong></div><div className="list-row"><span>Refund</span><strong>{formatStatus(item.refundStatus || 'not_requested')}</strong></div><div className="list-row"><span>Assigned admin</span><strong>{item.assignedAdmin?.name || 'Unassigned'}</strong></div><div className="list-row"><span>Latest thread update</span><strong>{item.lastMessagePreview || item.resolution || 'No thread yet'}</strong></div><div className="mini-note">{(item.messages || []).length} thread entries</div>{(item.messages || []).slice(-3).map((message) => <div key={message.id} className="list-row"><span>{formatStatus(message.authorRole || 'system')}</span><strong>{message.body}</strong></div>)}<label className="list-row"><span>Assign admin</span><select value={adminAssignmentDrafts[item.id] || ''} onChange={(event) => setAdminAssignmentDrafts((current) => ({ ...current, [item.id]: event.target.value }))}><option value="">Unassigned</option>{accountAccess.adminTeam.map((adminMember) => <option key={adminMember.id} value={adminMember.id}>{adminMember.name}</option>)}</select></label><label className="list-row"><span>Add thread reply</span><input type="text" value={adminDisputeDrafts[item.id] || ''} onChange={(event) => setAdminDisputeDrafts((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="Internal note or customer-facing reply" /></label><div className="pill-row"><button type="button" className="pill" onClick={() => assignAdminDispute(item.id)} disabled={!authTokens.admin || uiState.updating}>Save assignment</button><button type="button" className="pill" onClick={() => addAdminDisputeMessage(item.id)} disabled={!authTokens.admin || uiState.updating}>Post internal note</button><button type="button" className="pill" onClick={() => addAdminDisputeMessage(item.id, 'customer')} disabled={!authTokens.admin || uiState.updating}>Reply to customer</button><button type="button" className="pill" onClick={() => resolveAdminDispute(item.id, 'resolved')} disabled={!authTokens.admin || uiState.updating || item.status === 'resolved'}>Resolve</button><button type="button" className="pill" onClick={() => resolveAdminDispute(item.id, 'escalated')} disabled={!authTokens.admin || uiState.updating || item.status === 'escalated'}>Escalate</button><button type="button" className="pill" onClick={() => handleAdminRefundDecision(item, 'approved')} disabled={!authTokens.admin || uiState.updating || item.refundStatus === 'refunded'}>Approve refund</button><button type="button" className="pill" onClick={() => handleAdminRefundDecision(item, 'rejected')} disabled={!authTokens.admin || uiState.updating || item.refundStatus === 'rejected'}>Reject refund</button></div></div>)}
              </div>
            </div>

            <div className="grid-cards pillar-grid">
              {pillarCards.map((pillar) => (
                <div key={pillar.title} className="list-card">
                  <div className="module-head">
                    <h3>{pillar.title}</h3>
                    <strong>{pillar.status}</strong>
                  </div>
                  {pillar.bullets.map((bullet) => <p key={bullet}>{bullet}</p>)}
                </div>
              ))}
            </div>

            <div className="list-card">
              <div className="editor-head">
                <div>
                  <span className="label">Platform admin portal</span>
                  <strong>What the SaaS operator controls</strong>
                </div>
                <span className="mini-note">Admin layer</span>
              </div>
              <div className="pill-row">
                {adminModules.map((item) => <span key={item} className="pill static-pill">{item}</span>)}
              </div>
            </div>
          </section>
        )}
        </div>

        {view === 'home' ? null : null}
        <nav className="bottom-tab-bar">
          {mainTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={view === tab.id ? 'bottom-tab active' : 'bottom-tab'}
              onClick={() => setView(tab.id)}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}

function lookupPrice(group, label) {
  return optionSets[group].find((item) => item.label === label)?.price || 0
}

function OptionSelect({ label, value, options, onChange }) {
  return (
    <div className="option-card chip-option-card">
      <span>{label}</span>
      <div className="option-chip-grid">
        {options.map((option) => {
          const active = option.label === value
          return (
            <button
              key={option.label}
              type="button"
              className={active ? 'option-chip active' : 'option-chip'}
              onClick={() => onChange(option.label)}
            >
              <strong>{option.label}</strong>
              <small>{option.price ? `+$${option.price}` : 'Included'}</small>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default App
