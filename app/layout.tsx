import type { Metadata } from 'next'
import './globals.css'
import ChatWidget from './components/ChatWidget'

export const metadata: Metadata = {
  title: 'sunsetbeach.ro',
  description: 'Studiouri de închiriat la malul mării – Blaxy, Olimp.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro">
      <body className="bg-gray-50 text-gray-800">
        {children}
        <ChatWidget />
      </body>
    </html>
  )
}
