export const metadata = {
  title: 'XBRL Financial Data API',
  description: 'Access Japanese corporate financial data',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}