'use client';

import React, { useState, useEffect } from 'react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  TrendingUp, TrendingDown, DollarSign, Package, Users, AlertTriangle,
  CheckCircle, XCircle, Clock, Download, RefreshCw, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { toast } from 'sonner';

interface ProfitSummary {
  total_orders: number;
  total_quantity: number;
  total_revenue: number;
  total_cost: number;
  total_profit: number;
  avg_profit_rate: number;
  cost_breakdown: {
    material: number;
    labor: number;
    outsource: number;
    shipping: number;
  };
  cost_percentage: {
    material: string;
    labor: string;
    outsource: string;
    shipping: string;
  };
  profit_orders: number;
  loss_orders: number;
  low_profit_orders: number;
}

interface OrderProfit {
  id: string;
  order_code: string;
  style_name: string;
  customer_name: string;
  order_amount: number;
  total_cost: number;
  gross_profit: number;
  profit_rate: number;
  quantity: number;
  unit_cost: number;
  unit_profit: number;
  cost_status: string;
}

interface CustomerProfit {
  customer_id: string;
  customer_name: string;
  customer_code: string;
  total_orders: number;
  total_quantity: number;
  total_revenue: number;
  total_cost: number;
  total_profit: number;
  avg_profit_rate: string;
  avg_unit_profit: string;
}

interface ProfitAlert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  actual_value: number;
  threshold_value: number;
  variance_rate: number;
  created_at: string;
  production_orders?: { order_code: string };
  styles?: { style_name: string };
}

export default function ProfitAnalysisPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ProfitSummary | null>(null);
  const [orders, setOrders] = useState<OrderProfit[]>([]);
  const [customers, setCustomers] = useState<CustomerProfit[]>([]);
  const [alerts, setAlerts] = useState<ProfitAlert[]>([]);
  const [period, setPeriod] = useState('month');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 计算日期范围
      const endDate = new Date().toISOString().split('T')[0];
      let startDate = new Date();
      
      switch (period) {
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(startDate.getMonth() - 3);
          break;
        case 'year':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
      }
      const startDateStr = startDate.toISOString().split('T')[0];

      // 并行加载数据
      const [summaryRes, ordersRes, customersRes, alertsRes] = await Promise.all([
        fetch(`/api/profit/analysis?type=summary&start_date=${startDateStr}&end_date=${endDate}`),
        fetch(`/api/profit/analysis?type=orders&start_date=${startDateStr}&end_date=${endDate}`),
        fetch(`/api/profit/analysis?type=customers&period=${period}`),
        fetch(`/api/profit/analysis?type=alerts&start_date=${startDateStr}&end_date=${endDate}`),
      ]);

      const [summaryData, ordersData, customersData, alertsData] = await Promise.all([
        summaryRes.json(),
        ordersRes.json(),
        customersRes.json(),
        alertsRes.json(),
      ]);

      if (summaryData.success) setSummary(summaryData.data);
      if (ordersData.success) setOrders(ordersData.data);
      if (customersData.success) setCustomers(customersData.data);
      if (alertsData.success) setAlerts(alertsData.data);

    } catch (error) {
      console.error('Load data error:', error);
      toast.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number | string) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return `${num >= 0 ? '+' : ''}${num.toFixed(1)}%`;
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'loss_order':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'low_profit':
        return <TrendingDown className="h-5 w-5 text-orange-500" />;
      case 'cost_overrun':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-5 w-5" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'warning':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      default:
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    }
  };

  // 渲染概览页面
  const renderOverview = () => (
    <div className="space-y-6">
      {/* 核心指标卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">总收入</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary?.total_revenue || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary?.total_orders || 0} 个订单
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">总成本</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary?.total_cost || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              单件成本: {formatCurrency((summary?.total_cost || 0) / (summary?.total_quantity || 1))}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">毛利润</CardTitle>
            {(summary?.total_profit || 0) >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(summary?.total_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(summary?.total_profit || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              {(summary?.total_profit || 0) >= 0 ? (
                <ArrowUpRight className="h-3 w-3 text-green-500" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-red-500" />
              )}
              利润率: {formatPercent(summary?.avg_profit_rate || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">订单状态</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-green-600">盈利订单</span>
                <span className="font-medium">{summary?.profit_orders || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-red-600">亏损订单</span>
                <span className="font-medium">{summary?.loss_orders || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-orange-600">低利润</span>
                <span className="font-medium">{summary?.low_profit_orders || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 成本结构 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>成本结构分析</CardTitle>
            <CardDescription>各成本项占比</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {summary?.cost_breakdown && (
                <>
                  <CostBar
                    label="材料成本"
                    value={summary.cost_breakdown.material}
                    percentage={summary.cost_percentage.material}
                    color="bg-blue-500"
                  />
                  <CostBar
                    label="人工成本"
                    value={summary.cost_breakdown.labor}
                    percentage={summary.cost_percentage.labor}
                    color="bg-green-500"
                  />
                  <CostBar
                    label="外发成本"
                    value={summary.cost_breakdown.outsource}
                    percentage={summary.cost_percentage.outsource}
                    color="bg-orange-500"
                  />
                  <CostBar
                    label="运输成本"
                    value={summary.cost_breakdown.shipping}
                    percentage={summary.cost_percentage.shipping}
                    color="bg-purple-500"
                  />
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 利润预警 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>利润预警</CardTitle>
              <CardDescription>需要关注的订单</CardDescription>
            </div>
            <Badge variant="outline">{alerts.length} 条</Badge>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                <p>暂无预警</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-auto">
                {alerts.slice(0, 5).map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg border ${getSeverityColor(alert.severity)}`}
                  >
                    <div className="flex items-start gap-2">
                      {getAlertIcon(alert.alert_type)}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{alert.title}</p>
                        <p className="text-xs mt-1">{alert.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // 渲染订单利润列表
  const renderOrders = () => (
    <Card>
      <CardHeader>
        <CardTitle>订单利润明细</CardTitle>
        <CardDescription>按利润率排序</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>订单号</TableHead>
              <TableHead>款式</TableHead>
              <TableHead>客户</TableHead>
              <TableHead className="text-right">数量</TableHead>
              <TableHead className="text-right">收入</TableHead>
              <TableHead className="text-right">成本</TableHead>
              <TableHead className="text-right">利润</TableHead>
              <TableHead className="text-right">利润率</TableHead>
              <TableHead>状态</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-mono">{order.order_code}</TableCell>
                <TableCell>{order.style_name}</TableCell>
                <TableCell>{order.customer_name}</TableCell>
                <TableCell className="text-right">{order.quantity}</TableCell>
                <TableCell className="text-right">{formatCurrency(order.order_amount)}</TableCell>
                <TableCell className="text-right">{formatCurrency(order.total_cost)}</TableCell>
                <TableCell className={`text-right font-medium ${order.gross_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(order.gross_profit)}
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant={order.profit_rate >= 20 ? 'default' : order.profit_rate >= 10 ? 'secondary' : 'destructive'}>
                    {formatPercent(order.profit_rate)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {order.gross_profit >= 0 ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  // 渲染客户利润排行
  const renderCustomers = () => (
    <Card>
      <CardHeader>
        <CardTitle>客户利润排行</CardTitle>
        <CardDescription>按总利润排序</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>排名</TableHead>
              <TableHead>客户</TableHead>
              <TableHead className="text-right">订单数</TableHead>
              <TableHead className="text-right">总收入</TableHead>
              <TableHead className="text-right">总成本</TableHead>
              <TableHead className="text-right">总利润</TableHead>
              <TableHead className="text-right">利润率</TableHead>
              <TableHead className="text-right">单件利润</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer, index) => (
              <TableRow key={customer.customer_id}>
                <TableCell>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                    index === 0 ? 'bg-yellow-100 text-yellow-700' :
                    index === 1 ? 'bg-gray-100 text-gray-700' :
                    index === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-muted'
                  }`}>
                    {index + 1}
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{customer.customer_name}</p>
                    <p className="text-xs text-muted-foreground">{customer.customer_code}</p>
                  </div>
                </TableCell>
                <TableCell className="text-right">{customer.total_orders}</TableCell>
                <TableCell className="text-right">{formatCurrency(customer.total_revenue)}</TableCell>
                <TableCell className="text-right">{formatCurrency(customer.total_cost)}</TableCell>
                <TableCell className={`text-right font-medium ${customer.total_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(customer.total_profit)}
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant={parseFloat(customer.avg_profit_rate) >= 20 ? 'default' : 'secondary'}>
                    {formatPercent(customer.avg_profit_rate)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{formatCurrency(parseFloat(customer.avg_unit_profit))}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">利润分析中心</h1>
          <p className="text-muted-foreground">订单成本核算 · 利润透视 · 预警管理</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">本周</SelectItem>
              <SelectItem value="month">本月</SelectItem>
              <SelectItem value="quarter">本季度</SelectItem>
              <SelectItem value="year">本年度</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            导出
          </Button>
        </div>
      </div>

      {/* 标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">利润概览</TabsTrigger>
          <TabsTrigger value="orders">订单利润</TabsTrigger>
          <TabsTrigger value="customers">客户利润</TabsTrigger>
          <TabsTrigger value="alerts">利润预警</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            renderOverview()
          )}
        </TabsContent>

        <TabsContent value="orders" className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            renderOrders()
          )}
        </TabsContent>

        <TabsContent value="customers" className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            renderCustomers()
          )}
        </TabsContent>

        <TabsContent value="alerts" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>利润预警列表</CardTitle>
              <CardDescription>需要处理的异常订单</CardDescription>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
                  <p className="text-lg">暂无预警</p>
                  <p className="text-sm">所有订单利润状态正常</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <Alert key={alert.id} className={getSeverityColor(alert.severity)}>
                      {getAlertIcon(alert.alert_type)}
                      <AlertTitle>{alert.title}</AlertTitle>
                      <AlertDescription className="mt-2">
                        <p>{alert.message}</p>
                        <p className="text-xs mt-1 text-muted-foreground">
                          订单: {alert.production_orders?.order_code} | 
                          款式: {alert.styles?.style_name} |
                          时间: {new Date(alert.created_at).toLocaleString()}
                        </p>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// 成本条形图组件
function CostBar({ label, value, percentage, color }: {
  label: string;
  value: number;
  percentage: string;
  color: string;
}) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="font-medium">{formatCurrency(value)} ({percentage}%)</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all`}
          style={{ width: `${Math.min(parseFloat(percentage), 100)}%` }}
        />
      </div>
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
