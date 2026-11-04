import React, { useState, useMemo, useCallback } from 'react';
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
import { userService } from '../../services/userService';
import { UserResponse } from '../../types/user';
import { UserFormModal } from './UserFormModal';
import { ResetPasswordModal } from './ResetPasswordModal';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';
import {
  Users,
  Search,
  Plus,
  RefreshCw,
  UserCheck,
  UserX,
  KeyRound,
  ShieldAlert,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Pencil,
} from 'lucide-react';

export const UsersView: React.FC = () => {
  const { user: currentAdmin } = useAuth();
  const { showToast } = useToast();

  const [globalFilter, setGlobalFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PASSIVE'>('ALL');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }]);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<UserResponse | null>(null);

  const [isResetOpen, setIsResetOpen] = useState(false);
  const [userForReset, setUserForReset] = useState<UserResponse | null>(null);

  // Users Query
  const {
    data: users = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['users'],
    queryFn: () => userService.getAll(),
  });

  // KPIs
  const kpis = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.isActive && !u.isLocked).length;
    const passive = users.filter((u) => !u.isActive).length;
    const locked = users.filter((u) => u.isLocked).length;
    return { total, active, passive, locked };
  }, [users]);

  // Filtered dataset
  const filteredData = useMemo(() => {
    return users.filter((item) => {
      if (roleFilter && item.role !== roleFilter) return false;
      if (statusFilter === 'ACTIVE' && (!item.isActive || item.isLocked)) return false;
      if (statusFilter === 'PASSIVE' && item.isActive) return false;

      if (!globalFilter) return true;
      const q = globalFilter.toLowerCase();
      return (
        item.username.toLowerCase().includes(q) ||
        item.fullName.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q) ||
        item.departmentName?.toLowerCase().includes(q) ||
        item.roleLabel.toLowerCase().includes(q)
      );
    });
  }, [users, roleFilter, statusFilter, globalFilter]);

  // Deactivate handler
  const handleDeactivate = useCallback(
    async (u: UserResponse) => {
      if (confirm(`'${u.fullName}' (${u.username}) hesabını pasife almak istediğinize emin misiniz?`)) {
        try {
          await userService.deactivate(u.id);
          showToast(`'${u.username}' hesabı pasife alındı.`);
          refetch();
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Kullanıcı pasife alınamadı.';
          showToast(msg, 'warning');
        }
      }
    },
    [showToast, refetch]
  );

  // Columns definition
  const columns = useMemo<ColumnDef<UserResponse>[]>(
    () => [
      {
        accessorKey: 'username',
        header: 'Kullanıcı Adı',
        cell: ({ row }) => (
          <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            {row.original.username}
          </span>
        ),
      },
      {
        accessorKey: 'fullName',
        header: 'Adı Soyadı & İletişim',
        cell: ({ row }) => (
          <div>
            <div className="font-semibold text-slate-800 text-xs">{row.original.fullName}</div>
            <div className="text-xs text-slate-500">{row.original.email}</div>
          </div>
        ),
      },
      {
        accessorKey: 'role',
        header: 'Rol',
        cell: ({ row }) => {
          const r = row.original.role;
          let badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
          if (r === 'ADMIN') badgeClass = 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
          else if (r === 'DEPT_MANAGER') badgeClass = 'bg-blue-50 text-blue-700 border-blue-200';
          else if (r === 'STAFF') badgeClass = 'bg-teal-50 text-teal-700 border-teal-200';
          else if (r === 'AUDITOR') badgeClass = 'bg-purple-50 text-purple-700 border-purple-200';

          return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${badgeClass}`}>
              {row.original.roleLabel || r}
            </span>
          );
        },
      },
      {
        accessorKey: 'departmentName',
        header: 'Bağlı Müdürlük',
        cell: ({ row }) => (
          <span className="text-xs text-slate-600">
            {row.original.departmentName || 'Tüm Kurum'}
          </span>
        ),
      },
      {
        accessorKey: 'isActive',
        header: 'Durum',
        cell: ({ row }) => {
          const u = row.original;
          if (u.isLocked) {
            return (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                <ShieldAlert className="w-3 h-3 text-rose-600" />
                Kilitli
              </span>
            );
          }
          if (u.isActive) {
            return (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <UserCheck className="w-3 h-3 text-emerald-600" />
                Aktif
              </span>
            );
          }
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
              <UserX className="w-3 h-3 text-slate-400" />
              Pasif
            </span>
          );
        },
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-1 font-semibold text-slate-700 hover:text-blue-700 text-xs"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Kayıt Tarihi
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
          const d = row.original.createdAt;
          return <span className="font-mono text-xs text-slate-500">{d ? d.substring(0, 10) : '—'}</span>;
        },
      },
      {
        id: 'actions',
        header: () => <div className="text-right">Eylemler</div>,
        cell: ({ row }) => {
          const u = row.original;
          const isSelf = currentAdmin?.username === u.username;

          return (
            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                data-edit-user-id={u.id}
                onClick={() => {
                  setUserToEdit(u);
                  setIsFormOpen(true);
                }}
                className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                title="Düzenle"
              >
                <Pencil className="w-4 h-4" />
              </button>

              <button
                type="button"
                data-reset-user-id={u.id}
                onClick={() => {
                  setUserForReset(u);
                  setIsResetOpen(true);
                }}
                className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                title="Şifre Sıfırla"
              >
                <KeyRound className="w-4 h-4" />
              </button>

              {!isSelf && u.isActive && (
                <button
                  type="button"
                  data-deactivate-user-id={u.id}
                  onClick={() => handleDeactivate(u)}
                  className="p-1.5 text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Hesabı Pasife Al"
                >
                  <UserX className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        },
      },
    ],
    [currentAdmin, handleDeactivate]
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
            <Users className="w-6 h-6 text-blue-600" />
            Kullanıcı Hesap Yönetimi ve Güvenlik
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Sistem kullanıcıları, rol atamaları, şifre sıfırlama ve hesap erişim kısıtlamaları (Sadece ADMIN).
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

          <button
            type="button"
            id="btn-open-user-form"
            data-action="new-user"
            onClick={() => {
              setUserToEdit(null);
              setIsFormOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Yeni Kullanıcı Ekle
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Toplam Hesap</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{kpis.total}</div>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Aktif Kullanıcı</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{kpis.active}</div>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pasif Hesap</div>
          <div className="text-2xl font-bold text-slate-700 mt-1">{kpis.passive}</div>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Kilitli Hesap</div>
          <div className="text-2xl font-bold text-rose-700 mt-1">{kpis.locked}</div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            id="user-search"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Kullanıcı adı, isim veya e-posta ara..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <select
            id="user-filter-role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          >
            <option value="">Tüm Roller</option>
            <option value="ADMIN">Sistem Yöneticisi (ADMIN)</option>
            <option value="DEPT_MANAGER">Müdürlük Yöneticisi (DEPT_MANAGER)</option>
            <option value="STAFF">Saha / Taşınır Personeli (STAFF)</option>
            <option value="AUDITOR">İç Denetçi / Müfettiş (AUDITOR)</option>
            <option value="VIEWER">Görüntüleyici (VIEWER)</option>
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
            onClick={() => setStatusFilter('ACTIVE')}
            className={`flex-1 py-1 rounded-md font-medium transition-colors ${
              statusFilter === 'ACTIVE' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Aktifler
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('PASSIVE')}
            className={`flex-1 py-1 rounded-md font-medium transition-colors ${
              statusFilter === 'PASSIVE' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Pasifler
          </button>
        </div>
      </div>

      {/* TanStack Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
            <span>Kullanıcı hesapları yükleniyor...</span>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            Filtrelere uygun kullanıcı kaydı bulunamadı.
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
              Toplam <strong>{filteredData.length}</strong> kullanıcıdan{' '}
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
      <UserFormModal
        isOpen={isFormOpen}
        userToEdit={userToEdit}
        onClose={() => {
          setIsFormOpen(false);
          setUserToEdit(null);
        }}
        onSuccess={() => refetch()}
      />

      <ResetPasswordModal
        isOpen={isResetOpen}
        user={userForReset}
        onClose={() => {
          setIsResetOpen(false);
          setUserForReset(null);
        }}
        onSuccess={() => refetch()}
      />
    </div>
  );
};
