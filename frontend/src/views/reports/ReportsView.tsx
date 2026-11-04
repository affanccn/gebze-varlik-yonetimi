import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Printer,
  Download,
  Coins,
  TrendingDown,
} from 'lucide-react';
import { reportService } from '../../services/reportService';
import { useToast } from '../../hooks/useToast';
import { StatCard } from '../../components/common/StatCard';
import { Card } from '../../components/common/Card';
import { StatusBadge } from '../../components/common/Badge';
import { SearchInput } from '../../components/common/SearchInput';
import { formatCurrency } from '../../components/common/formatters';
import { DepreciationReportItem } from '../../types/report';

export const ReportsView: React.FC = () => {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: reportItems = [], isLoading } = useQuery<DepreciationReportItem[]>({
    queryKey: ['report-depreciation'],
    queryFn: reportService.getDepreciationReport,
  });

  // Calculate summary sums
  const totalOriginal = reportItems.reduce((acc, it) => acc + (it.originalValue || 0), 0);
  const totalAccumulated = reportItems.reduce((acc, it) => acc + (it.accumulatedDepreciation || 0), 0);
  const totalBookValue = reportItems.reduce((acc, it) => acc + (it.currentBookValue || 0), 0);

  const filteredItems = reportItems.filter((it) => {
    const q = searchQuery.toLowerCase();
    return (
      it.assetCode.toLowerCase().includes(q) ||
      it.assetName.toLowerCase().includes(q) ||
      it.category.toLowerCase().includes(q) ||
      (it.departmentName && it.departmentName.toLowerCase().includes(q))
    );
  });

  const exportCsv = () => {
    if (reportItems.length === 0) {
      showToast('İndirilecek rapor verisi bulunmuyor.', 'warning');
      return;
    }

    const headers = [
      'Varlik Kodu',
      'Demirbas Adi',
      'Kategori',
      'Mudurluk',
      'Edinim Tarihi',
      'Ilk Bedel TL',
      'Faydali Omur Yil',
      'Yillik Oran',
      'Birikmis Amortisman TL',
      'Guncel Net Defter Degeri TL',
      'Durum',
    ];

    const rows = reportItems.map((it) => [
      it.assetCode,
      `"${(it.assetName || '').replace(/"/g, '""')}"`,
      `"${(it.category || '').replace(/"/g, '""')}"`,
      `"${(it.departmentName || '').replace(/"/g, '""')}"`,
      it.acquisitionDate || '',
      it.originalValue || 0,
      it.usefulLifeYears || 0,
      it.annualDepreciationRate || 0,
      it.accumulatedDepreciation || 0,
      it.currentBookValue || 0,
      it.status || '',
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Gebze_Belediyesi_Amortisman_Raporu_2026.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('Amortisman raporu CSV formatında başarıyla indirildi.', 'success');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Başlık ve Eylemler */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Raporlama ve Amortisman Analizi
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Taşınır varlıkların edinim bedeli, faydalı ömür ve net defter değeri amortisman cetveli
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            CSV Olarak İndir
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Yazdır
          </button>
        </div>
      </div>

      {/* 3 Mali Özet KPI Kartı */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Toplam Edinim Bedeli"
          value={formatCurrency(totalOriginal)}
          subtitle="Kayıtlı İlk Alış Tutarı"
          color="blue"
          icon={<Coins className="w-6 h-6" />}
        />
        <StatCard
          title="Birikmiş Amortisman"
          value={formatCurrency(totalAccumulated)}
          subtitle="Toplam Yıpranma Payı"
          color="rose"
          icon={<TrendingDown className="w-6 h-6" />}
        />
        <StatCard
          title="Net Defter Değeri"
          value={formatCurrency(totalBookValue)}
          subtitle="Kalan Güncel Muhasebe Tutarı"
          color="emerald"
          icon={<Coins className="w-6 h-6" />}
        />
      </div>

      {/* Rapor Tablosu */}
      <Card
        title={`Amortisman Cetveli (${filteredItems.length} Kalem)`}
        subtitle="Varlık bazında faydalı ömür, yıllık amortisman oranı ve defter değeri dökümü"
        action={
          <div className="w-64">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Varlık, kategori veya müdürlük..."
            />
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-3">Kod</th>
                <th className="py-3 px-3">Demirbaş Adı</th>
                <th className="py-3 px-3">Kategori</th>
                <th className="py-3 px-3">Müdürlük</th>
                <th className="py-3 px-3">Edinim Tarihi</th>
                <th className="py-3 px-3 text-right">İlk Bedel</th>
                <th className="py-3 px-3 text-center">Faydalı Ömür</th>
                <th className="py-3 px-3 text-center">Oran</th>
                <th className="py-3 px-3 text-right">Birikmiş Amortisman</th>
                <th className="py-3 px-3 text-right">Net Defter Değeri</th>
                <th className="py-3 px-3 text-center">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={11} className="py-3 px-3">
                      <div className="h-4 bg-slate-100 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-10 text-center text-slate-500">
                    Arama kriterlerinize uygun amortisman kaydı bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredItems.map((it) => (
                  <tr key={it.assetId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-gebze-navy">
                      {it.assetCode}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-900">
                      {it.assetName}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px]">
                        {it.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {it.departmentName}
                    </td>
                    <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                      {it.acquisitionDate || '-'}
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-slate-900">
                      {formatCurrency(it.originalValue)}
                    </td>
                    <td className="py-3 px-3 text-center text-slate-600">
                      {it.usefulLifeYears} Yıl
                    </td>
                    <td className="py-3 px-3 text-center text-slate-600">
                      %{it.annualDepreciationRate}
                    </td>
                    <td className="py-3 px-3 text-right text-rose-600 font-medium">
                      {formatCurrency(it.accumulatedDepreciation)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-700">
                      {formatCurrency(it.currentBookValue)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <StatusBadge status={it.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
