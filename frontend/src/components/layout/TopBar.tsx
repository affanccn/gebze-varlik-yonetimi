import React from 'react';
import { Menu, LogOut, Database } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface TopBarProps {
  onToggleSidebar: () => void;
  title: string;
}

export const TopBar: React.FC<TopBarProps> = ({ onToggleSidebar, title }) => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3">
        {/* Sol Alan: Hamburger & Başlık */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg lg:hidden"
            aria-label="Menüyü aç/kapat"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-teal-600 hidden sm:inline">Gebze EKYS</span>
            <span className="text-slate-300 hidden sm:inline">&rsaquo;</span>
            <h2 className="text-base font-bold text-slate-800">{title}</h2>
          </div>
        </div>

        {/* Sağ Alan: Durum, Kullanıcı & Çıkış */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-teal-50 border border-teal-200 rounded-full text-xs font-medium text-teal-800">
            <Database className="w-3.5 h-3.5 text-teal-600" />
            <span>Oracle 23ai Bağlı</span>
          </div>

          <div className="flex items-center gap-2.5 pl-2 sm:pl-3 border-l border-slate-200">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-slate-800 leading-tight">
                {user?.fullName || 'Kullanıcı'}
              </div>
              <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-slate-100 text-slate-700 border border-slate-300">
                {user?.role || 'VIEWER'}
              </span>
            </div>

            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-lg transition-colors"
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
