'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// 权限类型定义
export interface Permission {
  id: string;
  module: string;
  action: string;
  name: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  username?: string;
  phone?: string;
  department?: string;
  position?: string;
  role_id?: string;
  roles?: string[];
  permissions?: Permission[];
  tenant_id?: string;      // 用户所属租户ID
  tenant_role?: string;    // 用户在租户中的角色
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  hasPermission: (module: string, action: string) => boolean;
  hasAnyPermission: (permissions: { module: string; action: string }[]) => boolean;
  hasRole: (roleIds: string[]) => boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// 角色ID映射（用于前端角色匹配）
const ROLE_ID_MAP: Record<string, string> = {
  '总经理': 'boss',
  '生产经理': 'manager',
  '生产主管': 'production_manager',
  '仓库管理员': 'warehouse',
  '质检员': 'qc',
  '财务': 'accountant',
  '财务主管': 'finance',
  '人事': 'hr',
  '操作员': 'operator',
  '工人': 'worker',
  '访客': 'viewer',
  '裁床主管': 'cutting_manager',
  '采购': 'purchase',
  '工艺员': 'craft',
  '后整主管': 'finishing',
  '系统管理员': 'admin',
  '工厂管理员': 'factory_admin',
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 获取当前用户信息
  const fetchUser = useCallback(async () => {
    try {
      // 首先从 localStorage 获取用户信息
      if (typeof window !== 'undefined') {
        const userInfoStr = localStorage.getItem('user_info');
        if (userInfoStr) {
          try {
            const userInfo = JSON.parse(userInfoStr);
            setUser(userInfo);
            setLoading(false);
            return;
          } catch {
            // 解析失败，继续检查
          }
        }
        
        // 检查供应商登录信息
        const supplierInfoStr = localStorage.getItem('supplier_info');
        if (supplierInfoStr) {
          try {
            const supplierInfo = JSON.parse(supplierInfoStr);
            setUser(supplierInfo);
            setLoading(false);
            return;
          } catch {
            // 解析失败
          }
        }
      }

      // 没有 localStorage 信息，设置为未登录
      setUser(null);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // 检查是否有特定权限
  const hasPermission = useCallback(
    (module: string, action: string): boolean => {
      if (!user) return false;
      
      // 如果用户有permissions数组
      if (user.permissions && user.permissions.length > 0) {
        return user.permissions.some(
          (p) => p.module === module && p.action === action
        );
      }
      
      // 如果用户是管理员角色
      if (user.role_id === 'admin' || user.role_id === 'boss' || 
          user.roles?.includes('admin') || user.roles?.includes('boss')) {
        return true;
      }
      
      // 基于角色的默认权限（降级方案）
      return checkRoleBasedPermission(user.role_id || user.roles?.[0], module, action);
    },
    [user]
  );

  // 检查是否有任一权限
  const hasAnyPermission = useCallback(
    (permissions: { module: string; action: string }[]): boolean => {
      if (!user) return false;
      return permissions.some((p) => hasPermission(p.module, p.action));
    },
    [user, hasPermission]
  );

  // 检查是否具有指定角色
  const hasRole = useCallback(
    (roleIds: string[]): boolean => {
      if (!user) return false;
      
      // 检查role_id
      if (user.role_id && roleIds.includes(user.role_id)) {
        return true;
      }
      
      // 检查roles数组
      if (user.roles) {
        return user.roles.some((r) => roleIds.includes(r) || roleIds.includes(ROLE_ID_MAP[r] || r));
      }
      
      return false;
    },
    [user]
  );

  // 登录
  const login = useCallback(async (username: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        await fetchUser();
        return { success: true };
      }
      
      return { success: false, error: data.error || '登录失败' };
    } catch (error) {
      return { success: false, error: '登录请求失败' };
    }
  }, [fetchUser]);

  // 登出
  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/login', { method: 'DELETE' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // 清除 localStorage 中的用户信息
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user_info');
        localStorage.removeItem('supplier_info');
        localStorage.removeItem('user_type');
        localStorage.removeItem('remembered_code');
        localStorage.removeItem('remembered_type');
      }
      setUser(null);
      window.location.href = '/login';
    }
  }, []);

  // 刷新用户信息
  const refreshUser = useCallback(async () => {
    setLoading(true);
    await fetchUser();
  }, [fetchUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        hasPermission,
        hasAnyPermission,
        hasRole,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// 基于角色的默认权限检查（降级方案）
function checkRoleBasedPermission(roleId: string | undefined, module: string, action: string): boolean {
  if (!roleId) return false;
  
  // 角色权限映射（简化版）
  const rolePermissions: Record<string, Record<string, string[]>> = {
    boss: { _all: ['*'] }, // 总经理有所有权限
    admin: { _all: ['*'] }, // 管理员有所有权限
    manager: {
      dashboard: ['view', 'export'],
      mes: ['view'],
      alert: ['view', 'handle'],
      production: ['view', 'create', 'edit', 'approve'],
      prep: ['view', 'edit'],
      cutting: ['view', 'create', 'edit'],
      bundle: ['view'],
      tracking: ['view', 'export'],
      process: ['view', 'create', 'edit'],
      quality: ['view'],
      cost: ['view'],
      inventory: ['view'],
      employee: ['view'],
      customer: ['view'],
      supplier: ['view'],
      outsource: ['view', 'create'],
      shipping: ['view'],
      ai: ['view'],
    },
    production_manager: {
      dashboard: ['view'],
      mes: ['view'],
      alert: ['view'],
      production: ['view', 'create', 'edit'],
      prep: ['view', 'edit'],
      cutting: ['view', 'create', 'edit'],
      bundle: ['view'],
      tracking: ['view', 'export'],
      process: ['view', 'edit'],
      quality: ['view', 'create', 'edit'],
      outsource: ['view', 'create', 'edit'],
      wage: ['view'],
      ai: ['view'],
    },
    warehouse: {
      dashboard: ['view'],
      inventory: ['view', 'in', 'out', 'adjust'],
      finished: ['view', 'in', 'out'],
      packing: ['view', 'create'],
      shipping: ['view', 'create', 'edit'],
    },
    qc: {
      dashboard: ['view'],
      quality: ['view', 'create', 'edit'],
      tracking: ['view'],
    },
    accountant: {
      dashboard: ['view'],
      finance: ['view', 'create', 'edit'],
      payment: ['view', 'create'],
      salary: ['view', 'create'],
      cost: ['view', 'export'],
      wage: ['view', 'export'],
    },
    hr: {
      dashboard: ['view'],
      employee: ['view', 'create', 'edit', 'delete'],
      salary: ['view', 'create'],
      wage: ['view', 'export'],
    },
    operator: {
      scan: ['view', 'execute'],
      wage: ['view'],
    },
    worker: {
      scan: ['view', 'execute'],
      wage: ['view'],
    },
    viewer: {
      dashboard: ['view'],
      production: ['view'],
      inventory: ['view'],
      ai: ['view'],
    },
    cutting_manager: {
      dashboard: ['view'],
      cutting: ['view', 'create', 'edit'],
      bundle: ['view', 'create', 'edit'],
    },
    purchase: {
      dashboard: ['view'],
      purchase: ['view', 'create'],
      supplier: ['view'],
      inventory: ['view'],
    },
    craft: {
      dashboard: ['view'],
      craft: ['view', 'create', 'edit'],
      outsource: ['view', 'create'],
    },
    finishing: {
      dashboard: ['view'],
      finished: ['view', 'in'],
      packing: ['view', 'create'],
      quality: ['view'],
    },
    factory_admin: { _all: ['*'] }, // 工厂管理员有所有权限
  };
  
  const permissions = rolePermissions[roleId];
  if (!permissions) return false;
  
  // 检查是否有全部权限
  if (permissions._all?.includes('*')) return true;
  
  // 检查模块权限
  const modulePermissions = permissions[module];
  if (!modulePermissions) return false;
  
  return modulePermissions.includes(action);
}

// 导出角色ID映射
export { ROLE_ID_MAP };
