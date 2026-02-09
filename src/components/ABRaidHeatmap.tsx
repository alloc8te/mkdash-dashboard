'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { ABRaid } from '@/lib/types';

interface ABRaidHeatmapProps {
  raids: ABRaid[];
}

function getRaidLevel(likelihood: number, impact: number): 'low' | 'medium' | 'high' | 'critical' {
  const score = likelihood * impact;
  if (score >= 16) return 'critical';
  if (score >= 9) return 'high';
  if (score >= 4) return 'medium';
  return 'low';
}

function getCellBg(likelihoodLevel: number, impactLevel: number): string {
  const score = likelihoodLevel * impactLevel;
  if (score >= 6) return 'rgba(212, 107, 107, 0.15)';
  if (score >= 4) return 'rgba(217, 178, 58, 0.12)';
  if (score >= 2) return 'rgba(91, 130, 184, 0.08)';
  return 'rgba(102, 176, 125, 0.06)';
}

// Map 1-5 scale to 1-3 grid levels
function toGridLevel(value: number): number {
  if (value >= 4) return 3; // High
  if (value >= 2) return 2; // Med
  return 1; // Low
}

const colors: Record<string, string> = {
  critical: '#d46b6b',
  high: '#d9b23a',
  medium: '#5b82b8',
  low: '#66b07d',
};

interface TooltipData {
  raid: ABRaid;
  x: number;
  y: number;
}

function Tooltip({ data, isAutoCycling }: { data: TooltipData; isAutoCycling: boolean }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const level = getRaidLevel(data.raid.likelihood, data.raid.impact);

  // Use full cycle animation for auto-cycling, simple fade-in for hover
  const animationName = isAutoCycling ? 'raidTooltipCycle' : 'tooltipFadeIn';
  const animationDuration = isAutoCycling ? '4s' : '0.2s';

  return createPortal(
    <div
      key={data.raid.raidId}
      style={{
        position: 'fixed',
        left: data.x,
        top: data.y - 10,
        transform: 'translate(-50%, -100%)',
        background: '#22252f',
        border: '1px solid #353848',
        borderRadius: '8px',
        padding: '0.5rem 0.7rem',
        width: 200,
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
        @keyframes raidTooltipCycle {
          0% { opacity: 0; transform: translate(-50%, -90%); }
          8% { opacity: 1; transform: translate(-50%, -100%); }
          85% { opacity: 1; transform: translate(-50%, -100%); }
          100% { opacity: 0; transform: translate(-50%, -90%); }
        }
      `}</style>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.35rem',
        marginBottom: '0.2rem',
      }}>
        <span style={{
          fontSize: '0.5rem',
          color: colors[level],
          fontWeight: 600,
          textTransform: 'uppercase',
        }}>
          {data.raid.raidType}
        </span>
        <span style={{
          fontSize: '0.5rem',
          color: '#6b7082',
        }}>
          {data.raid.raidId}
        </span>
      </div>
      <div style={{
        fontSize: '0.6rem',
        color: '#e8eaf0',
        fontWeight: 500,
        marginBottom: '0.25rem',
        lineHeight: 1.3,
      }}>
        {data.raid.description.length > 60 ? data.raid.description.slice(0, 60) + '...' : data.raid.description}
      </div>
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        fontSize: '0.5rem',
      }}>
        <span style={{ color: colors[level] }}>
          L:{data.raid.likelihood} / I:{data.raid.impact}
        </span>
        <span style={{ color: '#6b7082' }}>
          {data.raid.status}
        </span>
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

const AUTO_CYCLE_INTERVAL = 4000; // 4 seconds per tooltip

export default function ABRaidHeatmap({ raids }: ABRaidHeatmapProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [autoCycleIndex, setAutoCycleIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const dotRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const likelihoodLabels = ['High', 'Med', 'Low'];
  const impactLabels = ['Low', 'Med', 'High'];

  // Auto-cycle through raids
  useEffect(() => {
    if (raids.length === 0) return;

    const interval = setInterval(() => {
      if (!isHovering) {
        setAutoCycleIndex(prev => (prev + 1) % raids.length);
      }
    }, AUTO_CYCLE_INTERVAL);

    return () => clearInterval(interval);
  }, [raids.length, isHovering]);

  // Update tooltip position when auto-cycling
  useEffect(() => {
    if (isHovering || raids.length === 0) return;

    const currentRaid = raids[autoCycleIndex];
    const dotElement = dotRefs.current.get(currentRaid.raidId);

    if (dotElement) {
      const rect = dotElement.getBoundingClientRect();
      setTooltip({
        raid: currentRaid,
        x: rect.left + rect.width / 2,
        y: rect.top,
      });
    }
  }, [autoCycleIndex, raids, isHovering]);

  function getRaidsInCell(likelihoodLevel: number, impactLevel: number) {
    return raids.filter(r => {
      const rl = toGridLevel(r.likelihood);
      const ri = toGridLevel(r.impact);
      return rl === likelihoodLevel && ri === impactLevel;
    });
  }

  const handleMouseEnter = (e: React.MouseEvent, raid: ABRaid) => {
    setIsHovering(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      raid,
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
  };

  const currentAutoRaid = !isHovering && raids.length > 0 ? raids[autoCycleIndex] : null;

  return (
    <div className="risk-content">
      <style>{`
        .raid-dot-wrapper {
          position: relative;
          cursor: pointer;
        }
        .raid-dot-circle {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .raid-dot-wrapper:hover .raid-dot-circle,
        .raid-dot-circle.active {
          transform: scale(1.4);
        }
      `}</style>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'auto repeat(3, 1fr)',
        gap: '4px',
        flex: 1,
      }}>
        {/* Header row */}
        <div />
        {impactLabels.map(label => (
          <div key={label} className="risk-label" style={{ paddingBottom: '0.5rem' }}>
            {label}
          </div>
        ))}

        {/* Grid rows - High to Low likelihood (top to bottom) */}
        {[3, 2, 1].map(likelihoodLevel => (
          <React.Fragment key={`row-${likelihoodLevel}`}>
            <div className="risk-label" style={{ paddingRight: '0.5rem' }}>
              {likelihoodLabels[3 - likelihoodLevel]}
            </div>
            {[1, 2, 3].map(impactLevel => {
              const cellRaids = getRaidsInCell(likelihoodLevel, impactLevel);
              return (
                <div
                  key={`${likelihoodLevel}-${impactLevel}`}
                  className="risk-cell"
                  style={{
                    background: getCellBg(likelihoodLevel, impactLevel),
                    border: `1px solid ${cellRaids.length > 0 ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)'}`,
                    minHeight: 50,
                    position: 'relative',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    padding: '6px',
                    borderRadius: '8px',
                  }}
                >
                  {cellRaids.map((raid) => {
                    const level = getRaidLevel(raid.likelihood, raid.impact);
                    const isActive = currentAutoRaid?.raidId === raid.raidId || (isHovering && tooltip?.raid.raidId === raid.raidId);
                    return (
                      <div
                        key={raid.raidId}
                        className="raid-dot-wrapper"
                        ref={(el) => {
                          if (el) dotRefs.current.set(raid.raidId, el);
                        }}
                        onMouseEnter={(e) => handleMouseEnter(e, raid)}
                        onMouseLeave={handleMouseLeave}
                      >
                        <div
                          className={`raid-dot-circle ${isActive ? 'active' : ''}`}
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: '50%',
                            background: colors[level],
                            boxShadow: isActive
                              ? `0 0 12px ${colors[level]}, 0 0 20px ${colors[level]}60`
                              : `0 0 8px ${colors[level]}60`,
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>


      {/* Portal tooltip */}
      {tooltip && <Tooltip data={tooltip} isAutoCycling={!isHovering} />}
    </div>
  );
}
