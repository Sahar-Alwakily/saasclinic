import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'react-toastify/ReactToastify.css'
import './index.css'
import App from './App.jsx'
import { initDashboardTheme } from './utils/dashboardTheme.js'

initDashboardTheme()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
