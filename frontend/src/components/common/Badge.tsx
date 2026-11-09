import React from 'react';
import { LIFECYCLE_STATUS_LABELS } from '../../types/asset';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  className = '',
}) => {
  const variantStyles = {
    default: 'bg-blue-50 text-blue-700 border-blue-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    info: 'bg-sky-50 text-sky-700 border-sky-200',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const dotStyles = {
    default: 'bg-blue-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    info: 'bg-sky-500',
    neutral: 'bg-slate-400',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border shadow-2xs ${variantStyles[variant]} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotStyles[variant]}`} />
      {children}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: string; className?: string }> = ({
  status,
  className = '',
}) => {
  const raw = (status || '').trim();
  const normalized = raw.toLowerCase();

  let variant: BadgeProps['variant'] = 'default';
  if (['aktif', 'zimmetli', 'tamamlandı', 'kullanımda', 'zimmetlendi', 'kullanimda'].includes(normalized)) {
    variant = 'success';
  } else if (['depoda', 'beklemede', 'kaydedildi', 'satin_alindi'].includes(normalized)) {
    variant = 'info';
  } else if (['bakımda', 'bakimda', 'onarım gerekli', 'orta', 'pasif_askida', 'askıda', 'pasif'].includes(normalized)) {
    variant = 'warning';
  } else if (['hurda', 'hurdaya_ayrildi', 'zayiat', 'zayiat_calinma', 'çalınma', 'kayıp', 'iptal', 'satildi', 'devredildi', 'bagislandi'].includes(normalized)) {
    variant = 'danger';
  } else {
    variant = 'neutral';
  }

  const label = LIFECYCLE_STATUS_LABELS[raw] || raw || '-';

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
};
