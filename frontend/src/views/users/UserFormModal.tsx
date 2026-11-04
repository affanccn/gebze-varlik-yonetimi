import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../context/ToastContext';
import { userService } from '../../services/userService';
import { hierarchyService } from '../../services/hierarchyService';
import { personnelService } from '../../services/personnelService';
import { UserResponse } from '../../types/user';
import { UserPlus, UserCheck, Check, Copy } from 'lucide-react';

interface UserFormModalProps {
  userToEdit: UserResponse | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (createdPassword?: string | null) => void;
}

export const UserFormModal: React.FC<UserFormModalProps> = ({
  userToEdit,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const isEdit = userToEdit !== null;

  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('STAFF');
  const [departmentId, setDepartmentId] = useState<number | ''>('');
  const [personnelId, setPersonnelId] = useState<number | ''>('');
  const [password, setPassword] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdTempPassword, setCreatedTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Lookups
  const { data: departments = [] } = useQuery({
    queryKey: ['departments-for-user'],
    queryFn: hierarchyService.getDepartments,
    enabled: isOpen,
  });

  const { data: personnelList = [] } = useQuery({
    queryKey: ['personnel-for-user'],
    queryFn: () => personnelService.getAll(),
    enabled: isOpen,
  });

  useEffect(() => {
    setCreatedTempPassword(null);
    setCopied(false);
    if (userToEdit) {
      setUsername(userToEdit.username);
      setFullName(userToEdit.fullName);
      setEmail(userToEdit.email);
      setRole(userToEdit.role);
      setDepartmentId(userToEdit.departmentId || '');
      setPersonnelId(userToEdit.personnelId || '');
      setIsActive(userToEdit.isActive);
      setPassword('');
    } else {
      setUsername('');
      setFullName('');
      setEmail('');
      setRole('STAFF');
      setDepartmentId('');
      setPersonnelId('');
      setIsActive(true);
      setPassword('');
    }
  }, [userToEdit, isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (createdTempPassword) {
      navigator.clipboard.writeText(createdTempPassword);
      setCopied(true);
      showToast('Geçici şifre kopyalandı.');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCloseAll = () => {
    setCreatedTempPassword(null);
    setCopied(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (isEdit) {
        await userService.update(userToEdit.id, {
          fullName,
          email,
          role,
          departmentId: departmentId ? Number(departmentId) : null,
          personnelId: personnelId ? Number(personnelId) : null,
          isActive,
        });
        showToast(`'${userToEdit.username}' kullanıcısı başarıyla güncellendi.`);
        onSuccess();
        onClose();
      } else {
        const res = await userService.create({
          username,
          fullName,
          email,
          role,
          departmentId: departmentId ? Number(departmentId) : null,
          personnelId: personnelId ? Number(personnelId) : null,
          password: password || undefined,
        });
        showToast(`'${username}' kullanıcısı oluşturuldu.`);
        onSuccess(res.temporaryPassword);
        if (res.temporaryPassword) {
          setCreatedTempPassword(res.temporaryPassword);
        } else {
          onClose();
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Kullanıcı işlemi başarısız oldu.';
      showToast(msg, 'warning');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (createdTempPassword) {
    return (
      <Modal isOpen={isOpen} onClose={handleCloseAll} title="Kullanıcı Oluşturuldu" maxWidth="md">
        <div className="space-y-4 py-2">
          <div className="text-center space-y-1">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
              <Check className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-slate-900">Kullanıcı Hesabı Oluşturuldu</div>
            <div className="text-xs text-slate-500">
              Sistem tarafından üretilen <strong className="text-slate-800">Geçici Sistem Şifresi</strong> aşağıdadır:
            </div>
          </div>

          <div className="p-3 bg-slate-100 border border-slate-300 rounded-xl flex items-center justify-between font-mono text-sm font-bold text-slate-800">
            <span>{createdTempPassword}</span>
            <button
              type="button"
              onClick={handleCopy}
              className="p-1.5 hover:bg-white rounded-lg border border-slate-300 transition-colors flex items-center gap-1 text-xs text-slate-600"
              title="Panoya Kopyala"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Kopyalandı' : 'Kopyala'}
            </button>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={handleCloseAll}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg shadow-sm"
            >
              Şifreyi Kopyaladım, Kapat
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Kullanıcı Düzenle: ${userToEdit.username}` : 'Yeni Kullanıcı Hesabı Tanımla'}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Kullanıcı Adı *
            </label>
            <input
              type="text"
              id="user-username-input"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono disabled:bg-slate-100"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isEdit}
              required
              placeholder="orn: fatih_koc"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ad Soyad *
            </label>
            <input
              type="text"
              id="user-fullname-input"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              placeholder="Adı Soyadı"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              E-Posta Adresi *
            </label>
            <input
              type="email"
              id="user-email-input"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="kullanici@gebze.bel.tr"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Sistem Rolü *
            </label>
            <select
              id="user-role-select"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-semibold"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
            >
              <option value="ADMIN">Sistem Yöneticisi (ADMIN)</option>
              <option value="DEPT_MANAGER">Müdürlük Yöneticisi (DEPT_MANAGER)</option>
              <option value="STAFF">Saha / Taşınır Personeli (STAFF)</option>
              <option value="AUDITOR">İç Denetçi / Müfettiş (AUDITOR)</option>
              <option value="VIEWER">Görüntüleyici (VIEWER)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Bağlı Müdürlük
            </label>
            <select
              id="user-dept-select"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={departmentId}
              onChange={(e) => setDepartmentId(Number(e.target.value) || '')}
            >
              <option value="">Tüm Kurum / Seçimsiz</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              İlişkili Personel (Rehber)
            </label>
            <select
              id="user-person-select"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={personnelId}
              onChange={(e) => setPersonnelId(Number(e.target.value) || '')}
            >
              <option value="">Personel Bağlantısı Yok</option>
              {personnelList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName} ({p.departmentName || 'Birim Yok'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {!isEdit && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              İlk Giriş Parolası (Opsiyonel)
            </label>
            <input
              type="text"
              id="user-password-input"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Boş bırakılırsa güvenli geçici şifre otomatik üretilir"
            />
          </div>
        )}

        {isEdit && (
          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                id="user-isactive-checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <span className="text-xs font-semibold text-slate-800">
                Hesap Aktif (Giriş Yapabilir)
              </span>
            </label>
          </div>
        )}

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
            id="btn-save-user"
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            {isEdit ? <UserCheck className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
            {isSubmitting ? 'Kaydediliyor...' : isEdit ? 'Değişiklikleri Kaydet' : 'Kullanıcıyı Oluştur'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

