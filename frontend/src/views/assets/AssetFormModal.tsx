import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '../../components/common/Modal';
import { assetService } from '../../services/assetService';
import { hierarchyService } from '../../services/hierarchyService';
import { personnelService } from '../../services/personnelService';
import { AsyncSearchSelect, AsyncSearchSelectItem } from '../../components/common/AsyncSearchSelect';
import { Asset, AssetRequest } from '../../types/asset';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';
import { RefreshCw, Save } from 'lucide-react';

const optionalNumber = z.preprocess(
  (val) => (val === '' || val === null || val === undefined || Number.isNaN(Number(val)) ? null : Number(val)),
  z.number().nullable().optional()
);

const optionalPositiveNumber = z.preprocess(
  (val) => (val === '' || val === null || val === undefined || Number.isNaN(Number(val)) ? 0 : Number(val)),
  z.number().min(0, 'Tahmini değer 0 veya daha büyük olmalıdır.').nullable().optional()
);

const assetSchema = z.object({
  code: z.string().optional(),
  name: z.string().min(2, 'Varlık adı en az 2 karakter olmalıdır.'),
  category: z.string().min(1, 'Kategori seçimi zorunludur.'),
  categoryId: optionalNumber,
  departmentId: optionalNumber,
  subUnitId: optionalNumber,
  buildingId: optionalNumber,
  floorId: optionalNumber,
  roomId: optionalNumber,
  brandModel: z.string().optional(),
  serialNumber: z.string().optional(),
  barcode: z.string().optional(),
  tifCode: z.string().optional(),
  condition: z.string().default('Çok İyi'),
  estimatedValue: optionalPositiveNumber,
  acquisitionDate: z.string().optional(),
  warrantyEndDate: z.string().optional(),
  supplier: z.string().optional(),
  assignee: z.string().optional(),
  notes: z.string().optional(),
});

type AssetFormValues = z.infer<typeof assetSchema>;

interface AssetFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  assetToEdit?: Asset | null;
  onSuccess: (savedAsset: Asset) => void;
}

export const AssetFormModal: React.FC<AssetFormModalProps> = ({
  isOpen,
  onClose,
  assetToEdit,
  onSuccess,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const isEdit = Boolean(assetToEdit);

  // Lookups Queries
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: hierarchyService.getDepartments,
    enabled: isOpen,
  });

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: hierarchyService.getBuildings,
    enabled: isOpen,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: hierarchyService.getCategories,
    enabled: isOpen,
  });

  const loadPersonnelOptions = async (query: string): Promise<AsyncSearchSelectItem[]> => {
    const res = await personnelService.getAll({ q: query || undefined, size: 10 });
    return res.items.map((p) => ({
      id: p.fullName,
      label: p.fullName,
      subLabel: `${p.title || 'Personel'} • ${p.departmentName || ''}`,
      badge: p.registrationNumber,
    }));
  };

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AssetFormValues>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      condition: 'Çok İyi',
      estimatedValue: 0,
      acquisitionDate: new Date().toISOString().split('T')[0],
      departmentId: user?.role === 'DEPT_MANAGER' ? (user.departmentId || null) : null,
    },
  });

  const selectedDeptId = watch('departmentId');
  const selectedBuildingId = watch('buildingId');
  const selectedFloorId = watch('floorId');

  // SubUnits cascade
  const { data: subUnits = [] } = useQuery({
    queryKey: ['sub-units', selectedDeptId],
    queryFn: () => hierarchyService.getSubUnits(selectedDeptId ? Number(selectedDeptId) : undefined),
    enabled: Boolean(isOpen && selectedDeptId),
  });

  // Floors cascade
  const { data: floors = [] } = useQuery({
    queryKey: ['floors', selectedBuildingId],
    queryFn: () => hierarchyService.getFloors(selectedBuildingId ? Number(selectedBuildingId) : undefined),
    enabled: Boolean(isOpen && selectedBuildingId),
  });

  // Rooms cascade
  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms', selectedBuildingId, selectedFloorId],
    queryFn: () =>
      hierarchyService.getRooms({
        buildingId: selectedBuildingId ? Number(selectedBuildingId) : undefined,
        floorId: selectedFloorId ? Number(selectedFloorId) : undefined,
      }),
    enabled: Boolean(isOpen && selectedBuildingId),
  });

  // Prepopulate form when opened / assetToEdit changes
  useEffect(() => {
    if (isOpen) {
      if (assetToEdit) {
        reset({
          code: assetToEdit.code,
          name: assetToEdit.name,
          category: assetToEdit.category || '',
          categoryId: assetToEdit.categoryId || null,
          departmentId: assetToEdit.departmentId || null,
          subUnitId: assetToEdit.subUnitId || null,
          buildingId: assetToEdit.buildingId || null,
          floorId: assetToEdit.floorId || null,
          roomId: assetToEdit.roomId || null,
          brandModel: assetToEdit.brandModel || '',
          serialNumber: assetToEdit.serialNumber || '',
          barcode: assetToEdit.barcode || '',
          tifCode: assetToEdit.tifCode || '',
          condition: assetToEdit.condition || 'Çok İyi',
          estimatedValue: assetToEdit.estimatedValue || 0,
          acquisitionDate: assetToEdit.acquisitionDate || '',
          warrantyEndDate: assetToEdit.warrantyEndDate || '',
          supplier: assetToEdit.supplier || '',
          assignee: assetToEdit.assignee || '',
          notes: assetToEdit.notes || '',
        });
      } else {
        reset({
          code: '',
          name: '',
          category: '',
          categoryId: null,
          departmentId: user?.role === 'DEPT_MANAGER' ? (user.departmentId || null) : null,
          subUnitId: null,
          buildingId: null,
          floorId: null,
          roomId: null,
          brandModel: '',
          serialNumber: '',
          barcode: '',
          tifCode: '',
          condition: 'Çok İyi',
          estimatedValue: 0,
          acquisitionDate: new Date().toISOString().split('T')[0],
          warrantyEndDate: '',
          supplier: '',
          assignee: '',
          notes: '',
        });
      }
    }
  }, [isOpen, assetToEdit, user, reset]);

  const onSubmit = async (data: AssetFormValues) => {
    try {
      const payload: AssetRequest = {
        code: data.code?.trim() || undefined,
        name: data.name.trim(),
        category: data.category.trim(),
        categoryId: data.categoryId ? Number(data.categoryId) : undefined,
        departmentId: data.departmentId ? Number(data.departmentId) : undefined,
        subUnitId: data.subUnitId ? Number(data.subUnitId) : undefined,
        buildingId: data.buildingId ? Number(data.buildingId) : undefined,
        floorId: data.floorId ? Number(data.floorId) : undefined,
        roomId: data.roomId ? Number(data.roomId) : undefined,
        brandModel: data.brandModel?.trim() || undefined,
        serialNumber: data.serialNumber?.trim() || undefined,
        barcode: data.barcode?.trim() || undefined,
        tifCode: data.tifCode?.trim() || undefined,
        condition: data.condition || 'Çok İyi',
        estimatedValue: data.estimatedValue !== null && data.estimatedValue !== undefined ? Number(data.estimatedValue) : 0,
        acquisitionDate: data.acquisitionDate?.trim() || undefined,
        warrantyEndDate: data.warrantyEndDate?.trim() || undefined,
        supplier: data.supplier?.trim() || undefined,
        assignee: data.assignee?.trim() || undefined,
        notes: data.notes?.trim() || undefined,
      };

      let result: Asset;
      if (isEdit && assetToEdit) {
        result = await assetService.update(assetToEdit.id, payload);
        showToast(`'${result.name}' varlık kaydı başarıyla güncellendi.`);
      } else {
        result = await assetService.create(payload);
        showToast(`'${result.name}' varlık kaydı başarıyla oluşturuldu (${result.code}).`);
      }
      onSuccess(result);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Kayıt işlemi sırasında bir hata oluştu.';
      showToast(message, 'warning');
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Varlık Kaydını Düzenle (${assetToEdit?.code})` : 'Yeni Varlık Kaydı Ekle'}
      maxWidth="4xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Name and Category */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Varlık Adı <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              {...register('name')}
              placeholder="Örn: HP EliteBook 840 G8 Laptop"
              className={`w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 ${
                errors.name
                  ? 'border-rose-400 focus:ring-rose-200'
                  : 'border-slate-300 focus:ring-blue-200 focus:border-blue-600'
              }`}
            />
            {errors.name && (
              <p className="text-xs text-rose-600 mt-0.5">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Kategori <span className="text-rose-600">*</span>
            </label>
            <select
              {...register('category')}
              onChange={(e) => {
                setValue('category', e.target.value);
                const selectedCat = categories.find((c) => c.name === e.target.value);
                if (selectedCat) setValue('categoryId', selectedCat.id);
              }}
              className={`w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 ${
                errors.category
                  ? 'border-rose-400 focus:ring-rose-200'
                  : 'border-slate-300 focus:ring-blue-200 focus:border-blue-600'
              }`}
            >
              <option value="">Kategori Seçin ({categories.length})...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="text-xs text-rose-600 mt-0.5">{errors.category.message}</p>
            )}
          </div>
        </div>

        {/* Code, Barcode, TIF */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Varlık Kodu {isEdit ? '(Kayıtlı)' : '(Boşsa otomatik üretilir)'}
            </label>
            <input
              type="text"
              {...register('code')}
              placeholder="Örn: GBZ-AST-999"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-600 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Barkod Numarası</label>
            <input
              type="text"
              {...register('barcode')}
              placeholder="Örn: GBZ-869020261234"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-600 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">TİF Hesap Kodu</label>
            <input
              type="text"
              {...register('tifCode')}
              placeholder="Örn: 255.02.01.01"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-600 font-mono"
            />
          </div>
        </div>

        {/* Corporate Hierarchy: Department & SubUnit */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Sorumlu Müdürlük {user?.role === 'DEPT_MANAGER' && '(Müdürlüğünüze Sabitli)'}
            </label>
            <select
              {...register('departmentId', { valueAsNumber: true })}
              disabled={user?.role === 'DEPT_MANAGER'}
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">Alt Birim / Şeflik</label>
            <select
              {...register('subUnitId', { valueAsNumber: true })}
              disabled={!selectedDeptId}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-600 disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="">Alt Birim Seçin (Opsiyonel)...</option>
              {subUnits.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Physical Location: Building, Floor, Room */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Hizmet Binası</label>
            <select
              {...register('buildingId', { valueAsNumber: true })}
              onChange={(e) => {
                setValue('buildingId', e.target.value ? Number(e.target.value) : null);
                setValue('floorId', null);
                setValue('roomId', null);
              }}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-600"
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">Kat</label>
            <select
              {...register('floorId', { valueAsNumber: true })}
              disabled={!selectedBuildingId}
              onChange={(e) => {
                setValue('floorId', e.target.value ? Number(e.target.value) : null);
                setValue('roomId', null);
              }}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-600 disabled:bg-slate-100 disabled:text-slate-400"
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">Oda / Ambar</label>
            <select
              {...register('roomId', { valueAsNumber: true })}
              disabled={!selectedBuildingId}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-600 disabled:bg-slate-100 disabled:text-slate-400"
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

        {/* Brand/Model, Serial Number, Assignee, Condition */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Marka & Model</label>
            <input
              type="text"
              {...register('brandModel')}
              placeholder="Örn: Dell Latitude 5420"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Seri Numarası</label>
            <input
              type="text"
              {...register('serialNumber')}
              placeholder="Örn: SN-987654321"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-600 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Zimmetli Personel</label>
            <AsyncSearchSelect
              placeholder="Atanmamış (Depoda)"
              searchPlaceholder="Personel adı veya sicil no..."
              value={watch('assignee')}
              loadOptions={loadPersonnelOptions}
              onChange={(val) => setValue('assignee', val ? String(val) : '', { shouldValidate: true })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Kondisyon</label>
            <select
              {...register('condition')}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-600"
            >
              <option value="Çok İyi">Çok İyi</option>
              <option value="İyi">İyi</option>
              <option value="Orta">Orta</option>
              <option value="Kötü">Kötü</option>
              <option value="Arızalı">Arızalı</option>
            </select>
          </div>
        </div>

        {/* Value, Acquisition Date, Warranty Date, Supplier */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tahmini Değer (TL)
            </label>
            <input
              type="number"
              step="any"
              {...register('estimatedValue', { valueAsNumber: true })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Edinme Tarihi</label>
            <input
              type="date"
              {...register('acquisitionDate')}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Garanti Bitiş Tarihi</label>
            <input
              type="date"
              {...register('warrantyEndDate')}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tedarikçi Firma</label>
            <input
              type="text"
              {...register('supplier')}
              placeholder="Örn: DMO / Teknoloji A.Ş."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-600"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Açıklama & Notlar</label>
          <textarea
            {...register('notes')}
            rows={2}
            placeholder="Varlık ile ilgili teknik ve idari notlar..."
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-600"
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
            className="inline-flex items-center px-5 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                Kaydediliyor...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {isEdit ? 'Değişiklikleri Kaydet' : 'Varlığı Kaydet'}
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
