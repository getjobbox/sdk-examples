<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  PhArrowSquareOut,
  PhArrowsClockwise,
  PhArrowsSplit,
  PhBriefcase,
  PhBuildings,
  PhBuildingOffice,
  PhCalendarBlank,
  PhCheckCircle,
  PhClock,
  PhClockUser,
  PhCoins,
  PhGlobe,
  PhGraduationCap,
  PhHandshake,
  PhHourglass,
  PhMagnifyingGlass,
  PhMapPin,
  PhMoney,
  PhSignature,
  PhTag,
  PhTrendUp,
  PhWallet,
  PhWifiHigh,
} from '@phosphor-icons/vue'
import Pagination from '../components/Pagination.vue'
import {
  formatDateTime,
  formatDetailValue,
  formatSalaryDisplay,
  humanizeLabel,
  jobBoxPublicUrl,
} from '../lib/format.js'
import {
  ensureCategories,
  ensureDetail,
  ensureList,
  peekDetail,
  peekList,
  seedDetail,
  useJobsStore,
} from '../stores/jobsStore'

const route = useRoute()
const jobsStore = useJobsStore()

const search = ref('')
const category = ref('')
const page = ref(1)
const perPage = 24
const jobs = ref([])
const total = ref(0)
const loading = ref(false)
const refreshing = ref(false)
const error = ref('')
const debouncedSearch = ref('')
let debounceTimer = null
let listRequestId = 0
let detailRequestId = 0

const modalOpen = ref(false)
const selectedId = ref('')
const detailJob = ref(null)
const detailLoading = ref(false)
const detailError = ref('')

const lockedCategory = computed(() => String(route.meta.lockedCategory || '').trim())
const showCategoryFilters = computed(() => !lockedCategory.value)
const pageTitle = computed(() => String(route.meta.title || 'All Jobs'))
const categoriesExpanded = ref(false)
const CATEGORY_PREVIEW_COUNT = 2

const categories = computed(() => jobsStore.state.categories)
const categoriesError = computed(() => jobsStore.state.categoriesError)

const visibleCategories = computed(() => {
  const all = categories.value
  if (categoriesExpanded.value || all.length <= CATEGORY_PREVIEW_COUNT) return all
  const preview = all.slice(0, CATEGORY_PREVIEW_COUNT)
  const selected = category.value
  if (!selected) return preview
  const alreadyShown = preview.some((item) => categorySlug(item) === selected)
  if (alreadyShown) return preview
  const selectedItem = all.find((item) => categorySlug(item) === selected)
  return selectedItem ? [...preview, selectedItem] : preview
})

const hasMoreCategories = computed(
  () => categories.value.length > CATEGORY_PREVIEW_COUNT
)

const listSkeletonKeys = Array.from({ length: perPage }, (_, i) => `skel-${i}`)

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

watch(search, (value) => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debouncedSearch.value = value.trim()
    page.value = 1
  }, 280)
})

watch(
  () => [route.name, lockedCategory.value],
  () => {
    category.value = lockedCategory.value || ''
    page.value = 1
    search.value = ''
    debouncedSearch.value = ''
    categoriesExpanded.value = false
  },
  { immediate: true }
)

watch([debouncedSearch, page, category], () => {
  void loadJobs()
}, { immediate: true })

async function loadCategories() {
  if (!showCategoryFilters.value) return
  try {
    await ensureCategories()
  } catch {
    // Error string lives on the store for the UI.
  }
}

function currentListQuery() {
  return {
    page: page.value,
    perPage,
    search: debouncedSearch.value,
    category: lockedCategory.value || category.value,
  }
}

async function loadJobs() {
  const requestId = ++listRequestId
  const query = currentListQuery()
  const cached = peekList(query)

  if (cached) {
    jobs.value = cached.jobs
    total.value = cached.total
    loading.value = false
    refreshing.value = !cached.fresh
    error.value = ''
  } else {
    loading.value = true
    refreshing.value = false
    error.value = ''
  }

  try {
    const result = await ensureList(query)
    if (requestId !== listRequestId) return
    jobs.value = result.jobs
    total.value = result.total
    error.value = ''
  } catch (err) {
    if (requestId !== listRequestId) return
    if (!cached) {
      jobs.value = []
      total.value = 0
      error.value = err instanceof Error ? err.message : 'Could not load jobs'
    }
  } finally {
    if (requestId === listRequestId) {
      loading.value = false
      refreshing.value = false
    }
  }
}

function selectCategory(slug) {
  if (lockedCategory.value) return
  category.value = category.value === slug ? '' : slug
  page.value = 1
}

function toggleCategoriesExpanded() {
  categoriesExpanded.value = !categoriesExpanded.value
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

/** Same mapping as frontend useJobTagVisuals.getWorkModeIcon */
function workModeIcon(value) {
  const v = String(value || '').trim().toLowerCase()
  if (v === 'remote') return PhWifiHigh
  if (v === 'hybrid') return PhArrowsSplit
  if (v === 'onsite' || v === 'on_site' || v === 'on-site') return PhBuildingOffice
  return PhBuildings
}

function employmentTypeIcon(value) {
  const v = String(value || '').trim().toLowerCase()
  if (v === 'full_time' || v === 'full-time') return PhClock
  if (v === 'part_time' || v === 'part-time') return PhClockUser
  if (v === 'contract') return PhSignature
  if (v === 'internship') return PhGraduationCap
  if (v === 'freelance') return PhHandshake
  if (v === 'temporary') return PhHourglass
  return PhBriefcase
}

function overviewFieldIcon(key, value) {
  switch (key) {
    case 'location':
      return PhMapPin
    case 'country_code':
      return PhGlobe
    case 'category':
      return PhTag
    case 'work_mode':
      return workModeIcon(value)
    case 'seniority_level':
      return PhTrendUp
    case 'employment_type':
      return employmentTypeIcon(value)
    case 'compensation_type':
      return PhMoney
    case 'salary_range':
      return PhWallet
    case 'currency':
      return PhCoins
    case 'status':
      return PhCheckCircle
    default:
      return PhBriefcase
  }
}

function timelineFieldIcon(key) {
  switch (key) {
    case 'created_at':
      return PhCalendarBlank
    case 'updated_at':
      return PhArrowsClockwise
    default:
      return PhClock
  }
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

const detailLogo = computed(() => {
  const url = detailJob.value?.company_logo_url
  return typeof url === 'string' && /^https?:\/\//i.test(url) ? url : ''
})

const detailTags = computed(() => {
  const tags = detailJob.value?.tags
  if (!Array.isArray(tags)) return []
  return tags.map((t) => String(t).trim()).filter(Boolean)
})

const HUMANIZE_KEYS = new Set([
  'work_mode',
  'employment_type',
  'seniority_level',
  'compensation_type',
  'status',
  'category',
])

const detailFacts = computed(() => {
  const job = detailJob.value
  if (!job || typeof job !== 'object') return []
  const rows = []
  const salaryText = job.salary_range
  const currencyCode =
    typeof job.currency === 'string' && job.currency.trim()
      ? job.currency.trim().toUpperCase()
      : ''

  for (const [key, label] of OVERVIEW_FIELDS) {
    // Currency is appended to salary when present.
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
    let display = HUMANIZE_KEYS.has(key)
      ? humanizeLabel(value)
      : formatDetailValue(value)

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
})

const detailTimeline = computed(() => {
  const job = detailJob.value
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
})

const detailDescriptionHtml = computed(() => {
  const job = detailJob.value
  if (!job) return ''
  const html = job.description_html || job.descriptionHtml
  if (typeof html === 'string' && html.trim()) return html
  const text = job.description || job.summary
  if (typeof text === 'string' && text.trim()) return formatRichText(text)
  return ''
})

const detailRequirementsHtml = computed(() => {
  const text = detailJob.value?.requirements
  if (typeof text !== 'string' || !text.trim()) return ''
  return formatRichText(text)
})

const detailApplyUrl = computed(() => jobBoxPublicUrl(detailJob.value))

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

async function openJob(job) {
  const id = job?.id
  if (!id) return
  const requestId = ++detailRequestId
  selectedId.value = id
  modalOpen.value = true
  detailError.value = ''

  if (job && typeof job === 'object') seedDetail(job)

  const cached = peekDetail(id)
  if (cached?.job) {
    detailJob.value = cached.job
    detailLoading.value = false
  } else if (job && typeof job === 'object') {
    detailJob.value = job
    detailLoading.value = false
  } else {
    detailJob.value = null
    detailLoading.value = true
  }

  try {
    const result = await ensureDetail(id)
    if (requestId !== detailRequestId || selectedId.value !== id) return
    detailJob.value = result.job
    detailError.value = ''
  } catch (err) {
    if (requestId !== detailRequestId || selectedId.value !== id) return
    if (!detailJob.value) {
      detailError.value = err instanceof Error ? err.message : 'Could not load job'
    }
  } finally {
    if (requestId === detailRequestId) detailLoading.value = false
  }
}

function closeModal() {
  modalOpen.value = false
  selectedId.value = ''
  detailJob.value = null
  detailError.value = ''
  detailLoading.value = false
  detailRequestId += 1
}

function onKeydown(event) {
  if (event.key === 'Escape' && modalOpen.value) closeModal()
}

function setBodyScrollLocked(locked) {
  document.body.classList.toggle('modal-open', locked)
}

watch(modalOpen, (open) => {
  setBodyScrollLocked(open)
})

watch(showCategoryFilters, (show) => {
  if (show) void loadCategories()
})

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  if (showCategoryFilters.value) void loadCategories()
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  clearTimeout(debounceTimer)
  setBodyScrollLocked(false)
})
</script>

<template>
  <div class="jobs-page">
    <header class="hero-banner">
      <div class="hero-banner-media" aria-hidden="true" />
      <div class="hero-banner-scrim" aria-hidden="true" />
      <div class="hero-banner-inner">
        <p v-if="pageTitle" class="hero-section">{{ pageTitle }}</p>
        <h1>JobFinder</h1>

        <label class="search">
          <span class="sr-only">Search jobs</span>
          <input
            v-model="search"
            type="search"
            placeholder="Search titles, companies…"
            autocomplete="off"
          />
          <PhMagnifyingGlass class="search-icon" :size="18" weight="bold" aria-hidden="true" />
        </label>

        <div v-if="showCategoryFilters" class="categories" aria-label="Job categories">
          <p v-if="categoriesError" class="categories-error">{{ categoriesError }}</p>
          <template v-else>
            <button
              type="button"
              class="chip"
              :class="{ active: !category }"
              @click="selectCategory('')"
            >
              All
            </button>
            <button
              v-for="item in visibleCategories"
              :key="item.id || categorySlug(item)"
              type="button"
              class="chip"
              :class="{ active: category === categorySlug(item) }"
              @click="selectCategory(categorySlug(item))"
            >
              {{ categoryLabel(item) }}
            </button>
            <button
              v-if="hasMoreCategories"
              type="button"
              class="chip chip-more"
              :aria-expanded="categoriesExpanded ? 'true' : 'false'"
              @click="toggleCategoriesExpanded"
            >
              {{ categoriesExpanded ? 'Less' : 'More…' }}
            </button>
            <p v-if="!categories.length" class="categories-empty">No categories yet.</p>
          </template>
        </div>
        <p v-else class="category-lock">
          Showing <strong>HR &amp; People</strong> roles only
        </p>
      </div>
    </header>

    <div class="page">
    <section class="status" aria-live="polite">
      <p v-if="loading" class="sr-only">Loading jobs…</p>
      <p v-else-if="error" class="error">{{ error }}</p>
      <p v-else>
        {{ total.toLocaleString() }} result{{ total === 1 ? '' : 's' }}
        <span v-if="debouncedSearch"> for “{{ debouncedSearch }}”</span>
        <span v-if="showCategoryFilters && category"> in {{ category }}</span>
        <span v-if="refreshing" class="status-refresh"> · Updating…</span>
      </p>
    </section>

    <ul v-if="loading" class="list" aria-busy="true" aria-label="Loading jobs">
      <li v-for="key in listSkeletonKeys" :key="key" class="card card-skel" aria-hidden="true">
        <div class="card-body skel-card-body">
          <div class="card-top">
            <span class="skel skel-line skel-card-title" />
            <span class="skel skel-line skel-card-company" />
            <span class="skel skel-line skel-card-snippet" />
            <span class="skel skel-line skel-card-snippet short" />
            <div class="skel-card-badges">
              <span class="skel skel-card-badge" />
              <span class="skel skel-card-badge" />
              <span class="skel skel-card-badge" />
            </div>
          </div>
          <span class="skel skel-card-cta" />
        </div>
      </li>
    </ul>

    <ul v-else-if="!error" class="list">
      <li
        v-for="job in jobs"
        :key="job.id"
        class="card"
        role="button"
        tabindex="0"
        @click="openJob(job)"
        @keydown.enter.prevent="openJob(job)"
        @keydown.space.prevent="openJob(job)"
      >
        <div class="card-body">
          <div class="card-top">
            <img
              v-if="jobLogo(job)"
              class="card-logo"
              :src="jobLogo(job)"
              :alt="`${jobCompany(job)} logo`"
              width="40"
              height="40"
              loading="lazy"
            />
            <h2>{{ jobTitle(job) }}</h2>
            <p class="company">{{ jobCompany(job) }}</p>
            <p v-if="jobSnippet(job)" class="card-snippet">{{ jobSnippet(job) }}</p>
            <div v-if="jobBadges(job).length" class="card-badges">
              <span
                v-for="badge in jobBadges(job)"
                :key="`${job.id}-${badge.key}`"
                class="card-badge"
                :data-kind="badge.key"
              >
                <component
                  :is="badge.icon"
                  v-if="badge.icon"
                  class="card-badge-icon"
                  :size="12"
                  weight="bold"
                  aria-hidden="true"
                />
                {{ badge.text }}
              </span>
            </div>
          </div>
          <button type="button" class="card-cta" @click.stop="openJob(job)">
            View Job
          </button>
        </div>
      </li>
      <li v-if="jobs.length === 0" class="empty">No jobs matched.</li>
    </ul>

    <Pagination
      :current-page="page"
      :total-items="total"
      :items-per-page="perPage"
      :loading="loading"
      @update:page="page = $event"
    />

    <div
      v-if="modalOpen"
      class="modal-root"
      role="dialog"
      aria-modal="true"
      aria-labelledby="job-detail-title"
      @click.self="closeModal"
    >
      <div class="modal">
        <header class="modal-head">
          <div class="modal-title-block">
            <template v-if="detailLoading">
              <div class="modal-head-row">
                <div class="skel skel-logo" aria-hidden="true" />
                <div class="modal-head-copy">
                  <div class="skel skel-line skel-eyebrow" aria-hidden="true" />
                  <div class="skel skel-line skel-title" aria-hidden="true" />
                  <div class="skel skel-line skel-company" aria-hidden="true" />
                </div>
              </div>
              <h2 id="job-detail-title" class="sr-only">Loading job</h2>
            </template>
            <template v-else>
              <div class="modal-head-row">
                <img
                  v-if="detailLogo"
                  class="company-logo"
                  :src="detailLogo"
                  :alt="`${jobCompany(detailJob)} logo`"
                  width="56"
                  height="56"
                />
                <div class="modal-head-copy">
                  <p class="company">{{ jobCompany(detailJob) }}</p>
                  <h2 id="job-detail-title">{{ jobTitle(detailJob) }}</h2>
                </div>
              </div>
            </template>
          </div>
          <button type="button" class="modal-close" aria-label="Close" @click="closeModal">
            ×
          </button>
        </header>

        <div class="modal-body" :aria-busy="detailLoading ? 'true' : 'false'">
          <div v-if="detailLoading" class="modal-skeleton" aria-live="polite" aria-label="Loading job">
            <div class="overview-grid">
              <span class="skel skel-fact" />
              <span class="skel skel-fact" />
              <span class="skel skel-fact" />
              <span class="skel skel-fact" />
            </div>
            <div class="skel-section">
              <span class="skel skel-line skel-heading" />
              <span class="skel skel-line" />
              <span class="skel skel-line" />
              <span class="skel skel-line short" />
            </div>
            <div class="skel-spinner" aria-hidden="true">
              <span class="spinner" />
            </div>
          </div>
          <p v-else-if="detailError" class="error">{{ detailError }}</p>
          <template v-else-if="detailJob">
            <div v-if="detailTags.length" class="tag-row">
              <span v-for="tag in detailTags" :key="tag" class="tag">{{ tag }}</span>
            </div>

            <section v-if="detailFacts.length" class="modal-section">
              <h3 class="modal-section-title">Overview</h3>
              <div class="overview-grid">
                <div v-for="row in detailFacts" :key="row.key" class="overview-item">
                  <span class="overview-label">
                    <component
                      :is="row.icon"
                      v-if="row.icon"
                      class="overview-icon"
                      :size="14"
                      weight="bold"
                      aria-hidden="true"
                    />
                    {{ row.label }}
                  </span>
                  <span class="overview-value">{{ row.value }}</span>
                </div>
              </div>
            </section>

            <section v-if="detailDescriptionHtml" class="modal-section prose-block">
              <h3 class="modal-section-title">Description</h3>
              <div class="prose" v-html="detailDescriptionHtml" />
            </section>

            <section v-if="detailRequirementsHtml" class="modal-section prose-block">
              <h3 class="modal-section-title">Requirements</h3>
              <div class="prose" v-html="detailRequirementsHtml" />
            </section>

            <section v-if="detailTimeline.length" class="modal-section">
              <h3 class="modal-section-title">Timeline</h3>
              <div class="timeline-row">
                <div v-for="row in detailTimeline" :key="row.key" class="timeline-item">
                  <span class="timeline-label">
                    <component
                      :is="row.icon"
                      v-if="row.icon"
                      class="timeline-icon"
                      :size="14"
                      weight="bold"
                      aria-hidden="true"
                    />
                    {{ row.label }}
                  </span>
                  <span class="timeline-value">{{ row.value }}</span>
                </div>
              </div>
            </section>
          </template>
        </div>

        <footer
          v-if="!detailLoading && !detailError && detailJob && detailApplyUrl"
          class="modal-foot"
        >
          <a
            class="action-link primary"
            :href="detailApplyUrl"
            target="_blank"
            rel="noopener noreferrer"
          >
            Apply on JobBox
            <PhArrowSquareOut :size="16" weight="bold" aria-hidden="true" />
          </a>
        </footer>
      </div>
    </div>
    </div>
  </div>
</template>
