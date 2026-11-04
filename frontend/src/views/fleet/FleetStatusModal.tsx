import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../context/ToastContext';
import { enterpriseService } from '../../services/enterpriseService';
import { FleetVehicle } from '../../types/fleet';
import { Truck } from 'lucide-react';

interface FleetStatusModalProps {
  vehicle: FleetVehicle | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const FleetStatusModal: React.FC<FleetStatusModalProps> = ({
  vehicle,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [status, setStatus] = useState('GOREVDE');
  const [currentKm, setCurrentKm] = useState<number | ''>('');
  const [assignedDriver, setAssignedDriver] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (vehicle) {
      setStatus(vehicle.status || 'GOREVDE');
      setCurrentKm(vehicle.currentKm || 0);
      setAssignedDriver(vehicle.assignedDriver || '');
    }
  }, [vehicle, isOpen]);

  if (!isOpen || !vehicle) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await enterpriseService.updateFleetStatus(vehicle.id, {
        status,
        currentKm: currentKm === '' ? undefined : Number(currentKm),
        assignedDriver,
      });
      showToast(`${vehicle.plateNumber} plakalı araç bilgileri güncellendi.`);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Araç güncellenemedi.';
      showToast(msg, 'warning');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Araç / İş Makinesi Durum Güncelleme"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Info Card */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {vehicle.plateNumber}
            </span>
            <span className="text-slate-500 font-medium">{vehicle.vehicleType}</span>
          </div>
          <div className="text-sm font-bold text-slate-800">
            {vehicle.brandModel} ({vehicle.modelYear})
          </div>
          <div className="text-xs text-slate-500">
            {vehicle.departmentName || 'Birim Atanmamış'}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Araç Çalışma Durumu *
          </label>
          <select
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-semibold"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            id="fleet-status-select"
          >
            <option value="GOREVDE">Görevde (Sahada Aktif)</option>
            <option value="GARAJDA">Garajda (Hazır Beklemede)</option>
            <option value="BAKIMDA">Bakımda / Serviste</option>
            <option value="ARIZALI">Arızalı (Kullanım Dışı)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Güncel Kilometre / Çalışma Saati *
          </label>
          <input
            type="number"
            min="0"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
            value={currentKm}
            onChange={(e) => setCurrentKm(e.target.value === '' ? '' : Number(e.target.value))}
            required
            id="fleet-km-input"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Zimmetli Şoför / Operatör
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            value={assignedDriver}
            onChange={(e) => setAssignedDriver(e.target.value)}
            placeholder="Şoför / Operatör Adı Soyadı"
            id="fleet-driver-input"
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
            <Truck className="w-3.5 h-3.5" />
            {isSubmitting ? 'Kaydediliyor...' : 'Durumu Güncelle'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

