import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  formatDate,
  formatDateTime,
  formatDetailValue,
  formatSalaryDisplay,
  humanizeLabel,
  jobBoxPublicUrl,
} from '../src/lib/format.js'

describe('humanizeLabel', () => {
  it('maps work-mode aliases', () => {
    assert.equal(humanizeLabel('remote'), 'Remote')
    assert.equal(humanizeLabel('hybrid'), 'Hybrid')
    assert.equal(humanizeLabel('onsite'), 'On-site')
    assert.equal(humanizeLabel('on_site'), 'On-site')
  })

  it('title-cases snake_case values', () => {
    assert.equal(humanizeLabel('full_time'), 'Full Time')
    assert.equal(humanizeLabel('entry-level'), 'Entry Level')
  })
})

describe('formatDate / formatDateTime', () => {
  it('formats dates as long US dates', () => {
    // Local constructor avoids UTC day-boundary flakes across timezones.
    assert.equal(formatDate(new Date(2026, 6, 23, 12, 0, 0)), 'July 23, 2026')
  })

  it('includes time with “at”', () => {
    const out = formatDateTime(new Date(2026, 6, 23, 15, 52, 0))
    assert.equal(out, 'July 23, 2026 at 3:52 PM')
  })

  it('returns empty for blank input', () => {
    assert.equal(formatDate(''), '')
    assert.equal(formatDateTime(null), '')
  })
})

describe('formatSalaryDisplay', () => {
  it('appends currency code', () => {
    assert.equal(formatSalaryDisplay('50,000 - 80,000', 'usd'), '50,000 - 80,000 USD')
  })

  it('does not duplicate currency already in the salary string', () => {
    assert.equal(formatSalaryDisplay('50k USD', 'USD'), '50k USD')
  })

  it('returns salary alone when currency missing', () => {
    assert.equal(formatSalaryDisplay('120k', ''), '120k')
    assert.equal(formatSalaryDisplay('120k', null), '120k')
  })
})

describe('jobBoxPublicUrl', () => {
  it('builds /j/:id on the JobBox app origin', () => {
    assert.equal(
      jobBoxPublicUrl({ id: 'abc-123' }, 'https://app.getjobbox.com'),
      'https://app.getjobbox.com/j/abc-123'
    )
  })

  it('returns empty without an id', () => {
    assert.equal(jobBoxPublicUrl({}), '')
    assert.equal(jobBoxPublicUrl(null), '')
  })
})

describe('formatDetailValue', () => {
  it('stringifies primitives and arrays', () => {
    assert.equal(formatDetailValue(true), 'Yes')
    assert.equal(formatDetailValue(false), 'No')
    assert.equal(formatDetailValue(['a', 'b']), 'a, b')
  })
})
