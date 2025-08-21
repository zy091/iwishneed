import { useAuth } from './use-auth'

type Permission = 
  | 'view_requirements'
  | 'create_requirements' 
  | 'edit_requirements'
  | 'delete_requirements'
  | 'manage_users'
  | 'view_analytics'
  | 'manage_system'
  | 'add_comments'
  | 'delete_own_comments'
  | 'delete_any_comments'

type Role = 'admin' | 'manager' | 'developer' | 'submitter'

// 角色权限映射
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    'view_requirements',
    'create_requirements',
    'edit_requirements', 
    'delete_requirements',
    'manage_users',
    'view_analytics',
    'manage_system',
    'add_comments',
    'delete_own_comments',
    'delete_any_comments'
  ],
  manager: [
    'view_requirements',
    'create_requirements',
    'edit_requirements',
    'delete_requirements',
    'view_analytics',
    'add_comments',
    'delete_own_comments'
  ],
  developer: [
    'view_requirements',
    'create_requirements',
    'edit_requirements',
    'add_comments',
    'delete_own_comments'
  ],
  submitter: [
    'view_requirements',
    'create_requirements',
    'add_comments',
    'delete_own_comments'
  ]
}

export function usePermissions() {
  const { user } = useAuth()

  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false
    const userPermissions = ROLE_PERMISSIONS[user.role] || []
    return userPermissions.includes(permission)
  }

  const hasAnyPermission = (permissions: Permission[]): boolean => {
    return permissions.some(permission => hasPermission(permission))
  }

  const hasAllPermissions = (permissions: Permission[]): boolean => {
    return permissions.every(permission => hasPermission(permission))
  }

  const canViewRequirements = () => hasPermission('view_requirements')
  const canCreateRequirements = () => hasPermission('create_requirements')
  const canEditRequirements = () => hasPermission('edit_requirements')
  const canDeleteRequirements = () => hasPermission('delete_requirements')
  const canManageUsers = () => hasPermission('manage_users')
  const canViewAnalytics = () => hasPermission('view_analytics')
  const canManageSystem = () => hasPermission('manage_system')
  const canAddComments = () => hasPermission('add_comments')
  const canDeleteOwnComments = () => hasPermission('delete_own_comments')
  const canDeleteAnyComments = () => hasPermission('delete_any_comments')

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canViewRequirements,
    canCreateRequirements,
    canEditRequirements,
    canDeleteRequirements,
    canManageUsers,
    canViewAnalytics,
    canManageSystem,
    canAddComments,
    canDeleteOwnComments,
    canDeleteAnyComments,
    userRole: user?.role,
    isAdmin: user?.role === 'admin',
    isManager: user?.role === 'manager',
    isDeveloper: user?.role === 'developer',
    isSubmitter: user?.role === 'submitter'
  }
}