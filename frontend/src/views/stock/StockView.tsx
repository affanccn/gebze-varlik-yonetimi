import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { stockService } from '../../services/stockService';
import { StockItem } from '../../types/stock';
import { StockTransaction } from '../../types/stock';
import { StockTransactionModal } from './StockTransactionModal';
import { StockItemCreateModal } from './StockItemCreateModal';
import { TifVoucherModal } from './TifVoucherModal';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency } from '../../components/common/formatters';
import {
  Boxes,
  Search,
  Plus,
  RefreshCw,
  AlertOctagon,
  Warehouse,
  ArrowDownLeft,
  ArrowUpRight,
  History,
  FileText,
} from 'lucide-react';

export const StockView: React.FC = () => {
  const { canWrite } = useAuth();
  const [activeTab, setActiveTab] = useState<'inventory' | 'history'>('inventory');

  // Filters for items
  const [searchQuery, setSearchQuery] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CRITICAL' | 'NORMAL'>('ALL');

  // Modals
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [preselectedItem, setPreselectedItem] = useState<StockItem | null>(null);
  const [selectedTifTx, setSelectedTifTx] = useState<StockTransaction | null>(null);
  const [isTifModalOpen, setIsTifModalOpen] = useState(false);

  // Queries
  const {
    data: stockData,
    isLoading: isLoadingItems,
    refetch: refetchItems,
    isRefetching: isRefetchingItems,
  } = useQuery({
    queryKey: ['stock-items'],
    queryFn: () => stockService.getAll({ size: 100 }),
  });
  const stockItems = stockData?.items || [];

  const {
    data: txData,
    isLoading: isLoadingTx,
    refetch: refetchTx,
  } = useQuery({
    queryKey: ['stock-transactions'],
    queryFn: () => stockService.getTransactions({ size: 100 }),
  });
  const transactions = txData?.items || [];

  const handleRefresh = () => {
    refetchItems();
    refetchTx();
  };

  // KPIs
  const kpis = useMemo(() => {
    const total = stockItems.length;
    let critical = 0;
    let totalVal = 0;
    const warehouses = new Set<string>();

    stockItems.forEach((it) => {
      if (it.status === 'KRITIK' || it.status === 'TUKENDI') critical++;
      totalVal += (it.currentQuantity || 0) * (it.unitPrice || 0);
      if (it.warehouseName) warehouses.add(it.warehouseName);
    });

    return {
      total,
      critical,
      totalVal,
      warehousesCount: warehouses.size || 1,
    };
  }, [stockItems]);

  // Unique options for dropdowns
  const { uniqueWarehouses, uniqueCategories } = useMemo(() => {
    const whs = Array.from(new Set(stockItems.map((s) => s.warehouseName).filter(Boolean)));
    const cats = Array.from(new Set(stockItems.map((s) => s.category).filter(Boolean)));
    return { uniqueWarehouses: whs, uniqueCategories: cats };
  }, [stockItems]);

  // Filtered Stock Items
  const filteredItems = useMemo(() => {
    return stockItems.filter((it) => {
      if (warehouseFilter && it.warehouseName !== warehouseFilter) return false;
      if (categoryFilter && it.category !== categoryFilter) return false;
      if (statusFilter === 'CRITICAL' && it.status !== 'KRITIK' && it.status !== 'TUKENDI') return false;
      if (statusFilter === 'NORMAL' && it.status !== 'NORMAL') return false;

      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        it.itemCode?.toLowerCase().includes(q) ||
        it.itemName?.toLowerCase().includes(q) ||
        it.category?.toLowerCase().includes(q) ||
        it.warehouseName?.toLowerCase().includes(q)
      );
    });
  }, [stockItems, warehouseFilter, categoryFilter, statusFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Boxes className="w-6 h-6 text-teal-600" />
            Depo ve Sarf Malzeme Stok Yönetimi
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Belediye ambarları, sarf malzeme stokları, asgari kritik eşikler ve birim tahsis hareketleri.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefetchingItems}
            className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 rounded-xl transition-colors"
            title="Yenile"
          >
            <RefreshCw className={`w-4 h-4 ${isRefetchingItems ? 'animate-spin' : ''}`} />
          </button>

          {canWrite && (
            <>
              <button
                type="button"
                data-action="new-stock-item"
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-xs transition-all hover:shadow"
              >
                <Plus className="w-4 h-4 text-teal-600" />
                Yeni Stok Kartı
              </button>
              <button
                type="button"
                data-action="new-stock-tx"
                onClick={() => {
                  setPreselectedItem(null);
                  setIsTxModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition-all hover:shadow"
              >
                <Plus className="w-4 h-4" />
                Stok Hareketi Yap
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 border-t-4 border-t-blue-600 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Toplam Stok Kalemi</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{kpis.total}</div>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-slate-200 border-t-4 border-t-rose-500 shadow-xs">
          <div className="text-xs font-semibold text-rose-600 uppercase tracking-wider flex items-center gap-1">
            <AlertOctagon className="w-3.5 h-3.5 text-rose-500" />
            Kritik & Tükenen
          </div>
          <div className="text-2xl font-bold text-rose-700 mt-1">{kpis.critical}</div>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-slate-200 border-t-4 border-t-emerald-500 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Toplam Stok Değeri</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(kpis.totalVal)}</div>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-slate-200 border-t-4 border-t-teal-500 shadow-xs">
          <div className="text-xs font-semibold text-teal-600 uppercase tracking-wider flex items-center gap-1">
            <Warehouse className="w-3.5 h-3.5 text-teal-500" />
            Aktif Ambar / Depo
          </div>
          <div className="text-2xl font-bold text-teal-700 mt-1">{kpis.warehousesCount}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex items-center gap-6">
        <button
          type="button"
          onClick={() => setActiveTab('inventory')}
          className={`pb-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'inventory'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Boxes className="w-4 h-4" />
          Depo Stok Envanteri ({filteredItems.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`pb-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'history'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          Geçmiş Stok Hareketleri ({transactions.length})
        </button>
      </div>

      {/* Tab 1: Inventory Table */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                id="stock-search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Malzeme kodu veya adı ara..."
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <select
                value={warehouseFilter}
                onChange={(e) => setWarehouseFilter(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Tüm Depolar</option>
                {uniqueWarehouses.map((wh) => (
                  <option key={wh} value={wh}>
                    {wh}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Tüm Kategoriler</option>
                {uniqueCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'CRITICAL' | 'NORMAL')}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
              >
                <option value="ALL">Tüm Durumlar</option>
                <option value="CRITICAL">⚠️ Kritik & Tükenenler</option>
                <option value="NORMAL">✓ Normal Seviye</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {isLoadingItems ? (
              <div className="p-12 text-center text-slate-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-teal-600 mb-2" />
                <span>Stok verileri yükleniyor...</span>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                Filtrelere uygun stok kalemi bulunamadı.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[calc(100vh-320px)] overflow-y-auto scrollbar-thin">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 sticky top-0 z-10 shadow-2xs">
                    <tr>
                      <th className="px-4 py-3">Malzeme Kodu</th>
                      <th className="px-4 py-3">Malzeme Adı</th>
                      <th className="px-4 py-3">Kategori</th>
                      <th className="px-4 py-3">Depo / Ambar</th>
                      <th className="px-4 py-3">Mevcut Miktar</th>
                      <th className="px-4 py-3">Kritik Eşik</th>
                      <th className="px-4 py-3 text-right">Birim Fiyat</th>
                      <th className="px-4 py-3 text-right">Toplam Değer</th>
                      <th className="px-4 py-3">Durum</th>
                      <th className="px-4 py-3 text-right">Eylem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredItems.map((it) => {
                      const itemVal = (it.currentQuantity || 0) * (it.unitPrice || 0);
                      const isCritical = it.status === 'KRITIK';
                      const isTukendi = it.status === 'TUKENDI';

                      return (
                        <tr key={it.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3 font-mono font-semibold text-slate-800">
                            {it.itemCode}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {it.itemName}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px] font-medium">
                              {it.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{it.warehouseName}</td>
                          <td className="px-4 py-3 font-mono font-bold text-slate-900">
                            {it.currentQuantity} <span className="font-normal text-slate-500 text-[11px]">{it.unit}</span>
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-500">
                            {it.minThreshold} {it.unit}
                          </td>
                          <td className="px-4 py-3 font-mono text-right text-slate-700">
                            {formatCurrency(it.unitPrice)}
                          </td>
                          <td className="px-4 py-3 font-mono text-right font-semibold text-slate-900">
                            {formatCurrency(itemVal)}
                          </td>
                          <td className="px-4 py-3">
                            {isCritical ? (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                Kritik Stok
                              </span>
                            ) : isTukendi ? (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                                Tükendi
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Normal
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {canWrite && (
                              <button
                                type="button"
                                data-stock-tx-id={it.id}
                                onClick={() => {
                                  setPreselectedItem(it);
                                  setIsTxModalOpen(true);
                                }}
                                className="px-2.5 py-1 text-xs font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors"
                              >
                                Hareket Yap
                              </button>
                            )}
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
      )}

      {/* Tab 2: Transaction History Table */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {isLoadingTx ? (
            <div className="p-12 text-center text-slate-500">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-teal-600 mb-2" />
              <span>Stok hareketleri yükleniyor...</span>
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              Henüz kayıtlı stok hareketi bulunmuyor.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[calc(100vh-320px)] overflow-y-auto scrollbar-thin">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 sticky top-0 z-10 shadow-2xs">
                  <tr>
                    <th className="px-4 py-3">İşlem Kodu</th>
                    <th className="px-4 py-3">Tarih</th>
                    <th className="px-4 py-3">Malzeme</th>
                    <th className="px-4 py-3">İşlem Türü</th>
                    <th className="px-4 py-3">Miktar</th>
                    <th className="px-4 py-3">Müdürlük</th>
                    <th className="px-4 py-3">Teslim Alan</th>
                    <th className="px-4 py-3">İşlemi Yapan</th>
                    <th className="px-4 py-3">Açıklama</th>
                    <th className="px-4 py-3 text-right">Belge</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map((tx) => {
                    const isGiris = tx.txType === 'GIRIS';
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-mono font-semibold text-blue-700">
                          {tx.transactionCode}
                        </td>
                        <td className="px-4 py-3 text-slate-500 font-mono">{tx.txDate}</td>
                        <td className="px-4 py-3 font-medium text-slate-900">{tx.itemName}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              isGiris
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}
                          >
                            {isGiris ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                            {isGiris ? 'Giriş (İkmal)' : 'Çıkış (Tahsis)'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">
                          {tx.quantity} <span className="font-normal text-slate-500 text-[11px]">{tx.unit}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{tx.departmentName || '—'}</td>
                        <td className="px-4 py-3 text-slate-700 font-medium">{tx.recipientName || '—'}</td>
                        <td className="px-4 py-3 text-slate-500">{tx.performedBy}</td>
                        <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{tx.notes || '—'}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTifTx(tx);
                              setIsTifModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                            title="Taşınır İşlem Fişi (TİF) Yazdır"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            TİF Fişi
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Stock Transaction Modal */}
      <StockTransactionModal
        stockItems={stockItems}
        preselectedItem={preselectedItem}
        isOpen={isTxModalOpen}
        onClose={() => {
          setIsTxModalOpen(false);
          setPreselectedItem(null);
        }}
        onSuccess={handleRefresh}
      />

      {/* New Stock Item Modal */}
      <StockItemCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {/* TIF Voucher Printable Modal */}
      <TifVoucherModal
        isOpen={isTifModalOpen}
        onClose={() => {
          setIsTifModalOpen(false);
          setSelectedTifTx(null);
        }}
        transaction={selectedTifTx}
      />
    </div>
  );
};
