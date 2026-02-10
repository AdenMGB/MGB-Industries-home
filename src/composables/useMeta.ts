import { computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  SITE_URL,
  SITE_NAME,
  SITE_DEFAULT_TITLE,
  SITE_DEFAULT_DESCRIPTION,
  SITE_DEFAULT_IMAGE,
  PERSON_SCHEMA,
  WEBSITE_SCHEMA,
} from '@/config/seo'

export interface MetaOptions {
  title?: string
  description?: string
  image?: string
  canonical?: string
  noIndex?: boolean
  /** Override for JSON-LD - set to false to skip Person/WebSite on this page */
  structuredData?: boolean | Record<string, unknown>
}

const META_TAGS = {
  description: 'description',
  'og:title': 'og:title',
  'og:description': 'og:description',
  'og:image': 'og:image',
  'og:url': 'og:url',
  'og:type': 'og:type',
  'og:site_name': 'og:site_name',
  'twitter:card': 'twitter:card',
  'twitter:title': 'twitter:title',
  'twitter:description': 'twitter:description',
  'twitter:image': 'twitter:image',
  'twitter:site': 'twitter:site',
  'robots': 'robots',
} as const

function getOrCreateMetaTag(
  attribute: 'name' | 'property',
  key: string,
  value: string,
): HTMLMetaElement {
  const selector =
    attribute === 'name'
      ? `meta[name="${key}"]`
      : `meta[property="${key}"]`
  let el = document.querySelector<HTMLMetaElement>(selector)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attribute, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', value)
  return el
}

function getOrCreateLinkTag(rel: string, href: string): HTMLLinkElement {
  const selector = `link[rel="${rel}"]`
  let el = document.querySelector<HTMLLinkElement>(selector)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
  return el
}

function removeJsonLdScripts(): void {
  document.querySelectorAll('script[type="application/ld+json"]').forEach((el) => el.remove())
}

function injectJsonLd(data: Record<string, unknown>): void {
  const script = document.createElement('script')
  script.type = 'application/ld+json'
  script.textContent = JSON.stringify(data)
  document.head.appendChild(script)
}

/**
 * Apply meta tags, canonical URL, and JSON-LD to the document head.
 * Call this when the route changes or when page-specific meta is available.
 */
export function setMeta(options: MetaOptions): void {
  const title =
    options.title === SITE_NAME || options.title?.includes(' | ')
      ? (options.title ?? SITE_DEFAULT_TITLE)
      : options.title
        ? `${options.title} | ${SITE_NAME}`
        : SITE_DEFAULT_TITLE
  const description = options.description ?? SITE_DEFAULT_DESCRIPTION
  const image = options.image?.startsWith('http')
    ? options.image
    : options.image
      ? `${SITE_URL}${options.image.startsWith('/') ? '' : '/'}${options.image}`
      : SITE_DEFAULT_IMAGE
  const url = options.canonical ?? (typeof window !== 'undefined' ? window.location.href : SITE_URL)

  document.title = title

  getOrCreateMetaTag('name', 'description', description)
  getOrCreateMetaTag('property', 'og:title', title)
  getOrCreateMetaTag('property', 'og:description', description)
  getOrCreateMetaTag('property', 'og:image', image)
  getOrCreateMetaTag('property', 'og:url', url)
  getOrCreateMetaTag('property', 'og:type', 'website')
  getOrCreateMetaTag('property', 'og:site_name', SITE_NAME)

  getOrCreateMetaTag('name', 'twitter:card', 'summary_large_image')
  getOrCreateMetaTag('name', 'twitter:title', title)
  getOrCreateMetaTag('name', 'twitter:description', description)
  getOrCreateMetaTag('name', 'twitter:image', image)

  if (options.noIndex) {
    getOrCreateMetaTag('name', 'robots', 'noindex, nofollow')
  }

  const canonical = options.canonical ?? url
  getOrCreateLinkTag('canonical', canonical)

  removeJsonLdScripts()

  if (options.structuredData !== false) {
    if (typeof options.structuredData === 'object' && options.structuredData !== null) {
      injectJsonLd(options.structuredData as Record<string, unknown>)
    } else {
      injectJsonLd({
        '@context': 'https://schema.org',
        '@graph': [PERSON_SCHEMA, WEBSITE_SCHEMA],
      })
    }
  }
}

/**
 * Composable to apply meta from route meta.seo and optionally override with custom options.
 * Use in layout or individual pages.
 */
export function useMeta(overrides?: MetaOptions) {
  const route = useRoute()

  const metaFromRoute = computed(() => {
    const meta = route.meta?.seo as MetaOptions | undefined
    return meta ?? {}
  })

  const mergedMeta = computed(() => {
    const pathWithoutQuery = route.fullPath.split('?')[0]
    const canonical = overrides?.canonical ?? metaFromRoute.value?.canonical ?? `${SITE_URL}${pathWithoutQuery}`
    return {
      ...metaFromRoute.value,
      ...overrides,
      canonical,
    }
  })

  return {
    setMeta: () => setMeta(mergedMeta.value),
    meta: mergedMeta,
  }
}
