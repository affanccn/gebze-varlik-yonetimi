import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../context/ToastContext';
import { assetService } from '../../services/assetService';
import { personnelService } from '../../services/personnelService';
import { assignmentService } from '../../services/assignmentService';
import { FileSignature } from 'lucide-react';

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

  // Varlıklar listesi
  const { data: assets = [] } = useQuery({
    queryKey: ['assets-for-assign'],
    queryFn: () => assetService.getAll(),
    enabled: isOpen,
  });

  // Personel listesi
  const { data: personnelList = [] } = useQuery({
    queryKey: ['personnel-for-assign'],
    queryFn: () => personnelService.getAll(),
    enabled: isOpen,
  });

  if (!isOpen) return null;

  const handlePersonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pId = Number(e.target.value);
    setSelectedPersonId(pId || '');
    if (pId) {
      const person = personnelList.find((p) => p.id === pId);
      if (person) {
        setAssigneeName(person.fullName);
        setAssigneeTitle(person.title || '');
        setUnit(person.departmentName || '');
      }
    } else {
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
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Varlık Seçimi */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Zimmetlenecek Demirbaş / Varlık *
          </label>
          <select
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            value={selectedAssetId}
            onChange={(e) => setSelectedAssetId(Number(e.target.value) || '')}
            required
            id="assign-asset-select"
          >
            <option value="">Varlık Seçin...</option>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} — {a.name} ({a.status})
              </option>
            ))}
          </select>
        </div>

        {/* Personel Seçimi */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Personel Rehberinden Seç *
            </label>
            <select
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={selectedPersonId}
              onChange={handlePersonChange}
              id="assign-person-select"
            >
              <option value="">Rehberden Personel Seçin...</option>
              {personnelList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName} ({p.departmentName || 'Birim Yok'})
                </option>
              ))}
            </select>
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
            Zimmet Notu ve Teslim Koşulları
          </label>
          <textarea
            rows={3}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Kullanıcıya eksiksiz ve çalışır vaziyette teslim edilmiştir..."
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
            <FileSignature className="w-3.5 h-3.5" />
            {isSubmitting ? 'Oluşturuluyor...' : 'Zimmet Fişini Kes'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

