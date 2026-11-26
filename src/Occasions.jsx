import { useCallback, useEffect, useState } from 'react'
import { friendlyError, supabase } from './supabaseClient.js'
import { dateLabel, vanDate } from './schedule.js'
import { PhoneInput, PhoneVerify } from './widgets.jsx'
import {
  HOLIDAY_KINDS, KIND_LABEL, OCCASION_GROUPS, QUICK_HOLIDAYS, RELATIONS, REMIND_OPTIONS,
  countdown, daysBetween, holidayDate, nextDate, occasionTitle, turningAge,
} from './occasions.js'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DISMISS_KEY = 'occasions-prompt-dismissed'
// Holidays whose date moves and isn't worked out for you: the customer enters this year's date.
const MOVING_HOLIDAYS = new Set(['easter', 'lunar_new_year', 'diwali', 'eid', 'hanukkah', 'nowruz'])

export function useOccasions(user) {
  const [list, setList] = useState([])
  const [profile, setProfile] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const load = useCallback(async () => {
    if (!user) { setList([]); setProfile(null); setLoaded(true); return }
    const [o, p] = await Promise.all([
      supabase.from('occasions').select('*').eq('customer_id', user.id).order('month').order('day'),
      supabase.from('customer_profiles').select('*').eq('user_id', user.id).maybeSingle(),
    ])
    setList(o.data || [])
    setProfile(p.data || null)
    setLoaded(true)
  }, [user])
  useEffect(() => { load() }, [load])
  return { list, profile, loaded, reload: load }
}

export function upcoming(list, withinDays = 400) {
  const today = vanDate()
  return list
    .map((item) => {
      const date = nextDate(item, today)
      return date ? { ...item, next: date, days: daysBetween(today, date) } : null
    })
    .filter((item) => item && item.days <= withinDays)
    .sort((a, b) => a.days - b.days)
}

export function promptDismissed() {
  try { return window.localStorage.getItem(DISMISS_KEY) === '1' } catch { return false }
}
export function dismissPrompt() {
  try { window.localStorage.setItem(DISMISS_KEY, '1') } catch { /* storage unavailable */ }
}

function blankForm() {
  return { id: null, person: '', relation: '', kind: 'birthday', date: '', auto_date: false, repeats: true, remind_days: [14, 3], notes: '' }
}

const pad = (n) => String(n).padStart(2, '0')

// Next official date of a holiday that follows a rule (e.g. Mother's Day), as YYYY-MM-DD.
function officialDate(kind) {
  const today = vanDate()
  for (const year of [Number(today.slice(0, 4)), Number(today.slice(0, 4)) + 1]) {
    const rule = holidayDate(kind, year)
    if (!rule) return ''
    const date = `${year}-${pad(rule.month)}-${pad(rule.day)}`
    if (date >= today) return date
  }
  return ''
}

function formFor(item) {
  const year = item.year || Number((item.next || vanDate()).slice(0, 4))
  return { ...blankForm(), ...item, date: `${year}-${pad(item.month)}-${pad(item.day)}`, notes: item.notes || '', relation: item.relation || '', auto_date: Boolean(item.auto_date) }
}

export function OccasionsScreen({ user, phone, onBack, onShop, onSignIn, TopBar, Icon, data }) {
  const { list, profile, reload } = data
  const [form, setForm] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [settings, setSettings] = useState(null)
  const set = (patch) => setForm((current) => ({ ...current, ...patch }))

  useEffect(() => {
    if (!user) return
    setSettings({
      phone: profile?.phone || phone || '',
      sms_reminders: profile?.sms_reminders ?? true,
      email_reminders: profile?.email_reminders ?? true,
    })
  }, [user, profile, phone])

  if (!user) {
    return (
      <div className="ca-screen">
        <TopBar title="Occasions" onBack={onBack} />
        <div className="ca-empty"><strong>Sign in to save your important dates</strong><button type="button" className="ca-btn ca-mt-12" onClick={onSignIn}>Sign in</button></div>
      </div>
    )
  }

  async function saveProfile(next = settings) {
    const row = {
      user_id: user.id, name: user.user_metadata?.full_name || null, email: user.email,
      phone: (next.phone || '').trim() || null, sms_reminders: next.sms_reminders, email_reminders: next.email_reminders, updated_at: new Date().toISOString(),
    }
    const { error: err } = await supabase.from('customer_profiles').upsert(row)
    if (err) setError(friendlyError(err))
  }

  async function save() {
    setError('')
    const holiday = HOLIDAY_KINDS.has(form.kind)
    if (!holiday && !form.person.trim()) { setError('Add who it’s for, e.g. “Mom” or “Ava”.'); return }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) { setError('Pick the date.'); return }
    const [y, month, day] = form.date.split('-').map(Number)
    const thisYear = Number(vanDate().slice(0, 4))
    // For yearly dates, only keep a past year (birth year, wedding year) so we can show ages.
    const year = form.repeats ? (y < thisYear ? y : null) : y
    setBusy(true)
    const row = {
      customer_id: user.id,
      person: form.person.trim() || KIND_LABEL[form.kind],
      relation: form.relation || null,
      kind: form.kind,
      month, day, year,
      repeats: form.repeats,
      auto_date: Boolean(form.auto_date && officialDate(form.kind) === form.date),
      remind_days: form.remind_days.length ? [...form.remind_days].sort((a, b) => b - a) : [14, 3],
      notes: form.notes.trim() || null,
    }
    const query = form.id ? supabase.from('occasions').update(row).eq('id', form.id) : supabase.from('occasions').insert(row)
    const { error: err } = await query
    if (!err && !profile) await saveProfile()
    setBusy(false)
    if (err) { setError(friendlyError(err)); return }
    setForm(null)
    reload()
  }

  async function remove(item) {
    const { error: err } = await supabase.from('occasions').delete().eq('id', item.id)
    if (err) setError(friendlyError(err))
    setForm(null)
    reload()
  }

  function quickAdd(kind) {
    setForm({ ...blankForm(), kind, date: officialDate(kind), auto_date: true })
  }

  if (form) {
    const holiday = HOLIDAY_KINDS.has(form.kind)
    const official = holiday ? officialDate(form.kind) : ''
    const birthday = ['birthday', 'first_birthday', 'pet_birthday', 'anniversary', 'work_anniversary'].includes(form.kind)
    return (
      <div className="ca-screen">
        <TopBar title={form.id ? 'Edit occasion' : 'Add an occasion'} onBack={() => { setForm(null); setError('') }} />
        <div className="ca-pad ca-stack-18 ca-pt-16 ca-pb-24">
          <section className="ca-stack-8">
            <label className="ca-label" htmlFor="oc-kind">What is it?</label>
            <select id="oc-kind" className="ca-select" value={form.kind} onChange={(e) => {
              const kind = e.target.value
              const next = officialDate(kind)
              set({ kind, ...(next && (!form.date || form.auto_date) ? { date: next, auto_date: true } : {}), repeats: !(MOVING_HOLIDAYS.has(kind) || ['wedding', 'due_date', 'baby_shower', 'bridal_shower', 'engagement', 'graduation', 'retirement', 'housewarming', 'trophy', 'tournament', 'recital', 'launch', 'fundraiser', 'farewell', 'bachelor', 'gender_reveal', 'baptism', 'first_communion', 'confirmation', 'sweet_16', 'quinceanera', 'bar_mitzvah', 'citizenship', 'new_job', 'class_party', 'team_party', 'office_party', 'family_reunion', 'first_birthday'].includes(kind)) })
            }}>
              {OCCASION_GROUPS.map((group) => (
                <optgroup key={group.title} label={group.title}>
                  {group.kinds.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                </optgroup>
              ))}
            </select>
          </section>

          <section className="ca-stack-8">
            <label className="ca-label" htmlFor="oc-person">{holiday ? 'Who is it for? (optional)' : 'Who is it for?'}</label>
            <input id="oc-person" className="ca-input" maxLength={60} placeholder={holiday ? 'e.g. Mom' : 'e.g. Mom, Ava, The Johnsons, Our team'} value={form.person} onChange={(e) => set({ person: e.target.value })} />
            <div className="cx-chip-row">
              {RELATIONS.slice(0, 12).map((name) => (
                <button key={name} type="button" className={`cx-chip ${form.relation === name ? 'is-on' : ''}`} onClick={() => set({ relation: form.relation === name ? '' : name, person: form.person || name })}>{name}</button>
              ))}
            </div>
          </section>

          <section className="ca-stack-8">
            <label className="ca-label" htmlFor="oc-date">{birthday && form.repeats ? 'Date (add the real year to see their age)' : 'Date'}</label>
            <input id="oc-date" className="ca-input ca-date-input" type="date" value={form.date} onChange={(e) => set({ date: e.target.value, auto_date: Boolean(official) && e.target.value === official })} />
            {official ? (
              <span className="ca-muted ca-small">
                {form.date === official
                  ? `${KIND_LABEL[form.kind]} is on a different date each year. We’ll follow the official date for you.`
                  : <>Official date: {dateLabel(official, true)}. <button type="button" className="ca-link" onClick={() => set({ date: official, auto_date: true })}>Use it</button></>}
              </span>
            ) : MOVING_HOLIDAYS.has(form.kind) ? <span className="ca-muted ca-small">This holiday moves each year, so pick this year’s date.</span> : null}
            <div className="ca-setting-row">
              <span className="ca-list-text"><strong>Every year</strong><span className="ca-muted ca-small">Turn off for one-time dates like a wedding or due date</span></span>
              <button type="button" role="switch" aria-checked={form.repeats} aria-label="Every year" className={`ca-switch ${form.repeats ? 'is-on' : ''}`} onClick={() => set({ repeats: !form.repeats })}><span /></button>
            </div>
          </section>

          <section className="ca-stack-8">
            <span className="ca-label">Remind me</span>
            <div className="cx-chip-row">
              {REMIND_OPTIONS.map((option) => {
                const on = form.remind_days.includes(option.days)
                return <button key={option.days} type="button" aria-pressed={on} className={`cx-chip ${on ? 'is-on' : ''}`} onClick={() => set({ remind_days: on ? form.remind_days.filter((d) => d !== option.days) : [...form.remind_days, option.days] })}>{option.label}</button>
              })}
            </div>
            <span className="ca-muted ca-small">Custom cakes often need 3–14 days, so 2 weeks is a good first reminder.</span>
          </section>

          <section className="ca-stack-8">
            <label className="ca-label" htmlFor="oc-notes">Notes <span className="ca-muted">· optional</span></label>
            <input id="oc-notes" className="ca-input" maxLength={140} placeholder="Favourite flavour, allergies, theme ideas…" value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
          </section>

          {error ? <p className="ca-toast is-error is-inline" role="alert">{error}</p> : null}
          <button type="button" className="ca-btn" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save occasion'}</button>
          {form.id ? <button type="button" className="ca-btn ca-btn-ghost" onClick={() => remove(form)}>Delete</button> : null}
        </div>
      </div>
    )
  }

  const items = upcoming(list)
  const added = new Set(list.map((item) => item.kind))
  const quick = QUICK_HOLIDAYS.filter((kind) => !added.has(kind))

  return (
    <div className="ca-screen">
      <TopBar title="Occasions" onBack={onBack} />
      <div className="ca-pad ca-stack-18 ca-pt-16 ca-pb-24">
        <div className="ca-stack-4">
          <h1 className="ca-h1">Never miss a cake day</h1>
          <p className="ca-muted ca-lh">Save birthdays, anniversaries and big moments. We’ll remind you in time to order the perfect cake.</p>
        </div>
        <button type="button" className="ca-btn" onClick={() => setForm(blankForm())}><Icon name="plus" size={18} />Add an occasion</button>

        {quick.length ? (
          <section className="ca-stack-8">
            <span className="ca-label">Quick add</span>
            <div className="cx-chip-row">
              {quick.map((kind) => <button key={kind} type="button" className="cx-chip" onClick={() => quickAdd(kind)}>+ {KIND_LABEL[kind]}</button>)}
            </div>
          </section>
        ) : null}

        <section className="ca-stack-10">
          <h2 className="ca-h3">{items.length ? 'Coming up' : 'No dates yet'}</h2>
          {!items.length ? <p className="ca-muted">Start with the people you buy cakes for most: family birthdays, your anniversary, your kids’ parties.</p> : null}
          {items.map((item) => {
            const age = turningAge(item, item.next)
            return (
              <div key={item.id} className={`ca-occasion ${item.days <= 14 ? 'is-soon' : ''}`}>
                <button type="button" className="ca-occasion-main" onClick={() => setForm(formFor(item))}>
                  <span className="ca-occasion-date"><strong>{Number(item.next.slice(8))}</strong><span>{MONTHS[Number(item.next.slice(5, 7)) - 1].slice(0, 3)}</span></span>
                  <span className="ca-list-text">
                    <strong>{occasionTitle(item)}{age ? ` · turning ${age}` : ''}</strong>
                    <span className="ca-muted ca-small">{countdown(item.days)} · {dateLabel(item.next, true)}{item.repeats ? '' : ' · one time'}</span>
                  </span>
                </button>
                {item.days <= 30 ? <button type="button" className="ca-btn ca-btn-small" onClick={onShop}>Order a cake</button> : null}
              </div>
            )
          })}
        </section>

        {settings ? (
          <section className="ca-stack-8">
            <h2 className="ca-h3">How we remind you</h2>
            <PhoneInput variant="ca" aria-label="Phone for text reminders" placeholder="Phone for text reminders" value={settings.phone || ''} onChange={(phone) => setSettings({ ...settings, phone })} onBlur={() => saveProfile()} />
            <PhoneVerify variant="ca" phone={settings.phone} />
            {[['sms_reminders', 'Text message', 'To your phone above'], ['email_reminders', 'Email', user.email]].map(([key, label, sub]) => (
              <div key={key} className="ca-setting-row">
                <span className="ca-list-text"><strong>{label}</strong><span className="ca-muted ca-small">{sub}</span></span>
                <button type="button" role="switch" aria-checked={settings[key]} aria-label={label} className={`ca-switch ${settings[key] ? 'is-on' : ''}`} onClick={() => { const next = { ...settings, [key]: !settings[key] }; setSettings(next); saveProfile(next) }}><span /></button>
              </div>
            ))}
            <span className="ca-muted ca-small">Reply STOP to any text to stop texts.</span>
          </section>
        ) : null}
        {error ? <p className="ca-toast is-error is-inline" role="alert">{error}</p> : null}
      </div>
    </div>
  )
}
