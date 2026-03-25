export default function StructuredData() {
  const schema = [
    {
      '@context': 'https://schema.org',
      '@type': 'LodgingBusiness',
      name: 'Sunset Beach Olimp – Blaxy Residence',
      description: 'Studiouri de vacanță la malul Mării Negre în Olimp, România. Piscine gratuite, parcare gratuită, 250m până la plajă. Cazare Olimp 2026.',
      url: 'https://sunsetbeach.com.ro',
      telephone: '+40787813485',
      email: '',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Blaxy Residence',
        addressLocality: 'Olimp',
        addressRegion: 'Constanța',
        postalCode: '905527',
        addressCountry: 'RO',
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: 43.898245,
        longitude: 28.608197,
      },
      hasMap: 'https://maps.google.com/?q=Blaxy+Resort+Olimp+Romania',
      amenityFeature: [
        { '@type': 'LocationFeatureSpecification', name: 'Piscine gratuite', value: true },
        { '@type': 'LocationFeatureSpecification', name: 'Parcare gratuită', value: true },
        { '@type': 'LocationFeatureSpecification', name: 'Wi-Fi gratuit', value: true },
        { '@type': 'LocationFeatureSpecification', name: 'Aer condiționat', value: true },
        { '@type': 'LocationFeatureSpecification', name: 'Vedere la mare', value: true },
        { '@type': 'LocationFeatureSpecification', name: 'Balcon', value: true },
        { '@type': 'LocationFeatureSpecification', name: 'Frigider', value: true },
        { '@type': 'LocationFeatureSpecification', name: 'Pază 24/7', value: true },
      ],
      priceRange: '370-1200 RON/noapte',
      checkinTime: '14:00',
      checkoutTime: '12:00',
      numberOfRooms: 4,
      petsAllowed: false,
      image: [
        'https://sunsetbeach.com.ro/images/g108/piscina1.jpeg',
        'https://sunsetbeach.com.ro/images/g108/piscina2.jpeg',
        'https://sunsetbeach.com.ro/images/g108/1.jpeg',
      ],
      sameAs: [],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Cât costă cazarea la Olimp în 2026?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Prețurile încep de la 370 lei/noapte în mai-septembrie 2026. Studiourile cu vedere la mare costă 400-1200 lei/noapte, iar cele cu vedere la lac 370-1170 lei/noapte. La plata integrală se acordă discount 10%.',
          },
        },
        {
          '@type': 'Question',
          name: 'Unde se află Blaxy Residence în Olimp?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Blaxy Residence se află în stațiunea Olimp, la 250m de plajă. Complexul dispune de piscine, parcare gratuită, pază 24/7 și acces facil la plajă.',
          },
        },
        {
          '@type': 'Question',
          name: 'Cum pot rezerva un studio în Olimp?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Rezervarea se face direct pe WhatsApp la numărul +40787813485. Selectați perioada dorită în calendar și trimiteți cererea. Stayul minim este de 3 nopți.',
          },
        },
        {
          '@type': 'Question',
          name: 'Ce facilități are Blaxy Residence Olimp?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Blaxy Residence Olimp oferă: piscine gratuite cu șezlonguri, parcare gratuită, Wi-Fi, aer condiționat, bar și restaurant în complex, magazin, pază 24/7 și plajă la 250m.',
          },
        },
      ],
    },
  ]

  return (
    <>
      {schema.map((s, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }}
        />
      ))}
    </>
  )
}
