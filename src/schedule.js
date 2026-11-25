// Order-ahead dates. All dates are 'YYYY-MM-DD' in Vancouver time.

export const TZ = 'America/Vancouver'
export const DEFAULT_TIMES = ['10:00', '13:00', '16:00']
export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const NOTICE_OPTIONS = [
  { hours: 0, label: 'Same as shop' },
  { hours: 24, label: '1 day' },
  { hours: 48, label: '2 days' },
  { hours: 72, label: '3 days' },
  { hours: 120, label: '5 days' },
  { hours: 168, label: '1 week' },
  { hours: 336, label: '2 weeks' },
  { hours: 504, label: '3 weeks' },
]

const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })

export function vanDate(date = new Date()) {
  return dayFormat.format(date)
}

export function addDays(day, count) {
  const [y, m, d] = day.split('-').map(Number)
  const next = new Date(Date.UTC(y, m - 1, d + count))
  return next.toISOString().slice(0, 10)
}

export function weekday(day) {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

// Vancouver wall-clock time -> real moment.
export function vanMoment(day, time) {
  const [y, m, d] = day.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  const guess = Date.UTC(y, m - 1, d, hh, mm)
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' })
    .formatToParts(new Date(guess)).map((part) => [part.type, part.value]))
  const shown = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour) % 24, Number(parts.minute))
  return new Date(guess - (shown - guess))
}

export function timeLabel(time) {
  const [hh, mm] = time.split(':').map(Number)
  const suffix = hh >= 12 ? 'PM' : 'AM'
  const hour = hh % 12 || 12
  return mm ? `${hour}:${String(mm).padStart(2, '0')} ${suffix}` : `${hour} ${suffix}`
}

export function dateLabel(day, long = false) {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('en-CA', { timeZone: 'UTC', weekday: long ? 'long' : 'short', month: 'short', day: 'numeric' })
}

export function noticeLabel(hours) {
  if (!hours) return ''
  if (hours < 24) return `${hours} hours notice`
  const days = Math.round(hours / 24)
  if (days % 7 === 0 && days >= 7) return `${days / 7} week${days === 7 ? '' : 's'} notice`
  return `${days} day${days === 1 ? '' : 's'} notice`
}

export function scheduleOf(shop) {
  return {
    leadHours: Number(shop?.leadHours) || 24,
    closedDays: shop?.closedDays || [],
    blockedDates: shop?.blockedDates || [],
    capacity: shop?.dailyCapacity || null,
    times: shop?.pickupTimes?.length ? [...shop.pickupTimes].sort() : DEFAULT_TIMES,
  }
}

// Notice an item needs: its own setting, else the build-your-own setting, else the shop's.
export function leadFor(item, shop) {
  const base = Number(shop?.leadHours) || 24
  if (!item) return base
  if (item.config?.mode === 'preset') {
    const menuItem = (shop?.menu || []).find((entry) => entry.id === item.config.presetId)
    return Number(menuItem?.leadHours) || base
  }
  return Number(shop?.builder?.leadHours) || base
}

export function timesOn(day, shop, leadHours, now = Date.now()) {
  const { times } = scheduleOf(shop)
  const earliest = now + leadHours * 3600 * 1000
  return times.filter((time) => vanMoment(day, time).getTime() >= earliest)
}

// 'ok' | 'too_soon' | 'closed' | 'blocked' | 'full'
export function dayStatus(day, shop, leadHours, load = {}, now = Date.now()) {
  const s = scheduleOf(shop)
  if (!timesOn(day, shop, leadHours, now).length) return 'too_soon'
  if (s.closedDays.includes(weekday(day))) return 'closed'
  if (s.blockedDates.includes(day)) return 'blocked'
  if (s.capacity && (load[day] || 0) >= s.capacity) return 'full'
  return 'ok'
}

export function earliestDay(shop, leadHours, load = {}, now = Date.now()) {
  let day = vanDate(new Date(now))
  for (let i = 0; i < 180; i += 1) {
    if (dayStatus(day, shop, leadHours, load, now) === 'ok') return day
    day = addDays(day, 1)
  }
  return null
}

export const STATUS_HINT = {
  too_soon: 'Not enough notice',
  closed: 'Closed',
  blocked: 'Not taking orders',
  full: 'Fully booked',
}
