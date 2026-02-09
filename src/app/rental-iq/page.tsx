'use client';

import { useEffect, useState, useCallback } from 'react';
import type { RentalIQData } from '@/lib/types';
import TabNav from '@/components/TabNav';
import KPICard from '@/components/KPICard';
import GanttChart from '@/components/GanttChart';
import MilestoneProgress from '@/components/MilestoneProgress';
import ActivityTable from '@/components/ActivityTable';
import StatusDonut from '@/components/StatusDonut';
import RiskHeatmap from '@/components/RiskHeatmap';
import DevVelocity from '@/components/DevVelocity';

const REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

export default function RentalIQDashboard() {
  const [data, setData] = useState<RentalIQData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/rental-iq', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch data');
      const json: RentalIQData = await res.json();
      setData(json);
      setError(null);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Failed to load Rental IQ data:', err);
      setError('Failed to load data');
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (error && !data) {
    return (
      <div style={{ padding: '2rem', color: 'var(--red)' }}>
        <h2>Error loading data</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>
        Loading dashboard...
      </div>
    );
  }

  // Compute KPI values
  const overallPct = Math.round(data.cumulativeCompletion * 100);
  const activeMilestones = data.milestones.filter(
    m => m.overallStatus.toLowerCase().includes('progress') || m.overallStatus.toLowerCase().includes('delayed')
  ).length;
  const totalMilestones = data.milestones.length;

  const statusCounts: Record<string, number> = {};
  data.activities.forEach(a => {
    const s = a.status;
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  });

  const completedTasks = data.activities.filter(
    a => a.status.toLowerCase().includes('completed')
  ).length;
  const totalTasks = data.activities.length;
  const inProgressTasks = data.activities.filter(
    a => a.status.toLowerCase().includes('progress')
  ).length;

  const highImpactRisks = data.risks.filter(
    r => r.impact.toLowerCase() === 'high'
  ).length;

  return (
    <div className="tv-viewport">
      {/* Left Panel: Tabs + KPIs + Milestone Progress + Status Donut */}
      <div className="kpi-sidebar">
        <TabNav />
        <KPICard
          label="Overall Progress"
          value={`${overallPct}%`}
          subtitle={`${totalMilestones} milestones`}
          icon="&#9672;"
          gradient="blue"
        />
        <KPICard
          label="Milestones Active"
          value={`${activeMilestones}/${totalMilestones}`}
          subtitle={`${completedTasks} completed`}
          icon="&#9654;"
          gradient="purple"
        />
        <KPICard
          label="In Progress"
          value={`${inProgressTasks}/${totalTasks}`}
          subtitle={`${totalTasks - completedTasks} remaining`}
          icon="&#9744;"
          gradient="green"
        />
        <KPICard
          label="Open Risks"
          value={String(data.risks.length)}
          subtitle={`${highImpactRisks} high impact`}
          icon="&#9888;"
          gradient="red"
        />

        {/* Status Donut - expanded to fill remaining space */}
        <div className="card card-accent-gold donut-wrapper" style={{ flex: 1 }}>
          <div className="section-title">
            <span className="dot dot-gold" />
            Status
          </div>
          <StatusDonut
            statusCounts={statusCounts}
            totalLabel="Tasks"
          />
        </div>
      </div>

      {/* Right: Row 1 — Gantt Timeline (same width as Activity Tracker) */}
      <div className="dashboard-grid-equal" style={{ gridTemplateColumns: '1fr 0.7fr' }}>
        <div className="card card-accent-blue">
          <div className="section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span className="dot dot-blue" />
              Milestone Timeline
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.5rem', color: '#6b7082' }}>
              <span className="refresh-dot" style={{ width: 6, height: 6 }} />
              <span>Updated {formatTime(lastRefresh)}</span>
            </div>
          </div>
          <GanttChart
            items={data.milestones.map(m => ({
              name: m.activityName,
              startDate: m.startDate,
              endDate: m.endDate,
              status: m.overallStatus,
              percentComplete: m.percentComplete,
            }))}
          />
        </div>
        {/* Milestones Progress - above Risk Register */}
        <div className="card card-accent-purple">
          <div className="section-title">
            <span className="dot dot-purple" />
            Milestones
          </div>
          <MilestoneProgress
            milestones={data.milestoneCompletion}
            cumulativeCompletion={data.cumulativeCompletion}
          />
        </div>
      </div>

      {/* Right: Row 2 — Activity Tracker + (Risk Register + Dev Velocity stacked) */}
      <div className="dashboard-grid-equal" style={{ gridTemplateColumns: '1fr 0.7fr' }}>
        <div className="card card-accent-green">
          <div className="section-title">
            <span className="dot dot-green" />
            Activity Tracker
          </div>
          <ActivityTable activities={data.activities} />
        </div>

        {/* Right column: Risk Register + Dev Velocity stacked */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div className="card card-accent-red" style={{ flex: 1 }}>
            <div className="section-title">
              <span className="dot dot-red" />
              Risk Register
            </div>
            <RiskHeatmap risks={data.risks} />
          </div>

          <div className="card card-accent-blue" style={{ flex: 0.6 }}>
            <div className="section-title">
              <span className="dot dot-blue" />
              Dev Velocity
            </div>
            <DevVelocity data={data.devTasks} />
          </div>
        </div>
      </div>
    </div>
  );
}
