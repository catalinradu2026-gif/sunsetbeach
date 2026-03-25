'use client'

import { useEffect, useState, useRef } from 'react'
import StudioCard from './components/StudioCard'

interface StudioData {
  name: string
  description: string
  whatsapp: string
  prices: Record<string, number>
  occupied: string[]
}

interface StudiosData {
  g108: StudioData
  g109: StudioData
}

export default function Home() {
  const [data, setData] = useState<StudiosData | null>(null)
  const [started, setStarted] = useState(false)
  const [muted, setMuted] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    fetch('/api/data').then(r => r.json()).then(setData)
  }, [])

  function handleStart() {
    if (!videoRef.current) return
    videoRef.current.muted = false
    videoRef.current.currentTime = 0
    videoRef.current.play()
    setMuted(false)
    setStarted(true)
  }

  function toggleMute() {
    if (!videoRef.current) return
    videoRef.current.muted = !videoRef.current.muted
    setMuted(videoRef.current.muted)
  }

  return (
    <main className="min-h-screen bg-white text-gray-800">

      {/* HERO */}
      <section className="relative flex flex-col items-center justify-center text-center px-4 overflow-hidden" style={{ height: '100dvh' }}>

        {/* Video fundal */}
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          src="/videos/hero.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/images/g108/piscina1.jpeg"
          style={{ WebkitTransform: 'translateZ(0)', transform: 'translateZ(0)' } as React.CSSProperties}
        />

        {/* Overlay */}
        <div className="absolute inset-0 bg-black/50" />

        {/* Overlay de start – dispare după click */}
        {!started && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60">
            <button
              onClick={handleStart}
              className="group flex flex-col items-center gap-4 text-white transition hover:scale-105"
            >
              <div className="w-20 h-20 rounded-full border-2 border-white/60 flex items-center justify-center bg-white/10 group-hover:bg-white/20 transition backdrop-blur-sm">
                <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </div>
              <span className="text-sm tracking-widest uppercase font-medium text-white/80">Pornește cu sunet</span>
            </button>
          </div>
        )}

        {/* Conținut hero */}
        <div className="relative z-10 flex flex-col items-center">
          <p className="text-white/60 text-[10px] tracking-[0.25em] uppercase mb-3">Blaxy · Olimp</p>
          <h1 className="text-3xl md:text-8xl font-bold text-white leading-none tracking-tight">
            sunsetbeach.com.ro
          </h1>
          <p className="text-white/70 mt-3 md:mt-6 text-xs md:text-lg max-w-[260px] md:max-w-sm">
            Studiouri de închiriat la malul mării
          </p>
          <div className="mt-6 flex flex-row items-center gap-2">
            <a
              href="tel:+40787813485"
              className="flex items-center gap-2 bg-white text-gray-900 hover:bg-gray-100 text-xs md:text-sm font-semibold px-4 md:px-6 py-2.5 md:py-3 rounded-full transition shadow"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              Sună acum
            </a>
            <a
              href="#studiouri"
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/25 text-white text-xs md:text-sm font-medium px-4 md:px-6 py-2.5 md:py-3 rounded-full transition"
            >
              Vezi studiourile
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </a>
          </div>
        </div>

        {/* Buton mute/unmute */}
        {started && (
          <button
            onClick={toggleMute}
            className="absolute bottom-8 right-6 z-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white rounded-full w-10 h-10 flex items-center justify-center transition"
            aria-label={muted ? 'Activează sunetul' : 'Dezactivează sunetul'}
          >
            {muted ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6v12m-3.536-9.536a5 5 0 000 7.072M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            )}
          </button>
        )}

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-white/40">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </section>

      {/* DESCRIERE */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-12 md:py-20">

          {/* Titlu */}
          <div className="text-center mb-8 md:mb-14">
            <p className="text-[10px] tracking-[0.25em] uppercase text-orange-400 font-medium mb-2">Blaxy Residence · Olimp</p>
            <h2 className="text-2xl md:text-4xl font-bold text-gray-900 leading-tight">Cazare la malul Mării Negre</h2>
            <p className="text-gray-400 mt-2 text-sm max-w-lg mx-auto">Cameră triplă superioară de lux, chiar lângă mare</p>
          </div>

          {/* Stats rapide */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8 md:mb-14">
            {[
              { label: 'Capacitate', value: '2–3 adulți', sub: '+ 2 copii' },
              { label: 'Plajă', value: '200 m', sub: 'pe jos' },
              { label: 'Piscine', value: 'Gratuit', sub: 'șezlonguri incluse' },
              { label: 'Parcare', value: 'Gratuită', sub: 'în complex' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl p-3 md:p-5 text-center border border-gray-100">
                <div className="text-base md:text-xl font-bold text-gray-900">{s.value}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">{s.sub}</div>
                <div className="text-[10px] font-medium text-gray-500 mt-1.5 uppercase tracking-wide">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Facilități */}
          <div className="grid md:grid-cols-2 gap-4 mb-8 md:mb-14">

            <div className="bg-white rounded-2xl p-6 border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4">În cameră</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                {[
                  'Pat matrimonial + canapea extensibilă',
                  'Wi-Fi și aer condiționat',
                  'Frigider, espressor (cafea inclusă)',
                  'Feon, consumabile baie',
                  'Masă și scaune pe balcon',
                  'Vedere la piscine și la mare',
                ].map(item => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4">În complex</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                {[
                  'Piscine cu șezlonguri și umbrele',
                  'Beach baruri: mic dejun, burgeri, pizza, grătar',
                  'Magazin „La 2 pași" la parter',
                  'Pază și securitate 24/7',
                  'Parcare gratuită',
                ].map(item => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

          </div>

          {/* Restaurante + CTA */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-1">În apropiere</h3>
            <p className="text-sm text-gray-500">Popasul Pescarilor · Hacienda de Mare · Casa de Mare · Lacul Racilor</p>
          </div>

        </div>
      </section>

      {/* STUDIOURI */}
      <section id="studiouri" className="max-w-5xl mx-auto px-4 py-10 md:py-20 space-y-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900">Studiourile noastre</h2>
          <p className="text-gray-400 mt-2 text-sm">Selectează o perioadă și rezervă direct pe WhatsApp</p>
        </div>

        {!data ? (
          <div className="flex items-center justify-center py-24 gap-3 text-gray-300">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <span className="text-sm">Se încarcă...</span>
          </div>
        ) : (
          <div className="space-y-6">
            <StudioCard
              studioId="g108"
              data={data.g108}
              images={[
                '/images/g108/1.jpeg','/images/g108/2.jpeg','/images/g108/3.jpeg',
                '/images/g108/4.jpeg','/images/g108/5.jpeg','/images/g108/6.jpeg',
                '/images/g108/7.jpeg','/images/g108/8.jpeg','/images/g108/9.jpeg',
                '/images/g108/10.jpeg','/images/g108/11.jpeg','/images/g108/12.jpeg','/images/g108/13.jpeg',
                '/images/g108/piscina1.jpeg','/images/g108/piscina2.jpeg','/images/g108/piscina3.jpeg',
                '/images/g108/piscina4.jpeg','/images/g108/piscina5.jpeg',
                '/images/g108/piscina bar.jpeg','/images/g108/piscina bar2.jpeg',
                '/images/g108/Alee plaja Padurea de pini.jpeg',
              ]}
              flip={false}
            />
            <StudioCard
              studioId="g109"
              data={data.g109}
              images={[
                '/images/g109/1.jpeg','/images/g109/2.jpeg','/images/g109/3.jpeg',
                '/images/g109/4.jpeg','/images/g109/6.jpeg','/images/g109/7.jpeg',
                '/images/g109/8.jpeg','/images/g109/9.jpeg','/images/g109/10.jpeg','/images/g109/11.jpeg',
                '/images/g109/piscina1.jpeg','/images/g109/piscina2.jpeg','/images/g109/piscina3.jpeg',
                '/images/g109/piscina4.jpeg','/images/g109/piscina5.jpeg',
                '/images/g109/piscina bar.jpeg','/images/g109/piscina bar2.jpeg',
                '/images/g109/Alee plaja Padurea de pini.jpeg',
              ]}
              flip={true}
            />
          </div>
        )}
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <span className="font-medium text-gray-500">sunsetbeach.com.ro · Blaxy – Olimp</span>
          <a href="tel:+40787813485" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            0787 813 485
          </a>
          <span>© 2025 · Toate drepturile rezervate</span>
        </div>
      </footer>

    </main>
  )
}
