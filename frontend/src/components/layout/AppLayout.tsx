import React, { useState, useMemo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { ChangePasswordModal } from '../../views/auth/ChangePasswordModal';
import { PATHS } from '../../router/paths';

export const AppLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  const titleMap = useMemo<Record<string, string>>(() => ({
    [PATHS.DASHBOARD]: 'Ana Ekran & Dashboard',
    [PATHS.TREE]: 'Kurumsal & Fiziksel Ağaç',
    [PATHS.LOCATIONS]: 'Binalar, Katlar ve Odalar',
    [PATHS.DEPARTMENTS]: '30 Kurumsal Müdürlük',
    [PATHS.PERSONNEL]: 'Personel Yönetimi',
    [PATHS.ASSETS]: 'Demirbaş ve Varlık Envanteri',
    [PATHS.CATEGORIES]: '16 Ana Varlık Kategorisi',
    [PATHS.ASSIGNMENTS]: 'Zimmet İşlemleri ve Fişler',
    [PATHS.MAINTENANCES]: 'Bakım & Onarım İş Emirleri',
    [PATHS.MOVEMENTS]: 'Hareketler ve Konum Transferi',
    [PATHS.STOCK]: 'Depo ve Stok Yönetimi',
    [PATHS.FLEET]: 'Araç & Filo (İş Makineleri Dahil)',
    [PATHS.PROCUREMENT]: 'Satın Alma & Tedarik Süreçleri',
    [PATHS.COUNTING]: 'Fiziksel Sayım & Kontrol',
    [PATHS.QRCODES]: 'QR Kod & Etiket Yönetimi',
    [PATHS.DOCUMENTS]: 'Belge & Evrak Arşivi',
    [PATHS.REPORTS]: 'Raporlama & Amortisman Analizi',
    [PATHS.AUDIT]: 'Sistem Denetim ve Onay Günlüğü',
    [PATHS.USERS]: 'Kullanıcı Yönetimi & Hesap Güvenliği',
    [PATHS.SETTINGS]: 'Sistem Ayarları & Yetki Matrisi',
  }), []);

  const currentTitle = titleMap[location.pathname] || 'Gebze EKYS';

  return (
    <div className="min-h-screen flex bg-[#f1f5f9] text-[#0f172a]">
      {/* Sol Menü */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Sağ Çalışma Alanı */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <TopBar
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          title={currentTitle}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {/* Kurumsal Bilgilendirme Banner'ı */}
          <div className="mb-6 p-4 bg-white border border-slate-200 rounded-xl shadow-sm text-xs text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <strong className="text-slate-800">Gebze Belediyesi Kurumsal Envanter Altyapısı:</strong> 30 müdürlük, 12 hizmet binası ve şantiye, katlar, odalar ve 16 ana kategori Oracle 23ai veritabanında hiyerarşik olarak yönetilmektedir.
            </div>
            <span className="inline-block px-2.5 py-1 bg-teal-50 border border-teal-200 text-teal-800 font-semibold rounded text-[11px] whitespace-nowrap self-start sm:self-center">
              React 18 + TS
            </span>
          </div>

          <Outlet />
        </main>
      </div>

      {/* Zorunlu Şifre Değiştirme Modalı */}
      <ChangePasswordModal />
    </div>
  );
};
