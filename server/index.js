/**
 * ESPN proxy server - bypasses CORS by fetching ESPN server-side.
 * Run: node server/index.js (or npm run server)
 * Listens on port 3001; Vite dev proxy forwards /api to this server.
 */

import express from 'express'
import cors from 'cors'
import fetch from 'node-fetch'
import path from 'path'
import { fileURLToPath } from 'url'

const PORT = process.env.PORT || 3001
const app = express()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

app.use(cors({
  origin: '*',
  allowedHeaders: ['Content-Type'],
}))

async function fetchWithRetry(url, maxRetries = 3, timeoutMs = 10000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(url, { signal: controller.signal })
      clearTimeout(timeout)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (err) {
      clearTimeout(timeout)
      if (attempt === maxRetries) throw err
    }
  }
  throw new Error('Max retries exceeded')
}

const ESPN_SCOREBOARDS = {
  nba: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard',
  nfl: 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard',
  nhl: 'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard',
  wnba: 'https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/scoreboard',
  mlb: 'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard',
}

const CFB_TEAMS_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams'
const NCAAM_TEAMS_URL = 'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams'
const NCAAM_SCOREBOARD_URL = 'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard'
const WNBA_TEAMS_URL = 'https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/teams'
const WNBA_SCOREBOARD_URL = 'https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/scoreboard'

app.get('/api/espn/ncaam/teams', async (req, res) => {
  try {
    const url = `${NCAAM_TEAMS_URL}?enable=groups&limit=2500`
    const data = await fetchWithRetry(url)
    res.json(data)
  } catch (err) {
    console.error('[ESPN NCAAM teams proxy]', err.message)
    res.status(502).json({ error: err.message || 'Failed to fetch NCAAM teams' })
  }
})

app.get('/api/espn/ncaam/scoreboard', async (req, res) => {
  try {
    const date = (req.query.date || '').trim()
    if (!/^\d{8}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date. Use YYYYMMDD.' })
    }
    const url = `${NCAAM_SCOREBOARD_URL}?dates=${date}`
    const data = await fetchWithRetry(url)
    res.json(data)
  } catch (err) {
    console.error('[ESPN NCAAM scoreboard proxy]', err.message)
    res.status(502).json({ error: err.message || 'Failed to fetch NCAAM scoreboard' })
  }
})

app.get('/api/espn/wnba/teams', async (req, res) => {
  try {
    const url = `${WNBA_TEAMS_URL}?limit=50`
    const data = await fetchWithRetry(url)
    res.json(data)
  } catch (err) {
    console.error('[ESPN WNBA teams proxy]', err.message)
    res.status(502).json({ error: err.message || 'Failed to fetch WNBA teams' })
  }
})

app.get('/api/espn/wnba/scoreboard', async (req, res) => {
  try {
    const date = (req.query.date || '').trim()
    if (!/^\d{8}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date. Use YYYYMMDD.' })
    }
    const url = `${WNBA_SCOREBOARD_URL}?dates=${date}`
    const data = await fetchWithRetry(url)
    res.json(data)
  } catch (err) {
    console.error('[ESPN WNBA scoreboard proxy]', err.message)
    res.status(502).json({ error: err.message || 'Failed to fetch WNBA scoreboard' })
  }
})

app.get('/api/espn/cfb/teams', async (req, res) => {
  try {
    const group = (req.query.group || '').trim()
    if (group !== '80' && group !== '81') {
      return res.status(400).json({ error: 'Invalid group. Use 80 (FBS) or 81 (FCS).' })
    }
    const url = `${CFB_TEAMS_URL}?enable=groups&groups=${group}&limit=1000`
    const data = await fetchWithRetry(url)
    res.json(data)
  } catch (err) {
    console.error('[ESPN CFB teams proxy]', err.message)
    res.status(502).json({ error: err.message || 'Failed to fetch CFB teams' })
  }
})

app.get('/api/espn/:league/scoreboard', async (req, res) => {
  try {
    const league = (req.params.league || '').toLowerCase()
    const baseUrl = ESPN_SCOREBOARDS[league]
    if (!baseUrl) {
      return res.status(400).json({ error: `Unknown league: ${league}. Use nba, nfl, nhl, wnba, mlb.` })
    }
    const date = (req.query.date || '').trim()
    if (!/^\d{8}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date. Use YYYYMMDD.' })
    }
    const url = `${baseUrl}?dates=${date}`
    const data = await fetchWithRetry(url)
    res.json(data)
  } catch (err) {
    console.error('[ESPN proxy]', err.message)
    res.status(502).json({ error: err.message || 'Failed to fetch ESPN data' })
  }
})

app.use('/api', (req, res) => {
  res.status(404).json({
    error: 'API route not found. Restart the proxy server so new routes (e.g. NCAAM/CBB) are loaded: npm run server (or npm run dev:all).',
  })
})

// Serve the React app in production (Render)
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'dist')
  app.use(express.static(distPath))

  // SPA fallback: send index.html for any non-API route
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'API route not found' })
    }
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`ESPN proxy listening on http://localhost:${PORT}`)
})
