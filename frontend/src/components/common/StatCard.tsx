import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: string;
  color?: 'blue' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'slate';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  color = 'blue',
}) => {
  const colorMap = {
    blue: 'bg-blue-50 text-gebze-navy border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    rose: 'bg-rose-50 text-rose-700 border-rose-100',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-4 sm:p-5 flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
          {title}
        </p>
        <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1 tracking-tight truncate">
          {value}
        </p>
        {subtitle && (
          <p className="text-xs text-slate-500 mt-1 truncate">{subtitle}</p>
        )}
      </div>
      {icon && (
        <div className={`p-3 rounded-lg border ${colorMap[color]} shrink-0`}>
          {icon}
        </div>
      )}
    </div>
  );
};
