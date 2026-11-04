import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../context/ToastContext';
import { maintenanceService } from '../../services/maintenanceService';
import { MaintenanceRecord } from '../../types/maintenance';
import { CheckCircle2 } from 'lucide-react';

interface MaintenanceCompleteModalProps {
  record: MaintenanceRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const MaintenanceCompleteModal: React.FC<MaintenanceCompleteModalProps> = ({
  record,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [finalCost, setFinalCost] = useState<number | ''>(record?.cost || 0);
  const [targetStatus, setTargetStatus] = useState('BOSTA');
  const [targetCondition, setTargetCondition] = useState('İyi');
  const [returnLocation, setReturnLocation] = useState('Merkez Taşınır Ana Ambarı');
  const [resolutionNote, setResolutionNote] = useState(
    'Teknik kontroller, parça değişimi ve fonksiyonel testler tamamlandı; çalışır vaziyette teslim edildi.'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !record) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await maintenanceService.complete(record.id, {
        targetStatus,
        targetCondition,
        returnLocation,
        finalCost: Number(finalCost || 0),
        resolutionNote,
      });
      showToast(`${record.orderNo} numaralı bakım iş emri başarıyla tamamlandı ve kapatıldı.`);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Bakım kapatma işlemi başarısız oldu.';
      showToast(msg, 'warning');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Bakım İş Emrini Kapat ve Onayla"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Info Card */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              {record.orderNo}
            </span>
            <span className="text-slate-500 font-medium">Başlangıç: {record.startedAt}</span>
          </div>
          <div className="text-sm font-bold text-slate-800">
            {record.assetCode} — {record.assetName}
          </div>
          <div className="text-xs text-slate-600">
            <strong>Arıza / Talep:</strong> {record.issueDescription}
          </div>
          {record.vendorOrTechnician && (
            <div className="text-xs text-slate-500">
              <strong>Servis / Teknisyen:</strong> {record.vendorOrTechnician}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Gerçekleşen Nihai Maliyet (TL) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              id="maint-comp-cost"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
              value={finalCost}
              onChange={(e) => setFinalCost(e.target.value === '' ? '' : Number(e.target.value))}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Bakım Sonrası Durumu
            </label>
            <select
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={targetStatus}
              onChange={(e) => setTargetStatus(e.target.value)}
              id="maint-comp-status"
            >
              <option value="BOSTA">BOŞTA (Kullanıma Hazır)</option>
              <option value="KULLANIMDA">KULLANIMDA</option>
              <option value="HURDA">HURDA / KULLANIM DIŞI</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Fiziksel Kondisyon
            </label>
            <select
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={targetCondition}
              onChange={(e) => setTargetCondition(e.target.value)}
            >
              <option value="Çok İyi">Çok İyi</option>
              <option value="İyi">İyi</option>
              <option value="Orta">Orta</option>
              <option value="Kötü">Kötü</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Teslim Edilecek Konum / Ambar
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={returnLocation}
              onChange={(e) => setReturnLocation(e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Teknik Sonuç & Çözüm Açıklaması *
          </label>
          <textarea
            rows={3}
            id="maint-comp-resolution"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            value={resolutionNote}
            onChange={(e) => setResolutionNote(e.target.value)}
            required
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
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {isSubmitting ? 'Kapatılıyor...' : 'Bakımı Tamamla ve Kapat'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
