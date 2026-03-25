'use client'

import { useState } from 'react'
import Calendar from '../components/Calendar'

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

export default function AdminPage() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState('')
  const [data, setData] = useState<StudiosData | null>(null)
  const [activeStudio, setActiveStudio] = useState<'g108' | 'g109'>('g108')
  const [mode, setMode] = useState<'price' | 'occupied' | 'clearOccupied'>('price')
  const [price, setPrice] = useState('')
  const [rangeStart, setRangeStart] = useState('')
  const [rangeEnd, setRangeEnd] = useState('')
  const [status, setStatus] = useState('')

  async function loadData() {
    const r = await fetch('/api/data')
    setData(await r.json())
  }

  async function callAdmin(body: object) {
    const r = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, ...body }),
    })
    const j = await r.json()
    if (j.error) { setStatus('❌ ' + j.error); return false }
    await loadData()
    setStatus('✅ Salvat!')
    setTimeout(() => setStatus(''), 2000)
    return true
  }

  function getDatesInRange(start: string, end: string): string[] {
    const dates: string[] = []
    let cur = new Date(start)
    const endD = new Date(end)
    while (cur <= endD) {
      dates.push(cur.toISOString().split('T')[0])
      cur.setDate(cur.getDate() + 1)
    }
    return dates
  }

  async function handleApply() {
    if (!rangeStart) { setStatus('❌ Selectează cel puțin o dată din calendar sau completează câmpul'); return }
    const end = rangeEnd || rangeStart
    const dates = getDatesInRange(rangeStart, end)

    if (mode === 'price') {
      const p = parseInt(price)
      if (!p || p <= 0) { setStatus('❌ Introdu un preț valid'); return }
      await callAdmin({ studio: activeStudio, action: 'setPriceRange', dates, price: p })
    } else if (mode === 'occupied') {
      await callAdmin({ studio: activeStudio, action: 'setOccupiedRange', dates })
    } else {
      await callAdmin({ studio: activeStudio, action: 'clearOccupiedRange', dates })
    }
  }

  async function handleAdminCalendarClick(date: string) {
    if (mode === 'price') {
      if (!rangeStart || (rangeStart && rangeEnd)) {
        setRangeStart(date); setRangeEnd('')
      } else {
        const [a, b] = date >= rangeStart ? [rangeStart, date] : [date, rangeStart]
        setRangeStart(a); setRangeEnd(b)
      }
    } else {
      await callAdmin({ studio: activeStudio, action: 'toggleOccupied', date })
    }
  }

  function checkPassword() {
    if (password.length < 3) { setAuthError('Introdu parola'); return }
    fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, studio: 'g108', action: 'check' }),
    }).then(r => r.json()).then(j => {
      if (j.error === 'Parolă incorectă') {
        setAuthError('Parolă incorectă ❌')
      } else {
        setAuthed(true)
        loadData()
      }
    })
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
          <h1 className="text-2xl font-bold text-ocean mb-6 text-center">🔐 Admin Panel</h1>
          <input
            type="password"
            placeholder="Parolă"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && checkPassword()}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-3 text-base focus:outline-none focus:ring-2 focus:ring-ocean"
          />
          {authError && <p className="text-red-500 text-sm mb-2">{authError}</p>}
          <button
            onClick={checkPassword}
            className="w-full bg-ocean text-white py-3 rounded-lg font-semibold hover:bg-blue-900 transition"
          >
            Intră
          </button>
        </div>
      </div>
    )
  }

  const studio = data?.[activeStudio]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-ocean text-white px-6 py-4 flex items-center gap-4">
        <h1 className="text-xl font-bold">⚙️ Admin – sunsetbeach.ro</h1>
        <a href="/" className="ml-auto text-sm opacity-80 hover:opacity-100">← Site</a>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Studio selector */}
        <div className="bg-white rounded-2xl shadow p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Studio activ</h2>
          <div className="flex gap-3">
            {(['g108', 'g109'] as const).map(id => (
              <button
                key={id}
                onClick={() => setActiveStudio(id)}
                className={`flex-1 py-3 rounded-xl font-semibold transition ${activeStudio === id ? 'bg-ocean text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {id.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {studio && (
          <>
            {/* Mode selector */}
            <div className="bg-white rounded-2xl shadow p-5">
              <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Ce vrei să faci?</h2>
              <div className="flex gap-2 flex-wrap">
                {[
                  { id: 'price', label: '💰 Setează preț' },
                  { id: 'occupied', label: '🔴 Marchează ocupat' },
                  { id: 'clearOccupied', label: '🟢 Eliberează zile' },
                ].map(m => (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id as typeof mode)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${mode === m.id ? 'bg-ocean text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Calendar */}
            <div className="bg-white rounded-2xl shadow p-5">
              <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">
                Calendar {activeStudio.toUpperCase()} — {mode === 'price' ? 'selectează interval' : 'apasă pe zile'}
              </h2>

              {mode === 'price' && (
                <div className="mb-4 flex gap-2 flex-wrap items-end">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">De la</label>
                    <input
                      type="date"
                      value={rangeStart}
                      onChange={e => setRangeStart(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ocean"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Până la</label>
                    <input
                      type="date"
                      value={rangeEnd}
                      onChange={e => setRangeEnd(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ocean"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Preț / noapte (€)</label>
                    <input
                      type="number"
                      value={price}
                      onChange={e => setPrice(e.target.value)}
                      placeholder="ex: 150"
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-ocean"
                    />
                  </div>
                </div>
              )}

              {(mode === 'occupied' || mode === 'clearOccupied') && (
                <div className="mb-4 flex gap-2 flex-wrap items-end">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">De la</label>
                    <input type="date" value={rangeStart} onChange={e => setRangeStart(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ocean" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Până la</label>
                    <input type="date" value={rangeEnd} onChange={e => setRangeEnd(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ocean" />
                  </div>
                </div>
              )}

              <Calendar
                prices={studio.prices}
                occupied={studio.occupied}
                adminMode
                onAdminClick={handleAdminCalendarClick}
              />

              <button
                onClick={handleApply}
                className="mt-4 w-full bg-ocean text-white py-3 rounded-xl font-semibold hover:bg-blue-900 transition"
              >
                {mode === 'price' ? `💾 Salvează prețul de ${price || '?'}€` :
                  mode === 'occupied' ? '🔴 Marchează ocupat intervalul' : '🟢 Eliberează intervalul'}
              </button>

              {status && (
                <p className="text-center mt-2 font-medium text-sm">{status}</p>
              )}
            </div>

            {/* Stats */}
            <div className="bg-white rounded-2xl shadow p-5">
              <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Rezumat {activeStudio.toUpperCase()}</h2>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-red-50 rounded-xl p-4">
                  <div className="text-2xl font-bold text-red-600">{studio.occupied.length}</div>
                  <div className="text-xs text-gray-500 mt-1">zile ocupate</div>
                </div>
                <div className="bg-blue-50 rounded-xl p-4">
                  <div className="text-2xl font-bold text-ocean">{Object.keys(studio.prices).length}</div>
                  <div className="text-xs text-gray-500 mt-1">zile cu preț setat</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
