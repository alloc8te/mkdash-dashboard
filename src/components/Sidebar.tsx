'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<string>('');

  useEffect(() => {
    const update = () => {
      setLastRefresh(new Date().toLocaleTimeString('en-AU', {
        hour: '2-digit',
        minute: '2-digit',
      }));
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, []);

  const isActive = (path: string) => pathname === path;

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-top">
        <div className="sidebar-logo">
          <h1>{collapsed ? 'K' : 'KNG Tech'}</h1>
          {!collapsed && <span>Executive Dashboard</span>}
        </div>
        <button
          className="sidebar-toggle"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? '\u2630' : '\u2715'}
        </button>
      </div>

      <nav className="sidebar-nav">
        {/* Rental IQ Section */}
        <div className="sidebar-section">
          {!collapsed && <div className="sidebar-section-label">Rental IQ</div>}
          <Link
            href="/rental-iq"
            className={`sidebar-link ${isActive('/rental-iq') ? 'active' : ''}`}
            title="Rental IQ Dashboard"
          >
            <span className="icon">&#9635;</span>
            {!collapsed && <span className="link-text">Dashboard</span>}
          </Link>
          <Link
            href="/rental-iq/insights"
            className={`sidebar-link sidebar-sub-link ${isActive('/rental-iq/insights') ? 'active' : ''}`}
            title="Rental IQ Insights"
          >
            <span className="icon">&#9672;</span>
            {!collapsed && <span className="link-text">Insights</span>}
          </Link>
        </div>

        {/* AwardBook Section */}
        <div className="sidebar-section">
          {!collapsed && <div className="sidebar-section-label">AwardBook</div>}
          <Link
            href="/awardbook"
            className={`sidebar-link ${isActive('/awardbook') ? 'active' : ''}`}
            title="AwardBook Dashboard"
          >
            <span className="icon">&#9635;</span>
            {!collapsed && <span className="link-text">Dashboard</span>}
          </Link>
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-refresh-info">
          <span className="refresh-dot"></span>
          {!collapsed && <span>Live &middot; Updated {lastRefresh}</span>}
        </div>
      </div>
    </aside>
  );
}
