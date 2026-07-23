import { JobBox, JobBoxApiError } from '@getjobbox/sdk'

let client: JobBox | null = null

export function getBaseUrl(): string {
  return String(process.env.JOBBOX_BASE_URL || 'https://api.getjobbox.com').replace(/\/$/, '')
}

/**
 * Server-only JobBox SDK client.
 * JOBBOX_API_KEY must never be imported into client components.
 */
export function getJobBox(): JobBox {
  if (client) return client

  const apiKey = String(process.env.JOBBOX_API_KEY || '').trim()
  if (!apiKey) {
    throw new Error(
      'Missing JOBBOX_API_KEY. Copy .env.example → .env.local and set your key (same as the Vue example).',
    )
  }

  client = new JobBox({
    apiKey,
    baseUrl: getBaseUrl(),
  })
  return client
}

export function sdkErrorResponse(err: unknown, label: string): Response {
  const isApi = err instanceof JobBoxApiError
  const status = isApi ? err.status || 502 : 502
  const message =
    err instanceof Error ? err.message : `Failed to fetch ${label}`

  console.error(`[${label}]`, err)

  return Response.json(
    {
      message,
      code: isApi ? err.code : undefined,
    },
    { status },
  )
}
