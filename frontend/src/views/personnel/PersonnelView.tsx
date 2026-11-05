import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  Search,
  Phone,
  Mail,
  Package,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Pencil,
  Trash2,
  AlertTriangle,
  FileSpreadsheet,
  RefreshCw,
} from 'lucide-react';
import { personnelService } from '../../services/personnelService';
import { hierarchyService } from '../../services/hierarchyService';
import { assetService } from '../../services/assetService';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';
import { Card } from '../../components/common/Card';
import { Modal } from '../../components/common/Modal';
import { StatusBadge } from '../../components/common/Badge';
import { Personnel } from '../../types/personnel';
import { Department } from '../../types/hierarchy';
import { PageResponse } from '../../types/api';
import { PersonnelFormModal } from './PersonnelFormModal';
import { PersonnelImportModal } from './PersonnelImportModal';

export const PersonnelView: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlPage = Math.max(0, parseInt(searchParams.get('page') || '0', 10));
  const urlSize = Math.min(200, Math.max(1, parseInt(searchParams.get('size') || '20', 10)));
  const urlDept = searchParams.get('dept') || '';
  const urlQ = searchParams.get('q') || '';
  const urlSort = searchParams.get('sort') || '';

  const [searchInput, setSearchInput] = useState(urlQ);
  const [debouncedQ, setDebouncedQ] = useState(urlQ);
  const [selectedPersonnel, setSelectedPersonnel] = useState<Personnel | null>(null);

  // Modallar
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [personnelToEdit, setPersonnelToEdit] = useState<Personnel | null>(null);
  const [personnelToDelete, setPersonnelToDelete] = useState<Personnel | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const canManage = user?.role === 'ADMIN' || user?.role === 'DEPT_MANAGER';

  const handleSyncHr = async () => {
    setIsSyncing(true);
    try {
      const res = await personnelService.syncHr();
      showToast(res.message, 'success');
      queryClient.invalidateQueries({ queryKey: ['personnel'] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'İK senkronizasyonu sırasında hata oluştu.';
      showToast(msg, 'warning');
    } finally {
      setIsSyncing(false);
    }
  };

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

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQ(searchInput);
      if (searchInput !== urlQ) {
        updateParams({ q: searchInput || undefined, page: 0 });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // 1. Müdürlükler listesi (filtre select için)
  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: hierarchyService.getDepartments,
  });

  // 2. Personel listesi query
  const { data: pageData, isLoading } = useQuery<PageResponse<Personnel>>({
    queryKey: ['personnel', urlDept, urlPage, urlSize, debouncedQ, urlSort],
    queryFn: () =>
      personnelService.getAll({
        departmentId: urlDept ? Number(urlDept) : undefined,
        query: debouncedQ || undefined,
        page: urlPage,
        size: urlSize,
        sort: urlSort || undefined,
      }),
    placeholderData: keepPreviousData,
  });

  const personnelList = pageData?.items || [];
  const total = pageData?.total || 0;
  const totalPages = pageData?.totalPages || 0;

  // 3. Seçili personelin zimmetli varlıkları (assignedPersonnelId filtresi ile)
  const { data: assignedAssetsData } = useQuery({
    queryKey: ['personnel-assets', selectedPersonnel?.id],
    queryFn: () => assetService.getAll({ assignedPersonnelId: selectedPersonnel!.id, size: 200 }),
    enabled: selectedPersonnel != null,
  });
  const assignedAssets = assignedAssetsData?.items || [];

  const handleDelete = async () => {
    if (!personnelToDelete) return;
    setIsDeleting(true);
    try {
      await personnelService.delete(personnelToDelete.id);
      showToast(`'${personnelToDelete.fullName}' personeli başarıyla pasife alındı.`);
      queryClient.invalidateQueries({ queryKey: ['personnel'] });
      setPersonnelToDelete(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Personel silinirken hata oluştu.';
      showToast(msg, 'warning');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Personel Yönetimi
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gebze Belediyesi çalışanları, birim dağılımları ve zimmet takip listesi
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {canManage && (
            <>
              <button
                type="button"
                id="btn-open-personnel-form"
                onClick={() => {
                  setPersonnelToEdit(null);
                  setIsFormOpen(true);
                }}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 shadow-sm transition-colors shrink-0"
              >
                <UserPlus className="w-4 h-4" />
                Yeni Personel Ekle
              </button>

              <button
                type="button"
                id="btn-open-personnel-import"
                onClick={() => setIsImportOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 shadow-sm transition-colors shrink-0"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Toplu İçe Aktar (Excel)
              </button>

              {user?.role === 'ADMIN' && (
                <button
                  type="button"
                  id="btn-sync-hr"
                  onClick={handleSyncHr}
                  disabled={isSyncing}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold hover:bg-slate-900 shadow-sm transition-colors shrink-0 disabled:opacity-50"
                  title="Belediye İK Sistemi ile Kadro Listesini Eşitle"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Eşitleniyor...' : 'İK Eşitle'}
                </button>
              )}
            </>
          )}

          <select
            value={urlDept}
            onChange={(e) => updateParams({ dept: e.target.value || undefined, page: 0 })}
            className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-gebze-navy/20"
          >
            <option value="">Tüm Müdürlükler ({departments.length})</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <div className="w-full sm:w-64">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Ad, unvan, sicil no ara..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gebze-navy/20"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Personel Tablosu */}
      <Card
        title={`Belediye Personeli (${total})`}
        subtitle="Zimmetli demirbaşları listelemek veya incelemek için personeli seçin"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Sicil No</th>
                <th className="py-3 px-4">Ad Soyad / Görevi</th>
                <th className="py-3 px-4">Müdürlük & Birim</th>
                <th className="py-3 px-4">Oda / Lokasyon</th>
                <th className="py-3 px-4">İletişim</th>
                <th className="py-3 px-3 text-center">Durum</th>
                <th className="py-3 px-4 text-center">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
              {isLoading && personnelList.length === 0 ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="py-3 px-4">
                      <div className="h-4 bg-slate-100 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : personnelList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    Arama kriterlerinize uygun personel bulunamadı.
                  </td>
                </tr>
              ) : (
                personnelList.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-gebze-navy">
                      <span className="bg-slate-100 px-2 py-0.5 rounded">{p.registrationNumber}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 text-sm">{p.fullName}</span>
                      <p className="text-slate-500 text-[11px] mt-0.5">{p.title || 'Personel'}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-800">{p.departmentName || '-'}</span>
                      {p.subUnitName && (
                        <p className="text-slate-500 text-[11px]">{p.subUnitName}</p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {p.roomNumber ? (
                        <span>Oda {p.roomNumber} {p.roomName ? `(${p.roomName})` : ''}</span>
                      ) : (
                        <span className="text-slate-400 italic">Oda Tanımsız</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-0.5 text-[11px]">
                        {p.phone && (
                          <div className="flex items-center gap-1 text-slate-600">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {p.phone}
                          </div>
                        )}
                        {p.email && (
                          <div className="flex items-center gap-1 text-slate-600">
                            <Mail className="w-3 h-3 text-slate-400" />
                            {p.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {p.isActive ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedPersonnel(p)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-gebze-navy hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded transition-colors"
                          title="Zimmetli Varlıkları Gör"
                        >
                          <Package className="w-3.5 h-3.5" />
                          Zimmetleri Gör
                        </button>
                        {canManage && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setPersonnelToEdit(p);
                                setIsFormOpen(true);
                              }}
                              className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                              title="Personeli Düzenle"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setPersonnelToDelete(p)}
                              className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                              title="Personeli Sil (Pasife Al)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {total > 0 && (
          <div className="p-4 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 bg-slate-50/50 rounded-b-xl mt-2">
            <div className="flex items-center gap-2">
              <span>Sayfa başına:</span>
              <select
                value={urlSize}
                onChange={(e) => updateParams({ size: Number(e.target.value), page: 0 })}
                className="px-2 py-1 rounded-lg border border-slate-300 bg-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-gebze-navy"
              >
                {[10, 20, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              <span className="text-slate-400">|</span>
              <span>
                Toplam <strong>{total}</strong> personelden{' '}
                <strong>{urlPage * urlSize + 1}</strong> -{' '}
                <strong>{Math.min((urlPage + 1) * urlSize, total)}</strong> arası gösteriliyor
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => updateParams({ page: Math.max(0, urlPage - 1) })}
                disabled={urlPage === 0}
                className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Önceki Sayfa"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-medium">
                Sayfa {urlPage + 1} / {Math.max(1, totalPages)}
              </span>
              <button
                type="button"
                onClick={() => updateParams({ page: urlPage + 1 })}
                disabled={urlPage >= totalPages - 1}
                className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Sonraki Sayfa"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Personele Zimmetli Varlıklar Modalı */}
      <Modal
        isOpen={selectedPersonnel != null}
        onClose={() => setSelectedPersonnel(null)}
        title={selectedPersonnel ? `${selectedPersonnel.fullName}` : 'Personel Zimmetleri'}
        subtitle={selectedPersonnel ? `Sicil: ${selectedPersonnel.registrationNumber} • ${selectedPersonnel.departmentName || ''}` : ''}
        maxWidth="2xl"
      >
        {selectedPersonnel && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500">Görevi:</span>{' '}
                <strong className="text-slate-800">{selectedPersonnel.title || 'Personel'}</strong>
              </div>
              <div>
                <span className="text-slate-500">Müdürlük:</span>{' '}
                <strong className="text-slate-800">{selectedPersonnel.departmentName || '-'}</strong>
              </div>
              {selectedPersonnel.roomNumber && (
                <div>
                  <span className="text-slate-500">Oda:</span>{' '}
                  <strong className="text-slate-800">{selectedPersonnel.roomNumber}</strong>
                </div>
              )}
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-2">
                Personele Zimmetli Varlıklar ({assignedAssets.length})
              </h4>
              <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold uppercase sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Varlık Kodu</th>
                      <th className="py-2 px-3">Demirbaş Adı</th>
                      <th className="py-2 px-3">Kategori</th>
                      <th className="py-2 px-3">Konum</th>
                      <th className="py-2 px-3 text-right">Durum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {assignedAssets.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-500">
                          Bu personele tahsis edilmiş zimmetli demirbaş bulunmuyor.
                        </td>
                      </tr>
                    ) : (
                      assignedAssets.map((asset) => (
                        <tr key={asset.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono font-semibold text-gebze-navy">{asset.code}</td>
                          <td className="py-2 px-3 font-medium text-slate-900">{asset.name}</td>
                          <td className="py-2 px-3 text-slate-500">{asset.category || '-'}</td>
                          <td className="py-2 px-3 text-slate-600">{asset.roomNumber ? `Oda ${asset.roomNumber}` : asset.location || '-'}</td>
                          <td className="py-2 px-3 text-right">
                            <StatusBadge status={asset.status} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Personel Ekle / Düzenle Modalı */}
      <PersonnelFormModal
        isOpen={isFormOpen}
        personnelToEdit={personnelToEdit}
        onClose={() => {
          setIsFormOpen(false);
          setPersonnelToEdit(null);
        }}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['personnel'] });
        }}
      />

      {/* Toplu Personel İçe Aktarma Modalı */}
      <PersonnelImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['personnel'] });
        }}
      />

      {/* Personel Silme Onay Modalı */}
      <Modal
        isOpen={personnelToDelete != null}
        onClose={() => setPersonnelToDelete(null)}
        title="Personeli Pasife Al"
        maxWidth="md"
      >
        {personnelToDelete && (
          <div className="space-y-4">
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-800 space-y-1">
                <div className="font-semibold text-rose-900">
                  Personeli silmek istediğinize emin misiniz?
                </div>
                <div>
                  <strong>{personnelToDelete.fullName}</strong> ({personnelToDelete.registrationNumber}) personeli pasife alınacaktır.
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPersonnelToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Siliniyor...' : 'Evet, Pasife Al'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
