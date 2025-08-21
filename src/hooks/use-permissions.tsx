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
  | 'view_ratings'  // 新增：查看评分权限

// 基于主项目角色ID的权限映射
const getRolePermissions = (roleId: number): Permission[] => {
  // 超级管理员 (role_id: 0) 拥有所有权限，包括查看评分
  if (roleId === 0) {
    return [
      'view_requirements',
      'create_requirements',
      'edit_requirements', 
      'delete_requirements',
      'manage_users',
      'view_analytics',
      'manage_system',
      'add_comments',
      'delete_own_comments',
      'delete_any_comments',
      'view_ratings'  // 只有超级管理员可以查看评分
    ]
  }
  
  // 其他所有角色都有除评分外的所有权限
  return [
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
  ]
}

export function usePermissions() {
  const { user } = useAuth()

  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false
    // 使用主项目的 role_id 来判断权限
    const roleId = (user as any).role_id || 999 // 默认非超级管理员
    const userPermissions = getRolePermissions(roleId)
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
  const canViewRatings = () => hasPermission('view_ratings')

  const roleId = (user as any)?.role_id || 999
  const roleName = (user as any)?.rolename || user?.role || '未知角色'

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
    canViewRatings,
    userRole: user?.role,
    roleName,
    roleId,
    isSuperAdmin: roleId === 0,
    isAdmin: user?.role === 'admin',
    isManager: user?.role === 'manager',
    isDeveloper: user?.role === 'developer',
    isSubmitter: user?.role === 'submitter'
  }
}
