import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { enterpriseService } from '../../services/enterpriseService';
import { FleetVehicle, normalizeFleetStatus, FLEET_STATUS_LABELS } from '../../types/fleet';
import { FleetStatusModal } from './FleetStatusModal';
import { useAuth } from '../../hooks/useAuth';
import {
  Truck,
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
  Wrench,
  Pencil,
} from 'lucide-react';

export const FleetView: React.FC = () => {
  const { canWrite } = useAuth();
  const [globalFilter, setGlobalFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'GOREVDE' | 'GARAJDA' | 'BAKIMDA'>('ALL');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<FleetVehicle | null>(null);

  const {
    data: vehiclesData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['fleet'],
    queryFn: () => enterpriseService.getFleet({ size: 100 }),
  });
  const vehicles = vehiclesData?.items || [];

  // KPIs
  const kpis = useMemo(() => {
    const total = vehicles.length;
    const active = vehicles.filter((v) => normalizeFleetStatus(v.status) === 'GOREVDE').length;
    const garage = vehicles.filter((v) => normalizeFleetStatus(v.status) === 'GARAJDA').length;
    const inService = vehicles.filter((v) => {
      const st = normalizeFleetStatus(v.status);
      return st === 'BAKIMDA' || st === 'ARIZALI';
    }).length;
    const totalKm = vehicles.reduce((sum, v) => sum + (v.currentKm || 0), 0);
    return { total, active, garage, inService, totalKm };
  }, [vehicles]);

  // Unique vehicle types
  const uniqueTypes = useMemo(() => {
    return Array.from(new Set(vehicles.map((v) => v.vehicleType).filter(Boolean)));
  }, [vehicles]);

  // Filtered dataset
  const filteredData = useMemo(() => {
    return vehicles.filter((item) => {
      if (typeFilter && item.vehicleType !== typeFilter) return false;
      const normalized = normalizeFleetStatus(item.status);
      if (statusFilter !== 'ALL' && normalized !== statusFilter) return false;

      if (!globalFilter) return true;
      const q = globalFilter.toLowerCase();
      return (
        item.plateNumber?.toLowerCase().includes(q) ||
        item.vehicleCode?.toLowerCase().includes(q) ||
        item.brandModel?.toLowerCase().includes(q) ||
        item.assignedDriver?.toLowerCase().includes(q) ||
        item.departmentName?.toLowerCase().includes(q)
      );
    });
  }, [vehicles, typeFilter, statusFilter, globalFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Truck className="w-6 h-6 text-blue-600" />
            Araç & Filo (İş Makineleri Dahil) Yönetimi
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Belediye hizmet araçları, iş makineleri, şoför zimmetleri, periyodik muayene ve kilometre takibi.
          </p>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isRefetching}
          className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 rounded-xl transition-colors self-start sm:self-auto"
          title="Yenile"
        >
          <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 border-t-4 border-t-blue-600 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Toplam Filo</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{kpis.total} Araç</div>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-slate-200 border-t-4 border-t-emerald-500 shadow-xs">
          <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Görevde (Sahada)
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{kpis.active}</div>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-slate-200 border-t-4 border-t-sky-500 shadow-xs">
          <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            Garajda (Beklemede)
          </div>
          <div className="text-2xl font-bold text-blue-700 mt-1">{kpis.garage}</div>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-slate-200 border-t-4 border-t-amber-500 shadow-xs">
          <div className="text-xs font-semibold text-amber-600 uppercase tracking-wider flex items-center gap-1">
            <Wrench className="w-3.5 h-3.5 text-amber-500" />
            Bakım & Arızada
          </div>
          <div className="text-2xl font-bold text-amber-700 mt-1">{kpis.inService}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            id="fleet-search"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Plaka, marka, şoför veya birim ara..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tüm Araç Türleri</option>
            {uniqueTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`flex-1 py-1 rounded-md font-medium transition-colors ${
              statusFilter === 'ALL' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Tümü
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('GOREVDE')}
            className={`flex-1 py-1 rounded-md font-medium transition-colors ${
              statusFilter === 'GOREVDE' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Görevde
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('GARAJDA')}
            className={`flex-1 py-1 rounded-md font-medium transition-colors ${
              statusFilter === 'GARAJDA' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Garajda
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('BAKIMDA')}
            className={`flex-1 py-1 rounded-md font-medium transition-colors ${
              statusFilter === 'BAKIMDA' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Bakımda
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
            <span>Araç filosu yükleniyor...</span>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            Filtrelere uygun araç veya iş makinesi bulunamadı.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[calc(100vh-270px)] overflow-y-auto scrollbar-thin">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 sticky top-0 z-10 shadow-2xs">
                <tr>
                  <th className="px-4 py-3">Plaka / Kod</th>
                  <th className="px-4 py-3">Araç Türü</th>
                  <th className="px-4 py-3">Marka / Model & Yıl</th>
                  <th className="px-4 py-3">Zimmetli Şoför</th>
                  <th className="px-4 py-3">Güncel KM</th>
                  <th className="px-4 py-3">Bağlı Müdürlük</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3">Muayene / Kasko</th>
                  <th className="px-4 py-3 text-right">Eylemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.map((v) => {
                  const normStatus = normalizeFleetStatus(v.status);
                  const isGorevde = normStatus === 'GOREVDE';
                  const isGarajda = normStatus === 'GARAJDA';
                  const isBakimda = normStatus === 'BAKIMDA';

                  return (
                    <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                          {v.plateNumber}
                        </span>
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5">{v.vehicleCode}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[11px] font-semibold border border-blue-200">
                          {v.vehicleType}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{v.brandModel}</div>
                        <div className="text-slate-500 text-[11px]">{v.modelYear} Model • {v.fuelType || 'Dizel'}</div>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {v.assignedDriver || <span className="text-slate-400 italic">Atanmamış</span>}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        {v.currentKm ? v.currentKm.toLocaleString('tr-TR') : 0} <span className="font-normal text-slate-500 text-[11px]">KM</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{v.departmentName || '—'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            isGorevde
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isGarajda
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : isBakimda
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {isGorevde ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          ) : isBakimda ? (
                            <Wrench className="w-3 h-3 text-amber-600" />
                          ) : (
                            <Clock className="w-3 h-3 text-blue-600" />
                          )}
                          {FLEET_STATUS_LABELS[normStatus] || v.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-[11px] font-mono">
                        <div>Muayene: {v.inspectionDate || '—'}</div>
                        <div>Kasko: {v.kaskoDate || '—'}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canWrite && (
                          <button
                            type="button"
                            data-update-fleet-id={v.id}
                            onClick={() => {
                              setSelectedVehicle(v);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                            title="KM & Durum Güncelle"
                          >
                            <Pencil className="w-4 h-4" />
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

      {/* Modal */}
      <FleetStatusModal
        vehicle={selectedVehicle}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedVehicle(null);
        }}
        onSuccess={() => refetch()}
      />
    </div>
  );
};
