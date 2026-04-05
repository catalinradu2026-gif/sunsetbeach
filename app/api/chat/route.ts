import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { readFileSync } from 'fs'
import { join } from 'path'
import { rateLimit } from '@/lib/rateLimit'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

// Group consecutive dates into ranges
function groupConsecutiveDates(dates: string[]): string[] {
  if (dates.length === 0) return []
  const sorted = dates.sort()
  const ranges: string[] = []
  let start = sorted[0]
  let end = sorted[0]
  for (let i = 1; i < sorted.length; i++) {
    const currDate = new Date(sorted[i])
    const prevDate = new Date(end)
    const nextDay = new Date(prevDate)
    nextDay.setDate(nextDay.getDate() + 1)
    if (currDate.toISOString().split('T')[0] === nextDay.toISOString().split('T')[0]) {
      end = sorted[i]
    } else {
      ranges.push(start === end ? start : `${start}-${end}`)
      start = sorted[i]
      end = sorted[i]
    }
  }
  ranges.push(start === end ? start : `${start}-${end}`)
  return ranges
}

// Format date range for display (2026-07-19 → 19 iulie)
function formatDateRange(range: string): string {
  const parts = range.split('-')
  const dateFrom = new Date(parts[0] + 'T00:00:00Z')
  let dateTo = dateFrom
  if (parts.length === 3) dateTo = new Date(parts.join('-') + 'T00:00:00Z')
  const monthNames: Record<number, string> = {
    0: 'ianuarie', 1: 'februarie', 2: 'martie', 3: 'aprilie', 4: 'mai', 5: 'iunie',
    6: 'iulie', 7: 'august', 8: 'septembrie', 9: 'octombrie', 10: 'noiembrie', 11: 'decembrie'
  }
  const dayFrom = dateFrom.getUTCDate()
  const monthFrom = monthNames[dateFrom.getUTCMonth()]
  if (dateFrom.toISOString().split('T')[0] === dateTo.toISOString().split('T')[0]) {
    return `${dayFrom} ${monthFrom}`
  }
  const dayTo = dateTo.getUTCDate()
  const monthTo = monthNames[dateTo.getUTCMonth()]
  return `${dayFrom}-${dayTo} ${monthFrom}` + (monthFrom !== monthTo ? `, ${dayTo} ${monthTo}` : '')
}

function getDisponibilitateText(): string {
  try {
    const studiosPath = join(process.cwd(), 'data', 'studios.json')
    const studios = JSON.parse(readFileSync(studiosPath, 'utf-8'))
    let text = 'DISPONIBILITATE REALĂ (din sistem, actualizată):\n'
    const studioIds = ['g108', 'g109', 'e317', 'e318']
    const studioNames: Record<string, string> = {
      'g108': 'G108', 'g109': 'G109', 'e317': 'E317', 'e318': 'E318'
    }
    for (const id of studioIds) {
      const studio = studios[id]
      const occupied = studio.occupied || []
      const checkoutOnly = studio.checkoutOnly || []
      const checkinOnly = studio.checkinOnly || []
      let info = `- ${studioNames[id]}: `
      if (occupied.length === 0 && checkoutOnly.length === 0 && checkinOnly.length === 0) {
        info += 'COMPLET LIBER pentru perioada disponibilă'
      } else {
        const occupiedRanges = groupConsecutiveDates(occupied).map(formatDateRange)
        const checkoutRanges = groupConsecutiveDates(checkoutOnly).map(formatDateRange)
        const checkinRanges = groupConsecutiveDates(checkinOnly).map(formatDateRange)
        if (occupiedRanges.length > 0) info += `OCUPAT pe ${occupiedRanges.join(', ')}`
        if (checkoutRanges.length > 0) info += (occupiedRanges.length > 0 ? ' | ' : '') + `Checkout doar pe ${checkoutRanges.join(', ')}`
        if (checkinRanges.length > 0) info += (occupiedRanges.length > 0 || checkoutRanges.length > 0 ? ' | ' : '') + `Checkin doar pe ${checkinRanges.join(', ')}`
      }
      text += info + '\n'
    }
    return text
  } catch {
    return ''
  }
}

const DISCOVERY_KEYWORDS = [
  'vizita', 'vizitat', 'atractii', 'activitat', 'restaurant', 'plaja', 'mare', 'beach',
  'copii', 'familie', 'distanta', 'apropiere', 'excursie', 'locuri', 'ce fac', 'ce facem',
  'unde merg', 'unde mergem', 'visit', 'attraction', 'activity', 'family', 'kids',
  'things to do', 'nearby', 'around', 'explore', 'olimp', 'mangalia', 'neptun', 'venus',
  'mamaia', 'constanta', 'vreme', 'weather', 'sezon', 'season'
]

function isDiscoveryQuestion(text: string): boolean {
  const lower = text.toLowerCase()
  return DISCOVERY_KEYWORDS.some(kw => lower.includes(kw))
}

async function searchWeb(query: string): Promise<string> {
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query: `${query} Olimp Romania statiune mare`,
        search_depth: 'basic',
        max_results: 3,
        include_answer: true,
      }),
    })
    const data = await res.json()
    if (data.answer) return `Informații actuale: ${data.answer}`
    if (data.results?.length) {
      return data.results.slice(0, 3).map((r: { title: string; content: string }) =>
        `${r.title}: ${r.content.slice(0, 200)}`
      ).join('\n')
    }
    return ''
  } catch {
    return ''
  }
}

function getSystemPrompt(webContext: string) {
  const studiosPath = join(process.cwd(), 'data', 'studios.json')
  const studios = JSON.parse(readFileSync(studiosPath, 'utf-8'))
  const today = new Date().toISOString().split('T')[0]
  const disponibilitate = getDisponibilitateText()

  return `Ești asistentul virtual al sunsetbeach.com.ro – studiouri de vacanță premium la malul Mării Negre în Olimp, România, complexul Blaxy Residence.

Data de azi: ${today}

STUDIOURILE DISPONIBILE:
- Studio G108 (${studios.g108.title}): ${studios.g108.description}
- Studio G109 (${studios.g109.title}): ${studios.g109.description}
- Studio E317 (${studios.e317.title}): ${studios.e317.description}
- Studio E318 (${studios.e318.title}): ${studios.e318.description}

${disponibilitate}

Prețurile variază în funcție de perioadă — dacă cineva întreabă de preț fără să spună luna, întreabă-l MAI ÎNTÂI pentru ce perioadă se gândește. NU inventa și NU ghici niciun preț.
Facilități: piscine gratuite, parcare gratuită, beach bar, 250m până la plajă, Wi-Fi, AC, frigider, espressor, balcon.
Opțional: mic dejun 40 lei/persoană/zi.
Minim 3 nopți. Discount 10% la plată integrală.

${webContext ? `Informații actuale din web:\n${webContext}\n` : ''}

REGULI DISPONIBILITATE — OBLIGATORIU DE RESPECTAT:
- Informațiile din secțiunea "DISPONIBILITATE REALĂ" sunt 100% corecte și actualizate — nu le ignora!
- Dacă o perioadă e marcată "OCUPAT", studioul NU e disponibil în zilele alea — spune-i clar
- Zilele "Checkout doar" sunt ultimele zile ale unei rezervări anterioare (clientul pleacă) — NU se poate face check-in
- Zilele "Checkin doar" sunt primele zile ale unei rezervări următoare (noul client sosește) — NU se poate face check-out
- Dacă utilizatorul întreabă de o perioadă care nu e menționată, inchide: studioul e liber în acele zile
- NU INVENTA disponibilitate. Dacă e ocupat, spune-l și propune alte studiouri sau alte perioade
- La orice întrebare de rezervare, recomandă confirmarea pe WhatsApp: 40787813485

Regulile tale generale:
- Răspunde în limba în care ți se scrie (română sau engleză)
- Fii entuziast și pozitiv despre zonă și proprietate
- Când vorbești despre atracții, subliniază că locația noastră e ideală ca bază de explorare
- Evidențiază că Olimp e una din cele mai liniștite și frumoase stațiuni de pe litoral
- Răspunsuri scurte și prietenoase, max 4-5 propoziții
- Nu inventa prețuri specifice — lasă-l pe client să spună luna, apoi vei fi informat corect`
}

const MONTH_KEYWORDS: Record<string, string> = {
  'mai': '2026-05', 'may': '2026-05',
  'iunie': '2026-06', 'june': '2026-06',
  'iulie': '2026-07', 'july': '2026-07',
  'august': '2026-08', 'aug': '2026-08',
  'septembrie': '2026-09', 'september': '2026-09',
}

function getPretReal(monthPrefix: string): string {
  try {
    const studios = JSON.parse(readFileSync(join(process.cwd(), 'data', 'studios.json'), 'utf-8'))
    const gPrices = studios.g108.prices as Record<string, number>
    const ePrices = studios.e317.prices as Record<string, number>

    // Colectează toate zilele din luna și grupează după preț
    const pricesG: Map<number, string[]> = new Map() // price -> [dates]
    const pricesE: Map<number, string[]> = new Map()

    for (const [date, price] of Object.entries(gPrices)) {
      if (date.startsWith(monthPrefix)) {
        if (!pricesG.has(price)) pricesG.set(price, [])
        pricesG.get(price)!.push(date)
      }
    }
    for (const [date, price] of Object.entries(ePrices)) {
      if (date.startsWith(monthPrefix)) {
        if (!pricesE.has(price)) pricesE.set(price, [])
        pricesE.get(price)!.push(date)
      }
    }

    if (pricesG.size === 0) return ''

    // Format: "PREȚ (ZI_START — ZI_SFÂRȘIT)"
    function formatPriceRange(dates: string[]): string {
      const sorted = dates.sort()
      const monthNames: Record<number, string> = {
        0: 'ianuarie', 1: 'februarie', 2: 'martie', 3: 'aprilie', 4: 'mai', 5: 'iunie',
        6: 'iulie', 7: 'august', 8: 'septembrie', 9: 'octombrie', 10: 'noiembrie', 11: 'decembrie'
      }
      const start = new Date(sorted[0] + 'T00:00:00Z')
      const end = new Date(sorted[sorted.length - 1] + 'T00:00:00Z')
      const dayStart = start.getUTCDate()
      const dayEnd = end.getUTCDate()
      const month = monthNames[start.getUTCMonth()]
      return dayStart === dayEnd ? `${dayStart} ${month}` : `${dayStart}-${dayEnd} ${month}`
    }

    let result = `PREȚUL REAL pentru ${monthPrefix.slice(-2)} (din sistem):\n`
    result += '- G108/G109: '
    result += Array.from(pricesG.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([price, dates]) => `${price} lei/noapte (${formatPriceRange(dates)})`)
      .join(', ')
    result += '\n- E317/E318: '
    result += Array.from(pricesE.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([price, dates]) => `${price} lei/noapte (${formatPriceRange(dates)})`)
      .join(', ')

    return result
  } catch { return '' }
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (!rateLimit(ip, 50, 60_000)) {
      return NextResponse.json({ error: 'Prea multe cereri. Încearcă din nou în câteva secunde.' }, { status: 429 })
    }

    const body = await req.json()
    const { messages } = body
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }
    if (messages.length > 50) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }
    for (const m of messages) {
      if (typeof m.content !== 'string' || m.content.length > 2000) {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
      }
    }

    const lastMessage = messages[messages.length - 1]?.content || ''
    const recentText = messages.slice(-4).map((m: { content: string }) => m.content).join(' ').toLowerCase()

    // Detecteaza luna si injecteaza pretul real ca system message suplimentar
    let pretInjectat = ''
    for (const [kw, prefix] of Object.entries(MONTH_KEYWORDS)) {
      if (recentText.includes(kw)) {
        pretInjectat = getPretReal(prefix)
        break
      }
    }

    let webContext = ''
    if (isDiscoveryQuestion(lastMessage)) {
      webContext = await searchWeb(lastMessage)
    }

    const systemMessages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: getSystemPrompt(webContext) },
    ]
    if (pretInjectat) {
      systemMessages.push({ role: 'system', content: pretInjectat })
    }

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 400,
      messages: [
        ...systemMessages,
        ...messages.slice(-8).map((m: { role: string; content: string }) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ],
    })

    const reply = response.choices[0]?.message?.content || 'Ne pare rău, a apărut o eroare.'
    return NextResponse.json({ reply })
  } catch (err) {
    console.error('Chat error:', err)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}
