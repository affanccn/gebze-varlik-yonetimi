import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { enterpriseService } from '../../services/enterpriseService';
import {
  ShieldCheck,
  Search,
  RefreshCw,
  Activity,
} from 'lucide-react';

export const AuditLogsView: React.FC = () => {
  const [globalFilter, setGlobalFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [limit, setLimit] = useState(100);

  const {
    data: logs = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['audit-logs', limit],
    queryFn: () => enterpriseService.getAuditLogs(limit),
  });

  // Unique actions
  const uniqueActions = useMemo(() => {
    return Array.from(new Set(logs.map((l) => l.actionType).filter(Boolean)));
  }, [logs]);

  // Filtered dataset
  const filteredData = useMemo(() => {
    return logs.filter((item) => {
      if (actionFilter && item.actionType !== actionFilter) return false;

      if (!globalFilter) return true;
      const q = globalFilter.toLowerCase();
      return (
        item.actionType.toLowerCase().includes(q) ||
        item.actorUsername.toLowerCase().includes(q) ||
        item.actorName.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.ipAddress?.toLowerCase().includes(q)
      );
    });
  }, [logs, actionFilter, globalFilter]);

  const getActionBadge = (type: string) => {
    switch (type) {
      case 'FAILED_LOGIN_ATTEMPT':
      case 'ACCESS_DENIED':
      case 'ACCOUNT_LOCKED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'LOGIN_SUCCESS':
      case 'LOGOUT':
      case 'OTURUM_ACMA':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'PASSWORD_CHANGED':
      case 'USER_PASSWORD_RESET':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'USER_CREATE':
      case 'BOOTSTRAP_ADMIN_CREATED':
      case 'VARLIK_KAYDI':
      case 'BAKIM_ACILISI':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'LIFECYCLE_TRANSITION':
      case 'ARAC_GUNCELLEME':
      case 'USER_DEACTIVATE':
      case 'STOK_HAREKETI':
      case 'BAKIM_TAMAMLAMA':
      default:
        return 'bg-purple-50 text-purple-700 border-purple-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-purple-600" />
            Sistem Denetim ve Güvenlik Olay Günlüğü
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Kullanıcı oturumları, başarısız giriş denemeleri, yetkisiz erişim teşebbüsleri ve kurumsal veri değişiklikleri.
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

      {/* Information Banner (Gerçek Veri Gösterimi) */}
      <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-purple-900">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-purple-600 flex-shrink-0" />
          <span>
            Veritabanından en son <strong>{logs.length}</strong> güvenlik ve sistem denetim olayı listelenmektedir.
          </span>
        </div>
        <div className="text-purple-700 text-[11px]">
          Filtrelenen Olay: <strong>{filteredData.length}</strong> / Toplam Yüklenen: <strong>{logs.length}</strong>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            id="audit-search"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Kullanıcı, eylem veya IP ara..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div>
          <select
            id="audit-action-filter"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
          >
            <option value="">Tüm Eylem Türleri</option>
            {uniqueActions.map((act) => (
              <option key={act} value={act}>
                {act}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-end gap-2 text-xs">
          <span className="text-slate-500 font-medium">Kayıt Sayısı:</span>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="px-2.5 py-1 border border-slate-200 rounded-lg bg-white font-semibold"
          >
            <option value={50}>Son 50 Kayıt</option>
            <option value={100}>Son 100 Kayıt</option>
            <option value={200}>Son 200 Kayıt</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-purple-600 mb-2" />
            <span>Denetim günlüğü kayıtları yükleniyor...</span>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            Filtrelere uygun denetim veya güvenlik günlüğü kaydı bulunamadı.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Zaman</th>
                  <th className="px-4 py-3">Eylem Türü</th>
                  <th className="px-4 py-3">Kullanıcı (Aktör)</th>
                  <th className="px-4 py-3">İstemci IP</th>
                  <th className="px-4 py-3">Varlık / Modül</th>
                  <th className="px-4 py-3">Açıklama & Detay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                      {l.createdAt}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${getActionBadge(l.actionType)}`}>
                        {l.actionType}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{l.actorName || l.actorUsername}</div>
                      <div className="font-mono text-slate-400 text-[11px]">@{l.actorUsername}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500 text-[11px]">{l.ipAddress || '—'}</td>
                    <td className="px-4 py-3 font-mono text-slate-600">
                      {l.entityType ? `${l.entityType} #${l.entityId || ''}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-700 max-w-md">
                      <div>{l.description}</div>
                      {(l.oldValueJson || l.newValueJson) && (
                        <div className="mt-1.5 p-2 bg-slate-50 border border-slate-200 rounded text-[11px] font-mono space-y-1">
                          {l.oldValueJson && (
                            <div className="text-rose-700 overflow-x-auto whitespace-pre-wrap">
                              <span className="font-bold text-rose-800">Eski:</span> {l.oldValueJson}
                            </div>
                          )}
                          {l.newValueJson && (
                            <div className="text-emerald-700 overflow-x-auto whitespace-pre-wrap">
                              <span className="font-bold text-emerald-800">Yeni:</span> {l.newValueJson}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
