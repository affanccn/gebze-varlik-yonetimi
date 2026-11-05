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
import { assignmentService } from '../../services/assignmentService';
import { AssetAssignment } from '../../types/assignment';
import { AssignmentFormModal } from './AssignmentFormModal';
import { AssignmentReturnModal } from './AssignmentReturnModal';
import { useAuth } from '../../hooks/useAuth';
import {
  FileCheck,
  Search,
  Plus,
  RotateCcw,
  RefreshCw,
  CheckCircle2,
  Clock,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  UserCheck,
} from 'lucide-react';

export const AssignmentsView: React.FC = () => {
  const { canWrite } = useAuth();
  const [globalFilter, setGlobalFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AKTIF' | 'IADE_EDILDI'>('ALL');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'assignedAt', desc: true }]);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isReturnOpen, setIsReturnOpen] = useState(false);
  const [selectedAssignmentForReturn, setSelectedAssignmentForReturn] = useState<AssetAssignment | null>(null);

  const {
    data: assignmentsData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => assignmentService.getAll({ size: 100 }),
  });
  const assignments = assignmentsData?.items || [];

  // KPI Calculations
  const kpis = useMemo(() => {
    const total = assignments.length;
    const active = assignments.filter((a) => a.status === 'AKTIF').length;
    const returned = assignments.filter((a) => a.status === 'IADE_EDILDI').length;
    return { total, active, returned };
  }, [assignments]);

  // Filtered dataset
  const filteredData = useMemo(() => {
    return assignments.filter((item) => {
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      if (!globalFilter) return true;
      const q = globalFilter.toLowerCase();
      return (
        item.documentNo?.toLowerCase().includes(q) ||
        item.assetCode?.toLowerCase().includes(q) ||
        item.assetName?.toLowerCase().includes(q) ||
        item.assigneeName?.toLowerCase().includes(q) ||
        item.unit?.toLowerCase().includes(q)
      );
    });
  }, [assignments, statusFilter, globalFilter]);

  // Columns definition
  const columns = useMemo<ColumnDef<AssetAssignment>[]>(
    () => [
      {
        accessorKey: 'documentNo',
        header: 'Belge No',
        cell: ({ row }) => (
          <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
            {row.original.documentNo}
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
        accessorKey: 'assigneeName',
        header: 'Zimmetli Personel',
        cell: ({ row }) => (
          <div>
            <div className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-blue-600" />
              {row.original.assigneeName}
            </div>
            {row.original.assigneeTitle && (
              <div className="text-xs text-slate-500">{row.original.assigneeTitle}</div>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'unit',
        header: 'Müdürlük & Mahalli',
        cell: ({ row }) => (
          <div>
            <div className="text-xs font-medium text-slate-700">{row.original.unit || '—'}</div>
            {row.original.location && (
              <div className="text-xs text-slate-500">{row.original.location}</div>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Durum',
        cell: ({ row }) => {
          const isAktif = row.original.status === 'AKTIF';
          return (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                isAktif
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {isAktif ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Clock className="w-3 h-3 text-slate-400" />}
              {isAktif ? 'Aktif Zimmet' : 'İade Alındı'}
            </span>
          );
        },
      },
      {
        accessorKey: 'assignedAt',
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-1 font-semibold text-slate-700 hover:text-blue-700 text-xs"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Zimmet Tarihi
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
          <div className="text-xs text-slate-600 font-mono">
            {row.original.assignedAt}
          </div>
        ),
      },
      {
        id: 'actions',
        header: () => <div className="text-right">Eylemler</div>,
        cell: ({ row }) => {
          const item = row.original;
          const isAktif = item.status === 'AKTIF';
          return (
            <div className="flex items-center justify-end gap-1.5">
              {canWrite && isAktif ? (
                <button
                  type="button"
                  data-return-assign-id={item.id}
                  onClick={() => {
                    setSelectedAssignmentForReturn(item);
                    setIsReturnOpen(true);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors"
                  title="Zimmeti İade Al"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  İade Al
                </button>
              ) : (
                <span className="text-xs text-slate-400 italic">
                  {item.returnedAt ? `İade: ${item.returnedAt}` : 'İşlem Yok'}
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
            <FileCheck className="w-6 h-6 text-blue-600" />
            Zimmet ve Taşınır Tahsis Yönetimi
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Belediye personeline tahsis edilen zimmet fişleri, kullanım mahalleri ve ambar iade süreçleri.
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
              data-action="new-assignment"
              onClick={() => setIsFormOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Yeni Zimmet Fişi Düzenle
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Toplam Zimmet Fişi</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{kpis.total}</div>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Aktif Zimmetli</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{kpis.active}</div>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ambara İade Edilen</div>
          <div className="text-2xl font-bold text-slate-700 mt-1">{kpis.returned}</div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            id="zimmet-search"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Fiş no, demirbaş kodu, personel veya birim ara..."
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
              onClick={() => setStatusFilter('AKTIF')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                statusFilter === 'AKTIF' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Aktifler
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('IADE_EDILDI')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                statusFilter === 'IADE_EDILDI' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              İade Edilenler
            </button>
          </div>
        </div>
      </div>

      {/* TanStack Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
            <span>Zimmet fişleri yükleniyor...</span>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            Filtrelere uygun zimmet kaydı bulunamadı.
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
      <AssignmentFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={() => refetch()}
      />

      <AssignmentReturnModal
        assignment={selectedAssignmentForReturn}
        isOpen={isReturnOpen}
        onClose={() => {
          setIsReturnOpen(false);
          setSelectedAssignmentForReturn(null);
        }}
        onSuccess={() => refetch()}
      />
    </div>
  );
};

