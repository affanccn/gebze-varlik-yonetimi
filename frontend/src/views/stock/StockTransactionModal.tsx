import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../context/ToastContext';
import { stockService } from '../../services/stockService';
import { hierarchyService } from '../../services/hierarchyService';
import { StockItem } from '../../types/stock';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';

interface StockTransactionModalProps {
  stockItems: StockItem[];
  preselectedItem: StockItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const StockTransactionModal: React.FC<StockTransactionModalProps> = ({
  stockItems,
  preselectedItem,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [selectedItemId, setSelectedItemId] = useState<number | ''>(preselectedItem?.id || '');
  const [txType, setTxType] = useState<'GIRIS' | 'CIKIS'>('CIKIS');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [departmentId, setDepartmentId] = useState<number | ''>('');
  const [recipientName, setRecipientName] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync preselected item if opened via row button
  React.useEffect(() => {
    if (preselectedItem) {
      setSelectedItemId(preselectedItem.id);
    }
  }, [preselectedItem]);

  // Departments for allocation
  const { data: departments = [] } = useQuery({
    queryKey: ['departments-for-stock'],
    queryFn: hierarchyService.getDepartments,
    enabled: isOpen,
  });

  if (!isOpen) return null;

  const activeItem = stockItems.find((s) => s.id === Number(selectedItemId)) || preselectedItem;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId) {
      showToast('Lütfen işlem yapılacak stok malzemesini seçin.', 'warning');
      return;
    }
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      showToast('Lütfen geçerli bir miktar girin.', 'warning');
      return;
    }

    if (txType === 'CIKIS' && activeItem && qty > activeItem.currentQuantity) {
      showToast(`Yetersiz stok! Mevcut miktar: ${activeItem.currentQuantity} ${activeItem.unit}`, 'warning');
      return;
    }

    const selectedDept = departments.find((d) => d.id === Number(departmentId));

    setIsSubmitting(true);
    try {
      await stockService.createTransaction({
        stockItemId: Number(selectedItemId),
        txType,
        quantity: qty,
        departmentId: departmentId ? Number(departmentId) : null,
        departmentName: selectedDept ? selectedDept.name : undefined,
        recipientName,
        notes,
      });
      showToast('Stok hareketi başarıyla işlendi ve kaydedildi.');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Stok hareketi kaydedilemedi.';
      showToast(msg, 'warning');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Stok Malzeme Hareketi (Giriş / Çıkış)"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Active item info */}
        {activeItem && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
            <div>
              <div className="font-bold text-slate-800">{activeItem.itemCode} — {activeItem.itemName}</div>
              <div className="text-slate-500">{activeItem.warehouseName} • {activeItem.category}</div>
            </div>
            <div className="text-right">
              <div className="text-slate-500 font-medium">Mevcut Miktar</div>
              <div className="text-sm font-bold font-mono text-blue-700">
                {activeItem.currentQuantity} {activeItem.unit}
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            İşlem Yapılacak Malzeme *
          </label>
          <select
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            value={selectedItemId}
            onChange={(e) => setSelectedItemId(Number(e.target.value) || '')}
            required
            id="stx-item-select"
          >
            <option value="">Malzeme Seçin...</option>
            {stockItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.itemCode} — {item.itemName} (Mevcut: {item.currentQuantity} {item.unit})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Hareket Türü *
            </label>
            <select
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-semibold"
              value={txType}
              onChange={(e) => setTxType(e.target.value as 'GIRIS' | 'CIKIS')}
              id="stx-type-select"
            >
              <option value="CIKIS">Çıkış (Birim / Servis Tahsisi)</option>
              <option value="GIRIS">Giriş (Satın Alma / İkmal)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Miktar {activeItem ? `(${activeItem.unit})` : ''} *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0"
              required
              id="stx-qty-input"
            />
          </div>
        </div>

        {txType === 'CIKIS' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tahsis Edilen Müdürlük
              </label>
              <select
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={departmentId}
                onChange={(e) => setDepartmentId(Number(e.target.value) || '')}
                id="stx-dept-select"
              >
                <option value="">Müdürlük Seçin...</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Teslim Alan Personel
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Adı Soyadı"
                id="stx-recipient-input"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Hareket Notu / Dayanak Belge
          </label>
          <textarea
            rows={2}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="İhtiyaç gerekçesi veya irsaliye numarası..."
            id="stx-notes-input"
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
            className={`px-4 py-2 text-xs font-semibold text-white rounded-lg shadow-sm flex items-center gap-1.5 disabled:opacity-50 ${
              txType === 'GIRIS' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {txType === 'GIRIS' ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
            {isSubmitting ? 'İşleniyor...' : txType === 'GIRIS' ? 'Depoya Giriş Yap' : 'Tahsis Çıkışı Yap'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

