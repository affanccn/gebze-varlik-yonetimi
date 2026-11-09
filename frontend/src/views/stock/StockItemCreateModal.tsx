import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { stockService } from '../../services/stockService';
import { X, Boxes, AlertCircle } from 'lucide-react';

interface StockItemCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  departments?: { id: number; name: string }[];
}

export const StockItemCreateModal: React.FC<StockItemCreateModalProps> = ({
  isOpen,
  onClose,
  departments = [],
}) => {
  const queryClient = useQueryClient();
  const [itemCode, setItemCode] = useState('');
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('Kırtasiye ve Büro Malzemesi');
  const [warehouseName, setWarehouseName] = useState('Ana Hizmet Binası Merkez Ambarı');
  const [unit, setUnit] = useState('Adet');
  const [currentQuantity, setCurrentQuantity] = useState('0');
  const [minThreshold, setMinThreshold] = useState('10');
  const [unitPrice, setUnitPrice] = useState('0');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState('');

  const createMutation = useMutation({
    mutationFn: stockService.createStockItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-items'] });
      onClose();
      // Reset form
      setItemCode('');
      setItemName('');
      setCurrentQuantity('0');
      setMinThreshold('10');
      setUnitPrice('0');
      setErrorMessage('');
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Stok kartı kaydedilirken bir hata oluştu.');
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!itemCode.trim() || !itemName.trim()) {
      setErrorMessage('Lütfen malzeme kodunu ve adını eksiksiz giriniz.');
      return;
    }

    createMutation.mutate({
      itemCode: itemCode.trim().toUpperCase(),
      itemName: itemName.trim(),
      category: category.trim(),
      warehouseName: warehouseName.trim(),
      unit: unit.trim(),
      currentQuantity: parseFloat(currentQuantity) || 0,
      minThreshold: parseFloat(minThreshold) || 10,
      unitPrice: parseFloat(unitPrice) || 0,
      departmentId: departmentId ? parseInt(departmentId, 10) : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-50 text-teal-600 rounded-xl border border-teal-100">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Yeni Stok Kartı Tanımla</h2>
              <p className="text-xs text-slate-500">Ambar için yeni sarf veya demirbaş stok kalemi kaydı.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Malzeme Kodu <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={itemCode}
                onChange={(e) => setItemCode(e.target.value)}
                placeholder="Örn: STK-KRT-012"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kategori <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
              >
                <option value="Kırtasiye ve Büro Malzemesi">Kırtasiye ve Büro Malzemesi</option>
                <option value="Temizlik ve Hijyen Malzemesi">Temizlik ve Hijyen Malzemesi</option>
                <option value="Bilişim ve Donanım Sarf">Bilişim ve Donanım Sarf</option>
                <option value="Hırdavat ve Bakım Onarım">Hırdavat ve Bakım Onarım</option>
                <option value="İş Sağlığı ve Güvenliği">İş Sağlığı ve Güvenliği</option>
                <option value="Elektrik ve Aydınlatma">Elektrik ve Aydınlatma</option>
                <option value="Araç Bakım ve Akaryakıt">Araç Bakım ve Akaryakıt</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Malzeme / Stok Kalemi Adı <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="Örn: A4 Fotokopi Kağıdı 80gr 500'lü Paket"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bulunduğu Ambar / Depo
              </label>
              <input
                type="text"
                value={warehouseName}
                onChange={(e) => setWarehouseName(e.target.value)}
                placeholder="Örn: Fen İşleri Merkez Ambarı"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                İlişkili Müdürlük
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
              >
                <option value="">Kurum Geneli (Ortak Ambar)</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Birim
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
              >
                <option value="Adet">Adet</option>
                <option value="Paket">Paket</option>
                <option value="Koli">Koli</option>
                <option value="Kutu">Kutu</option>
                <option value="Litre">Litre</option>
                <option value="Kg">Kg</option>
                <option value="Metre">Metre</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Başlangıç Miktarı
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={currentQuantity}
                onChange={(e) => setCurrentQuantity(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kritik Eşik
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={minThreshold}
                onChange={(e) => setMinThreshold(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Birim Fiyat (₺)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={createMutation.isPending}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-5 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 rounded-xl shadow-xs transition-colors flex items-center gap-2"
            >
              {createMutation.isPending ? 'Kaydediliyor...' : 'Stok Kartı Oluştur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
