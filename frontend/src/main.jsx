import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import './utils/keepAlive' // Auto-starts backend keep-alive pings
import { Analytics } from "@vercel/analytics/react" // Vercel Analytics(site visits tracking)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <Analytics />
  </StrictMode>,
)
