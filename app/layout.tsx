import type { Metadata } from "next";
import { Inter, Pacifico } from "next/font/google";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning={true}>
      <body
        className={`${inter.variable} ${pacifico.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}