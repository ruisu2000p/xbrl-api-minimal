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
  title: "FIN - XBRL Financial Data Analysis Platform | Japanese Stock Market API",
  description: "Access Japanese financial data via XBRL API. Claude AI-powered analysis for professional investment decisions. 3,800+ listed companies.",
  keywords: "XBRL API, Financial data API, Japanese stocks, Claude MCP, Investment analysis, Securities report, EDINET API, Japanese stock market data",
  authors: [{ name: "Financial Information next" }],
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || '',
  },
  openGraph: {
    title: "FIN - XBRL Financial Data Analysis Platform",
    description: "Access Japanese financial data via XBRL API. Claude AI-powered analysis for professional investment decisions.",
    type: "website",
    locale: "en_US",
    url: "https://fininfonext.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "FIN - XBRL Financial Data Analysis Platform",
    description: "Access Japanese financial data via XBRL API. Claude AI-powered analysis.",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    languages: {
      'en': 'https://fininfonext.com',
      'ja': 'https://fininfonext.com',
    },
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