import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../context/ToastContext';
import { assetService } from '../../services/assetService';
import { maintenanceService } from '../../services/maintenanceService';
import { Wrench } from 'lucide-react';

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

  // Varlıklar listesi
  const { data: assets = [] } = useQuery({
    queryKey: ['assets-for-maint'],
    queryFn: () => assetService.getAll(),
    enabled: isOpen,
  });

  if (!isOpen) return null;

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
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Bakıma Alınacak Demirbaş / Varlık *
          </label>
          <select
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            value={selectedAssetId}
            onChange={(e) => setSelectedAssetId(Number(e.target.value) || '')}
            required
            id="maint-asset-select"
          >
            <option value="">Varlık Seçin...</option>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} — {a.name} ({a.category} • {a.status})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Bakım Türü *
            </label>
            <select
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={maintenanceType}
              onChange={(e) => setMaintenanceType(e.target.value)}
              id="maint-type-select"
            >
              <option value="Arıza Onarımı">Arıza Onarımı</option>
              <option value="Periyodik Bakım">Periyodik Bakım</option>
              <option value="Parça Değişimi">Parça Değişimi</option>
              <option value="Yazılım / Kalibrasyon">Yazılım / Kalibrasyon</option>
              <option value="Fenni Muayene">Fenni Muayene</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Öncelik Derecesi *
            </label>
            <select
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              id="maint-priority-select"
            >
              <option value="NORMAL">Normal</option>
              <option value="ACIL">Acil</option>
              <option value="YUKSEK">Yüksek</option>
              <option value="DUSUK">Düşük</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Yetkili Servis / Teknisyen
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={vendorOrTechnician}
              onChange={(e) => setVendorOrTechnician(e.target.value)}
              placeholder="Örn: Yetkili Servis A.Ş. veya Ahmet Usta"
              id="maint-vendor-input"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tahmini Maliyet (TL)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
              value={estimatedCost}
              onChange={(e) => setEstimatedCost(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0.00"
              id="maint-cost-input"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Arıza ve Talep Açıklaması *
          </label>
          <textarea
            rows={3}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            value={issueDescription}
            onChange={(e) => setIssueDescription(e.target.value)}
            placeholder="Cihazın arıza belirtileri, yapılan ilk kontroller ve talep edilen işlemler..."
            required
            id="maint-desc-input"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            Vazgeç
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            <Wrench className="w-3.5 h-3.5" />
            {isSubmitting ? 'İş Emri Açılıyor...' : 'İş Emrini Başlat'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

