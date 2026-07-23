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
} from '../src/stores/jobsStore.js'

function jsonResponse(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  }
}

describe('jobsStore', () => {
  beforeEach(() => {
    resetJobsStoreForTests()
  })

  afterEach(() => {
    mock.restoreAll()
    resetJobsStoreForTests()
  })

  it('ensureList caches and serves fresh results without refetch', async () => {
    let calls = 0
    mock.method(globalThis, 'fetch', async (input) => {
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
    assert.equal(first.jobs[0].title, 'Engineer')
    assert.equal(calls, 1)

    const second = await ensureList(query)
    assert.equal(second.fromCache, true)
    assert.equal(second.total, 1)
    assert.equal(calls, 1)

    const peeked = peekList(query)
    assert.ok(peeked)
    assert.equal(peeked.fresh, true)
    assert.equal(peeked.jobs.length, 1)
  })

  it('dedupes concurrent ensureList calls', async () => {
    let calls = 0
    mock.method(globalThis, 'fetch', async () => {
      calls += 1
      await new Promise((r) => setTimeout(r, 20))
      return jsonResponse({ jobs: [{ id: 'x' }], total: 1 })
    })

    const query = { page: 2, perPage: 24, search: '', category: 'hr' }
    const [a, b] = await Promise.all([ensureList(query), ensureList(query)])
    assert.equal(calls, 1)
    assert.equal(a.jobs[0].id, 'x')
    assert.equal(b.jobs[0].id, 'x')
  })

  it('ensureDetail caches by id and seedDetail does not clobber fresh cache', async () => {
    mock.method(globalThis, 'fetch', async (input) => {
      assert.match(String(input), /\/api\/jobs\/job-9$/)
      return jsonResponse({
        job: { id: 'job-9', title: 'Full Detail', description: 'Long text' },
      })
    })

    const first = await ensureDetail('job-9')
    assert.equal(first.fromCache, false)
    assert.equal(first.job.description, 'Long text')

    seedDetail({ id: 'job-9', title: 'Thin card' })
    const peeked = peekDetail('job-9')
    assert.equal(peeked.job.title, 'Full Detail')
    assert.equal(peeked.job.description, 'Long text')

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

    const first = await ensureCategories()
    assert.equal(first[0].slug, 'hr')
    assert.equal(calls, 1)

    const second = await ensureCategories()
    assert.equal(second[0].label, 'HR & People')
    assert.equal(calls, 1)
  })

  it('ensureList throws on API errors', async () => {
    mock.method(globalThis, 'fetch', async () =>
      jsonResponse({ message: 'Unauthorized' }, 401)
    )
    await assert.rejects(
      () => ensureList({ page: 1, perPage: 24, search: '', category: '' }),
      /Unauthorized/
    )
  })
})
