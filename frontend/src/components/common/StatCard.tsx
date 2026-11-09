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
    blue: 'bg-blue-50 text-gebze-navy border-blue-200/80',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    amber: 'bg-amber-50 text-amber-700 border-amber-200/80',
    rose: 'bg-rose-50 text-rose-700 border-rose-200/80',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
    slate: 'bg-slate-100 text-slate-700 border-slate-200/80',
  };

  const accentBarMap = {
    blue: 'border-t-blue-600',
    emerald: 'border-t-emerald-600',
    amber: 'border-t-amber-500',
    rose: 'border-t-rose-600',
    indigo: 'border-t-indigo-600',
    slate: 'border-t-slate-600',
  };

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200/90 border-t-4 ${accentBarMap[color]} shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 p-4 sm:p-5 flex items-start justify-between gap-4`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
          {title}
        </p>
        <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1.5 tracking-tight truncate">
          {value}
        </p>
        {subtitle && (
          <p className="text-xs text-slate-500 mt-1 font-medium truncate">{subtitle}</p>
        )}
      </div>
      {icon && (
        <div className={`p-3 rounded-xl border shadow-2xs ${colorMap[color]} shrink-0`}>
          {icon}
        </div>
      )}
    </div>
  );
};

