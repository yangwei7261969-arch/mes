'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface PermissionGuardProps {
  children: React.ReactNode;
  module: string;
  action?: string;
  permissions?: { module: string; action: string }[];
  fallback?: React.ReactNode;
  showFallback?: boolean;
}

/**
 * 权限守卫组件
 * 用于控制页面或组件的访问权限
 * 
 * 使用示例:
 * 1. 单权限检查:
 *    <PermissionGuard module="production" action="view">
 *      <ProductionPage />
 *    </PermissionGuard>
 * 
 * 2. 多权限检查（满足任一即可）:
 *    <PermissionGuard permissions={[
 *      { module: 'production', action: 'view' },
 *      { module: 'production', action: 'edit' }
 *    ]}>
 *      <ProductionPage />
 *    </PermissionGuard>
 */
export function PermissionGuard({
  children,
  module,
  action = 'view',
  permissions,
  fallback,
  showFallback = true,
}: PermissionGuardProps) {
  const { user, loading, hasPermission, hasAnyPermission } = useAuth();
  const router = useRouter();

  // 加载中
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // 未登录
  if (!user) {
    if (fallback) return <>{fallback}</>;
    if (!showFallback) return null;
    
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <CardTitle>请先登录</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              您需要登录后才能访问此页面
            </p>
            <Button onClick={() => router.push('/login')}>
              前往登录
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 检查权限
  let hasAccess = false;
  
  if (permissions && permissions.length > 0) {
    // 多权限检查
    hasAccess = hasAnyPermission(permissions);
  } else {
    // 单权限检查
    hasAccess = hasPermission(module, action);
  }

  // 无权限
  if (!hasAccess) {
    if (fallback) return <>{fallback}</>;
    if (!showFallback) return null;
    
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 mx-auto text-destructive mb-2" />
            <CardTitle>权限不足</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              您没有权限访问此页面，请联系管理员申请相关权限
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回
              </Button>
              <Button onClick={() => router.push('/')}>
                返回首页
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * 角色守卫组件
 * 用于基于角色的访问控制
 */
interface RoleGuardProps {
  children: React.ReactNode;
  roles: string[];
  fallback?: React.ReactNode;
  showFallback?: boolean;
}

export function RoleGuard({
  children,
  roles,
  fallback,
  showFallback = true,
}: RoleGuardProps) {
  const { user, loading, hasRole } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    if (fallback) return <>{fallback}</>;
    if (!showFallback) return null;
    
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <CardTitle>请先登录</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => router.push('/login')}>
              前往登录
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasRole(roles)) {
    if (fallback) return <>{fallback}</>;
    if (!showFallback) return null;
    
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 mx-auto text-destructive mb-2" />
            <CardTitle>权限不足</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              您的角色没有权限访问此页面
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回
              </Button>
              <Button onClick={() => router.push('/')}>
                返回首页
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * 条件渲染组件
 * 用于根据权限条件渲染内容
 */
interface CanProps {
  children: React.ReactNode;
  module: string;
  action?: string;
  permissions?: { module: string; action: string }[];
  fallback?: React.ReactNode;
}

export function Can({ children, module, action = 'view', permissions, fallback }: CanProps) {
  const { hasPermission, hasAnyPermission } = useAuth();
  
  let hasAccess = false;
  
  if (permissions && permissions.length > 0) {
    hasAccess = hasAnyPermission(permissions);
  } else {
    hasAccess = hasPermission(module, action);
  }
  
  if (!hasAccess) {
    return fallback ? <>{fallback}</> : null;
  }
  
  return <>{children}</>;
}

/**
 * 基于角色的条件渲染
 */
interface CanRoleProps {
  children: React.ReactNode;
  roles: string[];
  fallback?: React.ReactNode;
}

export function CanRole({ children, roles, fallback }: CanRoleProps) {
  const { hasRole } = useAuth();
  
  if (!hasRole(roles)) {
    return fallback ? <>{fallback}</> : null;
  }
  
  return <>{children}</>;
}
