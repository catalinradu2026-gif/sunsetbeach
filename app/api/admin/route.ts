import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const filePath = join(process.cwd(), 'data', 'studios.json')

export async function POST(req: NextRequest) {
  const { password, studio, action, date, price, dates } = await req.json()

  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Parolă incorectă' }, { status: 401 })
  }

  const data = JSON.parse(readFileSync(filePath, 'utf-8'))

  if (!data[studio]) {
    return NextResponse.json({ error: 'Studio inexistent' }, { status: 400 })
  }

  if (action === 'setPrice') {
    data[studio].prices[date] = price
  } else if (action === 'setPriceRange') {
    for (const d of dates) {
      data[studio].prices[d] = price
    }
  } else if (action === 'toggleOccupied') {
    const idx = data[studio].occupied.indexOf(date)
    if (idx === -1) {
      data[studio].occupied.push(date)
    } else {
      data[studio].occupied.splice(idx, 1)
    }
  } else if (action === 'setOccupiedRange') {
    for (const d of dates) {
      if (!data[studio].occupied.includes(d)) {
        data[studio].occupied.push(d)
      }
    }
  } else if (action === 'clearOccupiedRange') {
    data[studio].occupied = data[studio].occupied.filter((d: string) => !dates.includes(d))
  } else if (action === 'updateInfo') {
    data[studio].name = dates.name
    data[studio].description = dates.description
    data[studio].whatsapp = dates.whatsapp
  }

  writeFileSync(filePath, JSON.stringify(data, null, 2))
  return NextResponse.json({ ok: true })
}
