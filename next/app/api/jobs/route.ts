import { getJobBox, sdkErrorResponse } from '@/lib/jobbox'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = String(searchParams.get('search') || '').trim()
    const category = String(searchParams.get('category') || '').trim()
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const perPage = Math.min(50, Math.max(1, Number(searchParams.get('perPage')) || 12))

    const result = await getJobBox().jobs.list({
      search: search || undefined,
      category: category || undefined,
      page,
      perPage,
    })

    return Response.json({
      jobs: result.jobs,
      total: result.total,
      page: result.page,
      perPage: result.perPage,
    })
  } catch (err) {
    return sdkErrorResponse(err, 'jobs')
  }
}
