import { getBaseUrl, getJobBox, sdkErrorResponse } from '@/lib/jobbox'

export const runtime = 'nodejs'

export async function GET() {
  try {
    // Touch the client so missing keys fail loudly at health check time.
    getJobBox()
    return Response.json({
      ok: true,
      baseUrl: getBaseUrl(),
      sdk: 'node',
      example: 'next',
    })
  } catch (err) {
    return sdkErrorResponse(err, 'health')
  }
}
