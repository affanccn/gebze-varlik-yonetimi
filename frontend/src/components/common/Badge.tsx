import React from 'react';

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

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: string; className?: string }> = ({
  status,
  className = '',
}) => {
  const normalized = (status || '').toLowerCase().trim();

  let variant: BadgeProps['variant'] = 'default';
  if (['aktif', 'zimmetli', 'tamamlandı', 'kullanımda'].includes(normalized)) {
    variant = 'success';
  } else if (['depoda', 'beklemede', 'kaydedildi'].includes(normalized)) {
    variant = 'info';
  } else if (['bakımda', 'onarım gerekli', 'orta', 'pasif_askida', 'askıda'].includes(normalized)) {
    variant = 'warning';
  } else if (['hurda', 'hurdaya_ayrildi', 'zayiat', 'çalınma', 'kayıp', 'iptal'].includes(normalized)) {
    variant = 'danger';
  } else {
    variant = 'neutral';
  }

  return (
    <Badge variant={variant} className={className}>
      {status || '-'}
    </Badge>
  );
};
