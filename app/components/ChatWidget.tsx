'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const WELCOME = '👋 Bine ați venit la Sunset Beach Olimp! 🌅\n\nAvem studiouri moderne aproape de plajă. Locuri limitate disponibile vara aceasta! 🌊\n\nDoriți să verificați disponibilitatea sau prețurile? Vă ajut să faceți o rezervare acum!'

interface ChatWidgetProps {
  externalOpen?: boolean
  onExternalClose?: () => void
}

export default function ChatWidget({ externalOpen }: ChatWidgetProps = {}) {
  const [open, setOpen] = useState(false)
  const [bubble, setBubble] = useState(false)

  useEffect(() => {
    if (externalOpen) setOpen(true)
  }, [externalOpen])

  useEffect(() => {
    const t1 = setTimeout(() => setBubble(true), 2000)
    return () => clearTimeout(t1)
  }, [])
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: WELCOME }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  async function send() {
    const text = input.trim()
    if (!text || loading) return

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
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply || 'Ne pare rău, a apărut o eroare.' }])
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
          <div className="bg-ocean px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm">🌅</div>
            <div className="flex-1">
              <p className="text-white font-semibold text-sm">sunsetbeach.com.ro</p>
              <p className="text-white/60 text-xs">Asistent virtual · online</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white transition text-lg leading-none">×</button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-ocean text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}
                >
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
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-100 p-3 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Scrie un mesaj..."
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ocean/30 focus:border-ocean"
              style={{ fontSize: '16px' }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="bg-ocean hover:bg-blue-900 disabled:opacity-40 text-white rounded-xl w-9 h-9 flex items-center justify-center transition shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
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
          <p className="text-sm text-gray-800">👋 Bine ați venit! Vă ajut să rezervați un studio Premium în Olimp! 🌅</p>
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
