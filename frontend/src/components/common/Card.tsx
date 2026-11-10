import React from 'react';
import { GlowCard, type GlowCardProps } from '../ui/spotlight-card';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  glow?: boolean;
  glowColor?: GlowCardProps['glowColor'];
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  title,
  subtitle,
  action,
  glow = false,
  glowColor = 'blue',
}) => {
  const innerContent = (
    <>
      {(title || action) && (
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div>
            {title && <h3 className="text-base font-bold text-slate-800 tracking-tight">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">{action}</div>}
        </div>
      )}
      <div className="p-5 relative z-10">{children}</div>
    </>
  );

  if (glow) {
    return (
      <GlowCard
        glowColor={glowColor}
        customSize
        className={`bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow duration-200 ${className}`}
      >
        {innerContent}
      </GlowCard>
    );
  }

  return (
    <div className={`bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden ${className}`}>
      {innerContent}
    </div>
  );
};

export default Card;
