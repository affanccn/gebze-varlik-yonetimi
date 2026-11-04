import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { PATHS } from './paths';
import { ProtectedRoute } from './ProtectedRoute';
import { AppLayout } from '../components/layout/AppLayout';
import { LoginView } from '../views/auth/LoginView';

// Loading fallback component
const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center min-h-[350px]">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      <span className="text-xs font-semibold text-slate-400">Modül yükleniyor...</span>
    </div>
  </div>
);

// Route-based Lazy Loaded Views
const DashboardView = lazy(() => import('../views/dashboard/DashboardView').then((m) => ({ default: m.DashboardView })));
const TreeView = lazy(() => import('../views/tree/TreeView').then((m) => ({ default: m.TreeView })));
const LocationsView = lazy(() => import('../views/locations/LocationsView').then((m) => ({ default: m.LocationsView })));
const DepartmentsView = lazy(() => import('../views/departments/DepartmentsView').then((m) => ({ default: m.DepartmentsView })));
const PersonnelView = lazy(() => import('../views/personnel/PersonnelView').then((m) => ({ default: m.PersonnelView })));
const CategoriesView = lazy(() => import('../views/categories/CategoriesView').then((m) => ({ default: m.CategoriesView })));
const MovementsView = lazy(() => import('../views/movements/MovementsView').then((m) => ({ default: m.MovementsView })));
const DocumentsView = lazy(() => import('../views/documents/DocumentsView').then((m) => ({ default: m.DocumentsView })));
const ReportsView = lazy(() => import('../views/reports/ReportsView').then((m) => ({ default: m.ReportsView })));
const QRCodesView = lazy(() => import('../views/qrcodes/QRCodesView').then((m) => ({ default: m.QRCodesView })));
const AssetsView = lazy(() => import('../views/assets/AssetsView').then((m) => ({ default: m.AssetsView })));
const AssignmentsView = lazy(() => import('../views/assignments/AssignmentsView').then((m) => ({ default: m.AssignmentsView })));
const MaintenancesView = lazy(() => import('../views/maintenances/MaintenancesView').then((m) => ({ default: m.MaintenancesView })));
const StockView = lazy(() => import('../views/stock/StockView').then((m) => ({ default: m.StockView })));
const FleetView = lazy(() => import('../views/fleet/FleetView').then((m) => ({ default: m.FleetView })));
const ProcurementView = lazy(() => import('../views/procurement/ProcurementView').then((m) => ({ default: m.ProcurementView })));
const CountingView = lazy(() => import('../views/counting/CountingView').then((m) => ({ default: m.CountingView })));
const AuditLogsView = lazy(() => import('../views/audit/AuditLogsView').then((m) => ({ default: m.AuditLogsView })));
const UsersView = lazy(() => import('../views/users/UsersView').then((m) => ({ default: m.UsersView })));
const SettingsView = lazy(() => import('../views/settings/SettingsView').then((m) => ({ default: m.SettingsView })));
const NotFoundView = lazy(() => import('../views/notfound/NotFoundView').then((m) => ({ default: m.NotFoundView })));

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
        element: (
          <Suspense fallback={<PageLoader />}>
            <DashboardView />
          </Suspense>
        ),
      },
      // 2. Tree (STAFF excluded)
      {
        path: PATHS.TREE.replace('/', ''),
        element: (
          <ProtectedRoute forbiddenRoles={['STAFF']}>
            <Suspense fallback={<PageLoader />}>
              <TreeView />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      // 3. Locations
      {
        path: PATHS.LOCATIONS.replace('/', ''),
        element: (
          <Suspense fallback={<PageLoader />}>
            <LocationsView />
          </Suspense>
        ),
      },
      // 4. Departments
      {
        path: PATHS.DEPARTMENTS.replace('/', ''),
        element: (
          <Suspense fallback={<PageLoader />}>
            <DepartmentsView />
          </Suspense>
        ),
      },
      // 5. Personnel
      {
        path: PATHS.PERSONNEL.replace('/', ''),
        element: (
          <Suspense fallback={<PageLoader />}>
            <PersonnelView />
          </Suspense>
        ),
      },
      // Assets (Faz R3a)
      {
        path: PATHS.ASSETS.replace('/', ''),
        element: (
          <Suspense fallback={<PageLoader />}>
            <AssetsView />
          </Suspense>
        ),
      },
      // 6. Categories
      {
        path: PATHS.CATEGORIES.replace('/', ''),
        element: (
          <Suspense fallback={<PageLoader />}>
            <CategoriesView />
          </Suspense>
        ),
      },
      // Assignments (Faz R3b)
      {
        path: PATHS.ASSIGNMENTS.replace('/', ''),
        element: (
          <Suspense fallback={<PageLoader />}>
            <AssignmentsView />
          </Suspense>
        ),
      },
      // Maintenances (Faz R3b)
      {
        path: PATHS.MAINTENANCES.replace('/', ''),
        element: (
          <ProtectedRoute forbiddenRoles={['STAFF']}>
            <Suspense fallback={<PageLoader />}>
              <MaintenancesView />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      // 7. Movements
      {
        path: PATHS.MOVEMENTS.replace('/', ''),
        element: (
          <Suspense fallback={<PageLoader />}>
            <MovementsView />
          </Suspense>
        ),
      },
      // Stock (Faz R3b)
      {
        path: PATHS.STOCK.replace('/', ''),
        element: (
          <ProtectedRoute forbiddenRoles={['STAFF']}>
            <Suspense fallback={<PageLoader />}>
              <StockView />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      // Fleet (R4)
      {
        path: PATHS.FLEET.replace('/', ''),
        element: (
          <ProtectedRoute forbiddenRoles={['STAFF']}>
            <Suspense fallback={<PageLoader />}>
              <FleetView />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      // Procurement (R4)
      {
        path: PATHS.PROCUREMENT.replace('/', ''),
        element: (
          <ProtectedRoute forbiddenRoles={['STAFF']}>
            <Suspense fallback={<PageLoader />}>
              <ProcurementView />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      // Counting (R4)
      {
        path: PATHS.COUNTING.replace('/', ''),
        element: (
          <ProtectedRoute forbiddenRoles={['STAFF']}>
            <Suspense fallback={<PageLoader />}>
              <CountingView />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      // 8. QR Codes
      {
        path: PATHS.QRCODES.replace('/', ''),
        element: (
          <Suspense fallback={<PageLoader />}>
            <QRCodesView />
          </Suspense>
        ),
      },
      // 9. Documents
      {
        path: PATHS.DOCUMENTS.replace('/', ''),
        element: (
          <Suspense fallback={<PageLoader />}>
            <DocumentsView />
          </Suspense>
        ),
      },
      // 10. Reports (STAFF excluded)
      {
        path: PATHS.REPORTS.replace('/', ''),
        element: (
          <ProtectedRoute forbiddenRoles={['STAFF']}>
            <Suspense fallback={<PageLoader />}>
              <ReportsView />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      // Audit (R4)
      {
        path: PATHS.AUDIT.replace('/', ''),
        element: (
          <ProtectedRoute allowedRoles={['ADMIN', 'AUDITOR']}>
            <Suspense fallback={<PageLoader />}>
              <AuditLogsView />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      // Users (R4)
      {
        path: PATHS.USERS.replace('/', ''),
        element: (
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <Suspense fallback={<PageLoader />}>
              <UsersView />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      // Settings (R4)
      {
        path: PATHS.SETTINGS.replace('/', ''),
        element: (
          <Suspense fallback={<PageLoader />}>
            <SettingsView />
          </Suspense>
        ),
      },
      // 404 in layout
      {
        path: '*',
        element: (
          <Suspense fallback={<PageLoader />}>
            <NotFoundView />
          </Suspense>
        ),
      },
    ],
  },
  {
    path: '*',
    element: (
      <Suspense fallback={<PageLoader />}>
        <NotFoundView />
      </Suspense>
    ),
  },
]);
