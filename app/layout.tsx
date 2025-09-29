import type { Metadata } from "next";
import { Inter, Pacifico } from "next/font/google";
import { cookies } from "next/headers";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { supabaseManager } from "@/lib/infrastructure/supabase-manager";
import SupabaseProvider from "@/components/SupabaseProvider";
import { LanguageProvider } from "@/contexts/LanguageContext";
import "./globals.css";

const pacifico = Pacifico({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-pacifico',
})

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "FIN - Financial Information next | XBRL財務データ分析プラットフォーム",
  description: "有価証券報告書の財務データをAIで分析。Claudeによる高度な分析機能でプロフェッショナルな投資判断をサポート。",
  keywords: "XBRL, 財務分析, 有価証券報告書, Claude AI, 投資分析, Financial Information next, FIN",
  authors: [{ name: "Financial Information next" }],
  openGraph: {
    title: "FIN - Financial Information next",
    description: "XBRL財務データ分析プラットフォーム",
    type: "website",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
    title: "FIN - Financial Information next",
    description: "XBRL財務データ分析プラットフォーム",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // サーバーサイドでセッションを取得
  const cookieStore = await cookies()
  const supabase = await supabaseManager.getServerClient(cookieStore)

  let initialSession = null
  try {
    const { data: { session } } = await supabase.auth.getSession()
    initialSession = session
  } catch (error) {
    // 初回セッション取得エラーは無視（未認証の場合も正常）
  }

  return (
    <html lang="ja" suppressHydrationWarning={true}>
      <head>
        <link
          href="https://cdnjs.cloudflare.com/ajax/libs/remixicon/4.5.0/remixicon.min.css"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${inter.variable} ${pacifico.variable} antialiased`}
      >
        <SupabaseProvider>
          <LanguageProvider>
            {children}
            <SpeedInsights />
          </LanguageProvider>
        </SupabaseProvider>
      </body>
    </html>
  );
}