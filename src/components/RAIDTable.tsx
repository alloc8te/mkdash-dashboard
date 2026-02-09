'use client';

import type { ABRaid } from '@/lib/types';

interface Props {
  items: ABRaid[];
}

function getRagClass(rag: string): string {
  const r = rag.toLowerCase();
  if (r === 'red') return 'badge-rag-red';
  if (r === 'amber') return 'badge-rag-amber';
  return 'badge-rag-green';
}

function getTypeColor(type: string): string {
  const t = type.toLowerCase();
  if (t === 'risk') return '#d46b6b';
  if (t === 'assumption') return '#66b07d';
  if (t === 'dependency') return '#d9b23a';
  if (t === 'issue') return '#5b82b8';
  return '#9ea3b0';
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function RAIDTable({ items }: Props) {
  return (
    <div className="data-table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Type</th>
            <th>Description</th>
            <th>RAG</th>
            <th>Impact</th>
            <th>Owner</th>
            <th>Mitigation</th>
            <th>Target</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.raidId}>
              <td style={{ fontWeight: 600, color: getTypeColor(item.raidType) }}>
                {item.raidId}
              </td>
              <td>
                <span style={{
                  display: 'inline-block',
                  padding: '0.15rem 0.5rem',
                  borderRadius: 12,
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  background: `${getTypeColor(item.raidType)}20`,
                  color: getTypeColor(item.raidType),
                }}>
                  {item.raidType}
                </span>
              </td>
              <td className="text-primary" style={{ maxWidth: 200 }}>{item.description}</td>
              <td><span className={`badge-rag ${getRagClass(item.rag)}`} /></td>
              <td>{item.impact}/5</td>
              <td>{item.owner}</td>
              <td>{item.mitigation}</td>
              <td style={{ whiteSpace: 'nowrap' }}>{formatDate(item.targetDate)}</td>
              <td>
                <span className={`badge-status ${
                  item.status.toLowerCase() === 'open' ? 'badge-in-progress' : 'badge-completed'
                }`}>
                  {item.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
