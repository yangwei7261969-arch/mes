'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// 租户类型定义
export interface Tenant {
  id: string;
  name: string;
  code: string;
  logo?: string;
  plan: string;
  status: string;
  features: Record<string, boolean>;
  max_users?: number;
  max_orders?: number;
}

// 用户在租户中的角色
export type TenantRole = 'owner' | 'admin' | 'member' | 'viewer';

// 租户用户关联
export interface TenantUser {
  tenant_id: string;
  user_id: string;
  role: TenantRole;
  department?: string;
  status: string;
}

// 租户上下文类型
export interface TenantContextType {
  // 当前租户
  tenant: Tenant | null;
  tenants: Tenant[]; // 用户所属的所有租户
  role: TenantRole;
  
  // 状态
  loading: boolean;
  
  // 方法
  switchTenant: (tenantId: string) => Promise<void>;
  refreshTenant: () => Promise<void>;
  hasFeature: (feature: string) => boolean;
  isOwner: () => boolean;
  isAdmin: () => boolean;
}

const TenantContext = createContext<TenantContextType | null>(null);

// 默认租户（开发环境使用）
const DEFAULT_TENANT: Tenant = {
  id: 'tenant_default',
  name: '默认租户',
  code: 'DEFAULT',
  plan: 'enterprise',
  status: 'active',
  features: {
    ai: true,
    cad: true,
    mes: true,
    advanced: true,
  },
};

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [role, setRole] = useState<TenantRole>('member');
  const [loading, setLoading] = useState(true);

  // 获取用户的租户列表
  const fetchTenants = useCallback(async () => {
    try {
      // 首先检查 localStorage
      if (typeof window !== 'undefined') {
        const storedTenant = localStorage.getItem('current_tenant');
        const userInfoStr = localStorage.getItem('user_info');
        
        if (userInfoStr) {
          const userInfo = JSON.parse(userInfoStr);
          
          // 从用户信息中获取租户
          if (userInfo.tenant_id) {
            const tenantData: Tenant = {
              id: userInfo.tenant_id,
              name: userInfo.tenant_name || '默认租户',
              code: userInfo.tenant_code || 'DEFAULT',
              plan: userInfo.tenant_plan || 'standard',
              status: 'active',
              features: userInfo.tenant_features || {},
            };
            setTenant(tenantData);
            setTenants([tenantData]);
            setRole(userInfo.tenant_role || 'member');
            setLoading(false);
            return;
          }
        }
        
        // 如果有存储的租户ID
        if (storedTenant) {
          try {
            const parsed = JSON.parse(storedTenant);
            setTenant(parsed);
            setTenants([parsed]);
          } catch {
            // 解析失败
          }
        }
      }

      // 如果没有租户信息，使用默认租户
      if (!tenant) {
        setTenant(DEFAULT_TENANT);
        setTenants([DEFAULT_TENANT]);
        setRole('admin');
      }
    } catch (error) {
      console.error('Failed to fetch tenants:', error);
      // 使用默认租户
      setTenant(DEFAULT_TENANT);
      setTenants([DEFAULT_TENANT]);
      setRole('admin');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  // 切换租户
  const switchTenant = useCallback(async (tenantId: string) => {
    const targetTenant = tenants.find((t) => t.id === tenantId);
    if (targetTenant) {
      setTenant(targetTenant);
      if (typeof window !== 'undefined') {
        localStorage.setItem('current_tenant', JSON.stringify(targetTenant));
      }
    }
  }, [tenants]);

  // 刷新租户信息
  const refreshTenant = useCallback(async () => {
    setLoading(true);
    await fetchTenants();
  }, [fetchTenants]);

  // 检查功能是否启用
  const hasFeature = useCallback(
    (feature: string): boolean => {
      if (!tenant) return false;
      return tenant.features?.[feature] === true;
    },
    [tenant]
  );

  // 是否是租户所有者
  const isOwner = useCallback(() => role === 'owner', [role]);

  // 是否是管理员
  const isAdmin = useCallback(() => role === 'owner' || role === 'admin', [role]);

  return (
    <TenantContext.Provider
      value={{
        tenant,
        tenants,
        role,
        loading,
        switchTenant,
        refreshTenant,
        hasFeature,
        isOwner,
        isAdmin,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}

// 获取当前租户ID（用于 API 调用）
export function getCurrentTenantId(): string {
  if (typeof window !== 'undefined') {
    const storedTenant = localStorage.getItem('current_tenant');
    if (storedTenant) {
      try {
        const parsed = JSON.parse(storedTenant);
        return parsed.id;
      } catch {
        // 解析失败
      }
    }
  }
  return 'tenant_default';
}

// 用于 API 请求的租户头
export function getTenantHeaders(): Record<string, string> {
  return {
    'X-Tenant-ID': getCurrentTenantId(),
  };
}
