import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { readFileSync } from 'fs'
import { join } from 'path'
import { rateLimit } from '@/lib/rateLimit'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

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

  return `Ești asistentul virtual al sunsetbeach.com.ro – studiouri de vacanță premium la malul Mării Negre în Olimp, România, complexul Blaxy Residence.

Data de azi: ${today}

STUDIOURILE DISPONIBILE:
- Studio G108 (${studios.g108.title}): ${studios.g108.description}
- Studio G109 (${studios.g109.title}): ${studios.g109.description}
- Studio E317 (${studios.e317.title}): ${studios.e317.description}
- Studio E318 (${studios.e318.title}): ${studios.e318.description}

Prețurile variază în funcție de perioadă — dacă cineva întreabă de preț fără să spună luna, întreabă-l MAI ÎNTÂI pentru ce perioadă se gândește. NU inventa și NU ghici niciun preț.
Facilități: piscine gratuite, parcare gratuită, beach bar, 250m până la plajă, Wi-Fi, AC, frigider, espressor, balcon.
Opțional: mic dejun 40 lei/persoană/zi.
Minim 3 nopți. Discount 10% la plată integrală.

${webContext ? `Informații actuale din web:\n${webContext}\n` : ''}

Regulile tale:
- Răspunde în limba în care ți se scrie (română sau engleză)
- Fii entuziast și pozitiv despre zonă și proprietate
- Când vorbești despre atracții, subliniază că locația noastră e ideală ca bază de explorare
- Evidențiază că Olimp e una din cele mai liniștite și frumoase stațiuni de pe litoral
- Răspunsuri scurte și prietenoase, max 4-5 propoziții
- Rezervările se fac pe WhatsApp sau prin site
- Nu inventa prețuri specifice`
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
    const sampleDay = `${monthPrefix}-15`
    const pg = gPrices[sampleDay], pe = ePrices[sampleDay]
    if (!pg) return ''
    let note = ''
    if (monthPrefix === '2026-07') note = ' (5-12 iulie: 1200/1170 lei — festival Blaxy, doar acele zile)'
    return `PREȚUL REAL pentru această perioadă (din sistem): G108/G109 = ${pg} lei/noapte, E317/E318 = ${pe} lei/noapte.${note}`
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
