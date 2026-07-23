import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it, mock } from 'node:test'
import {
  ensureCategories,
  ensureDetail,
  ensureList,
  peekDetail,
  peekList,
  resetJobsStoreForTests,
  seedDetail,
} from '../src/app/core/services/jobs-cache.ts'

function jsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  }
}

describe('jobs-cache', () => {
  beforeEach(() => {
    resetJobsStoreForTests()
  })

  afterEach(() => {
    mock.restoreAll()
    resetJobsStoreForTests()
  })

  it('ensureList caches and serves fresh results without refetch', async () => {
    let calls = 0
    mock.method(globalThis, 'fetch', async (input: RequestInfo | URL) => {
      calls += 1
      assert.match(String(input), /\/api\/jobs\?/)
      return jsonResponse({
        jobs: [{ id: '1', title: 'Engineer' }],
        total: 1,
      })
    })

    const query = { page: 1, perPage: 24, search: '', category: '' }
    const first = await ensureList(query)
    assert.equal(first.fromCache, false)
    assert.equal(calls, 1)

    const second = await ensureList(query)
    assert.equal(second.fromCache, true)
    assert.equal(calls, 1)
    assert.ok(peekList(query)?.fresh)
  })

  it('dedupes concurrent ensureList calls', async () => {
    let calls = 0
    mock.method(globalThis, 'fetch', async () => {
      calls += 1
      await new Promise((r) => setTimeout(r, 20))
      return jsonResponse({ jobs: [{ id: 'x' }], total: 1 })
    })

    const query = { page: 2, perPage: 24, search: '', category: 'hr' }
    await Promise.all([ensureList(query), ensureList(query)])
    assert.equal(calls, 1)
  })

  it('ensureDetail caches and seedDetail does not clobber fresh cache', async () => {
    mock.method(globalThis, 'fetch', async () =>
      jsonResponse({
        job: { id: 'job-9', title: 'Full Detail', description: 'Long text' },
      })
    )

    await ensureDetail('job-9')
    seedDetail({ id: 'job-9', title: 'Thin card' })
    const peeked = peekDetail('job-9')
    assert.equal(peeked?.job.title, 'Full Detail')

    const second = await ensureDetail('job-9')
    assert.equal(second.fromCache, true)
  })

  it('ensureCategories caches catalog entries', async () => {
    let calls = 0
    mock.method(globalThis, 'fetch', async () => {
      calls += 1
      return jsonResponse({
        categories: [{ id: 1, slug: 'hr', label: 'HR & People' }],
      })
    })

    await ensureCategories()
    await ensureCategories()
    assert.equal(calls, 1)
  })
})
