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
    [PATHS.DEPARTMENTS]: 'Kurumsal Müdürlükler',
    [PATHS.PERSONNEL]: 'Personel Yönetimi',
    [PATHS.ASSETS]: 'Demirbaş ve Varlık Envanteri',
    [PATHS.CATEGORIES]: 'Varlık Kategorileri',
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

        <main className="flex-1 p-3 sm:p-5 lg:p-6 max-w-[1680px] w-full mx-auto">
          {/* Kurumsal Bilgilendirme Banner'ı */}
          <div className="mb-6 p-3.5 sm:p-4 bg-white border border-slate-200/90 border-l-4 border-l-teal-600 rounded-xl shadow-sm text-xs text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="leading-relaxed">
              <strong className="text-slate-900 font-bold">Gebze Belediyesi Kurumsal Envanter Altyapısı:</strong> Kurumsal müdürlükler, hizmet binaları, şantiyeler, katlar, odalar ve varlık kategorileri Oracle 23ai veritabanında hiyerarşik olarak yönetilmektedir.
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-teal-50 border border-teal-200 text-teal-800 font-semibold rounded-lg text-[11px] whitespace-nowrap self-start sm:self-center">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-pulse" />
              T.C. Gebze Belediyesi &bull; Resmi Envanter Platformu
            </span>
          </div>

          <div key={location.pathname} className="animate-page-enter">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Zorunlu Şifre Değiştirme Modalı */}
      <ChangePasswordModal />
    </div>
  );
};

