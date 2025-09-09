import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '財務データMCP - 10年分の有価証券報告書',
  description: '日本の上場企業4,000社以上、10年分の財務データにアクセス',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}