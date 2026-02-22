
export type UserRole = 'Administrador' | 'Gestor' | 'Técnico' | 'Visualizador';

export const canManageUsers = (role: UserRole) => role === 'Administrador';

export const canCreateAssets = (role: UserRole) => ['Administrador', 'Gestor'].includes(role);

export const canCreateProperties = (role: UserRole) => ['Administrador', 'Gestor'].includes(role);

export const canReportIncidents = (role: UserRole) => ['Administrador', 'Gestor', 'Técnico'].includes(role);

export const canUpdateIncidents = (role: UserRole) => ['Administrador', 'Gestor', 'Técnico'].includes(role);

export const canManageMaintenance = (role: UserRole) => ['Administrador', 'Gestor'].includes(role);

export const canManagePlanning = (role: UserRole) => ['Administrador', 'Gestor'].includes(role);

export const canViewReports = (role: UserRole) => ['Administrador', 'Gestor'].includes(role);

export const isReadOnly = (role: UserRole) => role === 'Visualizador';
