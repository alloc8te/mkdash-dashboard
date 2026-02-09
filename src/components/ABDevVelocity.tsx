'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

interface ABDevVelocityProps {
  data: {
    date: string;
    open: number;
    completed: number;
    closedPullRequests: number;
    notPlanned: number;
    duplicate: number;
  }[];
}

interface TooltipData {
  x: number;
  y: number;
  date: string;
  open: number;
  completed: number;
  closedPRs: number;
}

function DevTooltip({ data, isAutoCycling, cycleKey }: { data: TooltipData; isAutoCycling: boolean; cycleKey: number }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Use full cycle animation for auto-cycling, simple fade-in for hover
  const animationName = isAutoCycling ? 'abDevTooltipCycle' : 'tooltipFadeIn';
  const animationDuration = isAutoCycling ? '3s' : '0.2s';

  return createPortal(
    <div
      key={cycleKey}
      style={{
        position: 'fixed',
        left: data.x,
        top: data.y - 10,
        transform: 'translate(-50%, -100%)',
        background: '#22252f',
        border: '1px solid #353848',
        borderRadius: '8px',
        padding: '0.5rem 0.7rem',
        minWidth: 100,
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        zIndex: 99999,
        pointerEvents: 'none',
        animation: `${animationName} ${animationDuration} ease-in-out forwards`,
      }}
    >
      <style>{`
        @keyframes tooltipFadeIn {
          from { opacity: 0; transform: translate(-50%, -90%); }
          to { opacity: 1; transform: translate(-50%, -100%); }
        }
        @keyframes abDevTooltipCycle {
          0% { opacity: 0; transform: translate(-50%, -90%); }
          10% { opacity: 1; transform: translate(-50%, -100%); }
          85% { opacity: 1; transform: translate(-50%, -100%); }
          100% { opacity: 0; transform: translate(-50%, -90%); }
        }
      `}</style>
      <div style={{
        fontSize: '0.6rem',
        color: '#e8eaf0',
        fontWeight: 600,
        marginBottom: '0.3rem',
      }}>
        {data.date}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', fontSize: '0.55rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#d9b23a' }} />
          <span style={{ color: '#9ea3b0' }}>Open:</span>
          <span style={{ color: '#d9b23a', fontWeight: 600 }}>{data.open}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#66b07d' }} />
          <span style={{ color: '#9ea3b0' }}>Done:</span>
          <span style={{ color: '#66b07d', fontWeight: 600 }}>{data.completed}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#5b82b8' }} />
          <span style={{ color: '#9ea3b0' }}>PRs:</span>
          <span style={{ color: '#5b82b8', fontWeight: 600 }}>{data.closedPRs}</span>
        </div>
      </div>
      <div style={{
        position: 'absolute',
        top: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 0,
        height: 0,
        borderLeft: '6px solid transparent',
        borderRight: '6px solid transparent',
        borderTop: '6px solid #22252f',
      }} />
    </div>,
    document.body
  );
}

const AUTO_CYCLE_INTERVAL = 3000; // 3 seconds

export default function ABDevVelocity({ data: devTasks }: ABDevVelocityProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [autoCycleIndex, setAutoCycleIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const chartRef = useRef<ChartJS<'line'> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const labels = devTasks.map(d => {
    const date = new Date(d.date);
    return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
  });

  // Auto-cycle through data points
  useEffect(() => {
    if (devTasks.length === 0) return;

    const interval = setInterval(() => {
      if (!isHovering) {
        setAutoCycleIndex(prev => (prev + 1) % devTasks.length);
      }
    }, AUTO_CYCLE_INTERVAL);

    return () => clearInterval(interval);
  }, [devTasks.length, isHovering]);

  // Update tooltip position when auto-cycling
  useEffect(() => {
    if (isHovering || devTasks.length === 0 || !chartRef.current) return;

    const chart = chartRef.current;
    const meta = chart.getDatasetMeta(0);
    if (!meta || !meta.data[autoCycleIndex]) return;

    const point = meta.data[autoCycleIndex];

    if (containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const x = containerRect.left + point.x;
      const y = containerRect.top + point.y;

      // Compute label here instead of using labels array (avoids dependency issues)
      const dateLabel = new Date(devTasks[autoCycleIndex].date)
        .toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });

      setTooltip({
        x,
        y,
        date: dateLabel,
        open: devTasks[autoCycleIndex].open,
        completed: devTasks[autoCycleIndex].completed,
        closedPRs: devTasks[autoCycleIndex].closedPullRequests,
      });
    }
  }, [autoCycleIndex, devTasks, isHovering]);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Open',
        data: devTasks.map(d => d.open),
        borderColor: '#d9b23a',
        backgroundColor: 'rgba(217, 178, 58, 0.08)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: devTasks.map((_, i) =>
          !isHovering && i === autoCycleIndex ? '#fff' : '#d9b23a'
        ),
        pointBorderColor: devTasks.map((_, i) =>
          !isHovering && i === autoCycleIndex ? '#d9b23a' : '#1a1d27'
        ),
        pointBorderWidth: devTasks.map((_, i) =>
          !isHovering && i === autoCycleIndex ? 3 : 2
        ),
        pointRadius: devTasks.map((_, i) =>
          !isHovering && i === autoCycleIndex ? 6 : 3
        ),
        pointHoverRadius: 6,
        borderWidth: 2,
      },
      {
        label: 'Completed',
        data: devTasks.map(d => d.completed),
        borderColor: '#66b07d',
        backgroundColor: 'rgba(102, 176, 125, 0.08)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: devTasks.map((_, i) =>
          !isHovering && i === autoCycleIndex ? '#fff' : '#66b07d'
        ),
        pointBorderColor: devTasks.map((_, i) =>
          !isHovering && i === autoCycleIndex ? '#66b07d' : '#1a1d27'
        ),
        pointBorderWidth: devTasks.map((_, i) =>
          !isHovering && i === autoCycleIndex ? 3 : 2
        ),
        pointRadius: devTasks.map((_, i) =>
          !isHovering && i === autoCycleIndex ? 6 : 3
        ),
        pointHoverRadius: 6,
        borderWidth: 2,
      },
      {
        label: 'Closed PRs',
        data: devTasks.map(d => d.closedPullRequests),
        borderColor: '#5b82b8',
        backgroundColor: 'transparent',
        fill: false,
        tension: 0.4,
        pointBackgroundColor: devTasks.map((_, i) =>
          !isHovering && i === autoCycleIndex ? '#fff' : '#5b82b8'
        ),
        pointBorderColor: devTasks.map((_, i) =>
          !isHovering && i === autoCycleIndex ? '#5b82b8' : '#1a1d27'
        ),
        pointBorderWidth: 2,
        pointRadius: devTasks.map((_, i) =>
          !isHovering && i === autoCycleIndex ? 5 : 2
        ),
        pointHoverRadius: 5,
        borderWidth: 1.5,
        borderDash: [4, 4],
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    onHover: (event: any) => {
      if (event.type === 'mousemove') {
        setIsHovering(true);
      }
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: false,
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(42, 45, 58, 0.5)', drawTicks: false },
        ticks: {
          color: '#6b7082',
          font: { size: 9, family: 'Inter' },
          maxRotation: 0,
        },
        border: { display: false },
      },
      y: {
        grid: { color: 'rgba(42, 45, 58, 0.3)', drawTicks: false },
        ticks: {
          color: '#6b7082',
          font: { size: 9, family: 'Inter' },
        },
        border: { display: false },
        beginAtZero: true,
      },
    },
  };

  return (
    <div
      ref={containerRef}
      className="chart-container"
      style={{ height: '100%', minHeight: 0 }}
      onMouseLeave={() => setIsHovering(false)}
    >
      <Line
        ref={chartRef}
        data={chartData}
        options={options}
      />
      {tooltip && <DevTooltip data={tooltip} isAutoCycling={!isHovering} cycleKey={autoCycleIndex} />}
    </div>
  );
}
