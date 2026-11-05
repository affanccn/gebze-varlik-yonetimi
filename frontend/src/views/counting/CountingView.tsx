import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { enterpriseService } from '../../services/enterpriseService';
import { CountingScanModal } from './CountingScanModal';
import { useAuth } from '../../hooks/useAuth';
import {
  ClipboardCheck,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ScanLine,
} from 'lucide-react';

export const CountingView: React.FC = () => {
  const { canWrite } = useAuth();
  const [selectedAuditId, setSelectedAuditId] = useState<number | null>(null);
  const [scanFilter, setScanFilter] = useState('');
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'SCANS' | 'RECONCILIATION'>('SCANS');

  // Audits Query
  const {
    data: audits = [],
    isLoading: isLoadingAudits,
    refetch: refetchAudits,
    isRefetching: isRefetchingAudits,
  } = useQuery({
    queryKey: ['audits'],
    queryFn: () => enterpriseService.getAudits(),
  });

  // Default active audit selection
  const activeAudit = useMemo(() => {
    if (audits.length === 0) return null;
    if (selectedAuditId) {
      return audits.find((a) => a.id === selectedAuditId) || audits[0];
    }
    return audits[0];
  }, [audits, selectedAuditId]);

  // Scans Query
  const {
    data: scans = [],
    isLoading: isLoadingScans,
    refetch: refetchScans,
  } = useQuery({
    queryKey: ['audit-scans', activeAudit?.id],
    queryFn: () => (activeAudit ? enterpriseService.getAuditScans(activeAudit.id) : Promise.resolve([])),
    enabled: activeAudit !== null,
  });

  // Reconciliation Summary Query
  const {
    data: reconciliation,
    isLoading: isLoadingRecon,
    refetch: refetchRecon,
  } = useQuery({
    queryKey: ['audit-recon', activeAudit?.id],
    queryFn: () => (activeAudit ? enterpriseService.getAuditReconciliation(activeAudit.id) : Promise.resolve(null)),
    enabled: activeAudit !== null,
  });

  const handleRefresh = () => {
    refetchAudits();
    refetchScans();
    refetchRecon();
  };

  // Filtered scans
  const filteredScans = useMemo(() => {
    if (!scanFilter) return scans;
    const q = scanFilter.toLowerCase();
    return scans.filter(
      (s) =>
        s.assetCode?.toLowerCase().includes(q) ||
        s.assetName?.toLowerCase().includes(q) ||
        s.scannedLocation?.toLowerCase().includes(q) ||
        s.expectedLocation?.toLowerCase().includes(q)
    );
  }, [scans, scanFilter]);

  const completionPct = activeAudit
    ? Math.min(Math.round(((activeAudit.totalScanned || 0) / (activeAudit.totalExpected || 1)) * 100), 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <ClipboardCheck className="w-6 h-6 text-emerald-600" />
            Fiziksel Sayım, Barkod Okuma ve Mutabakat
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Yıl sonu ve periyodik sayım seansları, barkod/QR eşleşmeleri ve ambar mutabakat takip sistemi.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefetchingAudits}
            className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 rounded-lg transition-colors"
            title="Yenile"
          >
            <RefreshCw className={`w-4 h-4 ${isRefetchingAudits ? 'animate-spin' : ''}`} />
          </button>

          {canWrite && activeAudit && (
            <button
              type="button"
              id="btn-open-audit-scan"
              data-action="new-audit-scan"
              onClick={() => setIsScanModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
            >
              <ScanLine className="w-4 h-4" />
              Barkod / QR Okut
            </button>
          )}
        </div>
      </div>

      {/* Session Selector Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {isLoadingAudits ? (
          <div className="col-span-3 p-8 text-center text-slate-500">Sayım seansları yükleniyor...</div>
        ) : (
          audits.map((a) => {
            const isSelected = activeAudit?.id === a.id;
            return (
              <button
                type="button"
                key={a.id}
                data-audit-id={a.id}
                onClick={() => setSelectedAuditId(a.id)}
                className={`p-4 rounded-xl text-left border transition-all audit-session-card ${
                  isSelected
                    ? 'bg-blue-50/50 border-blue-500 ring-2 ring-blue-200 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-mono font-bold">
                  <span className={isSelected ? 'text-blue-700' : 'text-slate-700'}>{a.auditCode}</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-sans text-[11px]">
                    {a.status}
                  </span>
                </div>
                <div className="font-semibold text-slate-900 text-sm mt-1">{a.title}</div>
                <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{a.scopeDescription}</div>
              </button>
            );
          })
        )}
      </div>

      {/* Active Audit Overview Banner */}
      {activeAudit && (
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200 mr-2">
                {activeAudit.auditCode}
              </span>
              <span className="text-sm font-bold text-slate-900">{activeAudit.title}</span>
            </div>
            <div className="text-xs text-slate-500">
              Sayım Lideri: <strong>{activeAudit.leadAuditor}</strong>
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
              <span>Sayım Tamamlanma Oranı: %{completionPct}</span>
              <span>
                {activeAudit.totalScanned || 0} / {activeAudit.totalExpected || 0} Varlık Taranmış
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-600 h-2.5 transition-all duration-500 rounded-full"
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </div>

          {/* KPI Indicators */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 text-center">
            <div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase">Beklenen</div>
              <div className="text-lg font-bold text-slate-900">{activeAudit.totalExpected || 0}</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-emerald-600 uppercase flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Taranan
              </div>
              <div className="text-lg font-bold text-emerald-700">{activeAudit.totalScanned || 0}</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-rose-600 uppercase flex items-center justify-center gap-1">
                <XCircle className="w-3.5 h-3.5" /> Eksik / Kayıp
              </div>
              <div className="text-lg font-bold text-rose-700">{activeAudit.totalMissing || 0}</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-amber-600 uppercase flex items-center justify-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Fazla / Tanımsız
              </div>
              <div className="text-lg font-bold text-amber-700">{activeAudit.totalExcess || 0}</div>
            </div>
          </div>
        </div>
      )}

      {/* Sekmeler: Okutulan Kayıtlar vs Mutabakat Özeti */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('SCANS')}
          className={`pb-2.5 text-xs font-semibold px-2 transition-colors relative flex items-center gap-1.5 ${
            activeTab === 'SCANS'
              ? 'text-emerald-700 border-b-2 border-emerald-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <ScanLine className="w-3.5 h-3.5" />
          Okutulan Demirbaşlar ({scans.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('RECONCILIATION')}
          className={`pb-2.5 text-xs font-semibold px-2 transition-colors relative flex items-center gap-1.5 ${
            activeTab === 'RECONCILIATION'
              ? 'text-emerald-700 border-b-2 border-emerald-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <ClipboardCheck className="w-3.5 h-3.5" />
          Mutabakat & Eksik Listesi ({reconciliation?.missingAssets?.length || 0})
        </button>
      </div>

      {activeTab === 'SCANS' ? (
        /* Scans List Table */
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-slate-800">
              Sayım Tarama Kayıtları ({filteredScans.length})
            </h2>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                id="audit-scan-search"
                value={scanFilter}
                onChange={(e) => setScanFilter(e.target.value)}
                placeholder="Kod, varlık veya oda ara..."
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {isLoadingScans ? (
              <div className="p-8 text-center text-slate-500">Tarama verileri yükleniyor...</div>
            ) : filteredScans.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                Bu sayım seansına ait henüz okutulmuş barkod kaydı bulunmuyor.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Varlık Kodu</th>
                      <th className="px-4 py-3">Demirbaş Adı</th>
                      <th className="px-4 py-3">Kayıtlı Beklenen Oda</th>
                      <th className="px-4 py-3">Fiziki Taranan Konum</th>
                      <th className="px-4 py-3">Eşleşme Durumu</th>
                      <th className="px-4 py-3">Tarayan Denetçi</th>
                      <th className="px-4 py-3">Zaman</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredScans.map((s) => {
                      const isEslesti = s.matchStatus === 'ESLESTI' || s.matchStatus === 'DOGRU_KONUM';
                      const isFarkli = s.matchStatus === 'FARKLI_ODA' || s.matchStatus === 'FARKLI_KONUMDA';

                      return (
                        <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-slate-900">
                            {s.assetCode}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {s.assetName}
                          </td>
                          <td className="px-4 py-3 text-slate-500">{s.expectedLocation || '—'}</td>
                          <td className="px-4 py-3 font-medium text-slate-800">{s.scannedLocation}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                isEslesti
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : isFarkli
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {isEslesti ? (
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              ) : isFarkli ? (
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                              ) : (
                                <XCircle className="w-3 h-3 text-rose-600" />
                              )}
                              {s.matchStatus}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{s.scannedBy}</td>
                          <td className="px-4 py-3 font-mono text-slate-400 text-[11px]">{s.scannedAt}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Reconciliation & Missing Assets Panel */
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-slate-800">
              Henüz Sayılmamış / Eksik Demirbaşlar ({reconciliation?.missingAssets?.length || 0})
            </h2>
            <span className="text-xs text-slate-500">
              Sayıma dahil olup henüz barkodu okutulmayan kayıtlar
            </span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {isLoadingRecon ? (
              <div className="p-8 text-center text-slate-500">Mutabakat verileri hesaplanıyor...</div>
            ) : !reconciliation?.missingAssets || reconciliation.missingAssets.length === 0 ? (
              <div className="p-8 text-center text-emerald-600 font-semibold flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                Tüm demirbaşlar eksiksiz sayıldı! Eksik varlık bulunmuyor.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Varlık Kodu</th>
                      <th className="px-4 py-3">Barkod No</th>
                      <th className="px-4 py-3">Demirbaş Adı</th>
                      <th className="px-4 py-3">Müdürlük</th>
                      <th className="px-4 py-3">Kayıtlı Konum / Oda</th>
                      <th className="px-4 py-3 text-right">Eylem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reconciliation.missingAssets.map((asset) => (
                      <tr key={asset.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">{asset.code}</td>
                        <td className="px-4 py-3 font-mono text-slate-500">{asset.barcode || '-'}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{asset.name}</td>
                        <td className="px-4 py-3 text-slate-600">{asset.department}</td>
                        <td className="px-4 py-3 text-slate-600">{asset.location}</td>
                        <td className="px-4 py-3 text-right">
                          {canWrite && (
                            <button
                              type="button"
                              onClick={() => {
                                setIsScanModalOpen(true);
                              }}
                              className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded transition-colors"
                            >
                              Şimdi Oku
                            </button>
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
      )}

      {/* Scan Modal */}
      <CountingScanModal
        auditId={activeAudit?.id || null}
        auditCode={activeAudit?.auditCode}
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        onSuccess={handleRefresh}
      />
    </div>
  );
};
