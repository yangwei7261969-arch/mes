/**
 * 服务端数据库查询工具
 * 提供带租户过滤的数据库操作
 */

import { getSupabaseClient } from '@/storage/database/supabase-client';

// 需要租户隔离的表
const TENANT_ISOLATED_TABLES = new Set([
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
  'users',
  'alert_configs',
  'scan_records',
]);

/**
 * 检查表是否需要租户隔离
 */
export function isTenantIsolated(table: string): boolean {
  return TENANT_ISOLATED_TABLES.has(table);
}

/**
 * 租户感知的数据库查询类
 * 使用方法:
 *   const query = new TenantQuery('tenant_123');
 *   const orders = await query.select('production_orders', '*', { status: 'active' });
 */
export class TenantQuery {
  private tenantId: string;
  private client: ReturnType<typeof getSupabaseClient>;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.client = getSupabaseClient();
  }

  /**
   * 查询数据 - 自动添加租户过滤
   */
  async select<T = unknown>(
    table: string,
    columns: string = '*',
    filters?: Record<string, unknown>
  ): Promise<{ data: T[] | null; error: unknown }> {
    let query = this.client.from(table).select(columns);

    // 如果是需要租户隔离的表，添加租户过滤
    if (isTenantIsolated(table)) {
      query = query.eq('tenant_id', this.tenantId);
    }

    // 添加额外过滤条件
    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      }
    }

    return query;
  }

  /**
   * 查询单条数据
   */
  async selectOne<T = unknown>(
    table: string,
    columns: string = '*',
    filters?: Record<string, unknown>
  ): Promise<{ data: T | null; error: unknown }> {
    const query = this.client.from(table).select(columns);

    // 如果是需要租户隔离的表，添加租户过滤
    if (isTenantIsolated(table)) {
      query.eq('tenant_id', this.tenantId);
    }

    // 添加额外过滤条件
    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null) {
          query.eq(key, value);
        }
      }
    }

    return query.maybeSingle();
  }

  /**
   * 插入数据 - 自动添加租户ID
   */
  async insert<T = unknown>(
    table: string,
    data: Record<string, unknown> | Record<string, unknown>[]
  ): Promise<{ data: T | T[] | null; error: unknown }> {
    // 如果是需要租户隔离的表，添加租户ID
    let dataWithTenant: Record<string, unknown> | Record<string, unknown>[];
    
    if (isTenantIsolated(table)) {
      if (Array.isArray(data)) {
        dataWithTenant = data.map((item) => ({ ...item, tenant_id: this.tenantId }));
      } else {
        dataWithTenant = { ...data, tenant_id: this.tenantId };
      }
    } else {
      dataWithTenant = data;
    }

    return this.client.from(table).insert(dataWithTenant).select();
  }

  /**
   * 更新数据 - 自动添加租户过滤
   */
  async update<T = unknown>(
    table: string,
    data: Record<string, unknown>,
    filters?: Record<string, unknown>
  ): Promise<{ data: T[] | null; error: unknown }> {
    let query = this.client.from(table).update(data);

    // 如果是需要租户隔离的表，添加租户过滤
    if (isTenantIsolated(table)) {
      query = query.eq('tenant_id', this.tenantId);
    }

    // 添加额外过滤条件
    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      }
    }

    return query.select();
  }

  /**
   * 删除数据 - 自动添加租户过滤
   */
  async delete(
    table: string,
    filters?: Record<string, unknown>
  ): Promise<{ error: unknown }> {
    let query = this.client.from(table).delete();

    // 如果是需要租户隔离的表，添加租户过滤
    if (isTenantIsolated(table)) {
      query = query.eq('tenant_id', this.tenantId);
    }

    // 添加额外过滤条件
    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      }
    }

    return query;
  }

  /**
   * 获取原始客户端（用于复杂查询）
   */
  getRawClient() {
    return this.client;
  }

  /**
   * 获取当前租户ID
   */
  getTenantId() {
    return this.tenantId;
  }
}

/**
 * 从请求头创建租户查询实例
 */
export function createTenantQuery(headers: Headers): TenantQuery {
  const tenantId = headers.get('X-Tenant-ID') || 'tenant_default';
  return new TenantQuery(tenantId);
}
