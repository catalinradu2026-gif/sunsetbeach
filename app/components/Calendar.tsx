'use client'

import { useState, useCallback } from 'react'

interface Props {
  prices: Record<string, number>
  occupied: string[]
  checkoutOnly?: string[]
  checkinOnly?: string[]
  onRangeSelect?: (range: { start: string; end: string } | null) => void
  adminMode?: boolean
  onAdminClick?: (date: string) => void
}

const MONTHS = ['Ianuarie','Februarie','Martie','Aprilie','Mai','Iunie','Iulie','August','Septembrie','Octombrie','Noiembrie','Decembrie']
const DAYS = ['Lu','Ma','Mi','Jo','Vi','Sâ','Du']

function toKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export default function Calendar({ prices, occupied, checkoutOnly = [], checkinOnly = [], onRangeSelect, adminMode, onAdminClick }: Props) {
  const today = new Date()
  today.setHours(0,0,0,0)

  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [rangeStart, setRangeStart] = useState<string | null>(null)
  const [rangeEnd, setRangeEnd] = useState<string | null>(null)
  const [hovering, setHovering] = useState<string | null>(null)

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startOffset = (firstDay.getDay() + 6) % 7

  const days: (Date | null)[] = Array(startOffset).fill(null)
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d))
  }

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const isOccupied = (key: string) => occupied.includes(key)
  const isCheckoutOnly = (key: string) => checkoutOnly.includes(key)
  const isCheckinOnly = (key: string) => checkinOnly.includes(key)
  const isPast = (d: Date) => d < today

  const inRange = useCallback((key: string) => {
    const start = rangeStart
    const end = rangeEnd || hovering
    if (!start || !end) return false
    const [a, b] = start <= end ? [start, end] : [end, start]
    return key >= a && key <= b
  }, [rangeStart, rangeEnd, hovering])

  function handleClick(d: Date) {
    const key = toKey(d)
    if (adminMode && onAdminClick) {
      onAdminClick(key)
      return
    }
    if (isPast(d) || isOccupied(key)) return

    const coOnly = isCheckoutOnly(key)
    const ciOnly = isCheckinOnly(key)

    if (!rangeStart || rangeEnd) {
      // Incepem o selectie noua — checkout_only nu poate fi start
      if (coOnly) return
      setRangeStart(key)
      setRangeEnd(null)
      onRangeSelect?.(null)
    } else {
      // Completam selectia — checkin_only nu poate fi end
      if (ciOnly) return
      let start = rangeStart
      let end = key
      if (start > end) [start, end] = [end, start]

      const hasOccupied = (() => {
        let cur = new Date(start)
        const endD = new Date(end)
        while (cur <= endD) {
          const curKey = toKey(cur)
          if (occupied.includes(curKey)) return true
          // checkoutOnly blocheaza doar daca NU e data de sfarsit
          if (checkoutOnly.includes(curKey) && curKey !== end) return true
          // checkinOnly blocheaza doar daca NU e data de inceput
          if (checkinOnly.includes(curKey) && curKey !== start) return true
          cur.setDate(cur.getDate() + 1)
        }
        return false
      })()

      if (hasOccupied) {
        setRangeStart(key)
        setRangeEnd(null)
        onRangeSelect?.(null)
      } else {
        setRangeEnd(end)
        setRangeStart(start)
        onRangeSelect?.({ start, end })
      }
    }
  }

  function getDayClass(d: Date | null) {
    if (!d) return ''
    const key = toKey(d)
    const past = isPast(d)
    const occ = isOccupied(key)
    const isStart = key === rangeStart
    const isEnd = key === (rangeEnd || (rangeStart && !rangeEnd ? hovering : null))
    const inR = inRange(key)
    const isToday = key === toKey(today)

    let base = 'relative flex flex-col items-center justify-center h-10 md:h-8 rounded-md text-xs transition cursor-pointer select-none '

    if (adminMode) {
      if (occ) base += 'bg-red-100 text-red-700 font-semibold '
      else base += 'hover:bg-blue-50 '
      if (isToday) base += 'ring-2 ring-ocean '
      return base
    }

    if (past) return base + 'text-gray-300 cursor-not-allowed '
    if (occ) return base + 'bg-red-50 text-red-400 line-through cursor-not-allowed '
    if (isCheckoutOnly(key)) return base + 'text-gray-700 overflow-hidden '
    if (isCheckinOnly(key)) return base + 'text-gray-700 overflow-hidden '
    if (isStart || isEnd) return base + 'bg-ocean text-white font-semibold z-10 '
    if (inR) return base + 'bg-blue-100 text-blue-800 rounded-none '
    if (isToday) return base + 'ring-2 ring-ocean text-ocean font-semibold hover:bg-blue-50 '
    return base + 'hover:bg-blue-50 text-gray-700 '
  }

  let rangeTotal: number | null = null
  let rangeDays = 0
  if (rangeStart && rangeEnd) {
    let cur = new Date(rangeStart)
    const endD = new Date(rangeEnd)
    rangeTotal = 0
    while (cur < endD) {
      const k = toKey(cur)
      rangeTotal += prices[k] || 0
      rangeDays++
      cur.setDate(cur.getDate() + 1)
    }
    if (rangeTotal === 0) rangeTotal = null
  }

  return (
    <div className="w-full">
      {/* Navigation */}
      <div className="flex items-center justify-between mb-2">
        <button onClick={prevMonth} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 font-bold transition">‹</button>
        <span className="font-semibold text-gray-700 text-sm">{MONTHS[month]} {year}</span>
        <button onClick={nextMonth} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 font-bold transition">›</button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-gray-400 py-1">{d}</div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {days.map((d, i) => {
          const key = d ? toKey(d) : ''
          const coOnly = d ? isCheckoutOnly(key) : false
          const ciOnly = d ? isCheckinOnly(key) : false
          const halfStyle = coOnly
            ? { background: 'linear-gradient(to bottom right, white 50%, #fee2e2 50%)' }
            : ciOnly
            ? { background: 'linear-gradient(to bottom right, #fee2e2 50%, white 50%)' }
            : undefined
          return (
            <div
              key={i}
              className={d ? getDayClass(d) : ''}
              style={halfStyle}
              onClick={() => d && handleClick(d)}
              onMouseEnter={() => {
                if (d && rangeStart && !rangeEnd) setHovering(toKey(d))
              }}
              onMouseLeave={() => setHovering(null)}
            >
              {d && (
                <>
                  <span className="text-xs leading-none">{d.getDate()}</span>
                  {coOnly && <span className="text-[7px] leading-none text-orange-500 font-bold">C/O</span>}
                  {ciOnly && <span className="text-[7px] leading-none text-orange-500 font-bold">C/I</span>}
                  {prices[key] && !isPast(d) && !isOccupied(key) && !coOnly && !ciOnly && (
                    <span className="text-[7px] leading-none text-sunset font-bold">
                      {prices[key]}
                    </span>
                  )}
                  {adminMode && isOccupied(key) && (
                    <span className="text-[8px] leading-none text-red-500">occ</span>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      {!adminMode && (
        <div className="flex gap-3 mt-3 text-[10px] text-gray-400 flex-wrap">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-red-100 inline-block border border-red-200"></span> Ocupat
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded inline-block border border-orange-200" style={{ background: 'linear-gradient(to bottom right, white 50%, #fee2e2 50%)' }}></span> C/O doar checkout
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded inline-block border border-orange-200" style={{ background: 'linear-gradient(to bottom right, #fee2e2 50%, white 50%)' }}></span> C/I doar check-in
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-ocean inline-block"></span> Selectat
          </span>
          {Object.keys(prices).length > 0 && (
            <span className="flex items-center gap-1">
              <span className="text-sunset font-bold">lei</span> Preț/noapte
            </span>
          )}
        </div>
      )}

      {/* Range price summary */}
      {rangeTotal !== null && rangeDays > 0 && (
        <div className="mt-2 p-2 bg-emerald-50 border border-emerald-100 rounded-lg text-xs text-emerald-700 text-center font-medium">
          {rangeDays} nopți · ~{Math.round(rangeTotal/rangeDays)} lei/noapte · <strong>{rangeTotal!.toLocaleString('ro-RO')} lei total</strong>
        </div>
      )}
    </div>
  )
}
