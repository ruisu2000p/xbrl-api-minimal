import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ログイン - XBRL財務データAPI',
  description: 'XBRL財務データAPIへのログイン',
}

// ルートセグメント設定でキャッシュを制御
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}