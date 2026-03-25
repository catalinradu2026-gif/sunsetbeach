'use client'

import { useState } from 'react'
import Image from 'next/image'
import Calendar from './Calendar'

interface StudioData {
  name: string
  title?: string
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

function toKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function calcPrice(prices: Record<string, number>, start: string, end: string) {
  let total = 0
  let nights = 0
  let cur = new Date(start)
  const endD = new Date(end)
  while (cur < endD) {
    total += prices[toKey(cur)] || 0
    nights++
    cur.setDate(cur.getDate() + 1)
  }
  return { total: total > 0 ? total : null, nights }
}

export default function StudioCard({ studioId, data, images, flip = false }: Props) {
  const [imgIdx, setImgIdx] = useState(0)
  const [selectedRange, setSelectedRange] = useState<{ start: string; end: string } | null>(null)
  const [paymentOption, setPaymentOption] = useState<'full' | 'half' | null>(null)
  const [minNightsWarning, setMinNightsWarning] = useState(false)
  const [breakfastPersons, setBreakfastPersons] = useState(0)

  const validImages = images.filter(Boolean)
  const hasImages = validImages.length > 0

  const priceInfo = selectedRange ? calcPrice(data.prices, selectedRange.start, selectedRange.end) : null

  function handleRangeSelect(range: { start: string; end: string } | null) {
    if (!range) {
      setSelectedRange(null)
      setMinNightsWarning(false)
      return
    }
    const { nights } = calcPrice(data.prices, range.start, range.end)
    if (nights < 3) {
      setMinNightsWarning(true)
      setSelectedRange(null)
      return
    }
    setMinNightsWarning(false)
    setSelectedRange(range)
    setPaymentOption(null)
  }

  function buildWhatsappMsg() {
    if (!selectedRange) {
      return `Bună ziua! Sunt interesat de ${data.name} la sunsetbeach.com.ro. Vă rog să îmi comunicați disponibilitatea și prețul.`
    }
    const start = new Date(selectedRange.start).toLocaleDateString('ro-RO')
    const end = new Date(selectedRange.end).toLocaleDateString('ro-RO')
    const nights = priceInfo?.nights || ''
    let paymentText = ''
    if (priceInfo?.total && paymentOption === 'full') {
      const discounted = Math.round(priceInfo.total * 0.9)
      paymentText = ` Optez pentru plata integrală (${discounted.toLocaleString('ro-RO')} lei, discount 10%).`
    } else if (priceInfo?.total && paymentOption === 'half') {
      const half = Math.round(priceInfo.total / 2)
      paymentText = ` Optez pentru avans 50% (${half.toLocaleString('ro-RO')} lei acum + ${half.toLocaleString('ro-RO')} lei la check-in).`
    }
    const breakfastText = breakfastPersons > 0 && priceInfo?.nights
      ? ` Doresc și mic dejun pentru ${breakfastPersons} persoane (${breakfastPersons * 40 * priceInfo.nights} lei total).`
      : ''
    return `Bună ziua! Sunt interesat de ${data.name} în perioada ${start} – ${end} (${nights} nopți).${paymentText}${breakfastText} Vă rog să confirmați disponibilitatea.`
  }

  const waNumber = data.whatsapp.replace(/\D/g, '')
  const waLink = `https://wa.me/${waNumber}?text=${encodeURIComponent(buildWhatsappMsg())}`

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className={`flex flex-col md:flex-row ${flip ? 'md:flex-row-reverse' : ''}`}>

        {/* FOTO */}
        <div className="relative w-full md:w-1/2 h-80 md:h-auto md:min-h-[380px] bg-gray-100 shrink-0">
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
        <div className="flex flex-col flex-1 p-4 md:p-8">

          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs text-ocean font-semibold uppercase tracking-widest mb-1">{studioId.toUpperCase()} · Blaxy Residence</p>
              <h2 className="text-2xl font-bold text-gray-900">{data.name}</h2>
              {data.title && (
                <p className="text-xs text-blue-600 font-semibold mt-1 uppercase tracking-wide">{data.title}</p>
              )}
            </div>
            <span className="bg-emerald-50 text-emerald-600 text-xs font-semibold px-2.5 py-1 rounded-full border border-emerald-100 shrink-0 ml-3 mt-1">
              Disponibil
            </span>
          </div>

          <p className="text-gray-500 text-sm leading-relaxed mb-3">{data.description}</p>
          <p className="text-xs text-orange-500 font-medium mb-4">Minim 3 nopți</p>

          <div className="border-t border-gray-100 mb-4" />

          {/* Calendar */}
          <div className="flex-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Disponibilitate & Prețuri</p>
            <Calendar
              prices={data.prices}
              occupied={data.occupied}
              onRangeSelect={handleRangeSelect}
            />
          </div>

          {/* MIC DEJUN */}
          <div className="mt-4 border border-dashed border-amber-300 rounded-xl p-3 bg-amber-50">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">Opțional · Mic dejun</p>
            <div className="flex items-center gap-3">
              <span className="text-xs text-amber-800">40 lei / persoană / zi</span>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={() => setBreakfastPersons(p => Math.max(0, p - 1))}
                  className="w-7 h-7 rounded-full border border-amber-400 text-amber-700 font-bold flex items-center justify-center hover:bg-amber-100 transition"
                >−</button>
                <span className="w-5 text-center text-sm font-bold text-amber-900">{breakfastPersons}</span>
                <button
                  onClick={() => setBreakfastPersons(p => Math.min(5, p + 1))}
                  className="w-7 h-7 rounded-full border border-amber-400 text-amber-700 font-bold flex items-center justify-center hover:bg-amber-100 transition"
                >+</button>
              </div>
            </div>
            {breakfastPersons > 0 && selectedRange && priceInfo?.nights && (
              <p className="text-xs text-amber-700 mt-1.5">
                Total mic dejun: <strong>{breakfastPersons * 40 * priceInfo.nights} lei</strong> ({breakfastPersons} pers. × {priceInfo.nights} zile)
              </p>
            )}
          </div>

          {/* Avertisment minim nopți */}
          {minNightsWarning && (
            <div className="mt-3 px-3 py-2 bg-orange-50 border border-orange-200 rounded-xl text-xs text-orange-700">
              Rezervarea minimă este de <strong>3 nopți</strong>. Te rugăm să selectezi o perioadă mai lungă.
            </div>
          )}

          {/* Perioadă selectată */}
          {selectedRange && (
            <div className="mt-3 px-3 py-2 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 flex items-center gap-2">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <strong>{new Date(selectedRange.start).toLocaleDateString('ro-RO')}</strong>
              {selectedRange.start !== selectedRange.end && (
                <> → <strong>{new Date(selectedRange.end).toLocaleDateString('ro-RO')}</strong></>
              )}
              {priceInfo?.nights && <span className="ml-1 text-blue-500">({priceInfo.nights} nopți)</span>}
            </div>
          )}

          {/* Calculator + Opțiuni plată */}
          {selectedRange && priceInfo?.total && (
            <div className="mt-3 space-y-2">
              {/* Total */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-center">
                <span className="text-sm text-gray-500">Total: </span>
                <span className="text-lg font-bold text-gray-900">{priceInfo.total.toLocaleString('ro-RO')} lei</span>
                <span className="text-xs text-gray-400 block">({priceInfo.nights} nopți · ~{Math.round(priceInfo.total / priceInfo.nights).toLocaleString('ro-RO')} lei/noapte)</span>
              </div>

              {/* Opțiuni plată */}
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-1">Modalitate de plată</p>

              <button
                onClick={() => setPaymentOption(paymentOption === 'full' ? null : 'full')}
                className={`w-full text-left p-3 rounded-xl border transition ${paymentOption === 'full' ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-white hover:border-green-300'}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Plată integrală</p>
                    <p className="text-xs text-green-600 font-medium">Discount 10%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold text-green-700">{Math.round(priceInfo.total * 0.9).toLocaleString('ro-RO')} lei</p>
                    <p className="text-xs text-gray-400 line-through">{priceInfo.total.toLocaleString('ro-RO')} lei</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setPaymentOption(paymentOption === 'half' ? null : 'half')}
                className={`w-full text-left p-3 rounded-xl border transition ${paymentOption === 'half' ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-300'}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Avans 50%</p>
                    <p className="text-xs text-gray-500">+ 50% la check-in</p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold text-blue-700">{Math.round(priceInfo.total / 2).toLocaleString('ro-RO')} lei acum</p>
                    <p className="text-xs text-gray-400">+ {Math.round(priceInfo.total / 2).toLocaleString('ro-RO')} lei la check-in</p>
                  </div>
                </div>
              </button>
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
