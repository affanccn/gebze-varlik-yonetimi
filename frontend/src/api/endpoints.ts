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
  AUDIT_LOGS: '/api/audit-logs',

  // System
  USERS: '/api/users',
  SETTINGS: '/api/settings',
} as const;

