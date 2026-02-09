'use client';

interface KPICardProps {
  label: string;
  value: string;
  subtitle?: string;
  icon: string;
  gradient: 'blue' | 'green' | 'red' | 'gold' | 'purple';
}

export default function KPICard({ label, value, subtitle, icon, gradient }: KPICardProps) {
  return (
    <div className={`kpi-card card-gradient-${gradient}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {subtitle && <div className="kpi-sub">{subtitle}</div>}
      <div className="kpi-icon">{icon}</div>
    </div>
  );
}
