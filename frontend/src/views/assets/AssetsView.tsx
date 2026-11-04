import React, { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  ColumnDef,
  flexRender,
  SortingState,
} from '@tanstack/react-table';
import { useQuery } from '@tanstack/react-query';
import { assetService } from '../../services/assetService';
import { hierarchyService } from '../../services/hierarchyService';
import { Asset } from '../../types/asset';
import { StatusBadge } from '../../components/common/Badge';
import { formatCurrency } from '../../components/common/formatters';
import { useAuth } from '../../hooks/useAuth';
import { AssetDetailModal } from './AssetDetailModal';
import { AssetFormModal } from './AssetFormModal';
import { AssetTransferModal } from './AssetTransferModal';
import { AssetLifecycleModal } from './AssetLifecycleModal';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  FilterX,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Send,
  Trash2,
} from 'lucide-react';

export const AssetsView: React.FC = () => {
  const { canWrite, canDelete, user } = useAuth();

  // Search & Filter state
  const [globalFilter, setGlobalFilter] = useState('');
  const [filterDept, setFilterDept] = useState<string>('');
  const [filterCat, setFilterCat] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 15 });

  // Modals state
  const [selectedAssetIdForDetail, setSelectedAssetIdForDetail] = useState<number | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [assetToEdit, setAssetToEdit] = useState<Asset | null>(null);

  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [assetToTransfer, setAssetToTransfer] = useState<Asset | null>(null);

  const [isLifecycleOpen, setIsLifecycleOpen] = useState(false);
  const [assetForLifecycle, setAssetForLifecycle] = useState<Asset | null>(null);
  const [lifecyclePreselectedTarget, setLifecyclePreselectedTarget] = useState<string | undefined>();

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);

  // Lookups Queries
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: hierarchyService.getDepartments,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: hierarchyService.getCategories,
  });

  // Assets Query
  const {
    data: assets = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['assets', filterDept, filterCat, filterStatus],
    queryFn: () =>
      assetService.getAll({
        departmentId: filterDept ? Number(filterDept) : undefined,
        categoryId: filterCat ? Number(filterCat) : undefined,
        status: filterStatus || undefined,
      }),
  });

  // Reset filters
  const handleResetFilters = () => {
    setGlobalFilter('');
    setFilterDept('');
    setFilterCat('');
    setFilterStatus('');
  };

  // TanStack Table Columns
  const columns = useMemo<ColumnDef<Asset>[]>(
    () => [
      {
        accessorKey: 'code',
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-1 font-semibold text-slate-700 hover:text-blue-700 text-xs"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Varlık Kodu
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
            ) : (
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>
        ),
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div>
              <span className="font-mono text-xs font-bold text-blue-700">{item.code}</span>
              {item.barcode && (
                <div className="text-[11px] font-mono text-slate-500 mt-0.5">{item.barcode}</div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-1 font-semibold text-slate-700 hover:text-blue-700 text-xs"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Varlık Adı & Model
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
            ) : (
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>
        ),
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="max-w-[220px]">
              <div className="font-semibold text-slate-800 truncate" title={item.name}>
                {item.name}
              </div>
              {item.brandModel && (
                <div className="text-[11px] text-slate-500 truncate" title={item.brandModel}>
                  {item.brandModel}
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'category',
        header: 'Kategori',
        cell: ({ row }) => (
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium border border-slate-200">
            {row.original.category}
          </span>
        ),
      },
      {
        id: 'location',
        header: 'Konum / Oda',
        cell: ({ row }) => {
          const item = row.original;
          const bldStr = item.buildingName
            ? `${item.buildingName}${item.floorName ? ` - ${item.floorName}` : ''}`
            : null;
          const roomStr = item.roomNumber
            ? `Oda ${item.roomNumber}${item.roomName ? ` (${item.roomName})` : ''}`
            : item.location || '-';

          return (
            <div className="text-xs text-slate-700 max-w-[200px]">
              {bldStr && <div className="font-medium truncate">{bldStr}</div>}
              <div className="text-slate-500 truncate">{roomStr}</div>
            </div>
          );
        },
      },
      {
        accessorKey: 'departmentName',
        header: 'Müdürlük',
        cell: ({ row }) => (
          <div className="text-xs text-slate-700 max-w-[170px] truncate" title={row.original.departmentName || row.original.unit || '-'}>
            {row.original.departmentName || row.original.unit || '-'}
          </div>
        ),
      },
      {
        accessorKey: 'assignee',
        header: 'Zimmetli Personel',
        cell: ({ row }) => {
          const val = row.original.assignee;
          const isAssigned = val && !val.toLowerCase().includes('atanmamış');
          return (
            <span
              className={`text-xs ${
                isAssigned ? 'font-medium text-slate-800' : 'text-slate-400 italic'
              }`}
            >
              {val || 'Atanmamış'}
            </span>
          );
        },
      },
      {
        accessorKey: 'estimatedValue',
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-1 font-semibold text-slate-700 hover:text-blue-700 text-xs text-right w-full justify-end"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Rayiç Değer
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
            {formatCurrency(row.original.estimatedValue)}
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Yaşam Döngüsü',
        cell: ({ row }) => (
          <StatusBadge status={row.original.lifecycleStatus || row.original.status} />
        ),
      },
      {
        id: 'actions',
        header: () => <div className="text-right">Eylemler</div>,
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                data-open-detail-id={item.id}
                onClick={() => {
                  setSelectedAssetIdForDetail(item.id);
                  setIsDetailOpen(true);
                }}
                className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                title="Detay Görüntüle"
              >
                <Eye className="w-4 h-4" />
              </button>

              {canWrite && (
                <>
                  <button
                    type="button"
                    data-action="transfer"
                    data-id={item.id}
                    onClick={() => {
                      setAssetToTransfer(item);
                      setIsTransferOpen(true);
                    }}
                    className="p-1.5 text-slate-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
                    title="Konum Transferi"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    data-action="lifecycle"
                    data-id={item.id}
                    onClick={() => {
                      setAssetForLifecycle(item);
                      setLifecyclePreselectedTarget(undefined);
                      setIsLifecycleOpen(true);
                    }}
                    className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                    title="Yaşam Döngüsü Geçişi"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    data-action="edit"
                    data-id={item.id}
                    onClick={() => {
                      setAssetToEdit(item);
                      setIsFormOpen(true);
                    }}
                    className="p-1.5 text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Düzenle"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </>
              )}

              {canDelete && (
                <button
                  type="button"
                  data-action="delete"
                  data-id={item.id}
                  onClick={() => {
                    setAssetToDelete(item);
                    setIsDeleteOpen(true);
                  }}
                  className="p-1.5 text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Sil (Arşive Al)"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        },
      },
    ],
    [canWrite, canDelete]
  );

  // TanStack Table Instance
  const table = useReactTable({
    data: assets,
    columns,
    state: {
      globalFilter,
      sorting,
      pagination,
    },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const q = String(filterValue).toLowerCase().trim();
      if (!q) return true;
      const asset = row.original;
      return Boolean(
        asset.code?.toLowerCase().includes(q) ||
          asset.name?.toLowerCase().includes(q) ||
          asset.barcode?.toLowerCase().includes(q) ||
          asset.serialNumber?.toLowerCase().includes(q) ||
          asset.brandModel?.toLowerCase().includes(q) ||
          asset.departmentName?.toLowerCase().includes(q) ||
          asset.assignee?.toLowerCase().includes(q) ||
          asset.roomNumber?.toLowerCase().includes(q)
      );
    },
  });

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Demirbaş ve Varlık Envanteri
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Gebze Belediyesi kurumsal taşınır demirbaş kayıtları ve 11 durumlu yaşam döngüsü yönetimi
          </p>
        </div>

        {canWrite && (
          <button
            type="button"
            id="btn-open-asset-form"
            onClick={() => {
              setAssetToEdit(null);
              setIsFormOpen(true);
            }}
            className="inline-flex items-center px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-sm transition-colors shrink-0"
          >
            <Plus className="w-4 h-4 mr-2" />
            Yeni Varlık Ekle
          </button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Global Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              id="asset-query"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Varlık kodu, adı, seri no veya barkod..."
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-600 transition-all"
            />
          </div>

          {/* Department Filter */}
          <div>
            <select
              id="asset-filter-dept"
              value={filterDept}
              disabled={user?.role === 'DEPT_MANAGER'}
              onChange={(e) => setFilterDept(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-600 transition-all disabled:bg-slate-100 disabled:text-slate-500"
            >
              <option value="">Tüm Müdürlükler ({departments.length})</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              id="asset-filter-cat"
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-600 transition-all"
            >
              <option value="">Tüm Kategoriler ({categories.length})</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <select
              id="asset-filter-status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-600 transition-all"
            >
              <option value="">Tüm Durumlar</option>
              <option value="KAYDEDILDI">Kaydedildi (Depoda)</option>
              <option value="ZIMMETLENDI">Zimmetlendi</option>
              <option value="KULLANIMDA">Kullanımda (Ortak)</option>
              <option value="BAKIMDA">Bakımda</option>
              <option value="PASIF_ASKIDA">Pasif / Askıda</option>
              <option value="HURDAYA_AYRILDI">Hurdaya Ayrıldı (HEK)</option>
              <option value="ZAYIAT_CALINMA">Zayiat / Çalınma</option>
            </select>

            {(globalFilter || filterDept || filterCat || filterStatus) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-slate-200 transition-colors shrink-0"
                title="Filtreleri Temizle"
              >
                <FilterX className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Results Info */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <div>
            Toplam <strong>{assets.length}</strong> kayıt &bull; Filtrelenen:{' '}
            <strong>{table.getFilteredRowModel().rows.length}</strong> varlık
          </div>
          {isLoading && (
            <div className="flex items-center text-blue-600">
              <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
              Yenileniyor...
            </div>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading && assets.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-blue-600" />
            <p className="text-sm font-medium">Demirbaş kayıtları yükleniyor...</p>
          </div>
        ) : table.getRowModel().rows.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">Varlık Kaydı Bulunamadı</h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
              Arama kriterlerine uygun demirbaş kaydı bulunamadı. Filtreleri temizleyebilir veya yeni
              varlık kaydı ekleyebilirsiniz.
            </p>
            {(globalFilter || filterDept || filterCat || filterStatus) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-4 inline-flex items-center px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <FilterX className="w-3.5 h-3.5 mr-1.5" />
                Filtreleri Sıfırla
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200/80">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th key={header.id} className="px-4 py-3 font-semibold text-slate-700">
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-slate-100">
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50/80 transition-colors cursor-default"
                  >
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

        {/* Pagination Bar */}
        {table.getPageCount() > 1 && (
          <div className="p-4 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <span>Sayfa başına:</span>
              <select
                value={table.getState().pagination.pageSize}
                onChange={(e) => table.setPageSize(Number(e.target.value))}
                className="px-2 py-1 rounded-lg border border-slate-300 bg-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {[10, 15, 25, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              <span className="text-slate-400">|</span>
              <span>
                Toplam <strong>{table.getFilteredRowModel().rows.length}</strong> varlıktan{' '}
                <strong>
                  {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
                </strong>
                -
                <strong>
                  {Math.min(
                    (table.getState().pagination.pageIndex + 1) *
                      table.getState().pagination.pageSize,
                    table.getFilteredRowModel().rows.length
                  )}
                </strong>{' '}
                arası gösteriliyor
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-medium">
                Sayfa {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 1. Asset Detail Modal */}
      <AssetDetailModal
        assetId={selectedAssetIdForDetail}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedAssetIdForDetail(null);
        }}
        onOpenTransfer={(asset) => {
          setAssetToTransfer(asset);
          setIsTransferOpen(true);
        }}
        onOpenLifecycle={(asset, target) => {
          setAssetForLifecycle(asset);
          setLifecyclePreselectedTarget(target);
          setIsLifecycleOpen(true);
        }}
        onOpenEdit={(asset) => {
          setAssetToEdit(asset);
          setIsFormOpen(true);
        }}
      />

      {/* 2. Asset Form Modal (Create / Edit) */}
      <AssetFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setAssetToEdit(null);
        }}
        assetToEdit={assetToEdit}
        onSuccess={() => {
          refetch();
        }}
      />

      {/* 3. Asset Transfer Modal */}
      <AssetTransferModal
        isOpen={isTransferOpen}
        onClose={() => {
          setIsTransferOpen(false);
          setAssetToTransfer(null);
        }}
        asset={assetToTransfer}
        onSuccess={() => {
          refetch();
        }}
      />

      {/* 4. Asset Lifecycle Modal */}
      <AssetLifecycleModal
        isOpen={isLifecycleOpen}
        onClose={() => {
          setIsLifecycleOpen(false);
          setAssetForLifecycle(null);
          setLifecyclePreselectedTarget(undefined);
        }}
        asset={assetForLifecycle}
        preselectedTarget={lifecyclePreselectedTarget}
        onSuccess={() => {
          refetch();
        }}
      />

      {/* 5. Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setAssetToDelete(null);
        }}
        asset={assetToDelete}
        onSuccess={() => {
          refetch();
        }}
      />
    </div>
  );
};
