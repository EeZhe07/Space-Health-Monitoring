import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource/source-sans-3/latin-400.css'
import '@fontsource/source-sans-3/latin-600.css'
import '@fontsource/source-sans-3/latin-700.css'
import './style.css'
import App from './App'

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js').catch(error => {
    console.error('Offline app caching could not be enabled.', error)
  })
}
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>)
