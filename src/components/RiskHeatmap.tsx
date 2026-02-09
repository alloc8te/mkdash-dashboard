'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { RIQRisk } from '@/lib/types';

interface RiskHeatmapProps {
  risks: RIQRisk[];
}

function getRiskLevel(prob: string, impact: string): 'low' | 'medium' | 'high' | 'critical' {
  const pMap: Record<string, number> = { low: 1, med: 2, medium: 2, high: 3 };
  const iMap: Record<string, number> = { low: 1, med: 2, medium: 2, high: 3 };
  const p = pMap[prob.toLowerCase()] || 1;
  const i = iMap[impact.toLowerCase()] || 1;
  const score = p * i;
  if (score >= 6) return 'critical';
  if (score >= 4) return 'high';
  if (score >= 2) return 'medium';
  return 'low';
}

function getCellBg(probLevel: number, impactLevel: number): string {
  const score = probLevel * impactLevel;
  if (score >= 6) return 'rgba(212, 107, 107, 0.15)';
  if (score >= 4) return 'rgba(217, 178, 58, 0.12)';
  if (score >= 2) return 'rgba(91, 130, 184, 0.08)';
  return 'rgba(102, 176, 125, 0.06)';
}

function probToLevel(prob: string): number {
  const p = prob.toLowerCase();
  if (p === 'high') return 3;
  if (p === 'med' || p === 'medium') return 2;
  return 1;
}

function impactToLevel(impact: string): number {
  const i = impact.toLowerCase();
  if (i === 'high') return 3;
  if (i === 'med' || i === 'medium') return 2;
  return 1;
}

const colors: Record<string, string> = {
  critical: '#d46b6b',
  high: '#d9b23a',
  medium: '#5b82b8',
  low: '#66b07d',
};

interface TooltipData {
  risk: RIQRisk;
  x: number;
  y: number;
}

function Tooltip({ data, isAutoCycling }: { data: TooltipData; isAutoCycling: boolean }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const level = getRiskLevel(data.risk.probability, data.risk.impact);

  // Use full cycle animation for auto-cycling, simple fade-in for hover
  const animationName = isAutoCycling ? 'riskTooltipCycle' : 'tooltipFadeIn';
  const animationDuration = isAutoCycling ? '4s' : '0.2s';

  return createPortal(
    <div
      key={data.risk.srNo}
      style={{
        position: 'fixed',
        left: data.x,
        top: data.y - 10,
        transform: 'translate(-50%, -100%)',
        background: '#22252f',
        border: '1px solid #353848',
        borderRadius: '8px',
        padding: '0.5rem 0.7rem',
        width: 180,
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
        @keyframes riskTooltipCycle {
          0% { opacity: 0; transform: translate(-50%, -90%); }
          8% { opacity: 1; transform: translate(-50%, -100%); }
          85% { opacity: 1; transform: translate(-50%, -100%); }
          100% { opacity: 0; transform: translate(-50%, -90%); }
        }
      `}</style>
      <div style={{
        fontSize: '0.65rem',
        color: '#e8eaf0',
        fontWeight: 500,
        marginBottom: '0.25rem',
        lineHeight: 1.3,
      }}>
        {data.risk.risk}
      </div>
      <div style={{
        display: 'flex',
        gap: '0.4rem',
        fontSize: '0.55rem',
      }}>
        <span style={{ color: colors[level] }}>
          {data.risk.probability} / {data.risk.impact}
        </span>
        <span style={{ color: '#6b7082' }}>
          {data.risk.mitigationStatus}
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

export default function RiskHeatmap({ risks }: RiskHeatmapProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [autoCycleIndex, setAutoCycleIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const dotRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const probLabels = ['High', 'Med', 'Low'];
  const impactLabels = ['Low', 'Med', 'High'];

  // Auto-cycle through risks
  useEffect(() => {
    if (risks.length === 0) return;

    const interval = setInterval(() => {
      if (!isHovering) {
        setAutoCycleIndex(prev => (prev + 1) % risks.length);
      }
    }, AUTO_CYCLE_INTERVAL);

    return () => clearInterval(interval);
  }, [risks.length, isHovering]);

  // Update tooltip position when auto-cycling
  useEffect(() => {
    if (isHovering || risks.length === 0) return;

    const currentRisk = risks[autoCycleIndex];
    const dotElement = dotRefs.current.get(currentRisk.srNo);

    if (dotElement) {
      const rect = dotElement.getBoundingClientRect();
      setTooltip({
        risk: currentRisk,
        x: rect.left + rect.width / 2,
        y: rect.top,
      });
    }
  }, [autoCycleIndex, risks, isHovering]);

  function getRisksInCell(probLevel: number, impactLevel: number) {
    return risks.filter(r => {
      const rp = probToLevel(r.probability);
      const ri = impactToLevel(r.impact);
      return rp === probLevel && ri === impactLevel;
    });
  }

  const handleMouseEnter = (e: React.MouseEvent, risk: RIQRisk) => {
    setIsHovering(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      risk,
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
  };

  const currentAutoRisk = !isHovering && risks.length > 0 ? risks[autoCycleIndex] : null;

  return (
    <div className="risk-content">
      <style>{`
        .risk-dot-wrapper {
          position: relative;
          cursor: pointer;
        }
        .risk-dot-circle {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .risk-dot-wrapper:hover .risk-dot-circle,
        .risk-dot-circle.active {
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

        {/* Grid rows - High to Low probability (top to bottom) */}
        {[3, 2, 1].map(probLevel => (
          <React.Fragment key={`row-${probLevel}`}>
            <div className="risk-label" style={{ paddingRight: '0.5rem' }}>
              {probLabels[3 - probLevel]}
            </div>
            {[1, 2, 3].map(impactLevel => {
              const cellRisks = getRisksInCell(probLevel, impactLevel);
              return (
                <div
                  key={`${probLevel}-${impactLevel}`}
                  className="risk-cell"
                  style={{
                    background: getCellBg(probLevel, impactLevel),
                    border: `1px solid ${cellRisks.length > 0 ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)'}`,
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
                  {cellRisks.map((risk) => {
                    const level = getRiskLevel(risk.probability, risk.impact);
                    const isActive = currentAutoRisk?.srNo === risk.srNo || (isHovering && tooltip?.risk.srNo === risk.srNo);
                    return (
                      <div
                        key={risk.srNo}
                        className="risk-dot-wrapper"
                        ref={(el) => {
                          if (el) dotRefs.current.set(risk.srNo, el);
                        }}
                        onMouseEnter={(e) => handleMouseEnter(e, risk)}
                        onMouseLeave={handleMouseLeave}
                      >
                        <div
                          className={`risk-dot-circle ${isActive ? 'active' : ''}`}
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
