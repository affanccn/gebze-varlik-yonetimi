import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../context/ToastContext';
import { assetService } from '../../services/assetService';
import { maintenanceService } from '../../services/maintenanceService';
import { AsyncSearchSelect, AsyncSearchSelectItem } from '../../components/common/AsyncSearchSelect';

interface MaintenanceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const MaintenanceFormModal: React.FC<MaintenanceFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [selectedAssetId, setSelectedAssetId] = useState<number | ''>('');
  const [maintenanceType, setMaintenanceType] = useState('Arıza Onarımı');
  const [priority, setPriority] = useState('NORMAL');
  const [vendorOrTechnician, setVendorOrTechnician] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [estimatedCost, setEstimatedCost] = useState<number | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const loadAssetOptions = async (query: string): Promise<AsyncSearchSelectItem[]> => {
    const res = await assetService.getAll({ q: query || undefined, size: 10 });
    return res.items.map((a) => ({
      id: a.id,
      label: `${a.code} — ${a.name}`,
      subLabel: `${a.category || ''} • ${a.departmentName || a.unit || ''}`,
      badge: a.lifecycleStatus || a.status,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId) {
      showToast('Lütfen bakıma alınacak demirbaşı seçin.', 'warning');
      return;
    }
    if (!issueDescription.trim()) {
      showToast('Arıza veya bakım açıklaması zorunludur.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await maintenanceService.create({
        assetId: Number(selectedAssetId),
        maintenanceType,
        priority,
        vendorOrTechnician,
        issueDescription,
        estimatedCost: estimatedCost === '' ? 0 : Number(estimatedCost),
      });
      showToast(`${res.orderNo} numaralı bakım iş emri başarıyla oluşturuldu.`);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Bakım iş emri oluşturulamadı.';
      showToast(msg, 'warning');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Yeni Bakım & Onarım İş Emri Aç"
      subtitle="Arızalanan veya periyodik bakıma gidecek demirbaş kaydı için servis emri oluşturun"
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Bakıma Alınacak Demirbaş / Varlık *
          </label>
          <AsyncSearchSelect
            id="maint-asset-select"
            placeholder="Varlık Ara veya Seçin..."
            searchPlaceholder="Varlık kodu veya adı ile ara..."
            value={selectedAssetId}
            loadOptions={loadAssetOptions}
            onChange={(val) => setSelectedAssetId(val ? Number(val) : '')}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Bakım Türü
            </label>
            <select
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={maintenanceType}
              onChange={(e) => setMaintenanceType(e.target.value)}
            >
              <option value="Periyodik Bakım">Periyodik Bakım</option>
              <option value="Arıza Onarımı">Arıza Onarımı</option>
              <option value="Kalibrasyon">Kalibrasyon</option>
              <option value="Yazılım Güncelleme">Yazılım Güncelleme</option>
              <option value="Revizyon">Revizyon</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Öncelik Derecesi
            </label>
            <select
              id="maint-priority-select"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="DUSUK">Düşük</option>
              <option value="NORMAL">Normal</option>
              <option value="YUKSEK">Yüksek</option>
              <option value="ACIL">Acil (Kritik Hizmet Aksaması)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Servis / Teknisyen / Firma
            </label>
            <input
              type="text"
              id="maint-vendor-input"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={vendorOrTechnician}
              onChange={(e) => setVendorOrTechnician(e.target.value)}
              placeholder="Örn: Yetkili Servis A.Ş. veya Ahmet Usta"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tahmini Maliyet (₺)
            </label>
            <input
              type="number"
              id="maint-cost-input"
              step="0.01"
              min="0"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={estimatedCost}
              onChange={(e) => setEstimatedCost(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0.00"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Arıza / İş Detay Açıklaması *
          </label>
          <textarea
            id="maint-desc-input"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            rows={3}
            value={issueDescription}
            onChange={(e) => setIssueDescription(e.target.value)}
            placeholder="Cihazdaki arıza belirtileri veya yapılması gereken periyodik işlem detayları..."
            required
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Oluşturuluyor...' : 'İş Emrini Başlat'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
