'use client';

import { useState, useEffect, useCallback } from 'react';

// 简单的认证状态接口
interface AuthUser {
  id: string;
  name: string;
  role: string;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
}

// 简单的 useAuth hook 实现
function useAuth(): AuthState {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 这里可以从API获取用户信息
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.user) {
          setUser(data.user);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { user, loading };
}

/**
 * 权限检查Hook
 * 用于检查当前用户是否有特定权限
 */

export interface UserPermission {
  roles: Array<{
    id: string;
    name: string;
    display_name: string;
    level: number;
  }>;
  permissions: string[];
  data_permissions: Array<{
    data_type: string;
    data_id: string;
    permission_type: string;
  }>;
  level: number;
}

export function usePermissions() {
  const { user } = useAuth();
  const [userPermission, setUserPermission] = useState<UserPermission | null>(null);
  const [loading, setLoading] = useState(true);

  // 加载用户权限
  useEffect(() => {
    if (user?.id) {
      loadUserPermissions(user.id);
    } else {
      setUserPermission(null);
      setLoading(false);
    }
  }, [user?.id]);

  const loadUserPermissions = async (userId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/permissions?user_id=${userId}`);
      const result = await response.json();
      
      if (result.success) {
        setUserPermission(result.data);
      }
    } catch (error) {
      console.error('Load permissions error:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 检查是否有指定权限
   * @param permission 权限ID，如 'perm_production_view'
   */
  const hasPermission = useCallback((permission: string): boolean => {
    if (!userPermission) return false;
    return userPermission.permissions.includes(permission);
  }, [userPermission]);

  /**
   * 检查是否有任一权限
   * @param permissions 权限ID数组
   */
  const hasAnyPermission = useCallback((permissions: string[]): boolean => {
    if (!userPermission) return false;
    return permissions.some(p => userPermission.permissions.includes(p));
  }, [userPermission]);

  /**
   * 检查是否有所有权限
   * @param permissions 权限ID数组
   */
  const hasAllPermissions = useCallback((permissions: string[]): boolean => {
    if (!userPermission) return false;
    return permissions.every(p => userPermission.permissions.includes(p));
  }, [userPermission]);

  /**
   * 检查是否有指定角色
   * @param roleName 角色名称，如 'admin', 'manager'
   */
  const hasRole = useCallback((roleName: string): boolean => {
    if (!userPermission) return false;
    return userPermission.roles.some(r => r.name === roleName);
  }, [userPermission]);

  /**
   * 检查用户级别是否足够
   * @param requiredLevel 需要的级别（数字越小权限越大）
   */
  const hasLevel = useCallback((requiredLevel: number): boolean => {
    if (!userPermission) return false;
    return userPermission.level <= requiredLevel;
  }, [userPermission]);

  /**
   * 检查数据权限
   * @param dataType 数据类型，如 'order', 'customer'
   * @param dataId 数据ID
   * @param permissionType 权限类型，如 'view', 'edit', 'delete'
   */
  const hasDataPermission = useCallback((
    dataType: string, 
    dataId: string, 
    permissionType: string
  ): boolean => {
    if (!userPermission) return false;
    
    // 管理员拥有所有数据权限
    if (userPermission.level <= 1) return true;
    
    // 检查是否有该数据的特定权限
    return userPermission.data_permissions.some(
      dp => dp.data_type === dataType && 
            dp.data_id === dataId && 
            dp.permission_type === permissionType
    );
  }, [userPermission]);

  /**
   * 获取用户可访问的数据ID列表
   * @param dataType 数据类型
   */
  const getAccessibleDataIds = useCallback((dataType: string): string[] => {
    if (!userPermission) return [];
    
    // 管理员可访问所有数据
    if (userPermission.level <= 1) return ['*'];
    
    return userPermission.data_permissions
      .filter(dp => dp.data_type === dataType)
      .map(dp => dp.data_id);
  }, [userPermission]);

  return {
    userPermission,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasLevel,
    hasDataPermission,
    getAccessibleDataIds,
    // 便捷方法
    isAdmin: userPermission?.level === 1,
    isManager: userPermission?.level === 2,
    level: userPermission?.level || 999,
    roles: userPermission?.roles || [],
    permissions: userPermission?.permissions || []
  };
}

/**
 * 权限保护组件Props
 */
export interface PermissionGuardProps {
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  role?: string;
  level?: number;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * 权限保护组件
 * 根据权限决定是否显示子组件
 */
export function PermissionGuard({
  permission,
  permissions,
  requireAll = false,
  role,
  level,
  fallback = null,
  children
}: PermissionGuardProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, hasRole, hasLevel, loading } = usePermissions();

  if (loading) {
    return null;
  }

  let hasAccess = true;

  // 检查单个权限
  if (permission) {
    hasAccess = hasAccess && hasPermission(permission);
  }

  // 检查多个权限
  if (permissions && permissions.length > 0) {
    hasAccess = hasAccess && (requireAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions));
  }

  // 检查角色
  if (role) {
    hasAccess = hasAccess && hasRole(role);
  }

  // 检查级别
  if (level !== undefined) {
    hasAccess = hasAccess && hasLevel(level);
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}
