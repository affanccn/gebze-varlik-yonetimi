import React from 'react';
import { Layers } from 'lucide-react';

interface PlaceholderViewProps {
  title: string;
  subtitle?: string;
  phase?: string;
  icon?: React.ReactNode;
}

export const PlaceholderView: React.FC<PlaceholderViewProps> = ({
  title,
  subtitle = 'Bu modülün arayüzü ve API entegrasyonu planlanan geliştirme aşamasında devreye alınacaktır.',
  phase = 'R2 / R3',
  icon = <Layers className="w-8 h-8 text-teal-600" />,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-teal-50 border border-teal-100 rounded-lg">{icon}</div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{title}</h1>
            <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
          </div>
        </div>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-800 border border-teal-200 self-start sm:self-center">
          Aşama {phase}
        </span>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
        <div className="inline-flex p-4 bg-slate-50 rounded-full text-slate-400 mb-4">
          <Layers className="w-8 h-8" />
        </div>
        <h3 className="text-base font-semibold text-slate-700">Modül Hazırlanıyor</h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto mt-2">
          {title} ekranı Faz R1 altyapı iskeletinde rota ve rol koruması ile tanımlanmıştır. Detaylı veri listesi ve operasyonel formlar bir sonraki aşamada entegre edilecektir.
        </p>
      </div>
    </div>
  );
};

