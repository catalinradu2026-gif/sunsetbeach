import type { Metadata } from 'next'
import './globals.css'
export const metadata: Metadata = {
  title: 'sunsetbeach.com.ro',
  description: 'Studiouri de închiriat la malul mării – Blaxy, Olimp.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro">
      <body className="bg-gray-50 text-gray-800">
        {children}
</body>
    </html>
  )
}
