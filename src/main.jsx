import React from 'react'
import ReactDOM from 'react-dom/client'
import { lazy, Suspense } from 'react'
import ClientAccount from './ClientAccount.jsx'
import './account.css'

const hasWedding = window.__WEDDING_TENANT__?.hasWedding === true
const App = lazy(() => import('./App.jsx'))
if (hasWedding) {
  const enhancements = ['app-enhancer', 'youtube-live-settings', 'video-testimonials-v2', 'video-success-flow', 'video-gallery-player', 'media-selection', 'live-inline-fix', 'live-mobile-fix', 'live-chat', 'live-presence', 'push-notifications']
  for (const name of enhancements) {
    const script = document.createElement('script')
    script.src = `${import.meta.env.BASE_URL}${name}.js?v=20260922-rollback-1`
    script.async = false
    document.head.appendChild(script)
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {hasWedding ? <Suspense fallback={<p style={{padding:32,textAlign:'center'}}>Ouverture de votre espace…</p>}><App /></Suspense> : <ClientAccount />}
  </React.StrictMode>
)
