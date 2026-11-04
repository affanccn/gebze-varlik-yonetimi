import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '../../components/common/Modal';
import { assetService } from '../../services/assetService';
import { hierarchyService } from '../../services/hierarchyService';
import { Asset, TransferRequest } from '../../types/asset';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';
import { MapPin, RefreshCw, Send, Building2 } from 'lucide-react';

interface AssetTransferModalProps {
  asset: Asset | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedAsset: Asset) => void;
}

export const AssetTransferModal: React.FC<AssetTransferModalProps> = ({
  asset,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [buildingId, setBuildingId] = useState<number | ''>('');
  const [floorId, setFloorId] = useState<number | ''>('');
  const [roomId, setRoomId] = useState<number | ''>('');
  const [departmentId, setDepartmentId] = useState<number | ''>('');
  const [subUnitId, setSubUnitId] = useState<number | ''>('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lookups Queries
  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: hierarchyService.getBuildings,
    enabled: isOpen,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: hierarchyService.getDepartments,
    enabled: isOpen,
  });

  // Floors cascade
  const { data: floors = [] } = useQuery({
    queryKey: ['floors', buildingId],
    queryFn: () => hierarchyService.getFloors(buildingId ? Number(buildingId) : undefined),
    enabled: Boolean(isOpen && buildingId),
  });

  // Rooms cascade
  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms', buildingId, floorId],
    queryFn: () =>
      hierarchyService.getRooms({
        buildingId: buildingId ? Number(buildingId) : undefined,
        floorId: floorId ? Number(floorId) : undefined,
      }),
    enabled: Boolean(isOpen && buildingId),
  });

  // SubUnits cascade
  const { data: subUnits = [] } = useQuery({
    queryKey: ['sub-units', departmentId],
    queryFn: () => hierarchyService.getSubUnits(departmentId ? Number(departmentId) : undefined),
    enabled: Boolean(isOpen && departmentId),
  });

  useEffect(() => {
    if (isOpen && asset) {
      setBuildingId(asset.buildingId || '');
      setFloorId(asset.floorId || '');
      setRoomId(asset.roomId || '');
      setDepartmentId(asset.departmentId || (user?.role === 'DEPT_MANAGER' ? user.departmentId || '' : ''));
      setSubUnitId(asset.subUnitId || '');
      setNote('');
    }
  }, [isOpen, asset, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asset) return;

    if (!buildingId && !roomId && !departmentId) {
      showToast('Lütfen en az bir hedef bina, oda veya müdürlük seçin.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: TransferRequest = {
        buildingId: buildingId ? Number(buildingId) : undefined,
        floorId: floorId ? Number(floorId) : undefined,
        roomId: roomId ? Number(roomId) : undefined,
        departmentId: departmentId ? Number(departmentId) : (asset.departmentId || undefined),
        subUnitId: subUnitId ? Number(subUnitId) : (asset.subUnitId || undefined),
        note: note.trim() || undefined,
      };

      const result = await assetService.transfer(asset.id, payload);
      showToast(`'${asset.name}' varlığı yeni konumuna başarıyla transfer edildi.`);
      onSuccess(result);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Transfer işlemi sırasında bir hata oluştu.';
      showToast(message, 'warning');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !asset) return null;

  const currentLoc = asset.buildingName
    ? `${asset.buildingName}${asset.floorName ? ` - ${asset.floorName}` : ''}${
        asset.roomNumber ? ` / Oda ${asset.roomNumber}` : ''
      }`
    : asset.location || 'Genel Konum';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Demirbaş Konum / Oda Transferi"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Current Asset & Location Card */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {asset.code}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Mevcut Durum: {asset.status}
            </span>
          </div>
          <div className="font-bold text-slate-900 text-sm">{asset.name}</div>
          <div className="text-xs text-slate-600 flex items-center">
            <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
            <span>Mevcut Konum:</span>
            <strong className="ml-1 text-slate-800">{currentLoc}</strong>
          </div>
          <div className="text-xs text-slate-600 flex items-center">
            <Building2 className="w-3.5 h-3.5 mr-1 text-slate-400" />
            <span>Mevcut Müdürlük:</span>
            <strong className="ml-1 text-slate-800">
              {asset.departmentName || asset.unit || '-'}
            </strong>
          </div>
        </div>

        {/* Target Physical Location */}
        <div className="p-3 bg-teal-50/50 rounded-xl border border-teal-200/80 space-y-3">
          <div className="text-xs font-bold text-teal-900 flex items-center">
            <Send className="w-3.5 h-3.5 mr-1 text-teal-700" />
            Hedef Fiziksel Konum:
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Hedef Hizmet Binası
              </label>
              <select
                value={buildingId}
                onChange={(e) => {
                  setBuildingId(e.target.value ? Number(e.target.value) : '');
                  setFloorId('');
                  setRoomId('');
                }}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-600"
              >
                <option value="">Bina Seçin ({buildings.length})...</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Hedef Kat</label>
              <select
                value={floorId}
                disabled={!buildingId}
                onChange={(e) => {
                  setFloorId(e.target.value ? Number(e.target.value) : '');
                  setRoomId('');
                }}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-600 disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">Kat Seçin...</option>
                {floors.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.floorName || f.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Hedef Oda / Ambar
              </label>
              <select
                value={roomId}
                disabled={!buildingId}
                onChange={(e) => setRoomId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-600 disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">Oda Seçin...</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    Oda {r.roomNumber} - {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Target Department / SubUnit */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Hedef Müdürlük {user?.role === 'DEPT_MANAGER' && '(Kendi Müdürlüğünüz)'}
            </label>
            <select
              value={departmentId}
              disabled={user?.role === 'DEPT_MANAGER'}
              onChange={(e) => {
                setDepartmentId(e.target.value ? Number(e.target.value) : '');
                setSubUnitId('');
              }}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-600 disabled:bg-slate-100 disabled:text-slate-500"
            >
              <option value="">Müdürlük Seçin ({departments.length})...</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Hedef Alt Birim (Opsiyonel)
            </label>
            <select
              value={subUnitId}
              disabled={!departmentId}
              onChange={(e) => setSubUnitId(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-600 disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="">Alt Birim Seçin...</option>
              {subUnits.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Transfer Reason / Note */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Transfer Nedeni / Sevk Açıklaması
          </label>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Örn: Yeni ofis düzeni gereği Fen İşleri Odası'na nakil..."
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-600"
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
            disabled={isSubmitting}
            className="inline-flex items-center px-5 py-2 text-sm font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-700 shadow-sm transition-colors disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                Transfer Ediliyor...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Transferi Onayla
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
