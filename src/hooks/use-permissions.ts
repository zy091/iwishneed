import { useAuth } from './useAuth'

export interface UserPermissions {
  canEdit: boolean
  canDelete: boolean
  canComment: boolean
  canManage: boolean
}

export function usePermissions(): UserPermissions {
  const { user } = useAuth()
  
  if (!user) {
    return {
      canEdit: false,
      canDelete: false,
      canComment: false,
      canManage: false
    }
  }

  const role = user.user_metadata?.role || 'user'
  
  return {
    canEdit: role === 'admin' || role === 'manager',
    canDelete: role === 'admin',
    canComment: true,
    canManage: role === 'admin' || role === 'manager'
  }
}