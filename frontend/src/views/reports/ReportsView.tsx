import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Printer,
  Download,
  Coins,
  TrendingDown,
  FileSpreadsheet,
  Trash2,
  Building,
  CheckCircle2,
} from 'lucide-react';
import { reportService } from '../../services/reportService';
import { hierarchyService } from '../../services/hierarchyService';
import { useToast } from '../../hooks/useToast';
import { StatCard } from '../../components/common/StatCard';
import { Card } from '../../components/common/Card';
import { StatusBadge } from '../../components/common/Badge';
import { SearchInput } from '../../components/common/SearchInput';
import { formatCurrency } from '../../components/common/formatters';
import {
  DepreciationReportItem,
  Form13ReportItem,
  DisposalReportItem,
} from '../../types/report';
import { Department } from '../../types/hierarchy';

type ActiveTab = 'depreciation' | 'form13' | 'disposal';

export const ReportsView: React.FC = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<ActiveTab>('depreciation');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');

  // 1. Müdürlükler listesi
  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: hierarchyService.getDepartments,
  });

  // 2. Amortisman Raporu
  const { data: depReport = [], isLoading: isDepLoading } = useQuery<DepreciationReportItem[]>({
    queryKey: ['report-depreciation'],
    queryFn: reportService.getDepreciationReport,
    enabled: activeTab === 'depreciation',
  });

  // 3. Form 13 Sayım Döküm Cetveli
  const { data: form13Report = [], isLoading: isForm13Loading } = useQuery<Form13ReportItem[]>({
    queryKey: ['report-form13', selectedDeptId],
    queryFn: () => reportService.getForm13Report(selectedDeptId ? Number(selectedDeptId) : undefined),
    enabled: activeTab === 'form13',
  });

  // 4. Hurda / Terkin Raporu
  const { data: disposalReport = [], isLoading: isDisposalLoading } = useQuery<DisposalReportItem[]>({
    queryKey: ['report-disposal'],
    queryFn: reportService.getDisposalReport,
    enabled: activeTab === 'disposal',
  });

  // Filtrelemeler
  const q = searchQuery.toLowerCase().trim();

  const filteredDep = depReport.filter((it) => {
    const matchSearch =
      !q ||
      it.assetCode.toLowerCase().includes(q) ||
      it.assetName.toLowerCase().includes(q) ||
      it.category.toLowerCase().includes(q) ||
      (it.departmentName && it.departmentName.toLowerCase().includes(q));
    const matchDept = !selectedDeptId || it.departmentName === departments.find((d) => String(d.id) === selectedDeptId)?.name;
    return matchSearch && matchDept;
  });

  const filteredForm13 = form13Report.filter((it) => {
    return (
      !q ||
      it.assetCode.toLowerCase().includes(q) ||
      it.assetName.toLowerCase().includes(q) ||
      it.accountCode.toLowerCase().includes(q) ||
      it.category.toLowerCase().includes(q) ||
      it.location.toLowerCase().includes(q)
    );
  });

  const filteredDisposal = disposalReport.filter((it) => {
    return (
      !q ||
      it.assetCode.toLowerCase().includes(q) ||
      it.assetName.toLowerCase().includes(q) ||
      it.category.toLowerCase().includes(q) ||
      it.departmentName.toLowerCase().includes(q) ||
      it.disposalReason.toLowerCase().includes(q)
    );
  });

  // Toplam Hesaplamaları
  const depOriginal = filteredDep.reduce((acc, it) => acc + (it.originalValue || 0), 0);
  const depAccumulated = filteredDep.reduce((acc, it) => acc + (it.accumulatedDepreciation || 0), 0);
  const depBookValue = filteredDep.reduce((acc, it) => acc + (it.currentBookValue || 0), 0);

  const form13TotalValue = filteredForm13.reduce((acc, it) => acc + (it.totalPrice || 0), 0);
  const disposalTotalValue = filteredDisposal.reduce((acc, it) => acc + (it.originalValue || 0), 0);

  const handleExportCsv = () => {
    let filename = 'Gebze_Belediyesi_Amortisman_Raporu_2026.csv';
    let headers: string[] = [];
    let rows: (string | number)[][] = [];

    if (activeTab === 'form13') {
      filename = 'Tasinir_Sayim_ve_Dokum_Cetveli_Form13.csv';
      headers = ['Hesap Kodu', 'Varlık Kodu', 'Demirbaş Adı', 'Kategori', 'Müdürlük / Ambar', 'Konum', 'Miktar', 'Birim', 'Birim Değer', 'Toplam Tutar', 'Durum', 'Kondisyon'];
      rows = filteredForm13.map(it => [
        it.accountCode, it.assetCode, `"${it.assetName.replace(/"/g, '""')}"`, `"${it.category.replace(/"/g, '""')}"`,
        `"${it.departmentName.replace(/"/g, '""')}"`, `"${it.location.replace(/"/g, '""')}"`,
        it.quantity, it.unit, it.unitPrice, it.totalPrice, it.status, it.conditionStatus
      ]);
    } else if (activeTab === 'disposal') {
      filename = 'Hurda_Terkin_ve_Zayiat_Raporu.csv';
      headers = ['Varlık Kodu', 'Demirbaş Adı', 'Kategori', 'Müdürlük', 'Durum', 'Edinim Bedeli', 'Terkin Tarihi', 'Gerekçe'];
      rows = filteredDisposal.map(it => [
        it.assetCode, `"${it.assetName.replace(/"/g, '""')}"`, `"${it.category.replace(/"/g, '""')}"`,
        `"${it.departmentName.replace(/"/g, '""')}"`, it.lifecycleStatus, it.originalValue, it.disposalDate, `"${it.disposalReason.replace(/"/g, '""')}"`
      ]);
    } else {
      headers = [
        'Varlık Kodu', 'Demirbaş Adı', 'Kategori', 'Müdürlük', 'Edinim Tarihi',
        'İlk Bedel TL', 'Faydalı Ömür Yıl', 'Yıllık Oran', 'Birikmiş Amortisman TL',
        'Güncel Net Defter Değeri TL', 'Durum'
      ];
      rows = filteredDep.map(it => [
        it.assetCode, `"${(it.assetName || '').replace(/"/g, '""')}"`, `"${(it.category || '').replace(/"/g, '""')}"`,
        `"${(it.departmentName || '').replace(/"/g, '""')}"`, it.acquisitionDate || '',
        it.originalValue || 0, it.usefulLifeYears || 0, it.annualDepreciationRate || 0,
        it.accumulatedDepreciation || 0, it.currentBookValue || 0, it.status || ''
      ]);
    }

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('Rapor CSV formatında başarıyla indirildi.', 'success');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Başlık ve Butonlar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Raporlama ve Amortisman Analizi
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Resmi Taşınır Mal Yönetmeliği Form 13 Sayım Cetveli, Amortisman Defteri ve Terkin Raporları
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-xs"
            title="Excel uyumlu UTF-8 CSV İndir"
          >
            <Download className="w-4 h-4" />
            CSV Olarak İndir
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800 text-white hover:bg-slate-900 transition-all shadow-xs"
            title="Resmi Şablonda Yazdır veya PDF Kaydet"
          >
            <Printer className="w-4 h-4" />
            Yazdır / PDF
          </button>
        </div>
      </div>

      {/* Rapor Sekmeleri */}
      <div className="border-b border-slate-200 flex items-center gap-2 print:hidden">
        <button
          type="button"
          onClick={() => setActiveTab('depreciation')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'depreciation'
              ? 'border-gebze-navy text-gebze-navy bg-blue-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <TrendingDown className="w-4 h-4" />
          Amortisman & Net Defter Değeri
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('form13')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'form13'
              ? 'border-gebze-navy text-gebze-navy bg-blue-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Taşınır Sayım ve Döküm Cetveli (Form 13)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('disposal')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'disposal'
              ? 'border-gebze-navy text-gebze-navy bg-blue-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <Trash2 className="w-4 h-4" />
          Hurda, Terkin ve Zayiat Cetveli
        </button>
      </div>

      {/* Filtre Çubuğu */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs print:hidden">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Kod, ad, hesap veya açıklama ara..."
          />
        </div>

        <div className="flex items-center gap-2">
          <Building className="w-4 h-4 text-slate-400" />
          <select
            value={selectedDeptId}
            onChange={(e) => setSelectedDeptId(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-gebze-navy/20"
          >
            <option value="">Tüm Harcama Birimleri / Müdürlükler</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 1. SEKME: AMORTİSMAN RAPORU */}
      {activeTab === 'depreciation' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:hidden">
            <StatCard
              title="Toplam Edinim Bedeli"
              value={formatCurrency(depOriginal)}
              subtitle="Raporlanan Varlıkların İlk Maliyeti"
              color="blue"
              icon={<Coins className="w-6 h-6" />}
            />
            <StatCard
              title="Birikmiş Amortisman"
              value={formatCurrency(depAccumulated)}
              subtitle="Bugüne Kadar Düşülen Yıpranma"
              color="amber"
              icon={<TrendingDown className="w-6 h-6" />}
            />
            <StatCard
              title="Güncel Net Defter Değeri"
              value={formatCurrency(depBookValue)}
              subtitle="Aktif Net Bilanço Değeri"
              color="emerald"
              icon={<CheckCircle2 className="w-6 h-6" />}
            />
          </div>

          <Card
            title={`Amortisman ve Net Defter Değeri Raporu (${filteredDep.length} Varlık)`}
            subtitle="TMS-16 ve Taşınır Mal Yönetmeliği amortisman hesaplama tablosu"
          >
            <div className="overflow-x-auto max-h-[calc(100vh-320px)] overflow-y-auto print:max-h-none scrollbar-thin">
              <table className="w-full text-left text-sm print:text-xs">
                <thead className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200 sticky top-0 z-10 shadow-2xs">
                  <tr>
                    <th className="py-2.5 px-3">Varlık Kodu</th>
                    <th className="py-2.5 px-3">Demirbaş Adı</th>
                    <th className="py-2.5 px-3">Kategori</th>
                    <th className="py-2.5 px-3">Harcama Birimi</th>
                    <th className="py-2.5 px-2 text-center">Edinim</th>
                    <th className="py-2.5 px-3 text-right">İlk Bedel</th>
                    <th className="py-2.5 px-2 text-center">Ömür</th>
                    <th className="py-2.5 px-3 text-right">Birikmiş Amortisman</th>
                    <th className="py-2.5 px-3 text-right">Net Defter Değeri</th>
                    <th className="py-2.5 px-2 text-center">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                  {isDepLoading ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-500">
                        Amortisman verileri hesaplanıyor...
                      </td>
                    </tr>
                  ) : filteredDep.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-500">
                        Kriterlere uygun varlık bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    filteredDep.map((item) => (
                      <tr key={item.assetId} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 font-mono font-semibold text-gebze-navy">
                          {item.assetCode}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-900">{item.assetName}</td>
                        <td className="py-2.5 px-3 text-slate-600">{item.category}</td>
                        <td className="py-2.5 px-3 text-slate-600">{item.departmentName}</td>
                        <td className="py-2.5 px-2 text-center font-mono text-slate-500">{item.acquisitionDate}</td>
                        <td className="py-2.5 px-3 text-right font-medium text-slate-900">
                          {formatCurrency(item.originalValue)}
                        </td>
                        <td className="py-2.5 px-2 text-center text-slate-600">
                          {item.usefulLifeYears} yıl (%{item.annualDepreciationRate})
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-amber-700">
                          {formatCurrency(item.accumulatedDepreciation)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                          {formatCurrency(item.currentBookValue)}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <StatusBadge status={item.status} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* 2. SEKME: FORM 13 SAYIM VE DÖKÜM CETVELİ (RESMİ MEVZUAT FORMATI) */}
      {activeTab === 'form13' && (
        <div className="space-y-6">
          {/* Yazdırma Anteti (Sadece Print'te Çıkar) */}
          <div className="hidden print:block text-center border-b pb-4 mb-4">
            <h2 className="text-base font-bold uppercase tracking-wider text-slate-900">
              T.C. GEBZE BELEDİYE BAŞKANLIĞI
            </h2>
            <h3 className="text-sm font-semibold uppercase text-slate-700 mt-1">
              TAŞINIR MAL YÖNETMELİĞİ &mdash; TAŞINIR SAYIM VE DÖKÜM CETVELİ (ÖRNEK NO: 13)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Sayım Tarihi: {new Date().toLocaleDateString('tr-TR')} &bull; Birim:{' '}
              {departments.find((d) => String(d.id) === selectedDeptId)?.name || 'Tüm Harcama Birimleri'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 print:hidden">
            <StatCard
              title="Kayıtlı Taşınır Adedi"
              value={filteredForm13.length}
              subtitle="Sayımı Yapılan Demirbaş Kalemi"
              color="blue"
              icon={<FileSpreadsheet className="w-6 h-6" />}
            />
            <StatCard
              title="Toplam Cetvel Değeri"
              value={formatCurrency(form13TotalValue)}
              subtitle="Sayım Döküm Toplam Kayıtlı Tutarı"
              color="emerald"
              icon={<Coins className="w-6 h-6" />}
            />
          </div>

          <Card
            title={`Taşınır Sayım ve Döküm Cetveli (Form 13) - ${filteredForm13.length} Kalem`}
            subtitle="Taşınır Mal Yönetmeliği hesap kodları ve fiziki envanter dökümü"
          >
            <div className="overflow-x-auto max-h-[calc(100vh-320px)] overflow-y-auto print:max-h-none scrollbar-thin">
              <table className="w-full text-left text-sm print:text-[10px]">
                <thead className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200 sticky top-0 z-10 shadow-2xs">
                  <tr>
                    <th className="py-2.5 px-3">Hesap Kodu</th>
                    <th className="py-2.5 px-3">Taşınır Kodu</th>
                    <th className="py-2.5 px-3">Taşınır Adı ve Tanımı</th>
                    <th className="py-2.5 px-3">Harcama Birimi</th>
                    <th className="py-2.5 px-3">Bulunduğu Mahal</th>
                    <th className="py-2.5 px-2 text-center">Miktar</th>
                    <th className="py-2.5 px-2 text-center">Birim</th>
                    <th className="py-2.5 px-3 text-right">Birim Değer</th>
                    <th className="py-2.5 px-3 text-right">Toplam Tutar</th>
                    <th className="py-2.5 px-2 text-center">Fiziki Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 text-xs print:text-[10px]">
                  {isForm13Loading ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-500">
                        Form 13 verileri derleniyor...
                      </td>
                    </tr>
                  ) : filteredForm13.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-500">
                        Cetvele uygun kayıt bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    filteredForm13.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="py-2 px-3 font-mono font-bold text-slate-800 bg-slate-50/50">
                          {item.accountCode}
                        </td>
                        <td className="py-2 px-3 font-mono font-semibold text-gebze-navy">
                          {item.assetCode}
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-900">{item.assetName}</td>
                        <td className="py-2 px-3 text-slate-600">{item.departmentName}</td>
                        <td className="py-2 px-3 text-slate-600">{item.location}</td>
                        <td className="py-2 px-2 text-center font-bold text-slate-800">{item.quantity}</td>
                        <td className="py-2 px-2 text-center text-slate-500">{item.unit}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-700">
                          {formatCurrency(item.unitPrice)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(item.totalPrice)}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                            {item.conditionStatus}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Resmi Onay ve İmza Alanları (Yazdırma için) */}
            <div className="hidden print:grid grid-cols-3 gap-8 pt-8 mt-6 border-t text-center text-xs">
              <div>
                <p className="font-bold">Sayım Kurulu Başkanı</p>
                <div className="h-16"></div>
                <p className="text-slate-500">İmza / Mühür</p>
              </div>
              <div>
                <p className="font-bold">Sayım Kurulu Üyesi</p>
                <div className="h-16"></div>
                <p className="text-slate-500">İmza</p>
              </div>
              <div>
                <p className="font-bold">Taşınır Kayıt Yetkilisi</p>
                <div className="h-16"></div>
                <p className="text-slate-500">İmza</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* 3. SEKME: HURDA, TERKİN VE ZAYİAT RAPORU */}
      {activeTab === 'disposal' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 print:hidden">
            <StatCard
              title="Terkin Edilen Varlık"
              value={filteredDisposal.length}
              subtitle="Hurda, Zayiat veya Satış Kayıtları"
              color="amber"
              icon={<Trash2 className="w-6 h-6" />}
            />
            <StatCard
              title="Terkin Edilen Değer"
              value={formatCurrency(disposalTotalValue)}
              subtitle="Envanterden Düşülen İlk Değer"
              color="blue"
              icon={<Coins className="w-6 h-6" />}
            />
          </div>

          <Card
            title={`Hurda, Terkin ve Zayiat Cetveli (${filteredDisposal.length} Varlık)`}
            subtitle="Ekonomik ömrünü tamamlamış (HEK), çalınmış veya kayıptan terkin edilen varlıklar"
          >
            <div className="overflow-x-auto max-h-[calc(100vh-320px)] overflow-y-auto print:max-h-none scrollbar-thin">
              <table className="w-full text-left text-sm print:text-xs">
                <thead className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200 sticky top-0 z-10 shadow-2xs">
                  <tr>
                    <th className="py-2.5 px-3">Varlık Kodu</th>
                    <th className="py-2.5 px-3">Demirbaş Adı</th>
                    <th className="py-2.5 px-3">Kategori</th>
                    <th className="py-2.5 px-3">Harcama Birimi</th>
                    <th className="py-2.5 px-2 text-center">Durum</th>
                    <th className="py-2.5 px-3 text-right">Edinim Bedeli</th>
                    <th className="py-2.5 px-3 text-center">Terkin Tarihi</th>
                    <th className="py-2.5 px-4">Terkin / Hurda Gerekçesi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                  {isDisposalLoading ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        Terkin verileri yükleniyor...
                      </td>
                    </tr>
                  ) : filteredDisposal.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        Hurdaya ayrılmış veya terkin edilmiş varlık bulunmuyor.
                      </td>
                    </tr>
                  ) : (
                    filteredDisposal.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 font-mono font-semibold text-gebze-navy">
                          {item.assetCode}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-900">{item.assetName}</td>
                        <td className="py-2.5 px-3 text-slate-600">{item.category}</td>
                        <td className="py-2.5 px-3 text-slate-600">{item.departmentName}</td>
                        <td className="py-2.5 px-2 text-center">
                          <StatusBadge status={item.lifecycleStatus} />
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-900">
                          {formatCurrency(item.originalValue)}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-500">{item.disposalDate}</td>
                        <td className="py-2.5 px-4 text-slate-600 italic">{item.disposalReason}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
