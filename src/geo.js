// Address → map position, and distances. Uses OpenStreetMap's free lookup (no key needed).
// Results are cached in the browser so each address is only looked up once.

const CACHE_KEY = 'geo-cache-v1'

function readCache() {
  try { return JSON.parse(window.localStorage.getItem(CACHE_KEY) || '{}') } catch { return {} }
}
function writeCache(cache) {
  try { window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache)) } catch { /* storage full or blocked */ }
}

export async function geocode(address, city, province = 'British Columbia', country = 'Canada', postal = '') {
  const query = [address, city, province, postal, country].filter((part) => String(part || '').trim()).join(', ')
  if (!String(address || '').trim()) return null
  const key = query.toLowerCase()
  const cache = readCache()
  if (cache[key] !== undefined) return cache[key]
  try {
    const cc = country === 'United States' ? 'us' : country === 'Canada' ? 'ca' : ''
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1${cc ? `&countrycodes=${cc}` : ''}&q=${encodeURIComponent(query)}`
    const response = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!response.ok) return null
    const [hit] = await response.json()
    const point = hit ? { lat: Number(hit.lat), lng: Number(hit.lon) } : null
    writeCache({ ...cache, [key]: point })
    return point
  } catch {
    return null
  }
}

export function distanceKm(a, b) {
  if (!a || !b || !Number.isFinite(a.lat) || !Number.isFinite(b.lat)) return null
  const rad = (deg) => (deg * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(h))
}

export const kmLabel = (km) => (km == null ? '' : km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`)

// Every bakery has at least one location; older shops only have address/area.
export function shopLocations(shop) {
  const list = Array.isArray(shop?.locations) ? shop.locations.filter((item) => item && String(item.address || '').trim()) : []
  if (list.length) return list
  return [{ id: 'main', name: shop?.area || 'Main', address: shop?.address || '', city: shop?.area || '' }]
}

export const newLocation = () => ({ id: `loc-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, name: '', address: '', city: 'Vancouver', province: 'British Columbia', postal: '', country: 'Canada' })

// Fill in lat/lng for any location that doesn't have it yet.
export async function withCoordinates(locations) {
  const out = []
  for (const location of locations) {
    if (Number.isFinite(location.lat) && Number.isFinite(location.lng)) { out.push(location); continue }
    const point = await geocode(location.address, location.city, location.province, location.country, location.postal)
    out.push(point ? { ...location, ...point } : location)
  }
  return out
}
