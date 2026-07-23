/**
 * In-memory jobs cache for the React JobFinder example.
 * Same behavior as the Vue example store (no Vue dependency).
 */

const LIST_TTL_MS = 5 * 60 * 1000
const DETAIL_TTL_MS = 10 * 60 * 1000
const CATEGORIES_TTL_MS = 30 * 60 * 1000

/** @type {Map<string, Promise<{ jobs: object[], total: number }>>} */
const listInflight = new Map()
/** @type {Map<string, Promise<object>>} */
const detailInflight = new Map()
/** @type {Promise<object[]|null>|null} */
let categoriesInflight = null

function listKey({ page, perPage, search, category }) {
  return [page, perPage, search || '', category || ''].join('\0')
}

function isFresh(fetchedAt, ttlMs) {
  return typeof fetchedAt === 'number' && Date.now() - fetchedAt < ttlMs
}

export const state = {
  /** @type {Record<string, { jobs: object[], total: number, fetchedAt: number }>} */
  lists: Object.create(null),
  /** @type {Record<string, { job: object, fetchedAt: number }>} */
  details: Object.create(null),
  categories: /** @type {object[]} */ ([]),
  categoriesError: '',
  categoriesFetchedAt: 0,
}

export function getJobsState() {
  return state
}

export function peekList(query) {
  const entry = state.lists[listKey(query)]
  if (!entry) return null
  return {
    jobs: entry.jobs,
    total: entry.total,
    fresh: isFresh(entry.fetchedAt, LIST_TTL_MS),
  }
}

export function peekDetail(id) {
  if (!id) return null
  const entry = state.details[String(id)]
  if (!entry?.job) return null
  return {
    job: entry.job,
    fresh: isFresh(entry.fetchedAt, DETAIL_TTL_MS),
  }
}

export function seedDetail(job) {
  if (!job || typeof job !== 'object' || job.id == null) return
  const id = String(job.id)
  const existing = state.details[id]
  if (existing && isFresh(existing.fetchedAt, DETAIL_TTL_MS)) return
  state.details[id] = {
    job: existing?.job ? { ...existing.job, ...job } : { ...job },
    fetchedAt: existing?.fetchedAt || 0,
  }
}

async function fetchList(query) {
  const params = new URLSearchParams({
    page: String(query.page),
    perPage: String(query.perPage),
  })
  if (query.search) params.set('search', query.search)
  if (query.category) params.set('category', query.category)

  const res = await fetch(`/api/jobs?${params}`)
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(body.message || `Request failed (${res.status})`)
  }

  const jobs = Array.isArray(body.jobs) ? body.jobs : []
  const total = typeof body.total === 'number' ? body.total : 0
  const key = listKey(query)
  state.lists[key] = { jobs, total, fetchedAt: Date.now() }

  for (const job of jobs) {
    seedDetail(job)
  }

  return { jobs, total }
}

export async function ensureList(query, { force = false } = {}) {
  const key = listKey(query)
  const cached = peekList(query)

  if (cached?.fresh && !force) {
    return { jobs: cached.jobs, total: cached.total, fromCache: true }
  }

  let pending = listInflight.get(key)
  if (!pending) {
    pending = fetchList(query).finally(() => listInflight.delete(key))
    listInflight.set(key, pending)
  }
  const result = await pending
  return { ...result, fromCache: Boolean(cached) }
}

async function fetchDetail(id) {
  const res = await fetch(`/api/jobs/${encodeURIComponent(id)}`)
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(body.message || `Request failed (${res.status})`)
  }
  const job = body.job && typeof body.job === 'object' ? body.job : null
  if (!job) throw new Error('Job not found')
  state.details[String(id)] = { job, fetchedAt: Date.now() }
  return job
}

export async function ensureDetail(id, { force = false } = {}) {
  const key = String(id)
  const cached = peekDetail(key)

  if (cached?.fresh && !force) {
    return { job: cached.job, fromCache: true }
  }

  let pending = detailInflight.get(key)
  if (!pending) {
    pending = fetchDetail(key).finally(() => detailInflight.delete(key))
    detailInflight.set(key, pending)
  }
  const job = await pending
  return { job, fromCache: Boolean(cached) }
}

export async function ensureCategories({ force = false } = {}) {
  if (
    !force &&
    state.categories.length &&
    isFresh(state.categoriesFetchedAt, CATEGORIES_TTL_MS)
  ) {
    return state.categories
  }

  if (!categoriesInflight) {
    categoriesInflight = fetchCategories().finally(() => {
      categoriesInflight = null
    })
  }
  return categoriesInflight
}

async function fetchCategories() {
  state.categoriesError = ''
  try {
    const res = await fetch('/api/categories')
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(body.message || `Request failed (${res.status})`)
    }
    state.categories = Array.isArray(body.categories) ? body.categories : []
    state.categoriesFetchedAt = Date.now()
    return state.categories
  } catch (err) {
    if (!state.categories.length) {
      state.categoriesError =
        err instanceof Error ? err.message : 'Could not load categories'
    }
    throw err
  }
}

export function useJobsStore() {
  return {
    state,
    peekList,
    peekDetail,
    seedDetail,
    ensureList,
    ensureDetail,
    ensureCategories,
  }
}

/** Clears cache + in-flight maps. For unit tests only. */
export function resetJobsStoreForTests() {
  for (const key of Object.keys(state.lists)) delete state.lists[key]
  for (const key of Object.keys(state.details)) delete state.details[key]
  state.categories = []
  state.categoriesError = ''
  state.categoriesFetchedAt = 0
  listInflight.clear()
  detailInflight.clear()
  categoriesInflight = null
}
