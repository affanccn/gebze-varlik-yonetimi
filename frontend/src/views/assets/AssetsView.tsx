import React, { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  ColumnDef,
  flexRender,
  SortingState,
} from '@tanstack/react-table';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
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
import { BulkImportModal } from './BulkImportModal';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileSpreadsheet,
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
  const queryClient = useQueryClient();
  const { canWrite, canDelete, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL state
  const urlPage = Math.max(0, parseInt(searchParams.get('page') || '0', 10));
  const urlSize = Math.min(200, Math.max(1, parseInt(searchParams.get('size') || '15', 10)));
  const urlQ = searchParams.get('q') || '';
  const urlDept = searchParams.get('dept') || '';
  const urlCat = searchParams.get('cat') || '';
  const urlStatus = searchParams.get('status') || '';
  const urlSort = searchParams.get('sort') || '';

  // Local search input for debouncing
  const [searchInput, setSearchInput] = useState(urlQ);
  const [debouncedQ, setDebouncedQ] = useState(urlQ);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQ(searchInput);
      if (searchInput !== urlQ) {
        updateParams({ q: searchInput || undefined, page: 0 });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Sync sorting state from URL
  const initialSorting: SortingState = useMemo(() => {
    if (!urlSort) return [];
    const [id, dir] = urlSort.split(',');
    return [{ id, desc: dir?.toUpperCase() === 'DESC' }];
  }, [urlSort]);

  const [sorting, setSorting] = useState<SortingState>(initialSorting);

  const updateParams = (updates: Record<string, string | number | undefined | null>) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        Object.entries(updates).forEach(([k, v]) => {
          if (v === undefined || v === null || v === '' || (k === 'page' && v === 0)) {
            next.delete(k);
          } else {
            next.set(k, String(v));
          }
        });
        return next;
      },
      { replace: true }
    );
  };

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

  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

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
    data: pageData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['assets', urlPage, urlSize, debouncedQ, urlDept, urlCat, urlStatus, urlSort],
    queryFn: () =>
      assetService.getAll({
        page: urlPage,
        size: urlSize,
        q: debouncedQ || undefined,
        departmentId: urlDept ? Number(urlDept) : undefined,
        categoryId: urlCat ? Number(urlCat) : undefined,
        status: urlStatus || undefined,
        sort: urlSort || undefined,
      }),
    placeholderData: keepPreviousData,
  });

  const assets = pageData?.items || [];
  const total = pageData?.total || 0;
  const totalPages = pageData?.totalPages || 0;

  // Reset filters
  const handleResetFilters = () => {
    setSearchInput('');
    setDebouncedQ('');
    updateParams({
      q: undefined,
      dept: undefined,
      cat: undefined,
      status: undefined,
      sort: undefined,
      page: 0,
    });
    setSorting([]);
  };

  // TanStack Table Columns
  const columns = useMemo<ColumnDef<Asset>[]>(
    () => [
      {
        accessorKey: 'code',
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-1 font-semibold text-slate-700 hover:text-blue-700 text-xs whitespace-nowrap"
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
            <div className="whitespace-nowrap">
              <span className="font-mono text-xs font-bold text-blue-700">{item.code}</span>
              {item.barcode && (
                <div className="text-[10px] font-mono text-slate-500 mt-0.5">{item.barcode}</div>
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
            className="flex items-center gap-1 font-semibold text-slate-700 hover:text-blue-700 text-xs whitespace-nowrap"
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
            <div className="max-w-[160px] xl:max-w-[220px]">
              <div className="font-semibold text-slate-800 truncate" title={item.name}>
                {item.name}
              </div>
              {item.brandModel && (
                <div className="text-[10px] text-slate-500 truncate" title={item.brandModel}>
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
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium border border-slate-200 whitespace-nowrap inline-block">
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
            <div className="text-xs text-slate-700 max-w-[130px] xl:max-w-[180px]">
              {bldStr && <div className="font-medium truncate" title={bldStr}>{bldStr}</div>}
              <div className="text-slate-500 truncate text-[11px]" title={roomStr}>{roomStr}</div>
            </div>
          );
        },
      },
      {
        accessorKey: 'departmentName',
        header: 'Müdürlük',
        cell: ({ row }) => (
          <div className="text-xs text-slate-700 max-w-[130px] xl:max-w-[170px] truncate" title={row.original.departmentName || row.original.unit || '-'}>
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
            <div className="max-w-[120px] xl:max-w-[160px] truncate" title={val || 'Atanmamış'}>
              <span
                className={`text-xs ${
                  isAssigned ? 'font-medium text-slate-800' : 'text-slate-400 italic'
                }`}
              >
                {val || 'Atanmamış'}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: 'estimatedValue',
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-1 font-semibold text-slate-700 hover:text-blue-700 text-xs text-right w-full justify-end whitespace-nowrap"
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
          <div className="text-right font-mono text-xs font-semibold text-slate-800 whitespace-nowrap">
            {formatCurrency(row.original.estimatedValue)}
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Yaşam Döngüsü',
        cell: ({ row }) => (
          <div className="whitespace-nowrap">
            <StatusBadge status={row.original.lifecycleStatus || row.original.status} />
          </div>
        ),
      },
      {
        id: 'actions',
        header: () => <div className="text-right whitespace-nowrap pr-1">Eylemler</div>,
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex items-center justify-end gap-1">
              <button
                type="button"
                data-open-detail-id={item.id}
                onClick={() => {
                  setSelectedAssetIdForDetail(item.id);
                  setIsDetailOpen(true);
                }}
                className="p-1 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
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
                    className="p-1 text-slate-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
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
    pageCount: totalPages,
    manualPagination: true,
    manualSorting: true,
    state: {
      sorting,
      pagination: {
        pageIndex: urlPage,
        pageSize: urlSize,
      },
    },
    onSortingChange: (updater) => {
      const nextSorting = typeof updater === 'function' ? updater(sorting) : updater;
      setSorting(nextSorting);
      const sortStr = nextSorting.length
        ? `${nextSorting[0].id},${nextSorting[0].desc ? 'DESC' : 'ASC'}`
        : undefined;
      updateParams({ sort: sortStr, page: 0 });
    },
    onPaginationChange: (updater) => {
      const current = { pageIndex: urlPage, pageSize: urlSize };
      const next = typeof updater === 'function' ? updater(current) : updater;
      updateParams({
        page: next.pageIndex,
        size: next.pageSize !== urlSize ? next.pageSize : undefined,
      });
    },
    getCoreRowModel: getCoreRowModel(),
  });

  const handleExportCsv = () => {
    const exportUrl = assetService.getExportUrl({
      q: urlQ || undefined,
      departmentId: urlDept ? Number(urlDept) : undefined,
      categoryId: urlCat ? Number(urlCat) : undefined,
      status: urlStatus || undefined,
      sort: urlSort || undefined,
    });
    window.open(exportUrl, '_blank');
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Demirbaş ve Varlık Envanteri
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Gebze Belediyesi kurumsal taşınır demirbaş kayıtları ve 11 durumlu yaşam döngüsü yönetimi
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            id="btn-export-assets-csv"
            data-action="export-assets-csv"
            onClick={handleExportCsv}
            className="inline-flex items-center px-3.5 py-2 rounded-xl bg-white text-slate-700 border border-slate-300 text-xs sm:text-sm font-semibold hover:bg-slate-50 shadow-xs transition-all shrink-0"
            title="Filtrelenmiş varlıkları CSV (Excel) formatında indir"
          >
            <Download className="w-4 h-4 mr-2 text-blue-600" />
            CSV Dışa Aktar
          </button>

          {(user?.role === 'ADMIN' || user?.role === 'DEPT_MANAGER') && (
            <button
              type="button"
              id="btn-open-bulk-import"
              data-action="open-bulk-import"
              onClick={() => setIsBulkImportOpen(true)}
              className="inline-flex items-center px-3.5 py-2 rounded-xl bg-white text-slate-700 border border-slate-300 text-xs sm:text-sm font-semibold hover:bg-slate-50 shadow-xs transition-all shrink-0"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-600" />
              Excel ile Toplu Aktar
            </button>
          )}

          {canWrite && (
            <button
              type="button"
              id="btn-open-asset-form"
              onClick={() => {
                setAssetToEdit(null);
                setIsFormOpen(true);
              }}
              className="inline-flex items-center px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xs sm:text-sm font-semibold hover:from-blue-700 hover:to-blue-800 shadow-sm transition-all shrink-0"
            >
              <Plus className="w-4 h-4 mr-2" />
              Yeni Varlık Ekle
            </button>
          )}
        </div>
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
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Varlık kodu, adı, seri no veya barkod..."
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-600 transition-all"
            />
          </div>

          {/* Department Filter */}
          <div>
            <select
              id="asset-filter-dept"
              value={urlDept}
              disabled={user?.role === 'DEPT_MANAGER'}
              onChange={(e) => updateParams({ dept: e.target.value || undefined, page: 0 })}
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
              value={urlCat}
              onChange={(e) => updateParams({ cat: e.target.value || undefined, page: 0 })}
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
              value={urlStatus}
              onChange={(e) => updateParams({ status: e.target.value || undefined, page: 0 })}
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

            {(searchInput || urlDept || urlCat || urlStatus || urlSort) && (
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
            Toplam <strong>{total > 10000 ? '10.000+' : total}</strong> kayıt &bull; Bu sayfada:{' '}
            <strong>{assets.length}</strong> varlık
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
        ) : assets.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">Varlık Kaydı Bulunamadı</h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
              Arama kriterlerine uygun demirbaş kaydı bulunamadı. Filtreleri temizleyebilir veya yeni
              varlık kaydı ekleyebilirsiniz.
            </p>
            {(searchInput || urlDept || urlCat || urlStatus || urlSort) && (
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
                      <th key={header.id} className="px-3 py-2.5 font-semibold text-slate-700">
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
                      <td key={cell.id} className="px-3 py-2.5">
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
        {total > 0 && (
          <div className="p-4 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <span>Sayfa başına:</span>
              <select
                value={urlSize}
                onChange={(e) => updateParams({ size: Number(e.target.value), page: 0 })}
                className="px-2 py-1 rounded-lg border border-slate-300 bg-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {[10, 15, 25, 50, 100, 200].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              <span className="text-slate-400">|</span>
              <span>
                Toplam <strong>{total > 10000 ? '10.000+' : total}</strong> varlıktan{' '}
                <strong>{urlPage * urlSize + 1}</strong>-
                <strong>{Math.min((urlPage + 1) * urlSize, total)}</strong> arası gösteriliyor
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-medium">
                Sayfa {urlPage + 1} / {Math.max(1, totalPages)}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => updateParams({ page: Math.max(0, urlPage - 1) })}
                  disabled={urlPage <= 0 || isLoading}
                  className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Önceki Sayfa"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => updateParams({ page: urlPage + 1 })}
                  disabled={urlPage + 1 >= totalPages || isLoading}
                  className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Sonraki Sayfa"
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
          queryClient.invalidateQueries({ queryKey: ['assets'] });
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
          queryClient.invalidateQueries({ queryKey: ['assets'] });
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
          queryClient.invalidateQueries({ queryKey: ['assets'] });
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
          queryClient.invalidateQueries({ queryKey: ['assets'] });
          refetch();
        }}
      />

      {/* 6. Bulk Import Modal */}
      <BulkImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['assets'] });
          refetch();
        }}
      />
    </div>
  );
};
