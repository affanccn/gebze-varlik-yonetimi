import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, User, AlertCircle, LogIn, Database } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { PATHS } from '../../router/paths';

export const LoginView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, sessionExpiredMessage, clearSessionExpiredMessage } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || PATHS.DASHBOARD;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    clearSessionExpiredMessage();

    if (!username.trim()) {
      setError('Lütfen kullanıcı adınızı giriniz.');
      return;
    }
    if (!password.trim()) {
      setError('Lütfen şifrenizi giriniz.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(username.trim(), password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Kullanıcı adı veya şifre hatalı.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 relative overflow-hidden">
      {/* Dekoratif Kurumsal Arka Plan Deseni */}
      <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#14b8a6_1px,transparent_1px)] [background-size:24px_24px]" />

      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden animate-page-enter">
        {/* Üst Kart Alanı */}
        <div className="bg-gradient-to-b from-navy-950 to-navy-900 p-8 text-center text-white border-b border-navy-800">
          <div className="w-14 h-14 mx-auto mb-3.5 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center font-extrabold text-xl text-white shadow-lg ring-2 ring-teal-400/30">
            GB
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-500/10 border border-teal-500/30 rounded-full text-[11px] font-semibold text-teal-400 mb-2.5">
            <Database className="w-3.5 h-3.5" />
            <span>T.C. GEBZE BELEDİYE BAŞKANLIĞI</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Varlık Yönetim Sistemi</h1>
          <p className="text-xs text-slate-300 mt-2 max-w-xs mx-auto leading-relaxed">
            Kurumsal Müdürlükler, Hizmet Binaları, Katlar, Odalar ve Fiziksel Demirbaş Platformu
          </p>
        </div>

        {/* Giriş Formu */}
        <form onSubmit={handleSubmit} className="p-8 space-y-5" noValidate>
          {/* Oturum Süresi Doldu Uyarısı */}
          {sessionExpiredMessage && (
            <div
              role="alert"
              className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-xs text-amber-800"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600 mt-0.5" />
              <span className="font-medium">{sessionExpiredMessage}</span>
            </div>
          )}

          {/* Hata Bildirimi */}
          {error && (
            <div
              role="alert"
              className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-xs text-red-700 animate-in fade-in duration-200"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600 mt-0.5" />
              <span className="font-medium leading-relaxed">{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block" htmlFor="login-username">
              Kullanıcı Adı
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                id="login-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
                className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all text-slate-900"
                placeholder="Kurumsal kullanıcı adınız"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block" htmlFor="login-password">
              Parola
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all text-slate-900"
                placeholder="Sistem parolanız"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all shadow-md hover:shadow-lg mt-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Giriş Yapılıyor...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sisteme Güvenli Giriş Yap</span>
              </>
            )}
          </button>
        </form>

        {/* Alt Bilgi */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center text-[11px] text-slate-500 font-medium">
          T.C. Gebze Belediyesi Bilgi İşlem Müdürlüğü &bull; Kurumsal Varlık Yönetimi 2026
        </div>
      </div>
    </div>
  );
};
