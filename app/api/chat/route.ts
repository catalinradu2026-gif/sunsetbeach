import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { readFileSync } from 'fs'
import { join } from 'path'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

function getSystemPrompt() {
  const studiosPath = join(process.cwd(), 'data', 'studios.json')
  const studios = JSON.parse(readFileSync(studiosPath, 'utf-8'))

  const today = new Date().toISOString().split('T')[0]

  const formatStudio = (id: string, s: typeof studios.g108) => {
    const priceEntries = Object.entries(s.prices as Record<string, number>)
      .slice(0, 10)
      .map(([date, price]) => `${date}: ${price}€`)
      .join(', ') || 'prețuri la cerere'

    return `Studio ${id.toUpperCase()}: ${s.description}. WhatsApp: +${s.whatsapp}. Prețuri: ${priceEntries}.`
  }

  return `Ești asistentul virtual al sunsetbeach.ro – studiouri de vacanță la malul mării în Olimp, România (complexul Blaxy).

Data de azi: ${today}

${formatStudio('g108', studios.g108)}
${formatStudio('g109', studios.g109)}

Reguli:
- Răspunde în limba în care ți se scrie (română sau engleză)
- Fii prietenos, concis, max 3-4 propoziții
- Rezervările se fac pe WhatsApp (numerele de mai sus) sau prin butonul de pe site
- Dacă nu știi disponibilitatea exactă, îndrumă spre WhatsApp
- Nu inventa prețuri dacă nu le ai`
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: getSystemPrompt(),
    })

    // Convertim istoricul în formatul Gemini
    const history = messages.slice(0, -1).map((m: { role: string; content: string }) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }))

    const chat = model.startChat({ history })

    const lastMessage = messages[messages.length - 1]
    const result = await chat.sendMessage(lastMessage.content)
    const reply = result.response.text()

    return NextResponse.json({ reply })
  } catch (err) {
    console.error('Chat error:', err)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}
