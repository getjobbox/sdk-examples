/**
 * Tiny Express + Vite host.
 * Uses @getjobbox/sdk server-side so JOBBOX_API_KEY never ships to the browser.
 */
import 'dotenv/config'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer as createViteServer } from 'vite'
import { JobBox, JobBoxApiError } from '@getjobbox/sdk'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT || 5174)
const apiKey = String(process.env.JOBBOX_API_KEY || '').trim()
const baseUrl = String(process.env.JOBBOX_BASE_URL || 'https://api.getjobbox.com').replace(/\/$/, '')

if (!apiKey) {
  console.error('Missing JOBBOX_API_KEY. Copy .env.example → .env and set your key.')
  process.exit(1)
}

const jobbox = new JobBox({ apiKey, baseUrl })
const app = express()

function sendSdkError(res, err, label) {
  const status = err instanceof JobBoxApiError ? err.status || 502 : 502
  console.error(`[${label}]`, err)
  res.status(status).json({
    message: err instanceof Error ? err.message : `Failed to fetch ${label}`,
    code: err instanceof JobBoxApiError ? err.code : undefined,
  })
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, baseUrl, sdk: 'node' })
})

app.get('/api/categories', async (_req, res) => {
  try {
    const result = await jobbox.jobs.categories()
    res.json({
      categories: Array.isArray(result?.categories) ? result.categories : [],
    })
  } catch (err) {
    sendSdkError(res, err, 'categories')
  }
})

app.get('/api/jobs', async (req, res) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : ''
    const page = Math.max(1, Number(req.query.page) || 1)
    const perPage = Math.min(50, Math.max(1, Number(req.query.perPage) || 12))

    const result = await jobbox.jobs.list({
      search: search || undefined,
      category: category || undefined,
      page,
      perPage,
    })

    res.json({
      jobs: result.jobs,
      total: result.total,
      page: result.page,
      perPage: result.perPage,
    })
  } catch (err) {
    sendSdkError(res, err, 'jobs')
  }
})

app.get('/api/jobs/:id', async (req, res) => {
  try {
    const id = String(req.params.id || '').trim()
    if (!id) {
      res.status(400).json({ message: 'Job id is required' })
      return
    }
    const result = await jobbox.jobs.get(id)
    res.json({ job: result.job })
  } catch (err) {
    sendSdkError(res, err, 'job')
  }
})

const isPreview = process.argv.includes('--preview')

if (isPreview) {
  app.use(express.static(path.join(__dirname, 'dist')))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'))
  })
} else {
  const vite = await createViteServer({
    root: __dirname,
    server: { middlewareMode: true },
    appType: 'spa',
  })
  app.use(vite.middlewares)
}

app.listen(PORT, () => {
  console.log(`JobBox Vue jobs demo → http://localhost:${PORT}`)
  console.log(`SDK                  → @getjobbox/sdk (Node)`)
  console.log(`SDK base URL         → ${baseUrl}`)
})
