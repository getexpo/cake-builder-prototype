import { useCallback, useEffect, useRef, useState } from 'react'
import { friendlyError, supabase } from './supabaseClient.js'
import { WEEKDAYS, addDays, dateLabel, vanDate, weekday } from './schedule.js'
import './widgets.css'

/* ---------- Month calendar ---------- */

function monthStart(day) {
  return `${day.slice(0, 7)}-01`
}

function monthTitle(day) {
  const [y, m] = day.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString('en-CA', { timeZone: 'UTC', month: 'long', year: 'numeric' })
}

function shiftMonth(first, delta) {
  const [y, m] = first.split('-').map(Number)
  const next = new Date(Date.UTC(y, m - 1 + delta, 1))
  return next.toISOString().slice(0, 10)
}

// cell(day) -> { disabled, note, tone: 'busy'|'off'|'full'|'', count }
export function MonthCalendar({ value, onPick, cell, initial, minMonth, maxMonths = 6, compact }) {
  const today = vanDate()
  const firstAllowed = monthStart(minMonth || today)
  const [first, setFirst] = useState(() => monthStart(initial || value || today))
  const lastAllowed = shiftMonth(firstAllowed, maxMonths - 1)
  const lead = weekday(first)
  const days = []
  for (let i = 0; i < 42; i += 1) {
    const day = addDays(first, i - lead)
    if (i >= 35 && day.slice(0, 7) !== first.slice(0, 7)) break
    days.push(day)
  }
  return (
    <div className={`cx-cal ${compact ? 'is-compact' : ''}`}>
      <div className="cx-cal-head">
        <button type="button" className="cx-cal-nav" aria-label="Previous month" disabled={first <= firstAllowed} onClick={() => setFirst(shiftMonth(first, -1))}>‹</button>
        <strong>{monthTitle(first)}</strong>
        <button type="button" className="cx-cal-nav" aria-label="Next month" disabled={first >= lastAllowed} onClick={() => setFirst(shiftMonth(first, 1))}>›</button>
      </div>
      <div className="cx-cal-grid" role="grid">
        {WEEKDAYS.map((name) => <span key={name} className="cx-cal-dow" aria-hidden="true">{name.slice(0, 2)}</span>)}
        {days.map((day) => {
          const outside = day.slice(0, 7) !== first.slice(0, 7)
          const info = cell ? cell(day) : {}
          const selected = value === day
          return (
            <button
              key={day}
              type="button"
              className={`cx-cal-day ${outside ? 'is-outside' : ''} ${selected ? 'is-selected' : ''} ${day === today ? 'is-today' : ''} ${info.tone ? `is-${info.tone}` : ''}`}
              disabled={info.disabled}
              aria-pressed={selected}
              aria-label={`${dateLabel(day, true)}${info.note ? `, ${info.note}` : ''}`}
              title={info.note || ''}
              onClick={() => onPick?.(day)}
            >
              <span>{Number(day.slice(8))}</span>
              {info.count ? <em>{info.count}</em> : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ---------- Chat ---------- */

function stamp(iso) {
  const date = new Date(iso)
  const sameDay = vanDate(date) === vanDate()
  return date.toLocaleString('en-CA', { timeZone: 'America/Vancouver', ...(sameDay ? {} : { month: 'short', day: 'numeric' }), hour: 'numeric', minute: '2-digit' }).replace(/\./g, '')
}

// side: 'customer' | 'bakery' (who is looking)
export function ChatThread({ conversationId, side, title, subtitle, onBack, placeholder }) {
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const endRef = useRef(null)

  const load = useCallback(async () => {
    const { data, error: err } = await supabase.from('messages').select('*').eq('conversation_id', conversationId).order('created_at').limit(500)
    if (err) { setError(friendlyError(err)); return }
    setMessages((current) => (current.length === (data || []).length ? current : data || []))
    supabase.rpc('mark_conversation_read', { p_conversation: conversationId })
  }, [conversationId])

  useEffect(() => {
    load()
    const timer = setInterval(load, 6000)
    return () => clearInterval(timer)
  }, [load])

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [messages.length])

  async function send(event) {
    event.preventDefault()
    const body = draft.trim()
    if (!body || busy) return
    setBusy(true); setError('')
    const { error: err } = await supabase.rpc('send_message', { p_conversation: conversationId, p_body: body })
    setBusy(false)
    if (err) { setError(friendlyError(err)); return }
    setDraft('')
    load()
  }

  return (
    <div className="cx-chat">
      <div className="cx-chat-head">
        {onBack ? <button type="button" className="cx-chat-back" aria-label="Back" onClick={onBack}>‹</button> : null}
        <span className="cx-chat-title"><strong>{title}</strong>{subtitle ? <span>{subtitle}</span> : null}</span>
      </div>
      <div className="cx-chat-body" aria-live="polite">
        {!messages.length ? <p className="cx-chat-empty">No messages yet. Ask about flavours, designs, allergies or dates.</p> : null}
        {messages.map((message, index) => {
          const mine = message.sender === side
          const showStamp = index === 0 || new Date(message.created_at) - new Date(messages[index - 1].created_at) > 15 * 60 * 1000
          return (
            <div key={message.id}>
              {showStamp ? <div className="cx-chat-stamp">{stamp(message.created_at)}</div> : null}
              <div className={`cx-bubble ${mine ? 'is-mine' : ''}`}>{message.body}</div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>
      {error ? <p className="cx-chat-error" role="alert">{error}</p> : null}
      <form className="cx-chat-compose" onSubmit={send}>
        <textarea
          aria-label="Message"
          rows={1}
          maxLength={2000}
          placeholder={placeholder || 'Write a message'}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) send(event) }}
        />
        <button type="submit" disabled={busy || !draft.trim()}>{busy ? '…' : 'Send'}</button>
      </form>
    </div>
  )
}

export function ConversationList({ conversations, side, onOpen, empty }) {
  if (!conversations.length) return <p className="cx-chat-empty">{empty || 'No messages yet.'}</p>
  return (
    <div className="cx-convos">
      {conversations.map((chat) => {
        const unread = side === 'customer' ? chat.customer_unread : chat.bakery_unread
        const name = side === 'customer' ? chat.bakery_name : side === 'admin' ? `${chat.customer_name || 'Customer'} → ${chat.bakery_name}` : chat.customer_name || 'Customer'
        return (
          <button key={chat.id} type="button" className={`cx-convo ${unread ? 'is-unread' : ''}`} onClick={() => onOpen(chat)}>
            <span className="cx-avatar">{String(name).slice(0, 1).toUpperCase()}</span>
            <span className="cx-convo-text">
              <strong>{name}</strong>
              <span>{chat.last_sender && chat.last_sender === (side === 'admin' ? 'bakery' : side) ? 'You: ' : ''}{chat.last_message || 'New conversation'}</span>
            </span>
            <span className="cx-convo-side">
              <span>{stamp(chat.last_message_at)}</span>
              {unread ? <em>{unread}</em> : null}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function useConversations(filter, enabled = true) {
  const [list, setList] = useState([])
  const load = useCallback(async () => {
    if (!enabled) { setList([]); return }
    let query = supabase.from('conversations').select('*').order('last_message_at', { ascending: false }).limit(200)
    if (filter?.bakeryId) query = query.eq('bakery_id', filter.bakeryId)
    if (filter?.customerId) query = query.eq('customer_id', filter.customerId)
    const { data } = await query
    setList(data || [])
  }, [filter?.bakeryId, filter?.customerId, enabled])
  useEffect(() => {
    load()
    if (!enabled) return undefined
    const timer = setInterval(load, 10000)
    return () => clearInterval(timer)
  }, [load, enabled])
  return [list, load]
}
