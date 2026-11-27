import { Component, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import AdminApp from './AdminApp.jsx'
import BakeryApp from './BakeryApp.jsx'
import DriverApp from './DriverApp.jsx'
import { BRAND, setPageTitle } from './brand.js'

// Each partner type has its own address on the same site.
const path = window.location.pathname.replace(/\/+$/, '')
const area = path.startsWith('/driver') ? 'driver' : path.startsWith('/bakery') ? 'bakery' : path.startsWith('/admin') ? 'admin' : 'customer'
const Root = { driver: DriverApp, bakery: BakeryApp, admin: AdminApp, customer: App }[area]
setPageTitle(area)

// A failed request or a background error is logged, never shown as a raw error page.
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection', event.reason)
})

// If a screen crashes while drawing, show a friendly page with a way back instead of a blank or raw error.
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error, info) {
    console.error('Screen crashed', error, info?.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'system-ui, sans-serif', background: '#FFFFFF', color: '#1C1917' }}>
        <div style={{ maxWidth: 420, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <img src="/favicon.svg" alt="" width="56" height="56" style={{ margin: '0 auto' }} />
          <h1 style={{ margin: 0, fontSize: 22 }}>Something went wrong</h1>
          <p style={{ margin: 0, color: '#57534E', lineHeight: 1.5 }}>Sorry, this screen hit a problem. Your orders and account are safe. Reload to try again.</p>
          <button type="button" onClick={() => window.location.reload()} style={{ marginTop: 8, padding: '12px 20px', border: 0, borderRadius: 12, background: BRAND.color, color: '#FFFFFF', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>Reload</button>
        </div>
      </div>
    )
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <Root />
    </ErrorBoundary>
  </StrictMode>,
)
