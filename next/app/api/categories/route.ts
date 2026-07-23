import { getJobBox, sdkErrorResponse } from '@/lib/jobbox'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const result = await getJobBox().jobs.categories()
    return Response.json({
      categories: Array.isArray(result?.categories) ? result.categories : [],
    })
  } catch (err) {
    return sdkErrorResponse(err, 'categories')
  }
}
