import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import AdminApp from './AdminApp.jsx'
import BakeryApp from './BakeryApp.jsx'
import DriverApp from './DriverApp.jsx'

// Each partner type has its own address on the same site.
const path = window.location.pathname.replace(/\/+$/, '')
const Root = path.startsWith('/driver') ? DriverApp : path.startsWith('/bakery') ? BakeryApp : path.startsWith('/admin') ? AdminApp : App

window.addEventListener('error', (event) => {
  const message = [
    event.message,
    event.filename,
    event.lineno,
    event.colno,
  ].filter(Boolean).join(' | ')
  document.body.innerHTML = `<pre style="white-space:pre-wrap;padding:16px;font:14px/1.4 system-ui;background:#fff;color:#111;">RUNTIME ERROR\n${String(message || 'Unknown error')}</pre>`
})

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason?.stack || event.reason?.message || String(event.reason || 'Unknown promise rejection')
  document.body.innerHTML = `<pre style="white-space:pre-wrap;padding:16px;font:14px/1.4 system-ui;background:#fff;color:#111;">PROMISE ERROR\n${String(reason)}</pre>`
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
