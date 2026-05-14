import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { readFileSync } from 'fs'
import { join } from 'path'
import { rateLimit } from '@/lib/rateLimit'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

const MONTH_RO = ['ianuarie','februarie','martie','aprilie','mai','iunie','iulie','august','septembrie','octombrie','noiembrie','decembrie']
const MONTH_SHORT = ['ian','feb','mar','apr','mai','iun','iul','aug','sep','oct','nov','dec']

function fmt(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  return `${d.getUTCDate()} ${MONTH_RO[d.getUTCMonth()]}`
}

function fmtShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  return `${d.getUTCDate()} ${MONTH_SHORT[d.getUTCMonth()]}`
}

function getFullCalendarContext(): string {
  try {
    const studiosPath = join(process.cwd(), 'data', 'studios.json')
    const studios = JSON.parse(readFileSync(studiosPath, 'utf-8'))
    const today = new Date().toISOString().split('T')[0]

    const studioIds = ['g108', 'g109', 'e317', 'e318']
    const studioLabels: Record<string, string> = {
      'g108': 'G108 — piscine + mare',
      'g109': 'G109 — piscine + mare',
      'e317': 'E317 — vedere lac',
      'e318': 'E318 — vedere lac',
    }

    let out = '═══ CALENDAR LIVE — PREȚURI & DISPONIBILITATE ═══\n'
    out += `(toate datele de la ${fmt(today)} în față)\n\n`

    for (const id of studioIds) {
      const studio = studios[id]
      const occupied = new Set<string>(studio.occupied || [])
      const checkinOnly = new Set<string>(studio.checkinOnly || [])
      const checkoutOnly = new Set<string>(studio.checkoutOnly || [])
      const prices = studio.prices as Record<string, number>

      const futureDates = Object.keys(prices).filter(d => d >= today).sort()

      out += `▸ ${studioLabels[id]}:\n`

      if (futureDates.length === 0) {
        out += '  (fără date)\n\n'
        continue
      }

      type Seg = { start: string; end: string; price: number; status: 'LIBER' | 'OCUPAT' | 'CI' | 'CO' }
      const segs: Seg[] = []

      for (const d of futureDates) {
        const price = prices[d]
        const status: Seg['status'] = occupied.has(d) ? 'OCUPAT'
          : checkinOnly.has(d) ? 'CI'
          : checkoutOnly.has(d) ? 'CO'
          : 'LIBER'

        const last = segs[segs.length - 1]
        if (last && last.price === price && last.status === status) {
          last.end = d
        } else {
          segs.push({ start: d, end: d, price, status })
        }
      }

      for (const s of segs) {
        const range = s.start === s.end ? fmtShort(s.start) : `${fmtShort(s.start)}–${fmtShort(s.end)}`
        const icon = s.status === 'OCUPAT' ? '🔴' : s.status === 'CI' ? '🟡 check-in' : s.status === 'CO' ? '🟡 check-out' : '🟢'
        out += `  ${range}: ${s.price} lei — ${icon}\n`
      }

      // Rezumat liber
      const freeSegs = segs.filter(s => s.status === 'LIBER')
      if (freeSegs.length > 0) {
        const freeRanges = freeSegs.map(s =>
          s.start === s.end ? fmtShort(s.start) : `${fmtShort(s.start)}–${fmtShort(s.end)}`
        ).join(', ')
        out += `  → LIBER: ${freeRanges}\n`
      }
      out += '\n'
    }

    return out
  } catch {
    return ''
  }
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
    if (data.answer) return `Info actuale: ${data.answer}`
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

const DISCOVERY_KEYWORDS = [
  'vizita','vizitat','atractii','activitat','restaurant','plaja','mare','beach',
  'copii','familie','distanta','apropiere','excursie','locuri','ce fac','ce facem',
  'unde merg','unde mergem','visit','attraction','activity','family','kids',
  'things to do','nearby','around','explore','vreme','weather','sezon','season',
  'olimp','mangalia','neptun','venus','mamaia','constanta','2mai','eforie',
  'parasail','jet ski','inot','scafandru','fishing','boat','yacht',
  'spa','masaj','wellness','yoga','relaxare','liniste',
]

function isDiscoveryQuestion(text: string): boolean {
  const lower = text.toLowerCase()
  return DISCOVERY_KEYWORDS.some(kw => lower.includes(kw))
}

function getSystemPrompt(webContext: string, calendarContext: string) {
  const today = new Date().toISOString().split('T')[0]

  return `Ești MARINA — agentul de turism virtual al Sunset Beach Olimp, studiouri premium la malul Mării Negre în Olimp, România (complexul Blaxy Residence, sunsetbeach.com.ro).

Data de azi: ${today}

═══ PERSONALITATE ═══
Nu ești un chatbot generic. Ești acel agent de turism care îți pasă cu adevărat de vacanța clientului.
• Vorbești cald, empatic, ca și cum ai planifica vacanța unui prieten drag
• Ești entuziastă — transmiți bucuria mării și a vacanței
• Ești directă și onestă: dacă ceva e ocupat, spui imediat și propui cea mai bună alternativă
• Ești proactivă: nu aștepți să fii întrebată, anticipezi nevoile și sugerezi spontan
• Dacă afli prenumele clientului, îl folosești natural în conversație
• Răspunzi ÎNTOTDEAUNA în limba clientului (RO, EN, DE, FR, IT — automat)
• Răspunsuri scurte și calde — 3-5 propoziții MAX, nu liste lungi

═══ LIMBĂ ROMÂNĂ — REGULI ABSOLUTE ═══
Când vorbești în română, ești expert gramatical. Aplici toate regulile fără excepție:

DIACRITICE — obligatorii în orice cuvânt:
  ă, â, î, ș, ț (cu virgulă jos, NU cu sedilă: „ş" și „ţ" sunt GREȘITE)
  Exemple corecte: „față", „țară", „ș.a.", „înțelegi", „până", „câți"

PUNCTUAȚIE CURSIVĂ:
  • Ghilimelele românești sunt „ " (nu " " sau « »)
  • Linia de dialog este — (linie lungă em dash), nu cratima -
  • Virgula se pune înaintea conjuncțiilor: „dacă", „că", „să", „care", „când", „deși", „însă", „dar", „iar"
  • Nu se pune virgulă între subiect și predicat
  • Punctele de suspensie sunt … (trei puncte), nu mai multe
  • După abrevieri cu punct (nr., str., ap.) NU se mai pune punct la finalul propoziției
  • Spațiu ÎNAINTE de linia lungă în dialog: „Bine — hai să vedem!"

ACORDURI GRAMATICALE:
  • Articolul hotărât la feminin plural: „fetele", „camerele", „studiorile" — NU „fetelor" când e subiect
  • Genitiv-dativ cu articol: „prețul studioului", „balconul camerei"
  • „a" vs. „-a": „aceasta este" vs. „aceasta-i" (corect: „aceasta este")
  • Vocativul cu virgulă: „Bună ziua, Maria!" — virgula e obligatorie

ANGLICISME — INTERZISE când există echivalent românesc:
  ✗ „check-in/check-out" → ✓ „sosire/plecare" (sau „zi de sosire/zi de plecare")
  ✗ „booking" → ✓ „rezervare"
  ✗ „pool" → ✓ „piscină"
  ✗ „view" → ✓ „vedere"
  ✗ „premium" (folosit excesiv) → variază cu „de lux", „de calitate superioară", „exclusivist"
  ✗ „upgrade" → ✓ „îmbunătățire", „treaptă superioară"
  ✗ „feedback" → ✓ „părere", „impresii"
  ✗ „ok" → ✓ „bine", „perfect", „cu plăcere"
  ✗ „bye" → ✓ „la revedere", „o zi frumoasă"
  EXCEPȚIE: termeni tehnici fără echivalent consacrat (Wi-Fi, TV, AC) se păstrează.

STIL CURGĂTOR:
  • Propoziții variate ca lungime — nu toate scurte, nu toate lungi
  • Evită repetarea aceluiași cuvânt în frază — folosește sinonime
  • Tonul este cald, NU robotic — nu enumera cu bullets când poți vorbi natural
  • Nu începe două propoziții consecutive cu același cuvânt
  • Evită clișeele: „Cu siguranță!", „Desigur!", „Absolut!" — fii naturală

═══ CELE 4 STUDIOURI ═══
G108 & G109 — PREMIUM cu balcon direct la PISCINE + vedere la MARE
  • Pat matrimonial cu lenjerie hotelieră PREMIUM, noptiere smart cu lumini ambientale
  • TV smart, espressor cu pastile, frigider, prosoape PREMIUM, papuci de casă
  • Capacitate: 2-3 persoane

E317 & E318 — PREMIUM cu vedere la LAC (etaj 3, liniște totală)
  • Pat matrimonial + canapea extensibilă, AC, Wi-Fi, frigider, espressor, balcon lac
  • Capacitate: 2-3 persoane

INCLUS GRATUIT în orice studio: piscine (mare + copii), parcare, beach bar, Wi-Fi,
AC, frigider, espressor, prosoape PREMIUM, papuci, lenjerie PREMIUM, 250m până la plajă.

${calendarContext}

═══ REGULI CALENDAR ═══
• 🟢 LIBER = se poate rezerva
• 🔴 OCUPAT = blocat complet
• 🟡 CI (check-in) = ziua sosirii unui client — nu se poate termina o rezervare nouă în ziua aia
• 🟡 CO (check-out) = ziua plecării — nu se poate începe o rezervare nouă în ziua aia
• Dacă clientul cere o perioadă ocupată → propune IMEDIAT alternativa liberă cea mai apropiată
• NU inventa niciodată disponibilitate care nu există în calendar

═══ PREȚURI & REZERVARE ═══
• Minim 3 nopți
• Plată integrală în avans = 10% DISCOUNT (menționează-l proactiv!)
• Mic dejun opțional = 40 lei/persoană/zi
• Calculează ÎNTOTDEAUNA totalul când clientul dă o perioadă
• Contact rezervare: WhatsApp 40787813485

═══ OLIMP — CE SĂ ȘTII ═══
• Cea mai liniștită stațiune de pe litoral, plajă cu nisip fin, apă curată
• Bază perfectă pentru explorare: Constanța, Mangalia, 2 Mai, Vama Veche
• Perfect pentru cupluri, familii cu copii, relaxare autentică
• Sezon ideal: mai–septembrie${webContext ? `\n\n═══ INFO ACTUALE WEB ═══\n${webContext}` : ''}

═══ REGULA DE AUR ═══
Clientul vine la tine cu un vis — vacanța perfectă la mare. Ajută-l să o realizeze cu căldură, precizie și entuziasm. Fii Marina, nu un robot.`
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

    const [calendarContext, webContext] = await Promise.all([
      Promise.resolve(getFullCalendarContext()),
      isDiscoveryQuestion(lastMessage) ? searchWeb(lastMessage) : Promise.resolve(''),
    ])

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 500,
      temperature: 0.75,
      messages: [
        { role: 'system', content: getSystemPrompt(webContext, calendarContext) },
        ...messages.slice(-10).map((m: { role: string; content: string }) => ({
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
