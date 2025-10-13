'use client';

import { usePathname } from 'next/navigation';

const BASE_URL = 'https://fininfonext.com';

export default function Canonical() {
  const pathname = usePathname() || '/';

  // クエリやアンカーを落として正規化、/index も削除
  const canonicalUrl = `${BASE_URL}${pathname}`.replace(/\/index$/, '');

  return <link rel="canonical" href={canonicalUrl} />;
}
