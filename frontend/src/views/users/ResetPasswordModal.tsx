import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../context/ToastContext';
import { userService } from '../../services/userService';
import { UserResponse, UserResetPasswordResponse } from '../../types/user';
import { KeyRound, Copy, Check, AlertTriangle } from 'lucide-react';

interface ResetPasswordModalProps {
  user: UserResponse | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  user,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetResult, setResetResult] = useState<UserResetPasswordResponse | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !user) return null;

  const handleReset = async () => {
    setIsSubmitting(true);
    try {
      const res = await userService.resetPassword(user.id);
      setResetResult(res);
      showToast(`'${user.username}' için yeni geçici şifre oluşturuldu.`);
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Şifre sıfırlanamadı.';
      showToast(msg, 'warning');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = () => {
    if (resetResult?.temporaryPassword) {
      navigator.clipboard.writeText(resetResult.temporaryPassword);
      setCopied(true);
      showToast('Geçici şifre panoya kopyalandı.');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setResetResult(null);
    setCopied(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Kullanıcı Şifresi Sıfırlama"
      maxWidth="md"
    >
      <div className="space-y-4">
        {!resetResult ? (
          <>
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800">
                <strong>{user.fullName} ({user.username})</strong> kullanıcısının mevcut şifresi geçersiz kılınacak ve sistem tarafından tek kullanımlık geçici bir şifre üretilecektir.
                Kullanıcı ilk girişinde şifresini değiştirmek zorunda kalacaktır.
              </div>
            </div>

            <div className="text-xs text-slate-600">
              Devam etmek istediğinize emin misiniz?
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Vazgeç
              </button>
              <button
                type="button"
                id="btn-confirm-reset-pwd"
                onClick={handleReset}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                <KeyRound className="w-3.5 h-3.5" />
                {isSubmitting ? 'Sıfırlanıyor...' : 'Şifreyi Sıfırla'}
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-4 py-2">
            <div className="text-center space-y-1">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                <Check className="w-6 h-6" />
              </div>
              <div className="text-sm font-bold text-slate-900">Yeni Geçici Şifre Üretildi</div>
              <div className="text-xs text-slate-500">
                Bu şifreyi kullanıcıya güvenli bir kanal üzerinden iletiniz:
              </div>
            </div>

            <div className="p-3 bg-slate-100 border border-slate-300 rounded-xl flex items-center justify-between font-mono text-sm font-bold text-slate-800">
              <span id="temp-password-text">{resetResult.temporaryPassword}</span>
              <button
                type="button"
                id="btn-copy-temp-pwd"
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
                onClick={handleClose}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg shadow-sm"
              >
                Kapat
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

