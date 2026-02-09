'use client';

import type { ABDecision } from '@/lib/types';

interface Props {
  decisions: ABDecision[];
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function DecisionTracker({ decisions }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {decisions.map(d => (
        <div
          key={d.decisionId}
          style={{
            background: 'var(--bg-tertiary)',
            borderRadius: 12,
            padding: '0.875rem 1rem',
            border: '1px solid var(--border-default)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--blue-light)', letterSpacing: '0.5px' }}>
              {d.decisionId}
            </span>
            <span className={`badge-status ${
              d.status.toLowerCase() === 'open' ? 'badge-in-progress' :
              d.status.toLowerCase() === 'pending' ? 'badge-pending' :
              'badge-completed'
            }`}>
              {d.status}
            </span>
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 500, marginBottom: '0.35rem' }}>
            {d.decisionRequired}
          </div>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            <span>{d.owner}</span>
            <span>Due: {formatDate(d.requiredBy)}</span>
          </div>
          {d.impactIfDelayed && (
            <div style={{ fontSize: '0.7rem', color: 'var(--red)', marginTop: '0.25rem', opacity: 0.8 }}>
              Impact if delayed: {d.impactIfDelayed}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
