import React, { useState } from 'react';
import { Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { authService } from '../../services/authService';

export const ChangePasswordModal: React.FC = () => {
  const { mustChangePassword, setMustChangePassword, refreshSession } = useAuth();
  const { showToast } = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!mustChangePassword) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentPassword.trim()) {
      setError('Mevcut şifrenizi giriniz.');
      return;
    }
    if (!newPassword.trim()) {
      setError('Yeni şifrenizi giriniz.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Yeni şifre ve şifre tekrarı birbiriyle eşleşmiyor.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await authService.changePassword({
        currentPassword,
        newPassword,
      });

      showToast(res.message || 'Şifreniz başarıyla güncellendi.', 'success');
      setMustChangePassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      await refreshSession();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Şifre güncellenirken bir hata oluştu.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwd-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm"
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Başlık (Kapatma butonu kasıtlı olarak YOKTUR) */}
        <div className="bg-navy-900 text-white p-4 flex items-center gap-2.5">
          <div className="p-2 bg-navy-800 rounded-lg text-teal-400">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h2 id="pwd-modal-title" className="text-base font-bold text-white">
              Zorunlu Şifre Güncelleme
            </h2>
            <p className="text-xs text-slate-300">
              Güvenliğiniz için devam etmeden önce yeni şifre belirlemeniz gerekmektedir.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div
              role="alert"
              className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-700"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700" htmlFor="current-pwd">
              Mevcut Şifre
            </label>
            <input
              id="current-pwd"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              placeholder="Geçici veya mevcut şifreniz"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700" htmlFor="new-pwd">
              Yeni Güçlü Şifre
            </label>
            <input
              id="new-pwd"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              placeholder="En az 10 karakter, büyük/küçük harf, rakam, özel karakter"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700" htmlFor="confirm-pwd">
              Yeni Şifre (Tekrar)
            </label>
            <input
              id="confirm-pwd"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              placeholder="Yeni şifrenizi tekrar giriniz"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold text-sm rounded-lg transition-colors shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Güncelleniyor...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Şifremi Güncelle ve Devam Et</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
