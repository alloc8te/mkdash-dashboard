'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend, TimeScale);

interface GanttItem {
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  percentComplete: number;
}

interface GanttChartProps {
  items: GanttItem[];
}

// Unique color per milestone (10 distinct colors)
const MILESTONE_COLORS = [
  { bg: '#5b82b8', border: '#7ba3d4' }, // Blue
  { bg: '#d9b23a', border: '#e5c44e' }, // Gold
  { bg: '#9d82bf', border: '#b39cd8' }, // Purple
  { bg: '#5a9a6e', border: '#74b888' }, // Teal
  { bg: '#d46b6b', border: '#e08888' }, // Red
  { bg: '#e0976e', border: '#eaad8a' }, // Orange
  { bg: '#66b07d', border: '#7bc994' }, // Green
  { bg: '#6bb8c9', border: '#89ccd9' }, // Cyan
  { bg: '#c27db5', border: '#d49aca' }, // Pink
  { bg: '#8e8e8e', border: '#a8a8a8' }, // Grey
];

interface TooltipData {
  x: number;
  y: number;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  progress: number;
  color: string;
}

const AUTO_CYCLE_INTERVAL = 4000; // 4 seconds

function GanttTooltip({ data, isAutoCycling, cycleKey }: { data: TooltipData; isAutoCycling: boolean; cycleKey: number }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const animationName = isAutoCycling ? 'ganttTooltipCycle' : 'tooltipFadeIn';
  const animationDuration = isAutoCycling ? '4s' : '0.2s';

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
        minWidth: 140,
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
        @keyframes ganttTooltipCycle {
          0% { opacity: 0; transform: translate(-50%, -90%); }
          8% { opacity: 1; transform: translate(-50%, -100%); }
          85% { opacity: 1; transform: translate(-50%, -100%); }
          100% { opacity: 0; transform: translate(-50%, -90%); }
        }
      `}</style>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        marginBottom: '0.3rem',
      }}>
        <span style={{
          width: 8,
          height: 8,
          borderRadius: 3,
          background: data.color,
        }} />
        <span style={{
          fontSize: '0.65rem',
          color: '#e8eaf0',
          fontWeight: 600,
        }}>
          {data.name}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', fontSize: '0.55rem' }}>
        <div style={{ color: '#9ea3b0' }}>
          {data.startDate} → {data.endDate}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <span style={{ color: '#6b7082' }}>Status:</span>
          <span style={{ color: '#e8eaf0' }}>{data.status}</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <span style={{ color: '#6b7082' }}>Progress:</span>
          <span style={{ color: data.color, fontWeight: 600 }}>{data.progress}%</span>
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

export default function GanttChart({ items }: GanttChartProps) {
  // Memoize today's date to prevent infinite re-renders
  const today = useMemo(() => new Date(), []);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [autoCycleIndex, setAutoCycleIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fixed 12-month date range (January to December of current year)
  const currentYear = today.getFullYear();
  const minDate = new Date(currentYear, 0, 1); // January 1st
  const maxDate = new Date(currentYear, 11, 31); // December 31st

  // Generate monthly tick values (1st of each month)
  const monthlyTicks: number[] = [];
  for (let month = 0; month < 12; month++) {
    monthlyTicks.push(new Date(currentYear, month, 1).getTime());
  }

  const labels = items.map(item => item.name);

  // Auto-cycle through items
  useEffect(() => {
    if (items.length === 0) return;

    const interval = setInterval(() => {
      if (!isHovering) {
        setAutoCycleIndex(prev => (prev + 1) % items.length);
      }
    }, AUTO_CYCLE_INTERVAL);

    return () => clearInterval(interval);
  }, [items.length, isHovering]);

  // Update tooltip when auto-cycling
  useEffect(() => {
    if (isHovering || items.length === 0 || !chartRef.current) return;

    const chart = chartRef.current;
    const meta = chart.getDatasetMeta(0);
    if (!meta || !meta.data[autoCycleIndex]) return;

    const bar = meta.data[autoCycleIndex];
    const item = items[autoCycleIndex];

    if (containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      // Position tooltip at center of bar
      const x = containerRect.left + (bar.x + bar.base) / 2;
      const y = containerRect.top + bar.y;

      const startDate = new Date(item.startDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
      const endDate = new Date(item.endDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });

      setTooltip({
        x,
        y,
        name: item.name,
        startDate,
        endDate,
        status: item.status,
        progress: Math.round(item.percentComplete * 100),
        color: MILESTONE_COLORS[autoCycleIndex % MILESTONE_COLORS.length].bg,
      });
    }
  }, [autoCycleIndex, items, isHovering]);

  const data = {
    labels,
    datasets: [
      {
        label: 'Timeline',
        data: items.map(item => {
          const start = new Date(item.startDate).getTime();
          const end = new Date(item.endDate).getTime();
          return [start, end];
        }),
        backgroundColor: items.map((_, i) => MILESTONE_COLORS[i % MILESTONE_COLORS.length].bg),
        borderColor: items.map((_, i) => MILESTONE_COLORS[i % MILESTONE_COLORS.length].border),
        borderWidth: 1,
        borderRadius: 6,
        borderSkipped: false,
        barPercentage: 0.65,
      },
    ],
  };

  const options = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 28, // room for the "Today" label above the chart area
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false }, // Using custom portal tooltip
    },
    scales: {
      x: {
        type: 'linear' as const,
        min: minDate.getTime(),
        max: maxDate.getTime(),
        grid: {
          color: 'rgba(42, 45, 58, 0.5)',
          drawTicks: false,
        },
        ticks: {
          color: '#6b7082',
          font: { size: 10, family: 'Inter' },
          callback: (value: any) => {
            const d = new Date(value);
            return d.toLocaleDateString('en-AU', { month: 'short' });
          },
          autoSkip: false,
          source: 'data' as const,
        },
        afterBuildTicks: (axis: any) => {
          axis.ticks = monthlyTicks.map(t => ({ value: t }));
        },
        border: { display: false },
      },
      y: {
        grid: { display: false },
        ticks: {
          // Match Activity Tracker Sub Task column: text-primary color, weight 500
          color: '#e8eaf0',
          font: { size: 10, family: 'Inter', weight: 500 as const },
        },
        border: { display: false },
      },
    },
  };

  // Track the "today" pill position from the chart
  const chartRef = useRef<any>(null);
  const [pillPos, setPillPos] = useState<{ x: number; topY: number; bottomY: number } | null>(null);

  const updatePillPos = useCallback(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const xScale = chart.scales?.x;
    const chartArea = chart.chartArea;
    if (!xScale || !chartArea) return;
    const todayX = xScale.getPixelForValue(today.getTime());
    if (todayX >= xScale.left && todayX <= xScale.right) {
      setPillPos({ x: todayX, topY: chartArea.top, bottomY: chartArea.bottom });
    }
  }, [today]);

  useEffect(() => {
    // Update position after chart renders and on resize
    const timer = setTimeout(updatePillPos, 100);
    window.addEventListener('resize', updatePillPos);
    return () => { clearTimeout(timer); window.removeEventListener('resize', updatePillPos); };
  }, [updatePillPos, items]);

  // Plugin: only draw the dashed line (pill is an HTML overlay)
  const todayLinePlugin = {
    id: 'todayLine',
    afterDraw: (chart: any) => {
      const { ctx, scales, chartArea } = chart;
      const xScale = scales.x;
      const todayX = xScale.getPixelForValue(today.getTime());

      if (todayX >= xScale.left && todayX <= xScale.right) {
        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = '#d46b6b';
        ctx.lineWidth = 1.5;
        ctx.moveTo(todayX, chartArea.top - 14);
        ctx.lineTo(todayX, chartArea.bottom);
        ctx.stroke();
        ctx.restore();
      }
    },
  };

  const todayLabel = `Today — ${today.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}`;

  return (
    <div
      ref={containerRef}
      className="gantt-wrapper"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="chart-container" style={{ height: Math.max(items.length * 40, 220), position: 'relative' }}>
        <Bar ref={chartRef} data={data} options={options} plugins={[todayLinePlugin]} />
        {/* Pulsing HTML pill overlay */}
        {pillPos && (
          <div
            style={{
              position: 'absolute',
              left: pillPos.x,
              top: pillPos.topY - 28,
              transform: 'translateX(-50%)',
              pointerEvents: 'none',
              zIndex: 10,
              animation: 'todayPulse 3s ease-in-out infinite',
            }}
          >
            <div style={{
              padding: '3px 8px',
              borderRadius: 6,
              background: 'rgba(212, 107, 107, 0.15)',
              border: '1px solid rgba(212, 107, 107, 0.4)',
              color: '#d46b6b',
              fontSize: '10px',
              fontWeight: 600,
              fontFamily: 'Inter, sans-serif',
              whiteSpace: 'nowrap',
              boxShadow: '0 0 8px rgba(212, 107, 107, 0.1)',
            }}>
              {todayLabel}
            </div>
          </div>
        )}
      </div>
      {/* Portal tooltip */}
      {tooltip && <GanttTooltip data={tooltip} isAutoCycling={!isHovering} cycleKey={autoCycleIndex} />}
    </div>
  );
}
