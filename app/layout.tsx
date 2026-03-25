import type { Metadata } from 'next'
import './globals.css'
import StructuredData from './components/StructuredData'

export const metadata: Metadata = {
  metadataBase: new URL('https://sunsetbeach.com.ro'),
  title: 'Cazare Olimp 2026 – Studiouri la Mare cu Piscină | Blaxy Residence',
  description: 'Cazare Olimp 2026 – studiouri de vacanță la malul Mării Negre, Blaxy Residence. Piscine gratuite, 200m până la plajă, parcare gratuită, aer condiționat. Rezervă acum pe WhatsApp!',
  keywords: 'cazare olimp, cazare olimp 2026, cazare la mare, cazare mare romania, studio olimp, inchiriere olimp, litoral romania, blaxy residence olimp, studio vacanta olimp, cazare ieftina olimp, apartament olimp, cazare olimp piscina, vacanta la mare, vacanta olimp, hotel olimp, cazare mamaia nord, cazare constanta, cazare litoral 2026, studio inchiriere olimp 2026, cazare olimp whatsapp, inchiriere apartament mare, sejur mare romania',
  openGraph: {
    title: 'Cazare Olimp 2026 – Studiouri la Mare cu Piscină | Blaxy Residence',
    description: 'Studiouri de vacanță la malul Mării Negre în Olimp. Piscine gratuite, parcare, 200m până la plajă. Prețuri 370-1200 lei/noapte. Rezervă pe WhatsApp!',
    url: 'https://sunsetbeach.com.ro',
    siteName: 'Sunset Beach Olimp',
    locale: 'ro_RO',
    type: 'website',
    images: [
      {
        url: 'https://sunsetbeach.com.ro/images/g108/piscina1.jpeg',
        width: 1200,
        height: 630,
        alt: 'Cazare Olimp 2026 – Studiouri Blaxy Residence cu piscine și vedere la mare',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cazare Olimp 2026 – Studiouri la Mare cu Piscină',
    description: 'Studiouri de vacanță la malul Mării Negre în Olimp, Blaxy Residence. Piscine gratuite, 200m până la plajă. 370-1200 lei/noapte.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: 'https://sunsetbeach.com.ro',
  },
  verification: {
    google: '',
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
