'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowSquareOut,
  ArrowsClockwise,
  ArrowsSplit,
  Briefcase,
  Buildings,
  BuildingOffice,
  CalendarBlank,
  CheckCircle,
  Clock,
  ClockUser,
  Coins,
  Globe,
  GraduationCap,
  Handshake,
  Hourglass,
  MagnifyingGlass,
  MapPin,
  Money,
  Signature,
  Tag,
  TrendUp,
  Wallet,
  WifiHigh,
} from '@phosphor-icons/react'
import Pagination from './Pagination.jsx'
import {
  formatDateTime,
  formatDetailValue,
  formatSalaryDisplay,
  humanizeLabel,
  jobBoxPublicUrl,
} from '@/lib/format.js'
import {
  ensureCategories,
  ensureDetail,
  ensureList,
  getJobsState,
  peekDetail,
  peekList,
  seedDetail,
} from '@/lib/jobs-cache.js'

const perPage = 24
const CATEGORY_PREVIEW_COUNT = 2

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

const listSkeletonKeys = Array.from({ length: perPage }, (_, i) => `skel-${i}`)

/** Same mapping as frontend useJobTagVisuals.getWorkModeIcon */
function workModeIcon(value) {
  const v = String(value || '').trim().toLowerCase()
  if (v === 'remote') return WifiHigh
  if (v === 'hybrid') return ArrowsSplit
  if (v === 'onsite' || v === 'on_site' || v === 'on-site') return BuildingOffice
  return Buildings
}

function employmentTypeIcon(value) {
  const v = String(value || '').trim().toLowerCase()
  if (v === 'full_time' || v === 'full-time') return Clock
  if (v === 'part_time' || v === 'part-time') return ClockUser
  if (v === 'contract') return Signature
  if (v === 'internship') return GraduationCap
  if (v === 'freelance') return Handshake
  if (v === 'temporary') return Hourglass
  return Briefcase
}

function overviewFieldIcon(key, value) {
  switch (key) {
    case 'location':
      return MapPin
    case 'country_code':
      return Globe
    case 'category':
      return Tag
    case 'work_mode':
      return workModeIcon(value)
    case 'seniority_level':
      return TrendUp
    case 'employment_type':
      return employmentTypeIcon(value)
    case 'compensation_type':
      return Money
    case 'salary_range':
      return Wallet
    case 'currency':
      return Coins
    case 'status':
      return CheckCircle
    default:
      return Briefcase
  }
}

function timelineFieldIcon(key) {
  switch (key) {
    case 'created_at':
      return CalendarBlank
    case 'updated_at':
      return ArrowsClockwise
    default:
      return Clock
  }
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

function jobBadges(job) {
  if (!job || typeof job !== 'object') return []
  const badges = []
  const push = (value, key) => {
    if (value == null || value === '') return
    const text = humanizeLabel(value)
    if (!text || badges.some((b) => b.text.toLowerCase() === text.toLowerCase())) return
    badges.push({
      key,
      text,
      icon: key === 'work_mode' ? workModeIcon(value) : null,
      value: String(value),
    })
  }
  push(job.work_mode, 'work_mode')
  push(job.employment_type, 'employment_type')
  push(job.seniority_level, 'seniority_level')
  push(job.compensation_type, 'compensation_type')
  push(job.category, 'category')
  push(job.location, 'location')
  return badges.slice(0, 5)
}

/** Plain-text blurb for cards (CSS clamps to 2 lines). */
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

function categoryLabel(item) {
  return item.label || item.slug || item.id
}

function categorySlug(item) {
  return item.slug || item.label || ''
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Light markdown → HTML for description / requirements. */
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

function buildDetailFacts(job) {
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
      rows.push({
        key,
        label,
        value: currencyCode,
        icon: overviewFieldIcon(key, currencyCode),
      })
      continue
    }

    const value = job[key]
    if (value == null || value === '') continue
    let display = HUMANIZE_KEYS.has(key) ? humanizeLabel(value) : formatDetailValue(value)

    if (key === 'salary_range') {
      display = formatSalaryDisplay(display, currencyCode)
    }

    rows.push({
      key,
      label,
      value: display,
      icon: overviewFieldIcon(key, value),
    })
  }
  return rows
}

function buildDetailTimeline(job) {
  if (!job || typeof job !== 'object') return []
  const rows = []
  for (const [key, label] of TIMELINE_FIELDS) {
    const value = job[key]
    if (value == null || value === '') continue
    rows.push({
      key,
      label,
      value: formatDateTime(value),
      icon: timelineFieldIcon(key),
    })
  }
  return rows
}

function buildDetailDescriptionHtml(job) {
  if (!job) return ''
  const html = job.description_html || job.descriptionHtml
  if (typeof html === 'string' && html.trim()) return html
  const text = job.description || job.summary
  if (typeof text === 'string' && text.trim()) return formatRichText(text)
  return ''
}

function buildDetailRequirementsHtml(job) {
  const text = job?.requirements
  if (typeof text !== 'string' || !text.trim()) return ''
  return formatRichText(text)
}

export default function JobsBoard({
  pageTitle = 'All Jobs',
  lockedCategory = '',
}) {
  const locked = String(lockedCategory || '').trim()
  const showCategoryFilters = !locked

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)
  const [jobs, setJobs] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [categoriesExpanded, setCategoriesExpanded] = useState(false)
  const [categories, setCategories] = useState([])
  const [categoriesError, setCategoriesError] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [selectedId, setSelectedId] = useState('')
  const [detailJob, setDetailJob] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')

  const listRequestId = useRef(0)
  const detailRequestId = useRef(0)
  const selectedIdRef = useRef('')

  const currentListQuery = useCallback(
    () => ({
      page,
      perPage,
      search: debouncedSearch,
      category: locked || category,
    }),
    [page, debouncedSearch, locked, category]
  )

  const visibleCategories = useMemo(() => {
    const all = categories
    if (categoriesExpanded || all.length <= CATEGORY_PREVIEW_COUNT) return all
    const preview = all.slice(0, CATEGORY_PREVIEW_COUNT)
    if (!category) return preview
    const alreadyShown = preview.some((item) => categorySlug(item) === category)
    if (alreadyShown) return preview
    const selectedItem = all.find((item) => categorySlug(item) === category)
    return selectedItem ? [...preview, selectedItem] : preview
  }, [categories, categoriesExpanded, category])

  const hasMoreCategories = categories.length > CATEGORY_PREVIEW_COUNT

  const detailLogo = useMemo(() => {
    const url = detailJob?.company_logo_url
    return typeof url === 'string' && /^https?:\/\//i.test(url) ? url : ''
  }, [detailJob])

  const detailFacts = useMemo(() => buildDetailFacts(detailJob), [detailJob])
  const detailTimeline = useMemo(() => buildDetailTimeline(detailJob), [detailJob])
  const detailDescriptionHtml = useMemo(
    () => buildDetailDescriptionHtml(detailJob),
    [detailJob]
  )
  const detailRequirementsHtml = useMemo(
    () => buildDetailRequirementsHtml(detailJob),
    [detailJob]
  )
  const detailApplyUrl = useMemo(() => jobBoxPublicUrl(detailJob), [detailJob])

  const loadCategories = useCallback(async () => {
    if (!showCategoryFilters) return
    try {
      await ensureCategories()
      setCategories(getJobsState().categories)
      setCategoriesError(getJobsState().categoriesError)
    } catch {
      setCategories(getJobsState().categories)
      setCategoriesError(getJobsState().categoriesError)
    }
  }, [showCategoryFilters])

  const loadJobs = useCallback(async () => {
    const requestId = ++listRequestId.current
    const query = currentListQuery()
    const cached = peekList(query)

    if (cached) {
      setJobs(cached.jobs)
      setTotal(cached.total)
      setLoading(false)
      setRefreshing(!cached.fresh)
      setError('')
    } else {
      setLoading(true)
      setRefreshing(false)
      setError('')
    }

    try {
      const result = await ensureList(query)
      if (requestId !== listRequestId.current) return
      setJobs(result.jobs)
      setTotal(result.total)
      setError('')
    } catch (err) {
      if (requestId !== listRequestId.current) return
      if (!cached) {
        setJobs([])
        setTotal(0)
        setError(err instanceof Error ? err.message : 'Could not load jobs')
      }
    } finally {
      if (requestId === listRequestId.current) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [currentListQuery])

  const selectCategory = useCallback(
    (slug) => {
      if (locked) return
      setCategory((prev) => (prev === slug ? '' : slug))
      setPage(1)
    },
    [locked]
  )

  const toggleCategoriesExpanded = useCallback(() => {
    setCategoriesExpanded((prev) => !prev)
  }, [])

  const closeModal = useCallback(() => {
    setModalOpen(false)
    setSelectedId('')
    selectedIdRef.current = ''
    setDetailJob(null)
    setDetailError('')
    setDetailLoading(false)
    detailRequestId.current += 1
  }, [])

  const openJob = useCallback(async (job) => {
    const id = job?.id
    if (!id) return
    const requestId = ++detailRequestId.current
    setSelectedId(id)
    selectedIdRef.current = id
    setModalOpen(true)
    setDetailError('')

    if (job && typeof job === 'object') seedDetail(job)

    const cached = peekDetail(id)
    let hasDetail = false
    if (cached?.job) {
      setDetailJob(cached.job)
      setDetailLoading(false)
      hasDetail = true
    } else if (job && typeof job === 'object') {
      setDetailJob(job)
      setDetailLoading(false)
      hasDetail = true
    } else {
      setDetailJob(null)
      setDetailLoading(true)
    }

    try {
      const result = await ensureDetail(id)
      if (requestId !== detailRequestId.current || selectedIdRef.current !== id) return
      setDetailJob(result.job)
      setDetailError('')
    } catch (err) {
      if (requestId !== detailRequestId.current || selectedIdRef.current !== id) return
      if (!hasDetail) {
        setDetailError(err instanceof Error ? err.message : 'Could not load job')
      }
    } finally {
      if (requestId === detailRequestId.current) setDetailLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim())
      setPage(1)
    }, 280)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setCategory(locked || '')
    setPage(1)
    setSearch('')
    setDebouncedSearch('')
    setCategoriesExpanded(false)
  }, [locked])

  useEffect(() => {
    void loadJobs()
  }, [loadJobs])

  useEffect(() => {
    void loadCategories()
  }, [loadCategories])

  useEffect(() => {
    const onKeydown = (event) => {
      if (event.key === 'Escape' && modalOpen) closeModal()
    }
    window.addEventListener('keydown', onKeydown)
    return () => window.removeEventListener('keydown', onKeydown)
  }, [modalOpen, closeModal])

  useEffect(() => {
    document.body.classList.toggle('modal-open', modalOpen)
    return () => {
      document.body.classList.remove('modal-open')
    }
  }, [modalOpen])

  return (
    <div className="jobs-page">
      <header className="hero-banner">
        <div className="hero-banner-media" aria-hidden="true" />
        <div className="hero-banner-scrim" aria-hidden="true" />
        <div className="hero-banner-inner">
          {pageTitle ? <p className="hero-section">{pageTitle}</p> : null}
          <h1>JobFinder</h1>

          <label className="search">
            <span className="sr-only">Search jobs</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              type="search"
              placeholder="Search titles, companies…"
              autoComplete="off"
            />
            <MagnifyingGlass
              className="search-icon"
              size={18}
              weight="bold"
              aria-hidden="true"
            />
          </label>

          {showCategoryFilters ? (
            <div className="categories" aria-label="Job categories">
              {categoriesError ? (
                <p className="categories-error">{categoriesError}</p>
              ) : (
                <>
                  <button
                    type="button"
                    className={`chip${!category ? ' active' : ''}`}
                    onClick={() => selectCategory('')}
                  >
                    All
                  </button>
                  {visibleCategories.map((item) => {
                    const slug = categorySlug(item)
                    return (
                      <button
                        key={item.id || slug}
                        type="button"
                        className={`chip${category === slug ? ' active' : ''}`}
                        onClick={() => selectCategory(slug)}
                      >
                        {categoryLabel(item)}
                      </button>
                    )
                  })}
                  {hasMoreCategories ? (
                    <button
                      type="button"
                      className="chip chip-more"
                      aria-expanded={categoriesExpanded ? 'true' : 'false'}
                      onClick={toggleCategoriesExpanded}
                    >
                      {categoriesExpanded ? 'Less' : 'More…'}
                    </button>
                  ) : null}
                  {!categories.length ? (
                    <p className="categories-empty">No categories yet.</p>
                  ) : null}
                </>
              )}
            </div>
          ) : (
            <p className="category-lock">
              Showing <strong>HR &amp; People</strong> roles only
            </p>
          )}
        </div>
      </header>

      <div className="page">
        <section className="status" aria-live="polite">
          {loading ? (
            <p className="sr-only">Loading jobs…</p>
          ) : error ? (
            <p className="error">{error}</p>
          ) : (
            <p>
              {total.toLocaleString()} result{total === 1 ? '' : 's'}
              {debouncedSearch ? ` for “${debouncedSearch}”` : ''}
              {showCategoryFilters && category ? ` in ${category}` : ''}
              {refreshing ? <span className="status-refresh"> · Updating…</span> : null}
            </p>
          )}
        </section>

        {loading ? (
          <ul className="list" aria-busy="true" aria-label="Loading jobs">
            {listSkeletonKeys.map((key) => (
              <li key={key} className="card card-skel" aria-hidden="true">
                <div className="card-body skel-card-body">
                  <div className="card-top">
                    <span className="skel skel-line skel-card-title" />
                    <span className="skel skel-line skel-card-company" />
                    <span className="skel skel-line skel-card-snippet" />
                    <span className="skel skel-line skel-card-snippet short" />
                    <div className="skel-card-badges">
                      <span className="skel skel-card-badge" />
                      <span className="skel skel-card-badge" />
                      <span className="skel skel-card-badge" />
                    </div>
                  </div>
                  <span className="skel skel-card-cta" />
                </div>
              </li>
            ))}
          </ul>
        ) : !error ? (
          <ul className="list">
            {jobs.map((job) => {
              const logo = jobLogo(job)
              const badges = jobBadges(job)
              const snippet = jobSnippet(job)
              return (
                <li
                  key={job.id}
                  className="card"
                  role="button"
                  tabIndex={0}
                  onClick={() => openJob(job)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      openJob(job)
                    }
                  }}
                >
                  <div className="card-body">
                    <div className="card-top">
                      {logo ? (
                        <img
                          className="card-logo"
                          src={logo}
                          alt={`${jobCompany(job)} logo`}
                          width={40}
                          height={40}
                          loading="lazy"
                        />
                      ) : null}
                      <h2>{jobTitle(job)}</h2>
                      <p className="company">{jobCompany(job)}</p>
                      {snippet ? <p className="card-snippet">{snippet}</p> : null}
                      {badges.length ? (
                        <div className="card-badges">
                          {badges.map((badge) => {
                            const BadgeIcon = badge.icon
                            return (
                              <span
                                key={`${job.id}-${badge.key}`}
                                className="card-badge"
                                data-kind={badge.key}
                              >
                                {BadgeIcon ? (
                                  <BadgeIcon
                                    className="card-badge-icon"
                                    size={12}
                                    weight="bold"
                                    aria-hidden="true"
                                  />
                                ) : null}
                                {badge.text}
                              </span>
                            )
                          })}
                        </div>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className="card-cta"
                      onClick={(e) => {
                        e.stopPropagation()
                        openJob(job)
                      }}
                    >
                      View Job
                    </button>
                  </div>
                </li>
              )
            })}
            {jobs.length === 0 ? <li className="empty">No jobs matched.</li> : null}
          </ul>
        ) : null}

        <Pagination
          currentPage={page}
          totalItems={total}
          itemsPerPage={perPage}
          loading={loading}
          onPageChange={setPage}
        />

        {modalOpen ? (
          <div
            className="modal-root"
            role="dialog"
            aria-modal="true"
            aria-labelledby="job-detail-title"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeModal()
            }}
          >
            <div className="modal">
              <header className="modal-head">
                <div className="modal-title-block">
                  {detailLoading ? (
                    <>
                      <div className="modal-head-row">
                        <div className="skel skel-logo" aria-hidden="true" />
                        <div className="modal-head-copy">
                          <div className="skel skel-line skel-eyebrow" aria-hidden="true" />
                          <div className="skel skel-line skel-title" aria-hidden="true" />
                          <div className="skel skel-line skel-company" aria-hidden="true" />
                        </div>
                      </div>
                      <h2 id="job-detail-title" className="sr-only">
                        Loading job
                      </h2>
                    </>
                  ) : (
                    <div className="modal-head-row">
                      {detailLogo ? (
                        <img
                          className="company-logo"
                          src={detailLogo}
                          alt={`${jobCompany(detailJob)} logo`}
                          width={56}
                          height={56}
                        />
                      ) : null}
                      <div className="modal-head-copy">
                        <p className="company">{jobCompany(detailJob)}</p>
                        <h2 id="job-detail-title">{jobTitle(detailJob)}</h2>
                      </div>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="modal-close"
                  aria-label="Close"
                  onClick={closeModal}
                >
                  ×
                </button>
              </header>

              <div className="modal-body" aria-busy={detailLoading ? 'true' : 'false'}>
                {detailLoading ? (
                  <div
                    className="modal-skeleton"
                    aria-live="polite"
                    aria-label="Loading job"
                  >
                    <div className="overview-grid">
                      <span className="skel skel-fact" />
                      <span className="skel skel-fact" />
                      <span className="skel skel-fact" />
                      <span className="skel skel-fact" />
                    </div>
                    <div className="skel-section">
                      <span className="skel skel-line skel-heading" />
                      <span className="skel skel-line" />
                      <span className="skel skel-line" />
                      <span className="skel skel-line short" />
                    </div>
                    <div className="skel-spinner" aria-hidden="true">
                      <span className="spinner" />
                    </div>
                  </div>
                ) : detailError ? (
                  <p className="error">{detailError}</p>
                ) : detailJob ? (
                  <>
                    {detailFacts.length ? (
                      <section className="modal-section">
                        <h3 className="modal-section-title">Overview</h3>
                        <div className="overview-grid">
                          {detailFacts.map((row) => {
                            const RowIcon = row.icon
                            return (
                              <div key={row.key} className="overview-item">
                                <span className="overview-label">
                                  {RowIcon ? (
                                    <RowIcon
                                      className="overview-icon"
                                      size={14}
                                      weight="bold"
                                      aria-hidden="true"
                                    />
                                  ) : null}
                                  {row.label}
                                </span>
                                <span className="overview-value">{row.value}</span>
                              </div>
                            )
                          })}
                        </div>
                      </section>
                    ) : null}

                    {detailDescriptionHtml ? (
                      <section className="modal-section prose-block">
                        <h3 className="modal-section-title">Description</h3>
                        <div
                          className="prose"
                          dangerouslySetInnerHTML={{ __html: detailDescriptionHtml }}
                        />
                      </section>
                    ) : null}

                    {detailRequirementsHtml ? (
                      <section className="modal-section prose-block">
                        <h3 className="modal-section-title">Requirements</h3>
                        <div
                          className="prose"
                          dangerouslySetInnerHTML={{ __html: detailRequirementsHtml }}
                        />
                      </section>
                    ) : null}

                    {detailTimeline.length ? (
                      <section className="modal-section">
                        <h3 className="modal-section-title">Timeline</h3>
                        <div className="timeline-row">
                          {detailTimeline.map((row) => {
                            const RowIcon = row.icon
                            return (
                              <div key={row.key} className="timeline-item">
                                <span className="timeline-label">
                                  {RowIcon ? (
                                    <RowIcon
                                      className="timeline-icon"
                                      size={14}
                                      weight="bold"
                                      aria-hidden="true"
                                    />
                                  ) : null}
                                  {row.label}
                                </span>
                                <span className="timeline-value">{row.value}</span>
                              </div>
                            )
                          })}
                        </div>
                      </section>
                    ) : null}
                  </>
                ) : null}
              </div>

              {!detailLoading && !detailError && detailJob && detailApplyUrl ? (
                <footer className="modal-foot">
                  <a
                    className="action-link primary"
                    href={detailApplyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Apply on JobBox
                    <ArrowSquareOut size={16} weight="bold" aria-hidden="true" />
                  </a>
                </footer>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

