export default function StructuredData() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'LodgingBusiness',
    name: 'Sunset Beach Olimp – Blaxy Residence',
    description: 'Studiouri de vacanță la malul Mării Negre în Olimp, România. Piscine gratuite, parcare gratuită, 200m până la plajă.',
    url: 'https://sunsetbeach.com.ro',
    telephone: '+40787813485',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Blaxy Residence',
      addressLocality: 'Olimp',
      addressRegion: 'Constanța',
      addressCountry: 'RO',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 43.8023,
      longitude: 28.5876,
    },
    amenityFeature: [
      { '@type': 'LocationFeatureSpecification', name: 'Piscine', value: true },
      { '@type': 'LocationFeatureSpecification', name: 'Parcare gratuită', value: true },
      { '@type': 'LocationFeatureSpecification', name: 'Wi-Fi gratuit', value: true },
      { '@type': 'LocationFeatureSpecification', name: 'Aer condiționat', value: true },
      { '@type': 'LocationFeatureSpecification', name: 'Vedere la mare', value: true },
    ],
    priceRange: '400-1200 RON/noapte',
    checkinTime: '14:00',
    checkoutTime: '12:00',
    image: 'https://sunsetbeach.com.ro/images/g108/piscina1.jpeg',
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
