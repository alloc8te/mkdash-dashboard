'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';

interface StatusDonutProps {
  statusCounts: Record<string, number>;
  totalLabel: string;
}

const STATUS_COLORS: Record<string, string> = {
  'Completed': '#66b07d',
  'In Progress': '#5b82b8',
  'In-Progress': '#5b82b8',
  'Delayed': '#d9b23a',
  'Not Started': '#4a4d5a',
  'Pending': '#c9a227',
};

const STATUS_ORDER = ['Completed', 'In Progress', 'In-Progress', 'Delayed', 'Pending', 'Not Started'];

interface TooltipData {
  x: number;
  y: number;
  status: string;
  count: number;
  percentage: number;
  color: string;
}

const AUTO_CYCLE_INTERVAL = 3000; // 3 seconds

function StatusTooltip({ data, isAutoCycling, cycleKey }: { data: TooltipData; isAutoCycling: boolean; cycleKey: number }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const animationName = isAutoCycling ? 'statusTooltipCycle' : 'tooltipFadeIn';
  const animationDuration = isAutoCycling ? '3s' : '0.2s';

  return createPortal(
    <div
      key={cycleKey}
      style={{
        position: 'fixed',
        left: data.x + 15,
        top: data.y,
        transform: 'translateY(-50%)',
        background: '#22252f',
        border: '1px solid #353848',
        borderRadius: '8px',
        padding: '0.5rem 0.7rem',
        minWidth: 90,
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        zIndex: 99999,
        pointerEvents: 'none',
        animation: `${animationName} ${animationDuration} ease-in-out forwards`,
      }}
    >
      <style>{`
        @keyframes tooltipFadeIn {
          from { opacity: 0; transform: translateY(-50%) translateX(-5px); }
          to { opacity: 1; transform: translateY(-50%) translateX(0); }
        }
        @keyframes statusTooltipCycle {
          0% { opacity: 0; transform: translateY(-50%) translateX(-5px); }
          10% { opacity: 1; transform: translateY(-50%) translateX(0); }
          85% { opacity: 1; transform: translateY(-50%) translateX(0); }
          100% { opacity: 0; transform: translateY(-50%) translateX(-5px); }
        }
      `}</style>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.35rem',
        marginBottom: '0.15rem',
      }}>
        <span style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: data.color,
          flexShrink: 0,
        }} />
        <span style={{
          fontSize: '0.55rem',
          color: '#e8eaf0',
          fontWeight: 600,
        }}>
          {data.status}
        </span>
      </div>
      <div style={{ fontSize: '0.5rem', color: '#9ea3b0' }}>
        <span style={{ color: data.color, fontWeight: 700 }}>{data.count}</span>
        <span style={{ margin: '0 0.2rem' }}>·</span>
        <span>{data.percentage}%</span>
      </div>
      {/* Arrow pointing left */}
      <div style={{
        position: 'absolute',
        top: '50%',
        right: '100%',
        transform: 'translateY(-50%)',
        width: 0,
        height: 0,
        borderTop: '5px solid transparent',
        borderBottom: '5px solid transparent',
        borderRight: '5px solid #22252f',
      }} />
    </div>,
    document.body
  );
}

export default function StatusDonut({ statusCounts, totalLabel }: StatusDonutProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [autoCycleIndex, setAutoCycleIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const segmentRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Normalize and sort statuses (memoized to prevent infinite re-renders)
  const entries = useMemo(() =>
    Object.entries(statusCounts)
      .filter(([, count]) => count > 0)
      .sort(([a], [b]) => {
        const aIdx = STATUS_ORDER.indexOf(a);
        const bIdx = STATUS_ORDER.indexOf(b);
        return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
      }),
    [statusCounts]
  );

  const total = useMemo(() => entries.reduce((sum, [, count]) => sum + count, 0), [entries]);

  // Auto-cycle through statuses
  useEffect(() => {
    if (entries.length === 0) return;

    const interval = setInterval(() => {
      if (!isHovering) {
        setAutoCycleIndex(prev => (prev + 1) % entries.length);
      }
    }, AUTO_CYCLE_INTERVAL);

    return () => clearInterval(interval);
  }, [entries.length, isHovering]);

  // Update tooltip when auto-cycling
  useEffect(() => {
    if (isHovering || entries.length === 0) return;

    const segmentEl = segmentRefs.current[autoCycleIndex];
    if (!segmentEl) return;

    const segmentRect = segmentEl.getBoundingClientRect();
    const [status, count] = entries[autoCycleIndex];

    setTooltip({
      x: segmentRect.right,
      y: segmentRect.top + segmentRect.height / 2,
      status,
      count,
      percentage: Math.round((count / total) * 100),
      color: STATUS_COLORS[status] || '#4a4d5a',
    });
  }, [autoCycleIndex, entries, isHovering, total]);

  return (
    <div
      ref={containerRef}
      className="status-vertical-container"
      style={{
        display: 'flex',
        flexDirection: 'row',
        flex: 1,
        minHeight: 0,
        width: '100%',
        gap: '0.75rem',
        padding: '0.25rem 0',
      }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Vertical stacked bar */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        width: '24px',
        borderRadius: '12px',
        overflow: 'hidden',
        background: 'rgba(255,255,255,0.05)',
        flexShrink: 0,
      }}>
        {entries.map(([status, count], index) => {
          const pct = (count / total) * 100;
          const isActive = !isHovering && index === autoCycleIndex;
          return (
            <div
              key={status}
              ref={el => { segmentRefs.current[index] = el; }}
              style={{
                height: `${pct}%`,
                minHeight: pct > 0 ? '8px' : '0',
                background: STATUS_COLORS[status] || '#4a4d5a',
                transition: 'filter 0.3s ease, box-shadow 0.3s ease',
                filter: isActive ? 'brightness(1.3)' : 'brightness(1)',
                boxShadow: isActive ? `0 0 12px ${STATUS_COLORS[status] || '#4a4d5a'}` : 'none',
                position: 'relative',
              }}
            >
              {/* Pulse indicator for active segment */}
              {isActive && (
                <div style={{
                  position: 'absolute',
                  right: '-4px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: STATUS_COLORS[status] || '#4a4d5a',
                  boxShadow: `0 0 8px ${STATUS_COLORS[status] || '#4a4d5a'}`,
                  animation: 'statusPulse 1s ease-in-out infinite',
                }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Total and label */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        flex: 1,
      }}>
        <div style={{
          fontSize: '1.8rem',
          fontWeight: 800,
          color: '#e8eaf0',
          lineHeight: 1,
        }}>
          {total}
        </div>
        <div style={{
          fontSize: '0.55rem',
          color: '#6b7082',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginTop: '0.15rem',
        }}>
          {totalLabel}
        </div>

        {/* Current status indicator */}
        {entries.length > 0 && (
          <div style={{
            marginTop: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            opacity: 0.8,
          }}>
            <span style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: STATUS_COLORS[entries[autoCycleIndex]?.[0]] || '#4a4d5a',
            }} />
            <span style={{
              fontSize: '0.5rem',
              color: '#9ea3b0',
            }}>
              {entries[autoCycleIndex]?.[0]}
            </span>
          </div>
        )}
      </div>

      {/* Pulse animation */}
      <style>{`
        @keyframes statusPulse {
          0%, 100% { opacity: 1; transform: translateY(-50%) scale(1); }
          50% { opacity: 0.6; transform: translateY(-50%) scale(1.2); }
        }
      `}</style>

      {/* Portal tooltip */}
      {tooltip && <StatusTooltip data={tooltip} isAutoCycling={!isHovering} cycleKey={autoCycleIndex} />}
    </div>
  );
}
