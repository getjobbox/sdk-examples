import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  formatDate,
  formatDateTime,
  formatDetailValue,
  formatSalaryDisplay,
  humanizeLabel,
  jobBoxPublicUrl,
} from '../src/app/core/utils/format.ts'

describe('humanizeLabel', () => {
  it('maps work-mode aliases', () => {
    assert.equal(humanizeLabel('remote'), 'Remote')
    assert.equal(humanizeLabel('hybrid'), 'Hybrid')
    assert.equal(humanizeLabel('onsite'), 'On-site')
  })

  it('title-cases snake_case values', () => {
    assert.equal(humanizeLabel('full_time'), 'Full Time')
  })
})

describe('formatDate / formatDateTime', () => {
  it('formats dates as long US dates', () => {
    assert.equal(formatDate(new Date(2026, 6, 23, 12, 0, 0)), 'July 23, 2026')
  })

  it('includes time with “at”', () => {
    assert.equal(formatDateTime(new Date(2026, 6, 23, 15, 52, 0)), 'July 23, 2026 at 3:52 PM')
  })
})

describe('formatSalaryDisplay', () => {
  it('appends currency code', () => {
    assert.equal(formatSalaryDisplay('50,000 - 80,000', 'usd'), '50,000 - 80,000 USD')
  })

  it('does not duplicate currency', () => {
    assert.equal(formatSalaryDisplay('50k USD', 'USD'), '50k USD')
  })
})

describe('jobBoxPublicUrl', () => {
  it('builds /j/:id', () => {
    assert.equal(
      jobBoxPublicUrl({ id: 'abc-123' }, 'https://app.getjobbox.com'),
      'https://app.getjobbox.com/j/abc-123'
    )
  })
})

describe('formatDetailValue', () => {
  it('stringifies booleans', () => {
    assert.equal(formatDetailValue(true), 'Yes')
    assert.equal(formatDetailValue(false), 'No')
  })
})
