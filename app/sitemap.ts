import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://fininfonext.com'

  // 静的ページのリスト
  const staticPages = [
    '',
    '/pricing',
    '/docs',
    '/login',
    '/signup',
    '/privacy',
    '/legal',
  ]

  return staticPages.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'daily' : 'weekly',
    priority: route === '' ? 1.0 : 0.8,
  }))
}
