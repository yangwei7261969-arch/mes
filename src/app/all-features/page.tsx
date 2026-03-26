'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  Factory, 
  Activity, 
  TrendingUp, 
  AlertTriangle,
  Scissors,
  Layers,
  QrCode,
  GitBranch,
  Palette,
  FileCheck,
  Cog,
  ClipboardList,
  ClipboardCheck,
  BarChart3,
  Calculator,
  Warehouse,
  Package,
  Box,
  Truck,
  Calendar,
  Send,
  Building2,
  DollarSign,
  Users,
  ShoppingCart,
  UserCog,
  Sparkles,
  Bell,
  Shield,
  Settings,
  Database,
  ArrowLeft,
  LogIn,
  Ticket,
  FileText
} from 'lucide-react';

const featureGroups = [
  {
    title: '数据概览',
    color: 'bg-blue-500',
    features: [
      { name: '数据大屏', icon: Activity, href: '/', color: 'bg-blue-100 text-blue-600' },
      { name: '高级功能', icon: Sparkles, href: '/advanced-features', color: 'bg-purple-100 text-purple-600' },
      { name: 'MES实时看板', icon: BarChart3, href: '/mes-dashboard', color: 'bg-cyan-100 text-cyan-600' },
      { name: 'KPI绩效', icon: TrendingUp, href: '/kpi-dashboard', color: 'bg-green-100 text-green-600' },
      { name: '预警系统', icon: AlertTriangle, href: '/alert-system', color: 'bg-red-100 text-red-600' },
      { name: '异常管理', icon: AlertTriangle, href: '/exception-workbench', color: 'bg-orange-100 text-orange-600' },
    ],
  },
  {
    title: '生产管理',
    color: 'bg-indigo-500',
    features: [
      { name: '生产订单', icon: Factory, href: '/production', color: 'bg-indigo-100 text-indigo-600' },
      { name: '生产准备', icon: ClipboardCheck, href: '/production-prep', color: 'bg-indigo-100 text-indigo-600' },
      { name: '工艺单/BOM', icon: FileText, href: '/tech-pack', color: 'bg-indigo-100 text-indigo-600' },
      { name: '裁床管理', icon: Scissors, href: '/cutting', color: 'bg-indigo-100 text-indigo-600' },
      { name: '裁床分扎', icon: Layers, href: '/cutting-bundles', color: 'bg-indigo-100 text-indigo-600' },
      { name: '条码工票', icon: Ticket, href: '/work-tickets', color: 'bg-indigo-100 text-indigo-600' },
      { name: '工序扫码', icon: QrCode, href: '/process-scan', color: 'bg-indigo-100 text-indigo-600' },
      { name: '工序追溯', icon: GitBranch, href: '/process-tracking', color: 'bg-indigo-100 text-indigo-600' },
      { name: '二次工艺', icon: Palette, href: '/craft-processes', color: 'bg-indigo-100 text-indigo-600' },
      { name: '尾部处理', icon: FileCheck, href: '/finishing', color: 'bg-indigo-100 text-indigo-600' },
    ],
  },
  {
    title: '工序配置',
    color: 'bg-slate-500',
    features: [
      { name: '工序管理', icon: Cog, href: '/processes', color: 'bg-slate-100 text-slate-600' },
      { name: '款式工序', icon: ClipboardList, href: '/style-processes', color: 'bg-slate-100 text-slate-600' },
    ],
  },
  {
    title: '质量管理',
    color: 'bg-rose-500',
    features: [
      { name: '质量管理', icon: ClipboardCheck, href: '/quality-management', color: 'bg-rose-100 text-rose-600' },
    ],
  },
  {
    title: '成本核算',
    color: 'bg-emerald-500',
    features: [
      { name: '成本分析', icon: BarChart3, href: '/cost-analysis', color: 'bg-emerald-100 text-emerald-600' },
      { name: '利润分析', icon: TrendingUp, href: '/profit-analysis', color: 'bg-emerald-100 text-emerald-600' },
    ],
  },
  {
    title: '库存管理',
    color: 'bg-amber-500',
    features: [
      { name: '物料库存', icon: Package, href: '/inventory', color: 'bg-amber-100 text-amber-600' },
      { name: '成衣库存', icon: Box, href: '/finished-inventory', color: 'bg-amber-100 text-amber-600' },
      { name: '装箱管理', icon: Package, href: '/packing-management', color: 'bg-amber-100 text-amber-600' },
    ],
  },
  {
    title: '出货管理',
    color: 'bg-teal-500',
    features: [
      { name: '出货日历', icon: Calendar, href: '/shipping-calendar', color: 'bg-teal-100 text-teal-600' },
      { name: '发货任务', icon: Truck, href: '/shipping-tasks', color: 'bg-teal-100 text-teal-600' },
      { name: '出货记录', icon: Send, href: '/shipment', color: 'bg-teal-100 text-teal-600' },
    ],
  },
  {
    title: '外发管理',
    color: 'bg-purple-500',
    features: [
      { name: '外发订单', icon: Send, href: '/outsource-orders', color: 'bg-purple-100 text-purple-600' },
      { name: '外发跟踪', icon: Truck, href: '/outsource-tracking', color: 'bg-purple-100 text-purple-600' },
      { name: '供应商管理', icon: Building2, href: '/suppliers', color: 'bg-purple-100 text-purple-600' },
      { name: '供应商付款', icon: DollarSign, href: '/supplier-payment', color: 'bg-purple-100 text-purple-600' },
    ],
  },
  {
    title: '人事工资',
    color: 'bg-pink-500',
    features: [
      { name: '员工管理', icon: Users, href: '/employees', color: 'bg-pink-100 text-pink-600' },
      { name: '计件工资', icon: Calculator, href: '/piece-wages', color: 'bg-pink-100 text-pink-600' },
      { name: '工资管理', icon: DollarSign, href: '/salary', color: 'bg-pink-100 text-pink-600' },
    ],
  },
  {
    title: '财务客户',
    color: 'bg-red-500',
    features: [
      { name: '财务中心', icon: DollarSign, href: '/finance', color: 'bg-red-100 text-red-600' },
      { name: '采购管理', icon: ShoppingCart, href: '/purchase', color: 'bg-red-100 text-red-600' },
      { name: '客户管理', icon: UserCog, href: '/customers', color: 'bg-red-100 text-red-600' },
    ],
  },
  {
    title: '系统工具',
    color: 'bg-gray-500',
    features: [
      { name: 'AI 助手', icon: Sparkles, href: '/ai-assistant', color: 'bg-violet-100 text-violet-600' },
      { name: '通知管理', icon: Bell, href: '/notification-management', color: 'bg-gray-100 text-gray-600' },
      { name: '公告中心', icon: Bell, href: '/announcements', color: 'bg-gray-100 text-gray-600' },
      { name: '权限管理', icon: Shield, href: '/permissions', color: 'bg-gray-100 text-gray-600' },
      { name: '系统设置', icon: Settings, href: '/settings', color: 'bg-gray-100 text-gray-600' },
      { name: '后台管理', icon: Shield, href: '/admin', color: 'bg-gray-100 text-gray-600' },
      { name: '数据库初始化', icon: Database, href: '/database-init', color: 'bg-gray-100 text-gray-600' },
    ],
  },
  {
    title: '移动端',
    color: 'bg-sky-500',
    features: [
      { name: '移动端首页', icon: Activity, href: '/mobile', color: 'bg-sky-100 text-sky-600' },
      { name: '移动端扫码', icon: QrCode, href: '/mobile-scan', color: 'bg-sky-100 text-sky-600' },
    ],
  },
  {
    title: '供应商入口',
    color: 'bg-orange-500',
    features: [
      { name: '供应商登录', icon: LogIn, href: '/supplier-login', color: 'bg-orange-100 text-orange-600' },
      { name: '供应商注册', icon: Building2, href: '/supplier-register', color: 'bg-orange-100 text-orange-600' },
      { name: '供应商工作台', icon: Factory, href: '/supplier-workbench', color: 'bg-orange-100 text-orange-600' },
      { name: '供应商门户', icon: Building2, href: '/supplier-portal', color: 'bg-orange-100 text-orange-600' },
    ],
  },
];

export default function AllFeaturesPage() {
  const totalFeatures = featureGroups.reduce((sum, g) => sum + g.features.length, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="flex items-center gap-3 p-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-bold">全部功能</h1>
            <p className="text-xs text-gray-500">共 {totalFeatures} 个功能</p>
          </div>
        </div>
      </div>

      {/* 功能列表 */}
      <div className="p-4 space-y-4">
        {featureGroups.map((group) => (
          <div key={group.title} className="bg-white rounded-xl overflow-hidden shadow-sm">
            {/* 分组标题 */}
            <div className={`${group.color} px-4 py-2`}>
              <h2 className="text-white font-medium">{group.title}</h2>
            </div>
            
            {/* 功能网格 */}
            <div className="grid grid-cols-3 gap-2 p-3">
              {group.features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <Link
                    key={feature.href}
                    href={feature.href}
                    className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className={`w-12 h-12 rounded-full ${feature.color} flex items-center justify-center`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-xs text-center leading-tight">{feature.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
