'use client';

import type { ABOwner } from '@/lib/types';

interface Props {
  owners: ABOwner[];
}

const AVATAR_COLORS = [
  '#5b82b8', '#66b07d', '#d9b23a', '#9d82bf', '#d46b6b', '#5a9a6e',
];

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function TeamRoster({ owners }: Props) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
      {owners.map((owner, i) => (
        <div
          key={owner.name}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.5rem 0',
          }}
        >
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${AVATAR_COLORS[i % AVATAR_COLORS.length]}80, ${AVATAR_COLORS[i % AVATAR_COLORS.length]})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.72rem',
            fontWeight: 700,
            color: '#fff',
            flexShrink: 0,
          }}>
            {getInitials(owner.name)}
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 500 }}>
              {owner.name}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
              {owner.role}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
