import React from 'react';
import { GlowCard } from '../ui/spotlight-card';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: string;
  color?: 'blue' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'slate';
  glow?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  color = 'blue',
  glow = true,
}) => {
  const colorMap = {
    blue: 'bg-blue-50 text-gebze-navy border-blue-200/80',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    amber: 'bg-amber-50 text-amber-700 border-amber-200/80',
    rose: 'bg-rose-50 text-rose-700 border-rose-200/80',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
    slate: 'bg-slate-100 text-slate-700 border-slate-200/80',
  };

  const valStr = String(value ?? '');
  const isVeryLong = valStr.length > 13;
  const isLong = valStr.length > 9;

  const content = (
    <div className="w-full flex items-start justify-between gap-4 p-4 sm:p-5 relative z-10 bg-white dark:bg-[#111c33] rounded-2xl">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
          {title}
        </p>
        <p
          className={`${
            isVeryLong
              ? 'text-lg sm:text-xl xl:text-2xl'
              : isLong
              ? 'text-xl sm:text-2xl lg:text-3xl'
              : 'text-2xl sm:text-3xl'
          } font-extrabold text-slate-900 dark:text-white mt-1.5 tracking-tight truncate`}
          title={valStr}
        >
          {value}
        </p>
        {subtitle && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium truncate">{subtitle}</p>
        )}
      </div>
      {icon && (
        <div className={`p-3 rounded-xl border shadow-2xs ${colorMap[color]} shrink-0`}>
          {icon}
        </div>
      )}
    </div>
  );

  if (glow) {
    return (
      <GlowCard
        glowColor={color}
        customSize
        className="bg-white dark:bg-[#111c33] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-default"
      >
        {content}
      </GlowCard>
    );
  }

  return (
    <div
      className="bg-white dark:bg-[#111c33] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-default"
    >
      {content}
    </div>
  );
};

export default StatCard;
