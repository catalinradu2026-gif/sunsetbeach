import type { Metadata } from 'next'
import './globals.css'
import StructuredData from './components/StructuredData'

export const metadata: Metadata = {
  title: 'Cazare Olimp – Studiouri la Mare | sunsetbeach.com.ro',
  description: 'Închiriezi studio de vacanță în Olimp, la malul Mării Negre. Blaxy Residence – piscine gratuite, 200m până la plajă, parcare gratuită. Rezervă acum pe WhatsApp!',
  keywords: 'cazare olimp, studio olimp, inchiriere olimp, cazare mare, litoral romania, blaxy residence olimp, studio vacanta olimp, cazare ieftina olimp, apartament olimp',
  openGraph: {
    title: 'Cazare Olimp – Studiouri la Mare | sunsetbeach.com.ro',
    description: 'Studiouri de vacanță la malul Mării Negre în Olimp. Piscine gratuite, parcare, 200m până la plajă. Rezervă pe WhatsApp!',
    url: 'https://sunsetbeach.com.ro',
    siteName: 'Sunset Beach Olimp',
    locale: 'ro_RO',
    type: 'website',
    images: [
      {
        url: '/images/g108/piscina1.jpeg',
        width: 1200,
        height: 630,
        alt: 'Sunset Beach Olimp – Studiouri la mare',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cazare Olimp – Studiouri la Mare',
    description: 'Studiouri de vacanță la malul Mării Negre în Olimp. Piscine gratuite, 200m până la plajă.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  alternates: {
    canonical: 'https://sunsetbeach.com.ro',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro">
      <head>
        <link rel="canonical" href="https://sunsetbeach.com.ro" />
        <StructuredData />
      </head>
      <body className="bg-gray-50 text-gray-800">
        {children}
      </body>
    </html>
  )
}
