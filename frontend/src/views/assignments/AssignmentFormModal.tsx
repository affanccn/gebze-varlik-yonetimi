import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../context/ToastContext';
import { assetService } from '../../services/assetService';
import { personnelService } from '../../services/personnelService';
import { assignmentService } from '../../services/assignmentService';
import { AsyncSearchSelect, AsyncSearchSelectItem } from '../../components/common/AsyncSearchSelect';

interface AssignmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AssignmentFormModal: React.FC<AssignmentFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [selectedAssetId, setSelectedAssetId] = useState<number | ''>('');
  const [selectedPersonId, setSelectedPersonId] = useState<number | ''>('');
  const [assigneeName, setAssigneeName] = useState('');
  const [assigneeTitle, setAssigneeTitle] = useState('');
  const [unit, setUnit] = useState('');
  const [location, setLocation] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const loadAssetOptions = async (query: string): Promise<AsyncSearchSelectItem[]> => {
    const res = await assetService.getAll({ q: query || undefined, size: 10 });
    return res.items.map((a) => ({
      id: a.id,
      label: `${a.code} — ${a.name}`,
      subLabel: `${a.departmentName || a.unit || ''} ${a.roomNumber ? '• Oda ' + a.roomNumber : ''}`,
      badge: a.lifecycleStatus || a.status,
    }));
  };

  const loadPersonnelOptions = async (query: string): Promise<AsyncSearchSelectItem[]> => {
    const res = await personnelService.getAll({ q: query || undefined, size: 10 });
    return res.items.map((p) => ({
      id: p.id,
      label: p.fullName,
      subLabel: `${p.title || 'Personel'} • ${p.departmentName || ''}`,
      badge: p.registrationNumber,
    }));
  };

  const handlePersonSelect = async (val: number | string | null) => {
    if (val) {
      const pId = Number(val);
      setSelectedPersonId(pId);
      try {
        const person = await personnelService.getById(pId);
        setAssigneeName(person.fullName);
        setAssigneeTitle(person.title || '');
        setUnit(person.departmentName || '');
      } catch (e) {
        console.error('Failed to load selected person details', e);
      }
    } else {
      setSelectedPersonId('');
      setAssigneeName('');
      setAssigneeTitle('');
      setUnit('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId) {
      showToast('Lütfen zimmetlenecek demirbaşı seçin.', 'warning');
      return;
    }
    if (!assigneeName) {
      showToast('Lütfen zimmet yapılacak personeli seçin veya adını girin.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await assignmentService.create({
        assetId: Number(selectedAssetId),
        assigneeName,
        assigneeTitle,
        unit,
        location,
        note,
      });
      showToast(`${res.documentNo} numaralı zimmet fişi başarıyla oluşturuldu.`);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Zimmet fişi oluşturulamadı.';
      showToast(msg, 'warning');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Yeni Zimmet Fişi Düzenle"
      subtitle="Taşınır demirbaşı belediye personeline resmi olarak zimmetleyin"
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Varlık Seçimi */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Zimmetlenecek Demirbaş / Varlık *
          </label>
          <AsyncSearchSelect
            id="assign-asset-select"
            placeholder="Varlık Ara veya Seçin..."
            searchPlaceholder="Varlık kodu veya adı ile ara..."
            value={selectedAssetId}
            loadOptions={loadAssetOptions}
            onChange={(val) => setSelectedAssetId(val ? Number(val) : '')}
            required
          />
        </div>

        {/* Personel Seçimi */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Personel Rehberinden Seç *
            </label>
            <AsyncSearchSelect
              id="assign-person-select"
              placeholder="Rehberden Personel Seçin..."
              searchPlaceholder="Personel adı veya sicil no ile ara..."
              value={selectedPersonId}
              loadOptions={loadPersonnelOptions}
              onChange={handlePersonSelect}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Zimmetli Adı Soyadı *
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={assigneeName}
              onChange={(e) => setAssigneeName(e.target.value)}
              placeholder="Ad Soyad"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ünvan / Pozisyon
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={assigneeTitle}
              onChange={(e) => setAssigneeTitle(e.target.value)}
              placeholder="Örn: Bilgisayar İşletmeni"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Müdürlük / Birim
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="Örn: Bilgi İşlem Müdürlüğü"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Kullanım Mahalli / Oda
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Örn: Ana Bina 2. Kat No: 204"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Açıklama / Teslim Notu
          </label>
          <textarea
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Kullanıcıya teslim edilme amacı, aparatları vb."
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
            {isSubmitting ? 'Oluşturuluyor...' : 'Zimmet Fişini Oluştur'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
