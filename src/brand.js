// The app's name and look in one place. Change NAME here when you pick the final brand.
export const BRAND = {
  name: 'Cake Builder',
  tagline: 'Custom cakes from local bakers',
  region: 'Metro Vancouver',
  color: '#BE185D',
}

const AREA_TITLES = {
  customer: BRAND.tagline,
  bakery: 'Bakery portal',
  driver: 'Driver portal',
  admin: 'Admin',
}

export function setPageTitle(area) {
  if (typeof document === 'undefined') return
  document.title = `${BRAND.name} · ${AREA_TITLES[area] || BRAND.tagline}`
}
