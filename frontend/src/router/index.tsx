import { createBrowserRouter, Navigate } from 'react-router-dom';
import { PATHS } from './paths';
import { ProtectedRoute } from './ProtectedRoute';
import { AppLayout } from '../components/layout/AppLayout';
import { LoginView } from '../views/auth/LoginView';

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
// Faz R3 Views
import { AssetsView } from '../views/assets/AssetsView';
import { AssignmentsView } from '../views/assignments/AssignmentsView';
import { MaintenancesView } from '../views/maintenances/MaintenancesView';
import { StockView } from '../views/stock/StockView';
// Faz R4 Views
import { FleetView } from '../views/fleet/FleetView';
import { ProcurementView } from '../views/procurement/ProcurementView';
import { CountingView } from '../views/counting/CountingView';
import { AuditLogsView } from '../views/audit/AuditLogsView';
import { UsersView } from '../views/users/UsersView';
import { SettingsView } from '../views/settings/SettingsView';

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
      // Assets (Faz R3a)
      {
        path: PATHS.ASSETS.replace('/', ''),
        element: <AssetsView />,
      },
      // 6. Categories
      {
        path: PATHS.CATEGORIES.replace('/', ''),
        element: <CategoriesView />,
      },
      // Assignments (Faz R3b)
      {
        path: PATHS.ASSIGNMENTS.replace('/', ''),
        element: <AssignmentsView />,
      },
      // Maintenances (Faz R3b)
      {
        path: PATHS.MAINTENANCES.replace('/', ''),
        element: (
          <ProtectedRoute forbiddenRoles={['STAFF']}>
            <MaintenancesView />
          </ProtectedRoute>
        ),
      },
      // 7. Movements
      {
        path: PATHS.MOVEMENTS.replace('/', ''),
        element: <MovementsView />,
      },
      // Stock (Faz R3b)
      {
        path: PATHS.STOCK.replace('/', ''),
        element: (
          <ProtectedRoute forbiddenRoles={['STAFF']}>
            <StockView />
          </ProtectedRoute>
        ),
      },
      // Fleet (R4)
      {
        path: PATHS.FLEET.replace('/', ''),
        element: (
          <ProtectedRoute forbiddenRoles={['STAFF']}>
            <FleetView />
          </ProtectedRoute>
        ),
      },
      // Procurement (R4)
      {
        path: PATHS.PROCUREMENT.replace('/', ''),
        element: (
          <ProtectedRoute forbiddenRoles={['STAFF']}>
            <ProcurementView />
          </ProtectedRoute>
        ),
      },
      // Counting (R4)
      {
        path: PATHS.COUNTING.replace('/', ''),
        element: (
          <ProtectedRoute forbiddenRoles={['STAFF']}>
            <CountingView />
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
            <AuditLogsView />
          </ProtectedRoute>
        ),
      },
      // Users (R4)
      {
        path: PATHS.USERS.replace('/', ''),
        element: (
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <UsersView />
          </ProtectedRoute>
        ),
      },
      // Settings (R4)
      {
        path: PATHS.SETTINGS.replace('/', ''),
        element: <SettingsView />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to={PATHS.DASHBOARD} replace />,
  },
]);
