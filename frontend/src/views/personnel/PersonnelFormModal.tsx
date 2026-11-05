import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../context/ToastContext';
import { personnelService } from '../../services/personnelService';
import { hierarchyService } from '../../services/hierarchyService';
import { Personnel } from '../../types/personnel';
import { UserCheck, UserPlus } from 'lucide-react';

interface PersonnelFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (saved: Personnel) => void;
  personnelToEdit?: Personnel | null;
}

export const PersonnelFormModal: React.FC<PersonnelFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  personnelToEdit = null,
}) => {
  const { showToast } = useToast();
  const isEdit = personnelToEdit !== null;

  const [registrationNumber, setRegistrationNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [title, setTitle] = useState('');
  const [departmentId, setDepartmentId] = useState<number | ''>('');
  const [subUnitId, setSubUnitId] = useState<number | ''>('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lookups
  const { data: departments = [] } = useQuery({
    queryKey: ['departments-for-personnel'],
    queryFn: hierarchyService.getDepartments,
    enabled: isOpen,
  });

  const { data: subUnits = [] } = useQuery({
    queryKey: ['sub-units-for-personnel', departmentId],
    queryFn: () => hierarchyService.getSubUnits(departmentId ? Number(departmentId) : undefined),
    enabled: Boolean(isOpen && departmentId),
  });

  useEffect(() => {
    if (personnelToEdit) {
      setRegistrationNumber(personnelToEdit.registrationNumber || '');
      setFirstName(personnelToEdit.firstName || '');
      setLastName(personnelToEdit.lastName || '');
      setTitle(personnelToEdit.title || '');
      setDepartmentId(personnelToEdit.departmentId || '');
      setSubUnitId(personnelToEdit.subUnitId || '');
      setPhone(personnelToEdit.phone || '');
      setEmail(personnelToEdit.email || '');
    } else {
      setRegistrationNumber('');
      setFirstName('');
      setLastName('');
      setTitle('');
      setDepartmentId('');
      setSubUnitId('');
      setPhone('');
      setEmail('');
    }
  }, [personnelToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      showToast('Personel adı ve soyadı zorunludur.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Partial<Personnel> = {
        registrationNumber: registrationNumber.trim() || undefined,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        title: title.trim() || undefined,
        departmentId: departmentId ? Number(departmentId) : undefined,
        subUnitId: subUnitId ? Number(subUnitId) : undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      };

      let result: Personnel;
      if (isEdit && personnelToEdit) {
        result = await personnelService.update(personnelToEdit.id, payload);
        showToast(`'${result.fullName}' personeli başarıyla güncellendi.`);
      } else {
        result = await personnelService.create(payload);
        showToast(`'${result.fullName}' personeli başarıyla sisteme eklendi (Sicil: ${result.registrationNumber}).`);
      }
      onSuccess(result);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'İşlem sırasında bir hata oluştu.';
      showToast(msg, 'warning');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Personel Bilgilerini Düzenle (${personnelToEdit?.registrationNumber})` : 'Yeni Belediye Personeli Ekle'}
      subtitle="Gebze Belediyesi personel rehberi ve zimmet sorumlusu kayıt formu"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Ad & Soyad */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Adı <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              required
              id="personnel-first-name"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Örn: Ahmet"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Soyadı <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              required
              id="personnel-last-name"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Örn: Yılmaz"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>

        {/* Sicil No & Görevi */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Sicil Numarası
            </label>
            <input
              type="text"
              id="personnel-reg-no"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
              placeholder={isEdit ? '' : 'Boş bırakılırsa otomatik üretilir (SCL-XXXX)'}
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Görevi / Ünvanı
            </label>
            <input
              type="text"
              id="personnel-title"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Örn: Kıdemli Yazılım Mühendisi"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
        </div>

        {/* Müdürlük & Alt Birim */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Müdürlük
            </label>
            <select
              id="personnel-department-id"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
              value={departmentId}
              onChange={(e) => {
                setDepartmentId(e.target.value ? Number(e.target.value) : '');
                setSubUnitId('');
              }}
            >
              <option value="">Müdürlük Seçiniz ({departments.length})</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Alt Birim
            </label>
            <select
              id="personnel-sub-unit-id"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white disabled:bg-slate-100 disabled:text-slate-400"
              value={subUnitId}
              disabled={!departmentId || subUnits.length === 0}
              onChange={(e) => setSubUnitId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">{subUnits.length === 0 ? 'Alt Birim Yok' : 'Alt Birim Seçiniz'}</option>
              {subUnits.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* İletişim: Telefon & E-posta */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Dahili / Telefon
            </label>
            <input
              type="text"
              id="personnel-phone"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Örn: 0262 642 06 00"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Kurumsal E-posta
            </label>
            <input
              type="email"
              id="personnel-email"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Örn: ahmet.yilmaz@gebze.bel.tr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        {/* Butonlar */}
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Vazgeç
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            {isEdit ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            {isSubmitting ? 'Kaydediliyor...' : isEdit ? 'Değişiklikleri Kaydet' : 'Personeli Kaydet'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
