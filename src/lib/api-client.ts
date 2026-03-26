/**
 * API 客户端工具函数
 * 提供带租户支持的 API 调用
 */

import { getCurrentTenantId } from '@/contexts/TenantContext';

// API 响应类型
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// API 请求选项
export interface ApiOptions extends RequestInit {
  skipTenant?: boolean;  // 是否跳过租户ID注入
}

/**
 * 获取默认请求头
 */
function getDefaultHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // 添加租户ID
  const tenantId = getCurrentTenantId();
  if (tenantId) {
    headers['X-Tenant-ID'] = tenantId;
  }
  
  return headers;
}

/**
 * 封装的 API GET 请求
 */
export async function apiGet<T = unknown>(
  url: string,
  options: ApiOptions = {}
): Promise<ApiResponse<T>> {
  try {
    const headers = options.skipTenant 
      ? { 'Content-Type': 'application/json' }
      : getDefaultHeaders();
    
    const response = await fetch(url, {
      method: 'GET',
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API GET error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '请求失败' 
    };
  }
}

/**
 * 封装的 API POST 请求
 */
export async function apiPost<T = unknown>(
  url: string,
  body?: unknown,
  options: ApiOptions = {}
): Promise<ApiResponse<T>> {
  try {
    const headers = options.skipTenant 
      ? { 'Content-Type': 'application/json' }
      : getDefaultHeaders();
    
    const response = await fetch(url, {
      method: 'POST',
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API POST error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '请求失败' 
    };
  }
}

/**
 * 封装的 API PUT 请求
 */
export async function apiPut<T = unknown>(
  url: string,
  body?: unknown,
  options: ApiOptions = {}
): Promise<ApiResponse<T>> {
  try {
    const headers = options.skipTenant 
      ? { 'Content-Type': 'application/json' }
      : getDefaultHeaders();
    
    const response = await fetch(url, {
      method: 'PUT',
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API PUT error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '请求失败' 
    };
  }
}

/**
 * 封装的 API DELETE 请求
 */
export async function apiDelete<T = unknown>(
  url: string,
  options: ApiOptions = {}
): Promise<ApiResponse<T>> {
  try {
    const headers = options.skipTenant 
      ? { 'Content-Type': 'application/json' }
      : getDefaultHeaders();
    
    const response = await fetch(url, {
      method: 'DELETE',
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API DELETE error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '请求失败' 
    };
  }
}

/**
 * 从 API 路由获取租户ID
 * 用于服务端 API 路由中
 */
export function getTenantIdFromHeaders(headers: Headers): string {
  return headers.get('X-Tenant-ID') || 'tenant_default';
}
