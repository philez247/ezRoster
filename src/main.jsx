import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { seedTradersIfEmpty } from './data/traders'
import { seedDublinTraders } from './data/seedDublinTraders'
import { seedMelbourneTraders } from './data/seedMelbourneTraders'
import { seedNewJerseyTraders } from './data/seedNewJerseyTraders'
import './index.css'

seedTradersIfEmpty()
seedDublinTraders()
seedMelbourneTraders()
seedNewJerseyTraders()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
