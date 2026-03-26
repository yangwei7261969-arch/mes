'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import PageAnnouncement from '@/components/notification/page-announcement';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { TenantProvider } from '@/contexts/TenantContext';
import { ToastProvider } from '@/components/toast';

interface AppLayoutProps {
  children: React.ReactNode;
  className?: string;
}

// 不需要登录验证的页面路径
const PUBLIC_PATHS = ['/login', '/supplier-login', '/supplier-register', '/supplier-portal'];

// 内部布局组件 - 处理认证逻辑
function AppLayoutInner({ children, className }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // 检查是否是公开页面
  const isPublicPage = PUBLIC_PATHS.some(path => pathname?.startsWith(path));

  // 检测移动端
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 检查登录状态
  useEffect(() => {
    // 公开页面直接标记为已检查
    if (isPublicPage) {
      setIsAuthenticated(true);
      return;
    }

    // 非公开页面需要检查登录状态
    const checkAuth = () => {
      const userInfo = localStorage.getItem('user_info');
      const supplierInfo = localStorage.getItem('supplier_info');
      const hasAuth = !!(userInfo || supplierInfo);
      
      if (!hasAuth) {
        // 未登录，跳转到登录页
        router.replace('/login');
        setIsAuthenticated(false);
      } else {
        setIsAuthenticated(true);
      }
    };

    // 使用 setTimeout 确保在客户端执行
    const timer = setTimeout(checkAuth, 0);
    return () => clearTimeout(timer);
  }, [pathname, isPublicPage, router]);

  // 公开页面直接渲染
  if (isPublicPage) {
    return <>{children}</>;
  }

  // 正在检查登录状态
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  // 未认证
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">正在跳转登录...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* 移动端遮罩 */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* 侧边栏 */}
      <div
        className={cn(
          'transition-transform duration-300 ease-in-out',
          isMobile && !mobileMenuOpen && '-translate-x-full fixed z-50',
          isMobile && mobileMenuOpen && 'translate-x-0 fixed z-50'
        )}
      >
        <Sidebar onMobileClose={() => setMobileMenuOpen(false)} />
      </div>

      {/* 主内容区 */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          isMobile={isMobile}
        />
        {/* 全局公告横幅 */}
        <PageAnnouncement />
        <main className={cn('flex-1 overflow-auto bg-muted/30', className)}>
          {children}
        </main>
      </div>
    </div>
  );
}

export function AppLayout({ children, className }: AppLayoutProps) {
  return (
    <ToastProvider>
      <AuthProvider>
        <TenantProvider>
          <AppLayoutInner className={className}>
            {children}
          </AppLayoutInner>
        </TenantProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
