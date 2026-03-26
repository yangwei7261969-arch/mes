'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  LayoutDashboard,
  Package,
  DollarSign,
  ShoppingCart,
  Users,
  UserCog,
  Factory,
  Scissors,
  Truck,
  Sparkles,
  Settings,
  Shield,
  Bell,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Box,
  Cog,
  Calculator,
  Palette,
  ClipboardList,
  QrCode,
  GitBranch,
  Layers,
  Send,
  Building2,
  FileCheck,
  ClipboardCheck,
  LogIn,
  Calendar,
  Warehouse,
  Grid3X3,
  Users2,
  LucideIcon,
  Activity,
  Ticket,
  AlertTriangle,
  BarChart3,
  Database,
  TrendingUp,
  FileText,
  Brain,
  Zap,
  CloudCog,
  PenTool,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// 菜单分组结构
interface MenuItem {
  title: string;
  icon: LucideIcon;
  href: string;
  roles: string[];
  permission?: { module: string; action: string }; // 新增权限字段
}

interface MenuGroup {
  title: string;
  icon: LucideIcon;
  items: MenuItem[];
  defaultOpen?: boolean;
  requiredPermission?: { module: string; action: string }; // 分组权限
}

const menuGroups: MenuGroup[] = [
  // 数据概览
  {
    title: '数据概览',
    icon: LayoutDashboard,
    defaultOpen: true,
    items: [
      {
        title: '全部功能',
        icon: Grid3X3,
        href: '/all-features',
        roles: ['all'],
      },
      {
        title: '数据大屏',
        icon: LayoutDashboard,
        href: '/',
        roles: ['boss', 'manager', 'production_manager', 'warehouse', 'qc', 'accountant', 'hr', 'factory_admin', 'admin'],
        permission: { module: 'dashboard', action: 'view' },
      },
      {
        title: '高级功能',
        icon: Sparkles,
        href: '/advanced-features',
        roles: ['all'],
      },
      {
        title: 'MES实时看板',
        icon: Activity,
        href: '/mes-dashboard',
        roles: ['boss', 'manager', 'production_manager', 'factory_admin'],
        permission: { module: 'mes', action: 'view' },
      },
      {
        title: 'KPI绩效',
        icon: TrendingUp,
        href: '/kpi-dashboard',
        roles: ['boss', 'manager', 'production_manager', 'hr', 'factory_admin'],
        permission: { module: 'dashboard', action: 'view' },
      },
      {
        title: '生产仪表盘',
        icon: BarChart3,
        href: '/production-dashboard',
        roles: ['boss', 'manager', 'production_manager', 'factory_admin'],
        permission: { module: 'dashboard', action: 'view' },
      },
      {
        title: '预警系统',
        icon: AlertTriangle,
        href: '/alert-system',
        roles: ['boss', 'manager', 'production_manager', 'factory_admin'],
        permission: { module: 'alert', action: 'view' },
      },
      {
        title: '异常管理',
        icon: AlertTriangle,
        href: '/exception-workbench',
        roles: ['boss', 'manager', 'production_manager', 'qc', 'factory_admin'],
        permission: { module: 'alert', action: 'handle' },
      },
    ],
  },
  // 生产管理
  {
    title: '生产管理',
    icon: Factory,
    defaultOpen: true,
    items: [
      {
        title: '生产订单',
        icon: Factory,
        href: '/production',
        roles: ['production_manager', 'boss', 'manager', 'factory_admin'],
        permission: { module: 'production', action: 'view' },
      },
      {
        title: '生产准备',
        icon: ClipboardCheck,
        href: '/production-prep',
        roles: ['production_manager', 'boss', 'manager', 'factory_admin'],
        permission: { module: 'prep', action: 'view' },
      },
      {
        title: '裁床管理',
        icon: Scissors,
        href: '/cutting',
        roles: ['cutting_manager', 'production_manager', 'boss', 'factory_admin'],
        permission: { module: 'cutting', action: 'view' },
      },

      {
        title: '条码工票',
        icon: Ticket,
        href: '/work-tickets',
        roles: ['worker', 'operator', 'production_manager', 'factory_admin'],
        permission: { module: 'scan', action: 'view' },
      },
      {
        title: '工序扫码',
        icon: QrCode,
        href: '/process-scan',
        roles: ['worker', 'operator', 'production_manager', 'factory_admin'],
        permission: { module: 'scan', action: 'execute' },
      },
      {
        title: '工序追溯',
        icon: GitBranch,
        href: '/process-tracking',
        roles: ['production_manager', 'boss', 'manager', 'qc', 'factory_admin'],
        permission: { module: 'tracking', action: 'view' },
      },
      {
        title: '二次工艺',
        icon: Palette,
        href: '/craft-processes',
        roles: ['craft', 'production_manager', 'boss', 'factory_admin'],
        permission: { module: 'craft', action: 'view' },
      },
      {
        title: '尾部处理',
        icon: FileCheck,
        href: '/finishing',
        roles: ['production_manager', 'finishing', 'boss', 'factory_admin'],
        permission: { module: 'finished', action: 'view' },
      },
      {
        title: '扎号管理',
        icon: ClipboardList,
        href: '/bianfei',
        roles: ['production_manager', 'cutting_manager', 'boss', 'factory_admin'],
        permission: { module: 'bianfei', action: 'view' },
      },
      {
        title: '唛架纸样',
        icon: Layers,
        href: '/pattern-files',
        roles: ['production_manager', 'cutting_manager', 'boss', 'factory_admin'],
        permission: { module: 'pattern', action: 'view' },
      },
      {
        title: '技术包管理',
        icon: FileText,
        href: '/tech-pack',
        roles: ['production_manager', 'boss', 'manager', 'factory_admin'],
        permission: { module: 'techpack', action: 'view' },
      },
    ],
  },
  // 工序配置
  {
    title: '工序配置',
    icon: Cog,
    defaultOpen: false,
    items: [
      {
        title: '工序管理',
        icon: Cog,
        href: '/processes',
        roles: ['production_manager', 'boss', 'manager', 'factory_admin'],
        permission: { module: 'process', action: 'view' },
      },
      {
        title: '款式工序',
        icon: ClipboardList,
        href: '/style-processes',
        roles: ['production_manager', 'boss', 'manager', 'factory_admin'],
        permission: { module: 'style_process', action: 'view' },
      },
    ],
  },
  // 质量管理
  {
    title: '质量管理',
    icon: ClipboardCheck,
    defaultOpen: false,
    items: [
      {
        title: '质量管理',
        icon: ClipboardCheck,
        href: '/quality-management',
        roles: ['production_manager', 'qc', 'boss', 'manager', 'factory_admin'],
        permission: { module: 'quality', action: 'view' },
      },
    ],
  },
  // 成本核算
  {
    title: '成本核算',
    icon: Calculator,
    defaultOpen: false,
    items: [
      {
        title: '成本分析',
        icon: BarChart3,
        href: '/cost-analysis',
        roles: ['finance', 'accountant', 'boss', 'manager', 'factory_admin'],
        permission: { module: 'cost', action: 'view' },
      },
      {
        title: '利润分析',
        icon: TrendingUp,
        href: '/profit-analysis',
        roles: ['finance', 'accountant', 'boss', 'manager', 'factory_admin'],
        permission: { module: 'cost', action: 'view' },
      },
    ],
  },
  // 库存管理
  {
    title: '库存管理',
    icon: Warehouse,
    defaultOpen: true,
    items: [
      {
        title: '仓库管理',
        icon: Warehouse,
        href: '/warehouse',
        roles: ['warehouse', 'manager', 'boss', 'factory_admin'],
        permission: { module: 'warehouse', action: 'view' },
      },
      {
        title: '物料库存',
        icon: Package,
        href: '/inventory',
        roles: ['warehouse', 'manager', 'boss', 'factory_admin'],
        permission: { module: 'inventory', action: 'view' },
      },
      {
        title: '成衣库存',
        icon: Box,
        href: '/finished-inventory',
        roles: ['warehouse', 'manager', 'boss', 'factory_admin'],
        permission: { module: 'finished', action: 'view' },
      },
      {
        title: '装箱管理',
        icon: Package,
        href: '/packing-management',
        roles: ['warehouse', 'boss', 'factory_admin'],
        permission: { module: 'packing', action: 'view' },
      },
    ],
  },
  // 出货管理
  {
    title: '出货管理',
    icon: Truck,
    defaultOpen: true,
    items: [
      {
        title: '出货日历',
        icon: Calendar,
        href: '/shipping-calendar',
        roles: ['warehouse', 'boss', 'manager', 'factory_admin'],
        permission: { module: 'shipping', action: 'view' },
      },
      {
        title: '发货任务',
        icon: Truck,
        href: '/shipping-tasks',
        roles: ['warehouse', 'boss', 'factory_admin'],
        permission: { module: 'shipping', action: 'create' },
      },
      {
        title: '出货记录',
        icon: Send,
        href: '/shipment',
        roles: ['warehouse', 'finance', 'accountant', 'boss', 'factory_admin'],
        permission: { module: 'shipping', action: 'view' },
      },
    ],
  },
  // 外发管理
  {
    title: '外发管理',
    icon: Send,
    defaultOpen: false,
    items: [
      {
        title: '外发订单',
        icon: Send,
        href: '/outsource-orders',
        roles: ['production_manager', 'boss', 'manager', 'craft', 'factory_admin'],
        permission: { module: 'outsource', action: 'view' },
      },
      {
        title: '外发跟踪',
        icon: Truck,
        href: '/outsource-tracking',
        roles: ['production_manager', 'boss', 'manager', 'factory_admin'],
        permission: { module: 'outsource', action: 'view' },
      },
      {
        title: '供应商管理',
        icon: Building2,
        href: '/suppliers',
        roles: ['boss', 'manager', 'purchase', 'factory_admin'],
        permission: { module: 'supplier', action: 'view' },
      },
      {
        title: '供应商付款',
        icon: DollarSign,
        href: '/supplier-payment',
        roles: ['finance', 'accountant', 'boss', 'factory_admin'],
        permission: { module: 'payment', action: 'view' },
      },
    ],
  },
  // 人事工资
  {
    title: '人事工资',
    icon: Users,
    defaultOpen: false,
    items: [
      {
        title: '人事管理',
        icon: Users2,
        href: '/hr',
        roles: ['hr', 'boss', 'manager', 'factory_admin'],
        permission: { module: 'hr', action: 'view' },
      },
      {
        title: '员工管理',
        icon: Users,
        href: '/employees',
        roles: ['hr', 'boss', 'manager', 'factory_admin'],
        permission: { module: 'employee', action: 'view' },
      },
      {
        title: '计件工资',
        icon: Calculator,
        href: '/piece-wages',
        roles: ['production_manager', 'finance', 'accountant', 'hr', 'worker', 'factory_admin'],
        permission: { module: 'wage', action: 'view' },
      },
      {
        title: '工资管理',
        icon: DollarSign,
        href: '/salary',
        roles: ['finance', 'accountant', 'hr', 'boss', 'factory_admin'],
        permission: { module: 'salary', action: 'view' },
      },
    ],
  },
  // 财务客户
  {
    title: '财务客户',
    icon: DollarSign,
    defaultOpen: false,
    items: [
      {
        title: '财务中心',
        icon: DollarSign,
        href: '/finance',
        roles: ['finance', 'accountant', 'boss', 'manager', 'factory_admin'],
        permission: { module: 'finance', action: 'view' },
      },
      {
        title: '采购管理',
        icon: ShoppingCart,
        href: '/purchase',
        roles: ['purchase', 'manager', 'boss', 'factory_admin'],
        permission: { module: 'purchase', action: 'view' },
      },
      {
        title: '客户管理',
        icon: UserCog,
        href: '/customers',
        roles: ['boss', 'manager', 'factory_admin'],
        permission: { module: 'customer', action: 'view' },
      },
    ],
  },
  // AI智能
  {
    title: 'AI智能',
    icon: Brain,
    defaultOpen: true,
    items: [
      {
        title: 'AI助手',
        icon: Sparkles,
        href: '/ai-assistant',
        roles: ['all'],
        permission: { module: 'ai', action: 'view' },
      },
      {
        title: 'AI智能排产',
        icon: Calendar,
        href: '/ai-scheduling',
        roles: ['boss', 'manager', 'production_manager', 'factory_admin'],
        permission: { module: 'scheduling', action: 'view' },
      },
      {
        title: 'AI智能洞察',
        icon: Zap,
        href: '/ai-insights',
        roles: ['boss', 'manager', 'production_manager', 'qc', 'factory_admin'],
        permission: { module: 'insights', action: 'view' },
      },
    ],
  },
  // 系统工具
  {
    title: '系统工具',
    icon: Settings,
    defaultOpen: false,
    items: [
      {
        title: '通知管理',
        icon: Bell,
        href: '/notification-management',
        roles: ['boss', 'manager', 'production_manager', 'factory_admin'],
        permission: { module: 'notification', action: 'view' },
      },
      {
        title: '公告中心',
        icon: Bell,
        href: '/announcements',
        roles: ['all'],
      },
      {
        title: '权限管理',
        icon: Shield,
        href: '/permissions',
        roles: ['boss', 'admin', 'factory_admin'],
        permission: { module: 'permission', action: 'view' },
      },
      {
        title: '系统设置',
        icon: Settings,
        href: '/settings',
        roles: ['admin', 'boss'],
        permission: { module: 'system', action: 'view' },
      },
      {
        title: '后台管理',
        icon: Shield,
        href: '/admin',
        roles: ['admin', 'boss'],
        permission: { module: 'user', action: 'view' },
      },
      {
        title: '供应商审核',
        icon: Building2,
        href: '/admin/suppliers',
        roles: ['admin', 'boss'],
        permission: { module: 'supplier', action: 'view' },
      },
      {
        title: '数据库初始化',
        icon: Database,
        href: '/database-init',
        roles: ['admin'],
        permission: { module: 'system', action: 'edit' },
      },
      {
        title: 'SaaS多租户',
        icon: CloudCog,
        href: '/saas-tenant',
        roles: ['admin', 'boss'],
        permission: { module: 'system', action: 'view' },
      },
      {
        title: 'CAD集成',
        icon: PenTool,
        href: '/cad-integration',
        roles: ['admin', 'boss', 'production_manager', 'factory_admin'],
        permission: { module: 'cad', action: 'view' },
      },
      {
        title: '供应商登录',
        icon: LogIn,
        href: '/login',
        roles: ['all'],
      },
    ],
  },
];

interface SidebarProps {
  className?: string;
  onMobileClose?: () => void;
}

export function Sidebar({ className, onMobileClose }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { user, hasPermission, hasRole, isAuthenticated } = useAuth();

  // 分组展开状态
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    menuGroups.forEach((group) => {
      if (group.defaultOpen) {
        initial.add(group.title);
      }
    });
    return initial;
  });

  // 基于用户权限过滤菜单项
  const filteredMenuGroups = useMemo(() => {
    if (!isAuthenticated || !user) {
      // 未登录时只显示公告中心和供应商登录
      return menuGroups.map(group => ({
        ...group,
        items: group.items.filter(item => 
          item.roles.includes('all') || item.href === '/announcements' || item.href === '/login'
        ),
      })).filter(group => group.items.length > 0);
    }

    // 检查是否是管理员（通过用户名或邮箱判断）
    const isAdmin = user.username === 'admin' || user.email?.includes('admin') || user.name?.includes('管理员');
    const isBoss = user.username === 'boss' || user.email?.includes('boss') || user.name?.includes('总');

    return menuGroups.map(group => {
      const filteredItems = group.items.filter(item => {
        // 如果 roles 包含 'all'，所有人都可以访问
        if (item.roles.includes('all')) {
          return true;
        }
        
        // 管理员和老板可以访问所有功能
        if (isAdmin || isBoss) {
          return true;
        }
        
        // 如果有权限定义，使用权限检查
        if (item.permission) {
          const hasAccess = hasPermission(item.permission.module, item.permission.action);
          if (hasAccess) return true;
        }
        
        // 降级到角色检查
        return hasRole(item.roles);
      });
      
      return {
        ...group,
        items: filteredItems,
      };
    }).filter(group => group.items.length > 0);
  }, [user, isAuthenticated, hasPermission, hasRole]);

  // 当路由变化时，自动展开包含当前页面的分组
  useEffect(() => {
    filteredMenuGroups.forEach((group) => {
      const hasActiveItem = group.items.some((item) => item.href === pathname);
      if (hasActiveItem && !expandedGroups.has(group.title)) {
        setExpandedGroups((prev) => new Set([...prev, group.title]));
      }
    });
  }, [pathname, filteredMenuGroups]);

  const toggleGroup = (title: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return next;
    });
  };

  const handleItemClick = () => {
    // 移动端点击菜单项后关闭侧边栏
    if (onMobileClose) {
      onMobileClose();
    }
  };

  return (
    <div
      className={cn(
        'relative flex flex-col border-r bg-background transition-all duration-300 h-full',
        collapsed ? 'w-16' : 'w-64',
        className
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Factory className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold">服装ERP</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8 hidden md:flex"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
        {/* 移动端关闭按钮 */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onMobileClose}
          className="h-8 w-8 md:hidden"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Menu with Groups */}
      <ScrollArea className="flex-1 h-0 py-2">
        <nav className="px-2">
          {filteredMenuGroups.map((group) => {
            const isExpanded = expandedGroups.has(group.title);
            const hasActiveItem = group.items.some((item) => item.href === pathname);

            return (
              <div key={group.title} className="mb-1">
                {/* Group Title - 可点击展开/收起 */}
                <button
                  onClick={() => !collapsed && toggleGroup(group.title)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-xs font-medium uppercase tracking-wider rounded-md transition-colors',
                    collapsed
                      ? 'justify-center cursor-default'
                      : 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800',
                    hasActiveItem && !collapsed
                      ? 'text-primary bg-primary/5'
                      : 'text-muted-foreground'
                  )}
                  title={collapsed ? group.title : undefined}
                >
                  <group.icon className="h-4 w-4 flex-shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{group.title}</span>
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 transition-transform duration-200',
                          isExpanded && 'rotate-180'
                        )}
                      />
                    </>
                  )}
                </button>

                {/* Group Items - 带动画展开 */}
                {!collapsed && (
                  <div
                    className={cn(
                      'overflow-hidden transition-all duration-200 ease-in-out',
                      isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                    )}
                  >
                    <div className="space-y-0.5 py-1 pl-2">
                      {group.items.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                          <Link key={item.href} href={item.href} onClick={handleItemClick}>
                            <Button
                              variant={isActive ? 'secondary' : 'ghost'}
                              className={cn(
                                'w-full justify-start gap-3 h-8 text-sm',
                                isActive && 'font-medium'
                              )}
                            >
                              <item.icon className="h-4 w-4 flex-shrink-0" />
                              <span>{item.title}</span>
                            </Button>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 收起状态：直接显示图标按钮 */}
                {collapsed && (
                  <div className="space-y-0.5 mt-1">
                    {group.items.map((item) => {
                      const isActive = pathname === item.href;
                      return (
                        <Link key={item.href} href={item.href} onClick={handleItemClick}>
                          <Button
                            variant={isActive ? 'secondary' : 'ghost'}
                            size="icon"
                            className={cn('w-full h-9', isActive && 'bg-primary/10')}
                            title={item.title}
                          >
                            <item.icon className="h-4 w-4" />
                          </Button>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </ScrollArea>

      {/* User Info */}
      <div className="border-t p-4">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
              U
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium">管理员</p>
              <p className="truncate text-xs text-muted-foreground">admin@company.com</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
              U
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
