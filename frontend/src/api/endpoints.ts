export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/api/auth/login',
  LOGOUT: '/api/auth/logout',
  ME: '/api/auth/me',
  CHANGE_PASSWORD: '/api/auth/change-password',

  // Core
  DASHBOARD: '/api/dashboard',
  ALERTS: '/api/alerts',
  TREE: '/api/hierarchy/tree',
  BUILDINGS: '/api/buildings',
  FLOORS: '/api/floors',
  ROOMS: '/api/rooms',
  DEPARTMENTS: '/api/departments',
  SUB_UNITS: '/api/sub-units',
  PERSONNEL: '/api/personnel',
  PERSONNEL_EXPORT_TEMPLATE: '/api/personnel/export-template',
  PERSONNEL_IMPORT_VALIDATE: '/api/personnel/import/validate',
  PERSONNEL_IMPORT_COMMIT: '/api/personnel/import/commit',
  CATEGORIES: '/api/categories',

  // Assets & Lifecycle
  ASSETS: '/api/assets',
  ASSET_EXPORT_TEMPLATE: '/api/assets/export-template',
  ASSET_IMPORT_VALIDATE: '/api/assets/import/validate',
  ASSET_IMPORT_COMMIT: '/api/assets/import/commit',

  // Operations
  ASSIGNMENTS: '/api/assignments',
  MAINTENANCES: '/api/maintenances',
  MOVEMENTS: '/api/movements',
  STOCK: '/api/stock',
  STOCK_TRANSACTIONS: '/api/stock/transactions',
  FLEET: '/api/fleet',
  PROCUREMENT: '/api/procurement',
  AUDITS: '/api/audits',
  DOCUMENTS: '/api/documents',
  REPORTS_DEPRECIATION: '/api/reports/depreciation',
  REPORTS_FORM13: '/api/reports/form13',
  REPORTS_DISPOSAL: '/api/reports/disposal',
  REPORTS_EXPORT: '/api/reports/export',
  AUDIT_LOGS: '/api/audit-logs',

  // System
  USERS: '/api/users',
  SETTINGS: '/api/settings',
} as const;

