'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import type { ABActivity } from '@/lib/types';

interface ABActivityTableProps {
  activities: ABActivity[];
}

// Match Gantt chart colors exactly
const MILESTONE_COLORS = [
  '#5b82b8', // Blue
  '#d9b23a', // Gold
  '#9d82bf', // Purple
  '#5a9a6e', // Teal
  '#d46b6b', // Red
  '#e0976e', // Orange
  '#66b07d', // Green
  '#6bb8c9', // Cyan
  '#c27db5', // Pink
  '#8e8e8e', // Grey
];

function getStatusBadgeClass(status: string): string {
  const s = status.toLowerCase();
  if (s.includes('completed')) return 'badge-completed';
  if (s.includes('progress')) return 'badge-in-progress';
  if (s.includes('delayed')) return 'badge-delayed';
  return 'badge-not-started';
}

function getRagClass(rag: string): string {
  const r = rag.toLowerCase();
  if (r === 'red') return 'badge-rag-red';
  if (r === 'amber' || r === 'yellow') return 'badge-rag-amber';
  if (r === 'green') return 'badge-rag-green';
  return 'badge-rag-grey';
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

const SCROLL_SPEED = 1; // pixels per interval tick
const PAUSE_DURATION = 1500; // 1.5 seconds pause at top/bottom

export default function ABActivityTable({ activities }: ABActivityTableProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const directionRef = useRef(1); // 1 = down, -1 = up
  const isPausedRef = useRef(false);

  // Build a mapping of unique milestone names to color indices (same order as Gantt)
  const milestoneColorMap = useMemo(() => {
    const uniqueMilestones: string[] = [];
    activities.forEach(a => {
      if (!uniqueMilestones.includes(a.milestoneId)) {
        uniqueMilestones.push(a.milestoneId);
      }
    });
    const map: Record<string, string> = {};
    uniqueMilestones.forEach((name, index) => {
      map[name] = MILESTONE_COLORS[index % MILESTONE_COLORS.length];
    });
    return map;
  }, [activities]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const scrollInterval = setInterval(() => {
      if (isHovering || isPausedRef.current) return;

      const maxScroll = wrapper.scrollHeight - wrapper.clientHeight;
      if (maxScroll <= 0) return;

      // Apply scroll in current direction
      wrapper.scrollTop += SCROLL_SPEED * directionRef.current;

      // Check actual position after scroll and pause at boundaries
      if (wrapper.scrollTop >= maxScroll - 1 && directionRef.current === 1) {
        isPausedRef.current = true;
        setTimeout(() => {
          directionRef.current = -1;
          isPausedRef.current = false;
        }, PAUSE_DURATION);
      } else if (wrapper.scrollTop <= 1 && directionRef.current === -1) {
        isPausedRef.current = true;
        setTimeout(() => {
          directionRef.current = 1;
          isPausedRef.current = false;
        }, PAUSE_DURATION);
      }
    }, 50); // ~20fps, smoother scroll

    return () => clearInterval(scrollInterval);
  }, [isHovering]);

  return (
    <div
      ref={wrapperRef}
      className="data-table-wrapper"
      style={{ height: '100%', maxHeight: '100%', overflowY: 'auto', flex: 1 }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <table className="data-table">
        <thead>
          <tr>
            <th>Task</th>
            <th>Milestone</th>
            <th>Workstream</th>
            <th>Owner</th>
            <th>RAG</th>
            <th>Status</th>
            <th>Due Date</th>
          </tr>
        </thead>
        <tbody>
          {activities.map(a => (
            <tr key={a.taskId}>
              <td className="text-primary" style={{ fontWeight: 500 }}>{a.taskName}</td>
              <td>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 3,
                      backgroundColor: milestoneColorMap[a.milestoneId],
                      flexShrink: 0,
                    }}
                  />
                  {a.milestoneId}
                </span>
              </td>
              <td>{a.workstream}</td>
              <td>{a.owner}</td>
              <td>
                <span className={`badge-rag ${getRagClass(a.rag)}`} />
              </td>
              <td>
                <span className={`badge-status ${getStatusBadgeClass(a.status)}`}>
                  {a.status}
                </span>
              </td>
              <td style={{ whiteSpace: 'nowrap' }}>{formatDate(a.dueDate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
