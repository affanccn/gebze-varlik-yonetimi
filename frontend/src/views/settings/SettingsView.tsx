import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { enterpriseService } from '../../services/enterpriseService';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../hooks/useAuth';
import {
  Settings,
  Shield,
  Save,
  RefreshCw,
  Sliders,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { permissions } = useAuth();
  const isAdmin = permissions.isAdmin;
  const { showToast } = useToast();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [paramValue, setParamValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const {
    data: settings = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['settings'],
    queryFn: () => enterpriseService.getSettings(),
  });

  const handleStartEdit = (key: string, val: string) => {
    setEditingKey(key);
    setParamValue(val);
  };

  const handleSave = async (key: string) => {
    setIsSaving(true);
    try {
      await enterpriseService.updateSetting(key, paramValue);
      showToast(`'${key}' parametresi başarıyla güncellendi.`);
      setEditingKey(null);
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ayar kaydedilemedi.';
      showToast(msg, 'warning');
    } finally {
      setIsSaving(false);
    }
  };

  // RBAC Permission Matrix
  const matrix = [
    { module: 'Demirbaş ve Varlık Listesi', admin: 'Tam Yetki', manager: 'Kendi Müdürlüğü', staff: 'Salt Okunur (Zimmetliler)', auditor: 'Tam Görünüm', viewer: 'Tüm Kurum / Kendi' },
    { module: 'Yeni Varlık Kaydı & Güncelleme', admin: '✓', manager: '✓ (Kendi Müdürlüğü)', staff: '✗', auditor: '✗', viewer: '✗' },
    { module: 'Varlık Silme (Soft-Delete)', admin: '✓', manager: '✗', staff: '✗', auditor: '✗', viewer: '✗' },
    { module: 'Konum & Birim Transferi', admin: '✓', manager: '✓ (Kendi Varlıkları)', staff: '✗', auditor: '✗', viewer: '✗' },
    { module: 'Yaşam Döngüsü FSM Geçişleri', admin: '✓', manager: '✓', staff: '✗', auditor: '✗', viewer: '✗' },
    { module: 'Zimmet Fişi Düzenleme & İade', admin: '✓', manager: '✓', staff: '✗', auditor: '✗', viewer: '✗' },
    { module: 'Bakım ve Onarım İş Emirleri', admin: '✓', manager: '✓', staff: '✗ (Erişim Yok)', auditor: 'Salt Okunur', viewer: 'Salt Okunur' },
    { module: 'Depo & Sarf Malzeme Hareketi', admin: '✓', manager: '✓', staff: '✗ (Erişim Yok)', auditor: 'Salt Okunur', viewer: 'Salt Okunur' },
    { module: 'Excel Toplu İçe Aktarım', admin: '✓ (Tüm Kurum)', manager: '✓ (Kendi Müdürlüğü)', staff: '✗ (403)', auditor: '✗ (403)', viewer: '✗ (403)' },
    { module: 'Fiziksel Sayım & Barkod Okutma', admin: '✓', manager: '✓', staff: '✗ (Erişim Yok)', auditor: '✓', viewer: 'Salt Okunur' },
    { module: 'Güvenlik & Denetim Günlüğü', admin: '✓', manager: '✗ (Erişim Yok)', staff: '✗ (Erişim Yok)', auditor: '✓', viewer: '✗ (Erişim Yok)' },
    { module: 'Kullanıcı Hesap Yönetimi', admin: '✓ (Tam Yetki)', manager: '✗ (Erişim Yok)', staff: '✗ (Erişim Yok)', auditor: '✗ (Erişim Yok)', viewer: '✗ (Erişim Yok)' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-slate-700" />
            Sistem Ayarları & Kurumsal Yetki Matrisi
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Genel kurumsal parametreler, oturum süreleri, güvenlik kuralları ve rol bazlı erişim denetimi (RBAC).
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

      {/* Section 1: System Parameters */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-blue-600" />
          Sistem ve İşletim Parametreleri
        </h2>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500">Parametreler yükleniyor...</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {settings.map((s) => {
                const isEditing = editingKey === s.paramKey;

                return (
                  <div key={s.paramKey} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                    <div className="space-y-0.5 max-w-xl">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {s.paramKey}
                        </span>
                        <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                          {s.paramGroup}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600">{s.description}</div>
                      <div className="text-[11px] text-slate-400 font-mono">Son Güncelleme: {s.updatedAt}</div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={paramValue}
                            onChange={(e) => setParamValue(e.target.value)}
                            className="px-3 py-1.5 text-xs border border-blue-500 rounded-lg focus:ring-2 focus:ring-blue-300 font-mono"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSave(s.paramKey)}
                            disabled={isSaving}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-50 flex items-center gap-1"
                          >
                            <Save className="w-3.5 h-3.5" />
                            Kaydet
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingKey(null)}
                            className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                          >
                            İptal
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs font-bold text-slate-800 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                            {s.paramValue}
                          </span>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleStartEdit(s.paramKey, s.paramValue)}
                              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors shadow-xs"
                            >
                              Düzenle
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Section 2: Security & RBAC Permission Matrix */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-600" />
          Kurumsal Rol Yetki Matrisi (RBAC Güvenlik Tablosu)
        </h2>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Modül / İşlem</th>
                  <th className="px-4 py-3 text-rose-700 font-bold">ADMIN</th>
                  <th className="px-4 py-3 text-blue-700 font-bold">DEPT_MANAGER</th>
                  <th className="px-4 py-3 text-teal-700 font-bold">STAFF</th>
                  <th className="px-4 py-3 text-purple-700 font-bold">AUDITOR</th>
                  <th className="px-4 py-3 text-slate-700 font-bold">VIEWER</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {matrix.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900">{row.module}</td>
                    <td className="px-4 py-3 text-slate-800">{row.admin}</td>
                    <td className="px-4 py-3 text-slate-700">{row.manager}</td>
                    <td className="px-4 py-3 text-slate-600">{row.staff}</td>
                    <td className="px-4 py-3 text-slate-600">{row.auditor}</td>
                    <td className="px-4 py-3 text-slate-600">{row.viewer}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
