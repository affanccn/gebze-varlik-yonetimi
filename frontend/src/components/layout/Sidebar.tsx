import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Network,
  Building2,
  Landmark,
  Users,
  Package,
  Tags,
  Handshake,
  Wrench,
  History,
  Store,
  Truck,
  ShoppingCart,
  ClipboardCheck,
  QrCode,
  FolderArchive,
  BarChart3,
  ShieldCheck,
  UserCog,
  Settings,
  X,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { PATHS } from '../../router/paths';
import type { Role } from '../../types/auth';

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  allowedRoles?: Role[];
  forbiddenRoles?: Role[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const role = user?.role || 'VIEWER';

  const groups: NavGroup[] = [
    {
      label: '📌 GENEL BAKIŞ',
      items: [
        { name: 'Ana Ekran', path: PATHS.DASHBOARD, icon: <LayoutDashboard className="w-4 h-4" /> },
        {
          name: 'Kurumsal & Fiziksel Ağaç',
          path: PATHS.TREE,
          icon: <Network className="w-4 h-4" />,
          forbiddenRoles: ['STAFF'],
        },
      ],
    },
    {
      label: '🏛️ KURUMSAL YAPI',
      items: [
        { name: 'Binalar & Odalar', path: PATHS.LOCATIONS, icon: <Building2 className="w-4 h-4" /> },
        { name: 'Müdürlükler', path: PATHS.DEPARTMENTS, icon: <Landmark className="w-4 h-4" /> },
        { name: 'Personel Yönetimi', path: PATHS.PERSONNEL, icon: <Users className="w-4 h-4" /> },
      ],
    },
    {
      label: '📦 DEMİRBAŞ & VARLIK',
      items: [
        { name: 'Varlıklar', path: PATHS.ASSETS, icon: <Package className="w-4 h-4" /> },
        { name: 'Kategoriler', path: PATHS.CATEGORIES, icon: <Tags className="w-4 h-4" /> },
        { name: 'Zimmet', path: PATHS.ASSIGNMENTS, icon: <Handshake className="w-4 h-4" /> },
        {
          name: 'Bakım & Onarım',
          path: PATHS.MAINTENANCES,
          icon: <Wrench className="w-4 h-4" />,
          forbiddenRoles: ['STAFF'],
        },
        { name: 'Hareketler & Transfer', path: PATHS.MOVEMENTS, icon: <History className="w-4 h-4" /> },
      ],
    },
    {
      label: '🏬 LOJİSTİK & FİLO',
      items: [
        {
          name: 'Depo & Stok',
          path: PATHS.STOCK,
          icon: <Store className="w-4 h-4" />,
          forbiddenRoles: ['STAFF'],
        },
        {
          name: 'Araç & Filo',
          path: PATHS.FLEET,
          icon: <Truck className="w-4 h-4" />,
          forbiddenRoles: ['STAFF'],
        },
        {
          name: 'Satın Alma & Tedarik',
          path: PATHS.PROCUREMENT,
          icon: <ShoppingCart className="w-4 h-4" />,
          forbiddenRoles: ['STAFF'],
        },
      ],
    },
    {
      label: '📋 DENETİM & KONTROL',
      items: [
        {
          name: 'Sayım & Kontrol',
          path: PATHS.COUNTING,
          icon: <ClipboardCheck className="w-4 h-4" />,
          forbiddenRoles: ['STAFF'],
        },
        { name: 'QR Kod & Etiketler', path: PATHS.QRCODES, icon: <QrCode className="w-4 h-4" /> },
        { name: 'Belge Yönetimi', path: PATHS.DOCUMENTS, icon: <FolderArchive className="w-4 h-4" /> },
        {
          name: 'Raporlama & Analiz',
          path: PATHS.REPORTS,
          icon: <BarChart3 className="w-4 h-4" />,
          forbiddenRoles: ['STAFF'],
        },
        {
          name: 'Denetim & Onay',
          path: PATHS.AUDIT,
          icon: <ShieldCheck className="w-4 h-4" />,
          allowedRoles: ['ADMIN', 'AUDITOR'],
        },
        {
          name: 'Kullanıcılar',
          path: PATHS.USERS,
          icon: <UserCog className="w-4 h-4" />,
          allowedRoles: ['ADMIN'], // YALNIZCA ADMIN
        },
        { name: 'Sistem Yönetimi', path: PATHS.SETTINGS, icon: <Settings className="w-4 h-4" /> },
      ],
    },
  ];

  return (
    <>
      {/* Mobil Karartma Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Çekmecesi */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-navy-950 via-navy-900 to-navy-900 text-slate-200 border-r border-navy-800/80 shadow-xl flex flex-col transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:shrink-0 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Başlık / Logo */}
        <div className="flex items-center justify-between p-4 border-b border-navy-800/90 bg-navy-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-700 rounded-xl flex items-center justify-center font-extrabold text-white shadow-md ring-1 ring-teal-400/30">
              GB
            </div>
            <div>
              <div className="text-[10px] font-bold tracking-widest text-teal-400 uppercase">T.C. KOCAELİ</div>
              <div className="text-sm font-extrabold text-white tracking-wide leading-tight">GEBZE BELEDİYESİ</div>
              <div className="text-[11px] font-medium text-slate-300">Varlık Yönetim Sistemi</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg lg:hidden"
            aria-label="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigasyon Grupları */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 pb-8 space-y-5 scrollbar-thin">
          {groups.map((group) => {
            const visibleItems = group.items.filter((item) => {
              if (item.allowedRoles && !item.allowedRoles.includes(role)) return false;
              if (item.forbiddenRoles && item.forbiddenRoles.includes(role)) return false;
              return true;
            });

            if (visibleItems.length === 0) return null;

            return (
              <div key={group.label} className="space-y-1">
                <div className="px-3 text-[10px] font-extrabold text-slate-400/90 tracking-widest uppercase">
                  {group.label}
                </div>
                <div className="mt-1 space-y-0.5">
                  {visibleItems.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
                          isActive
                            ? 'bg-gradient-to-r from-teal-600 to-teal-500 text-white font-semibold shadow-md shadow-teal-950/40 ring-1 ring-teal-400/30'
                            : 'text-slate-300 hover:bg-navy-800/80 hover:text-white hover:translate-x-0.5'
                        }`
                      }
                    >
                      <span className="flex-shrink-0">{item.icon}</span>
                      <span className="truncate">{item.name}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
};
