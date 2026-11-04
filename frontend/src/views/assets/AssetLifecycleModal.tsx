import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '../../components/common/Modal';
import { StatusBadge } from '../../components/common/Badge';
import { assetService } from '../../services/assetService';
import { Asset, LIFECYCLE_STATUS_LABELS } from '../../types/asset';
import { useToast } from '../../context/ToastContext';
import { AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';

interface AssetLifecycleModalProps {
  asset: Asset | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedAsset: Asset) => void;
  preselectedTarget?: string;
}

export const AssetLifecycleModal: React.FC<AssetLifecycleModalProps> = ({
  asset,
  isOpen,
  onClose,
  onSuccess,
  preselectedTarget,
}) => {
  const { showToast } = useToast();
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Fetch available transitions for this asset
  const { data: transitions = [], isLoading } = useQuery({
    queryKey: ['asset-transitions', asset?.id],
    queryFn: () => assetService.getTransitions(asset!.id),
    enabled: Boolean(isOpen && asset?.id),
  });

  useEffect(() => {
    if (isOpen) {
      setSelectedTarget(preselectedTarget || '');
      setReason('');
    }
  }, [isOpen, preselectedTarget]);

  // Set first transition if none selected and available
  useEffect(() => {
    if (isOpen && !selectedTarget && transitions.length > 0) {
      setSelectedTarget(transitions[0]);
    }
  }, [isOpen, selectedTarget, transitions]);

  const isTerminalState = [
    'HURDAYA_AYRILDI',
    'ZAYIAT_CALINMA',
    'DEVREDILDI',
    'BAGISLANDI',
    'SATILDI',
  ].includes(selectedTarget);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asset) return;

    if (!selectedTarget) {
      showToast('Lütfen geçiş yapılacak hedef durumu seçin.', 'warning');
      return;
    }

    if (!reason.trim()) {
      showToast('Durum geçişi için gerekçe / açıklama girilmesi zorunludur.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await assetService.transition(asset.id, {
        targetStatus: selectedTarget,
        reason: reason.trim(),
      });
      showToast(
        `'${asset.name}' durumu '${LIFECYCLE_STATUS_LABELS[selectedTarget] || selectedTarget}' olarak güncellendi.`
      );
      onSuccess(result);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Durum geçişi sırasında bir hata oluştu.';
      showToast(message, 'warning');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !asset) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Yaşam Döngüsü Durum Geçişi"
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Asset summary */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {asset.code}
            </span>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 font-medium">Mevcut Durum:</span>
              <StatusBadge status={asset.lifecycleStatus || asset.status} />
            </div>
          </div>
          <div className="font-bold text-slate-900 text-sm">{asset.name}</div>
          <div className="text-xs text-slate-500">
            {asset.departmentName || asset.unit} &bull; {asset.category}
          </div>
        </div>

        {/* Available Targets */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            Hedef Yaşam Döngüsü Durumu <span className="text-rose-600">*</span>
          </label>

          {isLoading ? (
            <div className="p-4 flex items-center justify-center text-xs text-slate-500">
              <RefreshCw className="w-4 h-4 animate-spin mr-2 text-blue-600" />
              İzin verilen durumlar yükleniyor...
            </div>
          ) : transitions.length === 0 ? (
            <div className="p-4 bg-amber-50 text-amber-800 rounded-lg text-xs border border-amber-200">
              Bu varlığın mevcut durumundan geçebileceği başka bir durum bulunmuyor veya bu işlem
              için yetkiniz yetersiz.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {transitions.map((t) => {
                const isSelected = selectedTarget === t;
                const label = LIFECYCLE_STATUS_LABELS[t] || t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSelectedTarget(t)}
                    className={`flex items-center justify-between p-3 rounded-lg border text-left text-xs font-medium transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/80 text-blue-900 ring-2 ring-blue-500/20'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{label}</span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Terminal warning */}
        {isTerminalState && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold block mb-0.5">DİKKAT: Sonlandırma Durumu</strong>
              Seçilen durum demirbaşın aktif envanterden düşürülmesini sağlar (Hurda / Satış /
              Zayiat). Bu işlem sistem denetim kayıtlarına işlenir ve geri alınamaz.
            </div>
          </div>
        )}

        {/* Reason / Gerekçe */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Durum Geçiş Gerekçesi <span className="text-rose-600">*</span>
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Örn: Donanım arızası nedeniyle teknik servis ve bakıma sevk edildi..."
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-600"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !selectedTarget || transitions.length === 0}
            className={`inline-flex items-center px-5 py-2 text-sm font-semibold rounded-lg text-white shadow-sm transition-colors disabled:opacity-50 ${
              isTerminalState
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                İşleniyor...
              </>
            ) : (
              'Durumu Güncelle'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
