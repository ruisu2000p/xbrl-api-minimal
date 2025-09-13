import type { Metadata } from 'next'
import Link from 'next/link'
import { Analytics } from '@vercel/analytics/next'
import Script from 'next/script'

export const metadata: Metadata = {
  title: 'XBRL財務データAPI - 20年分の有価証券報告書',
  description: '日本の上場企業4,000社以上、20年分の財務データにアクセス',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>
        {children}
        <Analytics />
        <Script src="https://cdn.tailwindcss.com" strategy="afterInteractive" />
      </body>
    </html>
  )
}