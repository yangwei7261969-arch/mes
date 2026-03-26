'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Package,
  Users,
  DollarSign,
  Factory,
  Building2,
  Truck,
  Calendar,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Loader2,
  Download,
  RefreshCw,
  Image as ImageIcon,
  BarChart3,
  PieChart,
  Activity,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardStats {
  orderStats: { total: number; pending: number; in_progress: number; completed: number; cancelled: number };
  progressStats: { total_quantity: number; completed_quantity: number };
  outsourceStats: { total: number; pending: number; in_progress: number; completed: number; total_amount: number };
  inventoryStats: { total_types: number; low_stock: number; total_value: number };
  financeStats: { income: number; expense: number; profit: number };
  shipmentStats: { total: number; pending: number; shipped: number };
  employeeStats: { total: number; active: number };
  monthlyTrend: { month: string; orders: number; income: number; expense: number; profit: number }[];
  urgentOrders: any[];
  lowStockMaterials: any[];
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchStats();
    }
  }, [period, isAuthenticated]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/stats?period=${period}`);
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const initDemoData = async () => {
    try {
      const response = await fetch('/api/init-database?action=demo', { method: 'POST' });
      const result = await response.json();
      if (result.success) {
        alert('演示数据初始化成功！');
        fetchStats();
      }
    } catch (error) {
      console.error('Init demo error:', error);
    }
  };

  const exportData = async () => {
    try {
      const res = await fetch('/api/export/data');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `生产数据导出_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('导出失败');
    }
  };

  const getProgressPercent = () => {
    if (!stats || stats.progressStats.total_quantity === 0) return 0;
    return Math.round((stats.progressStats.completed_quantity / stats.progressStats.total_quantity) * 100);
  };

  const getMaxOrders = () => {
    if (!stats) return 10;
    return Math.max(...stats.monthlyTrend.map(m => m.orders), 1);
  };

  const getMaxAmount = () => {
    if (!stats) return 100000;
    return Math.max(...stats.monthlyTrend.map(m => Math.max(m.income, m.expense)), 1);
  };

  if (authLoading || loading || !stats) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const mainFeatures = [
    { icon: Factory, label: '生产订单', href: '/production', color: 'text-blue-600' },
    { icon: Activity, label: '裁床管理', href: '/cutting', color: 'text-cyan-600' },
    { icon: Package, label: '工序扫码', href: '/process-scan', color: 'text-pink-600' },
    { icon: AlertCircle, label: '质量管理', href: '/quality-management', color: 'text-rose-600' },
    { icon: Building2, label: '外发跟踪', href: '/outsource-tracking', color: 'text-violet-600' },
    { icon: Package, label: '物料库存', href: '/inventory', color: 'text-amber-600' },
    { icon: Package, label: '成衣库存', href: '/finished-inventory', color: 'text-teal-600' },
    { icon: Truck, label: '发货任务', href: '/shipping-tasks', color: 'text-emerald-600' },
  ];

  const analysisFeatures = [
    { icon: DollarSign, label: '财务管理', href: '/finance', color: 'text-red-600' },
    { icon: BarChart3, label: 'MES看板', href: '/mes-dashboard', color: 'text-sky-600' },
    { icon: TrendingUp, label: 'KPI绩效', href: '/kpi-dashboard', color: 'text-lime-600' },
    { icon: PieChart, label: '成本分析', href: '/cost-analysis', color: 'text-indigo-600' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* 标题 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">数据大屏</h1>
          <p className="text-sm md:text-base text-muted-foreground">实时监控生产、库存、财务数据</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">本月</SelectItem>
              <SelectItem value="quarter">本季度</SelectItem>
              <SelectItem value="year">本年</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchStats}>
            <RefreshCw className="h-4 w-4 mr-1" />
            刷新
          </Button>
          <Button variant="outline" size="sm" onClick={exportData}>
            <Download className="h-4 w-4 mr-1" />
            导出
          </Button>
          <Button size="sm" onClick={initDemoData}>
            初始化数据
          </Button>
        </div>
      </div>

      {/* AI智能助手入口 */}
      <Card className="bg-gradient-to-r from-violet-500 to-purple-600 text-white border-0">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">AI智能助手</h3>
                <p className="text-sm text-white/80">智能分析 · 排产建议 · 预警提醒</p>
              </div>
            </div>
            <Link href="/ai-assistant">
              <Button className="bg-white text-violet-600 hover:bg-white/90">
                立即体验
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* 核心指标 */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">生产订单</span>
              <Package className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold">{stats.orderStats.total}</div>
            <div className="flex gap-2 mt-1 text-xs">
              <span className="text-blue-600">{stats.orderStats.in_progress} 进行中</span>
              <span className="text-green-600">{stats.orderStats.completed} 完成</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">生产进度</span>
              <Activity className="h-4 w-4 text-green-500" />
            </div>
            <div className="text-2xl font-bold">{getProgressPercent()}%</div>
            <div className="text-xs text-muted-foreground mt-1">
              {stats.progressStats.completed_quantity} / {stats.progressStats.total_quantity} 件
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">外发订单</span>
              <Building2 className="h-4 w-4 text-violet-500" />
            </div>
            <div className="text-2xl font-bold">{stats.outsourceStats.total}</div>
            <div className="text-xs text-muted-foreground mt-1">
              ¥{stats.outsourceStats.total_amount.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">库存种类</span>
              <Package className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold">{stats.inventoryStats.total_types}</div>
            <div className="text-xs text-red-600 mt-1">
              {stats.inventoryStats.low_stock} 种低库存
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">净利润</span>
              {stats.financeStats.profit >= 0 ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
            </div>
            <div className={`text-2xl font-bold ${stats.financeStats.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ¥{stats.financeStats.profit.toLocaleString()}
            </div>
            <div className="flex gap-2 mt-1 text-xs">
              <span className="text-green-600">+{stats.financeStats.income.toLocaleString()}</span>
              <span className="text-red-600">-{stats.financeStats.expense.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">出货任务</span>
              <Truck className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold">{stats.shipmentStats.total}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {stats.shipmentStats.pending} 待发货
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 图表区域 */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              月度订单趋势
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-end justify-between gap-2">
              {stats.monthlyTrend.map((m, i) => (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div className="w-full flex flex-col items-center gap-1">
                    <div 
                      className="w-full bg-blue-500 rounded-t"
                      style={{ height: `${(m.orders / getMaxOrders()) * 120}px` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground mt-2">{m.month}</span>
                  <span className="text-xs font-medium">{m.orders}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              财务收支趋势
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-end justify-between gap-2">
              {stats.monthlyTrend.map((m, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex gap-0.5">
                    <div 
                      className="flex-1 bg-green-500 rounded-t"
                      style={{ height: `${(m.income / getMaxAmount()) * 100}px` }}
                    />
                    <div 
                      className="flex-1 bg-red-500 rounded-t"
                      style={{ height: `${(m.expense / getMaxAmount()) * 100}px` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground mt-2">{m.month}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded" />
                <span className="text-sm text-muted-foreground">收入</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded" />
                <span className="text-sm text-muted-foreground">支出</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 预警和提醒 */}
      <div className="grid gap-6 md:grid-cols-2">
        {stats.urgentOrders.length > 0 && (
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-amber-700">
                <AlertCircle className="h-4 w-4" />
                即将到期订单 ({stats.urgentOrders.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {stats.urgentOrders.slice(0, 3).map((order: any) => (
                <div key={order.id} className="flex items-center justify-between p-2 bg-white rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
                      {order.style_image ? (
                        <img src={order.style_image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="h-5 w-5 text-gray-300" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{order.order_no}</div>
                      <div className="text-xs text-muted-foreground">{order.style_name}</div>
                    </div>
                  </div>
                  <Badge className="bg-red-500 text-white">
                    {Math.ceil((new Date(order.plan_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} 天
                  </Badge>
                </div>
              ))}
              <Link href="/production" className="block text-center text-sm text-amber-600 py-1">
                查看全部 →
              </Link>
            </CardContent>
          </Card>
        )}

        {stats.lowStockMaterials.length > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-red-700">
                <AlertCircle className="h-4 w-4" />
                低库存预警 ({stats.lowStockMaterials.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {stats.lowStockMaterials.slice(0, 3).map((m: any) => (
                <div key={m.id} className="flex items-center justify-between p-2 bg-white rounded-lg">
                  <div>
                    <div className="font-medium text-sm">{m.name}</div>
                    <div className="text-xs text-muted-foreground">{m.code}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-red-600 text-sm">{m.quantity} {m.unit}</div>
                    <div className="text-xs text-muted-foreground">安全库存: {m.safety_stock}</div>
                  </div>
                </div>
              ))}
              <Link href="/inventory" className="block text-center text-sm text-red-600 py-1">
                查看全部 →
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 核心功能入口 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">核心功能</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
            {mainFeatures.map((feature, index) => (
              <Link
                key={index}
                href={feature.href}
                className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <feature.icon className={`h-6 w-6 ${feature.color}`} />
                <span className="text-xs text-center">{feature.label}</span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 数据分析入口 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">数据分析</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {analysisFeatures.map((feature, index) => (
              <Link
                key={index}
                href={feature.href}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border"
              >
                <feature.icon className={`h-5 w-5 ${feature.color}`} />
                <span className="text-sm font-medium">{feature.label}</span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 高级功能入口 */}
      <Card className="border-violet-200 bg-violet-50">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <h3 className="font-semibold">高级功能中心</h3>
                <p className="text-sm text-muted-foreground">AI智能核心、设备管理、多工厂协同等高级功能</p>
              </div>
            </div>
            <Link href="/advanced-features">
              <Button variant="outline">
                查看全部功能
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
