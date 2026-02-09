'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function TabNav() {
  const pathname = usePathname();
  const isRIQ = pathname.startsWith('/rental-iq');
  const isAB = pathname.startsWith('/awardbook');

  return (
    <div className="tab-header">
      <nav className="tab-nav">
        <Link href="/rental-iq" className={`tab ${isRIQ ? 'active' : ''}`}>
          Rental IQ
        </Link>
        <Link href="/awardbook" className={`tab ${isAB ? 'active' : ''}`}>
          AwardBook
        </Link>
      </nav>
    </div>
  );
}
