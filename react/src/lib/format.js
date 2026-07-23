/** Official JobBox (BoltCliq) public job page origin. */
export const JOBBOX_APP_ORIGIN = String(
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_JOBBOX_APP_URL) ||
    'https://app.getjobbox.com'
).replace(/\/$/, '')

export function humanizeLabel(value) {
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

export function formatDate(value) {
  if (value == null || value === '') return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatDateTime(value) {
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

/**
 * Append currency code to salary text when present and not already included.
 * @param {unknown} salaryRange
 * @param {unknown} currency
 */
export function formatSalaryDisplay(salaryRange, currency) {
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

export function jobBoxPublicUrl(job, origin = JOBBOX_APP_ORIGIN) {
  const id = job?.id
  if (!id) return ''
  return `${String(origin).replace(/\/$/, '')}/j/${encodeURIComponent(String(id))}`
}

export function formatDetailValue(value) {
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
