'use client'

import { useState } from 'react'
import Image from 'next/image'
import Calendar from './Calendar'

interface StudioData {
  name: string
  description: string
  whatsapp: string
  prices: Record<string, number>
  occupied: string[]
}

interface Props {
  studioId: string
  data: StudioData
  images: string[]
  flip?: boolean
}

export default function StudioCard({ studioId, data, images, flip = false }: Props) {
  const [imgIdx, setImgIdx] = useState(0)
  const [selectedRange, setSelectedRange] = useState<{ start: string; end: string } | null>(null)

  const validImages = images.filter(Boolean)
  const hasImages = validImages.length > 0

  function buildWhatsappMsg() {
    if (!selectedRange) {
      return `Bună ziua! Sunt interesat de ${data.name} la Blaxy Residence Olimp. Vă rog să îmi comunicați disponibilitatea și prețul.`
    }
    const start = new Date(selectedRange.start).toLocaleDateString('ro-RO')
    const end = new Date(selectedRange.end).toLocaleDateString('ro-RO')
    return `Bună ziua! Sunt interesat de ${data.name} în perioada ${start} – ${end}. Vă rog să confirmați disponibilitatea.`
  }

  const waNumber = data.whatsapp.replace(/\D/g, '')
  const waLink = `https://wa.me/${waNumber}?text=${encodeURIComponent(buildWhatsappMsg())}`

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className={`flex flex-col md:flex-row ${flip ? 'md:flex-row-reverse' : ''}`}>

        {/* FOTO */}
        <div className="relative w-full md:w-1/2 h-72 md:h-auto min-h-[320px] bg-gray-100 shrink-0">
          {hasImages ? (
            <>
              <Image
                src={validImages[imgIdx]}
                alt={`${data.name} foto ${imgIdx + 1}`}
                fill
                className="object-cover"
                onError={() => {}}
              />
              {validImages.length > 1 && (
                <>
                  <button
                    onClick={() => setImgIdx(i => (i - 1 + validImages.length) % validImages.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center backdrop-blur-sm transition"
                  >‹</button>
                  <button
                    onClick={() => setImgIdx(i => (i + 1) % validImages.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center backdrop-blur-sm transition"
                  >›</button>
                  <div className="absolute bottom-3 right-3 bg-black/40 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1 rounded-full">
                    {imgIdx + 1} / {validImages.length}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-2">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs">Fotografii în curând</span>
            </div>
          )}
        </div>

        {/* INFO + CALENDAR */}
        <div className="flex flex-col flex-1 p-6 md:p-8">

          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs text-ocean font-semibold uppercase tracking-widest mb-1">{studioId.toUpperCase()} · Blaxy Residence</p>
              <h2 className="text-2xl font-bold text-gray-900">{data.name}</h2>
            </div>
            <span className="bg-emerald-50 text-emerald-600 text-xs font-semibold px-2.5 py-1 rounded-full border border-emerald-100 shrink-0 ml-3 mt-1">
              Disponibil
            </span>
          </div>

          <p className="text-gray-500 text-sm leading-relaxed mb-5">{data.description}</p>

          <div className="border-t border-gray-100 mb-5" />

          {/* Calendar */}
          <div className="flex-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Disponibilitate & Prețuri</p>
            <Calendar
              prices={data.prices}
              occupied={data.occupied}
              onRangeSelect={setSelectedRange}
            />
          </div>

          {/* Selected range */}
          {selectedRange && (
            <div className="mt-4 px-3 py-2 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 flex items-center gap-2">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <strong>{new Date(selectedRange.start).toLocaleDateString('ro-RO')}</strong>
              {selectedRange.start !== selectedRange.end && (
                <> → <strong>{new Date(selectedRange.end).toLocaleDateString('ro-RO')}</strong></>
              )}
            </div>
          )}

          {/* WhatsApp button */}
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center justify-center gap-2.5 w-full bg-[#25D366] hover:bg-[#20bc5a] text-white font-semibold py-3.5 rounded-xl transition text-sm shadow-sm"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Rezervă pe WhatsApp
          </a>
        </div>
      </div>
    </div>
  )
}
