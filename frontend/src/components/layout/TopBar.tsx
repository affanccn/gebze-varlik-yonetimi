import React, { useEffect, useState } from 'react';
import { Menu, LogOut, Database, Sun, Moon, Shield } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface TopBarProps {
  onToggleSidebar: () => void;
  title: string;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Sistem Yöneticisi',
  DEPT_MANAGER: 'Birim Müdürü',
  STAFF: 'Saha Personeli',
  AUDITOR: 'İç Denetçi',
  VIEWER: 'Kurum İzleyici',
};

export const TopBar: React.FC<TopBarProps> = ({ onToggleSidebar, title }) => {
  const { user, logout } = useAuth();
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('gebze_ekys_theme') === 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('gebze_ekys_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('gebze_ekys_theme', 'light');
    }
  }, [isDark]);

  const roleCode = user?.role || 'VIEWER';
  const roleLabel = ROLE_LABELS[roleCode] || roleCode;

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs transition-colors">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3">
        {/* Sol Alan: Hamburger & Başlık */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg lg:hidden transition-colors"
            aria-label="Menüyü aç/kapat"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-sm">
            <span className="font-bold text-teal-700 bg-teal-50 border border-teal-200/80 px-2 py-0.5 rounded-md text-xs hidden sm:inline">
              GEBZE EKYS
            </span>
            <span className="text-slate-300 hidden sm:inline">/</span>
            <h2 className="text-base font-bold text-slate-800 tracking-tight">{title}</h2>
          </div>
        </div>

        {/* Sağ Alan: Tema, Durum, Kullanıcı & Çıkış */}
        <div className="flex items-center gap-2.5 sm:gap-3.5">
          <button
            type="button"
            id="btn-theme-toggle"
            onClick={() => setIsDark((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-700 transition-colors"
            title={isDark ? 'Açık Temaya Geç' : 'Koyu Temaya Geç'}
            aria-label="Temayı değiştir"
          >
            {isDark ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden xl:inline">Açık Tema</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-slate-600" />
                <span className="hidden xl:inline">Koyu Tema</span>
              </>
            )}
          </button>

          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-teal-50 border border-teal-200 rounded-full text-xs font-semibold text-teal-800">
            <Database className="w-3.5 h-3.5 text-teal-600" />
            <span>Oracle 23ai Bağlı</span>
          </div>

          <div className="flex items-center gap-2.5 pl-2 sm:pl-3 border-l border-slate-200">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-bold text-slate-800 leading-tight">
                {user?.fullName || 'Kullanıcı'}
              </div>
              <div className="flex items-center justify-end gap-1 mt-0.5">
                <span
                  title={roleLabel}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-slate-100 text-slate-700 border border-slate-300"
                >
                  <Shield className="w-2.5 h-2.5 text-teal-600" />
                  {roleCode}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-lg transition-all shadow-2xs"
              title="Güvenli Çıkış"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Çıkış</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
