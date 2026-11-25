// Occasion types, holiday dates and "next date" maths for reminders.
import { addDays, vanDate } from './schedule.js'

export const OCCASION_GROUPS = [
  {
    title: 'People',
    kinds: [
      ['birthday', 'Birthday'], ['anniversary', 'Anniversary'], ['work_anniversary', 'Work anniversary'],
      ['name_day', 'Name day'], ['pet_birthday', 'Pet birthday'], ['memorial', 'Remembrance day'],
    ],
  },
  {
    title: 'Love and family',
    kinds: [
      ['engagement', 'Engagement party'], ['bridal_shower', 'Bridal shower'], ['bachelor', 'Bachelor / bachelorette'],
      ['wedding', 'Wedding'], ['vow_renewal', 'Vow renewal'], ['baby_shower', 'Baby shower'], ['gender_reveal', 'Gender reveal'],
      ['due_date', 'Baby due date'], ['baptism', 'Baptism / christening'], ['first_birthday', 'First birthday'],
      ['adoption_day', 'Adoption / gotcha day'], ['family_reunion', 'Family reunion'],
    ],
  },
  {
    title: 'Milestones',
    kinds: [
      ['graduation', 'Graduation'], ['first_day_school', 'First day of school'], ['last_day_school', 'Last day of school'],
      ['sweet_16', 'Sweet 16'], ['quinceanera', 'Quinceañera'], ['bar_mitzvah', 'Bar / bat mitzvah'], ['first_communion', 'First communion'],
      ['confirmation', 'Confirmation'], ['new_job', 'New job / promotion'], ['retirement', 'Retirement'], ['housewarming', 'Housewarming'],
      ['citizenship', 'Citizenship day'], ['recovery', 'Recovery / get well'], ['farewell', 'Farewell / moving away'],
    ],
  },
  {
    title: 'Wins and events',
    kinds: [
      ['trophy', 'Trophy / championship'], ['tournament', 'Tournament or game day'], ['recital', 'Recital / performance'],
      ['team_party', 'Team party'], ['office_party', 'Office party'], ['launch', 'Business launch / opening'],
      ['fundraiser', 'Fundraiser / school event'], ['class_party', 'Class party'], ['other', 'Something else'],
    ],
  },
  {
    title: 'Holidays',
    kinds: [
      ['mothers_day', "Mother's Day"], ['fathers_day', "Father's Day"], ['valentines', "Valentine's Day"], ['christmas', 'Christmas'],
      ['halloween', 'Halloween'], ['thanksgiving', 'Thanksgiving'], ['easter', 'Easter'], ['lunar_new_year', 'Lunar New Year'],
      ['diwali', 'Diwali'], ['eid', 'Eid'], ['hanukkah', 'Hanukkah'], ['nowruz', 'Nowruz'], ['canada_day', 'Canada Day'],
      ['new_year', "New Year's Eve"], ['st_patricks', "St. Patrick's Day"],
    ],
  },
]

export const KIND_LABEL = Object.fromEntries(OCCASION_GROUPS.flatMap((group) => group.kinds))
export const HOLIDAY_KINDS = new Set(OCCASION_GROUPS.find((group) => group.title === 'Holidays').kinds.map(([id]) => id))

export const RELATIONS = ['Mom', 'Dad', 'Partner', 'Wife', 'Husband', 'Son', 'Daughter', 'Child', 'Sister', 'Brother', 'Grandma', 'Grandpa', 'Aunt', 'Uncle', 'Cousin', 'Niece', 'Nephew', 'Friend', 'Best friend', 'Coworker', 'Boss', 'Team', 'Teacher', 'Pet', 'Me']

export const REMIND_OPTIONS = [
  { days: 28, label: '4 weeks before' },
  { days: 14, label: '2 weeks before' },
  { days: 7, label: '1 week before' },
  { days: 3, label: '3 days before' },
  { days: 1, label: 'The day before' },
]

function nthWeekday(year, month, weekday, n) {
  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  return 1 + ((weekday - first + 7) % 7) + (n - 1) * 7
}

// Holidays with a rule we can work out; others ask for the date.
export function holidayDate(kind, year) {
  switch (kind) {
    case 'mothers_day': return { month: 5, day: nthWeekday(year, 5, 0, 2) }
    case 'fathers_day': return { month: 6, day: nthWeekday(year, 6, 0, 3) }
    case 'thanksgiving': return { month: 10, day: nthWeekday(year, 10, 1, 2) }
    case 'valentines': return { month: 2, day: 14 }
    case 'christmas': return { month: 12, day: 25 }
    case 'halloween': return { month: 10, day: 31 }
    case 'canada_day': return { month: 7, day: 1 }
    case 'new_year': return { month: 12, day: 31 }
    case 'st_patricks': return { month: 3, day: 17 }
    default: return null
  }
}

export const QUICK_HOLIDAYS = ['mothers_day', 'fathers_day', 'valentines', 'thanksgiving', 'halloween', 'christmas']

function iso(year, month, day) {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return `${year}-${String(month).padStart(2, '0')}-${String(Math.min(day, last)).padStart(2, '0')}`
}

// Next date this occasion happens (today counts). null when a one-time date has passed.
export function nextDate(occasion, today = vanDate()) {
  const thisYear = Number(today.slice(0, 4))
  if (!occasion.repeats) {
    if (!occasion.year) return null
    const date = iso(occasion.year, occasion.month, occasion.day)
    return date >= today ? date : null
  }
  for (const year of [thisYear, thisYear + 1]) {
    const rule = HOLIDAY_KINDS.has(occasion.kind) ? holidayDate(occasion.kind, year) : null
    const date = rule ? iso(year, rule.month, rule.day) : iso(year, occasion.month, occasion.day)
    if (date >= today) return date
  }
  return null
}

export function daysBetween(from, to) {
  const a = Date.UTC(...from.split('-').map((n, i) => (i === 1 ? n - 1 : Number(n))))
  const b = Date.UTC(...to.split('-').map((n, i) => (i === 1 ? n - 1 : Number(n))))
  return Math.round((b - a) / 86400000)
}

const POSSESSIVE = new Set(['birthday', 'anniversary', 'work_anniversary', 'name_day', 'pet_birthday', 'first_birthday', 'wedding', 'graduation', 'retirement', 'baby_shower', 'bridal_shower', 'sweet_16', 'quinceanera', 'bar_mitzvah', 'recital', 'due_date', 'new_job', 'housewarming', 'farewell', 'adoption_day', 'engagement', 'vow_renewal', 'first_communion', 'confirmation', 'baptism', 'citizenship', 'memorial'])

export function occasionTitle(occasion) {
  const label = KIND_LABEL[occasion.kind] || 'Occasion'
  if (HOLIDAY_KINDS.has(occasion.kind)) return occasion.person && occasion.person !== label ? `${label} · ${occasion.person}` : label
  const who = (occasion.person || '').trim()
  if (!who) return label
  if (occasion.kind === 'other') return who
  if (!POSSESSIVE.has(occasion.kind)) return `${who} · ${label}`
  return `${who}${/s$/i.test(who) ? '’' : '’s'} ${label.toLowerCase()}`
}

export function turningAge(occasion, date) {
  if (!['birthday', 'first_birthday', 'pet_birthday'].includes(occasion.kind) || !occasion.year || !occasion.repeats) return null
  const age = Number(date.slice(0, 4)) - occasion.year
  return age > 0 && age < 130 ? age : null
}

export function countdown(days) {
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days < 14) return `In ${days} days`
  if (days < 60) return `In ${Math.round(days / 7)} weeks`
  return `In ${Math.round(days / 30)} months`
}

export { addDays }
