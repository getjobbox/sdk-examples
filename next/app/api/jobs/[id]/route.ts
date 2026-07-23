import { getJobBox, sdkErrorResponse } from '@/lib/jobbox'

export const runtime = 'nodejs'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id: rawId } = await params
    const id = String(rawId || '').trim()
    if (!id) {
      return Response.json({ message: 'Job id is required' }, { status: 400 })
    }

    const result = await getJobBox().jobs.get(id)
    return Response.json({ job: result.job })
  } catch (err) {
    return sdkErrorResponse(err, 'job')
  }
}
