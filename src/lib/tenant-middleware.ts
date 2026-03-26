import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 多租户中间件工具函数
 */

// 需要租户隔离的表
const TENANT_ISOLATED_TABLES = [
  'customers',
  'suppliers',
  'production_orders',
  'order_details',
  'cutting_orders',
  'cutting_records',
  'cutting_bundles',
  'inventory',
  'inventory_transactions',
  'finished_inventory',
  'employees',
  'materials',
  'material_inventory',
  'purchase_orders',
  'invoices',
  'payments',
  'shipments',
  'quality_defects',
  'outsource_orders',
  'processes',
  'process_tracking',
  'announcements',
  'notifications',
];

// 检查表是否需要租户隔离
export function isTenantIsolatedTable(table: string): boolean {
  return TENANT_ISOLATED_TABLES.includes(table);
}

// 从请求中获取租户ID
export function getTenantIdFromRequest(request: NextRequest): string {
  // 1. 从请求头获取
  const headerTenantId = request.headers.get('x-tenant-id');
  if (headerTenantId) {
    return headerTenantId;
  }

  // 2. 从 cookie 获取
  const cookieTenantId = request.cookies.get('tenant_id')?.value;
  if (cookieTenantId) {
    return cookieTenantId;
  }

  // 3. 从查询参数获取
  const queryTenantId = request.nextUrl.searchParams.get('tenant_id');
  if (queryTenantId) {
    return queryTenantId;
  }

  // 4. 返回默认租户
  return 'tenant_default';
}

// 为插入数据添加租户ID
export function addTenantIdToData<T extends Record<string, unknown>>(
  data: T | T[],
  tenantId: string,
  table: string
): T | T[] {
  if (!isTenantIsolatedTable(table)) {
    return data;
  }
  
  if (Array.isArray(data)) {
    return data.map((item) => ({ ...item, tenant_id: tenantId }));
  }
  
  return { ...data, tenant_id: tenantId };
}

// 获取带租户过滤的查询
export function withTenantFilter<T>(
  query: T,
  tenantId: string,
  table: string
): T {
  if (!isTenantIsolatedTable(table)) {
    return query;
  }
  
  // 使用类型断言，因为不同查询构建器类型不同
  return (query as unknown as { eq: (col: string, val: string) => T }).eq('tenant_id', tenantId);
}

// 验证用户是否有权访问租户
export async function validateTenantAccess(
  userId: string,
  tenantId: string
): Promise<{ valid: boolean; role?: string; error?: string }> {
  try {
    const client = getSupabaseClient();
    
    // 检查 tenant_users 表
    const { data: tenantUser, error } = await client
      .from('tenant_users')
      .select('role, status')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .single();

    if (error || !tenantUser) {
      // 如果是默认租户，允许访问
      if (tenantId === 'tenant_default') {
        return { valid: true, role: 'admin' };
      }
      return { valid: false, error: '无权访问此租户' };
    }

    return { valid: true, role: tenantUser.role };
  } catch (error) {
    console.error('Validate tenant access error:', error);
    return { valid: false, error: '验证租户权限失败' };
  }
}

// 租户信息类型
export interface TenantInfo {
  id: string;
  name: string;
  code: string;
  plan: string;
  status: string;
  features: Record<string, boolean>;
}

// 获取租户信息
export async function getTenantInfo(tenantId: string): Promise<TenantInfo | null> {
  try {
    const client = getSupabaseClient();
    
    const { data: tenant, error } = await client
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single();

    if (error || !tenant) {
      // 返回默认租户信息
      if (tenantId === 'tenant_default') {
        return {
          id: 'tenant_default',
          name: '默认租户',
          code: 'DEFAULT',
          plan: 'enterprise',
          status: 'active',
          features: { ai: true, cad: true, mes: true },
        };
      }
      return null;
    }

    return tenant;
  } catch (error) {
    console.error('Get tenant info error:', error);
    return null;
  }
}

// 中间件函数 - 用于 API 路由
export function withTenant(
  handler: (request: NextRequest, tenantId: string) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const tenantId = getTenantIdFromRequest(request);
    
    // 可以在这里添加租户验证逻辑
    // const userId = getUserIdFromRequest(request);
    // const access = await validateTenantAccess(userId, tenantId);
    // if (!access.valid) {
    //   return NextResponse.json({ error: access.error }, { status: 403 });
    // }
    
    return handler(request, tenantId);
  };
}
