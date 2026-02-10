/**
 * SEO configuration - used for meta tags, structured data, and sitemap
 */
export const SITE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SITE_URL) || 'https://adenmgb.com'

export const SITE_NAME = 'AdenMGB'
export const SITE_DEFAULT_TITLE =
  'AdenMGB | Open Source Developer & Creative Technologist Portfolio'
export const SITE_DEFAULT_DESCRIPTION =
  'Portfolio of AdenMGB - Open source developer, creative technologist. Projects, games, and contact.'
/** Add public/og-image.png (1200x630) for social sharing - falls back to this URL */
export const SITE_DEFAULT_IMAGE = `${SITE_URL}/og-image.png`

/** Person schema for JSON-LD - update with your details */
export const PERSON_SCHEMA = {
  '@type': 'Person',
  name: 'Aden',
  url: SITE_URL,
  email: 'aden@adenmgb.com',
  jobTitle: 'Open Source Developer & Creative Technologist',
  description: SITE_DEFAULT_DESCRIPTION,
  sameAs: [
    'https://github.com/AdenMGB',
    'https://www.youtube.com/@adenmgb',
    'https://steamcommunity.com/id/AdenMGB/',
    'https://www.instagram.com/adenmgb/',
  ],
}

/** WebSite schema for JSON-LD */
export const WEBSITE_SCHEMA = {
  '@type': 'WebSite',
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DEFAULT_DESCRIPTION,
  publisher: PERSON_SCHEMA,
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${SITE_URL}/games?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
}
