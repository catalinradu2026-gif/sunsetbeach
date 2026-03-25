import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { readFileSync } from 'fs'
import { join } from 'path'

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

Studio G108: ${studios.g108.description}. WhatsApp: +${studios.g108.whatsapp}
Studio G109: ${studios.g109.description}. WhatsApp: +${studios.g109.whatsapp}

Facilități: piscine gratuite, parcare gratuită, beach bar, 200m până la plajă, Wi-Fi, AC, frigider, espressor, balcon cu masă.

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

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const lastMessage = messages[messages.length - 1]?.content || ''

    let webContext = ''
    if (isDiscoveryQuestion(lastMessage)) {
      webContext = await searchWeb(lastMessage)
    }

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 400,
      messages: [
        { role: 'system', content: getSystemPrompt(webContext) },
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
