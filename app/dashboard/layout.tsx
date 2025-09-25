import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ダッシュボード - XBRL財務データAPI',
  description: 'XBRL財務データAPIダッシュボード',
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}