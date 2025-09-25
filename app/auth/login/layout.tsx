export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

// Next.js 14のメタデータAPIでキャッシュ制御
export const metadata = {
  other: {
    'Cache-Control': 'private, no-cache, must-revalidate',
  },
}

// ルートセグメント設定でキャッシュを制御
export const dynamic = 'force-dynamic'
export const revalidate = 0