import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { enterpriseService } from '../../services/enterpriseService';
import { formatCurrency } from '../../components/common/formatters';
import {
  ShoppingCart,
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
} from 'lucide-react';

export const ProcurementView: React.FC = () => {
  const [globalFilter, setGlobalFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const {
    data: orders = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['procurement'],
    queryFn: () => enterpriseService.getProcurement(),
  });

  // KPIs
  const kpis = useMemo(() => {
    const total = orders.length;
    const delivered = orders.filter((o) => o.status === 'TESLIM_ALINDI').length;
    const pending = orders.filter((o) => o.status === 'TALEP_EDILDI' || o.status === 'ONAYLANDI').length;
    const totalBudget = orders.reduce((sum, o) => sum + (o.finalAmount || o.estimatedBudget || 0), 0);
    return { total, delivered, pending, totalBudget };
  }, [orders]);

  // Filtered dataset
  const filteredData = useMemo(() => {
    return orders.filter((item) => {
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;

      if (!globalFilter) return true;
      const q = globalFilter.toLowerCase();
      return (
        item.orderNo?.toLowerCase().includes(q) ||
        item.title?.toLowerCase().includes(q) ||
        item.supplierName?.toLowerCase().includes(q) ||
        item.departmentName?.toLowerCase().includes(q) ||
        item.procurementType?.toLowerCase().includes(q)
      );
    });
  }, [orders, statusFilter, globalFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <ShoppingCart className="w-6 h-6 text-indigo-600" />
            Satın Alma & Tedarik Süreçleri
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Müdürlüklerin demirbaş alım talepleri, doğrudan temin/ihale sözleşmeleri ve kesin kabul süreçleri.
          </p>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isRefetching}
          className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 rounded-lg transition-colors self-start sm:self-auto"
          title="Yenile"
        >
          <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Toplam Tedarik</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{kpis.total} Sipariş</div>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-amber-600 uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            Süreç Devam Eden
          </div>
          <div className="text-2xl font-bold text-amber-700 mt-1">{kpis.pending}</div>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Teslim Alınanlar
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{kpis.delivered}</div>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Toplam Tedarik Bütçesi</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(kpis.totalBudget)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            id="procurement-search"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Sipariş no, başlık, firma veya müdürlük ara..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              statusFilter === 'ALL' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Tümü
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('TESLIM_ALINDI')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              statusFilter === 'TESLIM_ALINDI' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Teslim Alınanlar
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('SIPARIS_VERILDI')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              statusFilter === 'SIPARIS_VERILDI' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Sipariş Verilenler
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('TALEP_EDILDI')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              statusFilter === 'TALEP_EDILDI' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Talepler
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
            <span>Satın alma siparişleri yükleniyor...</span>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            Filtrelere uygun satın alma veya tedarik kaydı bulunamadı.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Sipariş No</th>
                  <th className="px-4 py-3">Talep / İhale Başlığı</th>
                  <th className="px-4 py-3">Tedarik Türü</th>
                  <th className="px-4 py-3">Tedarikçi Firma</th>
                  <th className="px-4 py-3">Talep Eden Birim</th>
                  <th className="px-4 py-3 text-right">Tutar / Bütçe</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3">Tarih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.map((o) => {
                  const isDelivered = o.status === 'TESLIM_ALINDI';
                  const isOrdered = o.status === 'SIPARIS_VERILDI';

                  return (
                    <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-indigo-700 bg-indigo-50/40">
                        {o.orderNo}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{o.title}</div>
                        {o.description && (
                          <div className="text-slate-500 text-[11px] line-clamp-1">{o.description}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium text-[11px]">
                          {o.procurementType}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {o.supplierName || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <div>{o.departmentName || '—'}</div>
                        <div className="text-slate-400 text-[11px]">Talep: {o.requestedBy}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900">
                        {formatCurrency(o.finalAmount || o.estimatedBudget)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            isDelivered
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isOrdered
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {isDelivered ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Clock className="w-3 h-3 text-amber-600" />
                          )}
                          {o.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                        <div>Sipariş: {o.orderDate}</div>
                        {o.deliveryDate && <div>Teslim: {o.deliveryDate}</div>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
