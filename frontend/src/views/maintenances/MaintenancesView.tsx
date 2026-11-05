import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  ColumnDef,
  flexRender,
  SortingState,
} from '@tanstack/react-table';
import { maintenanceService } from '../../services/maintenanceService';
import { MaintenanceRecord } from '../../types/maintenance';
import { MaintenanceFormModal } from './MaintenanceFormModal';
import { MaintenanceCompleteModal } from './MaintenanceCompleteModal';
import { MaintenanceWorkOrderModal } from './MaintenanceWorkOrderModal';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency } from '../../components/common/formatters';
import {
  Wrench,
  Search,
  Plus,
  CheckCircle2,
  Clock,
  RefreshCw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Printer,
} from 'lucide-react';

export const MaintenancesView: React.FC = () => {
  const { canWrite } = useAuth();
  const [globalFilter, setGlobalFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'COMPLETED'>('ALL');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'startedAt', desc: true }]);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCompleteOpen, setIsCompleteOpen] = useState(false);
  const [selectedRecordForComplete, setSelectedRecordForComplete] = useState<MaintenanceRecord | null>(null);
  const [workOrderId, setWorkOrderId] = useState<number | null>(null);
  const [isWorkOrderOpen, setIsWorkOrderOpen] = useState(false);

  const {
    data: recordsData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['maintenances'],
    queryFn: () => maintenanceService.getAll({ size: 100 }),
  });

  const { data: workOrderData, isLoading: isLoadingWorkOrder } = useQuery({
    queryKey: ['work-order', workOrderId],
    queryFn: () => (workOrderId ? maintenanceService.getWorkOrder(workOrderId) : Promise.resolve(null)),
    enabled: workOrderId != null,
  });

  const handleOpenWorkOrder = (id: number) => {
    setWorkOrderId(id);
    setIsWorkOrderOpen(true);
  };
  const records = recordsData?.items || [];

  // KPI calculations
  const kpis = useMemo(() => {
    const total = records.length;
    const open = records.filter((r) => r.status === 'ACIK' || r.status === 'DEVAM_EDIYOR').length;
    const completed = records.filter((r) => r.status === 'TAMAMLANDI').length;
    const totalCost = records.reduce((acc, r) => acc + (r.cost || 0), 0);
    return { total, open, completed, totalCost };
  }, [records]);

  // Filtered dataset
  const filteredData = useMemo(() => {
    return records.filter((item) => {
      const isCompleted = item.status === 'TAMAMLANDI';
      if (statusFilter === 'OPEN' && isCompleted) return false;
      if (statusFilter === 'COMPLETED' && !isCompleted) return false;

      if (!globalFilter) return true;
      const q = globalFilter.toLowerCase();
      return (
        item.orderNo?.toLowerCase().includes(q) ||
        item.assetCode?.toLowerCase().includes(q) ||
        item.assetName?.toLowerCase().includes(q) ||
        item.vendorOrTechnician?.toLowerCase().includes(q) ||
        item.issueDescription?.toLowerCase().includes(q)
      );
    });
  }, [records, statusFilter, globalFilter]);

  // Columns definition
  const columns = useMemo<ColumnDef<MaintenanceRecord>[]>(
    () => [
      {
        accessorKey: 'orderNo',
        header: 'İş Emri No',
        cell: ({ row }) => (
          <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            {row.original.orderNo}
          </span>
        ),
      },
      {
        accessorKey: 'assetCode',
        header: 'Demirbaş',
        cell: ({ row }) => (
          <div>
            <div className="font-mono text-xs font-semibold text-slate-800">{row.original.assetCode}</div>
            <div className="text-xs text-slate-500 line-clamp-1">{row.original.assetName}</div>
          </div>
        ),
      },
      {
        accessorKey: 'maintenanceType',
        header: 'Bakım Türü',
        cell: ({ row }) => (
          <span className="text-xs font-medium text-slate-700">
            {row.original.maintenanceType}
          </span>
        ),
      },
      {
        accessorKey: 'priority',
        header: 'Öncelik',
        cell: ({ row }) => {
          const p = row.original.priority;
          let badgeClass = 'bg-slate-100 text-slate-600 border-slate-200';
          if (p === 'ACIL') badgeClass = 'bg-rose-50 text-rose-700 border-rose-200';
          else if (p === 'YUKSEK') badgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
          else if (p === 'NORMAL') badgeClass = 'bg-blue-50 text-blue-700 border-blue-200';

          return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${badgeClass}`}>
              {p}
            </span>
          );
        },
      },
      {
        accessorKey: 'vendorOrTechnician',
        header: 'Servis / Teknisyen',
        cell: ({ row }) => (
          <span className="text-xs text-slate-600">
            {row.original.vendorOrTechnician || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Durum',
        cell: ({ row }) => {
          const isDone = row.original.status === 'TAMAMLANDI';
          return (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                isDone
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              {isDone ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Clock className="w-3 h-3 text-amber-600" />}
              {isDone ? 'Tamamlandı' : 'Açık / Devam Ediyor'}
            </span>
          );
        },
      },
      {
        accessorKey: 'cost',
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-1 font-semibold text-slate-700 hover:text-blue-700 text-xs text-right w-full justify-end"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Maliyet
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
            ) : (
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>
        ),
        cell: ({ row }) => (
          <div className="text-right font-mono text-xs font-semibold text-slate-800">
            {formatCurrency(row.original.cost)}
          </div>
        ),
      },
      {
        id: 'actions',
        header: () => <div className="text-right">Eylemler</div>,
        cell: ({ row }) => {
          const item = row.original;
          const isDone = item.status === 'TAMAMLANDI';
          return (
            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                data-work-order-id={item.id}
                onClick={() => handleOpenWorkOrder(item.id)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors"
                title="İş Emri Formu & Yazdır"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                İş Emri
              </button>

              {canWrite && !isDone ? (
                <button
                  type="button"
                  data-comp-maint-id={item.id}
                  onClick={() => {
                    setSelectedRecordForComplete(item);
                    setIsCompleteOpen(true);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                  title="Bakımı Tamamla"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Tamamla
                </button>
              ) : (
                <span className="text-xs text-slate-400 italic">
                  {item.completedAt ? `Bitiş: ${item.completedAt}` : 'Tamamlandı'}
                </span>
              )}
            </div>
          );
        },
      },
    ],
    [canWrite]
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Wrench className="w-6 h-6 text-amber-600" />
            Bakım, Onarım ve Teknik Servis İş Emirleri
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Arızalı demirbaşların servis kayıtları, iş emirleri takibi, parça değişimi ve onarım maliyetleri.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 rounded-lg transition-colors"
            title="Yenile"
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
          </button>

          {canWrite && (
            <button
              type="button"
              data-action="new-maintenance"
              onClick={() => setIsFormOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Yeni Bakım Talebi Aç
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Toplam İş Emri</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{kpis.total}</div>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Açık / Devam Eden</div>
          <div className="text-2xl font-bold text-amber-700 mt-1">{kpis.open}</div>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Tamamlanan Bakımlar</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{kpis.completed}</div>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Toplam Harcama</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(kpis.totalCost)}</div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            id="maint-search"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="İş emri no, demirbaş, servis veya açıklama ara..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
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
              onClick={() => setStatusFilter('OPEN')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                statusFilter === 'OPEN' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Açık Bakımlar
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('COMPLETED')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                statusFilter === 'COMPLETED' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Tamamlananlar
            </button>
          </div>
        </div>
      </div>

      {/* TanStack Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-600 mb-2" />
            <span>Bakım iş emirleri yükleniyor...</span>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            Filtrelere uygun bakım iş emri bulunamadı.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th key={header.id} className="px-4 py-3">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-slate-100">
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && filteredData.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50 text-xs">
            <span className="text-slate-500">
              Toplam <strong>{filteredData.length}</strong> kayıttan{' '}
              <strong>
                {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} -{' '}
                {Math.min(
                  (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                  filteredData.length
                )}
              </strong>{' '}
              arası gösteriliyor
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded hover:bg-slate-100 disabled:opacity-40"
              >
                Önceki
              </button>
              <span className="font-semibold text-slate-700">
                {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
              </span>
              <button
                type="button"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded hover:bg-slate-100 disabled:opacity-40"
              >
                Sonraki
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <MaintenanceFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={() => refetch()}
      />

      <MaintenanceCompleteModal
        record={selectedRecordForComplete}
        isOpen={isCompleteOpen}
        onClose={() => {
          setIsCompleteOpen(false);
          setSelectedRecordForComplete(null);
        }}
        onSuccess={() => refetch()}
      />

      <MaintenanceWorkOrderModal
        isOpen={isWorkOrderOpen}
        onClose={() => {
          setIsWorkOrderOpen(false);
          setWorkOrderId(null);
        }}
        workOrder={workOrderData || null}
        isLoading={isLoadingWorkOrder}
      />
    </div>
  );
};
