import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '../../components/common/Modal';
import { StatusBadge } from '../../components/common/Badge';
import { QRCodeSvg } from '../../components/common/QRCodeSvg';
import { formatCurrency, formatDateTime } from '../../components/common/formatters';
import { assetService } from '../../services/assetService';
import { Asset, LIFECYCLE_STATUS_LABELS } from '../../types/asset';
import { useAuth } from '../../hooks/useAuth';
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  MapPin,
  Pencil,
  RefreshCw,
  Send,
  Tag,
  User,
  Wrench,
} from 'lucide-react';

interface AssetDetailModalProps {
  assetId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenTransfer: (asset: Asset) => void;
  onOpenLifecycle: (asset: Asset, preselectedTarget?: string) => void;
  onOpenEdit: (asset: Asset) => void;
}

export const AssetDetailModal: React.FC<AssetDetailModalProps> = ({
  assetId,
  isOpen,
  onClose,
  onOpenTransfer,
  onOpenLifecycle,
  onOpenEdit,
}) => {
  const { canWrite } = useAuth();

  const { data: detail, isLoading, error } = useQuery({
    queryKey: ['asset-detail', assetId],
    queryFn: () => assetService.getById(assetId!),
    enabled: isOpen && assetId !== null,
  });

  if (!isOpen) return null;

  const asset = detail?.asset;
  const movements = detail?.movements || [];
  const transitions = detail?.availableTransitions || [];

  // Lifecycle Stepper calculation
  const getStepperStatus = () => {
    if (!asset) return { step1: true, step2: true, step3: false, step4: false, step5: false, step6: false };
    const status = (asset.status || '').toLowerCase();
    const isAssigned = Boolean(asset.assignee && !asset.assignee.toLowerCase().includes('atanmamış'));
    const isMaint = status.includes('bakım');
    const isDisposed = status.includes('hurda') || status.includes('kullanım dışı') || status.includes('pasif');

    return {
      step1: true, // Satın Alındı
      step2: true, // Taşınır Kaydı
      step3: Boolean(asset.roomId || asset.buildingId), // Odaya Yerleşti
      step4: isAssigned, // Zimmetlendi
      step5: isMaint || (!isDisposed && isAssigned), // Kullanım & Bakım
      step6: isDisposed, // Hurda / Düşüm
    };
  };

  const steps = getStepperStatus();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={asset ? `${asset.code} — ${asset.name}` : 'Varlık Detayı'}
      maxWidth="4xl"
    >
      {isLoading ? (
        <div className="flex items-center justify-center p-12 text-slate-500">
          <RefreshCw className="w-6 h-6 animate-spin mr-3 text-blue-600" />
          <span>Varlık detayları yükleniyor...</span>
        </div>
      ) : error || !asset ? (
        <div className="p-6 text-center text-rose-600">
          Varlık detayları yüklenirken bir hata oluştu veya kayıt bulunamadı.
        </div>
      ) : (
        <div className="space-y-6">
          {/* 6-Stage Lifecycle Stepper */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Kurumsal Yaşam Döngüsü İlerlemesi
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {[
                { num: 1, label: 'Satın Alındı', active: steps.step1 },
                { num: 2, label: 'Taşınır Kaydı', active: steps.step2 },
                { num: 3, label: 'Odaya Yerleşti', active: steps.step3 },
                { num: 4, label: 'Zimmetlendi', active: steps.step4 },
                { num: 5, label: 'Kullanım & Bakım', active: steps.step5 },
                { num: 6, label: 'Hurda / Düşüm', active: steps.step6 },
              ].map((s) => (
                <div
                  key={s.num}
                  className={`flex flex-col items-center p-2 rounded-lg text-center transition-all ${
                    s.active
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-slate-500 border border-slate-200'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mb-1 ${
                      s.active ? 'bg-white text-blue-600' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {s.active ? '✓' : s.num}
                  </div>
                  <div className="text-xs font-medium leading-tight">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Hero Banner: Identity, Badges and QR Code */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 bg-gradient-to-r from-slate-900 to-blue-950 text-white rounded-xl gap-4 shadow-sm">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={asset.lifecycleStatus || asset.status} />
                <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-white font-mono">
                  {asset.status}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-200 font-medium">
                  {asset.category}
                </span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">{asset.name}</h2>
              <div className="text-sm text-slate-300 flex flex-wrap gap-x-4 gap-y-1">
                <span>
                  Kod: <strong className="text-white font-mono">{asset.code}</strong>
                </span>
                <span>
                  Barkod: <strong className="text-white font-mono">{asset.barcode || '-'}</strong>
                </span>
                <span>
                  TİF: <strong className="text-white font-mono">{asset.tifCode || '-'}</strong>
                </span>
              </div>
            </div>

            {/* QR Code Container */}
            <div className="flex flex-col items-center bg-white p-2.5 rounded-lg shadow-md shrink-0">
              <QRCodeSvg value={asset.roomQrCode || asset.code} size={84} />
              <span className="text-[10px] font-mono text-slate-600 mt-1 font-semibold max-w-[90px] truncate text-center">
                {asset.code}
              </span>
            </div>
          </div>

          {/* Quick Action Toolbar */}
          {canWrite && (
            <div className="flex flex-wrap items-center gap-2 p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl">
              <span className="text-xs font-bold text-blue-900 mr-2 flex items-center">
                <Wrench className="w-4 h-4 mr-1 text-blue-600" /> İşlemler:
              </span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenTransfer(asset);
                }}
                className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-700 shadow-sm transition-colors"
              >
                <Send className="w-3.5 h-3.5 mr-1" /> Konum / Oda Transferi
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenLifecycle(asset);
                }}
                className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> Yaşam Döngüsü Geçişi
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenEdit(asset);
                }}
                className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 shadow-sm transition-colors"
              >
                <Pencil className="w-3.5 h-3.5 mr-1 text-slate-500" /> Düzenle
              </button>
            </div>
          )}

          {/* Available State Transitions (If any) */}
          {transitions.length > 0 && canWrite && (
            <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2">
              <div className="text-xs font-bold text-amber-900 flex items-center">
                <RefreshCw className="w-3.5 h-3.5 mr-1 text-amber-700" />
                ⚡ Hızlı Yaşam Döngüsü Durum Geçişleri:
              </div>
              <div className="flex flex-wrap gap-2">
                {transitions.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenLifecycle(asset, t);
                    }}
                    className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md bg-white text-amber-900 border border-amber-300 hover:bg-amber-100 shadow-xs transition-colors"
                  >
                    ➔ {LIFECYCLE_STATUS_LABELS[t] || t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
              <div className="text-xs font-medium text-slate-500 flex items-center">
                <Building2 className="w-3.5 h-3.5 mr-1 text-slate-400" /> Hizmet Binası & Kat
              </div>
              <div className="font-semibold text-slate-800">
                {asset.buildingName || 'Belirtilmedi'}
                {asset.floorName ? ` - ${asset.floorName}` : ''}
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
              <div className="text-xs font-medium text-slate-500 flex items-center">
                <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" /> Oda / Lokasyon
              </div>
              <div className="font-semibold text-slate-800">
                {asset.roomNumber ? `Oda ${asset.roomNumber} (${asset.roomName || ''})` : asset.location || 'Genel Depo'}
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
              <div className="text-xs font-medium text-slate-500 flex items-center">
                <Tag className="w-3.5 h-3.5 mr-1 text-slate-400" /> Sorumlu Müdürlük
              </div>
              <div className="font-semibold text-slate-800">
                {asset.departmentName || asset.unit || '-'}
                {asset.subUnitName ? ` (${asset.subUnitName})` : ''}
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
              <div className="text-xs font-medium text-slate-500 flex items-center">
                <User className="w-3.5 h-3.5 mr-1 text-slate-400" /> Zimmetli Personel
              </div>
              <div className="font-semibold text-slate-800">
                {asset.assignee || 'Atanmamış'}
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
              <div className="text-xs font-medium text-slate-500 flex items-center">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-slate-400" /> Kondisyon / Durum
              </div>
              <div className="font-semibold text-slate-800">
                {asset.condition || 'Çok İyi'}
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
              <div className="text-xs font-medium text-slate-500 flex items-center">
                <DollarSign className="w-3.5 h-3.5 mr-1 text-slate-400" /> Tahmini Rayiç Değer
              </div>
              <div className="font-semibold text-slate-800">
                {formatCurrency(asset.estimatedValue)}
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
              <div className="text-xs font-medium text-slate-500 flex items-center">
                <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" /> Edinme / Alım Tarihi
              </div>
              <div className="font-semibold text-slate-800">
                {asset.acquisitionDate || '-'}
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
              <div className="text-xs font-medium text-slate-500 flex items-center">
                <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" /> Garanti Bitiş Tarihi
              </div>
              <div className="font-semibold text-slate-800">
                {asset.warrantyEndDate || '-'}
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
              <div className="text-xs font-medium text-slate-500 flex items-center">
                <FileText className="w-3.5 h-3.5 mr-1 text-slate-400" /> Marka / Model / Seri No
              </div>
              <div className="font-semibold text-slate-800 truncate" title={`${asset.brandModel || '-'} / SN: ${asset.serialNumber || '-'}`}>
                {asset.brandModel || '-'} &bull; SN: {asset.serialNumber || '-'}
              </div>
            </div>
          </div>

          {/* Notes Section */}
          {asset.notes && (
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-sm">
              <div className="text-xs font-medium text-slate-500 mb-1">Açıklama & Notlar:</div>
              <div className="text-slate-700 whitespace-pre-wrap">{asset.notes}</div>
            </div>
          )}

          {/* Movements History */}
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <h4 className="font-bold text-slate-800 text-sm flex items-center justify-between">
              <span>Konum ve Hareket Geçmişi</span>
              <span className="text-xs font-normal text-slate-500">
                Toplam {movements.length} kayıt
              </span>
            </h4>

            {movements.length === 0 ? (
              <div className="p-4 bg-slate-50 rounded-lg text-center text-sm text-slate-500">
                Henüz hareket kaydı bulunmuyor.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-56">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">Tarih</th>
                      <th className="px-3 py-2 text-left">İşlem</th>
                      <th className="px-3 py-2 text-left">Çıkış Konumu</th>
                      <th className="px-3 py-2 text-left">Varış Konumu</th>
                      <th className="px-3 py-2 text-left">İşlemi Yapan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {movements.map((m, idx) => (
                      <tr key={m.id || idx} className="hover:bg-slate-50/70">
                        <td className="px-3 py-2 text-slate-500 whitespace-nowrap">
                          {formatDateTime(m.timestamp)}
                        </td>
                        <td className="px-3 py-2">
                          <span className="font-semibold text-blue-700">{m.typeLabel}</span>
                        </td>
                        <td className="px-3 py-2 text-slate-600 max-w-[150px] truncate">
                          {m.fromLocation || '-'}
                        </td>
                        <td className="px-3 py-2 text-slate-800 font-medium max-w-[150px] truncate">
                          {m.toLocation || '-'}
                        </td>
                        <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                          {m.performedBy}
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
    </Modal>
  );
};
