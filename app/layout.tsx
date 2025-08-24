import './globals.css'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Analytics } from '@vercel/analytics/next'

export const metadata: Metadata = {
  title: '有価証券報告書財務データmcpAPI - 全上場企業の財務データ',
  description: '日本の全上場企業、10年分の財務データにアクセス',
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
      </body>
    </html>
  )
}