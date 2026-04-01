'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const WELCOME = 'Bună! Sunt asistentul virtual Sunset Beach Olimp. Te ajut cu disponibilitate, prețuri și rezervări. Vorbește cu mine sau scrie!'

interface ChatWidgetProps {
  externalOpen?: boolean
  onExternalClose?: () => void
}

function prepareForSpeech(text: string): string {
  return text
    // Studiouri - pronunta direct
    .replace(/G108/gi, 'G 108')
    .replace(/G109/gi, 'G 109')
    .replace(/E317/gi, 'E 317')
    .replace(/E318/gi, 'E 318')
    // Engleza pronuntata romaneste
    .replace(/Sunset Beach/gi, 'Sanset Bici')
    .replace(/Blaxy Residence/gi, 'Blecsi Rezidenc')
    .replace(/Blaxy/gi, 'Blecsi')
    .replace(/beach/gi, 'bici')
    .replace(/check-in/gi, 'cek in')
    .replace(/check-out/gi, 'cek aut')
    .replace(/Wi-Fi/gi, 'uai fai')
    .replace(/WhatsApp/gi, 'uotsap')
    // Unitati
    .replace(/(\d+)\s*lei\/noapte/gi, '$1 lei pe noapte')
    .replace(/(\d+)\s*lei\/zi/gi, '$1 lei pe zi')
    .replace(/(\d+)%/g, '$1 procente')
    // Sarita cratima si slash din cuvinte
    .replace(/(\w)-(\w)/g, '$1 $2')
    .replace(/(\w)\/(\w)/g, '$1 $2')
    // Emojis si markdown
    .replace(/[\u{1F300}-\u{1FFFF}]/gu, '')
    .replace(/[*_~`#]/g, '')
    .trim()
}

function speak(text: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const clean = prepareForSpeech(text)
  const utt = new SpeechSynthesisUtterance(clean)
  utt.lang = 'ro-RO'
  utt.rate = 0.9
  utt.pitch = 0.85
  utt.volume = 1
  const voices = window.speechSynthesis.getVoices()
  // Prefer voce feminina romana, apoi feminina engleza, apoi orice
  const roFem = voices.find(v => v.lang.startsWith('ro') && v.name.toLowerCase().includes('female'))
    || voices.find(v => v.lang.startsWith('ro') && (v.name.includes('Ioana') || v.name.includes('Carmen') || v.name.includes('Maria')))
    || voices.find(v => v.lang.startsWith('ro'))
    || voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('female'))
    || voices.find(v => v.lang.startsWith('en-GB'))
    || voices.find(v => ['Samantha', 'Karen', 'Moira', 'Tessa', 'Fiona', 'Victoria'].some(n => v.name.includes(n)))
    || voices[0]
  if (roFem) utt.voice = roFem
  window.speechSynthesis.speak(utt)
}

export default function ChatWidget({ externalOpen }: ChatWidgetProps = {}) {
  const [open, setOpen] = useState(false)
  const [bubble, setBubble] = useState(false)
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

  useEffect(() => {
    if (externalOpen) setOpen(true)
  }, [externalOpen])

  useEffect(() => {
    const t = setTimeout(() => setBubble(true), 2000)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (open) {
      setBubble(false)
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
      const interval = setInterval(() => {
        if (!window.speechSynthesis.speaking) { setSpeaking(false); clearInterval(interval) }
      }, 200)
      setTimeout(() => { setSpeaking(false); clearInterval(interval) }, 15000)
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
      const reply = data.reply || 'Ne pare rău, a apărut o eroare.'
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
      speakText(reply)
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
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-ocean text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                }`}>
                  {m.content}
                </div>
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
          className="fixed top-20 left-20 z-50 bg-white rounded-2xl rounded-bl-sm shadow-xl border border-gray-100 px-4 py-3 max-w-[220px] cursor-pointer"
          onClick={() => { setOpen(true); setBubble(false) }}
        >
          <button
            className="absolute -top-2 -right-2 bg-gray-200 rounded-full w-5 h-5 text-xs flex items-center justify-center text-gray-500 hover:bg-gray-300"
            onClick={e => { e.stopPropagation(); setBubble(false) }}
          >×</button>
          <p className="text-sm text-gray-800">🌅 Bună! Te ajut cu rezervări și prețuri. Vorbește sau scrie!</p>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => { setOpen(o => !o); setBubble(false) }}
        className="fixed top-4 left-4 z-50 bg-ocean hover:bg-blue-900 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105"
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
    </>
  )
}
