import { createBrowserRouter, Navigate } from 'react-router-dom';
import { PATHS } from './paths';
import { ProtectedRoute } from './ProtectedRoute';
import { AppLayout } from '../components/layout/AppLayout';
import { LoginView } from '../views/auth/LoginView';
import { PlaceholderView } from '../views/placeholder/PlaceholderView';

export const router = createBrowserRouter([
  {
    path: PATHS.LOGIN,
    element: <LoginView />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to={PATHS.DASHBOARD} replace />,
      },
      {
        path: PATHS.DASHBOARD.replace('/', ''),
        element: <PlaceholderView title="Ana Ekran & Dashboard" phase="R2" />,
      },
      {
        path: PATHS.TREE.replace('/', ''),
        element: (
          <ProtectedRoute forbiddenRoles={['STAFF']}>
            <PlaceholderView title="Kurumsal & Fiziksel Ağaç" phase="R2" />
          </ProtectedRoute>
        ),
      },
      {
        path: PATHS.LOCATIONS.replace('/', ''),
        element: <PlaceholderView title="Binalar, Katlar ve Odalar" phase="R2" />,
      },
      {
        path: PATHS.DEPARTMENTS.replace('/', ''),
        element: <PlaceholderView title="30 Kurumsal Müdürlük" phase="R2" />,
      },
      {
        path: PATHS.PERSONNEL.replace('/', ''),
        element: <PlaceholderView title="Personel Yönetimi" phase="R2" />,
      },
      {
        path: PATHS.ASSETS.replace('/', ''),
        element: <PlaceholderView title="Demirbaş ve Varlık Envanteri" phase="R3a" />,
      },
      {
        path: PATHS.CATEGORIES.replace('/', ''),
        element: <PlaceholderView title="16 Ana Varlık Kategorisi" phase="R2" />,
      },
      {
        path: PATHS.ASSIGNMENTS.replace('/', ''),
        element: <PlaceholderView title="Zimmet İşlemleri ve Fişler" phase="R3b" />,
      },
      {
        path: PATHS.MAINTENANCES.replace('/', ''),
        element: (
          <ProtectedRoute forbiddenRoles={['STAFF']}>
            <PlaceholderView title="Bakım & Onarım İş Emirleri" phase="R3b" />
          </ProtectedRoute>
        ),
      },
      {
        path: PATHS.MOVEMENTS.replace('/', ''),
        element: <PlaceholderView title="Hareketler ve Konum Transferi" phase="R2" />,
      },
      {
        path: PATHS.STOCK.replace('/', ''),
        element: (
          <ProtectedRoute forbiddenRoles={['STAFF']}>
            <PlaceholderView title="Depo ve Stok Yönetimi" phase="R3b" />
          </ProtectedRoute>
        ),
      },
      {
        path: PATHS.FLEET.replace('/', ''),
        element: (
          <ProtectedRoute forbiddenRoles={['STAFF']}>
            <PlaceholderView title="Araç & Filo (İş Makineleri Dahil)" phase="R4" />
          </ProtectedRoute>
        ),
      },
      {
        path: PATHS.PROCUREMENT.replace('/', ''),
        element: (
          <ProtectedRoute forbiddenRoles={['STAFF']}>
            <PlaceholderView title="Satın Alma & Tedarik Süreçleri" phase="R4" />
          </ProtectedRoute>
        ),
      },
      {
        path: PATHS.COUNTING.replace('/', ''),
        element: (
          <ProtectedRoute forbiddenRoles={['STAFF']}>
            <PlaceholderView title="Fiziksel Sayım & Kontrol" phase="R4" />
          </ProtectedRoute>
        ),
      },
      {
        path: PATHS.QRCODES.replace('/', ''),
        element: <PlaceholderView title="QR Kod & Etiket Yönetimi" phase="R2" />,
      },
      {
        path: PATHS.DOCUMENTS.replace('/', ''),
        element: <PlaceholderView title="Belge & Evrak Arşivi" phase="R2" />,
      },
      {
        path: PATHS.REPORTS.replace('/', ''),
        element: (
          <ProtectedRoute forbiddenRoles={['STAFF']}>
            <PlaceholderView title="Raporlama & Amortisman Analizi" phase="R2" />
          </ProtectedRoute>
        ),
      },
      {
        path: PATHS.AUDIT.replace('/', ''),
        element: (
          <ProtectedRoute allowedRoles={['ADMIN', 'AUDITOR']}>
            <PlaceholderView title="Sistem Denetim ve Onay Günlüğü" phase="R4" />
          </ProtectedRoute>
        ),
      },
      {
        path: PATHS.USERS.replace('/', ''),
        element: (
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <PlaceholderView title="Kullanıcı Yönetimi & Hesap Güvenliği" phase="R4" />
          </ProtectedRoute>
        ),
      },
      {
        path: PATHS.SETTINGS.replace('/', ''),
        element: <PlaceholderView title="Sistem Ayarları & Yetki Matrisi" phase="R4" />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to={PATHS.DASHBOARD} replace />,
  },
]);
