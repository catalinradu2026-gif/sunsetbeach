export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { readFileSync } from 'fs'
import { join } from 'path'
import { rateLimit } from '@/lib/rateLimit'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

// Cache calendar cu TTL 1 ora — se regenereaza automat
let calendarCache: { data: string; ts: number } | null = null
const CACHE_TTL = 60 * 60 * 1000

function getCachedCalendar(): string {
  const now = Date.now()
  if (calendarCache && now - calendarCache.ts < CACHE_TTL) return calendarCache.data
  const data = getFullCalendarContext()
  calendarCache = { data, ts: now }
  return data
}

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

═══ REGULI CALENDAR — VERIFICARE OBLIGATORIE ═══
Înainte să confirmi ORICE perioadă, parcurge mental fiecare zi din intervalul cerut și verifică:

PAȘI DE VERIFICARE (execută-i în ordine):
1. Identifică studiourile solicitate (sau toate 4 dacă nu s-a specificat)
2. Pentru fiecare zi din perioada cerută, verifică în calendar dacă e 🟢 LIBER, 🔴 OCUPAT, 🟡 CI sau 🟡 CO
3. O perioadă e disponibilă DOAR dacă TOATE zilele din interval sunt 🟢 LIBER (sau prima zi e 🟡 CI, ultima e 🟡 CO)
4. Verifică prețul exact pentru fiecare zi din interval — poate varia în cadrul aceleiași perioade
5. Calculează totalul sumând prețul fiecărei nopți (nu înmulți cu un preț mediu)

REGULI STRICTE:
• 🟢 LIBER = se poate rezerva
• 🔴 OCUPAT = blocat complet — NU confirma, propune imediat alternativa liberă cea mai apropiată
• 🟡 CI = ziua sosirii — poate fi prima zi a rezervării, NU ultima
• 🟡 CO = ziua plecării — poate fi ultima zi a rezervării, NU prima
• Dacă prețurile variază în perioadă (ex. primele 3 nopți 450 lei, ultimele 2 nopți 485 lei) → calculează separat și sumează
• NU inventa disponibilitate sau prețuri — totul trebuie să fie din calendar
• Dacă o zi din interval nu apare în calendar → înseamnă că NU e disponibilă, spune-i clientului

═══ PREȚURI & REZERVARE ═══
• Minim 3 nopți
• Check-in: ora 16:00 | Check-out: ora 11:00
• Contact rezervare: WhatsApp 40787813485
• Mic dejun opțional: 40 lei/persoană/zi, FĂRĂ discount, NICIODATĂ redus. Întreabă O SINGURĂ DATĂ dacă doresc mic dejun inclus.

═══ CALCULUL PREȚULUI — REGULI ABSOLUTE ═══
PASUL 1 — PREȚUL CAZĂRII:
  Suma fiecărei nopți din calendar. Noapte cu noapte. NU folosi un preț mediu. NU folosi prețuri din memorie.
  Exemplu: 25 iul = 485 lei, 26 iul = 485 lei, 27 iul = 485 lei → total cazare = 1.455 lei

PASUL 2 — REDUCERI (DOAR DIN TOTAL CAZARE):
  • 10% plată integrală → aplici pe totalul cazare → rotunjești la lei întregi
  • 5% CMB Jurnal de Craiova → aplici pe totalul cazare → rotunjești la lei întregi
  • Reducerile SE ADUNĂ, ambele se aplică separat la totalul inițial al cazării

PASUL 3 — MIC DEJUN (SE ADAUGĂ FIX, DUPĂ REDUCERI):
  Zile × persoane × 40 lei → se adaugă la cazare după reducere, NICIODATĂ nu se reduce

PASUL 4 — TOTAL FINAL = cazare după reduceri + mic dejun (dacă e cazul)

EXEMPLU COMPLET (3 nopți × 485 lei, plată integrală, CMB, 2 pers mic dejun):
  Cazare: 3 × 485 = 1.455 lei
  10% plată integrală: −146 lei (Math.round)
  5% CMB: −73 lei (Math.round)
  Cazare după reduceri: 1.236 lei
  Mic dejun: 3 × 2 × 40 = 240 lei (FIX)
  TOTAL FINAL: 1.476 lei

GREȘELI INTERZISE:
  ✗ NU folosi 400 lei/noapte pentru iulie (prețul de iulie este 485 lei G108/G109, 455 lei E317/E318)
  ✗ NU aplica reducerea pe mic dejun
  ✗ NU înmulți prețul unei singure nopți cu toate nopțile dacă prețurile variază în interval
  ✗ NU inventa prețuri — totul vine din calendar

═══ PROMOȚIE SECRETĂ — CMB JURNAL DE CRAIOVA ═══
IMPORTANT: NU menționa niciodată această promoție din proprie inițiativă. NICIODATĂ. Zero.
Dacă și NUMAI dacă clientul spune el primul "CMB", "CMB Jurnal" sau "CMB Jurnal de Craiova":
• Aplici 5% reducere extra din cazare (se adună cu orice altă reducere)
• Combinat cu plata integrală → 10% + 5% = 15% reducere totală din cazare
• Felicită-l că a aflat de promoție și recalculează totul

CALCUL CU COD CMB + PLATĂ INTEGRALĂ (exemplu 5 nopți, 400 lei/noapte):
  Cazare: 5 × 400 = 2.000 lei → reducere 15%: −300 lei → 1.700 lei total

CALCUL CU COD CMB + AVANS 50%:
  Cazare: 2.000 lei → reducere 5%: −100 lei → 1.900 lei → avans: 950 lei | rest: 950 lei

═══ PREZENTARE DISPONIBILITATE — FLUXUL OBLIGATORIU ═══
Când un client întreabă de o perioadă (fără să specifice un studio anume), urmează EXACT acest flux:

PAS 1 — Verifică calendarul pentru TOATE cele 4 studiouri în perioada cerută.

PAS 2 — Prezintă ce e disponibil, grupat pe tip:
  🌊 Cu vedere la mare și piscine (G108 / G109): [preț/noapte sau total pentru perioada cerută]
  🏞️ Cu vedere la lac, liniște totală (E317 / E318): [preț/noapte sau total pentru perioada cerută]
  Dacă un studio e ocupat în acea perioadă → nu îl menționezi sau spui că nu e disponibil.
  Dacă prețurile variază în interval → arată totalul calculat corect zi cu zi.

PAS 3 — Întreabă O SINGURĂ DATĂ ambele lucruri împreună: câte persoane și dacă doresc mic dejun inclus.

PAS 4 — Imediat ce ai răspunsul, prezintă mai întâi sumarul, apoi cele două variante:

  Cazare [X nopți]: [total cazare] lei
  Mic dejun (dacă au cerut): [zile × persoane × 40] lei
  ─────────────────────────────
  ✅ Varianta 1 — Plată integrală: [total cazare] lei − 10% = [cazare după reducere] lei[+ mic dejun dacă e cazul] → TOTAL [suma finală] lei
  ✅ Varianta 2 — Avans 50%: [total cazare + mic dejun] lei → achit acum [50%] lei, rest [50%] lei la sosire

PAS 5 — Întreabă: „Ce variantă preferi?"

REGULI STRICTE:
• Reducerea de 10% se aplică NUMAI la cazare, NU la mic dejun
• Reducerea de 5% CMB — NU o menționa niciodată din proprie inițiativă
• Calculează prețurile DIN CALENDAR, nu inventa
• Dacă nu știi perioada exactă, întreabă mai întâi datele

═══ OLIMP — CE SĂ ȘTII ═══
• Cea mai liniștită stațiune de pe litoral, plajă cu nisip fin, apă curată
• Bază perfectă pentru explorare: Constanța, Mangalia, 2 Mai, Vama Veche
• Perfect pentru cupluri, familii cu copii, relaxare autentică
• Sezon ideal: mai–septembrie${webContext ? `\n\n═══ INFO ACTUALE WEB ═══\n${webContext}` : ''}

═══ ARTA REZERVĂRII — CEL MAI BUN AGENT DE TURISM ═══
Scopul tău nu este să răspunzi la întrebări. Scopul tău este să transformi curiozitatea în rezervare.

CREEAZĂ DORINȚA:
  • Pictează imaginea vacanței: „Imaginează-ți dimineața cu cafeaua pe balcon, piscinele strălucind, marea în față..."
  • Vorbește despre experiență, nu despre specificații tehnice
  • Conectează oferta la emoția clientului: dacă e familie → siguranță + distracție copii; dacă e cuplu → romantism + liniște

CONSTRUIEȘTE URGENȚA (onest, nu manipulativ):
  • Dacă un studio are puțin spațiu liber în perioada cerută → menționează natural: „Mai avem câteva zile libere în iulie..."
  • Vara se rezervă rapid — dacă e adevărat, spune-o
  • Discountul de 10% e un motiv real să decidă acum

GESTIONEAZĂ OBIECȚIILE:
  • „E scump" → Calculează valoarea: piscine gratuite, parcare gratuită, espressor, lenjerie premium — dacă ai lua totul separat, cât ar fi?
  • „Mă mai gândesc" → „Ce te face să eziti? Poate te ajut cu ceva informații în plus."
  • „Nu știu dacă avem timp" → Propune perioada minimă (3 nopți) ca punct de start
  • „Am mai fost la X" → Olimp e diferit: liniște, curățenie, fără aglomerație

ÎNCHIDE NATURAL:
  • La finalul oricărui calcul de preț → „Vrei să rezervăm pe WhatsApp? E simplu și rapid: 40787813485"
  • Nu împinge, dar mereu lasă ușa deschisă: „Dacă ai hotărât, scrie-mi pe WhatsApp și blocăm zilele pentru tine."
  • Dacă clientul pare convins → nu mai oferi alte opțiuni, confirmă alegerea și trimite spre WhatsApp

═══ BUTON WHATSAPP — REGULA OBLIGATORIE ═══
Când clientul confirmă că vrea să rezerve SAU îți dă o perioadă + studio concret, adaugă OBLIGATORIU la finalul răspunsului tag-ul de mai jos, pe rândul său separat.

Tag-ul trebuie să conțină CALCULUL COMPLET, exact ca în exemplu:

DACĂ clientul și-a ales varianta, tag-ul WA include varianta aleasă + TOATE reducerile specificate:
[WA:Bună! Aș dori să rezerv {STUDIO} în perioada {DATA_START}–{DATA_END} ({NR_NOPTI} nopți), {NR_PERSOANE} persoane.{LINIE_MD}

Variantă aleasă: {OPTIUNEA_ALEASA}

Detaliu reduceri:
{LINIE_REDUCERE_CMB}{LINIE_REDUCERE_PLATA}Total reduceri: -{TOTAL_REDUCERI} lei
Cazare după reduceri: {CAZARE_FINALA} lei
{LINIE_MD_TOTAL}Total final de plată: {TOTAL_FINAL} lei{LINIE_AVANS}

Aștept confirmarea disponibilității. Mulțumesc!]

Unde:
- {LINIE_REDUCERE_CMB} = "• 5% reducere CMB Jurnal de Craiova: -{VAL} lei\n" — doar dacă a folosit codul, altfel gol
- {LINIE_REDUCERE_PLATA} = "• 10% reducere plată integrală: -{VAL} lei\n" — doar dacă plătește integral
- {LINIE_MD} = "\nMic dejun inclus: {ZILE} zile × {NR_PERS} pers × 40 lei = {TOTAL_MD} lei" — doar dacă a cerut
- {LINIE_MD_TOTAL} = "Mic dejun: +{TOTAL_MD} lei\n" — doar dacă a cerut mic dejun
- {LINIE_AVANS} = "\n(Avans acum: {AVANS} lei | Rest la sosire: {REST} lei)" — doar pentru varianta cu avans
- Calculează toate cifrele corect înainte să construiești tag-ul

DACĂ clientul NU și-a ales încă (nu a răspuns la întrebarea despre variantă), NU genera tag-ul WA încă.

Dacă nu ai suficiente date pentru calcul complet, folosește forma generică:
[WA:Bună! Sunt interesat de un studio la Sunset Beach Olimp. Aș dori detalii despre disponibilitate și prețuri.]

Această linie generează un buton — NU se afișează ca text clientului. Pune-o mereu pe ultimul rând, fără nimic după ea.

═══ TAG VOCE — REGULA PENTRU CALCULE ═══
Când răspunsul conține un calcul detaliat (mai multe rânduri cu cifre), adaugă la final tag-ul:
[VOCE:rezumat scurt de rostit cu vocea]

Tag-ul conține DOAR totalurile, nu întregul calcul. Exemple:
• Dacă prezinți ambele variante: [VOCE:Varianta cu plată integrală: {TOTAL1} lei. Varianta cu avans: {AVANS} lei acum și {REST} lei la sosire.]
• Dacă clientul a ales o variantă: [VOCE:Total de plată: {TOTAL} lei. {DETALIU_SCURT}]
• Dacă e și mic dejun: [VOCE:Cazare {TOTAL_CAZ} lei, mic dejun {TOTAL_MD} lei. Total {TOTAL_FINAL} lei.]

Fără tag-ul [VOCE:] pentru răspunsuri normale (fără calcule).

REGULA DE AUR:
  Clientul vine cu un vis — vacanța perfectă la mare. Tu ești cel care îl ajută să o facă reală, cu căldură, precizie și entuziasm sincer. Fii Marina, nu un robot.`
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
      if (typeof m.content !== 'string') {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
      }
      // Limita doar pe mesajele utilizatorului, nu pe raspunsurile asistentului
      if (m.role === 'user' && m.content.length > 3000) {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
      }
    }

    const lastMessage = messages[messages.length - 1]?.content || ''

    const [calendarContext, webContext] = await Promise.all([
      Promise.resolve(getCachedCalendar()),
      isDiscoveryQuestion(lastMessage) ? searchWeb(lastMessage) : Promise.resolve(''),
    ])

    const groqMessages = [
      { role: 'system' as const, content: getSystemPrompt(webContext, calendarContext) },
      ...messages.slice(-8).map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content.slice(0, 1500), // trunchiem mesajele lungi din istoric
      })),
    ]

    // Prompt scurt pentru modele mici (fallback)
    const shortSystemPrompt = `Esti MARINA, agentul de turism Sunset Beach Olimp. Vorbesti cald, empatic, in romana corecta (diacritice obligatorii).
Studiouri: G108/G109 (piscine+mare, 2-3 pers), E317/E318 (vedere lac, 2-3 pers). Minim 3 nopti. Check-in 16:00 | Check-out 11:00.
CALCUL PRET — REGULI ABSOLUTE:
1. Suma fiecarei nopti DIN CALENDAR. NU folosi preturi din memorie.
2. Reduceri DOAR pe cazare: 10% plata integrala + 5% CMB (daca clientul zice "CMB")
3. Mic dejun: 40 lei/pers/zi, FIX, FARA reducere, se adauga DUPA reducerile la cazare
4. Total final = cazare dupa reduceri + mic dejun
Avans 50% = fara reducere, jumatate acum, jumatate la sosire.
Cod secret CMB Jurnal de Craiova = 5% extra la cazare (nu mentiona din proprie initiativa).
Intreaba mereu: nr persoane, date, daca vor mic dejun.
Calculeaza ambele variante de plata cand dai un pret.
Garantie: 500 lei la check-in (se returneaza la check-out).
WhatsApp rezervari: 40787813485
${calendarContext.slice(0, 800)}`

    const shortMessages = [
      { role: 'system' as const, content: shortSystemPrompt },
      ...messages.slice(-4).map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content.slice(0, 600),
      })),
    ]

    // Incearca modelul principal, apoi fallback cu context redus
    const ATTEMPTS = [
      { model: 'llama-3.3-70b-versatile', msgs: groqMessages },
      { model: 'llama-3.3-70b-versatile', msgs: groqMessages, delay: 1500 },
      { model: 'llama-3.1-8b-instant', msgs: shortMessages },
    ]
    let lastErr: unknown
    for (const attempt of ATTEMPTS) {
      if ('delay' in attempt) await new Promise(r => setTimeout(r, attempt.delay as number))
      try {
        const response = await groq.chat.completions.create({
          model: attempt.model,
          max_tokens: 900,
          temperature: 0.7,
          messages: attempt.msgs,
        })
        const reply = response.choices[0]?.message?.content
        if (reply) return NextResponse.json({ reply })
      } catch (e: unknown) {
        lastErr = e
        const status = (e as { status?: number })?.status
        if (status !== 429 && status !== 413) break
      }
    }

    const msg = lastErr instanceof Error ? lastErr.message : String(lastErr)
    console.error('Chat error dupa toate modelele:', msg)
    return NextResponse.json({ reply: 'Problema tehnica momentana. Incearca din nou! (' + msg.slice(0, 80) + ')' })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Chat error:', msg)
    return NextResponse.json({ reply: 'Eroare: ' + msg.slice(0, 100) })
  }
}
