export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const filePath = join(process.cwd(), 'data', 'studios.json')
    const studios = JSON.parse(readFileSync(filePath, 'utf-8'))
    const studioIds = ['g108', 'g109', 'e317', 'e318']
    const today = new Date().toISOString().split('T')[0]

    const summary: Record<string, { free: number; occupied: number }> = {}
    for (const id of studioIds) {
      const s = studios[id]
      const prices = Object.keys(s.prices || {}).filter(d => d >= today)
      const occ = (s.occupied || []).filter((d: string) => d >= today).length
      summary[id] = { free: prices.length - occ, occupied: occ }
    }

    console.log('[CRON] Calendar refresh:', new Date().toISOString(), summary)
    return NextResponse.json({ ok: true, ts: new Date().toISOString(), summary })
  } catch (e) {
    console.error('[CRON] Calendar refresh error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
