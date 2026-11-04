import { createBrowserRouter, Navigate } from 'react-router-dom';
import { PATHS } from './paths';
import { ProtectedRoute } from './ProtectedRoute';
import { AppLayout } from '../components/layout/AppLayout';
import { LoginView } from '../views/auth/LoginView';
import { PlaceholderView } from '../views/placeholder/PlaceholderView';

// Faz R2 Read Views
import { DashboardView } from '../views/dashboard/DashboardView';
import { TreeView } from '../views/tree/TreeView';
import { LocationsView } from '../views/locations/LocationsView';
import { DepartmentsView } from '../views/departments/DepartmentsView';
import { PersonnelView } from '../views/personnel/PersonnelView';
import { CategoriesView } from '../views/categories/CategoriesView';
import { MovementsView } from '../views/movements/MovementsView';
import { DocumentsView } from '../views/documents/DocumentsView';
import { ReportsView } from '../views/reports/ReportsView';
import { QRCodesView } from '../views/qrcodes/QRCodesView';

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
      // 1. Dashboard
      {
        path: PATHS.DASHBOARD.replace('/', ''),
        element: <DashboardView />,
      },
      // 2. Tree (STAFF excluded)
      {
        path: PATHS.TREE.replace('/', ''),
        element: (
          <ProtectedRoute forbiddenRoles={['STAFF']}>
            <TreeView />
          </ProtectedRoute>
        ),
      },
      // 3. Locations
      {
        path: PATHS.LOCATIONS.replace('/', ''),
        element: <LocationsView />,
      },
      // 4. Departments
      {
        path: PATHS.DEPARTMENTS.replace('/', ''),
        element: <DepartmentsView />,
      },
      // 5. Personnel
      {
        path: PATHS.PERSONNEL.replace('/', ''),
        element: <PersonnelView />,
      },
      // Assets (CRUD in R3a)
      {
        path: PATHS.ASSETS.replace('/', ''),
        element: <PlaceholderView title="Demirbaş ve Varlık Envanteri" phase="R3a" />,
      },
      // 6. Categories
      {
        path: PATHS.CATEGORIES.replace('/', ''),
        element: <CategoriesView />,
      },
      // Assignments (R3b)
      {
        path: PATHS.ASSIGNMENTS.replace('/', ''),
        element: <PlaceholderView title="Zimmet İşlemleri ve Fişler" phase="R3b" />,
      },
      // Maintenances (R3b)
      {
        path: PATHS.MAINTENANCES.replace('/', ''),
        element: (
          <ProtectedRoute forbiddenRoles={['STAFF']}>
            <PlaceholderView title="Bakım & Onarım İş Emirleri" phase="R3b" />
          </ProtectedRoute>
        ),
      },
      // 7. Movements
      {
        path: PATHS.MOVEMENTS.replace('/', ''),
        element: <MovementsView />,
      },
      // Stock (R3b)
      {
        path: PATHS.STOCK.replace('/', ''),
        element: (
          <ProtectedRoute forbiddenRoles={['STAFF']}>
            <PlaceholderView title="Depo ve Stok Yönetimi" phase="R3b" />
          </ProtectedRoute>
        ),
      },
      // Fleet (R4)
      {
        path: PATHS.FLEET.replace('/', ''),
        element: (
          <ProtectedRoute forbiddenRoles={['STAFF']}>
            <PlaceholderView title="Araç & Filo (İş Makineleri Dahil)" phase="R4" />
          </ProtectedRoute>
        ),
      },
      // Procurement (R4)
      {
        path: PATHS.PROCUREMENT.replace('/', ''),
        element: (
          <ProtectedRoute forbiddenRoles={['STAFF']}>
            <PlaceholderView title="Satın Alma & Tedarik Süreçleri" phase="R4" />
          </ProtectedRoute>
        ),
      },
      // Counting (R4)
      {
        path: PATHS.COUNTING.replace('/', ''),
        element: (
          <ProtectedRoute forbiddenRoles={['STAFF']}>
            <PlaceholderView title="Fiziksel Sayım & Kontrol" phase="R4" />
          </ProtectedRoute>
        ),
      },
      // 8. QR Codes
      {
        path: PATHS.QRCODES.replace('/', ''),
        element: <QRCodesView />,
      },
      // 9. Documents
      {
        path: PATHS.DOCUMENTS.replace('/', ''),
        element: <DocumentsView />,
      },
      // 10. Reports (STAFF excluded)
      {
        path: PATHS.REPORTS.replace('/', ''),
        element: (
          <ProtectedRoute forbiddenRoles={['STAFF']}>
            <ReportsView />
          </ProtectedRoute>
        ),
      },
      // Audit (R4)
      {
        path: PATHS.AUDIT.replace('/', ''),
        element: (
          <ProtectedRoute allowedRoles={['ADMIN', 'AUDITOR']}>
            <PlaceholderView title="Sistem Denetim ve Onay Günlüğü" phase="R4" />
          </ProtectedRoute>
        ),
      },
      // Users (R4)
      {
        path: PATHS.USERS.replace('/', ''),
        element: (
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <PlaceholderView title="Kullanıcı Yönetimi & Hesap Güvenliği" phase="R4" />
          </ProtectedRoute>
        ),
      },
      // Settings (R4)
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
