import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../context/ToastContext';
import { enterpriseService } from '../../services/enterpriseService';
import { QrCode, ScanLine } from 'lucide-react';

interface CountingScanModalProps {
  auditId: number | null;
  auditCode?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CountingScanModal: React.FC<CountingScanModalProps> = ({
  auditId,
  auditCode,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [assetCode, setAssetCode] = useState('');
  const [scannedLocation, setScannedLocation] = useState('Ana Bina 2. Kat No: 204');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !auditId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetCode.trim()) {
      showToast('Lütfen varlık kodunu veya barkodunu girin.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      await enterpriseService.recordAuditScan(auditId, {
        assetCode: assetCode.trim().toUpperCase(),
        scannedLocation,
      });
      showToast(`'${assetCode.toUpperCase()}' varlığı sayım listesine kaydedildi.`);
      setAssetCode('');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sayım kaydı yapılamadı.';
      showToast(msg, 'warning');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Barkod / QR Sayım Okutma (${auditCode || 'Seans'})`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Okutulan Demirbaş Barkod / Varlık Kodu *
          </label>
          <div className="relative">
            <ScanLine className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              id="audit-scan-code-input"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono font-bold uppercase"
              value={assetCode}
              onChange={(e) => setAssetCode(e.target.value)}
              placeholder="Örn: GBZ-AST-001 veya 8690001001"
              required
              autoFocus
            />
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            El terminali veya barkod okuyucuyla okutulan kod otomatik doldurulur.
          </span>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Taranan Fiziki Mahalli / Oda *
          </label>
          <input
            type="text"
            id="audit-scan-location-input"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            value={scannedLocation}
            onChange={(e) => setScannedLocation(e.target.value)}
            required
            placeholder="Örn: Ana Bina 1. Kat No: 105"
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
            <QrCode className="w-3.5 h-3.5" />
            {isSubmitting ? 'Kaydediliyor...' : 'Sayıma İşle'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

