// Shared form checks. Each returns '' when the value is fine, or a short message to show.

// Phones are stored as "+<country code> <number>". Bare numbers are treated as Canadian.
export function normalizePhone(raw) {
  const text = String(raw || '').trim()
  const digits = text.replace(/\D/g, '')
  if (text.startsWith('+')) {
    if (digits.startsWith('1')) return digits.length === 11 ? `+${digits}` : ''
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : ''
  }
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits[0] === '1') return `+${digits}`
  return ''
}

export function phoneProblem(raw) {
  const text = String(raw || '').trim()
  const digits = text.replace(/\D/g, '')
  if (!digits) return ''
  if (normalizePhone(raw)) return ''
  if (!text.startsWith('+') || digits.startsWith('1')) return 'Enter a 10-digit phone number, e.g. 604-555-0123.'
  return 'That number looks too short or too long. Check it and try again.'
}

// BC health authorities (VCH, Fraser, Island, Interior, Northern) each number permits their own way,
// so we check the shape rather than one exact pattern: 4–20 letters/numbers, at least one number.
export function permitProblem(raw) {
  const value = String(raw || '').trim()
  if (!value) return ''
  if (!/^[A-Za-z0-9][A-Za-z0-9 \-/]*$/.test(value)) return 'Use only letters, numbers and dashes, as printed on your permit.'
  const core = value.replace(/[\s\-/]/g, '')
  if (core.length < 4) return 'That looks too short for a permit number.'
  if (core.length > 20) return 'That looks too long for a permit number.'
  if (!/\d/.test(core)) return 'Permit numbers include at least one number.'
  return ''
}
export const cleanPermit = (raw) => String(raw || '').trim().toUpperCase().replace(/\s+/g, ' ')

// BC driver's licence numbers are 7 digits.
export function licenceProblem(raw) {
  const digits = String(raw || '').replace(/[\s-]/g, '')
  if (!digits) return ''
  if (!/^\d+$/.test(digits)) return 'BC licence numbers are numbers only.'
  if (digits.length !== 7) return 'BC licence numbers are 7 digits.'
  return ''
}

export function expiryProblem(value, today) {
  if (!value) return ''
  return value <= today ? 'This licence has expired. Use a valid licence.' : ''
}

export function yearProblem(raw, thisYear) {
  if (!raw) return ''
  const year = Number(raw)
  if (String(raw).length !== 4 || year < 1990 || year > thisYear + 1) return `Enter a year between 1990 and ${thisYear + 1}.`
  return ''
}
