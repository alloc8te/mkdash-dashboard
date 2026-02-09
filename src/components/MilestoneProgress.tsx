'use client';

import { useEffect, useRef, useState } from 'react';
import type { RIQMilestoneCompletion } from '@/lib/types';

interface MilestoneProgressProps {
  milestones: RIQMilestoneCompletion[];
  cumulativeCompletion: number;
}

function RadialGauge({ value, size = 90 }: { value: number; size?: number }) {
  const pct = Math.round(value * 100);
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - value);

  return (
    <div className="radial-gauge" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4a6fa5" />
            <stop offset="100%" stopColor="#7ba3d4" />
          </linearGradient>
        </defs>
      </svg>
      <div className="gauge-text">
        <span className="gauge-value" style={{ fontSize: '1.1rem' }}>{pct}%</span>
        <span className="gauge-label" style={{ fontSize: '0.5rem' }}>Overall</span>
      </div>
    </div>
  );
}

// Unique colors for each milestone (matches Gantt chart colors)
const MILESTONE_COLORS = [
  'linear-gradient(90deg, #4a6fa5, #7ba3d4)', // Blue
  'linear-gradient(90deg, #a98207, #d9b23a)', // Gold
  'linear-gradient(90deg, #7a5a9d, #b39cd8)', // Purple
  'linear-gradient(90deg, #3d7a5a, #74b888)', // Teal
  'linear-gradient(90deg, #a94a4a, #e08888)', // Red
  'linear-gradient(90deg, #b8724a, #eaad8a)', // Orange
  'linear-gradient(90deg, #3d7a4e, #7bc994)', // Green
  'linear-gradient(90deg, #4a8a9a, #89ccd9)', // Cyan
  'linear-gradient(90deg, #9a5a8a, #d49aca)', // Pink
  'linear-gradient(90deg, #6a6a6a, #a8a8a8)', // Grey
];

function getBarColor(index: number): string {
  return MILESTONE_COLORS[index % MILESTONE_COLORS.length];
}

const SCROLL_SPEED = 1; // pixels per interval tick
const PAUSE_DURATION = 1500; // 1.5 seconds pause at top/bottom

export default function MilestoneProgress({ milestones, cumulativeCompletion }: MilestoneProgressProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const directionRef = useRef(1); // 1 = down, -1 = up
  const isPausedRef = useRef(false);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const scrollInterval = setInterval(() => {
      if (isHovering || isPausedRef.current) return;

      const maxScroll = list.scrollHeight - list.clientHeight;
      if (maxScroll <= 0) return;

      // Apply scroll in current direction
      list.scrollTop += SCROLL_SPEED * directionRef.current;

      // Check actual position after scroll and pause at boundaries
      if (list.scrollTop >= maxScroll - 1 && directionRef.current === 1) {
        isPausedRef.current = true;
        setTimeout(() => {
          directionRef.current = -1;
          isPausedRef.current = false;
        }, PAUSE_DURATION);
      } else if (list.scrollTop <= 1 && directionRef.current === -1) {
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
    <div className="milestone-progress-wrapper">
      <div className="radial-gauge-row" style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
        <RadialGauge value={cumulativeCompletion} />
      </div>
      <div
        ref={listRef}
        className="milestone-list"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.2rem',
          flex: 1,
          overflowY: 'auto',
          minHeight: 0,
        }}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {milestones.map((m, index) => (
          <div className="milestone-item" key={m.activityId} style={{ gap: '0.4rem' }}>
            <div
              className="milestone-label"
              title={m.activityName}
              style={{
                fontSize: '0.6rem',
                fontWeight: 500,
                color: '#e8eaf0',
              }}
            >
              {m.activityName}
            </div>
            <div className="milestone-bar">
              <div className="progress-bar-bg">
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${Math.round(m.taskCompletionPct * 100)}%`,
                    background: getBarColor(index),
                  }}
                />
              </div>
            </div>
            <div className="milestone-pct" style={{ fontSize: '0.55rem' }}>
              {Math.round(m.taskCompletionPct * 100)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
