'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  waText?: string  // mesaj pre-completat pentru WhatsApp
}

function extractWA(text: string): { clean: string; waText: string | null; voiceText: string | null } {
  // WA tag poate fi multiline si uneori modelul nu inchide ] — cautam si varianta deschisa
  const waMatch = text.match(/\[WA:([\s\S]+?)\]/) || text.match(/\[WA:([\s\S]+)$/)
  const voiceMatch = text.match(/\[VOCE:([\s\S]+?)\]/) || text.match(/\[VOCE:([\s\S]+)$/)
  const clean = text
    .replace(/\[WA:[\s\S]+?\]/g, '')
    .replace(/\[WA:[\s\S]+$/g, '')
    .replace(/\[VOCE:[\s\S]+?\]/g, '')
    .replace(/\[VOCE:[\s\S]+$/g, '')
    .trim()
  return {
    clean: clean || text.trim(),
    waText: waMatch ? waMatch[1].trim() : null,
    voiceText: voiceMatch ? voiceMatch[1].trim() : null,
  }
}

function waLink(msg: string): string {
  return `https://wa.me/40787813485?text=${encodeURIComponent(msg)}`
}

const WELCOME = 'Bună! Sunt Marina, agentul tău de vacanță la Sunset Beach Olimp. 🌊 Spune-mi când vrei să vii și cu câte persoane — îți găsesc eu cel mai bun studio disponibil!'

interface ChatWidgetProps {
  externalOpen?: boolean
  onExternalClose?: () => void
}

function numRo(n: number): string {
  if (n === 0) return 'zero'
  const ones = ['', 'unu', 'doi', 'trei', 'patru', 'cinci', 'șase', 'șapte', 'opt', 'nouă',
    'zece', 'unsprezece', 'doisprezece', 'treisprezece', 'paisprezece', 'cincisprezece',
    'șaisprezece', 'șaptesprezece', 'optsprezece', 'nouăsprezece']
  const tens = ['', '', 'douăzeci', 'treizeci', 'patruzeci', 'cincizeci',
    'șaizeci', 'șaptezeci', 'optzeci', 'nouăzeci']
  function conv(x: number): string {
    if (x === 0) return ''
    if (x < 20) return ones[x]
    if (x < 100) { const t = Math.floor(x / 10), o = x % 10; return o === 0 ? tens[t] : `${tens[t]} și ${ones[o]}` }
    if (x < 1000) {
      const h = Math.floor(x / 100), r = x % 100
      const s = h === 1 ? 'o sută' : h === 2 ? 'două sute' : `${ones[h]} sute`
      return r === 0 ? s : `${s} ${conv(r)}`
    }
    if (x < 1000000) {
      const th = Math.floor(x / 1000), r = x % 1000
      const m = th === 1 ? 'o mie' : th === 2 ? 'două mii' : `${conv(th)} mii`
      return r === 0 ? m : `${m} ${conv(r)}`
    }
    return String(x)
  }
  return conv(n)
}

function prepareForSpeech(text: string): string {
  let s = text

  // 1. Studiouri si cuvinte speciale (inainte de orice)
  s = s.replace(/G108/gi, 'G 108').replace(/G109/gi, 'G 109')
       .replace(/E317/gi, 'E 317').replace(/E318/gi, 'E 318')
  s = s.replace(/Sunset Beach/gi, 'Sanset Bici')
       .replace(/Blaxy Residence/gi, 'Blecsi Rezidenc')
       .replace(/Blaxy/gi, 'Blecsi')
       .replace(/beach/gi, 'bici')
       .replace(/check-in/gi, 'sosire').replace(/check-out/gi, 'plecare')
       .replace(/Wi-Fi/gi, 'uai fai')
       .replace(/WhatsApp/gi, 'uotsap')
       .replace(/discount/gi, 'discaunt')

  // 2. Simboluri matematice si speciale
  s = s.replace(/×/g, ' ori ')
  s = s.replace(/(\d)\s*[xX]\s*(\d)/g, '$1 ori $2')   // 5 x 3 → 5 ori 3
  s = s.replace(/\+/g, ' plus ')
  s = s.replace(/\s*=\s*/g, ' egal ')
  s = s.replace(/−/g, ' minus ')                        // minus unicode
  s = s.replace(/(\d)\s*-\s*(\d)/g, '$1 minus $2')     // 100 - 10 → 100 minus 10
  s = s.replace(/÷/g, ' împărțit la ')
  s = s.replace(/·/g, ' ori ')

  // 3. Emojis si markdown
  s = s.replace(/[\u{1F300}-\u{1FFFF}]/gu, '').replace(/[*_~`#]/g, '')

  // 3. Protejeaza numerele de telefon (10+ cifre) cu placeholder
  const phoneMap: Record<string, string> = {}
  let phoneIdx = 0
  s = s.replace(/\b\d{10,}\b/g, (m) => {
    const key = `__PHONE${phoneIdx++}__`
    phoneMap[key] = m.split('').join(' ')
    return key
  })

  // 4. Numere zecimale cu virgula: 1800,50 sau 3.055,5
  s = s.replace(/(\d[\d.]*),(\d+)/g, (_, int, dec) => {
    const n = parseInt(int.replace(/\./g, ''))
    return `${numRo(n)} virgulă ${numRo(parseInt(dec))}`
  })

  // 5. Numere cu separator de mii (punct): 3.055
  s = s.replace(/\b\d{1,3}(?:\.\d{3})+\b/g, (m) => numRo(parseInt(m.replace(/\./g, ''))))

  // 6. Procente
  s = s.replace(/\b(\d+)\s*%/g, (_, n) => `${numRo(parseInt(n))} la sută`)

  // 7. Unitati compuse (slash)
  s = s.replace(/\b(\d+)\s*lei\/noapte/gi, (_, n) => `${numRo(parseInt(n))} lei pe noapte`)
  s = s.replace(/\b(\d+)\s*lei\/zi/gi, (_, n) => `${numRo(parseInt(n))} lei pe zi`)
  s = s.replace(/\b(\d+)\s*lei\/pers\w*/gi, (_, n) => `${numRo(parseInt(n))} lei pe persoană`)

  // 8. Numere langa unitati comune (orice numar, 1+ cifre)
  s = s.replace(/\b(\d+)\s*(lei|ron|euro|nopți|noapte|persoane|persoană|pers|zile|zi|ore|km)\b/gi,
    (_, n, unit) => `${numRo(parseInt(n))} ${unit}`)

  // 9. Toate numerele ramase de 1-9 cifre (nu telefoane)
  s = s.replace(/\b(\d{1,9})\b/g, (_, n) => numRo(parseInt(n)))

  // 10. Restaureaza numerele de telefon
  for (const [key, val] of Object.entries(phoneMap)) s = s.replace(key, val)

  // 11. Slash si cratima din cuvinte
  s = s.replace(/(\w)-(\w)/g, '$1 $2').replace(/(\w)\/(\w)/g, '$1 $2')

  return s.trim()
}

function getVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  return voices.find(v => v.lang.startsWith('ro') && v.name.toLowerCase().includes('female'))
    || voices.find(v => v.lang.startsWith('ro') && (v.name.includes('Ioana') || v.name.includes('Carmen') || v.name.includes('Maria')))
    || voices.find(v => v.lang.startsWith('ro'))
    || voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('female'))
    || voices.find(v => v.lang.startsWith('en-GB'))
    || voices.find(v => ['Samantha', 'Karen', 'Moira', 'Tessa', 'Fiona', 'Victoria'].some(n => v.name.includes(n)))
    || voices[0]
    || null
}

function splitSentences(text: string): string[] {
  // Taie la punct, semnul exclamarii, intrebarii, puncte de suspensie, linie lunga
  // Pastreaza delimitatorul atasat de propozitie
  return text
    .split(/(?<=[.!?…])\s+|(?<=—)\s*/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
}

function speak(text: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const clean = prepareForSpeech(text)
  const sentences = splitSentences(clean)
  if (sentences.length === 0) return

  const voice = getVoice()

  function makeUtt(s: string): SpeechSynthesisUtterance {
    const u = new SpeechSynthesisUtterance(s)
    u.lang = 'ro-RO'
    u.rate = 1.0
    u.pitch = 1.0
    u.volume = 1
    if (voice) u.voice = voice
    return u
  }

  // Pune propozitiile in coada cu pauza intre ele via onend + setTimeout
  let index = 0
  function speakNext() {
    if (index >= sentences.length) return
    const u = makeUtt(sentences[index])
    index++
    // Pauza dupa propozitie: 280ms dupa punct simplu, 180ms dupa virgula/linie
    const lastChar = sentences[index - 1].slice(-1)
    const pause = (lastChar === '.' || lastChar === '!' || lastChar === '?') ? 280 : 180
    u.onend = () => setTimeout(speakNext, pause)
    window.speechSynthesis.speak(u)
  }

  speakNext()
}

function getBubbleMessages(): string[] {
  const h = new Date().getHours()
  const salut = h < 12 ? 'Bună dimineața!' : h < 18 ? 'Bună ziua!' : 'Bună seara!'
  return [
    `${salut} Sunt Marina. Câteva zile la mare, cu piscină și vedere la valuri — îți fac eu calculul acum. 🌊`,
    'Spune-mi perioada și câte persoane și îți fac pe loc oferta completă, cu prețul exact din calendar.',
    'Studiorile noastre din Olimp se rezervă repede vara. Vrei să verificăm dacă mai avem loc pentru tine?',
    'De la 370 lei/noapte — piscine, parcare, espressor, 250 m până la plajă. Totul inclus.',
    'Olimp e cea mai liniștită stațiune de pe litoral. Dacă vrei să scapi de agitație, ești în locul potrivit.',
    'Îți trebuie doar două minute: îmi spui când vii și cu câți, și ai oferta completă pe loc.',
  ]
}

export default function ChatWidget({ externalOpen }: ChatWidgetProps = {}) {
  const [open, setOpen] = useState(false)
  const [bubble, setBubble] = useState(false)
  const [bubbleTyping, setBubbleTyping] = useState(false)
  const [bubbleMsg, setBubbleMsg] = useState('')
  const [bubbleMsgIdx, setBubbleMsgIdx] = useState(0)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: WELCOME }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [voiceOn, setVoiceOn] = useState(true)
  const [speaking, setSpeaking] = useState(false)
  const [userInteracted, setUserInteracted] = useState(false)
  const [showGuide, setShowGuide] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const bubbleTimers = useRef<ReturnType<typeof setTimeout>[]>([])

  function clearBubbleTimers() {
    bubbleTimers.current.forEach(clearTimeout)
    bubbleTimers.current = []
  }

  function showBubbleMessage(msgs: string[], idx: number) {
    if (open) return
    setBubbleTyping(true)
    setBubbleMsg('')
    const t1 = setTimeout(() => {
      setBubbleTyping(false)
      setBubbleMsg(msgs[idx])
      const nextIdx = (idx + 1) % msgs.length
      setBubbleMsgIdx(nextIdx)
      const t2 = setTimeout(() => showBubbleMessage(msgs, nextIdx), 5000)
      bubbleTimers.current.push(t2)
    }, 1200)
    bubbleTimers.current.push(t1)
  }

  useEffect(() => {
    if (externalOpen) setOpen(true)
  }, [externalOpen])

  useEffect(() => {
    const t = setTimeout(() => {
      setBubble(true)
      const msgs = getBubbleMessages()
      showBubbleMessage(msgs, 0)
    }, 2000)
    return () => { clearTimeout(t); clearBubbleTimers() }
  }, [])

  useEffect(() => {
    if (open) {
      setBubble(false)
      clearBubbleTimers()
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  useEffect(() => {
    if (!open && typeof window !== 'undefined') window.speechSynthesis?.cancel()
  }, [open])

  function speakText(text: string) {
    if (!voiceOn) return
    setSpeaking(true)
    const trySpeak = () => {
      speak(text)
      // Verifica periodic daca s-a terminat de vorbit (inclusiv pauze intre propozitii)
      const interval = setInterval(() => {
        if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
          setSpeaking(false)
          clearInterval(interval)
        }
      }, 250)
      setTimeout(() => { setSpeaking(false); clearInterval(interval) }, 30000)
    }
    if (window.speechSynthesis.getVoices().length > 0) {
      trySpeak()
    } else {
      window.speechSynthesis.onvoiceschanged = () => { trySpeak(); window.speechSynthesis.onvoiceschanged = null }
    }
  }

  function handleFirstInteraction() {
    if (!userInteracted) {
      setUserInteracted(true)
      speakText(WELCOME)
    }
  }

  function toggleVoice() {
    if (voiceOn) window.speechSynthesis?.cancel()
    setVoiceOn(v => !v)
    setSpeaking(false)
  }

  async function send(textParam?: string) {
    const text = (textParam || input).trim()
    if (!text || loading) return
    setShowGuide(false)
    const userMsg: Message = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.filter(m => m.role !== 'assistant' || m.content !== WELCOME)
        }),
      })
      const data = await res.json()
      const raw = data.reply || 'Îmi pare rău, încearcă din nou!'
      const { clean, waText } = extractWA(raw)
      setMessages(prev => [...prev, { role: 'assistant', content: clean, waText: waText || undefined }])
      speakText(clean)
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Eroare de conexiune. Încearcă din nou.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Chat window */}
      {open && (
        <div className="fixed top-20 left-3 right-3 md:top-20 md:left-6 md:right-auto z-50 md:w-[340px] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden" style={{ height: '480px', maxHeight: '70dvh' }}>

          {/* Header */}
          <div className="bg-ocean px-4 py-3 flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm shrink-0">🌅</div>
            <div className="flex-1">
              <p className="text-white font-semibold text-sm">Sunset Beach Olimp</p>
              <div className="flex items-center gap-1.5">
                {speaking ? (
                  <>
                    <span className="flex gap-0.5">
                      <span className="w-0.5 h-3 bg-white/80 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-0.5 h-3 bg-white/80 rounded-full animate-bounce" style={{ animationDelay: '100ms' }} />
                      <span className="w-0.5 h-3 bg-white/80 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                    </span>
                    <p className="text-white/80 text-xs">Vorbesc...</p>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 bg-green-300 rounded-full animate-pulse" />
                    <p className="text-white/60 text-xs">Asistent virtual · online</p>
                  </>
                )}
              </div>
            </div>

            {/* Buton voce */}
            <button onClick={toggleVoice} title={voiceOn ? 'Oprește vocea' : 'Pornește vocea'}
              className={`p-1.5 rounded-full transition-colors ${voiceOn ? 'text-white hover:bg-white/20' : 'text-white/30 hover:bg-white/10'}`}>
              {voiceOn ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6v12m-3.536-9.536a5 5 0 000 7.072M9 12H3m18 0h-6" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              )}
            </button>

            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white transition text-2xl leading-none font-light w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/15">×</button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-ocean text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                }`}>
                  {m.content}
                </div>
                {m.waText && (
                  <a
                    href={waLink(m.waText)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold px-4 py-2 rounded-full shadow transition-all"
                  >
                    <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.117.553 4.103 1.522 5.828L.057 23.082a.75.75 0 00.92.92l5.255-1.465A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.891 0-3.667-.497-5.206-1.367l-.374-.214-3.876 1.081 1.081-3.876-.214-.374A9.944 9.944 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                    </svg>
                    Rezervă pe WhatsApp
                  </a>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-2.5 flex gap-1">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            {/* Ghid microfon */}
            {showGuide && messages.length === 1 && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 w-full text-center cursor-pointer mt-1"
                onClick={handleFirstInteraction}>
                <p className="text-blue-700 font-semibold text-sm mb-1">🎤 Vorbește cu mine!</p>
                <p className="text-blue-500 text-xs leading-relaxed">Apasă pe câmpul de text de jos,<br/>apoi apasă <strong>🎤</strong> de pe tastatură</p>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-100 px-3 pt-2 pb-3 bg-white shrink-0">
            <div className="flex gap-2">
              <input
                type="text"
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send()}
                onFocus={handleFirstInteraction}
                placeholder="Scrie sau vorbește..."
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ocean/30 focus:border-ocean bg-gray-50 text-sm"
                style={{ fontSize: '16px' }}
              />
              <button
                onClick={() => send()}
                disabled={!input.trim() || loading}
                className="bg-ocean hover:bg-blue-900 disabled:opacity-40 text-white rounded-xl w-9 h-9 flex items-center justify-center transition shrink-0"
              >
                <svg className="w-4 h-4 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            <p className="text-gray-400 text-[11px] mt-1.5 text-center">🎤 Pe mobil folosește microfonul de pe tastatură</p>
          </div>
        </div>
      )}

      {/* Bubble notification */}
      {bubble && !open && (
        <div
          className="fixed top-20 left-20 z-50 bg-white rounded-2xl rounded-bl-sm shadow-xl border border-gray-100 px-4 py-3 max-w-[240px] cursor-pointer transition-all"
          onClick={() => { setOpen(true); setBubble(false); clearBubbleTimers() }}
        >
          <button
            className="absolute -top-2 -right-2 bg-gray-200 rounded-full w-5 h-5 text-xs flex items-center justify-center text-gray-500 hover:bg-gray-300"
            onClick={e => { e.stopPropagation(); setBubble(false); clearBubbleTimers() }}
          >×</button>

          {bubbleTyping ? (
            <div className="flex items-center gap-2 py-1">
              <span className="text-xs text-gray-400 italic">Marina scrie</span>
              <span className="flex gap-0.5">
                <span className="w-1.5 h-1.5 bg-ocean/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-ocean/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-ocean/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          ) : (
            <p className="text-sm text-gray-800 leading-snug">{bubbleMsg}</p>
          )}
        </div>
      )}

      {/* Toggle button + eticheta */}
      <div className="fixed top-4 left-4 z-50 flex flex-col items-start gap-1.5">
        {!open && (
          <button
            onClick={() => { setOpen(true); setBubble(false); clearBubbleTimers() }}
            className="bg-white text-ocean border border-ocean/20 shadow-md rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap hover:bg-ocean hover:text-white transition-all"
          >
            🎤 Apasă și vorbește cu Marina!
          </button>
        )}
        <button
          onClick={() => { setOpen(o => !o); setBubble(false); clearBubbleTimers() }}
          className="bg-ocean hover:bg-blue-900 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 shrink-0"
          aria-label="Deschide chat"
        >
          {open ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
            </svg>
          )}
        </button>
      </div>
    </>
  )
}
