'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import type { RIQActivity } from '@/lib/types';

interface ActivityTableProps {
  activities: RIQActivity[];
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
  const s = status.toLowerCase().replace(/[^a-z-]/g, '');
  if (s.includes('completed') || s === 'complete') return 'badge-completed';
  if (s.includes('progress') || s === 'inprogress' || s === 'in-progress') return 'badge-in-progress';
  if (s.includes('delayed')) return 'badge-delayed';
  if (s.includes('pending')) return 'badge-pending';
  return 'badge-not-started';
}

function getPriorityBadgeClass(priority: string): string {
  const p = priority.toLowerCase();
  if (p === 'high') return 'badge-priority-high';
  if (p === 'med' || p === 'medium') return 'badge-priority-med';
  return 'badge-priority-low';
}

function isOverdue(subEndDate: string, status: string): boolean {
  if (status.toLowerCase().includes('completed') || status.toLowerCase() === 'complete') return false;
  const endDate = new Date(subEndDate);
  return endDate < new Date();
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

const SCROLL_SPEED = 1; // pixels per interval tick
const PAUSE_DURATION = 1500; // 1.5 seconds pause at top/bottom

export default function ActivityTable({ activities }: ActivityTableProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const directionRef = useRef(1); // 1 = down, -1 = up
  const isPausedRef = useRef(false);

  // Build a mapping of unique activity names to color indices (same order as Gantt)
  const activityColorMap = useMemo(() => {
    const uniqueActivities: string[] = [];
    activities.forEach(a => {
      if (!uniqueActivities.includes(a.activityName)) {
        uniqueActivities.push(a.activityName);
      }
    });
    const map: Record<string, string> = {};
    uniqueActivities.forEach((name, index) => {
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
            <th>Sub Task</th>
            <th>Activity</th>
            <th>Owner</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Due Date</th>
          </tr>
        </thead>
        <tbody>
          {activities.map((a) => (
            <tr
              key={a.subTaskId}
              className={isOverdue(a.subEndDate, a.status) ? 'overdue' : ''}
            >
              <td className="text-primary">{a.subTaskName}</td>
              <td>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 3,
                      backgroundColor: activityColorMap[a.activityName],
                      flexShrink: 0,
                    }}
                  />
                  {a.activityName}
                </span>
              </td>
              <td>{a.owner}</td>
              <td>
                <span className={`badge-priority ${getPriorityBadgeClass(a.priority)}`}>
                  <span className="dot" />
                  {a.priority}
                </span>
              </td>
              <td>
                <span className={`badge-status ${getStatusBadgeClass(a.status)}`}>
                  {a.status}
                </span>
              </td>
              <td style={{ whiteSpace: 'nowrap' }}>{formatDate(a.subEndDate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
