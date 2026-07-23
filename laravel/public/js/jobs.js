/**
 * JobFinder client — mirrors the Vue example's store + JobsView behaviour.
 * Talks only to local /api/* (PHP SDK holds JOBBOX_API_KEY on the server).
 */
(function () {
  'use strict'

  const config = window.JOBFINDER_CONFIG || {}
  const PER_PAGE = Number(config.perPage) || 24
  const LOCKED_CATEGORY = String(config.lockedCategory || '').trim()
  const SHOW_CATEGORIES = Boolean(config.showCategories)
  const JOBBOX_APP_URL = String(config.jobboxAppUrl || 'https://app.getjobbox.com').replace(/\/$/, '')
  const CATEGORY_PREVIEW_COUNT = 2

  const LIST_TTL_MS = 5 * 60 * 1000
  const DETAIL_TTL_MS = 10 * 60 * 1000
  const CATEGORIES_TTL_MS = 30 * 60 * 1000

  const OVERVIEW_FIELDS = [
    ['location', 'Location'],
    ['country_code', 'Country'],
    ['category', 'Category'],
    ['work_mode', 'Work mode'],
    ['seniority_level', 'Seniority'],
    ['employment_type', 'Employment'],
    ['compensation_type', 'Compensation'],
    ['salary_range', 'Salary'],
    ['currency', 'Currency'],
    ['status', 'Status'],
  ]

  const TIMELINE_FIELDS = [
    ['created_at', 'Created'],
    ['updated_at', 'Updated'],
  ]

  const HUMANIZE_KEYS = new Set([
    'work_mode',
    'employment_type',
    'seniority_level',
    'compensation_type',
    'status',
    'category',
  ])

  const state = {
    search: '',
    debouncedSearch: '',
    category: LOCKED_CATEGORY || '',
    page: 1,
    jobs: [],
    total: 0,
    loading: false,
    refreshing: false,
    error: '',
    categories: [],
    categoriesError: '',
    categoriesExpanded: false,
    categoriesFetchedAt: 0,
    modalOpen: false,
    selectedId: '',
    detailJob: null,
    detailLoading: false,
    detailError: '',
    lists: Object.create(null),
    details: Object.create(null),
  }

  const listInflight = new Map()
  const detailInflight = new Map()
  let categoriesInflight = null
  let debounceTimer = null
  let listRequestId = 0
  let detailRequestId = 0

  const els = {
    search: document.getElementById('job-search'),
    categories: document.getElementById('categories'),
    status: document.getElementById('status'),
    list: document.getElementById('job-list'),
    pager: document.getElementById('pager'),
    modal: document.getElementById('job-modal'),
    modalTitle: document.getElementById('modal-title-block'),
    modalBody: document.getElementById('modal-body'),
    modalFoot: document.getElementById('modal-foot'),
    modalClose: document.getElementById('modal-close'),
    navToggle: document.getElementById('nav-toggle'),
    navLinks: document.getElementById('site-nav-links'),
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  function humanizeLabel(value) {
    const raw = String(value || '').trim()
    if (!raw) return ''
    const lower = raw.toLowerCase()
    if (lower === 'onsite' || lower === 'on_site' || lower === 'on-site') return 'On-site'
    if (lower === 'remote') return 'Remote'
    if (lower === 'hybrid') return 'Hybrid'
    return raw
      .replace(/[_-]+/g, ' ')
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase())
  }

  function formatDate(value) {
    if (value == null || value === '') return ''
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return String(value)
    return d.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  function formatDateTime(value) {
    if (value == null || value === '') return ''
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return String(value)
    const date = formatDate(value)
    const time = d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
    return `${date} at ${time}`
  }

  function formatSalaryDisplay(salaryRange, currency) {
    if (salaryRange == null || salaryRange === '') return ''
    const display = String(salaryRange).trim()
    if (!display) return ''
    const currencyCode =
      typeof currency === 'string' && currency.trim() ? currency.trim().toUpperCase() : ''
    if (!currencyCode) return display
    const alreadyHasCurrency = new RegExp(
      `\\b${currencyCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
      'i'
    ).test(display)
    if (alreadyHasCurrency) return display
    return `${display} ${currencyCode}`
  }

  function formatDetailValue(value) {
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    if (Array.isArray(value)) {
      return value.map((v) => (typeof v === 'object' ? JSON.stringify(v) : String(v))).join(', ')
    }
    if (typeof value === 'object' && value !== null) {
      try {
        return JSON.stringify(value, null, 2)
      } catch {
        return String(value)
      }
    }
    return String(value)
  }

  function jobBoxPublicUrl(job) {
    const id = job?.id
    if (!id) return ''
    return `${JOBBOX_APP_URL}/j/${encodeURIComponent(String(id))}`
  }

  function formatRichText(raw) {
    const text = String(raw).replace(/\r\n/g, '\n').trim()
    if (!text) return ''
    if (/<[a-z][\s\S]*>/i.test(text)) return text

    const lines = text.split('\n')
    const parts = []
    let listOpen = false

    const flushList = () => {
      if (listOpen) {
        parts.push('</ul>')
        listOpen = false
      }
    }

    const inline = (line) =>
      escapeHtml(line)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) {
        flushList()
        continue
      }
      const heading = trimmed.match(/^(#{1,3})\s+(.+)$/)
      if (heading) {
        flushList()
        const level = heading[1].length
        parts.push(`<h${level + 2}>${inline(heading[2])}</h${level + 2}>`)
        continue
      }
      const bullet = trimmed.match(/^[-*•]\s+(.+)$/)
      if (bullet) {
        if (!listOpen) {
          parts.push('<ul>')
          listOpen = true
        }
        parts.push(`<li>${inline(bullet[1])}</li>`)
        continue
      }
      flushList()
      parts.push(`<p>${inline(trimmed)}</p>`)
    }
    flushList()
    return parts.join('')
  }

  function jobTitle(job) {
    return job?.title || 'Untitled role'
  }

  function jobCompany(job) {
    return job?.company || job?.company_name || 'Company'
  }

  function jobLogo(job) {
    const url = job?.company_logo_url
    return typeof url === 'string' && /^https?:\/\//i.test(url) ? url : ''
  }

  function jobSnippet(job) {
    const raw = job?.summary || job?.description || ''
    if (typeof raw !== 'string' || !raw.trim()) return ''
    return raw
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`[^`]*`/g, ' ')
      .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]*)]\([^)]*\)/g, '$1')
      .replace(/<\/?[^>]+>/g, ' ')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/^[-*•]\s+/gm, '')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/\s+/g, ' ')
      .trim()
  }

  function jobBadges(job) {
    if (!job || typeof job !== 'object') return []
    const badges = []
    const push = (value, key) => {
      if (value == null || value === '') return
      const text = humanizeLabel(value)
      if (!text || badges.some((b) => b.text.toLowerCase() === text.toLowerCase())) return
      badges.push({ key, text, value: String(value) })
    }
    push(job.work_mode, 'work_mode')
    push(job.employment_type, 'employment_type')
    push(job.seniority_level, 'seniority_level')
    push(job.compensation_type, 'compensation_type')
    push(job.category, 'category')
    push(job.location, 'location')
    return badges.slice(0, 5)
  }

  function categoryLabel(item) {
    return item.label || item.slug || item.id
  }

  function categorySlug(item) {
    return item.slug || item.label || ''
  }

  function listKey({ page, perPage, search, category }) {
    return [page, perPage, search || '', category || ''].join('\0')
  }

  function isFresh(fetchedAt, ttlMs) {
    return typeof fetchedAt === 'number' && Date.now() - fetchedAt < ttlMs
  }

  function peekList(query) {
    const entry = state.lists[listKey(query)]
    if (!entry) return null
    return {
      jobs: entry.jobs,
      total: entry.total,
      fresh: isFresh(entry.fetchedAt, LIST_TTL_MS),
    }
  }

  function peekDetail(id) {
    if (!id) return null
    const entry = state.details[String(id)]
    if (!entry?.job) return null
    return {
      job: entry.job,
      fresh: isFresh(entry.fetchedAt, DETAIL_TTL_MS),
    }
  }

  function seedDetail(job) {
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

  async function ensureList(query, { force = false } = {}) {
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

  async function ensureDetail(id, { force = false } = {}) {
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

  async function ensureCategories({ force = false } = {}) {
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

  function currentListQuery() {
    return {
      page: state.page,
      perPage: PER_PAGE,
      search: state.debouncedSearch,
      category: LOCKED_CATEGORY || state.category,
    }
  }

  async function loadJobs() {
    const requestId = ++listRequestId
    const query = currentListQuery()
    const cached = peekList(query)

    if (cached) {
      state.jobs = cached.jobs
      state.total = cached.total
      state.loading = false
      state.refreshing = !cached.fresh
      state.error = ''
    } else {
      state.loading = true
      state.refreshing = false
      state.error = ''
    }
    render()

    try {
      const result = await ensureList(query)
      if (requestId !== listRequestId) return
      state.jobs = result.jobs
      state.total = result.total
      state.error = ''
    } catch (err) {
      if (requestId !== listRequestId) return
      if (!cached) {
        state.jobs = []
        state.total = 0
        state.error = err instanceof Error ? err.message : 'Could not load jobs'
      }
    } finally {
      if (requestId === listRequestId) {
        state.loading = false
        state.refreshing = false
        render()
      }
    }
  }

  async function loadCategories() {
    if (!SHOW_CATEGORIES || !els.categories) return
    try {
      await ensureCategories()
    } catch {
      // Error string lives on state for the UI.
    }
    renderCategories()
  }

  function selectCategory(slug) {
    if (LOCKED_CATEGORY) return
    state.category = state.category === slug ? '' : slug
    state.page = 1
    void loadJobs()
    renderCategories()
  }

  function visibleCategories() {
    const all = state.categories
    if (state.categoriesExpanded || all.length <= CATEGORY_PREVIEW_COUNT) return all
    const preview = all.slice(0, CATEGORY_PREVIEW_COUNT)
    const selected = state.category
    if (!selected) return preview
    const alreadyShown = preview.some((item) => categorySlug(item) === selected)
    if (alreadyShown) return preview
    const selectedItem = all.find((item) => categorySlug(item) === selected)
    return selectedItem ? [...preview, selectedItem] : preview
  }

  function renderCategories() {
    if (!els.categories) return

    if (state.categoriesError) {
      els.categories.innerHTML = `<p class="categories-error">${escapeHtml(state.categoriesError)}</p>`
      return
    }

    if (!state.categories.length && !state.categoriesFetchedAt) {
      els.categories.innerHTML = `<p class="categories-empty">Loading categories…</p>`
      return
    }

    const chips = []
    chips.push(
      `<button type="button" class="chip${!state.category ? ' active' : ''}" data-slug="">All</button>`
    )
    for (const item of visibleCategories()) {
      const slug = categorySlug(item)
      chips.push(
        `<button type="button" class="chip${state.category === slug ? ' active' : ''}" data-slug="${escapeHtml(slug)}">${escapeHtml(categoryLabel(item))}</button>`
      )
    }
    if (state.categories.length > CATEGORY_PREVIEW_COUNT) {
      chips.push(
        `<button type="button" class="chip chip-more" data-more="1" aria-expanded="${state.categoriesExpanded ? 'true' : 'false'}">${state.categoriesExpanded ? 'Less' : 'More…'}</button>`
      )
    }
    if (!state.categories.length) {
      chips.push(`<p class="categories-empty">No categories yet.</p>`)
    }

    els.categories.innerHTML = chips.join('')
  }

  function renderStatus() {
    if (!els.status) return
    if (state.loading) {
      els.status.innerHTML = `<p class="sr-only">Loading jobs…</p>`
      return
    }
    if (state.error) {
      els.status.innerHTML = `<p class="error">${escapeHtml(state.error)}</p>`
      return
    }
    const total = state.total.toLocaleString()
    const plural = state.total === 1 ? '' : 's'
    let html = `<p>${total} result${plural}`
    if (state.debouncedSearch) {
      html += ` for “${escapeHtml(state.debouncedSearch)}”`
    }
    if (SHOW_CATEGORIES && state.category) {
      html += ` in ${escapeHtml(state.category)}`
    }
    if (state.refreshing) {
      html += ` <span class="status-refresh"> · Updating…</span>`
    }
    html += `</p>`
    els.status.innerHTML = html
  }

  function renderSkeleton() {
    const items = Array.from({ length: PER_PAGE }, () => `
      <li class="card card-skel" aria-hidden="true">
        <div class="card-body skel-card-body">
          <div class="card-top">
            <span class="skel skel-line skel-card-title"></span>
            <span class="skel skel-line skel-card-company"></span>
            <span class="skel skel-line skel-card-snippet"></span>
            <span class="skel skel-line skel-card-snippet short"></span>
            <div class="skel-card-badges">
              <span class="skel skel-card-badge"></span>
              <span class="skel skel-card-badge"></span>
              <span class="skel skel-card-badge"></span>
            </div>
          </div>
          <span class="skel skel-card-cta"></span>
        </div>
      </li>
    `).join('')
    els.list.setAttribute('aria-busy', 'true')
    els.list.setAttribute('aria-label', 'Loading jobs')
    els.list.innerHTML = items
  }

  function renderJobs() {
    if (!els.list) return

    if (state.loading) {
      renderSkeleton()
      return
    }

    els.list.setAttribute('aria-busy', 'false')
    els.list.setAttribute('aria-label', 'Jobs')

    if (state.error) {
      els.list.innerHTML = ''
      return
    }

    if (!state.jobs.length) {
      els.list.innerHTML = `<li class="empty">No jobs matched.</li>`
      return
    }

    els.list.innerHTML = state.jobs
      .map((job) => {
        const id = escapeHtml(String(job.id || ''))
        const logo = jobLogo(job)
        const badges = jobBadges(job)
        const snippet = jobSnippet(job)
        return `
          <li class="card" role="button" tabindex="0" data-job-id="${id}">
            <div class="card-body">
              <div class="card-top">
                ${logo ? `<img class="card-logo" src="${escapeHtml(logo)}" alt="${escapeHtml(jobCompany(job))} logo" width="40" height="40" loading="lazy">` : ''}
                <h2>${escapeHtml(jobTitle(job))}</h2>
                <p class="company">${escapeHtml(jobCompany(job))}</p>
                ${snippet ? `<p class="card-snippet">${escapeHtml(snippet)}</p>` : ''}
                ${
                  badges.length
                    ? `<div class="card-badges">${badges
                        .map(
                          (b) =>
                            `<span class="card-badge" data-kind="${escapeHtml(b.key)}">${escapeHtml(b.text)}</span>`
                        )
                        .join('')}</div>`
                    : ''
                }
              </div>
              <button type="button" class="card-cta" data-job-id="${id}">View Job</button>
            </div>
          </li>
        `
      })
      .join('')
  }

  function renderPager() {
    if (!els.pager) return
    const totalItems = state.total
    if (totalItems <= 0) {
      els.pager.hidden = true
      els.pager.innerHTML = ''
      return
    }

    const totalPages = Math.max(1, Math.ceil(totalItems / PER_PAGE))
    const startItem = (state.page - 1) * PER_PAGE + 1
    const endItem = Math.min(state.page * PER_PAGE, totalItems)
    const maxVisiblePages = 5
    const halfVisible = Math.floor(maxVisiblePages / 2)

    let pages
    if (totalPages <= maxVisiblePages) {
      pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    } else {
      let start = Math.max(1, state.page - halfVisible)
      let end = Math.min(totalPages, start + maxVisiblePages - 1)
      if (end === totalPages) {
        start = Math.max(1, end - maxVisiblePages + 1)
      }
      pages = Array.from({ length: end - start + 1 }, (_, i) => start + i)
    }

    const showFirstPage = totalPages > maxVisiblePages && pages[0] > 1
    const showLastPage =
      totalPages > maxVisiblePages && pages[pages.length - 1] < totalPages
    const showStartEllipsis = totalPages > maxVisiblePages && pages[0] > 2
    const showEndEllipsis =
      totalPages > maxVisiblePages && pages[pages.length - 1] < totalPages - 1

    let controls = ''
    if (totalPages > 1) {
      controls = `
        <div class="pager-controls">
          <button type="button" class="pager-btn" data-page="${state.page - 1}" ${state.loading || state.page <= 1 ? 'disabled' : ''}>Previous</button>
          <div class="pager-pages">
            ${showFirstPage ? `<button type="button" class="pager-num" data-page="1" ${state.loading ? 'disabled' : ''}>1</button>` : ''}
            ${showStartEllipsis ? `<span class="pager-ellipsis">…</span>` : ''}
            ${pages
              .map(
                (p) =>
                  `<button type="button" class="pager-num${p === state.page ? ' active' : ''}" data-page="${p}" ${state.loading ? 'disabled' : ''}>${p}</button>`
              )
              .join('')}
            ${showEndEllipsis ? `<span class="pager-ellipsis">…</span>` : ''}
            ${showLastPage ? `<button type="button" class="pager-num" data-page="${totalPages}" ${state.loading ? 'disabled' : ''}>${totalPages}</button>` : ''}
          </div>
          <button type="button" class="pager-btn" data-page="${state.page + 1}" ${state.loading || state.page >= totalPages ? 'disabled' : ''}>Next</button>
        </div>
      `
    }

    els.pager.hidden = false
    els.pager.innerHTML = `
      <p class="pager-summary">Showing ${startItem} to ${endItem} of ${totalItems.toLocaleString()} results</p>
      ${controls}
    `
  }

  function detailFacts(job) {
    if (!job || typeof job !== 'object') return []
    const rows = []
    const salaryText = job.salary_range
    const currencyCode =
      typeof job.currency === 'string' && job.currency.trim()
        ? job.currency.trim().toUpperCase()
        : ''

    for (const [key, label] of OVERVIEW_FIELDS) {
      if (key === 'currency') {
        if (salaryText != null && salaryText !== '') continue
        if (!currencyCode) continue
        rows.push({ key, label, value: currencyCode })
        continue
      }

      const value = job[key]
      if (value == null || value === '') continue
      let display = HUMANIZE_KEYS.has(key) ? humanizeLabel(value) : formatDetailValue(value)
      if (key === 'salary_range') {
        display = formatSalaryDisplay(display, currencyCode)
      }
      rows.push({ key, label, value: display })
    }
    return rows
  }

  function detailTimeline(job) {
    if (!job || typeof job !== 'object') return []
    const rows = []
    for (const [key, label] of TIMELINE_FIELDS) {
      const value = job[key]
      if (value == null || value === '') continue
      rows.push({ key, label, value: formatDateTime(value) })
    }
    return rows
  }

  function detailDescriptionHtml(job) {
    if (!job) return ''
    const html = job.description_html || job.descriptionHtml
    if (typeof html === 'string' && html.trim()) return html
    const text = job.description || job.summary
    if (typeof text === 'string' && text.trim()) return formatRichText(text)
    return ''
  }

  function detailRequirementsHtml(job) {
    const text = job?.requirements
    if (typeof text !== 'string' || !text.trim()) return ''
    return formatRichText(text)
  }

  function renderModal() {
    if (!els.modal) return

    if (!state.modalOpen) {
      els.modal.hidden = true
      document.body.classList.remove('modal-open')
      return
    }

    els.modal.hidden = false
    document.body.classList.add('modal-open')
    els.modalBody.setAttribute('aria-busy', state.detailLoading ? 'true' : 'false')

    if (state.detailLoading) {
      els.modalTitle.innerHTML = `
        <div class="modal-head-row">
          <div class="skel skel-logo" aria-hidden="true"></div>
          <div class="modal-head-copy">
            <div class="skel skel-line skel-eyebrow" aria-hidden="true"></div>
            <div class="skel skel-line skel-title" aria-hidden="true"></div>
            <div class="skel skel-line skel-company" aria-hidden="true"></div>
          </div>
        </div>
        <h2 id="job-detail-title" class="sr-only">Loading job</h2>
      `
      els.modalBody.innerHTML = `
        <div class="modal-skeleton" aria-live="polite" aria-label="Loading job">
          <div class="overview-grid">
            <span class="skel skel-fact"></span>
            <span class="skel skel-fact"></span>
            <span class="skel skel-fact"></span>
            <span class="skel skel-fact"></span>
          </div>
          <div class="skel-section">
            <span class="skel skel-line skel-heading"></span>
            <span class="skel skel-line"></span>
            <span class="skel skel-line"></span>
            <span class="skel skel-line short"></span>
          </div>
          <div class="skel-spinner" aria-hidden="true"><span class="spinner"></span></div>
        </div>
      `
      els.modalFoot.hidden = true
      els.modalFoot.innerHTML = ''
      return
    }

    if (state.detailError) {
      els.modalTitle.innerHTML = `<h2 id="job-detail-title">Job details</h2>`
      els.modalBody.innerHTML = `<p class="error">${escapeHtml(state.detailError)}</p>`
      els.modalFoot.hidden = true
      return
    }

    const job = state.detailJob
    if (!job) return

    const logo = jobLogo(job)
    els.modalTitle.innerHTML = `
      <div class="modal-head-row">
        ${logo ? `<img class="company-logo" src="${escapeHtml(logo)}" alt="${escapeHtml(jobCompany(job))} logo" width="56" height="56">` : ''}
        <div class="modal-head-copy">
          <p class="company">${escapeHtml(jobCompany(job))}</p>
          <h2 id="job-detail-title">${escapeHtml(jobTitle(job))}</h2>
        </div>
      </div>
    `

    const tags = Array.isArray(job.tags)
      ? job.tags.map((t) => String(t).trim()).filter(Boolean)
      : []
    const facts = detailFacts(job)
    const timeline = detailTimeline(job)
    const description = detailDescriptionHtml(job)
    const requirements = detailRequirementsHtml(job)

    let body = ''
    if (tags.length) {
      body += `<div class="tag-row">${tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>`
    }
    if (facts.length) {
      body += `
        <section class="modal-section">
          <h3 class="modal-section-title">Overview</h3>
          <div class="overview-grid">
            ${facts
              .map(
                (row) => `
              <div class="overview-item">
                <span class="overview-label">${escapeHtml(row.label)}</span>
                <span class="overview-value">${escapeHtml(row.value)}</span>
              </div>`
              )
              .join('')}
          </div>
        </section>
      `
    }
    if (description) {
      body += `
        <section class="modal-section prose-block">
          <h3 class="modal-section-title">Description</h3>
          <div class="prose">${description}</div>
        </section>
      `
    }
    if (requirements) {
      body += `
        <section class="modal-section prose-block">
          <h3 class="modal-section-title">Requirements</h3>
          <div class="prose">${requirements}</div>
        </section>
      `
    }
    if (timeline.length) {
      body += `
        <section class="modal-section">
          <h3 class="modal-section-title">Timeline</h3>
          <div class="timeline-row">
            ${timeline
              .map(
                (row) => `
              <div class="timeline-item">
                <span class="timeline-label">${escapeHtml(row.label)}</span>
                <span class="timeline-value">${escapeHtml(row.value)}</span>
              </div>`
              )
              .join('')}
          </div>
        </section>
      `
    }

    els.modalBody.innerHTML = body

    const applyUrl = jobBoxPublicUrl(job)
    if (applyUrl) {
      els.modalFoot.hidden = false
      els.modalFoot.innerHTML = `
        <a class="action-link primary" href="${escapeHtml(applyUrl)}" target="_blank" rel="noopener noreferrer">
          Apply on JobBox
          <svg width="16" height="16" viewBox="0 0 256 256" aria-hidden="true" focusable="false">
            <path fill="currentColor" d="M224 104a8 8 0 0 1-16 0V59.32l-66.33 66.34a8 8 0 0 1-11.32-11.32L196.68 48H152a8 8 0 0 1 0-16h64a8 8 0 0 1 8 8Zm-40 24a8 8 0 0 0-8 8v72H48V80h72a8 8 0 0 0 0-16H48a16 16 0 0 0-16 16v128a16 16 0 0 0 16 16h128a16 16 0 0 0 16-16v-72a8 8 0 0 0-8-8Z"/>
          </svg>
        </a>
      `
    } else {
      els.modalFoot.hidden = true
      els.modalFoot.innerHTML = ''
    }
  }

  function render() {
    renderStatus()
    renderJobs()
    renderPager()
    renderModal()
  }

  async function openJob(jobOrId) {
    const job = typeof jobOrId === 'object' ? jobOrId : null
    const id = job?.id || jobOrId
    if (!id) return

    const requestId = ++detailRequestId
    state.selectedId = String(id)
    state.modalOpen = true
    state.detailError = ''

    if (job && typeof job === 'object') seedDetail(job)

    const cached = peekDetail(id)
    if (cached?.job) {
      state.detailJob = cached.job
      state.detailLoading = false
    } else if (job && typeof job === 'object') {
      state.detailJob = job
      state.detailLoading = false
    } else {
      state.detailJob = null
      state.detailLoading = true
    }
    renderModal()

    try {
      const result = await ensureDetail(id)
      if (requestId !== detailRequestId || state.selectedId !== String(id)) return
      state.detailJob = result.job
      state.detailError = ''
    } catch (err) {
      if (requestId !== detailRequestId || state.selectedId !== String(id)) return
      if (!state.detailJob) {
        state.detailError = err instanceof Error ? err.message : 'Could not load job'
      }
    } finally {
      if (requestId === detailRequestId) {
        state.detailLoading = false
        renderModal()
      }
    }
  }

  function closeModal() {
    state.modalOpen = false
    state.selectedId = ''
    state.detailJob = null
    state.detailError = ''
    state.detailLoading = false
    detailRequestId += 1
    renderModal()
  }

  function goToPage(page) {
    if (state.loading) return
    const totalPages = Math.max(1, Math.ceil(state.total / PER_PAGE))
    const next = Math.max(1, Math.min(totalPages, page))
    if (next === state.page) return
    state.page = next
    window.scrollTo({ top: 0, behavior: 'smooth' })
    void loadJobs()
  }

  function findJobById(id) {
    return state.jobs.find((j) => String(j.id) === String(id)) || { id }
  }

  function bindEvents() {
    if (els.search) {
      els.search.addEventListener('input', () => {
        state.search = els.search.value
        clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => {
          state.debouncedSearch = state.search.trim()
          state.page = 1
          void loadJobs()
        }, 280)
      })
    }

    if (els.categories) {
      els.categories.addEventListener('click', (event) => {
        const btn = event.target.closest('button')
        if (!btn) return
        if (btn.dataset.more === '1') {
          state.categoriesExpanded = !state.categoriesExpanded
          renderCategories()
          return
        }
        if (typeof btn.dataset.slug === 'string') {
          selectCategory(btn.dataset.slug)
        }
      })
    }

    if (els.list) {
      els.list.addEventListener('click', (event) => {
        const target = event.target.closest('[data-job-id]')
        if (!target) return
        event.preventDefault()
        void openJob(findJobById(target.dataset.jobId))
      })
      els.list.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        const target = event.target.closest('.card[data-job-id]')
        if (!target) return
        event.preventDefault()
        void openJob(findJobById(target.dataset.jobId))
      })
    }

    if (els.pager) {
      els.pager.addEventListener('click', (event) => {
        const btn = event.target.closest('[data-page]')
        if (!btn || btn.disabled) return
        goToPage(Number(btn.dataset.page))
      })
    }

    if (els.modalClose) {
      els.modalClose.addEventListener('click', closeModal)
    }

    if (els.modal) {
      els.modal.addEventListener('click', (event) => {
        if (event.target === els.modal) closeModal()
      })
    }

    if (els.navToggle && els.navLinks) {
      els.navToggle.addEventListener('click', () => {
        const open = !els.navLinks.classList.contains('open')
        els.navLinks.classList.toggle('open', open)
        els.navToggle.setAttribute('aria-expanded', open ? 'true' : 'false')
        const label = els.navToggle.querySelector('.sr-only')
        if (label) label.textContent = open ? 'Close menu' : 'Open menu'
      })
    }

    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        if (state.modalOpen) closeModal()
        if (els.navLinks?.classList.contains('open')) {
          els.navLinks.classList.remove('open')
          els.navToggle?.setAttribute('aria-expanded', 'false')
        }
      }
    })
  }

  function init() {
    bindEvents()
    if (SHOW_CATEGORIES) void loadCategories()
    void loadJobs()
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
